// ============================================================
// IMPERIUM — GAME.JS v4
// Loop principal con: bloqueo de turno sin decisión,
// guerra con batalla en mapa, gasto público, guardado
// ============================================================

window.Game = window.Game || {

  state: null,

  // ══════════════════════════════════════════════
  // INICIO
  // ══════════════════════════════════════════════
  startBlitzMode() {
    this._blitzMode = true;
    this.startNewGame();
  },

  startNewGame() {
    showScreen('screen-civselect');
    this.renderCivSelect();
  },

  renderCivSelect() {
    const grid = document.getElementById('civ-grid');
    if (!grid) return;
    grid.innerHTML = CIVILIZATIONS.map(civ => `
      <div class="civ-card" onclick="Game.selectCiv('${civ.id}')">
        <span class="civ-icon">${civ.icon}</span>
        <div class="civ-name">${civ.name}</div>
        <div class="civ-gov">⚖️ ${GOVERNMENT_TYPES[civ.government].name}</div>
        <div class="civ-desc">${civ.description}</div>
        <div class="civ-stats">
          ${civ.traits.map(t => {
            const pos = t.startsWith('+'), neg = t.startsWith('-');
            return `<span class="civ-stat ${pos?'pos':neg?'neg':''}">${t}</span>`;
          }).join('')}
        </div>
      </div>`).join('');
  },

  selectCiv(civId) {
    const civ = CIVILIZATIONS.find(c => c.id === civId);
    if (!civ) return;
    this.initState(civ);
    showScreen('screen-game');
    setTimeout(() => {
      const seedEl = document.getElementById('map-seed-label');
      if (seedEl) seedEl.textContent = '🗺️ Semilla: ' + this.state.mapSeed;
    }, 50);
    UI.fullRender(this.state);
    // Inicializar mapa de Althoria y contar regiones del jugador
    if (typeof AlthoriaMap !== 'undefined') {
      AlthoriaMap.assignZones(this.state);
      this.state.althoriaRegions = (AlthoriaMap.nationZones['player'] || []).length;
    }
    // Inicializar personajes diplomáticos
    if (typeof DiplomacySystem !== 'undefined') DiplomacySystem.initCharacters(this.state);
    // Inicializar sistema de arcos narrativos
    if (typeof ArcManager !== 'undefined') ArcManager.init(this.state);
    // Inicializar sistema de arcos
    if (typeof ArcSystem !== 'undefined') ArcSystem.init(this.state);
    else if (typeof ArcManager !== 'undefined') ArcManager.init(this.state);
    Systems.Log.add(this.state, '⚔️ ' + civ.name + ' comienza su historia. Que los dioses os guíen.', 'good');

    if (typeof DiplomacySystem !== "undefined") DiplomacySystem.initCharacters(this.state);
    if (this._blitzMode) BlitzMode.apply(this.state);
    // Init AP so first-turn actions work immediately
    if (typeof ActionPoints !== 'undefined') ActionPoints.reset(this.state);
    this.generateTurnEvents();
  },

  // ══════════════════════════════════════════════
  // HOVER DEL MAPA → columna derecha
  // ══════════════════════════════════════════════
  _attachMapHover() {
    const canvas = MapRenderer.canvas;
    if (!canvas) return;
    canvas.addEventListener('mousemove', (e) => {
      const rect  = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top)  * scaleY;
      const col = Math.floor(px / MapRenderer.CELL_W);
      const row = Math.floor(py / MapRenderer.CELL_H);
      if (col >= 0 && col < MapRenderer.map.cols && row >= 0 && row < MapRenderer.map.rows) {
        const cell = MapRenderer.map.cells[row * MapRenderer.map.cols + col];
        UI.updateHoverInfo(cell);
      }
    });
    canvas.addEventListener('mouseleave', () => UI.updateHoverInfo(null));
  },

  renderMapInfoBar() {
    const el = document.getElementById('map-info-bar');
    if (!el || !this.state.capitalCell) return;
    const cap = this.state.capitalCell;
    el.innerHTML = `
      <span>🏰 Capital: ${cap.biome.icon} ${cap.biome.name}</span>
      <span>📍 (${cap.col},${cap.row})</span>
      <span>🌡️ ${cap.temperature > 0.65 ? 'Cálido' : cap.temperature < 0.3 ? 'Frío' : 'Templado'}</span>
      <span>💧 ${cap.humidity > 0.6 ? 'Húmedo' : cap.humidity < 0.3 ? 'Árido' : 'Normal'}</span>
      <span>🗺️ 40×25 · ~500km²</span>
    `;
  },

  // ══════════════════════════════════════════════
  // ESTADO INICIAL
  // ══════════════════════════════════════════════
  initState(civ) {
    const mapSeed    = Math.floor(Math.random() * 9999999);
    const mapData    = MapGenerator.generate(mapSeed);
    const playerStart = MapGenerator.getPlayerStartStats(mapData);
    const aiNations  = this.initAINations(mapData);
    const mb         = playerStart.resourceBonuses;

    this.state = {
      civId: civ.id, civName: civ.name, civIcon: civ.icon,
      civData: civ, coldImmune: !!civ.coldImmune,
      government: civ.government, turn: 1, year: 1,
      mapData, mapSeed,
      resources: {
        food:  Math.floor(civ.startResources.food  + mb.food  * 0.5),
        gold:  Math.floor(civ.startResources.gold  + mb.gold  * 0.5),
        wood:  Math.floor(civ.startResources.wood  + mb.wood  * 0.5),
        stone: Math.floor(civ.startResources.stone + mb.stone * 0.5),
        iron:  Math.floor(civ.startResources.iron  + mb.iron  * 0.5),
      },
      rates: {},
      population: civ.startStats.population,
      stability:  civ.startStats.stability,
      morale:     civ.startStats.morale,
      army:       civ.startStats.army,
      economy: {
        corruption: civ.id === 'chinese' ? 30 : 10,
        inflation: 0, debt: 0, trade_income: 8, food_bonus: 0,
        taxRate: 20   // impuesto base 20% — rango 0–90%
      },
      climate: this.detectStartClimate(playerStart.capitalCell, mapData),
      territories:     playerStart.territories,
      althoriaRegions:  1,  // Regiones de Althoria controladas (victoria al llegar a 14)
      playerCells:  playerStart.cellIds,
      capitalCell:  playerStart.capitalCell,
      armyUnits:    Systems.Military.initArmy(civ, civ.startStats.army),
      legendaryUnit: null,
      spies: Systems.Spies.init(civ),
      intelligence: {},
      activeTradeRoutes: [],
      activeSpending: [],
      factions: Systems.Factions.init(civ),
      diplomacy: aiNations,
      activePolicies: [],
      currentEvents: [], activeEventIndex: null, resolvedEvents: [],
      log: [],
      prosperityTurns: 0, collapseTurns: 0, famineturns: 0,
      _unlocked: {},        // UnlockSystem cache
      _warSummaries: [],    // War result history
      _diplomacyTab: 'neutral'  // default diplomacy tab
    };
    // Inicializar personajes diplomáticos inmediatamente
    if (typeof DiplomacySystem !== "undefined") DiplomacySystem.initCharacters(this.state);
    // Sistemas profundos
    if (typeof DeepSystemsIntegration !== "undefined") DeepSystemsIntegration.onInit(this.state);
    // Inicializar arcos narrativos
    if (typeof StoryArcSystem !== "undefined") StoryArcSystem.init(this.state);
    // Inicializar AP para que el primer turno funcione
    if (typeof ActionPoints !== "undefined") ActionPoints.reset(this.state);
  },

  detectStartClimate(capitalCell, mapData) {
    if (!capitalCell) return { current:'spring', season:'spring', activeExtreme:null, extremeDuration:0 };
    const temp = capitalCell.temperature || 0.5;
    const hum  = capitalCell.humidity   || 0.5;
    let startSeason = 'spring';
    if (temp < 0.25) startSeason = 'winter';
    else if (temp > 0.75 && hum < 0.35) startSeason = 'summer';
    return { current: startSeason, season: startSeason, activeExtreme: null, extremeDuration: 0 };
  },

  initAINations(mapData) {
    // Elegir 3 naciones aleatorias del pool de 7 para esta partida
    const seed    = mapData ? (mapData.seed || 42) : 42;
    const chosen  = pickAINations(seed);
    return chosen.map((def, i) => {
      const nation = AI.initNation(def);
      nation.cells = MapGenerator.getAINationCells(mapData, i + 1);
      const placement = mapData.nationsPlacement ? mapData.nationsPlacement[i + 1] : null;
      if (placement) { nation.mapCol = placement.col; nation.mapRow = placement.row; }
      return nation;
    });
  },

  // ══════════════════════════════════════════════
  // FIN DE TURNO — BLOQUEO si hay evento crítico sin resolver
  // ══════════════════════════════════════════════
  // ── RESOLVER PETICIONES DIPLOMÁTICAS PENDIENTES ─────────────
  _processPendingDiplomacy(state) {
    (state.diplomacy || []).forEach(nation => {

      // ── ALIANZA PENDIENTE ─────────────────────────────────────
      if (nation._alliancePending && state.turn > nation._alliancePendingTurn) {
        nation._alliancePending = false;
        const accepts = nation.relation > 30 && Math.random() < 0.7 + (nation.relation / 300);
        if (accepts) {
          nation.allied = true;
          nation.treaties = nation.treaties || [];
          if (!nation.treaties.includes('alliance')) nation.treaties.push('alliance');
          nation.relation = Math.min(100, nation.relation + 15);
          Systems.Log.add(state, '🛡 ' + nation.name + ' ACEPTA la alianza. ¡Acuerdo de defensa mutua!', 'good');
          (function(){
          state.diplomacyInbox = state.diplomacyInbox || [];
          state.diplomacyInbox.push({
            id: 'diplo_' + Date.now() + Math.random(),
            nationId: nation.id,
            nationIcon: nation.icon || '🏳',
            nationName: nation.name,
            charName: nation.character ? nation.character.name : '',
            char: nation.character || null,
            text: 'Aceptamos la alianza. Nuestras naciones lucharán juntas.',
            turn: state.turn,
            read: false,
            options: [{label:'Excelente',action:'ignore',effect:''}]
          });
        })()
        } else {
          nation.relation = Math.max(-100, nation.relation - 5);
          Systems.Log.add(state, '❌ ' + nation.name + ' rechaza la alianza. Relaciones insuficientes.', 'warn');
          (function(){
          state.diplomacyInbox = state.diplomacyInbox || [];
          state.diplomacyInbox.push({
            id: 'diplo_' + Date.now() + Math.random(),
            nationId: nation.id,
            nationIcon: nation.icon || '🏳',
            nationName: nation.name,
            charName: nation.character ? nation.character.name : '',
            char: nation.character || null,
            text: 'Declino la propuesta. Las circunstancias no son favorables.',
            turn: state.turn,
            read: false,
            options: [{label:'Entendido',action:'ignore',effect:''}]
          });
        })()
        }
      }

      // ── TRIBUTO PENDIENTE ─────────────────────────────────────
      if (nation._tributePending && state.turn > nation._tributePendingTurn) {
        nation._tributePending = false;
        const playerStr   = Systems.Military.calculateEffectiveStrength(state);
        const defenderStr = (nation.army || 200) * (0.8 + Math.random() * 0.4);
        const successChance = Math.min(0.75, Math.max(0.1, playerStr / (playerStr + defenderStr)));
        const success = Math.random() < successChance;

        if (success) {
          const amount = 80 + Math.floor(successChance * 200) + Math.floor(Math.random() * 80);
          state.resources.gold += amount;
          nation.relation = Math.max(-100, nation.relation - 15);
          nation._lastTributeTurn = state.turn;
          nation._tributeCount    = (nation._tributeCount || 0) + 1;
          Systems.Log.add(state, '💰 ' + nation.name + ' PAGA el tributo: +' + amount + ' oro.', 'good');
          (function(){
          state.diplomacyInbox = state.diplomacyInbox || [];
          state.diplomacyInbox.push({
            id: 'diplo_' + Date.now() + Math.random(),
            nationId: nation.id,
            nationIcon: nation.icon || '🏳',
            nationName: nation.name,
            charName: nation.character ? nation.character.name : '',
            char: nation.character || null,
            text: 'Pagamos el tributo... por ahora. No olvides que la paciencia tiene límites.',
            turn: state.turn,
            read: false,
            options: [{label:'Bien',action:'ignore',effect:''}]
          });
        })()
        } else {
          nation.relation = Math.max(-100, nation.relation - 25);
          Systems.Log.add(state, '😤 ' + nation.name + ' RECHAZA el tributo. Relación -25.', 'crisis');
          (function(){
          state.diplomacyInbox = state.diplomacyInbox || [];
          state.diplomacyInbox.push({
            id: 'diplo_' + Date.now() + Math.random(),
            nationId: nation.id,
            nationIcon: nation.icon || '🏳',
            nationName: nation.name,
            charName: nation.character ? nation.character.name : '',
            char: nation.character || null,
            text: '¡Nos niegas el respeto? No cederemos ante tu intimidación.',
            turn: state.turn,
            read: false,
            options: [{label:'Comprendido',action:'ignore',effect:''}]
          });
        })()
        }
      }
    });
  },

  endTurn() {
    const state = this.state;
    if (!state) return;

    // ── Snapshot del estado ANTES del turno para la crónica ──
    const _prevSnapshot = {
      morale:     state.morale,
      stability:  state.stability,
      resources:  { gold: state.resources.gold },
      diplomacy:  (state.diplomacy || []).map(n => ({ id: n.id, atWar: n.atWar, relation: n.relation, allied: n.allied })),
      _deficitTurns: state._deficitTurns || 0,
      _warsWon:   state._warsWon || 0,
    };

    // ── Puntos de Acción: resetear al inicio del siguiente turno ──
    ActionPoints.reset(state);

    // ── Resolver peticiones diplomáticas del turno anterior ──
    this._processPendingDiplomacy(state);

    // ⚠️ BLOQUEO: No se puede pasar turno si hay eventos sin decidir
    const pending = state.currentEvents || [];
    if (pending.length > 0) {
      // ── Auto-resolver eventos bloqueados demasiado tiempo ───────
      // Si un evento lleva más de 3 turnos pendiente, se auto-resuelve
      // con la opción menos dañina (índice 0 = primera opción)
      const autoResolvedNow = [];
      pending.forEach((ev, idx) => {
        const evAge = state.turn - (ev._generatedTurn || state.turn);
        if (evAge >= 3) {
          autoResolvedNow.push({ ev, idx });
        }
      });
      if (autoResolvedNow.length > 0) {
        // Resolver del último al primero para no desfasar índices
        autoResolvedNow.reverse().forEach(({ ev, idx }) => {
          Systems.Log.add(state, '⏳ Auto-resolución: "' + ev.title + '" sin acción durante 3 turnos. Se elige la primera opción.', 'warn');
          try { this.resolveEvent(idx, 0); } catch(e) {
            // Si falla, forzar eliminación
            state.currentEvents.splice(idx, 1);
          }
        });
        // Si se resolvieron todos, permitir continuar
        if (!state.currentEvents || state.currentEvents.length === 0) {
          state.activeEventIndex = null;
          // Continuar con el endTurn normalmente (no hacer return)
        } else {
          // Aún quedan pendientes — bloquear
          this.selectEvent(0);
          return;
        }
      } else {
        // Marcar turno de generación en eventos que no lo tengan
        pending.forEach(ev => {
          if (ev._generatedTurn === undefined) ev._generatedTurn = state.turn;
        });

        // Mostrar advertencia en la agenda
        const warnEl = document.getElementById('agenda-warning');
        if (warnEl) warnEl.classList.remove('hidden');
        this.selectEvent(0);

        // Flash del botón con info de turnos restantes
        const oldest = Math.min(...pending.map(ev => ev._generatedTurn || state.turn));
        const turnsLeft = Math.max(0, 3 - (state.turn - oldest));
        const btn = document.getElementById('btn-endturn');
        if (btn) {
          btn.style.background = '#c83030';
          btn.textContent = turnsLeft > 0 ? '⚠ Decide (' + turnsLeft + 't)' : '⚠ Decide ya';
          setTimeout(() => {
            btn.style.background = '';
            btn.textContent = '⏭ Fin de Turno';
          }, 2000);
        }
        return; // BLOQUEO EFECTIVO
      }
    }

    // 1. Actualizar clima
    Systems.Climate.update(state);

    // 2. Espías
    Systems.Spies.processMissions(state);
    Systems.Spies.tickIntelligence(state);

    // 3. Economía
    const rates = Systems.Economy.calculateRates(state);
    Systems.Economy.applyRates(state, rates);
    Systems.Economy.updateCorruption(state);

    // 4. Gasto público
    this._applyActiveSpending(state);

    // 5. Población
    Systems.Population.update(state);

    // 6. Facciones
    Systems.Factions.update(state);

    // 7. Sociedad
    Systems.Society.update(state);

    // 8. Sync army
    state.army = Systems.Military.totalSoldiers(state);

    // 9. IA
    AI.tick(state);
    // 9b. Procesar turnos de guerra multi-turno
    state.diplomacy.forEach(n => {
      if (n.atWar) {
        Systems.Trade.closeRoutesForNation(state, n.id);
        if (n._war && typeof WarSystem !== 'undefined') {
          WarSystem.processTurn(state, n);
        }
      }
    });

    // 10. Avanzar turno
    state.turn++;
    if (state.turn % 4 === 1) state.year++;

    // 10b. XP por turno supervivido
    Progression.awardXP(state, 'turn_survived');
    // 10c. Degradar salud de rutas bajo ataque
    Systems.Trade.decayRouteHealth(state);
    // 10d. Aplicar costes ocultos acumulados
    HiddenCosts.applyAccumulated(state);
    // 10e. Cooldowns
    ActionPoints.tickCooldowns(state);

    // 11. Limpiar eventos
    state.currentEvents  = [];
    state.activeEventIndex = null;

    // 12. Generar nuevos eventos
    this.generateTurnEvents();

    // 13. Condiciones de fin
    const result = this.checkEndConditions();
    if (result) { this.showEndScreen(result); return; }

    // 14. Renovar demandas de facciones cada 5 turnos
    if (state.turn % 5 === 0) {
      state.factions.forEach(f => { f.currentDemand = Systems.Factions.generateDemand(f.id); });
    }

    // 15. Arcos narrativos y eventos encadenados
    if (typeof StoryArcSystem !== "undefined") {
      StoryArcSystem.checkActivations(state);
      StoryArcSystem.processPendingChains(state);
    }
    // 16. Mensajes diplomáticos del turno
    if (typeof UnlockSystem !== "undefined") UnlockSystem.processTurn(state);
    if (typeof DiplomacySystem !== "undefined") {
      DiplomacySystem.generateTurnMessages(state);
    }
    // ── Limpiar inbox: máximo 20 mensajes, purgar los más viejos ──
    if (state.diplomacyInbox && state.diplomacyInbox.length > 20) {
      // Marcar como leídos los más viejos y conservar solo los 20 recientes
      state.diplomacyInbox = state.diplomacyInbox.slice(-20);
    }
    // Auto-marcar como leídos mensajes con más de 5 turnos
    if (state.diplomacyInbox) {
      state.diplomacyInbox.forEach(function(m) {
        if (state.turn - (m.turn || 0) >= 5) m.read = true;
      });
      // Eliminar mensajes leídos si el inbox supera 15
      if (state.diplomacyInbox.filter(m=>!m.read).length > 10 ||
          state.diplomacyInbox.length > 15) {
        state.diplomacyInbox = state.diplomacyInbox.filter(function(m) {
          return !m.read || state.turn - (m.turn||0) < 5;
        }).slice(-15);
      }
    }
    // 17. Story Arcs y eventos de faccion/civ
    if (typeof ArcSystem !== "undefined") {
      ArcSystem.tick(state);
    }
    // 18. Sistemas profundos
    if (typeof DeepSystemsIntegration !== 'undefined') DeepSystemsIntegration.onEndTurn(state);
    // 19. Render
    UI.fullRender(state);
    // 20. Crónica del turno
    if (typeof ChronicleSystem !== 'undefined') {
      setTimeout(() => ChronicleSystem.show(state, _prevSnapshot), 200);
    }
    // Sync Althoria (war zones, spies, trade routes)
    if (typeof AlthoriaMap !== 'undefined') {
      AlthoriaMap.sync(state);
      AlthoriaMap._syncTradeRoutes(state);  // Refresh route lines every turn
    }
    Systems.Log.add(state, '📅 Año ' + state.year + ', Turno ' + state.turn + ' — Población: ' + state.population.toLocaleString(), 'info');
    // UI.renderLog removed — game-log panel removed from HTML
  },

  // ══════════════════════════════════════════════
  // GASTO PÚBLICO — aplicar efectos por turno
  // ══════════════════════════════════════════════
  _applyActiveSpending(state) {
    const active = state.activeSpending || [];
    active.forEach(id => {
      const sp = PUBLIC_SPENDING[id];
      if (!sp) return;
      // Coste por turno
      state.resources.gold = Math.max(0, state.resources.gold - sp.costPerTurn);
      // Efectos
      const ef = sp.effects || {};
      if (ef.morale)             state.morale    = Math.min(100, state.morale + ef.morale);
      if (ef.stability)          state.stability = Math.min(100, state.stability + ef.stability);
      if (ef.corruption)         state.economy.corruption = Math.max(0, state.economy.corruption + ef.corruption);
      if (ef.trade_income)       state.economy.trade_income += ef.trade_income;
      if (ef.food_bonus)         state.economy.food_bonus = (state.economy.food_bonus||0) + ef.food_bonus;
      if (ef.inflation)          state.economy.inflation = Math.max(0, state.economy.inflation + ef.inflation);
      if (ef.faction_pueblo) {
        const f = state.factions.find(f=>f.id==='pueblo');
        if (f) f.satisfaction = Math.min(100, f.satisfaction + ef.faction_pueblo);
      }
      if (ef.faction_ejercito) {
        const f = state.factions.find(f=>f.id==='ejercito');
        if (f) f.satisfaction = Math.min(100, f.satisfaction + ef.faction_ejercito);
      }
      if (ef.faction_comerciantes) {
        const f = state.factions.find(f=>f.id==='comerciantes');
        if (f) f.satisfaction = Math.min(100, f.satisfaction + ef.faction_comerciantes);
      }
      if (ef.faction_iglesia) {
        const f = state.factions.find(f=>f.id==='iglesia');
        if (f) f.satisfaction = Math.min(100, f.satisfaction + ef.faction_iglesia);
      }
    });
  },

  toggleSpending(id) {
    const state = this.state;
    if (!state) return;
    state.activeSpending = state.activeSpending || [];
    const sp = PUBLIC_SPENDING[id];
    if (!sp) return;

    const idx = state.activeSpending.indexOf(id);
    if (idx > -1) {
      // Desactivar
      state.activeSpending.splice(idx, 1);
      // Revertir trade_income si aplica
      if (sp.effects.trade_income) state.economy.trade_income -= sp.effects.trade_income;
      Systems.Log.add(state, '🏗️ Gasto público cancelado: ' + sp.name, 'info');
    } else {
      // Activar — coste de activación único
      if (sp.costOneTime && state.resources.gold < sp.costOneTime) {
        Systems.Log.add(state, '⚠️ Oro insuficiente para activar ' + sp.name + ' (necesitas ' + sp.costOneTime + '💰)', 'warn');
        // UI.renderLog removed — game-log panel removed from HTML
        return;
      }
      if (sp.oneTimeCost) {
        const oc = sp.oneTimeCost;
        if (oc.stone && state.resources.stone < oc.stone) { Systems.Log.add(state, '⚠️ Piedra insuficiente', 'warn'); return; }
        if (oc.wood  && state.resources.wood  < oc.wood)  { Systems.Log.add(state, '⚠️ Madera insuficiente', 'warn'); return; }
        if (oc.stone) state.resources.stone -= oc.stone;
        if (oc.wood)  state.resources.wood  -= oc.wood;
      }
      if (sp.costOneTime) state.resources.gold -= sp.costOneTime;
      state.activeSpending.push(id);
      Systems.Log.add(state, '🏗️ Gasto activado: ' + sp.name + ' (-' + sp.costPerTurn + '💰/turno)', 'good');
    }
    UI.fullRender(state);
  },

  // ══════════════════════════════════════════════
  // EVENTOS
  // ══════════════════════════════════════════════
  generateTurnEvents() {
    const state  = this.state;
    let events   = Systems.Events.generateForTurn(state);
    // Enrich events with dynamic nation context
    events = events.map(ev => {
      if (!ev._dynamic && ev.id === 'alliance_offer') {
        // Find the event def in EVENT_POOL
        const def = EVENT_POOL.find(e => e.id === 'alliance_offer');
        if (def) {
          if (def._buildTitle)   ev.title       = def._buildTitle(state);
          if (def._buildDesc)    ev.description = def._buildDesc(state);
          if (def._buildContext) ev.context     = def._buildContext(state);
          if (def._nationId)     ev._offerNationId = def._nationId(state);
        }
      }
      return ev;
    });
    // Añadir eventos de arcos narrativos y eventos encadenados
    if (typeof ArcManager !== 'undefined') {
      ArcManager.applyTurnBonus(state);
      const arcEvents = ArcManager.generateForTurn(state);
      // Los eventos de arco tienen prioridad — van primero
      events = [...arcEvents, ...events].filter((e,i,a) => a.findIndex(x=>x.id===e.id)===i).slice(0,5);
    }
    state.currentEvents    = events;
    state.activeEventIndex = events.length > 0 ? 0 : null;
    UI.renderEventQueue(state);
    UI.renderActiveEvent(state);
  },

  selectEvent(idx) {
    this.state.activeEventIndex = idx;
    UI.renderEventQueue(this.state);
    UI.renderActiveEvent(this.state);
  },

  resolveEvent(eventIdx, optionIdx) {
    const state = this.state;
    if (!state || !state.currentEvents) return;
    const event = state.currentEvents[eventIdx];
    if (!event) return;

    // Notificar al sistema de arcos antes de resolver
    if (typeof StoryArcSystem !== "undefined") {
      StoryArcSystem.onEventDecision(state, event, optionIdx);
    }

    // Guard: validate option exists before applying
    if (!event.options || !event.options[optionIdx]) {
      // Event has no valid option — just remove it
      state.currentEvents.splice(eventIdx, 1);
      if (state.currentEvents.length > 0) {
        state.activeEventIndex = Math.min(eventIdx, state.currentEvents.length - 1);
      } else {
        state.activeEventIndex = null;
      }
      UI.renderEventQueue(state);
      UI.renderActiveEvent(state);
      return;
    }

    Systems.Events.applyDecision(state, event, optionIdx);
    // Procesar decisión de arco si corresponde
    if (typeof ArcManager !== 'undefined' && event.isArcEvent) {
      ArcManager.onDecision(state, event, optionIdx);
    }
    // Acción especial tax revolt
    if (event.options && event.options[optionIdx] && event.options[optionIdx].specialAction === 'setTax15') {
      this.setTaxRate(15);
    }
    state.currentEvents.splice(eventIdx, 1);

    if (state.currentEvents.length > 0) {
      state.activeEventIndex = Math.min(eventIdx, state.currentEvents.length - 1);
    } else {
      state.activeEventIndex = null;
      // Ocultar advertencia
      const warnEl = document.getElementById('agenda-warning');
      if (warnEl) warnEl.classList.add('hidden');
    }

    UI.fullRender(state);
  },

  // ══════════════════════════════════════════════
  // GUERRA CON BATALLA EN MAPA
  // ══════════════════════════════════════════════
  toggleMilitaryPanel() {
    // Military is now a right-panel tab — switch to it
    if (typeof switchRightTab === 'function') switchRightTab('military');
  },

  declareWar(nationId, targetRegionId) {
    // Use WarDeclaration for relation-based check + multi-turn war
    if (typeof WarDeclaration !== 'undefined') {
      WarDeclaration.declare(this.state, nationId, targetRegionId);
    } else {
      // Fallback
      const state  = this.state;
      if (!ActionPoints.spend(state, 2, "Declarar guerra")) return;
      const nation = state.diplomacy.find(n => n.id === nationId);
      if (!nation) return;
      nation.atWar = true;
      nation.relation = Math.max(-100, nation.relation - 30);
      Systems.Trade.closeRoutesForNation(state, nationId);
      Systems.Log.add(state, '⚔️ Guerra declarada contra ' + nation.name, 'crisis');
      if (typeof AlthoriaMap !== 'undefined') AlthoriaMap.updateWar(state);
      if (typeof BattleSystem !== 'undefined') BattleSystem.initBattle(state, nation);
    }
    if (typeof BattleSystem === 'undefined') UI.fullRender(this.state);
  },

  // Select attack target from map
  selectAttackTarget() {
    if (typeof RegionSelector !== 'undefined') {
      RegionSelector.selectAttackTarget(this.state);
    }
  },

  // Reinforce active war
  reinforceWar(nationId, troops) {
    if (typeof WarSystem !== 'undefined') WarSystem.reinforce(this.state, nationId, troops);
  },

  retreatWar(nationId) {
    if (typeof WarSystem !== 'undefined') WarSystem.retreat(this.state, nationId);
  },

  // ══════════════════════════════════════════════
  // POLÍTICAS
  // ══════════════════════════════════════════════
  togglePolicy(policyId, category) {
    const state    = this.state;
    const policies = POLICIES[category];
    const policy   = policies.find(p => p.id === policyId);
    if (!policy) return;

    const idx = state.activePolicies.indexOf(policyId);
    if (idx > -1) {
      state.activePolicies.splice(idx, 1);
      Systems.Log.add(state, '📋 Política cancelada: ' + policy.name, 'info');
    } else {
      // Exclusividad por categoría
      const catIds = policies.map(p => p.id);
      if (category === 'economia' || category === 'militar') {
        state.activePolicies = state.activePolicies.filter(ap => !catIds.includes(ap));
      }
      if (policy.cost_gold > 0 && state.resources.gold < policy.cost_gold) {
        Systems.Log.add(state, '⚠️ Oro insuficiente para ' + policy.name, 'warn');
        // UI.renderLog removed — game-log panel removed from HTML
        return;
      }
      if (policy.cost_gold > 0) state.resources.gold -= policy.cost_gold;
      state.activePolicies.push(policyId);
      if (policy.factionEffect) {
        Object.entries(policy.factionEffect).forEach(([fId, delta]) => {
          const f = state.factions.find(f => f.id === fId);
          if (f) f.satisfaction = Math.max(0, Math.min(100, f.satisfaction + delta));
        });
      }
      Systems.Log.add(state, '✅ Política activada: ' + policy.name, 'good');
    }
    UI.fullRender(state);
  },

  // ══════════════════════════════════════════════
  // ACCIONES ECONÓMICAS
  // ══════════════════════════════════════════════
  takeLoan() {
    this.state.resources.gold += 200;
    this.state.economy.debt   += 200;
    this.state.economy.inflation = Math.min(100, this.state.economy.inflation + 5);
    Systems.Log.add(this.state, '💳 Préstamo: +200💰. Deuda +200.', 'warn');
    UI.fullRender(this.state);
  },

  payDebt() {
    const s = this.state;
    if (s.resources.gold < 100) { Systems.Log.add(s, '⚠️ Sin oro suficiente para pagar deuda.', 'warn'); }
    else if (s.economy.debt <= 0) { Systems.Log.add(s, 'ℹ️ Sin deuda que pagar.', 'info'); }
    else {
      s.resources.gold -= 100;
      s.economy.debt    = Math.max(0, s.economy.debt - 100);
      s.economy.inflation = Math.max(0, s.economy.inflation - 3);
      Systems.Log.add(s, '📤 Deuda reducida: -100. Inflación baja.', 'good');
    }
    UI.fullRender(this.state);
  },

  // ── SISTEMA DE IMPUESTOS EN % — slider % libre con etiquetas ──
  setTaxRate(rate) {
    const state = this.state;
    if (!state) return;
    const pct = Math.max(0, Math.min(100, parseInt(rate) || 0));
    state.economy.taxRate = pct;
    // Feedback inmediato en log
    const label = pct <= 5 ? '✨ Exento'
                : pct <= 20 ? '📊 Moderado'
                : pct <= 40 ? '📈 Alto'
                : pct <= 65 ? '💸 Oneroso'
                : '🔥 Confiscatorio';
    Systems.Log.add(state, `📊 Impuestos ajustados a ${pct}% — ${label}`, pct > 50 ? 'warn' : 'info');
    // Recalcular tasas inmediatamente
    const rates = Systems.Economy.calculateRates(state);
    state.rates = rates;
    UI.updateTopBar(state);
    UI.renderEconomy(state);
    // UI.renderLog removed — game-log panel removed from HTML
  },

  raiseTexes() {
    // Legacy — ahora usa setTaxRate
    const cur = this.state.economy.taxRate || 20;
    this.setTaxRate(cur + 10);
  },

  buildIrrigation() {
    const s = this.state;
    if (s.resources.wood < 150 || s.resources.stone < 100 || s.resources.gold < 200) {
      Systems.Log.add(s, '⚠️ Faltan recursos para irrigación (150🌲 100🏔️ 200💰).', 'warn');
      if (typeof showResourceError === 'function') {
        const m=[];
        if(s.resources.wood<150)  m.push({icon:'🌲',name:'Madera',need:150,have:Math.floor(s.resources.wood)});
        if(s.resources.stone<100) m.push({icon:'🏔️',name:'Piedra', need:100,have:Math.floor(s.resources.stone)});
        if(s.resources.gold<200)  m.push({icon:'💰',name:'Oro',    need:200,have:Math.floor(s.resources.gold)});
        if(m.length) showResourceError(m);
      }
    } else {
      s.resources.wood  -= 150; s.resources.stone -= 100; s.resources.gold -= 200;
      s.economy.food_bonus = (s.economy.food_bonus || 0) + 50;
      Systems.Log.add(s, '🚿 Irrigación construida. +50 alimentos/turno.', 'good');
    }
    UI.fullRender(this.state);
  },

  buildGranary() {
    const s = this.state;
    if (s.resources.wood < 100) { Systems.Log.add(s, '⚠️ Faltan 100🌲 para graneros.', 'warn'); if(typeof showResourceError==='function') showResourceError([{icon:'🌲',name:'Madera',need:100,have:Math.floor(s.resources.wood)}]); }
    else {
      s.resources.wood -= 100; s.resources.food += 200;
      Systems.Log.add(s, '🏚️ Graneros construidos. +200 alimentos.', 'good');
    }
    UI.fullRender(this.state);
  },

  // ══════════════════════════════════════════════
  // MILITAR
  // ══════════════════════════════════════════════

  // ── DESPLEGAR TROPAS EN REGIÓN ────────────────────────────
  deployToRegion(btnOrSelId, numId) {
    const state = this.state;
    if (!state) return;
    // Support both (button el with dataset) and (selId, numId strings)
    let regionId, amount;
    if (typeof btnOrSelId === 'string') {
      const sel = document.getElementById(btnOrSelId);
      const inp = document.getElementById(numId || 'troops-deploy-num');
      if (!sel || !inp) return;
      regionId = sel.value;
      amount   = parseInt(inp.value) || 0;
    } else if (btnOrSelId && btnOrSelId.dataset) {
      // Called from data-attribute button
      const selId = btnOrSelId.dataset.sel || 'garrison-region-sel';
      const numId2 = btnOrSelId.dataset.num || 'garrison-amount';
      const sel = document.getElementById(selId);
      const inp = document.getElementById(numId2);
      if (!sel || !inp) return;
      regionId = sel.value;
      amount   = parseInt(inp.value) || 0;
    } else {
      // Fallback: try default IDs
      const sel = document.getElementById('garrison-region-sel') || document.getElementById('troops-region-sel');
      const inp = document.getElementById('garrison-amount') || document.getElementById('troops-deploy-num');
      if (!sel || !inp) return;
      regionId = sel.value;
      amount   = parseInt(inp.value) || 0;
    }
    const maxMove  = Math.floor((state.army || 0) * 0.5);

    if (!regionId) { Systems.Log.add(state,'⚠️ Selecciona una región de destino.','warn'); UI.renderMilitary(state); return; }
    if (amount <= 0) { Systems.Log.add(state,'⚠️ Indica cuántos soldados desplegar.','warn'); UI.renderMilitary(state); return; }
    if (amount > maxMove) { Systems.Log.add(state,'⚠️ Máximo 50% del ejército ('+maxMove+').','warn'); UI.renderMilitary(state); return; }
    if (amount > state.army) { Systems.Log.add(state,'⚠️ No tienes suficientes soldados.','warn'); UI.renderMilitary(state); return; }

    const playerZones = (typeof AlthoriaMap !== 'undefined') ? (AlthoriaMap.nationZones||{})['player']||[] : [];
    if (playerZones.length > 0 && !playerZones.includes(regionId)) {
      Systems.Log.add(state,'⚠️ Solo puedes desplegar en tus propias regiones.','warn'); UI.renderMilitary(state); return;
    }

    state.army -= amount;
    state._garrisons = state._garrisons || {};
    state._garrisons[regionId] = (state._garrisons[regionId] || 0) + amount;
    const region = typeof ALTHORIA_REGIONS !== 'undefined' ? ALTHORIA_REGIONS.find(r=>r.id===regionId) : null;
    Systems.Log.add(state,'🗺️ '+amount.toLocaleString()+' tropas desplegadas en '+(region?region.name:regionId)+'.','good');
    UI.fullRender(state);
  },

  recallGarrison(regionIdOrBtn) {
    const state = this.state;
    if (!state) return;
    // Support both string regionId and button element with data-rid
    const regionId = (typeof regionIdOrBtn === 'string')
      ? regionIdOrBtn
      : (regionIdOrBtn && regionIdOrBtn.dataset && regionIdOrBtn.dataset.rid) || '';
    if (!regionId) return;
    const garrison = (state._garrisons||{})[regionId] || 0;
    if (!garrison) return;
    state.army += garrison;
    delete state._garrisons[regionId];
    const region = typeof ALTHORIA_REGIONS !== 'undefined' ? ALTHORIA_REGIONS.find(r=>r.id===regionId) : null;
    Systems.Log.add(state,'↩ '+garrison.toLocaleString()+' tropas retiradas de '+(region?region.name:regionId)+'.','info');
    UI.fullRender(state);
  },

  recruitUnit(typeId, count) {
    // Check resources BEFORE spending AP
    const def = MILITARY_UNITS[typeId];
    if (def) {
      const s = this.state; const n = count || 50;
      const miss = [];
      if (def.cost.gold && s.resources.gold < def.cost.gold*(n/50)) miss.push({icon:'💰',name:'Oro',need:Math.ceil(def.cost.gold*(n/50)),have:Math.floor(s.resources.gold)});
      if (def.cost.iron && s.resources.iron < def.cost.iron*(n/50)) miss.push({icon:'⚙️',name:'Hierro',need:Math.ceil(def.cost.iron*(n/50)),have:Math.floor(s.resources.iron)});
      if (def.cost.wood && s.resources.wood < def.cost.wood*(n/50)) miss.push({icon:'🌲',name:'Madera',need:Math.ceil(def.cost.wood*(n/50)),have:Math.floor(s.resources.wood)});
      if (miss.length) { if (typeof showResourceError==='function') showResourceError(miss); return; }
    }
    if (!ActionPoints.spend(this.state, 1, 'Reclutar tropas')) return;
    const result = Systems.Military.recruitUnit(this.state, typeId, count);
    if (!result.ok) {
      Systems.Log.add(this.state, '⚠️ ' + result.msg, 'warn');
      if (typeof showResourceError === 'function') {
        const def = MILITARY_UNITS[typeId];
        const s   = this.state;
        const miss = [];
        if (def && def.cost.gold && s.resources.gold < def.cost.gold * (count/50)) miss.push({icon:'💰',name:'Oro',    need: Math.ceil(def.cost.gold*(count/50)),  have:Math.floor(s.resources.gold)});
        if (def && def.cost.iron && s.resources.iron < def.cost.iron * (count/50)) miss.push({icon:'⚙️', name:'Hierro', need: Math.ceil(def.cost.iron*(count/50)), have:Math.floor(s.resources.iron)});
        if (def && def.cost.wood && s.resources.wood < def.cost.wood * (count/50)) miss.push({icon:'🌲',name:'Madera',  need: Math.ceil(def.cost.wood*(count/50)),  have:Math.floor(s.resources.wood)});
        if (miss.length) showResourceError(miss);
      }
    }
    this.state.army = Systems.Military.totalSoldiers(this.state);
    UI.fullRender(this.state);
  },

  recruitLegendary(legendaryId) {
    const result = Systems.Military.recruitLegendary(this.state, legendaryId);
    if (!result.ok) Systems.Log.add(this.state, '⚠️ ' + result.msg, 'warn');
    UI.fullRender(this.state);
  },

  // ══════════════════════════════════════════════
  // ESPÍAS
  // ══════════════════════════════════════════════
  sendSpy(missionId, nationId) {
    if (!ActionPoints.spend(this.state, 1, 'Enviar espía')) return;
    const result = Systems.Spies.sendMission(this.state, missionId, nationId);
    if (!result.ok) Systems.Log.add(this.state, '⚠️ ' + result.msg, 'warn');
    UI.fullRender(this.state);
  },

  trainSpy() {
    if (this.state.resources.gold < 200) {
      Systems.Log.add(this.state, '⚠️ Necesitas 200💰 para entrenar un espía.', 'warn');
      if(typeof showResourceError==='function') showResourceError([{icon:'💰',name:'Oro',need:200,have:Math.floor(this.state.resources.gold)}]);
    } else {
      this.state.resources.gold -= 200;
      this.state.spies = this.state.spies || { count: 1, active: [] };
      this.state.spies.count++;
      Systems.Log.add(this.state, '🕵️ Nuevo espía entrenado.', 'good');
    }
    UI.fullRender(this.state);
  },

  // ══════════════════════════════════════════════
  // COMERCIO
  // ══════════════════════════════════════════════
  openTradeRoute(routeId, nationId) {
    // Check if route can open BEFORE spending AP
    const rt = TRADE_ROUTES[routeId];
    const nation = (this.state.diplomacy||[]).find(n=>n.id===nationId);
    if (!rt || !nation) return;
    if (nation.relation < (rt.requires?.relation||0)) {
      if (typeof showResourceError === 'function')
        showResourceError([{icon:'🤝',name:'Relación',need:rt.requires?.relation||0,have:nation.relation}]);
      return;
    }
    if (this.state.resources.gold < rt.cost.gold) {
      if (typeof showResourceError === 'function')
        showResourceError([{icon:'💰',name:'Oro',need:rt.cost.gold,have:Math.floor(this.state.resources.gold)}]);
      return;
    }
    // Now spend AP
    if (!ActionPoints.spend(this.state, 1, 'Abrir ruta comercial')) return;
    const result = Systems.Trade.openRoute(this.state, routeId, nationId);
    if (!result.ok) {
      Systems.Log.add(this.state, '⚠️ ' + result.msg, 'warn');
      if (typeof showResourceError === 'function') {
        const rt=TRADE_ROUTES[routeId]; const s=this.state;
        const m=[];
        if(rt&&rt.cost.gold &&s.resources.gold <rt.cost.gold)  m.push({icon:'💰',name:'Oro',   need:rt.cost.gold,  have:Math.floor(s.resources.gold)});
        if(rt&&rt.cost.iron &&s.resources.iron <rt.cost.iron)  m.push({icon:'⚙️', name:'Hierro',need:rt.cost.iron,  have:Math.floor(s.resources.iron)});
        if(rt&&rt.cost.wood &&s.resources.wood <rt.cost.wood)  m.push({icon:'🌲',name:'Madera', need:rt.cost.wood,  have:Math.floor(s.resources.wood)});
        if(m.length) showResourceError(m);
      }
    }
    UI.fullRender(this.state);
  },

  closeTradeRoute(routeId, nationId) {
    Systems.Trade.closeRoute(this.state, routeId, nationId);
    UI.fullRender(this.state);
  },

  // ══════════════════════════════════════════════
  // CONDICIONES FINALES
  // ══════════════════════════════════════════════
  checkEndConditions() {
    const s = this.state;
    for (const lose of LOSE_CONDITIONS) { if (lose.check(s)) return { type:'defeat',  condition: lose }; }
    for (const win  of WIN_CONDITIONS)  { if (win.check(s))  return { type:'victory', condition: win  }; }
    return null;
  },

  showEndScreen(result) {
    const overlay = document.getElementById('modal-overlay');
    const title   = document.getElementById('modal-title');
    const body    = document.getElementById('modal-body');
    if (!overlay) return;
    // Populate content BEFORE showing — prevents flash of black empty box

    const s = this.state;
    const isVictory = result.type === 'victory';

    // ── Generar mensajes de las naciones rivales ──
    const nationMessages = this._generateEndMessages(s, isVictory);

    if (isVictory) {
      title.innerHTML = '<span style="font-size:2em">⚔️</span><br>¡VICTORIA!';
      title.style.color = 'var(--gold2)';
    } else {
      title.innerHTML = '<span style="font-size:2em">💀</span><br>DERROTA';
      title.style.color = 'var(--red2)';
    }

    body.innerHTML = `
      <div class="end-condition">
        <b>${result.condition.name}</b>
        <div>${result.condition.description}</div>
      </div>
      <div class="end-stats">
        <span>🏰 ${s.civName}</span>
        <span>📅 Año ${s.year}, Turno ${s.turn}</span>
        <span>👥 ${s.population.toLocaleString()} hab.</span>
        <span>🗺️ ${s.althoriaRegions || 1} regiones</span>
      </div>
      <div class="end-epitaph">
        ${isVictory
          ? `<em>"${s.civName} forjó un legado que los siglos recordarán."</em>`
          : `<em>"La historia no olvidará las decisiones que llevaron a ${s.civName} a su fin."</em>`}
      </div>
      <div class="end-messages">
        <div class="em-header">${isVictory ? '📣 Los otros gobernantes reaccionan:' : '🎺 El mundo comenta tu caída:'}</div>
        ${nationMessages.map(m => `
          <div class="end-msg-card">
            <div class="emc-portrait">${m.portrait}</div>
            <div class="emc-body">
              <div class="emc-from">${m.nationIcon} ${m.nationName} — <span class="emc-role">${m.charName}</span></div>
              <div class="emc-text">"${m.text}"</div>
            </div>
          </div>`).join('')}
      </div>
    `;
    overlay.classList.remove('hidden');  // Show AFTER content ready
  },

  _generateEndMessages(state, isVictory) {
    const diplomacy = state.diplomacy || [];
    const msgs = [];

    // Mensajes según personalidad y resultado
    const VICTORY_MSGS = {
      agresiva: [
        "Nunca subestimes a alguien que lucha en nombre de su pueblo. Lección aprendida... a nuestra costa.",
        "Merecido. Yo hubiera hecho lo mismo. O algo peor, sin mentir.",
        "Bah. Esta derrota es temporal. Regresaré con el doble de ejército. Disfruta mientras puedas.",
        "¡Maldición! Perdí una fortuna apostando contra ti. Mis respetos, aunque me arruines.",
        "Mira lo que han logrado. Si hubieran sido mis aliados... ya, ya, demasiado tarde."
      ],
      diplomática: [
        "Una victoria admirable. Me inclino ante vuestra excelencia. Aunque quizás... ¿podríamos hablar de términos de paz duradera?",
        "Magnifico. Aunque debo confesar que esperaba ganarte yo en diplomacia. Parece que me quedé corto.",
        "Los dioses os favorecen. Si hubiera sabido que erais tan... decididos, habría enviado más embajadores y menos soldados.",
        "Habéis reunificado lo que estaba roto. Aunque si me hubieras consultado, habría sugerido algo con menos sangre.",
        "Felicitaciones. Y dicho esto, ¿el tratado comercial que propuse sigue sobre la mesa?"
      ],
      oportunista: [
        "Sabía que ganarías. Por eso aposte... en fin, los detalles son aburridos. ¡Bienvenido al poder!",
        "Qué interesante. Había invertido mucho en el bando equivocado. Error mío. Totalmente mío.",
        "Impresionante. ¿Buscas socios para administrar lo que acabas de conquistar? Tengo experiencia.",
        "Lo vi venir desde el principio. Claro. Totalmente desde el principio. No desde ayer por la noche. Claro.",
        "Eres peligroso. Me gusta eso. Casi tanto como me asusta."
      ]
    };

    const DEFEAT_MSGS = {
      agresiva: [
        "¡JA! ¡Al fin! ¡He esperado esto tanto tiempo! Bueno, no TANTO tiempo... pero lo he disfrutado mucho.",
        "Vaya. Creí que durarías más. Aunque al menos caíste como un guerrero. Aproximadamente.",
        "El destino del débil es caer. Aunque entre nosotros, nadie esperaba que cayeras tan pronto.",
        "No me alegra verte así. Es mentira. Sí me alegra. Bastante.",
        "El campo de batalla no perdona. ¿Alguien me ayuda a recoger este territorio abandonado?"
      ],
      diplomática: [
        "Oh, qué tragedia. Te advertí que la diplomacia era el camino. Ahora ya es tarde. Lo lamento sinceramente. Casi.",
        "Si hubieras aceptado mi propuesta de alianza en el turno tres... pero no, demasiado orgulloso.",
        "Querido colega: esto es lo que pasa cuando no escuchas los consejos de quienes saben más. Es decir, yo.",
        "Lamentable final. Aunque si te sirve de consuelo, los anales de la historia te dedicarán... media página.",
        "He enviado mis condolencias a tu pueblo. Y también una oferta para administrar tus territorios. Era lo correcto."
      ],
      oportunista: [
        "Mmmm. Inesperado. Para ti. Para mí era estadísticamente probable desde el turno doce.",
        "No te preocupes. El poder es circular. Caerás ahora... y yo subiré. Luego tú subirás... bueno, quizás no tanto tú.",
        "Tengo buenas noticias y malas noticias. Las malas: ya sabes cuáles son. Las buenas: tu caída crea oportunidades.",
        "¿Qué puedo decir? El que no arriesga no gana. Y el que arriesga mal tampoco.",
        "Esto me entristece profundamente. Bueno, las palabras son baratas. En realidad estoy tomando nota de qué fronteras quedan libres."
      ]
    };

    diplomacy.forEach((nation, i) => {
      const p     = nation.personality || 'oportunista';
      const pool  = isVictory ? (VICTORY_MSGS[p] || VICTORY_MSGS.oportunista) : (DEFEAT_MSGS[p] || DEFEAT_MSGS.oportunista);
      const seed  = (state.mapSeed || 42) + i * 37 + (isVictory ? 0 : 999);
      const idx   = seed % pool.length;
      const char  = nation.character || { name: 'Embajador', role: 'Enviado', portrait: '📜' };

      msgs.push({
        nationIcon: nation.icon || '🏰',
        nationName: nation.name,
        charName:   char.name + ', ' + char.role,
        portrait:   char.portrait,
        text:       pool[idx],
        personality: p
      });
    });

    // Si hay menos de 2, añadir voz del narrador
    if (msgs.length === 0) {
      msgs.push({
        nationIcon: '📜',
        nationName: 'Los Cronistas',
        charName:   'Historiador Real',
        portrait:   '✍️',
        text: isVictory
          ? 'Los archivos registran esta victoria para la eternidad. Que sea ejemplo para las generaciones venideras.'
          : 'Los archivos registran esta caída con sobria tristeza. Que sirva de lección a los que vengan después.'
      });
    }

    return msgs;
  }
};

