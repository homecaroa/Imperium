// ============================================================
// IMPERIUM — DEEP_SYSTEMS.JS
// Sistemas profundos: espionaje, decisiones irreversibles,
// objetivos ocultos, líderes con personalidad, diplomacia
// con memoria, ciudades, coste moral, guerra realista.
// ============================================================

// ══════════════════════════════════════════════════════════
// 1. DECISIONES "DUELE ELEGIR" — TradeOffSystem
//    Cada acción importante afecta ≥2 variables en tensión
// ══════════════════════════════════════════════════════════
var TradeOffSystem = {

  // Registro de decisiones que bloquean otras
  _locks: {},

  // Definición de trade-offs estructurales
  DILEMMAS: {
    taxation: {
      id: 'taxation', icon: '💰',
      title: 'Política Fiscal',
      description: 'Las tasas altas financian el ejército pero oprimen al pueblo.',
      options: [
        { label: 'Tasas altas (40%)',    effects: { gold_rate: +40, morale: -15, faction_pueblo: -20 }, locks: ['popular_support'] },
        { label: 'Tasas moderadas (20%)',effects: { gold_rate: +10, morale:  +5, faction_pueblo: +5  } },
        { label: 'Sin impuestos',        effects: { gold_rate: -30, morale: +20, faction_pueblo: +30 }, locks: ['military_budget'] }
      ]
    },
    succession: {
      id: 'succession', icon: '👑',
      title: 'Ley de Sucesión',
      permanent: true,
      description: 'Solo se decide una vez. Define quién hereda el poder.',
      options: [
        { label: 'Primogenitura',        effects: { stability: +20, faction_nobleza: +25, faction_pueblo: -10 }, permanent: true, permLabel: 'LEY FIJADA' },
        { label: 'Elección del Consejo', effects: { stability: +10, corruption: +15, faction_senado: +20    }, permanent: true, permLabel: 'LEY FIJADA' },
        { label: 'Mérito militar',       effects: { army_strength: +20, faction_ejercito: +30, morale: +10 }, permanent: true, permLabel: 'LEY FIJADA' }
      ]
    },
    religion_policy: {
      id: 'religion_policy', icon: '✝',
      title: 'Política Religiosa',
      description: 'Libertad vs Estado. Toca dos facciones a la vez.',
      options: [
        { label: 'Religión oficial',     effects: { stability: +15, faction_iglesia: +30, faction_comerciantes: -15 }, locks: ['secular_laws'] },
        { label: 'Separación Iglesia',   effects: { corruption: -10, faction_iglesia: -25, gold_rate: +10 },           locks: ['religious_laws'] },
        { label: 'Sincretismo',          effects: { morale: +10, stability: +5, faction_iglesia: -10 } }
      ]
    }
  },

  // Aplica un dilemma al estado
  apply(state, dilemmaId, optionIdx) {
    const d = this.DILEMMAS[dilemmaId];
    if (!d) return { ok: false, msg: 'Dilema desconocido' };

    const opt = d.options[optionIdx];
    if (!opt) return { ok: false, msg: 'Opción inválida' };

    // Aplicar efectos
    if (opt.effects.gold_rate)       state._goldRateBonus   = (state._goldRateBonus || 0) + opt.effects.gold_rate;
    if (opt.effects.morale)          state.morale = Math.max(0, Math.min(100, state.morale + opt.effects.morale));
    if (opt.effects.stability)       state.stability = Math.max(0, Math.min(100, state.stability + opt.effects.stability));
    if (opt.effects.corruption)      state.economy.corruption = Math.max(0, state.economy.corruption + opt.effects.corruption);
    if (opt.effects.army_strength)   state._armyStrengthBonus = (state._armyStrengthBonus || 0) + opt.effects.army_strength;

    // Efecto en facciones
    Object.entries(opt.effects).forEach(([k, v]) => {
      if (k.startsWith('faction_')) {
        const fId = k.replace('faction_', '');
        const f = (state.factions || []).find(f => f.id === fId);
        if (f) f.satisfaction = Math.max(0, Math.min(100, f.satisfaction + v));
      }
    });

    // Bloqueos
    if (opt.locks) opt.locks.forEach(lock => {
      state._locked = state._locked || {};
      state._locked[lock] = true;
    });

    // Permanente
    if (d.permanent || opt.permanent) {
      state._permanentDecisions = state._permanentDecisions || {};
      state._permanentDecisions[dilemmaId] = { optionIdx, label: opt.label, permLabel: opt.permLabel || 'PERMANENTE' };
      Systems.Log.add(state, '⛔ DECISIÓN PERMANENTE: ' + d.title + ' → ' + opt.label, 'warn');
    }

    return { ok: true };
  },

  // Check si una acción está bloqueada por una decisión previa
  isLocked(state, actionId) {
    return !!(state._locked && state._locked[actionId]);
  }
};

