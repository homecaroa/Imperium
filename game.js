// ============================================================
// IMPERIUM — GAME.JS
// Loop principal del juego, estado central, gestión de turnos
// ============================================================

const Game = {

  state: null,

  // ============================================================
  // INICIO
  // ============================================================
  startNewGame() {
    showScreen('screen-civselect');
    this.renderCivSelect();
  },

  renderCivSelect() {
    const grid = document.getElementById('civ-grid');
    if (!grid) return;

    grid.innerHTML = CIVILIZATIONS.map(civ => `
      <div class="civ-card" onclick="Game.selectCiv('${civ.id}')">
        <div class="civ-icon">${civ.icon}</div>
        <div class="civ-name">${civ.name}</div>
        <div class="civ-gov">⚖ ${GOVERNMENT_TYPES[civ.government].name}</div>
        <div class="civ-desc">${civ.description}</div>
        <div class="civ-stats">
          ${civ.traits.map(t => {
            const isPos = t.startsWith('+');
            const isNeg = t.startsWith('-');
            return `<span class="civ-stat ${isPos ? 'pos' : isNeg ? 'neg' : ''}">${t}</span>`;
          }).join('')}
        </div>
      </div>
    `).join('');
  },

  selectCiv(civId) {
    const civ = CIVILIZATIONS.find(c => c.id === civId);
    if (!civ) return;

    this.initState(civ);
    showScreen('screen-game');

    // Inicializar renderer del mapa tras mostrar la pantalla
    setTimeout(() => {
      MapRenderer.init('world-map', this.state.mapData, this.state);
      const seedEl = document.getElementById('map-seed-label');
      if (seedEl) seedEl.textContent = `Seed: ${this.state.mapSeed}`;
      this.renderMapInfoBar();
    }, 50);

    UI.fullRender(this.state);
    Systems.Log.add(this.state, `${civ.name} comienza su historia. Seed: ${this.state.mapSeed}`, 'good');
    UI.renderLog(this.state);
    this.generateTurnEvents();
  },

  renderMapInfoBar() {
    const el = document.getElementById('map-info-bar');
    if (!el || !this.state.capitalCell) return;
    const cap = this.state.capitalCell;
    el.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);padding:4px 0;display:flex;gap:12px;flex-wrap:wrap">
        <span>🏰 Capital: ${cap.biome.icon} ${cap.biome.name}</span>
        <span>📍 (${cap.col},${cap.row})</span>
        <span>🌡 ${cap.temperature > 0.65 ? 'Cálido' : cap.temperature < 0.3 ? 'Frío' : 'Templado'}</span>
        <span>💧 ${cap.humidity > 0.6 ? 'Húmedo' : cap.humidity < 0.3 ? 'Árido' : 'Normal'}</span>
        <span>🗺 40×25 = 500km²</span>
      </div>
    `;
  },

  // ============================================================
  // ESTADO INICIAL — con mapa procedural
  // ============================================================
  initState(civ) {
    // ── Generación procedural del mapa ──
    const mapSeed = Math.floor(Math.random() * 9999999);
    const mapData = MapGenerator.generate(mapSeed);
    const playerStart = MapGenerator.getPlayerStartStats(mapData);
    const aiNations = this.initAINations(mapData);

    // Bonificaciones del bioma inicial
    const mb = playerStart.resourceBonuses;

    this.state = {
      civId: civ.id, civName: civ.name, civIcon: civ.icon, civData: civ, coldImmune: !!civ.coldImmune,
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
        corruption:   civ.id === 'chinese' ? 30 : 10,
        inflation: 0, debt: 0, trade_income: 8, food_bonus: 0
      },
      climate: this.detectStartClimate(playerStart.capitalCell, mapData),
      territories: playerStart.territories,
      playerCells: playerStart.cellIds,
      capitalCell: playerStart.capitalCell,
      // Ejército multiunidad
      armyUnits: Systems.Military.initArmy(civ, civ.startStats.army),
      legendaryUnit: null,

      // Espías
      spies: Systems.Spies.init(civ),
      intelligence: {},

      // Comercio
      activeTradeRoutes: [],

      factions: Systems.Factions.init(civ),
      diplomacy: aiNations,
      activePolicies: [],
      currentEvents: [], activeEventIndex: null, resolvedEvents: [],
      log: [],
      prosperityTurns: 0, collapseTurns: 0, famineturns: 0
    };
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
    return AI_NATIONS.slice(0, 3).map((def, i) => {
      const nation = AI.initNation(def);
      nation.cells = MapGenerator.getAINationCells(mapData, i + 1);
      const placement = mapData.nationsPlacement ? mapData.nationsPlacement[i + 1] : null;
      if (placement) { nation.mapCol = placement.col; nation.mapRow = placement.row; }
      return nation;
    });
  },

  // ============================================================
  // FIN DE TURNO — loop principal
  // ============================================================
  endTurn() {
    const state = this.state;
    if (!state) return;

    // Advertir si quedan eventos sin resolver
    const unresolvedCritical = (state.currentEvents || []).filter(e => e.priority === 'critical');
    if (unresolvedCritical.length > 0) {
      if (!confirm(`Tienes ${unresolvedCritical.length} evento(s) URGENTE(S) sin resolver. ¿Terminar turno de todas formas?`)) return;
    }

    // 1. Actualizar clima (estaciones + eventos extremos encadenados)
    Systems.Climate.update(state);

    // 2. Procesar misiones de espías
    Systems.Spies.processMissions(state);
    Systems.Spies.tickIntelligence(state);

    // 3. Calcular y aplicar tasas económicas
    const rates = Systems.Economy.calculateRates(state);
    Systems.Economy.applyRates(state, rates);
    Systems.Economy.updateCorruption(state);

    // 4. Actualizar población
    Systems.Population.update(state);

    // 5. Actualizar facciones
    Systems.Factions.update(state);

    // 6. Actualizar sociedad (moral + estabilidad)
    Systems.Society.update(state);

    // 7. Sincronizar total de soldados
    state.army = Systems.Military.totalSoldiers(state);

    // 8. IA de naciones (cerrar rutas si entran en guerra)
    AI.tick(state);
    state.diplomacy.forEach(n => {
      if (n.atWar) Systems.Trade.closeRoutesForNation(state, n.id);
    });

    // 7. Avanzar turno
    state.turn++;
    if (state.turn % 4 === 1) state.year++;

    // 8. Limpiar eventos anteriores
    state.currentEvents = [];
    state.activeEventIndex = null;

    // 9. Generar nuevos eventos
    this.generateTurnEvents();

    // 10. Verificar condiciones de victoria/derrota
    const result = this.checkEndConditions();
    if (result) {
      this.showEndScreen(result);
      return;
    }

    // 11. Renovar demandas de facciones cada 5 turnos
    if (state.turn % 5 === 0) {
      state.factions.forEach(f => {
        f.currentDemand = Systems.Factions.generateDemand(f.id);
      });
    }

    // 12. Render completo
    UI.fullRender(state);

    // Log del turno
    Systems.Log.add(state, `Año ${state.year}, Turno ${state.turn}. Población: ${state.population.toLocaleString()}. Estabilidad: ${state.stability}.`, 'info');
    UI.renderLog(state);
  },

  // ============================================================
  // EVENTOS
  // ============================================================
  generateTurnEvents() {
    const state = this.state;
    const events = Systems.Events.generateForTurn(state);
    state.currentEvents = events;
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
    const event = state.currentEvents[eventIdx];
    if (!event) return;

    Systems.Events.applyDecision(state, event, optionIdx);

    // Remover evento de la cola
    state.currentEvents.splice(eventIdx, 1);

    // Seleccionar siguiente evento
    if (state.currentEvents.length > 0) {
      state.activeEventIndex = Math.min(eventIdx, state.currentEvents.length - 1);
    } else {
      state.activeEventIndex = null;
    }

    UI.fullRender(state);
  },

  // ============================================================
  // POLÍTICAS
  // ============================================================
  togglePolicy(policyId, category) {
    const state = this.state;
    const policies = POLICIES[category];
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    const idx = state.activePolicies.indexOf(policyId);

    if (idx > -1) {
      // Desactivar
      state.activePolicies.splice(idx, 1);
      Systems.Log.add(state, `Política desactivada: ${policy.name}`, 'info');
    } else {
      // Activar — verificar conflictos en la misma categoría
      const categoryPolicies = policies.map(p => p.id);
      const activeInCategory = state.activePolicies.filter(ap => categoryPolicies.includes(ap));

      // Solo una política activa por categoría económica
      if (category === 'economia' && activeInCategory.length > 0) {
        state.activePolicies = state.activePolicies.filter(ap => !categoryPolicies.includes(ap));
      }
      if (category === 'militar' && activeInCategory.length > 0) {
        state.activePolicies = state.activePolicies.filter(ap => !categoryPolicies.includes(ap));
      }

      // Verificar coste de activación
      if (policy.cost_gold > 0) {
        if (state.resources.gold < policy.cost_gold) {
          Systems.Log.add(state, `Sin oro para activar ${policy.name}. Necesitas ${policy.cost_gold}.`, 'warn');
          UI.renderLog(state);
          return;
        }
        state.resources.gold -= policy.cost_gold;
      }

      state.activePolicies.push(policyId);

      // Efectos de facciones al activar
      if (policy.factionEffect) {
        Object.entries(policy.factionEffect).forEach(([fId, delta]) => {
          const faction = state.factions.find(f => f.id === fId);
          if (faction) faction.satisfaction = Math.max(0, Math.min(100, faction.satisfaction + delta));
        });
      }

      Systems.Log.add(state, `Política activada: ${policy.name}`, 'good');
    }

    UI.fullRender(state);
  },

  // ============================================================
  // ACCIONES RÁPIDAS
  // ============================================================
  recruitSoldiers(count) {
    const cost = Math.floor(count / 2);
    if (this.state.resources.gold < cost) {
      Systems.Log.add(this.state, `No tienes suficiente oro para reclutar ${count} soldados (necesitas ${cost}).`, 'warn');
    } else {
      this.state.resources.gold -= cost;
      this.state.army += count;
      Systems.Log.add(this.state, `Reclutados ${count} soldados. Coste: ${cost} oro.`, 'good');
    }
    UI.fullRender(this.state);
  },

  takeLoan() {
    this.state.resources.gold += 200;
    this.state.economy.debt += 200;
    this.state.economy.inflation = Math.min(100, this.state.economy.inflation + 5);
    Systems.Log.add(this.state, 'Préstamo tomado: +200 oro. Deuda aumenta en 200.', 'warn');
    UI.fullRender(this.state);
  },

  payDebt() {
    if (this.state.resources.gold < 100) {
      Systems.Log.add(this.state, 'No tienes oro suficiente para pagar deuda.', 'warn');
    } else if (this.state.economy.debt <= 0) {
      Systems.Log.add(this.state, 'No tienes deuda que pagar.', 'info');
    } else {
      this.state.resources.gold -= 100;
      this.state.economy.debt = Math.max(0, this.state.economy.debt - 100);
      this.state.economy.inflation = Math.max(0, this.state.economy.inflation - 3);
      Systems.Log.add(this.state, 'Pagados 100 de deuda. Inflación baja ligeramente.', 'good');
    }
    UI.fullRender(this.state);
  },

  raiseTexes() {
    this.state.economy.trade_income += 30;
    this.state.morale = Math.max(0, this.state.morale - 10);
    const pf = this.state.factions.find(f => f.id === 'pueblo');
    if (pf) pf.satisfaction = Math.max(0, pf.satisfaction - 15);
    Systems.Log.add(this.state, 'Impuestos subidos: +30 oro/turno. El pueblo está descontento.', 'warn');
    UI.fullRender(this.state);
  },

  buildIrrigation() {
    const s = this.state;
    if (s.resources.wood < 150 || s.resources.stone < 100 || s.resources.gold < 200) {
      Systems.Log.add(s, 'Recursos insuficientes para irrigación (150🪵 100⬡ 200🪙).', 'warn');
    } else {
      s.resources.wood -= 150;
      s.resources.stone -= 100;
      s.resources.gold -= 200;
      s.economy.food_bonus = (s.economy.food_bonus || 0) + 50;
      s.climate.droughtRisk = Math.max(0, s.climate.droughtRisk - 20);
      Systems.Log.add(s, 'Sistema de irrigación construido. Producción alimentaria +50. Riesgo sequía -20.', 'good');
    }
    UI.fullRender(s);
  },

  buildGranary() {
    const s = this.state;
    if (s.resources.wood < 100) {
      Systems.Log.add(s, 'Necesitas 100 madera para construir graneros.', 'warn');
    } else {
      s.resources.wood -= 100;
      s.resources.food += 200;
      Systems.Log.add(s, 'Graneros construidos. Reserva de alimentos +200.', 'good');
    }
    UI.fullRender(s);
  },

  // ============================================================
  // NUEVAS ACCIONES: Espías, Comercio, Unidades
  // ============================================================
  sendSpy(missionId, nationId) {
    const result = Systems.Spies.sendMission(this.state, missionId, nationId);
    if (!result.ok) Systems.Log.add(this.state, result.msg, 'warn');
    UI.fullRender(this.state);
  },

  trainSpy() {
    if (this.state.resources.gold < 200) {
      Systems.Log.add(this.state, 'Necesitas 200 oro para entrenar un espía.', 'warn');
    } else {
      this.state.resources.gold -= 200;
      this.state.spies = this.state.spies || { count: 1, active: [], intelligence: {} };
      this.state.spies.count++;
      Systems.Log.add(this.state, 'Nuevo espía entrenado. Red de inteligencia ampliada.', 'good');
    }
    UI.fullRender(this.state);
  },

  openTradeRoute(routeId, nationId) {
    const result = Systems.Trade.openRoute(this.state, routeId, nationId);
    if (!result.ok) Systems.Log.add(this.state, result.msg, 'warn');
    UI.fullRender(this.state);
  },

  closeTradeRoute(routeId, nationId) {
    Systems.Trade.closeRoute(this.state, routeId, nationId);
    UI.fullRender(this.state);
  },

  recruitUnit(typeId, count) {
    const result = Systems.Military.recruitUnit(this.state, typeId, count);
    if (!result.ok) Systems.Log.add(this.state, result.msg, 'warn');
    // Sync army total
    this.state.army = Systems.Military.totalSoldiers(this.state);
    UI.fullRender(this.state);
  },

  recruitLegendary(legendaryId) {
    const result = Systems.Military.recruitLegendary(this.state, legendaryId);
    if (!result.ok) Systems.Log.add(this.state, result.msg, 'warn');
    UI.fullRender(this.state);
  },

  // ============================================================
  // CONDICIONES FINALES
  // ============================================================
  checkEndConditions() {
    const s = this.state;

    for (const lose of LOSE_CONDITIONS) {
      if (lose.check(s)) {
        return { type: 'defeat', condition: lose };
      }
    }

    for (const win of WIN_CONDITIONS) {
      if (win.check(s)) {
        return { type: 'victory', condition: win };
      }
    }

    return null;
  },

  showEndScreen(result) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    overlay.classList.remove('hidden');

    if (result.type === 'victory') {
      title.textContent = '⚔ Victoria';
      title.style.color = 'var(--gold2)';
      body.innerHTML = `
        <strong>${result.condition.name}</strong><br><br>
        ${result.condition.description}<br><br>
        Has guiado a <em>${this.state.civName}</em> a la gloria en el Año ${this.state.year}, Turno ${this.state.turn}.<br>
        Población final: ${this.state.population.toLocaleString()}.
      `;
    } else {
      title.textContent = '💀 Derrota';
      title.style.color = 'var(--red2)';
      body.innerHTML = `
        <strong>${result.condition.name}</strong><br><br>
        ${result.condition.description}<br><br>
        <em>${this.state.civName}</em> cayó en el Año ${this.state.year}.<br>
        La historia no olvidará tus decisiones.
      `;
    }
  }
};

// ============================================================
// CODEX
// ============================================================
function buildCodex() {
  const container = document.getElementById('codex-body');
  if (!container) return;

  container.innerHTML = `
    <div class="codex-section">
      <h3>⚖ Sistema Político</h3>
      <p>El gobierno define modificadores base de estabilidad y corrupción. Las facciones tienen influencia política que pondera su satisfacción. Si la satisfacción ponderada cae bajo 35, el gobierno está en riesgo. Bajo 20 durante 3 turnos, ocurre un golpe.</p>
      <ul>
        <li><strong>República:</strong> +10 estabilidad, facciones x1.3 de poder</li>
        <li><strong>Autocracia:</strong> decisiones rápidas, facciones débiles, inestable</li>
        <li><strong>Teocracia:</strong> moral bonificada, diplomacia penalizada</li>
        <li><strong>Oligarquía:</strong> facciones x1.5, muy inestable</li>
      </ul>
    </div>
    <div class="codex-section">
      <h3>📊 Sistema Económico</h3>
      <p>Los recursos se producen según la población y se modifican por clima, corrupción y políticas. La deuda genera interés que drena oro. La inflación devalúa el oro acumulado si supera 40.</p>
      <ul>
        <li>Alimentos = población/10 × modificador climático × corrupción</li>
        <li>Oro = población/20 + comercio − ejército/2 − deuda/20</li>
        <li>Inflación > 40: el oro pierde 3% cada turno</li>
        <li>Deuda > 400: interés de 20 oro/turno adicional</li>
      </ul>
    </div>
    <div class="codex-section">
      <h3>❤ Moral y Estabilidad</h3>
      <p>La moral refleja el estado de ánimo popular. Afecta directamente la efectividad del ejército y la tasa de crecimiento. La estabilidad refleja la cohesión institucional.</p>
      <ul>
        <li>Moral < 20: riesgo de revolución</li>
        <li>Estabilidad < 15: colapso institucional inminente</li>
        <li>Moral > 70 + Estabilidad > 80 durante 10 turnos: victoria de prosperidad</li>
        <li>El clima, el hambre y las facciones afectan ambas</li>
      </ul>
    </div>
    <div class="codex-section">
      <h3>🌤 Sistema Climático</h3>
      <p>4 estaciones en ciclos de 16 turnos. Eventos extremos tienen probabilidad basada en la estación y riesgo acumulativo.</p>
      <ul>
        <li>Primavera: +15% alimentos, +5 moral</li>
        <li>Verano: ligero bonificador, +20% riesgo sequía</li>
        <li>Otoño: +10% alimentos, -5 moral</li>
        <li>Invierno: -25% alimentos, -10 moral</li>
        <li>Sequía: -40% alimentos, persiste varios turnos</li>
      </ul>
    </div>
    <div class="codex-section">
      <h3>⚔ Sistema Militar</h3>
      <p>La fuerza efectiva no es igual al número de soldados. Se calcula como: Soldados × (Moral/100) × Modificador Equipo × (1 - Corrupción/200) × Política.</p>
      <ul>
        <li>Ejército Permanente: ×1.3, alto coste</li>
        <li>Milicia: +100 soldados baratos, ×0.8 efectividad</li>
        <li>Mercenarios: ×1.5, pero lealtad baja</li>
        <li>Mantenimiento: 0.5 oro/soldado/turno</li>
      </ul>
    </div>
    <div class="codex-section">
      <h3>🤝 Diplomacia e IA</h3>
      <p>Cada nación tiene personalidad que define su comportamiento. La IA evalúa tu debilidad, fuerza relativa y oportunidades cada turno.</p>
      <ul>
        <li><strong>Agresiva:</strong> ataca si te ve débil</li>
        <li><strong>Diplomática:</strong> prefiere tratados, ataca poco</li>
        <li><strong>Oportunista:</strong> puede traicionar alianzas</li>
        <li><strong>Aislacionista:</strong> crece en silencio</li>
      </ul>
    </div>
  `;
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  buildCodex();
  showScreen('screen-start');
});