// ══════════════════════════════════════════════
// CODEX
// ══════════════════════════════════════════════
function buildCodex() {
  const container = document.getElementById('codex-body');
  if (!container) return;
  container.innerHTML = `
    <div class="codex-section"><h3>⚖️ Sistema Político</h3>
      <p>El gobierno define modificadores base de estabilidad y corrupción. Las facciones tienen influencia política que pondera su satisfacción. Si cae bajo 35 durante 3 turnos, hay golpe de estado.</p>
    </div>
    <div class="codex-section"><h3>📊 Economía</h3>
      <p>Producción neta = (base de población ÷ 12) × modificador climático × (1 − corrupción/200) − consumo. La deuda genera intereses. La inflación sobre 40 devalúa el oro.</p>
    </div>
    <div class="codex-section"><h3>🌱 Estaciones</h3>
      <p>16 turnos = 1 año. 4 estaciones de 4 turnos. Invierno: -28% alimentos, -15% ejército. Verano: 28% de probabilidad de sequía. Los eventos extremos se encadenan.</p>
    </div>
    <div class="codex-section"><h3>⚔️ Batallas</h3>
      <p>Al declarar guerra, se abre el panel de batalla. Probabilidad calculada: ratio de fuerzas × moral × corrupción × estación. Ganar da 50% de los recursos del rival.</p>
    </div>
    <div class="codex-section"><h3>🕵️ Espías</h3>
      <p>5 misiones disponibles. Sin espionaje, la fuerza enemiga tiene ±40% de incertidumbre en el análisis de batalla. Reconocimiento revela datos exactos 4 turnos.</p>
    </div>
    <div class="codex-section"><h3>🏗️ Gasto Público</h3>
      <p>10 opciones de inversión pública con efectos específicos en moral, facciones, economía y defensa. Cada una tiene reacción poblacional visible. Coste fijo por turno.</p>
    </div>
  `;
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
// ── TOP-BAR TOOLTIP SYSTEM ──────────────────────────────────
(function() {
  const box = document.getElementById('tb-tooltip');
  if (!box) return;

  document.addEventListener('mouseover', function(e) {
    const el = e.target.closest('.tb-tip');
    if (!el) { box.style.display = 'none'; return; }
    const raw = el.getAttribute('data-tip');
    if (!raw) return;
    // First line is bold title, rest is body
    const lines = raw.split('&#10;');
    box.innerHTML = '<b>' + lines[0] + '</b>' + lines.slice(1).join('<br>');
    box.style.display = 'block';
    _positionTooltip(e, box);
  });

  document.addEventListener('mousemove', function(e) {
    if (box.style.display === 'none') return;
    _positionTooltip(e, box);
  });

  document.addEventListener('mouseout', function(e) {
    const el = e.target.closest('.tb-tip');
    if (el && !el.contains(e.relatedTarget)) box.style.display = 'none';
  });

  function _positionTooltip(e, box) {
    const bw = box.offsetWidth  || 240;
    const bh = box.offsetHeight || 80;
    let x = e.clientX + 14;
    let y = e.clientY + 14;
    if (x + bw > window.innerWidth  - 8) x = e.clientX - bw - 8;
    if (y + bh > window.innerHeight - 8) y = e.clientY - bh - 8;
    box.style.left = x + 'px';
    box.style.top  = y + 'px';
  }
})();

// ── RESOURCE ERROR TOAST ────────────────────────────────────
function showResourceError(missing) {
  var existing = document.getElementById('resource-toast');
  if (existing) { if(typeof existing.remove=="function") existing.remove(); else if(existing.parentNode) existing.parentNode.removeChild(existing); }
  var toast = document.createElement('div');
  toast.id = 'resource-toast';
  toast.className = 'resource-toast';
  var msgs = missing.map(function(m) {
    return m.icon + ' ' + m.name + ': necesitas ' + m.need + ', tienes ' + m.have;
  });
  toast.innerHTML = '<span class="toast-icon">⚠️</span><span>' + msgs.join(' · ') + '</span>';
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('toast-show'); }, 10);
  setTimeout(function() { toast.classList.remove('toast-show'); setTimeout(function(){toast.remove();},400); }, 3000);
}