// ══════════════════════════════════════════════════════════
// 2. ESPIONAJE PROFUNDO — DeepSpySystem
//    Espías descubren secretos; se pueden usar para chantaje
// ══════════════════════════════════════════════════════════
var DeepSpySystem = {

  // Tipos de secretos descubribles por misión de espionaje
  SECRET_TYPES: [
    { id: 'war_plan',      label: 'Plan de Guerra',     weight: 30, leverage: 60,
      description: 'Conoces su próximo objetivo militar.',
      use: { diplomacy: 'Evita ataque inminente (+40 relación)', blackmail: 'Exige 300 oro o lo publicas' } },
    { id: 'corruption',    label: 'Corrupción Interna',  weight: 25, leverage: 50,
      description: 'Sus funcionarios malversan fondos.',
      use: { diplomacy: 'Pon al descubierto a su élite (-20 estabilidad rival)', blackmail: 'Exige alianza o lo expones' } },
    { id: 'weak_garrison', label: 'Guarnición Débil',    weight: 35, leverage: 30,
      description: 'Su frontera norte está desprotegida.',
      use: { military: 'Atacar región con -30% resistencia', diplomacy: 'Usarlo como presión de negociación' } },
    { id: 'faction_unrest',label: 'Revuelta Facción',    weight: 20, leverage: 70,
      description: 'Una facción planea un golpe contra su líder.',
      use: { blackmail: 'Exige 500 oro o avisas al líder rival', sabotaje: 'Alimentar la revuelta (-25 estabilidad rival)' } },
    { id: 'treasury_empty',label: 'Tesorería Vacía',     weight: 15, leverage: 80,
      description: 'Está al borde de la bancarrota.',
      use: { diplomacy: 'Ofrece préstamo a cambio de cesión territorial', blackmail: 'Exige comercio forzado' } }
  ],

  // Cuando una misión de reconocimiento tiene éxito, puede descubrir un secreto
  discoverSecret(state, nationId) {
    const roll = Math.random();
    if (roll > 0.45) return null; // 55% sin secreto grave

    const weights = this.SECRET_TYPES.map(s => s.weight);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let secret = null;
    for (const s of this.SECRET_TYPES) {
      r -= s.weight;
      if (r <= 0) { secret = s; break; }
    }
    if (!secret) secret = this.SECRET_TYPES[0];

    const discovered = {
      id: secret.id + '_' + Date.now(),
      type: secret.id,
      label: secret.label,
      nationId,
      description: secret.description,
      use: secret.use,
      leverage: secret.leverage,
      discovered: state.turn,
      used: false
    };

    state._secrets = state._secrets || {};
    state._secrets[nationId] = state._secrets[nationId] || [];
    state._secrets[nationId].push(discovered);

    Systems.Log.add(state, '🕵️ SECRETO DESCUBIERTO: ' + secret.label + ' de ' + nationId + '. ¡Puedes usarlo!', 'good');
    return discovered;
  },

  // Usar un secreto para chantaje — exige recursos o concesiones
  useBlackmail(state, secretId, nationId) {
    const secrets = (state._secrets && state._secrets[nationId]) || [];
    const secret = secrets.find(s => s.id === secretId && !s.used);
    if (!secret) return { ok: false, msg: 'Secreto no disponible' };

    const nation = (state.diplomacy || []).find(n => n.id === nationId);
    if (!nation) return { ok: false, msg: 'Nación no encontrada' };

    const goldDemand = Math.floor(secret.leverage * 4);
    const relationCost = -Math.floor(secret.leverage * 0.6);

    // Éxito depende del leverage y de la relación actual
    const successChance = Math.min(0.85, 0.3 + secret.leverage / 200);
    if (Math.random() < successChance) {
      state.resources.gold = (state.resources.gold || 0) + goldDemand;
      nation.relation = Math.max(-100, (nation.relation || 0) + relationCost);
      secret.used = true;
      Systems.Log.add(state, '💰 CHANTAJE EXITOSO: +' + goldDemand + ' oro de ' + nation.name + '. Relación ' + relationCost, 'good');
      return { ok: true, gold: goldDemand };
    } else {
      nation.relation = Math.max(-100, (nation.relation || 0) - 30);
      secret.used = true;
      Systems.Log.add(state, '😡 CHANTAJE FALLIDO: ' + nation.name + ' rechaza la amenaza. Relación -30.', 'crisis');
      return { ok: false, msg: 'El chantaje fracasó' };
    }
  },

  // Usar secreto en diplomacia — bonificación en negociaciones
  useDiplomacy(state, secretId, nationId) {
    const secrets = (state._secrets && state._secrets[nationId]) || [];
    const secret = secrets.find(s => s.id === secretId && !s.used);
    if (!secret) return { ok: false };
    const nation = (state.diplomacy || []).find(n => n.id === nationId);
    if (!nation) return { ok: false };

    const bonus = Math.floor(secret.leverage * 0.5);
    nation.relation = Math.min(100, (nation.relation || 0) + bonus);
    nation.trust = Math.min(100, (nation.trust || 30) + 15);
    secret.used = true;
    Systems.Log.add(state, '🤝 SECRETO USADO: Relación con ' + nation.name + ' +' + bonus + '. Confianza +15.', 'good');
    return { ok: true, bonus };
  },

  getAvailableSecrets(state, nationId) {
    return ((state._secrets && state._secrets[nationId]) || []).filter(s => !s.used);
  }
};

