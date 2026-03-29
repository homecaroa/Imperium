// ============================================================
// IMPERIUM — MECHANICS.JS
// Sistemas centrales del rediseño:
//  • ActionPoints  — pool de 3 AP/turno, costes reales
//  • HiddenCosts   — corrupción, inflación, desgaste acumulativo
//  • Progression   — XP, niveles, desbloqueos frecuentes
//  • BlitzMode     — modo partida 10 minutos
//  • DynamicEvents — eventos encadenados con peso por estado
//  • RouteSabotage — ataque/defensa de rutas comerciales
//  • TacticalMap   — posicionamiento de ejércitos en nodos
// ============================================================

// ─────────────────────────────────────────────────────────────
// 1. PUNTOS DE ACCIÓN
// ─────────────────────────────────────────────────────────────
const ActionPoints = {

  BASE_AP: 3,

  reset(state) {
    let ap = this.BASE_AP;
    if (state.stability >= 70) ap += 1;       // Gobierno eficiente
    if (state.stability <= 30) ap -= 1;       // Crisis
    if ((state.activePolicies||[]).includes('efficient_gov')) ap += 1;
    if (state._blitzMode) ap += 1;            // Blitz: 1 AP extra
    state.actionPoints    = Math.max(1, ap);
    state.actionPointsMax = state.actionPoints;
  },

  spend(state, cost, label) {
    if (state.actionPoints === undefined) this.reset(state);
    if (state.actionPoints < cost) {
      showResourceError([{ icon:'⚡', name:'Puntos de Acción', need: cost, have: state.actionPoints }]);
      Systems.Log.add(state, `⚡ Sin AP para: ${label} (necesitas ${cost}, tienes ${state.actionPoints})`, 'warn');
      return false;
    }
    state.actionPoints -= cost;
    if (typeof UI !== 'undefined') UI.updateTopBar(state);
    return true;
  },

  tickCooldowns(state) {
    state._cooldowns = state._cooldowns || {};
    Object.keys(state._cooldowns).forEach(k => {
      state._cooldowns[k] = Math.max(0, state._cooldowns[k] - 1);
    });
  },

  setCooldown(state, actionId, turns) {
    state._cooldowns = state._cooldowns || {};
    state._cooldowns[actionId] = turns;
  },

  onCooldown(state, actionId) {
    return (state._cooldowns || {})[actionId] > 0;
  }
};

// ─────────────────────────────────────────────────────────────
// 2. COSTES OCULTOS ACUMULATIVOS
// ─────────────────────────────────────────────────────────────
const HiddenCosts = {

  // Registrar un coste oculto que se aplica en turnos futuros
  add(state, type, amount, turns) {
    state._hiddenCosts = state._hiddenCosts || [];
    state._hiddenCosts.push({ type, amount, turnsLeft: turns || 1 });
  },

  applyAccumulated(state) {
    if (!state._hiddenCosts) return;
    const remaining = [];
    state._hiddenCosts.forEach(hc => {
      hc.turnsLeft--;
      // Aplicar
      switch(hc.type) {
        case 'corruption':  state.economy.corruption = Math.min(100, state.economy.corruption + hc.amount); break;
        case 'inflation':   state.economy.inflation  = Math.min(100, state.economy.inflation  + hc.amount); break;
        case 'stability':   state.stability = Math.max(0, Math.min(100, state.stability + hc.amount)); break;
        case 'morale':      state.morale    = Math.max(0, Math.min(100, state.morale    + hc.amount)); break;
        case 'food':        state.resources.food  = Math.max(0, state.resources.food  + hc.amount); break;
        case 'gold':        state.resources.gold  = Math.max(0, state.resources.gold  + hc.amount); break;
        case 'army_attrition': state.army = Math.max(0, state.army + hc.amount); break;
      }
      if (hc.turnsLeft > 0) remaining.push(hc);
    });
    state._hiddenCosts = remaining;

    // Efectos pasivos: deuda genera intereses
    if ((state.economy.debt||0) > 0) {
      const interest = Math.floor(state.economy.debt * 0.05);
      state.resources.gold = Math.max(0, state.resources.gold - interest);
      if (interest > 0) Systems.Log.add(state, `💳 Intereses de deuda: −${interest}💰`, 'warn');
    }

    // Corrupción > 40 reduce ingresos
    if (state.economy.corruption > 40) {
      const drain = Math.floor((state.economy.corruption - 40) * 2);
      state.resources.gold = Math.max(0, state.resources.gold - drain);
    }
  }
};

