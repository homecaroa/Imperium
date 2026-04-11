// ============================================================
// IMPERIUM — GAME.JS v4
// Loop principal con: bloqueo de turno sin decisión,
// guerra con batalla en mapa, gasto público, guardado
// ============================================================

window.Game = window.Game || {

  state: null,

  // ----------------------------------------------
  // INICIO
  // ----------------------------------------------
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
  },

  // ----------------------------------------------
  // ESTADO INICIAL
  // ----------------------------------------------
  initState(civ) {
    const mapSeed     = Math.floor(Math.random() * 9999999);
    const mapData     = MapGenerator.generate(mapSeed);
    const playerStart = MapGenerator.getPlayerStartStats(mapData);
    const aiNations   = this.initAINations(mapData);
    const mb          = playerStart.resourceBonuses;

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
      population:  civ.startStats.population,
      stability:   civ.startStats.stability,
      morale:      civ.startStats.morale,
      army:        civ.startStats.army,
      economy: {
        corruption: civ.id === 'chinese' ? 30 : 10,
        inflation: 0, debt: 0, trade_income: 8, food_bonus: 0,
        taxRate: 20,
      },
      climate: this.detectStartClimate(playerStart.capitalCell, mapData),
      territories:     playerStart.territories,
      althoriaRegions: 1,
      playerCells:     playerStart.cellIds,
      capitalCell:     playerStart.capitalCell,
      armyUnits:       Systems.Military.initArmy(civ, civ.startStats.army),
      legendaryUnit:   null,
      activeSpending:  [],
      diplomacy:       aiNations,
      currentEvents: [], activeEventIndex: null, resolvedEvents: [],
      log: [],
      _troopMovements: [],
      _attackTarget:   null,
      prosperityTurns: 0, collapseTurns: 0, famineturns: 0,
      _unlocked: {},
      _warSummaries: [],
      _warsWon: 0,
      _reputation: 50,
      xp: 0, level: 1,
      _history: [],        // Kingdom event history [{turn,year,type,title,text,icon,img}]
      _pendingChain: null, // Chained military event
    };
    if (typeof DiplomacySystem !== 'undefined') DiplomacySystem.initCharacters(this.state);
    if (typeof ActionPoints    !== 'undefined') ActionPoints.reset(this.state);
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

  // Procesar diplomacia pendiente cada turno — version simplificada
  _processPendingDiplomacy(state) {
    (state.diplomacy || []).forEach(nation => {
      // Recuperacion lenta de relaciones en paz
      if (!nation.atWar && (nation.relation || 0) < 0) {
        nation.relation = Math.min(0, (nation.relation || 0) + 1);
      }
    });
  },

  endTurn() {
    const state = this.state;
    if (!state) return;

    // -- Snapshot del estado ANTES del turno para la crónica --
    const _prevSnapshot = {
      morale:     state.morale,
      stability:  state.stability,
      resources:  { gold: state.resources.gold },
      diplomacy:  (state.diplomacy || []).map(n => ({ id: n.id, atWar: n.atWar, relation: n.relation, allied: n.allied })),
      _deficitTurns: state._deficitTurns || 0,
      _warsWon:   state._warsWon || 0,
    };

    // -- Puntos de Acción: resetear al inicio del siguiente turno --
    ActionPoints.reset(state);

    // -- Resolver peticiones diplomáticas del turno anterior --
    this._processPendingDiplomacy(state);

    // ⚠️ BLOQUEO: No se puede pasar turno si hay eventos sin decidir
    const pending = state.currentEvents || [];
    if (pending.length > 0) {
      // -- Auto-resolver eventos bloqueados demasiado tiempo -------
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

    // 3. Economía
    const rates = Systems.Economy.calculateRates(state);
    Systems.Economy.applyRates(state, rates);
    Systems.Economy.updateCorruption(state);

    // 4. Gasto público
    if (typeof this._applyActiveSpending === 'function') this._applyActiveSpending(state);

    // 5. Población
    Systems.Population.update(state);

    // 8. Sync army
    state.army = Systems.Military.totalSoldiers(state);

    // 9. IA
    if (typeof AI !== 'undefined' && AI && AI.tick) AI.tick(state);
    // 9b. Procesar turnos de guerra multi-turno
    // Skip if BattleSystem has active battle (battle IS this turn's combat)
    var _battleActive = (typeof BattleSystem !== 'undefined' && BattleSystem.activeBattle);
    state.diplomacy.forEach(n => {
      if (n.atWar) {
        if (n._war && typeof WarSystem !== 'undefined' && !_battleActive) {
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
    this._checkSurrenders(state);
    const result = this.checkEndConditions();
    if (result) { this.showEndScreen(result); return; }

    // 16. Mensajes diplomáticos del turno
    if (typeof UnlockSystem !== "undefined") UnlockSystem.processTurn(state);
    if (typeof DiplomacySystem !== 'undefined') DiplomacySystem.processTurn(state);
    // -- Limpiar inbox: máximo 20 mensajes, purgar los más viejos --
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
    // ArcSystem removed
    // 19. Render
    UI.fullRender(state);
    // 20. Crónica del turno
    // Crónica: mostrar cada 4 turnos (1 año)
    if (state.turn > 2 && state.turn % 4 === 0 && typeof ChronicleSystem !== 'undefined') {
      const _snap = _prevSnapshot;
      const _st   = state;
      setTimeout(function() {
        ChronicleSystem.show(_st, _snap);
      }, 600);
    }
    // Sync Althoria (war zones, spies, trade routes)
    if (typeof AlthoriaMap !== 'undefined') {
      AlthoriaMap.sync(state);
    }
    Systems.Log.add(state, '📅 Año ' + state.year + ', Turno ' + state.turn + ' — Población: ' + state.population.toLocaleString(), 'info');
    // UI.renderLog removed — game-log panel removed from HTML
  },

  // ----------------------------------------------
  // GASTO PÚBLICO — aplicar efectos por turno
  // ----------------------------------------------
  _applyActiveSpending(state) {
    const active = state.activeSpending || [];
    active.forEach(id => {
      const sp = PUBLIC_SPENDING[id];
      if (!sp) return;
      // Coste por turno
      state.resources.gold = Math.max(0, state.resources.gold - sp.costPerTurn);
      // Efectos
      const ef = sp.effects || {};
      if (ef.morale)             state.morale    = Math.round(Math.min(100, Math.max(0, state.morale + ef.morale)));
      if (ef.stability)          state.stability = Math.min(100, state.stability + ef.stability);
      if (ef.corruption)         state.economy.corruption = Math.max(0, state.economy.corruption + ef.corruption);
      if (ef.trade_income)       state.economy.trade_income += ef.trade_income;
      if (ef.food_bonus)         state.economy.food_bonus = (state.economy.food_bonus||0) + ef.food_bonus;
      if (ef.inflation)          state.economy.inflation = Math.max(0, state.economy.inflation + ef.inflation);    });
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

  // ----------------------------------------------
  // EVENTOS
  // ----------------------------------------------
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
    // Chained military events after battle
    if (state._pendingChain && typeof CHAIN_EVENT_POOL !== 'undefined') {
      var chainId = state._pendingChain;
      state._pendingChain = null;
      var chainEv = CHAIN_EVENT_POOL.find(function(e){ return e.id === chainId; });
      if (chainEv) events.unshift(Object.assign({}, chainEv, {id: chainId+'_'+state.turn}));
    }
    events = events.slice(0, 5);
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

    // Handle special effects
    const _opt = (event.options && event.options[optionIdx]) ? event.options[optionIdx] : null;
    const _ef  = _opt ? (_opt.effects || {}) : {};

    // Tax revolt
    if (_opt && _opt.specialAction === 'setTax15') this.setTaxRate(15);

    // End war (surrender)
    if (_ef._endWar) {
      const _warN = (state.diplomacy||[]).find(function(n){return n.id===_ef._endWar;});
      if (_warN) {
        _warN.atWar = false; _warN._war = null; _warN._surrenderOffered = false;
        _warN.relation = Math.min(-10, (_warN.relation||0) + 20);
        state._warsWon = (state._warsWon||0) + 1;
      }
      // Trigger chain event
      var _chains = ['loot_aftermath','war_hero_rises'];
      state._pendingChain = _chains[Math.floor(Math.random()*_chains.length)];
    }

    // Log important events to kingdom history
    if (event.priority === 'critical' || event.priority === 'high') {
      state._history = state._history || [];
      state._history.push({
        turn: state.turn, year: state.year,
        type: 'event', icon: event.icon || '📜',
        title: event.title,
        text: _opt ? 'Decisión: ' + _opt.label : event.description,
      });
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
    if (typeof switchRightTab === 'function' && window._showHistoryAfterEvent) {
      window._showHistoryAfterEvent = false;
      switchRightTab('history');
    }
  },

  // ----------------------------------------------
  // GUERRA CON BATALLA EN MAPA
  // ----------------------------------------------
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
        const nation = state.diplomacy.find(n => n.id === nationId);
      if (!nation) return;
      nation.atWar = true;
      nation.relation = Math.max(-100, nation.relation - 30);
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

  // ----------------------------------------------
  // POLÍTICAS
  // ----------------------------------------------

  // ----------------------------------------------
  // ACCIONES ECONÓMICAS
  // ----------------------------------------------
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

  // -- SISTEMA DE IMPUESTOS EN % — slider % libre con etiquetas --
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

  // ----------------------------------------------
  // MILITAR
  // ----------------------------------------------



  proposeTradeExchange(nationId, offer, request) {
    if (typeof TradeExchange === 'undefined') return;
    const state = this.state;
    const result = TradeExchange.propose(state, nationId, offer, request);
    if (result.ok) {
      UI.renderResources(state);
      UI.renderDiplomacy(state);
    }
    // Show result message in diplomacy panel
    const msgEl = document.getElementById('trade-exchange-msg');
    if (msgEl) {
      msgEl.textContent = result.msg;
      msgEl.style.color = result.ok ? '#72c882' : '#e05050';
      setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
    }
    return result;
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

  // ----------------------------------------------
  // ESPÍAS


  // ----------------------------------------------
  // COMERCIO
  // ----------------------------------------------

  // ----------------------------------------------
  // CONDICIONES FINALES
  // ----------------------------------------------

  // Check if any enemy nation wants to surrender (army < 20% of player)
  _checkSurrenders(state) {
    const playerStr = state.army || 0;
    (state.diplomacy || []).forEach(function(n) {
      if (!n.atWar) return;
      if ((n.army||200) < playerStr * 0.20 && !n._surrenderOffered) {
        n._surrenderOffered = true;
        // Generate surrender event
        state.currentEvents = state.currentEvents || [];
        state.currentEvents.unshift({
          id: 'surrender_'+n.id,
          title: n.name + ' solicita rendición',
          description: n.name + ' ha perdido la mayor parte de su ejército y ofrece rendirse a cambio de recursos.',
          icon: '🏳️',
          category: 'MILITAR',
          priority: 'high',
          options: [
            { label: 'Aceptar rendición (+300 oro, +100 hierro)',
              effects: { gold: 300, iron: 100, _endWar: n.id } },
            { label: 'Rechazar — continuar la guerra',
              effects: { morale: 5 } },
            { label: 'Exigir tributo anual (+50 oro/turno)',
              effects: { gold: 150, _endWar: n.id } },
          ]
        });
        if (typeof Systems !== 'undefined')
          Systems.Log.add(state, '🏳️ ' + n.name + ' solicita rendición. El ejército enemigo está destrozado.', 'warn');
      }
    });
  },

  checkEndConditions() {
    const s = this.state;
    for (const lose of LOSE_CONDITIONS) { if (lose.check(s)) return { type:'defeat',  condition: lose }; }
    for (const win  of WIN_CONDITIONS)  { if (win.check(s))  return { type:'victory', condition: win  }; }
    return null;
  },

  showEndScreen(result) {
    // Log to history
    if (this.state) {
      this.state._history = this.state._history || [];
      this.state._history.push({
        turn: this.state.turn, year: this.state.year,
        type: (result.type === 'victory' || result.victory) ? 'victory' : 'defeat',
        title: result.victory ? 'Victoria Total' : 'Derrota',
        icon: result.victory ? '🏆' : '💀',
        text: result.message || (result.victory ? 'El reino ha conquistado todas las naciones.' : 'El reino ha caído.'),
      });
    }
    const modal = document.getElementById('modal-endgame');
    const content = document.getElementById('endgame-content');
    if (!modal || !content) return;

    const st = this.state || {};
    const isVictory = result.type === 'victory' || result.victory;
    const accentCol = isVictory ? '#72c882' : '#e05050';
    const bgCol     = isVictory ? 'rgba(60,120,60,0.08)' : 'rgba(120,20,20,0.08)';

    // Find enemy leader portrait for defeat screen
    var enemyPortrait = '';
    if (!isVictory && result.nationId && st.diplomacy) {
      const killer = st.diplomacy.find(function(n){return n.id===result.nationId;});
      if (killer && killer.portrait) enemyPortrait = (window.IMAGE_BASE||'') + killer.portrait;
    }

    content.innerHTML =
      '<div style="background:'+bgCol+';padding:0">' +
      // Banner
      '<div style="background:'+(isVictory?'linear-gradient(180deg,rgba(60,120,60,0.4),rgba(0,0,0,0))':'linear-gradient(180deg,rgba(120,20,20,0.4),rgba(0,0,0,0))')+';padding:24px;text-align:center">' +
        '<div style="font-size:48px;margin-bottom:8px">'+(isVictory?'🏆':'💀')+'</div>' +
        '<div style="font-family:var(--font-title);font-size:22px;color:'+accentCol+';font-weight:900;letter-spacing:3px">'+(isVictory?'VICTORIA':'DERROTA')+'</div>' +
        '<div style="font-family:var(--font-title);font-size:11px;color:var(--gold);margin-top:6px;letter-spacing:2px">'+(st.civName||'Tu Reino')+'</div>' +
      '</div>' +
      // Enemy portrait (on defeat)
      ((!isVictory && enemyPortrait) ?
        '<div style="text-align:center;padding:16px 24px 0">' +
          '<img src="'+enemyPortrait+'" style="width:96px;height:96px;object-fit:cover;object-position:top;border:2px solid #e05050;margin:0 auto">' +
          '<div style="font-family:var(--font-mono);font-size:9px;color:#e05050;margin-top:6px">Conquistado por</div>' +
        '</div>' : '') +
      // Stats
      '<div style="padding:20px 28px">' +
        '<div style="font-family:var(--font-body);font-size:13px;color:var(--text2);margin-bottom:16px;font-style:italic">'+( result.message||'El destino de tu reino ha sido sellado.')+'</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">' +
          '<div style="background:var(--bg4);padding:10px;border:1px solid var(--border2)">' +
            '<div style="font-family:var(--font-mono);font-size:8px;color:var(--text3)">TURNOS</div>' +
            '<div style="font-family:var(--font-title);font-size:16px;color:var(--gold)">'+(st.turn||1)+'</div>' +
          '</div>' +
          '<div style="background:var(--bg4);padding:10px;border:1px solid var(--border2)">' +
            '<div style="font-family:var(--font-mono);font-size:8px;color:var(--text3)">GUERRAS GANADAS</div>' +
            '<div style="font-family:var(--font-title);font-size:16px;color:var(--gold)">'+(st._warsWon||0)+'</div>' +
          '</div>' +
          '<div style="background:var(--bg4);padding:10px;border:1px solid var(--border2)">' +
            '<div style="font-family:var(--font-mono);font-size:8px;color:var(--text3)">EJÉRCITO FINAL</div>' +
            '<div style="font-family:var(--font-title);font-size:16px;color:var(--gold)">'+(st.army||0).toLocaleString()+'</div>' +
          '</div>' +
          '<div style="background:var(--bg4);padding:10px;border:1px solid var(--border2)">' +
            '<div style="font-family:var(--font-mono);font-size:8px;color:var(--text3)">ORO ACUMULADO</div>' +
            '<div style="font-family:var(--font-title);font-size:16px;color:var(--gold)">'+(Math.round(st.resources&&st.resources.gold||0)).toLocaleString()+'</div>' +
          '</div>' +
        '</div>' +
        '<button onclick="location.reload()" style="width:100%;font-family:var(--font-title);font-size:12px;font-weight:700;letter-spacing:2px;padding:14px;background:linear-gradient(180deg,'+accentCol+','+( isVictory?'#3a7a3a':'#8a2020')+');color:#fff;border:none;cursor:pointer">NUEVA PARTIDA</button>' +
      '</div>' +
      '</div>';

    modal.classList.remove('hidden');
    modal.setAttribute('style',
      'display:flex !important;position:fixed !important;inset:0 !important;' +
      'z-index:10000 !important;background:rgba(2,1,0,0.95) !important;' +
      'align-items:center !important;justify-content:center !important;');
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

// ----------------------------------------------
// CODEX
// ----------------------------------------------
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

// ----------------------------------------------
// INIT
// ----------------------------------------------
// -- TOP-BAR TOOLTIP SYSTEM ----------------------------------
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

// -- RESOURCE ERROR TOAST ------------------------------------
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


// ----------------------------------------------------------
// COMPARTIR JUEGO
// ----------------------------------------------------------
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


// ----------------------------------------------------------
// MUSIC PLAYER — Cantigas de Santa María
// ----------------------------------------------------------
var MusicPlayer = {
  _audio:   null,
  _muted:   false,
  _volume:  0.35,
  _started: false,

  init() {
    this._audio = document.getElementById('game-music');
    if (!this._audio) { console.warn('[Music] No audio element found'); return; }

    // Restore saved prefs
    try {
      var saved = localStorage.getItem('imperium_music');
      if (saved) {
        var p = JSON.parse(saved);
        this._muted  = p.muted  !== undefined ? p.muted  : false;
        this._volume = p.volume !== undefined ? p.volume : 0.35;
      }
    } catch(e) {}

    this._audio.loop   = true;
    this._audio.volume = this._muted ? 0 : this._volume;
    var vol = document.getElementById('music-volume');
    if (vol) vol.value = Math.round(this._volume * 100);
    this._updateBtn();

    // Log audio loading status
    var self = this;
    this._audio.addEventListener('canplaythrough', function() {
      console.log('[Music] Audio ready to play');
    });
    this._audio.addEventListener('error', function(e) {
      console.warn('[Music] Audio load error — check audio/ folder in repo', e);
      var btn = document.getElementById('music-mute-btn');
      if (btn) { btn.textContent = '🔇'; btn.title = 'Audio no disponible'; btn.style.opacity='0.3'; }
    });

    // The music button click is the most reliable trigger
    var btn = document.getElementById('music-mute-btn');
    if (btn) {
      var origClick = btn.onclick;
      btn.onclick = function() {
        self.toggleMute();
        // Also attempt play on explicit button click
        if (!self._started && !self._muted && self._audio) {
          self._audio.play().then(function(){ self._started=true; }).catch(function(){});
        }
      };
    }

    // Register gesture listeners — any interaction starts music
    var started = false;
    var _tryPlay = function() {
      if (started || self._muted || !self._audio) return;
      self._audio.volume = self._volume;
      self._audio.play().then(function() {
        self._started = true;
        started = true;
        console.log('[Music] Started');
      }).catch(function(err) {
        // Browser still blocking — will retry on next interaction
        console.log('[Music] Autoplay blocked, waiting for gesture');
      });
    };

    // Attach to every user event type
    ['click','mousedown','touchstart','keydown','pointerdown'].forEach(function(ev) {
      document.addEventListener(ev, function _handler() {
        _tryPlay();
        if (started) document.removeEventListener(ev, _handler);
      }, { passive:true, capture:false });
    });
  },

  start() {
    if (this._started || !this._audio || this._muted) return;
    var self = this;
    this._audio.volume = this._volume;
    this._audio.play().then(function() { self._started = true; }).catch(function() {});
  },

  toggleMute() {
    this._muted = !this._muted;
    if (!this._audio) return;
    if (this._muted) {
      this._audio.pause();
    } else {
      this._audio.volume = this._volume;
      this._audio.play().catch(function() {});
      this._started = true;
    }
    this._updateBtn();
    this._save();
  },

  setVolume(val) {
    this._volume = parseInt(val) / 100;
    if (!this._audio) return;
    this._audio.volume = this._muted ? 0 : this._volume;
    if (this._volume > 0 && this._muted) {
      this._muted = false;
      this._audio.play().catch(function() {});
      this._started = true;
      this._updateBtn();
    }
    this._save();
  },

  _updateBtn() {
    var btn = document.getElementById('music-mute-btn');
    if (!btn) return;
    if (this._muted || this._volume === 0) {
      btn.textContent = '🔇';
      btn.style.opacity = '0.45';
    } else if (this._volume < 0.35) {
      btn.textContent = '🔉';
      btn.style.opacity = '1';
    } else {
      btn.textContent = '🎵';
      btn.style.opacity = '1';
    }
  },

  _save() {
    try {
      localStorage.setItem('imperium_music', JSON.stringify({
        muted: this._muted, volume: this._volume
      }));
    } catch(e) {}
  },
};

document.addEventListener('DOMContentLoaded', () => {
  buildCodex();
  Auth.init();
  SaveSystem.renderLoginSaves();
  MusicPlayer.init();
  // Start music on first user interaction (browser autoplay policy)
  MusicPlayer.start(); // attempt immediate autoplay
});