// ══════════════════════════════════════════════════════════
// 3. DECISIONES IRREVERSIBLES — PermanentChoices
//    Bloquean opciones futuras para siempre
// ══════════════════════════════════════════════════════════
var PermanentChoices = {

  CHOICES: {
    burn_library: {
      id: 'burn_library', icon: '🔥',
      title: '¿Quemar la Gran Biblioteca?',
      description: 'Tu ejército tomó la ciudad con la mayor biblioteca conocida. Quemarla intimida. Conservarla da legitimidad.',
      cost: 0, isIrreversible: true,
      options: [
        { label: 'Quemar — terror total',
          effects: { morale: +25, stability: -15, faction_iglesia: -40 },
          blocks: ['knowledge_bonus', 'diplomatic_prestige'],
          grants: ['fear_bonus'],        // enemigos tienen -10% en primeras batallas
          permanentText: '🔥 Quemaste el conocimiento.' },
        { label: 'Conservar — legitimidad',
          effects: { stability: +20, morale: -5, faction_pueblo: +20 },
          blocks: ['brutality_bonus'],
          grants: ['scholar_income'],    // +10 oro/turno por 10 turnos
          permanentText: '📚 Protector del conocimiento.' }
      ]
    },
    exile_faction: {
      id: 'exile_faction', icon: '⚔',
      title: 'Exiliar una Facción',
      description: 'La facción más poderosa amenaza tu trono. Exiliarla es irreversible.',
      isIrreversible: true,
      options: [
        { label: 'Exiliar a la nobleza',
          effects: { stability: -20, morale: -10, faction_nobleza: -100 },
          blocks: ['noble_alliances'],
          grants: ['populist_support'],
          permanentText: '🏚 Nobleza exiliada para siempre.' },
        { label: 'Exiliar al ejército leal',
          effects: { army: -300, morale: -20, faction_ejercito: -80 },
          blocks: ['military_campaigns'],
          grants: ['civil_peace'],
          permanentText: '🕊 Ejército disuelto.' }
      ]
    },
    capital_move: {
      id: 'capital_move', icon: '🏰',
      title: 'Mover la Capital',
      description: 'Una nueva capital puede mejorar tu posición estratégica, pero es un proyecto colosal.',
      cost: 800, isIrreversible: true,
      options: [
        { label: 'Costa — dominio naval',
          effects: { gold_rate: +35, stability: -25, morale: -15 },
          grants: ['naval_trade'],
          permanentText: '⚓ Capital costera establecida.' },
        { label: 'Montaña — fortaleza',
          effects: { stability: +30, gold_rate: -20, army_strength: +20 },
          grants: ['mountain_fortress'],
          permanentText: '🏔️ Capital amurallada.' }
      ]
    }
  },

  // Verifica si una elección ya fue tomada
  isTaken(state, choiceId) {
    return !!(state._permanentDecisions && state._permanentDecisions[choiceId]);
  },

  // Aplica una elección permanente
  apply(state, choiceId, optionIdx) {
    const ch = this.CHOICES[choiceId];
    if (!ch) return { ok: false, msg: 'Elección no encontrada' };
    if (this.isTaken(state, choiceId)) return { ok: false, msg: 'Ya decidiste esto. Es irreversible.' };
    if (ch.cost && state.resources.gold < ch.cost) return { ok: false, msg: 'Necesitas ' + ch.cost + ' oro' };

    const opt = ch.options[optionIdx];
    if (!opt) return { ok: false, msg: 'Opción inválida' };
    if (ch.cost) state.resources.gold -= ch.cost;

    // Aplicar efectos base
    const fx = opt.effects;
    if (fx.morale)          state.morale = Math.max(0, Math.min(100, state.morale + fx.morale));
    if (fx.stability)       state.stability = Math.max(0, Math.min(100, state.stability + fx.stability));
    if (fx.army)            state.army = Math.max(0, state.army + fx.army);
    if (fx.gold_rate)       state._goldRateBonus = (state._goldRateBonus || 0) + fx.gold_rate;
    if (fx.army_strength)   state._armyStrengthBonus = (state._armyStrengthBonus || 0) + fx.army_strength;
    if (fx.faction_nobleza != null) {
      const f = (state.factions||[]).find(f=>f.id==='nobleza');
      if (f) f.satisfaction = Math.max(0, Math.min(100, f.satisfaction + fx.faction_nobleza));
    }

    // Bloqueos y grants
    state._locked  = state._locked  || {};
    state._granted = state._granted || {};
    (opt.blocks || []).forEach(b => state._locked[b]  = true);
    (opt.grants || []).forEach(g => state._granted[g] = true);

    // Registrar permanente
    state._permanentDecisions = state._permanentDecisions || {};
    state._permanentDecisions[choiceId] = {
      optionIdx, label: opt.label,
      text: opt.permanentText,
      turn: state.turn
    };

    Systems.Log.add(state, '⛔ DECISIÓN IRREV: ' + opt.permanentText, 'warn');
    return { ok: true, grants: opt.grants, blocks: opt.blocks };
  },

  // Aplicar bonus de grants en cada turno
  applyGrantBonuses(state) {
    const g = state._granted || {};
    if (g.scholar_income)  state.resources.gold  = (state.resources.gold  || 0) + 10;
    if (g.naval_trade)     state.resources.gold  = (state.resources.gold  || 0) + 35;
    if (g.mountain_fortress) state._armyStrengthBonus = Math.max(state._armyStrengthBonus || 0, 20);
    if (g.fear_bonus)      state._fearBonus      = 10;  // -10% resistencia IA en batalla
    if (g.populist_support) {
      const p = (state.factions||[]).find(f=>f.id==='pueblo');
      if (p) p.satisfaction = Math.min(100, p.satisfaction + 1);
    }
  }
};