// ─────────────────────────────────────────────────────────────
// 3. PROGRESIÓN Y ADICCIÓN
// ─────────────────────────────────────────────────────────────
const Progression = {

  XP_TABLE: {
    turn_survived:    5,
    event_resolved:  15,
    battle_won:      50,
    battle_lost:     20,   // Perder también da XP
    ally_made:       30,
    trade_route:     25,
    victory:        200,
    defeat:          75,
    first_war:       40,
    survived_crisis: 60,
  },

  LEVELS: [
    { level:1,  xp:0,    reward:null,                                   title:'Regente Novato'   },
    { level:2,  xp:100,  reward:{type:'resource',r:'gold',v:150},       title:'Gobernador'       },
    { level:3,  xp:250,  reward:{type:'ap_permanent',v:0},              title:'Lord Gobernante'  },
    { level:4,  xp:450,  reward:{type:'resource',r:'army',v:200},       title:'Duque de Guerra'  },
    { level:5,  xp:700,  reward:{type:'resource',r:'gold',v:300},       title:'Príncipe'         },
    { level:6,  xp:1000, reward:{type:'resource',r:'army',v:400},       title:'Rey'              },
    { level:7,  xp:1400, reward:{type:'stability_bonus',v:10},          title:'Gran Rey'         },
    { level:8,  xp:1900, reward:{type:'resource',r:'gold',v:500},       title:'Emperador'        },
    { level:9,  xp:2500, reward:{type:'resource',r:'army',v:600},       title:'Hegemon'          },
    { level:10, xp:3200, reward:{type:'special',id:'iron_will'},        title:'Dominador Eterno' },
  ],

  TURN_MILESTONES: {
    3:  { type:'hint',    text:'💡 Usa reconocimiento antes de atacar fortalezas.' },
    5:  { type:'bonus',   r:'gold',  v:150,  text:'💰 Bonus temprano: +150 oro' },
    8:  { type:'bonus',   r:'army',  v:150,  text:'⚔️ Refuerzo: +150 soldados' },
    10: { type:'bonus',   r:'food',  v:200,  text:'🌾 Cosecha excepcional: +200 comida' },
    12: { type:'event',   id:'EVT_GOLDEN_AGE' },
    15: { type:'bonus',   r:'gold',  v:250,  text:'💰 Prosperidad media partida: +250 oro' },
    18: { type:'bonus',   r:'army',  v:200,  text:'⚔️ Veteranos vuelven: +200 soldados' },
    20: { type:'bonus',   r:'gold',  v:400,  text:'💰 Acuerdo de comercio: +400 oro' },
    25: { type:'bonus',   r:'army',  v:300,  text:'⚔️ Levas voluntarias: +300 soldados' },
  },

  awardXP(state, type, multiplier) {
    const base = this.XP_TABLE[type] || 5;
    const xp   = Math.floor(base * (multiplier||1) * (state._blitzMode ? 1.5 : 1));
    state.playerXP = (state.playerXP || 0) + xp;
    state._xpThisTurn = (state._xpThisTurn || 0) + xp;

    // Check level up
    const newLevel = this.getLevelFor(state.playerXP);
    if (newLevel > (state.playerLevel || 1)) {
      state.playerLevel = newLevel;
      const lvlDef = this.LEVELS[newLevel - 1];
      this._applyLevelReward(state, lvlDef);
      Systems.Log.add(state, `🏆 NIVEL ${newLevel}: ${lvlDef.title}! ${this._rewardText(lvlDef.reward)}`, 'good');
      if (typeof showUnlockToast === 'function') {
        showUnlockToast([{ icon:'🏆', name:`Nivel ${newLevel}: ${lvlDef.title}` }]);
      }
    }

    // Turn milestones
    const milestone = this.TURN_MILESTONES[state.turn];
    if (milestone && !state._milestonesHit?.[state.turn]) {
      state._milestonesHit = state._milestonesHit || {};
      state._milestonesHit[state.turn] = true;
      this._applyMilestone(state, milestone);
    }

    // Streak
    if (this._isGoodTurn(state)) {
      state._streak = (state._streak||0) + 1;
      this._applyStreak(state);
    } else {
      state._streak = 0;
    }
  },

  getLevelFor(xp) {
    let level = 1;
    for (const l of this.LEVELS) { if (xp >= l.xp) level = l.level; }
    return level;
  },

  xpToNextLevel(state) {
    const currentXP = state.playerXP || 0;
    const nextLvl   = this.LEVELS.find(l => l.xp > currentXP);
    return nextLvl ? { needed: nextLvl.xp - currentXP, total: nextLvl.xp - (this.LEVELS[nextLvl.level-2]?.xp||0) } : null;
  },

  _isGoodTurn(state) {
    return state.resources.food > 50 && state.resources.gold >= 0
        && state.stability >= 40 && !state.diplomacy.some(n=>n.atWar);
  },

  _applyStreak(state) {
    const streaks = { 3:'🔥 Racha ×3! +10% producción', 5:'⚡ Racha ×5! +1 AP este turno', 8:'🌟 Racha ×8! +200 oro' };
    const txt = streaks[state._streak];
    if (!txt) return;
    if (state._streak === 3) state._productionBoostTurns = 1;
    if (state._streak === 5) state.actionPoints = Math.min(state.actionPointsMax + 1, state.actionPoints + 1);
    if (state._streak === 8) state.resources.gold += 200;
    Systems.Log.add(state, txt, 'good');
  },

  _applyMilestone(state, m) {
    if (m.type === 'bonus' && m.r) {
      if (m.r === 'gold')  state.resources.gold  = (state.resources.gold  ||0) + m.v;
      if (m.r === 'army')  state.army             = (state.army            ||0) + m.v;
      if (m.r === 'food')  state.resources.food   = (state.resources.food  ||0) + m.v;
      Systems.Log.add(state, `🎖️ Hito T${state.turn}: ${m.text}`, 'good');
    }
    if (m.type === 'event' && m.id) {
      state._pendingEvents = state._pendingEvents || [];
      state._pendingEvents.push({ eventId: m.id, firesAt: state.turn });
    }
    if (m.type === 'hint') Systems.Log.add(state, m.text, 'info');
  },

  _applyLevelReward(state, lvl) {
    if (!lvl.reward) return;
    const r = lvl.reward;
    if (r.type === 'resource') {
      if (r.r === 'gold')  state.resources.gold += r.v;
      if (r.r === 'army')  state.army            += r.v;
      if (r.r === 'food')  state.resources.food  += r.v;
    }
    if (r.type === 'stability_bonus') state.stability = Math.min(100, state.stability + r.v);
  },

  _rewardText(reward) {
    if (!reward) return '';
    if (reward.type === 'resource') return `+${reward.v} ${reward.r}`;
    if (reward.type === 'stability_bonus') return `+${reward.v} estabilidad`;
    return '';
  },

  // Render barra de XP para el top bar
  renderXPBar(state) {
    const xp    = state.playerXP || 0;
    const level = state.playerLevel || 1;
    const lvlDef = this.LEVELS[level - 1];
    const next   = this.xpToNextLevel(state);
    const pct    = next ? Math.round((1 - next.needed/next.total)*100) : 100;
    return `
      <div class="xp-bar-wrap tb-tip" data-tip="🏆 Nivel ${level}: ${lvlDef?.title||''}&#10;XP: ${xp} | Siguiente: ${next?xp+'+'+next.needed:'MAX'}&#10;Racha actual: ${state._streak||0} turnos buenos">
        <span class="xp-level">Nv.${level}</span>
        <div class="xp-track"><div class="xp-fill" style="width:${pct}%"></div></div>
        <span class="xp-label">${next?`${next.total-next.needed}/${next.total}`:'MAX'}</span>
      </div>`;
  }
};