// ══════════════════════════════════════════════════════════
// COMPARTIR JUEGO
// ══════════════════════════════════════════════════════════
function shareGame(platform) {
  var url  = window.location.href.split('?')[0].split('#')[0];
  var text = '⚔ IMPERIUM — Estrategia medieval sistémica. Mapas únicos, IA con personalidad, decisiones que duelen. ¡Reta tu destino!';

  if (platform === 'x') {
    var xUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
    window.open(xUrl, '_blank', 'width=600,height=400');

  } else if (platform === 'whatsapp') {
    var waUrl = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
    window.open(waUrl, '_blank');

  } else if (platform === 'mail') {
    var subject = '⚔ IMPERIUM — Juego de estrategia';
    var body    = text + '\n\n' + url;
    window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

  } else if (platform === 'copy') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function() {
        var btn = document.getElementById('share-copy-btn');
        if (btn) {
          var orig = btn.innerHTML;
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
          btn.style.color = '#6ab840';
          setTimeout(function(){ btn.innerHTML = orig; btn.style.color = ''; }, 2000);
        }
      });
    } else {
      // Fallback: select a temporary input
      var tmp = document.createElement('input');
      tmp.value = url;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      var btn2 = document.getElementById('share-copy-btn');
      if (btn2) { btn2.style.color = '#6ab840'; setTimeout(function(){ btn2.style.color=''; }, 2000); }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  buildCodex();
  Auth.init();
  SaveSystem.renderLoginSaves();
});