// ══════════════════════════════════════════════════════════
// 4. OBJETIVOS OCULTOS — HiddenObjectives
//    Cada civilización tiene metas secretas
//    Revelarlas al completarlas da bonus sorpresa
// ══════════════════════════════════════════════════════════
var HiddenObjectives = {

  // Objetivos por civilización
  OBJECTIVES: {
    roman: [
      { id: 'rom_1', label: '⚔ Legado de Roma',    desc: 'Mantén estabilidad > 70 durante 5 turnos',
        condition: s => s.stability > 70, turns_required: 5, _progress: 0,
        reward: { stability: +15, faction_senado: +25, permBonus: 'roman_law' }, revealed: false },
      { id: 'rom_2', label: '🏛 Pax Romana',       desc: 'Ten 2 rutas comerciales activas',
        condition: s => (s.activeTradeRoutes||[]).length >= 2, turns_required: 1,
        reward: { gold_rate: +30, morale: +10 }, revealed: false }
    ],
    aztec: [
      { id: 'azt_1', label: '☀ Sol Insaciable',    desc: 'Gana 3 guerras',
        condition: s => (s._warsWon || 0) >= 3, turns_required: 1,
        reward: { army_strength: +25, morale: +20 }, revealed: false },
      { id: 'azt_2', label: '🌽 Abundancia',       desc: 'Supera 10000 de alimentos',
        condition: s => s.resources.food > 10000, turns_required: 1,
        reward: { population: +3000, stability: +10 }, revealed: false }
    ],
    norse: [
      { id: 'nor_1', label: '🐺 Ragnarök',         desc: 'Llega a 1000 soldados',
        condition: s => s.army >= 1000, turns_required: 1,
        reward: { morale: +30, army_strength: +15 }, revealed: false },
      { id: 'nor_2', label: '⚡ Tormenta del Norte', desc: 'Declara guerra antes del turno 5',
        condition: s => (s.diplomacy||[]).some(n=>n.atWar) && s.turn <= 5, turns_required: 1,
        reward: { gold: +400, faction_ejercito: +30 }, revealed: false }
    ],
    chinese: [
      { id: 'chi_1', label: '📜 Mandato del Cielo', desc: 'Reduce corrupción a < 15',
        condition: s => s.economy.corruption < 15, turns_required: 3,
        reward: { stability: +20, corruption: -10, permBonus: 'mandate' }, revealed: false },
      { id: 'chi_2', label: '🐉 Hegemonía',         desc: 'Ten relación > 50 con 2 naciones',
        condition: s => (s.diplomacy||[]).filter(n=>n.relation>50).length >= 2, turns_required: 1,
        reward: { gold_rate: +25, morale: +15 }, revealed: false }
    ],
    arabic: [
      { id: 'ara_1', label: '🌙 Media Luna',        desc: 'Ten 2 alianzas activas',
        condition: s => (s.diplomacy||[]).filter(n=>n.allied).length >= 2, turns_required: 1,
        reward: { stability: +15, gold_rate: +20 }, revealed: false },
      { id: 'ara_2', label: '🏺 Prosperidad del Desierto', desc: 'Acumula 3000 oro',
        condition: s => s.resources.gold >= 3000, turns_required: 1,
        reward: { gold: +500, morale: +10 }, revealed: false }
    ],
    ottoman: [
      { id: 'ott_1', label: '🌟 Sublime Puerta',   desc: 'Controla 6 regiones en Althoria',
        condition: s => (s.althoriaRegions || 0) >= 6, turns_required: 1,
        reward: { stability: +20, army_strength: +10 }, revealed: false },
      { id: 'ott_2', label: '⚔ Sultán Guerrero',   desc: 'Derrota al mismo enemigo dos veces',
        condition: s => Object.values(s._winsAgainst||{}).some(v=>v>=2), turns_required: 1,
        reward: { morale: +25, army_strength: +20 }, revealed: false }
    ]
  },

  // Inicializar objetivos para la civilización actual
  init(state) {
    const civId = state.civId || 'roman';
    state._hiddenObjectives = (this.OBJECTIVES[civId] || this.OBJECTIVES.roman).map(o =>
      Object.assign({}, o, { _progress: 0, revealed: false, completed: false })
    );
  },

  // Chequear progreso cada turno
  checkProgress(state) {
    if (!state._hiddenObjectives) return;
    state._hiddenObjectives.forEach(obj => {
      if (obj.completed) return;
      if (obj.condition(state)) {
        obj._progress = (obj._progress || 0) + 1;
        if (obj._progress >= obj.turns_required) {
          this._complete(state, obj);
        }
      } else {
        if (obj.turns_required > 1) obj._progress = 0; // reset streak
      }
    });
  },

  _complete(state, obj) {
    obj.completed = true;
    obj.revealed = true;
    const r = obj.reward;

    // Aplicar recompensa
    if (r.stability)     state.stability     = Math.min(100, state.stability     + r.stability);
    if (r.morale)        state.morale        = Math.min(100, state.morale        + r.morale);
    if (r.gold)          state.resources.gold += r.gold;
    if (r.gold_rate)     state._goldRateBonus = (state._goldRateBonus || 0) + r.gold_rate;
    if (r.army_strength) state._armyStrengthBonus = (state._armyStrengthBonus || 0) + r.army_strength;
    if (r.population)    state.population    = (state.population || 5000) + r.population;
    if (r.permBonus)     { state._granted = state._granted || {}; state._granted[r.permBonus] = true; }

    Systems.Log.add(state, '🏆 OBJETIVO SECRETO: ' + obj.label + ' completado!', 'good');
    state._newUnlocks = state._newUnlocks || [];
    state._newUnlocks.push({ id: obj.id, icon: '🏆', name: obj.label, desc: obj.desc });
  },

  getAll(state) { return state._hiddenObjectives || []; },
  getCompleted(state) { return (state._hiddenObjectives || []).filter(o => o.completed); },
  getPending(state)   { return (state._hiddenObjectives || []).filter(o => !o.completed); }
};