// ─────────────────────────────────────────────────────────────
// 4. MODO BLITZ (10 minutos)
// ─────────────────────────────────────────────────────────────
const BlitzMode = {

  apply(state) {
    state._blitzMode      = true;
    state._blitzMaxTurns  = 20;
    // Economía acelerada
    state._incomeMultiplier = 1.8;
    // Recursos reducidos → decisiones inmediatas
    state.resources.gold  = 200;
    state.resources.food  = 150;
    state.stability       = 55;
    state.morale          = 50;
    // Crisis inicial T1
    state._pendingEvents  = [{ eventId:'EVT_HARVEST_FAILURE', firesAt:1 }];
    // IA más agresiva desde el principio
    (state.diplomacy||[]).forEach(n => {
      n._aggressionTimer = 3;  // atacan en T3
    });
    Systems.Log.add(state, '⚡ MODO BLITZ activado — 20 turnos. ¡La presión comienza ahora!', 'crisis');
  },

  checkBlitzEnd(state) {
    if (!state._blitzMode) return null;
    if (state.turn >= state._blitzMaxTurns) {
      return { type:'defeat', condition:{ name:'⏱️ Tiempo Agotado', description:'El reino no pudo consolidarse en 20 turnos.' }};
    }
    // Condición de victoria blitz más rápida
    if (state.althoriaRegions >= 8)       return { type:'victory', condition:{ name:'⚔️ Dominio Relámpago', description:'Controlaste 8 regiones.' }};
    if (state.resources.gold >= 3000)     return { type:'victory', condition:{ name:'💰 Imperio Comercial', description:'Acumulaste 3000 oro.' }};
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// 5. EVENTOS DINÁMICOS ENCADENADOS
// ─────────────────────────────────────────────────────────────
const DYNAMIC_EVENT_POOL = [

  {
    id: 'EVT_HARVEST_FAILURE',
    title: '🌾 Cosecha Catastrófica',
    category: 'CRISIS',
    priority: 'high',
    icon: '🌾',
    weight: s => {
      let w = 5;
      if (s.climate?.drought) w += 40;
      if (s.resources.food < 200) w += 30;
      return w;
    },
    condition: s => s.resources.food < 300 || s.climate?.drought,
    options: [
      { label:'🥣 Racionar (-20 moral)',
        effects:{ morale:-20 },
        hiddenCost:{ type:'morale', amount:-5, turns:2 },
        xp: 'event_resolved' },
      { label:'💰 Importar grano (-300 oro)',
        effects:{ gold:-300, food:+300 },
        xp: 'event_resolved' },
      { label:'😤 Ignorar (riesgo hambruna)',
        effects:{ morale:-5 },
        chains:['EVT_FAMINE_REVOLT'],
        xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_FAMINE_REVOLT',
    title: '✊ Revuelta por Hambre',
    category: 'CRISIS',
    priority: 'critical',
    icon: '✊',
    weight: s => s.resources.food < 50 ? 90 : 0,
    condition: s => s.resources.food < 80,
    options: [
      { label:'⚔️ Reprimir (-10% ejército, -15 moral)',
        effects:{ army:-150, morale:-15, stability:+5 },
        hiddenCost:{ type:'corruption', amount:8, turns:1 },
        xp: 'event_resolved' },
      { label:'🤝 Negociar (-200 oro, +10 estab)',
        effects:{ gold:-200, stability:+10, morale:+5 },
        xp: 'event_resolved' },
      { label:'🐑 Sacrificio simbólico (ejecutar ministro)',
        effects:{ stability:+15, morale:+20 },
        hiddenCost:{ type:'corruption', amount:-10, turns:1 },
        chains:['EVT_ECONOMY_PENALTY'],
        xp: 'survived_crisis' }
    ]
  },

  {
    id: 'EVT_CIVIL_WAR',
    title: '🔥 Guerra Civil',
    category: 'GUERRA',
    priority: 'critical',
    icon: '🔥',
    weight: s => (s.stability < 25 && s.morale < 20) ? 90 : 0,
    condition: s => s.stability < 25 && s.morale < 20,
    options: [
      { label:'⚔️ Apoyar leales (50/50 resultado)',
        effects:{},
        specialAction:'civil_war_battle',
        xp: 'survived_crisis' },
      { label:'📜 Conceder reformas (pierde 1 política)',
        effects:{ stability:+25, morale:+15 },
        specialAction:'lose_policy',
        xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_MERCHANT_CARAVAN',
    title: '🐪 Caravana de Mercaderes',
    category: 'ECONOMÍA',
    priority: 'normal',
    icon: '🐪',
    weight: s => {
      let w = 10;
      if ((s.activeTradeRoutes||[]).length > 0) w += 20;
      if (s.resources.gold < 200) w += 25;
      return w;
    },
    condition: s => true,
    options: [
      { label:'💰 Gravar fuerte (+300 oro)',
        effects:{ gold:+300 },
        hiddenCost:{ type:'corruption', amount:5, turns:1 },
        xp: 'event_resolved' },
      { label:'⚖️ Impuesto justo (+150 oro)',
        effects:{ gold:+150, morale:+3 },
        xp: 'event_resolved' },
      { label:'⚔️ Escoltar gratis (nuevas rutas disponibles)',
        effects:{ morale:+8 },
        specialAction:'open_trade_bonus',
        xp: 'trade_route' }
    ]
  },

  {
    id: 'EVT_GENERAL_BETRAYAL',
    title: '🗡️ Traición del General',
    category: 'TRAICIÓN',
    priority: 'critical',
    icon: '🗡️',
    weight: s => {
      let w = 0;
      if (s.army > 800 && s.morale < 30) w += 30;
      if (s.economy.corruption > 20) w += 20;
      return w;
    },
    condition: s => s.army > 500 && (s.morale < 35 || s.economy.corruption > 20),
    options: [
      { label:'☠️ Ejecutar (-300 soldados, +15 estab)',
        effects:{ army:-300, stability:+15, morale:-10 },
        xp: 'event_resolved' },
      { label:'💰 Comprar lealtad (-400 oro)',
        effects:{ gold:-400, army:+100 },
        hiddenCost:{ type:'corruption', amount:10, turns:1 },
        xp: 'event_resolved' },
      { label:'🚪 Exiliar (-200 soldados)',
        effects:{ army:-200 },
        xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_PLAGUE',
    title: '💀 Epidemia',
    category: 'CRISIS',
    priority: 'critical',
    icon: '💀',
    weight: s => {
      let w = 3;
      if (s.population > 8000) w += 20;
      if (s.resources.food < 100) w += 30;
      return w;
    },
    condition: s => s.population > 4000 || s.resources.food < 100,
    options: [
      { label:'🏰 Cuarentena (-15% pob, para extensión)',
        effects:{ morale:-20 },
        specialAction:'quarantine',
        xp: 'survived_crisis' },
      { label:'🌿 Herbolarios (-200 oro, -5% pob)',
        effects:{ gold:-200 },
        specialAction:'herbalists',
        xp: 'event_resolved' },
      { label:'🙏 Rezar (30% funciona)',
        effects:{},
        specialAction:'pray_plague',
        xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_DIPLOMATIC_INCIDENT',
    title: '💢 Incidente Diplomático',
    category: 'DIPLOMACIA',
    priority: 'high',
    icon: '💢',
    weight: s => {
      const hostile = (s.diplomacy||[]).filter(n=>n.relation < -20).length;
      return hostile * 15;
    },
    condition: s => (s.diplomacy||[]).some(n => n.relation < -20),
    options: [
      { label:'🙏 Disculpa oficial (-100 oro, rel +20)',
        effects:{ gold:-100 },
        specialAction:'apologize_incident',
        xp: 'event_resolved' },
      { label:'💪 Escalar (+10 moral, riesgo guerra)',
        effects:{ morale:+10 },
        specialAction:'escalate_incident',
        xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_GOLDEN_AGE',
    title: '✨ Era de Prosperidad',
    category: 'OPORTUNIDAD',
    priority: 'normal',
    icon: '✨',
    weight: s => {
      const allGood = s.stability > 65 && s.morale > 60 && s.resources.gold > 400;
      return allGood ? 40 : 0;
    },
    condition: s => s.stability > 60 && s.morale > 55 && s.resources.gold > 300,
    options: [
      { label:'⚔️ Invertir en ejército (+400 soldados)',
        effects:{ army:+400 },
        xp: 'event_resolved' },
      { label:'🎭 Cultura (+20 moral, +10 estab)',
        effects:{ morale:+20, stability:+10 },
        xp: 'event_resolved' },
      { label:'💰 Reinvertir (+500 oro)',
        effects:{ gold:+500 },
        xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_TRADE_AMBUSH',
    title: '🗡️ Ataque en Ruta Comercial',
    category: 'ECONÓMICO',
    priority: 'high',
    icon: '🗡️',
    weight: s => (s.diplomacy||[]).some(n=>n.atWar) ? 35 : 5,
    condition: s => (s.activeTradeRoutes||[]).length > 0,
    options: [
      { label:'⚔️ Perseguir bandidos (-100 soldados, +50 oro)',
        effects:{ army:-100, gold:+50 },
        xp: 'event_resolved' },
      { label:'😤 Asumir pérdidas (-200 oro)',
        effects:{ gold:-200 },
        xp: 'event_resolved' },
      { label:'🛡️ Asignar escolta permanente (ruta más segura)',
        effects:{ gold:-100 },
        specialAction:'assign_route_guard',
        xp: 'trade_route' }
    ]
  },

  {
    id: 'EVT_ECONOMY_PENALTY',
    title: '📉 Crisis de Confianza',
    category: 'ECONOMÍA',
    priority: 'high',
    icon: '📉',
    weight: s => s.economy.corruption > 30 ? 30 : 0,
    condition: s => s.economy.corruption > 25,
    options: [
      { label:'🔍 Purga anticorrupción (-10 corrupt, -100 oro)',
        effects:{ gold:-100 },
        hiddenCost:{ type:'corruption', amount:-10, turns:1 },
        xp: 'event_resolved' },
      { label:'🙈 Ignorar (corrupción sigue subiendo)',
        effects:{},
        hiddenCost:{ type:'corruption', amount:5, turns:3 },
        xp: 'event_resolved' }
    ]
  },
  // ── 11-30: Eventos adicionales ──────────────────────────────

  {
    id: 'EVT_SPY_CAPTURED',
    title: '🕵️ Espía Capturado',
    category: 'DIPLOMACIA', priority: 'high', icon: '🕵️',
    weight: s => (s.spies?.active > 0 ? 30 : 0) + (s.diplomacy.some(n=>n.relation<-20)?15:0),
    condition: s => s.spies?.active > 0 || s.economy.corruption > 20,
    options: [
      { label: '💰 Pagar rescate (-200 oro)', effects: { gold:-200 }, xp: 'event_resolved' },
      { label: '🙈 Negarlo todo (relación -20 con captor)', effects: { stability:-5 },
        hiddenCost: { type:'corruption', amount:5, turns:1 }, xp: 'event_resolved' },
      { label: '🤝 Intercambio de prisioneros', effects: { gold:-100, stability:+5 }, xp: 'survived_crisis' }
    ]
  },

  {
    id: 'EVT_BANDIT_UPRISING',
    title: '🗡️ Levantamiento de Bandidos',
    category: 'SEGURIDAD', priority: 'high', icon: '🗡️',
    weight: s => (s.economy.corruption > 25 ? 35 : 5) + (s.stability < 40 ? 20 : 0),
    condition: s => s.economy.corruption > 20 || s.stability < 45,
    options: [
      { label: '⚔️ Purga militar (-200 tropas, +estab)', effects: { army:-200, stability:+12, morale:-8 }, xp: 'event_resolved' },
      { label: '💰 Sobornar líderes (-150 oro)', effects: { gold:-150, stability:+5 },
        hiddenCost: { type:'corruption', amount:8, turns:2 }, xp: 'event_resolved' },
      { label: '📋 Reformas de orden público (-80 oro/turno x3)', effects: { gold:-80 },
        hiddenCost: { type:'gold', amount:-80, turns:2 }, xp: 'survived_crisis' }
    ]
  },

  {
    id: 'EVT_FLOODING',
    title: '🌊 Inundaciones en las Llanuras',
    category: 'CLIMA', priority: 'high', icon: '🌊',
    weight: s => (s.climate?.season === 'spring' ? 25 : 5) + (s.resources.food < 150 ? 15 : 0),
    condition: s => true,
    options: [
      { label: '🌾 Racionamiento de emergencia', effects: { food:-100, morale:-10 }, xp: 'event_resolved' },
      { label: '🏗️ Construir diques (-300 oro, previene futuras)', effects: { gold:-300, stability:+8 }, xp: 'survived_crisis' },
      { label: '😤 Ignorar (riesgo hambruna +1)', effects: { food:-60 },
        hiddenCost: { type:'morale', amount:-8, turns:2 }, xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_FOREIGN_SCHOLAR',
    title: '📚 Erudito Extranjero Llega a la Corte',
    category: 'OPORTUNIDAD', priority: 'normal', icon: '📚',
    weight: s => (s.stability > 50 && s.resources.gold > 200) ? 20 : 3,
    condition: s => s.stability > 45,
    options: [
      { label: '🔬 Contratar (+50 estab, nuevas técnicas)', effects: { gold:-150, stability:+10, morale:+8 }, xp: 'event_resolved' },
      { label: '🤝 Enviarlo como diplomático (+20 rel con nación)', effects: { gold:-50 },
        specialAction: 'diplomat_bonus', xp: 'ally_made' },
      { label: '🚪 Rechazar (sin coste)', effects: { morale:-3 }, xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_MUTINY_RISK',
    title: '😡 Amago de Motín Militar',
    category: 'MILITAR', priority: 'critical', icon: '😡',
    weight: s => (s.morale < 30 ? 50 : 0) + (s.army > 600 && s.resources.gold < 100 ? 30 : 0),
    condition: s => s.morale < 35 || (s.army > 500 && s.resources.gold < 80),
    options: [
      { label: '💰 Paga extra a las tropas (-250 oro)', effects: { gold:-250, morale:+20, army:+100 }, xp: 'survived_crisis' },
      { label: '⚔️ Ejecutar cabecillas (-150 tropas, +estab)', effects: { army:-150, stability:+10, morale:-5 }, xp: 'event_resolved' },
      { label: '🏆 Prometer botín en próxima campaña (+10 moral, fuerza guerra)',
        effects: { morale:+15 }, hiddenCost: { type:'stability', amount:-5, turns:1 }, xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_PLAGUE_RATS',
    title: '🐀 Plaga de Ratas en los Graneros',
    category: 'ECONÓMICO', priority: 'high', icon: '🐀',
    weight: s => (s.resources.food > 300 ? 20 : 5) + (s.population > 7000 ? 15 : 0),
    condition: s => s.resources.food > 100,
    options: [
      { label: '🐈 Importar gatos de caza (100 oro)', effects: { gold:-100, food:-60 }, xp: 'event_resolved' },
      { label: '🔥 Quemar los graneros infestados (-200 comida, evita propagación)', effects: { food:-200, stability:+5 }, xp: 'event_resolved' },
      { label: '😤 No hacer nada (-150 comida extra, posible epidemia)', effects: { food:-150 },
        chains: ['EVT_PLAGUE'], xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_BORDER_SKIRMISH',
    title: '⚔️ Escaramuza en la Frontera',
    category: 'MILITAR', priority: 'high', icon: '⚔️',
    weight: s => s.diplomacy.filter(n=>n.relation<0).length * 12,
    condition: s => s.diplomacy.some(n=>n.relation < -10 && !n.atWar),
    options: [
      { label: '⚔️ Responder con fuerza (-100 tropas, rel -15)', effects: { army:-100, morale:+10 },
        specialAction: 'skirmish_retaliate', xp: 'event_resolved' },
      { label: '📨 Protesta diplomática (rel -5, sin violencia)', effects: { stability:-3 }, xp: 'event_resolved' },
      { label: '🛡️ Reforzar la frontera (-150 oro, previene futuras)', effects: { gold:-150, stability:+8 }, xp: 'survived_crisis' }
    ]
  },

  {
    id: 'EVT_ECONOMIC_BOOM',
    title: '📈 Boom Económico Inesperado',
    category: 'ECONÓMICO', priority: 'normal', icon: '📈',
    weight: s => (s.activeTradeRoutes?.length > 1 ? 25 : 5) + (s.economy.corruption < 15 ? 15 : 0),
    condition: s => (s.activeTradeRoutes||[]).length > 0 && s.economy.corruption < 30,
    options: [
      { label: '💰 Reinvertir en producción (+500 oro, +prod 2t)', effects: { gold:+300 },
        hiddenCost: { type:'gold', amount:200, turns:2 }, xp: 'event_resolved' },
      { label: '🏗️ Construir infraestructura (+estab permanente)', effects: { gold:+200, stability:+15 }, xp: 'survived_crisis' },
      { label: '⚔️ Financiar campaña militar (+400 tropas)', effects: { gold:+300, army:+400 }, xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_NOBLE_REBELLION',
    title: '👑 Rebelión de la Nobleza',
    category: 'POLÍTICA', priority: 'critical', icon: '👑',
    weight: s => (s.economy.corruption > 35 ? 30 : 0) + (s.stability < 35 ? 25 : 0),
    condition: s => s.economy.corruption > 30 || s.stability < 40,
    options: [
      { label: '⚔️ Aplastar la rebelión (-300 tropas, -20 estab)', effects: { army:-300, stability:-20, morale:+10 },
        hiddenCost: { type:'corruption', amount:10, turns:1 }, xp: 'survived_crisis' },
      { label: '📜 Conceder privilegios nobles (-1 política activa)', effects: { stability:+20 },
        specialAction: 'lose_policy', xp: 'event_resolved' },
      { label: '💰 Soborno masivo (-500 oro)', effects: { gold:-500, stability:+15 }, xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_DESERT_CARAVAN',
    title: '🐪 Gran Caravana del Desierto',
    category: 'ECONÓMICO', priority: 'normal', icon: '🐪',
    weight: s => 15 + ((s.activeTradeRoutes||[]).length * 8),
    condition: s => true,
    options: [
      { label: '🌶️ Especias exóticas (+200 oro, moral +10)', effects: { gold:+200, morale:+10 }, xp: 'event_resolved' },
      { label: '⚙️ Armas de calidad (+150 tropas efectivas)', effects: { iron:+80, army:+150 }, xp: 'event_resolved' },
      { label: '📜 Mapas de rutas secretas (nueva ruta disponible)', effects: { gold:+100 },
        specialAction: 'open_trade_bonus', xp: 'trade_route' }
    ]
  },

  {
    id: 'EVT_VOLCANIC_WINTER',
    title: '🌋 Invierno Volcánico',
    category: 'CLIMA', priority: 'critical', icon: '🌋',
    weight: s => 8,
    condition: s => s.turn > 5,
    options: [
      { label: '🌾 Reservas de emergencia (-300 comida ahora, evita hambruna)', effects: { food:-300, morale:-10 }, xp: 'survived_crisis' },
      { label: '💰 Importar desde aliados (-400 oro)', effects: { gold:-400, food:+250 }, xp: 'event_resolved' },
      { label: '🙏 Sacrificios rituales (free, -20 moral, riesgo revuelta)', effects: { morale:-20 },
        chains: ['EVT_FAMINE_REVOLT'], xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_RELIGIOUS_SCHISM',
    title: '✝️ Cisma Religioso',
    category: 'SOCIAL', priority: 'high', icon: '✝️',
    weight: s => (s.morale < 45 ? 25 : 8) + (s.stability < 50 ? 10 : 0),
    condition: s => s.population > 4000,
    options: [
      { label: '⚖️ Mediar entre facciones (-150 oro, +estab)', effects: { gold:-150, stability:+10 }, xp: 'event_resolved' },
      { label: '✊ Suprimir la herejía (-estab, +corrupción)', effects: { stability:-10, morale:+8 },
        hiddenCost: { type:'corruption', amount:10, turns:1 }, xp: 'event_resolved' },
      { label: '🕊️ Tolerancia oficial (+20 moral, -5 estab)', effects: { morale:+20, stability:-5 }, xp: 'survived_crisis' }
    ]
  },

  {
    id: 'EVT_TECHNOLOGICAL_DISCOVERY',
    title: '⚙️ Descubrimiento Técnico',
    category: 'OPORTUNIDAD', priority: 'normal', icon: '⚙️',
    weight: s => (s.stability > 60 && s.resources.iron > 80) ? 22 : 4,
    condition: s => s.stability > 55 && s.resources.iron > 60,
    options: [
      { label: '🏹 Armas mejoradas (+20% fuerza ejército)', effects: { iron:-60 },
        specialAction: 'army_upgrade', xp: 'event_resolved' },
      { label: '🌾 Herramientas agrícolas (+25% comida 5 turnos)', effects: { iron:-40 },
        specialAction: 'food_boost', xp: 'event_resolved' },
      { label: '🚢 Embarcaciones rápidas (nueva ruta marítima)', effects: { wood:-80, iron:-40 },
        specialAction: 'open_trade_bonus', xp: 'trade_route' }
    ]
  },

  {
    id: 'EVT_ALLIED_REQUEST',
    title: '📨 Petición de Ayuda de Aliado',
    category: 'DIPLOMACIA', priority: 'high', icon: '📨',
    weight: s => (s.diplomacy.some(n=>n.relation>40) ? 28 : 0),
    condition: s => s.diplomacy.some(n => n.relation > 40 && !n.atWar),
    options: [
      { label: '⚔️ Enviar tropas (-300 soldados, rel +25)', effects: { army:-300 },
        specialAction: 'ally_helped', xp: 'ally_made' },
      { label: '💰 Enviar oro (-250 oro, rel +15)', effects: { gold:-250 },
        specialAction: 'ally_helped_gold', xp: 'event_resolved' },
      { label: '🙅 Rechazar (rel -25, pierde confianza)', effects: { morale:-5 },
        specialAction: 'ally_rejected', xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_PIRATE_RAID',
    title: '🏴‍☠️ Ataque Pirata a Puertos',
    category: 'MILITAR', priority: 'high', icon: '🏴‍☠️',
    weight: s => ((s.activeTradeRoutes||[]).some(r=>r.routeId?.includes('mar')) ? 35 : 5),
    condition: s => (s.activeTradeRoutes||[]).length > 0,
    options: [
      { label: '⚓ Flota de escolta (-200 oro, protege rutas)', effects: { gold:-200, stability:+5 }, xp: 'event_resolved' },
      { label: '⚔️ Cazar piratas (-150 tropas, +100 oro)', effects: { army:-150, gold:+100, morale:+8 }, xp: 'survived_crisis' },
      { label: '💸 Absorber pérdidas (-200 oro de las rutas)', effects: { gold:-200 }, xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_ORACLE_PROPHECY',
    title: '🔮 Profecía del Oráculo',
    category: 'OPORTUNIDAD', priority: 'normal', icon: '🔮',
    weight: s => 12,
    condition: s => s.turn > 3,
    options: [
      { label: '⚔️ "Victoria en el Este" (prox batalla +20% fuerza)', effects: { morale:+15 },
        hiddenCost: { type:'gold', amount:-100, turns:0 }, xp: 'event_resolved' },
      { label: '💰 "Las cosechas prosperarán" (+200 comida próx. turno)', effects: { gold:-80, food:+200 }, xp: 'event_resolved' },
      { label: '🙈 Ignorar la profecía (gratis)', effects: {}, xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_DROUGHT',
    title: '☀️ Gran Sequía',
    category: 'CLIMA', priority: 'critical', icon: '☀️',
    weight: s => (s.climate?.drought ? 60 : 8) + (s.resources.food < 200 ? 20 : 0),
    condition: s => true,
    options: [
      { label: '💧 Pozos de irrigación (-200 oro, +20 comida/turno)', effects: { gold:-200, food:+100 }, xp: 'survived_crisis' },
      { label: '🌾 Importar grano de emergencia (-300 oro)', effects: { gold:-300, food:+350 }, xp: 'event_resolved' },
      { label: '🏃 Migración forzada (-500 pob, -10 moral)', effects: { morale:-10 },
        specialAction: 'pop_loss_drought', xp: 'event_resolved' }
    ]
  },

  {
    id: 'EVT_CENSUS_CORRUPTION',
    title: '📊 Fraude en el Censo',
    category: 'ECONOMÍA', priority: 'high', icon: '📊',
    weight: s => (s.economy.corruption > 20 ? 30 : 5),
    condition: s => s.economy.corruption > 15 || s.turn % 10 === 0,
    options: [
      { label: '🔍 Investigación interna (-100 oro, -15 corrup)', effects: { gold:-100 },
        hiddenCost: { type:'corruption', amount:-15, turns:1 }, xp: 'event_resolved' },
      { label: '📋 Aceptar resultados falsos (economía inflada 3t)', effects: { gold:+150 },
        hiddenCost: { type:'corruption', amount:12, turns:3 }, xp: 'event_resolved' },
      { label: '⚖️ Reforma fiscal (-estab corto plazo, +base fiscal)', effects: { stability:-8, morale:-5 },
        hiddenCost: { type:'corruption', amount:-20, turns:1 }, xp: 'survived_crisis' }
    ]
  },

  {
    id: 'EVT_HERO_EMERGES',
    title: '⭐ Héroe del Pueblo',
    category: 'MILITAR', priority: 'normal', icon: '⭐',
    weight: s => (s.army > 400 && s.morale > 55) ? 18 : 3,
    condition: s => s.army > 300 && s.morale > 50,
    options: [
      { label: '⚔️ General del ejército (+200 tropas, +15% fuerza)', effects: { army:+200, morale:+12 }, xp: 'event_resolved' },
      { label: '📢 Enviarlo al pueblo (+25 moral, inspira lealtad)', effects: { morale:+25, stability:+10 }, xp: 'survived_crisis' },
      { label: '🤝 Embajador (+20 rel con nación aleatoria)', effects: { morale:+8 },
        specialAction: 'hero_diplomat', xp: 'ally_made' }
    ]
  },

  {
    id: 'EVT_SLAVE_REVOLT',
    title: '✊ Revuelta de los Trabajadores',
    category: 'SOCIAL', priority: 'critical', icon: '✊',
    weight: s => (s.economy.corruption > 30 && s.morale < 40) ? 45 : 5,
    condition: s => s.economy.corruption > 25 || (s.morale < 35 && s.stability < 40),
    options: [
      { label: '⚔️ Represión violenta (-150 tropas, -20 moral, +estab)', effects: { army:-150, morale:-20, stability:+15 },
        hiddenCost: { type:'corruption', amount:8, turns:1 }, xp: 'event_resolved' },
      { label: '📜 Reformas de condiciones laborales (-150 oro/turno)', effects: { gold:-100, morale:+25, stability:+20 },
        hiddenCost: { type:'gold', amount:-150, turns:2 }, xp: 'survived_crisis' },
      { label: '🗣️ Negociar con líderes (-200 oro, paz temporal)', effects: { gold:-200, morale:+10, stability:+8 }, xp: 'event_resolved' }
    ]
  },
];

// Motor de selección de eventos dinámicos
const DynamicEvents = {

  selectForTurn(state) {
    const available = DYNAMIC_EVENT_POOL.filter(e => {
      const lastFired = (state._eventHistory||{})[e.id] || 0;
      if (state.turn - lastFired < 4) return false;
      try { return e.condition ? e.condition(state) : true; }
      catch(_) { return false; }
    });

    if (!available.length) return null;

    const total = available.reduce((s,e)=>s+e.weight(state),0);
    if (!total) return null;
    let rand = Math.random() * total;
    for (const ev of available) {
      rand -= ev.weight(state);
      if (rand <= 0) return ev;
    }
    return available[0];
  },

  // Convertir a formato del sistema de eventos existente
  toGameEvent(ev) {
    return {
      id:       ev.id,
      title:    ev.title,
      category: ev.category,
      icon:     ev.icon,
      priority: ev.priority,
      options:  (ev.options||[]).map(o => ({
        label:        o.label,
        effects:      o.effects || {},
        chains:       o.chains,
        specialAction:o.specialAction,
        hiddenCost:   o.hiddenCost,
        xpType:       o.xp,
      })),
      _dynamic: true,
    };
  },

  // Patch: enhance applyDecision to handle chains + hiddenCosts
  applyDecision(state, event, optionIdx) {
    if (!event._dynamic) return false;
    const opt = event.options?.[optionIdx];
    if (!opt) return false;

    // Apply direct effects
    const fx = opt.effects || {};
    if (fx.gold)       state.resources.gold  = Math.max(0, state.resources.gold  + fx.gold);
    if (fx.food)       state.resources.food  = Math.max(0, state.resources.food  + fx.food);
    if (fx.army)       state.army            = Math.max(0, state.army            + fx.army);
    if (fx.stability)  state.stability       = Math.max(0, Math.min(100, state.stability  + fx.stability));
    if (fx.morale)     state.morale          = Math.max(0, Math.min(100, state.morale     + fx.morale));

    // Hidden cost
    if (opt.hiddenCost) HiddenCosts.add(state, opt.hiddenCost.type, opt.hiddenCost.amount, opt.hiddenCost.turns);

    // XP
    if (opt.xpType) Progression.awardXP(state, opt.xpType);

    // Special actions
    this._applySpecial(state, opt.specialAction, event);

    // Chains
    if (opt.chains?.length) {
      state._pendingEvents = state._pendingEvents || [];
      opt.chains.forEach(id => state._pendingEvents.push({ eventId:id, firesAt:state.turn+1 }));
    }

    // History
    state._eventHistory = state._eventHistory || {};
    state._eventHistory[event.id] = state.turn;

    Systems.Log.add(state, `Decisión: "${opt.label}" — ${event.title}`, 'good');
    return true;
  },

  _applySpecial(state, action, event) {
    if (!action) return;
    switch(action) {
      case 'quarantine':
        state.population = Math.floor(state.population * 0.85);
        break;
      case 'herbalists':
        state.population = Math.floor(state.population * 0.95);
        break;
      case 'pray_plague':
        if (Math.random() < 0.3) state.morale += 10;
        else { state.population = Math.floor(state.population * 0.75); state.morale -= 30; }
        break;
      case 'civil_war_battle': {
        const win = Math.random() < Math.min(0.8, (state.army / 1200));
        if (win) { state.army = Math.floor(state.army * 0.7); state.stability += 20; }
        else     { state.army = Math.floor(state.army * 0.4); state.stability -= 15; state.althoriaRegions = Math.max(1,state.althoriaRegions-1); }
        break;
      }
      case 'lose_policy':
        if ((state.activePolicies||[]).length > 0) state.activePolicies.pop();
        break;
      case 'open_trade_bonus':
        state._merchantBonus = true;
        break;
      case 'apologize_incident': {
        const hostile = state.diplomacy?.find(n=>n.relation<-20);
        if (hostile) hostile.relation = Math.min(100, hostile.relation + 20);
        state.resources.gold -= 100;
        break;
      }
      case 'escalate_incident': {
        const hostile = state.diplomacy?.find(n=>n.relation<-20);
        if (hostile) { hostile.relation -= 30; hostile.atWar = hostile.relation < -60; }
        break;
      }
      case 'assign_route_guard': {
        const rt = (state.activeTradeRoutes||[])[0];
        if (rt) rt.guards = (rt.guards||0) + 200;
        break;
      }
    }
  },

  processPendingEvents(state) {
    if (!state._pendingEvents?.length) return [];
    const now = state._pendingEvents.filter(p => p.firesAt <= state.turn);
    state._pendingEvents = state._pendingEvents.filter(p => p.firesAt > state.turn);

    return now.map(p => {
      const evDef = DYNAMIC_EVENT_POOL.find(e => e.id === p.eventId);
      return evDef ? this.toGameEvent(evDef) : null;
    }).filter(Boolean);
  }
};

// ─────────────────────────────────────────────────────────────
// 6. SABOTAJE DE RUTAS COMERCIALES
// ─────────────────────────────────────────────────────────────
const RouteSabotage = {

  // Atacar ruta de un rival (acción del jugador)
  attackRoute(state, targetNationId) {
    if (!ActionPoints.spend(state, 2, 'Asalto a ruta comercial')) return;
    ActionPoints.setCooldown(state, 'attack_route', 3);

    const n = (state.diplomacy||[]).find(d=>d.id===targetNationId);
    if (!n) return;

    const attackPow = state.army * 0.2;
    const defPow    = (n._routeGuards || 100) + 50;
    const success   = Math.random() < (attackPow / (attackPow + defPow));

    if (success) {
      n._routeHealth = Math.max(0, (n._routeHealth||100) - 40);
      const income = n._routeIncome || 50;
      state.resources.gold += Math.floor(income * 0.5);  // botín
      n.relation = Math.max(-100, n.relation - 25);
      if (n.relation < -50) n.atWar = true;
      Systems.Log.add(state, `⚔️ Asalto exitoso a ruta de ${n.name}! Ruta al ${n._routeHealth}%. +${Math.floor(income*0.5)}💰 botín.`, 'good');
      Progression.awardXP(state, 'battle_won', 0.5);
    } else {
      const losses = Math.floor(state.army * 0.05);
      state.army -= losses;
      Systems.Log.add(state, `⚔️ Asalto rechazado por ${n.name}. Bajas: ${losses} soldados.`, 'warn');
      Progression.awardXP(state, 'battle_lost', 0.3);
    }
    if (typeof UI !== 'undefined') UI.fullRender(state);
  },

  // Sabotear con espías (sin declarar hostilidades)
  sabotageRoute(state, targetNationId) {
    if (!ActionPoints.spend(state, 1, 'Sabotaje de espía')) return;
    if (!state.resources.gold >= 120) { showResourceError([{icon:'💰',name:'Oro',need:120,have:state.resources.gold}]); return; }
    state.resources.gold -= 120;

    const n = (state.diplomacy||[]).find(d=>d.id===targetNationId);
    if (!n) return;

    const spyLvl   = (state.spies?.level || 1);
    const baseProb = 0.55 + spyLvl * 0.08;
    const roll     = Math.random();

    if (roll < baseProb) {
      // SUCCESS
      n._routeHealth = Math.max(0, (n._routeHealth||100) - 25);
      Systems.Log.add(state, `🕵️ Sabotaje exitoso! Ruta de ${n.name} al ${n._routeHealth}%.`, 'good');
    } else if (roll < baseProb + 0.25) {
      // SILENT FAIL
      Systems.Log.add(state, `🕵️ El espía no pudo infiltrarse en ${n.name}. Dinero perdido.`, 'warn');
    } else {
      // DISCOVERED
      n.relation = Math.max(-100, n.relation - 40);
      if (Math.random() < 0.4) n.atWar = true;
      Systems.Log.add(state, `🕵️ ¡Espía DESCUBIERTO! ${n.name} nos acusa de sabotaje.`, 'crisis');
    }
    if (typeof UI !== 'undefined') UI.fullRender(state);
  },

  // Asignar guardia a propia ruta
  guardOwnRoute(state, routeId, soldiers) {
    const amt = soldiers || 150;
    if (state.army < amt) { showResourceError([{icon:'⚔️',name:'Soldados',need:amt,have:state.army}]); return; }
    state.army -= amt;
    const rt = (state.activeTradeRoutes||[]).find(r=>r.routeId===routeId);
    if (rt) {
      rt.guards = (rt.guards||0) + amt;
      state.resources.gold -= Math.floor(amt * 0.3); // upkeep
      Systems.Log.add(state, `🛡️ ${amt} soldados escoltan la ruta ${rt.routeName}.`, 'good');
    }
    if (typeof UI !== 'undefined') UI.fullRender(state);
  },
};

// ─────────────────────────────────────────────────────────────
// 7. POSICIONAMIENTO TÁCTICO
// ─────────────────────────────────────────────────────────────
const TacticalMap = {

  NODES: {
    highlands:    { name:'Tierras Altas',    defBonus:0.35, atkPenalty:0.10, type:'highland',   maxGarrison:500  },
    river_cross:  { name:'Vado del Río',     defBonus:0.50, atkPenalty:0.00, type:'chokepoint', maxGarrison:300  },
    open_plains:  { name:'Llanuras',         defBonus:0.00, atkPenalty:0.00, type:'plains',     maxGarrison:2000, cavalryBonus:0.20 },
    forest_path:  { name:'Camino Forestal',  defBonus:0.20, atkPenalty:0.00, type:'forest',     maxGarrison:800,  ambushBonus:0.30  },
    sea_port:     { name:'Puerto Costero',   defBonus:0.40, atkPenalty:0.05, type:'fortress',   maxGarrison:600  },
    capital_gate: { name:'Puerta Capital',   defBonus:0.60, atkPenalty:0.15, type:'fortress',   maxGarrison:1000 },
  },

  // Calcular fuerza final de combate según nodo
  calcStrength(armySize, morale, nodeId, isAttacker, hasRecon, unitTypes) {
    const node    = this.NODES[nodeId];
    if (!node) return armySize * (morale/100);

    const basePow = armySize * (morale/100);
    let modifier  = 1.0;

    if (isAttacker) {
      modifier -= (node.atkPenalty||0);
      if (hasRecon) modifier += 0.15;
      // Ambush: penaliza al atacante sin reconocimiento
      if (!hasRecon && node.ambushBonus) modifier -= node.ambushBonus;
    } else {
      modifier += (node.defBonus||0);
      if (node.type === 'chokepoint') modifier += 0.15; // extra defensivo en chokepoints
    }

    // Caballería en llanuras
    if (node.cavalryBonus && (unitTypes||[]).some(u=>(typeof u==='string'?u:u.typeId)==='caballeria')) {
      modifier += node.cavalryBonus;
    }

    return Math.max(1, Math.floor(basePow * modifier));
  },

  // Posicionar tropas en un nodo (desde militaryPanel)
  assignGarrison(state, nodeId, soldiers) {
    const node = this.NODES[nodeId];
    if (!node) return false;
    if (state.army < soldiers) return false;
    if (soldiers > node.maxGarrison) soldiers = node.maxGarrison;

    state.army -= soldiers;
    state._garrisons = state._garrisons || {};
    state._garrisons[nodeId] = (state._garrisons[nodeId]||0) + soldiers;
    Systems.Log.add(state, `🏰 ${soldiers} soldados asignados a ${node.name}.`, 'good');
    return true;
  },

  // Recuperar garrisón al mapa principal
  withdrawGarrison(state, nodeId) {
    const garrison = (state._garrisons||{})[nodeId];
    if (!garrison) return;
    state.army += garrison;
    delete state._garrisons[nodeId];
    Systems.Log.add(state, `⏪ Tropas retiradas de ${this.NODES[nodeId]?.name||nodeId}.`, 'info');
  },

  // Bonus total en combate aplicando garrisons
  getCombatBonus(state, nodeId) {
    const garr = (state._garrisons||{})[nodeId] || 0;
    const node = this.NODES[nodeId];
    if (!garr || !node) return 0;
    return garr * (node.defBonus||0) * 0.5; // bonus proporcional
  },

  // Render panel de guarniciones
  renderGarrisonPanel(state) {
    const garrisons = state._garrisons || {};
    const rows = Object.entries(this.NODES).map(([id,n]) => {
      const g = garrisons[id]||0;
      const pct = g / n.maxGarrison * 100;
      return `
        <div class="garrison-row">
          <div class="gr-name">${n.name}</div>
          <div class="gr-type tag-${n.type}">${n.type}</div>
          <div class="gr-bonus">🛡️+${Math.round(n.defBonus*100)}%</div>
          <div class="gr-bar"><div class="gr-fill" style="width:${Math.min(100,pct)}%"></div></div>
          <div class="gr-troops">${g>0?g+'⚔️':'—'}</div>
          ${g>0
            ? `<button class="diplo-btn danger" onclick="TacticalMap.withdrawGarrison(Game.state,'${id}');UI.renderMilitary(Game.state)">↩</button>`
            : `<button class="diplo-btn" onclick="TacticalMap.assignGarrison(Game.state,'${id}',100);UI.renderMilitary(Game.state)">+100</button>`}
        </div>`;
    }).join('');
    return `<div class="garrison-panel"><div class="rpanel-title">🏰 Guarniciones Tácticas</div>${rows}</div>`;
  }
};

// ─────────────────────────────────────────────────────────────
// 8. VISUAL FEEDBACK RULES (aplicadas en cada render)
// ─────────────────────────────────────────────────────────────
const VisualFeedback = {

  apply(state) {
    if (!state) return;
    // Food crisis
    this._toggle('#val-food',    state.resources.food < 50,   'res-critical');
    this._toggle('#val-gold',    state.resources.gold < 0,    'res-critical');
    this._toggle('#pill-stab',   state.stability < 30,        'stat-danger');
    this._toggle('#pill-moral',  state.morale    < 20,        'stat-danger');
    // Good state
    this._toggle('#btn-endturn', state.stability > 65 && state.morale > 60, 'btn-glow-gold');
    // AP indicator
    const apEl = document.getElementById('ap-display');
    if (apEl) {
      apEl.textContent = '⚡'.repeat(state.actionPoints||0) + '○'.repeat(Math.max(0,(state.actionPointsMax||3)-(state.actionPoints||0)));
      apEl.className   = (state.actionPoints||0) === 0 ? 'ap-display ap-empty' : 'ap-display';
    }
    // Route health badges
    const dangerRoute = (state.activeTradeRoutes||[]).some(r=>(r.health||100)<50);
    this._badge('.ptab[onclick*="trade"]', dangerRoute ? '⚠' : '');
    // Unread diplomacy
    const unread = (state.diplomacyInbox||[]).filter(m=>!m.read).length;
    this._badge('.ptab[onclick*="diplomacy"]', unread > 0 ? unread : '');
    // New unlocks
    const newU = (state._newUnlocks||[]).length;
    this._badge('.ptab[onclick*="unlocks"]', newU > 0 ? newU : '');
  },

  _toggle(selector, cond, cls) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (cond) el.classList.add(cls);
    else el.classList.remove(cls);
  },

  _badge(selector, text) {
    const el = document.querySelector(selector);
    if (!el) return;
    let badge = el.querySelector('.tab-badge');
    if (text) {
      if (!badge) { badge = document.createElement('span'); badge.className='tab-badge'; el.appendChild(badge); }
      badge.textContent = text;
    } else {
      if (badge) badge.remove();
    }
  }
};