// ══════════════════════════════════════════════════════════
// 5. GUERRA REALISTA — RealisticWarModifiers
//    Moral cae con duración; coste de tropas escala
// ══════════════════════════════════════════════════════════
var RealisticWarModifiers = {

  // Llamado por WarSystem.processTurn — añade capas de realismo
  applyTurnModifiers(state, nation) {
    const w = nation._war;
    if (!w) return;

    const dur = w.turn; // turnos de guerra

    // ── Moral degrada con la duración ────────────────────────
    //    T1-2: sin penalti | T3-5: -3/t | T6+: -6/t | T10+: -10/t
    let moraleDrain = 0;
    if (dur >= 10) moraleDrain = 10;
    else if (dur >= 6) moraleDrain = 6;
    else if (dur >= 3) moraleDrain = 3;

    if (moraleDrain > 0) {
      state.morale = Math.max(0, state.morale - moraleDrain);
    }

    // ── Mantenimiento escala con duración ────────────────────
    //    Base ya pagada por WarSystem; aquí añadimos escalado adicional
    const extraUpkeep = Math.floor(dur * dur * 3); // cuadrático: 0, 3, 12, 27, 48...
    if (extraUpkeep > 0) {
      state.resources.gold = Math.max(0, state.resources.gold - extraUpkeep);
    }

    // ── Deserción en guerras largas ───────────────────────────
    if (dur >= 5 && state.morale < 40) {
      const deserters = Math.floor(state.army * 0.03);
      state.army = Math.max(0, state.army - deserters);
      if (deserters > 0 && dur % 2 === 0) {
        Systems.Log.add(state, '💨 ' + deserters + ' soldados desertan. Moral demasiado baja.', 'warn');
      }
    }

    // ── Facciones se tensionan ────────────────────────────────
    if (dur >= 4) {
      const ejercito = (state.factions || []).find(f => f.id === 'ejercito');
      const pueblo   = (state.factions || []).find(f => f.id === 'pueblo');
      if (ejercito) ejercito.satisfaction = Math.min(100, ejercito.satisfaction + 2); // ejército quiere guerra
      if (pueblo)   pueblo.satisfaction   = Math.max(0, pueblo.satisfaction - 3);    // pueblo cansado
    }

    // ── Corrupción en guerras largas ─────────────────────────
    if (dur >= 7) {
      state.economy.corruption = Math.min(100, (state.economy.corruption || 0) + 2);
    }

    // ── Log narrativo de degradación ────────────────────────
    if (dur === 3) Systems.Log.add(state, '⏳ La guerra se alarga. La moral del pueblo comienza a flaquear.', 'warn');
    if (dur === 6) Systems.Log.add(state, '☠ La guerra consume todo. Los costes se disparan.', 'crisis');
    if (dur === 10) Systems.Log.add(state, '💀 Guerra de desgaste total. Tu nación está al límite.', 'crisis');
  },

  // Modificador de fuerza por moral de guerra
  getStrengthMod(state) {
    const morale = state.morale || 50;
    if (morale >= 80) return 1.15;
    if (morale >= 60) return 1.0;
    if (morale >= 40) return 0.85;
    if (morale >= 20) return 0.65;
    return 0.45;
  }
};

// ══════════════════════════════════════════════════════════
// 6. SISTEMA DE CIUDADES — CitySystem
//    Cada nación tiene 1-3 ciudades; cada ciudad produce
//    recursos y puede ser tomada en guerra
// ══════════════════════════════════════════════════════════
var CitySystem = {

  // Plantillas de ciudades por civilización
  CITY_TEMPLATES: {
    roman:   [
      { id: 'roma',      name: 'Roma',         icon: '🏛',  production: { gold: 40, iron: 15 }, defense: 400, population: 8000 },
      { id: 'cartago',   name: 'Cartago',       icon: '⚓',  production: { gold: 25, food: 30 }, defense: 200, population: 4000 },
      { id: 'antioquia', name: 'Antioquía',     icon: '🌿',  production: { food: 40, wood: 20 }, defense: 150, population: 3000 }
    ],
    aztec:   [
      { id: 'tenochtitlan', name: 'Tenochtitlán', icon: '☀', production: { gold: 30, food: 50 }, defense: 350, population: 10000 },
      { id: 'texcoco',      name: 'Texcoco',       icon: '🌊', production: { food: 35, stone: 20 }, defense: 180, population: 4500 }
    ],
    norse:   [
      { id: 'nidaros',  name: 'Nidaros',        icon: '🐺',  production: { gold: 20, iron: 30 }, defense: 250, population: 3000 },
      { id: 'hedeby',   name: 'Hedeby',          icon: '⚔',  production: { iron: 40, wood: 25 }, defense: 200, population: 2500 }
    ],
    chinese: [
      { id: 'changan',  name: "Chang'an",        icon: '🐉',  production: { gold: 50, food: 30 }, defense: 500, population: 12000 },
      { id: 'luoyang',  name: 'Luoyang',          icon: '📜',  production: { gold: 30, food: 20 }, defense: 300, population: 7000 },
      { id: 'guangzhou',name: 'Guangzhou',        icon: '⚓',  production: { gold: 40, food: 15 }, defense: 200, population: 5000 }
    ],
    arabic:  [
      { id: 'bagdad',   name: 'Bagdad',           icon: '🌙',  production: { gold: 45, food: 20 }, defense: 400, population: 9000 },
      { id: 'basra',    name: 'Basra',             icon: '🐪',  production: { gold: 30, iron: 10 }, defense: 200, population: 4000 }
    ],
    ottoman: [
      { id: 'constantinopla', name: 'Constantinopla', icon: '🌟', production: { gold: 60, food: 20 }, defense: 600, population: 15000 },
      { id: 'edirne',         name: 'Edirne',          icon: '⚔',  production: { iron: 30, gold: 15 }, defense: 300, population: 5000 }
    ]
  },

  // Inicializar ciudades del jugador
  init(state) {
    const civId = state.civId || 'roman';
    const templates = this.CITY_TEMPLATES[civId] || this.CITY_TEMPLATES.roman;
    state._cities = templates.map(t => Object.assign({}, t, {
      owner: 'player',
      loyalty: 80,    // 0-100; si cae < 20 puede amotinarse
      sieged: false,
      conqueredBy: null
    }));
    // Capital es la primera ciudad
    state._capitalCity = state._cities[0] ? state._cities[0].id : null;
  },

  // Procesar producción de ciudades cada turno
  processTurn(state) {
    if (!state._cities) return;
    let extraGold = 0, extraFood = 0, extraIron = 0, extraWood = 0;

    state._cities.forEach(city => {
      if (city.owner !== 'player' || city.sieged) return;

      const mult = city.loyalty / 100; // lealtad reduce producción si baja
      if (city.production.gold)  extraGold  += Math.floor((city.production.gold || 0)  * mult);
      if (city.production.food)  extraFood  += Math.floor((city.production.food || 0)  * mult);
      if (city.production.iron)  extraIron  += Math.floor((city.production.iron || 0)  * mult);
      if (city.production.wood)  extraWood  += Math.floor((city.production.wood || 0)  * mult);

      // Lealtad decae muy lento si moral es baja
      if (state.morale < 40) city.loyalty = Math.max(0, city.loyalty - 1);
      if (state.stability > 70) city.loyalty = Math.min(100, city.loyalty + 1);
    });

    state.resources.gold  = (state.resources.gold  || 0) + extraGold;
    state.resources.food  = (state.resources.food  || 0) + extraFood;
    state.resources.iron  = (state.resources.iron  || 0) + extraIron;
    state.resources.wood  = (state.resources.wood  || 0) + extraWood;
  },

  // Cuando el jugador toma una región que tiene ciudad
  captureCity(state, cityId, previousOwner) {
    if (!state._cities) return;
    const city = state._cities.find(c => c.id === cityId);
    if (city) {
      city.owner = 'player';
      city.loyalty = 30; // baja al ser conquistada
      city.conqueredBy = null;
      Systems.Log.add(state, '🏙 CIUDAD CONQUISTADA: ' + city.name + ' (' + city.icon + '). Lealtad inicial: 30', 'good');
    } else {
      // Ciudad de nación AI capturada — añadir al player
      state._cities.push({
        id: cityId, name: cityId, icon: '🏰',
        production: { gold: 20 }, defense: 150,
        owner: 'player', loyalty: 25, sieged: false
      });
    }
  },

  // Asediar una ciudad en guerra
  siegeCity(state, nationId, cityId) {
    if (!state._cities) return false;
    const city = state._cities.find(c => c.id === cityId);
    if (!city) return false;
    city.sieged = true;
    // Durante el asedio no produce y la lealtad cae
    city.loyalty = Math.max(0, city.loyalty - 15);
    return true;
  },

  getCities(state) { return state._cities || []; },
  getPlayerCities(state) { return (state._cities || []).filter(c => c.owner === 'player'); },
  getTotalDefense(state) { return (state._cities || []).filter(c=>c.owner==='player').reduce((s,c)=>s+(c.defense||0), 0); }
};

// ══════════════════════════════════════════════════════════
// 7. COSTE MORAL — MoralCostSystem
//    Decisiones afectan reputación permanente
//    (usado en diplomacia y en eventos)
// ══════════════════════════════════════════════════════════
var MoralCostSystem = {

  // Actos con coste moral permanente en reputación
  MORAL_ACTS: {
    genocide:     { label: 'Genocidio',       rep: -40, morale: +10, stability: -20 },
    burn_library: { label: 'Quemar biblioteca', rep: -20, morale:  +5, stability:  -5 },
    betray_ally:  { label: 'Traicionar aliado', rep: -30, morale:  -5, stability: -10 },
    mercy:        { label: 'Clemencia',          rep: +20, morale:  +5, stability:  +5 },
    aid_plague:   { label: 'Ayudar en epidemia', rep: +15, morale: +10 },
    tax_poor:     { label: 'Gravar al pueblo',   rep: -15, morale: -10, faction_pueblo: -20 },
    free_slaves:  { label: 'Liberar esclavos',   rep: +25, morale: +15, faction_pueblo: +30, gold_rate: -10 }
  },

  // Aplicar coste/beneficio moral
  applyAct(state, actId) {
    const act = this.MORAL_ACTS[actId];
    if (!act) return;

    state._reputation = (state._reputation || 50) + (act.rep || 0);
    state._reputation = Math.max(-100, Math.min(100, state._reputation));
    if (act.morale)    state.morale    = Math.max(0, Math.min(100, state.morale    + act.morale));
    if (act.stability) state.stability = Math.max(0, Math.min(100, state.stability + act.stability));
    if (act.gold_rate) state._goldRateBonus = (state._goldRateBonus || 0) + act.gold_rate;

    // Facción
    if (act.faction_pueblo) {
      const p = (state.factions||[]).find(f=>f.id==='pueblo');
      if (p) p.satisfaction = Math.max(0, Math.min(100, p.satisfaction + act.faction_pueblo));
    }

    // Log + historial
    state._moralHistory = state._moralHistory || [];
    state._moralHistory.push({ turn: state.turn, act: actId, label: act.label, rep: act.rep });

    const sign = (act.rep || 0) >= 0 ? '+' : '';
    Systems.Log.add(state, '⚖ REPUTACIÓN: ' + act.label + ' ' + sign + act.rep + ' (total: ' + state._reputation + ')', 'warn');
  },

  // La reputación afecta la diplomacia: naciones evitan o buscan al infame
  getDiploModifier(state) {
    const rep = state._reputation || 50;
    if (rep >= 70) return +20;  // todos quieren alianza
    if (rep >= 40) return 0;
    if (rep >= 10) return -10;
    if (rep >= -20) return -25;
    return -50;                  // nadie quiere nada con un tirano
  },

  getReputationLabel(state) {
    const rep = state._reputation || 50;
    if (rep >= 80) return '👑 Santo';
    if (rep >= 60) return '🏆 Honorable';
    if (rep >= 30) return '🤝 Neutral';
    if (rep >= 0)  return '🌑 Cuestionable';
    if (rep >= -40) return '😈 Infame';
    return '💀 Monstruo';
  }
};

// ══════════════════════════════════════════════════════════
// 8. LÍDERES CON PERSONALIDAD — LeaderSystem
//    Rasgos que afectan eventos, diplomacia y decisiones
// ══════════════════════════════════════════════════════════
var LeaderSystem = {

  // Definición de rasgos posibles
  TRAITS: {
    agresivo:    { id:'agresivo',   icon:'⚔',  label:'Agresivo',   warBonus:+20,  diplomacyPenalty:-15, eventBias:'military' },
    traidor:     { id:'traidor',    icon:'🗡',  label:'Traidor',    betrayalChance:0.25, trustLoss:-20 },
    codicioso:   { id:'codicioso',  icon:'💰',  label:'Codicioso',  goldBonus:+15, moraleHit:-5 },
    visionario:  { id:'visionario', icon:'🌟',  label:'Visionario', stabilityBonus:+10, researchBonus:true },
    tactico:     { id:'tactico',    icon:'🧠',  label:'Táctico',   battleBonus:+15, surpriseBonus:true },
    diplomatico: { id:'diplomatico',icon:'🤝',  label:'Diplomático',relationBonus:+20, warPenalty:-10 },
    paranoico:   { id:'paranoico',  icon:'👁',  label:'Paranoico',  spyBonus:+20, trustPenalty:-15 },
    piadoso:     { id:'piadoso',    icon:'✝',   label:'Piadoso',    factionIglesiaBonus:+25, secularPenalty:-10 }
  },

  // Asociar rasgos a los personajes diplomáticos existentes
  getTraitForCharacter(charName) {
    const map = {
      'Vorkan el Implacable':   'agresivo',
      'Darius el Conquistador': 'tactico',
      'Lady Seraphina':         'diplomatico',
      'Marcus Bellator':        'tactico',
      'Xotl el Astuto':         'traidor',
      'Keira Dos Mundos':       'visionario',
      'Al-Rashid Ibn Yusuf':    'paranoico',
      'Sultán Mehmed el Pío':   'piadoso',
      'Gilda Tesoro':           'codicioso',
      'Roderic el Banquero':    'codicioso',
      'Ragnar Colmillo Roto':   'agresivo',
      'Sigrid la Furiosa':      'agresivo',
      'Zhang Wei el Eterno':    'visionario',
      'Li Bao Celestial':       'diplomatico'
    };
    return this.TRAITS[map[charName]] || this.TRAITS.diplomatico;
  },

  // Aplicar efecto de rasgo en una negociación diplomática
  applyTraitToNegotiation(state, nation, offer) {
    const char = nation.character;
    if (!char) return offer;
    const trait = this.getTraitForCharacter(char.name);

    // Traidor: puede aceptar y luego romper acuerdo
    if (trait.id === 'traidor' && Math.random() < trait.betrayalChance) {
      offer._willBetray = true;
      offer._betray_turn = state.turn + Math.floor(Math.random() * 3) + 2;
    }
    // Agresivo: descuento en demandas de guerra, premium en paz
    if (trait.id === 'agresivo') offer.warDemandMod = 1.2;
    // Codicioso: siempre pide 20% más de oro
    if (trait.id === 'codicioso') offer.goldMod = 1.2;
    // Diplomático: más disposición a alianzas
    if (trait.id === 'diplomatico') offer.allianceBonus = +20;

    return offer;
  },

  // Evento aleatorio disparado por rasgo del líder activo
  generateTraitEvent(state) {
    const nations = state.diplomacy || [];
    if (!nations.length) return null;
    const nation = nations[Math.floor(Math.random() * nations.length)];
    if (!nation.character) return null;
    const trait = this.getTraitForCharacter(nation.character.name);
    if (!trait) return null;

    // Solo líderes agresivos o traidores generan eventos espontáneos
    if (trait.id === 'agresivo' && nation.relation < 20 && Math.random() < 0.15) {
      Systems.Log.add(state, '⚔ ' + nation.character.name + ' (' + trait.label + ') moviliza tropas en tu frontera.', 'warn');
      nation.relation = Math.max(-100, (nation.relation || 0) - 10);
      return { type: 'threat', nation };
    }
    if (trait.id === 'traidor' && nation._offers) {
      const betrayOffer = Object.values(nation._offers || {}).find(o => o._willBetray && state.turn >= o._betray_turn);
      if (betrayOffer) {
        nation.allied = false; nation.relation = Math.min(-30, (nation.relation || 0) - 40);
        Systems.Log.add(state, '🗡 ' + nation.character.name + ' TRAICIONA el acuerdo! Alianza rota.', 'crisis');
        MoralCostSystem.applyAct(state, 'betray_ally'); // player también sufre si es tachado de traidor
        return { type: 'betrayal', nation };
      }
    }
    return null;
  }
};

// ══════════════════════════════════════════════════════════
// 9. DIPLOMACIA CON MEMORIA — DiplomacyMemory
//    El historial de acciones afecta relaciones futuras
// ══════════════════════════════════════════════════════════
var DiplomacyMemory = {

  // Registrar acción diplomática
  record(state, nationId, action, value) {
    state._diploMemory = state._diploMemory || {};
    state._diploMemory[nationId] = state._diploMemory[nationId] || [];
    state._diploMemory[nationId].push({
      turn:   state.turn,
      action, // 'war_declared', 'peace_broken', 'gift', 'trade', 'alliance', 'betrayal', 'aid'
      value,  // positivo o negativo
      weight: this._getWeight(action)
    });
  },

  _getWeight(action) {
    const weights = {
      war_declared:   -60, peace_broken:  -80, betrayal:     -90,
      gift:           +15, trade:         +10, alliance:     +40,
      aid_disaster:   +35, military_help: +50, tribute_paid: -20
    };
    return weights[action] || 0;
  },

  // Calcular modificador acumulado de relación basado en historial
  getMemoryModifier(state, nationId) {
    const history = (state._diploMemory && state._diploMemory[nationId]) || [];
    if (!history.length) return 0;

    // Los eventos recientes pesan más (decay por antigüedad)
    let total = 0;
    const currentTurn = state.turn;
    history.forEach(ev => {
      const age = currentTurn - ev.turn;
      const decay = Math.max(0.1, 1 - age * 0.08); // -8% por turno
      total += ev.weight * decay;
    });
    return Math.max(-50, Math.min(50, Math.round(total)));
  },

  // Aplicar memoria en cálculo de relación (llamar en endTurn)
  applyMemoryToRelations(state) {
    (state.diplomacy || []).forEach(nation => {
      const mod = this.getMemoryModifier(state, nation.id);
      if (mod !== 0) {
        // Solo empuja la relación hacia el valor de memoria, no la fija
        const delta = mod > 0 ? Math.min(0.5, mod * 0.05) : Math.max(-0.5, mod * 0.05);
        nation.relation = Math.max(-100, Math.min(100, (nation.relation || 0) + delta));
      }
    });
  },

  // Generar texto de historial para UI
  getHistoryText(state, nationId) {
    const history = (state._diploMemory && state._diploMemory[nationId]) || [];
    const labels = {
      war_declared: '⚔ Declaraste guerra', peace_broken: '💔 Rompiste la paz',
      betrayal: '🗡 Traicionaste', gift: '🎁 Regalo enviado',
      trade: '🤝 Acuerdo comercial', alliance: '🛡 Alianza',
      aid_disaster: '🌾 Ayuda en crisis', military_help: '⚔ Apoyo militar',
      tribute_paid: '💰 Tributo pagado'
    };
    return history.slice(-4).map(ev =>
      'T' + ev.turn + ' ' + (labels[ev.action] || ev.action) + (ev.value ? ' (' + (ev.value > 0 ? '+' : '') + ev.value + ')' : '')
    );
  },

  // Modificador de inicio para naciones basado en su personalidad y nuestra reputación
  getStartingModifier(state, nation) {
    const rep = MoralCostSystem.getDiploModifier(state);
    const pers = nation.personality;
    if (pers === 'agresiva'    && (state._reputation || 50) < 0) return rep - 10; // se aprovechan
    if (pers === 'diplomática' && (state._reputation || 50) > 40) return rep + 15;
    return rep;
  }
};

// ══════════════════════════════════════════════════════════
// INTEGRACIÓN: hook en endTurn y sistemas existentes
// ══════════════════════════════════════════════════════════
var DeepSystemsIntegration = {

  // Llamar al final de cada turno (desde game.js endTurn)
  onEndTurn(state) {
    PermanentChoices.applyGrantBonuses(state);
    HiddenObjectives.checkProgress(state);
    CitySystem.processTurn(state);
    DiplomacyMemory.applyMemoryToRelations(state);

    // Rasgos de líderes generan eventos espontáneos
    LeaderSystem.generateTraitEvent(state);

    // Aplicar bonus de reputación a relaciones diplomáticas
    const repMod = MoralCostSystem.getDiploModifier(state);
    if (repMod !== 0) {
      (state.diplomacy || []).forEach(n => {
        n.relation = Math.max(-100, Math.min(100, (n.relation || 0) + repMod * 0.03));
      });
    }
  },

  // Llamar al iniciar partida (desde game.js initState, después de crear state)
  onInit(state) {
    HiddenObjectives.init(state);
    CitySystem.init(state);
    state._reputation  = 50;     // reputación inicial: neutral
    state._moralHistory = [];
    state._diploMemory  = {};
    state._secrets      = {};
    state._locked       = {};
    state._granted      = {};
    state._permanentDecisions = {};
    state._warsWon      = 0;
    state._winsAgainst  = {};
    state._goldRateBonus = 0;
    state._armyStrengthBonus = 0;
  }
};
