// ============================================================
// IMPERIUM — ARCS.JS
// Story Arcs: narrativas de varios eventos encadenados
// Cada arco tiene fases; completar una fase desbloquea la siguiente
// ============================================================

// ── POOL DE ARCOS NARRATIVOS ─────────────────────────────
var STORY_ARCS = [

  // ── ARC 1: LA CONSPIRACIÓN INTERIOR ──────────────────────
  {
    id:          'conspiracy',
    name:        'La Conspiración de las Sombras',
    icon:        '🗡️',
    description: 'Alguien en tu corte teje una red de traición. Ignóralo y perderás el trono. Actúa y podrías destruir a un aliado.',
    startCondition: (s) => s.stability < 60 && s.turn > 6,
    weight:      8,
    phases: [
      {
        id: 'c_rumor',
        title: 'Rumores en la Corte',
        icon: '👂',
        description: 'Un sirviente de confianza te informa en secreto: ciertos nobles se reúnen de noche. Sus planes son desconocidos, pero el tono es sedicioso.',
        context: 'Estabilidad baja · El descontento crece · Alguien aprovecha el momento',
        options: [
          { label: 'Infiltrar un espía',  effects: { stability: -3 }, effectText: ['-3 estabilidad (gasto)', 'Información en siguiente fase'], chainNext: true, chainData: { intel: 'deep' } },
          { label: 'Arrestar sospechosos', effects: { stability: -8, morale: -5 }, effectText: ['-8 estab', '-5 moral', 'Riesgo de injusticia'], chainNext: true, chainData: { intel: 'arrest' } },
          { label: 'Ignorar los rumores', effects: { corruption: +8 }, effectText: ['+8 corrupción', 'La conspiración crece'], chainNext: true, chainData: { intel: 'ignored' } }
        ]
      },
      {
        id: 'c_discovery',
        title: 'La Red se Desvela',
        icon: '🔍',
        description: 'Los conspiradores son identificados. El cabecilla es tu propio Senescal — llevas años confiando en él. La traición viene de dentro.',
        context: 'Evidencias sólidas · El Senescal tiene apoyos · Actuar mal puede dividir la corte',
        options: [
          { label: 'Juicio público',       effects: { stability: +10, morale: +5, corruption: -10 }, effectText: ['+10 estab', '+5 moral', 'Ejemplo de justicia'], chainNext: false },
          { label: 'Exilio silencioso',    effects: { stability: +5, gold: -200 }, effectText: ['+5 estab', '-200💰 (soborno)', 'Conflicto evitado'], chainNext: false },
          { label: 'Ejecución privada',    effects: { stability: +8, morale: -10, corruption: +5 }, effectText: ['+8 estab', '-10 moral', 'El pueblo desconfía'], chainNext: false }
        ]
      }
    ]
  },

  // ── ARC 2: LA SEQUÍA ─────────────────────────────────────
  {
    id:          'great_drought',
    name:        'La Gran Sequía',
    icon:        '☀️',
    description: 'Tres años sin lluvias normales. Los ríos bajan. Las cosechas mueren. El pueblo mira al cielo y luego a ti.',
    startCondition: (s) => s.climate.season === 'summer' && s.turn > 10 && s.resources.food < 300,
    weight:      6,
    phases: [
      {
        id: 'd_signs',
        title: 'Señales del Cielo',
        icon: '🌡️',
        description: 'Los augures lo predicen: la sequía será larga. Los agricultores empiezan a migrar hacia el norte. Los graneros se vacían. Tienes tiempo para actuar.',
        context: 'Alimentos escasos · Migración inminente · Ventana de preparación',
        options: [
          { label: 'Racionamiento estricto',  effects: { food: +200, morale: -15 },        effectText: ['+200 alimentos reservados', '-15 moral', 'Resentimiento'], chainNext: true, chainData: { prep: 'ration' } },
          { label: 'Comprar grano extranjero', effects: { gold: -300, food: +400 },          effectText: ['-300💰', '+400 alimentos', 'Dependencia exterior'], chainNext: true, chainData: { prep: 'buy' } },
          { label: 'Construir acueductos',     effects: { stone: -200, wood: -100, food_bonus_turns: 6 }, effectText: ['-200🏔️ -100🌲', '+15 alimentos/turno (6 turnos)', 'Inversión a largo plazo'], chainNext: true, chainData: { prep: 'build' } }
        ]
      },
      {
        id: 'd_crisis',
        title: 'El Año Sin Cosecha',
        icon: '💀',
        description: 'Ha llegado lo peor. El hambre golpea las ciudades. Los sacerdotes piden sacrificios. Una nación vecina ofrece ayuda... con condiciones.',
        context: 'Crisis alimentaria · Tensión social máxima · Oportunismo exterior',
        options: [
          { label: 'Aceptar la ayuda exterior',  effects: { food: +600, stability: -10 }, effectText: ['+600 alimentos', '-10 estab (deuda de honor)'], chainNext: false },
          { label: 'Distribuir reservas reales',  effects: { food: +300, morale: +20, gold: -200 }, effectText: ['+300 alimentos', '+20 moral', '-200💰 (reservas)'], chainNext: false },
          { label: 'Decretar migración forzosa',  effects: { population: -1500, morale: -25, food: +200 }, effectText: ['-1500 población', '-25 moral', 'Solución brutal'], chainNext: false }
        ]
      }
    ]
  },

  // ── ARC 3: EL PROFETA ────────────────────────────────────
  {
    id:          'prophet',
    name:        'El Profeta del Fin',
    icon:        '🔮',
    description: 'Un predicador itinerante reúne a miles. Su mensaje es ambiguo: puede ser el Salvador o el Destructor de tu reino.',
    startCondition: (s) => s.morale < 50 && s.turn > 15,
    weight:      5,
    phases: [
      {
        id: 'p_emergence',
        title: 'La Voz del Desierto',
        icon: '🗣️',
        description: 'En las plazas del mercado, un anciano de ojos llameantes proclama el fin de los tiempos. La gente lo escucha. Más gente llega cada día.',
        context: 'Moral baja · El pueblo busca esperanza · Las facciones religiosas se agitan',
        options: [
          { label: 'Ignorar — es un charlatán',  effects: { stability: -5 }, effectText: ['-5 estab (crece sin control)'], chainNext: true, chainData: { approach: 'ignore' } },
          { label: 'Cooptarlo — hacerlo aliado', effects: { gold: -150, morale: +15 }, effectText: ['-150💰', '+15 moral', 'Peligroso si fracasa'], chainNext: true, chainData: { approach: 'ally' } },
          { label: 'Exiliarlo — silenciarlo',     effects: { stability: +5, morale: -10 }, effectText: ['+5 estab', '-10 moral (perseguido)'], chainNext: true, chainData: { approach: 'exile' } }
        ]
      },
      {
        id: 'p_revelation',
        title: 'La Gran Revelación',
        icon: '⚡',
        description: 'El profeta anuncia su "revelación final". Según lo que hiciste antes, el resultado es radicalmente distinto. El destino de tu reino pende de un hilo.',
        context: 'El momento definitivo · Todo lo anterior tiene consecuencias',
        options: [
          { label: 'Darle una plataforma oficial', effects: { morale: +25, stability: -10 }, effectText: ['+25 moral', '-10 estab (fanatismo)'], chainNext: false },
          { label: 'Arrestarlo antes del discurso', effects: { stability: +10, morale: -20 }, effectText: ['+10 estab', '-20 moral (ira popular)'], chainNext: false },
          { label: 'Negociar en privado',           effects: { morale: +10, stability: +5, gold: -200 }, effectText: ['+10 moral', '+5 estab', '-200💰 (pacto secreto)'], chainNext: false }
        ]
      }
    ]
  },

  // ── ARC 4: LA GUERRA CIVIL LATENTE ───────────────────────
  {
    id:          'civil_war',
    name:        'El Fuego Bajo las Brasas',
    icon:        '🔥',
    description: 'Una provincia rechaza tu autoridad. Lo que empieza como una petición se convierte en rebelión. O en oportunidad.',
    startCondition: (s) => s.stability < 40 && s.territories > 3,
    weight:      9,
    phases: [
      {
        id: 'cw_petition',
        title: 'La Petición Inaceptable',
        icon: '📜',
        description: 'Un noble regional presenta una lista de agravios. Sus demandas son: reducción de impuestos, autonomía militar y un puesto en el Consejo. Tiene apoyo popular.',
        context: 'Facciones divididas · Impuestos altos · La frontera del reino en juego',
        options: [
          { label: 'Conceder todo',              effects: { stability: +15, morale: +10, corruption: +10 }, effectText: ['+15 estab', '+10 moral', '+10 corrupción (precedente)'], chainNext: false },
          { label: 'Negociar — conceder parte',   effects: { stability: +5, gold: -100 }, effectText: ['+5 estab', '-100💰 (compensación)'], chainNext: true, chainData: { result: 'partial' } },
          { label: 'Rechazar — movilizar ejército', effects: { stability: -15, morale: -10, army: +200 }, effectText: ['-15 estab', '-10 moral', '+200 ejército (leva forzosa)'], chainNext: true, chainData: { result: 'war' } }
        ]
      },
      {
        id: 'cw_conflict',
        title: 'La Provincia en Llamas',
        icon: '⚔️',
        description: 'La negociación fracasó. Las tropas rebeldes marchan. Pero hay algo inesperado: una nación vecina les está financiando.',
        context: 'Intervención exterior · Rebelión activa · Oportunidad de expansión',
        options: [
          { label: 'Aplastarlo con todo',         effects: { stability: +20, morale: -15, gold: -300 }, effectText: ['+20 estab', '-15 moral', '-300💰 (campaña)'], chainNext: false },
          { label: 'Descubrir al patrocinador',   effects: { stability: +10, intel_bonus: +30 }, effectText: ['+10 estab', '+30 inteligencia', 'Nuevo enemigo identificado'], chainNext: false },
          { label: 'Ofrecer autonomía total',     effects: { territories: -1, stability: +15, morale: +5 }, effectText: ['-1 territorio', '+15 estab', 'Paz costosa'], chainNext: false }
        ]
      }
    ]
  },

  // ── ARC 5: EL DESCUBRIMIENTO ─────────────────────────────
  {
    id:          'discovery',
    name:        'Las Minas del Oriente',
    icon:        '💎',
    description: 'Exploradores reportan una formación mineral nunca vista al este. La codicia podría ser tu mayor virtud... o tu ruina.',
    startCondition: (s) => s.turn > 8 && s.resources.iron < 200,
    weight:      7,
    phases: [
      {
        id: 'disc_rumor',
        title: 'El Informe del Explorador',
        icon: '🧭',
        description: 'Un explorador exhausto llega con muestras de un metal desconocido. Su valor es incalculable. Pero las minas están en tierra disputada.',
        context: 'Territorio neutral · Naciones rivales ya lo saben · Ventana estrecha',
        options: [
          { label: 'Expedición militar inmediata', effects: { iron: +400, gold: -200, stability: -5 }, effectText: ['+400 hierro', '-200💰', '-5 estab (provocación)'], chainNext: true, chainData: { method: 'military' } },
          { label: 'Negociar acceso compartido',   effects: { iron: +150, gold: +100 }, effectText: ['+150 hierro', '+100💰 (acuerdo)', 'Menos conflicto'], chainNext: true, chainData: { method: 'diplomacy' } },
          { label: 'Enviar mineros en secreto',    effects: { iron: +200 }, effectText: ['+200 hierro', 'Riesgo de descubrimiento'], chainNext: true, chainData: { method: 'secret' } }
        ]
      },
      {
        id: 'disc_confrontation',
        title: 'La Confrontación por las Minas',
        icon: '⚒️',
        description: 'Una nación rival llega a las mismas minas. La confrontación es inevitable. Lo que decides ahora define una generación.',
        context: 'Recurso en juego · Nación rival · Consecuencias permanentes',
        options: [
          { label: 'Luchar por el control total',   effects: { iron: +600, stability: -10, morale: -5 }, effectText: ['+600 hierro', '-10 estab', 'Conflicto abierto'], chainNext: false },
          { label: 'Acuerdo de explotación conjunta', effects: { iron: +300, gold: +200 }, effectText: ['+300 hierro', '+200💰', 'Relación +20 con rival'], chainNext: false },
          { label: 'Sabotear y retirarse',           effects: { iron: +100, stability: +5 }, effectText: ['+100 hierro (saqueo)', '+5 estab', 'Las minas quedan inutilizables'], chainNext: false }
        ]
      }
    ]
  }
];

// ── EVENTOS ENCADENADOS SIMPLES ─────────────────────────
// (Eventos individuales que se disparan tras decisiones específicas)
var CHAINED_EVENTS = {

  // Tras aceptar préstamo → si deuda > 400 después de 5 turnos
  'debt_crisis_followup': {
    id: 'debt_crisis_followup', category: 'ECONOMÍA', priority: 'critical',
    icon: '📉', title: 'Los Acreedores Llaman a la Puerta',
    description: 'Tus deudores exigen el pago. El plazo se agotó. Tienes riquezas pero no liquidez, o peor: no tienes ni eso.',
    context: 'Deuda alta · Intereses acumulados · Reputación crediticia en juego',
    condition: (s) => (s.economy.debt || 0) >= 400,
    triggerAfterTurns: 5,
    options: [
      { label: 'Pagar con reservas',    effects: { gold: -400, stability: +10 },         effectText: ['-400💰', '+10 estab'] },
      { label: 'Negociar prórroga',     effects: { debt: +100, corruption: +5 },          effectText: ['+100 más deuda', '+5 corrupción'] },
      { label: 'Repudio de la deuda',   effects: { stability: -20, morale: -10, debt: -500 }, effectText: ['-20 estab', '-10 moral', 'Deuda eliminada pero reputación destruida'] }
    ]
  },

  // Tras victoria en batalla → liderazgo legitimado
  'victory_aftermath': {
    id: 'victory_aftermath', category: 'MILITAR', priority: 'high',
    icon: '⚔️', title: 'El Eco de la Victoria',
    description: 'Tu ejército regresa victorioso. Los trovadores cantan hazañas. Pero la victoria tiene sus propios peligros: un general popular podría ser más peligroso que el enemigo.',
    context: 'Ejército exaltado · General popular · Momento de gloria efímero',
    condition: (s) => (s._lastBattleWon || false),
    triggerAfterTurns: 2,
    options: [
      { label: 'Celebrar públicamente',    effects: { morale: +20, stability: +5, gold: -150 }, effectText: ['+20 moral', '+5 estab', '-150💰 (festín)'] },
      { label: 'Premiar solo al general',  effects: { morale: +10, stability: -5 },              effectText: ['+10 moral', '-5 estab (celos)'] },
      { label: 'Disolver las tropas',      effects: { gold: +100, army: -300, morale: -10 },     effectText: ['+100💰 ahorro', '-300 ejército', '-10 moral'] }
    ]
  },

  // Tras tasa impositiva > 50% → revuelta fiscal
  'tax_revolt': {
    id: 'tax_revolt', category: 'POLÍTICO', priority: 'critical',
    icon: '🔥', title: 'Revuelta Fiscal',
    description: 'Los comerciantes cierran negocios. Los campesinos queman registros de impuestos. La recaudación excesiva ha cruzado el límite de la tolerancia.',
    context: 'Impuestos > 50% · Pueblo furioso · Facciones al límite',
    condition: (s) => (s.economy.taxRate || 20) > 50 && s.morale < 40,
    triggerAfterTurns: 3,
    options: [
      { label: 'Bajar impuestos urgente',  effects: { stability: +10 }, effectText: ['+10 estab', 'Requiere bajar taxRate'], specialAction: 'setTax15' },
      { label: 'Sofocar con el ejército',  effects: { morale: -20, stability: +5, army: -200 }, effectText: ['-20 moral', '+5 estab forzada', '-200 ejército (bajas)'] },
      { label: 'Amnistía fiscal (1 turno)', effects: { gold: -200, morale: +25, stability: +8 }, effectText: ['-200💰 (compensaciones)', '+25 moral', '+8 estab'] }
    ]
  },

  // Tras espía revelado → crisis diplomática
  'spy_caught': {
    id: 'spy_caught', category: 'DIPLOMACIA', priority: 'high',
    icon: '🕵️', title: 'El Espía Capturado',
    description: 'Tu agente fue descubierto. La nación objetivo exige explicaciones. El espía lleva documentos que lo vinculan directamente a tu corte.',
    context: 'Incidente diplomático · Relaciones deterioradas · Decisión de Estado',
    condition: (s) => (s.spies && s.spies.active && s.spies.active.some(m=>m.failed)),
    triggerAfterTurns: 1,
    options: [
      { label: 'Negarlo todo',             effects: { corruption: +10 },                     effectText: ['+10 corrupción', 'Relación -10 si no creído'] },
      { label: 'Disculparse formalmente',  effects: { gold: -100, stability: +3 },            effectText: ['-100💰 (regalo)', '+3 estab', 'Relación +5'] },
      { label: 'Ejecutar al espía',        effects: { morale: -10, stability: +5 },           effectText: ['-10 moral', '+5 estab', 'El incidente se cierra'] }
    ]
  }
};

// ── GESTOR DE ARCOS ──────────────────────────────────────
window.ArcManager = window.ArcManager || {

  // Inicializar sistema de arcos
  init(state) {
    if (!state.arcs)        state.arcs        = {};   // { arcId: { phase, chainData, active } }
    if (!state.activeArc)   state.activeArc   = null;
    if (!state.arcHistory)  state.arcHistory  = [];
    if (!state.chainQueue)  state.chainQueue  = [];   // eventos encadenados pendientes
  },

  // Generar posibles arcos y eventos encadenados para este turno
  generateForTurn(state) {
    this.init(state);
    const events = [];

    // 1. Continuar arco activo (siguiente fase)
    if (state.activeArc) {
      const arc = STORY_ARCS.find(a => a.id === state.activeArc.id);
      if (arc) {
        const nextPhaseIdx = state.activeArc.phaseIndex;
        const phase = arc.phases[nextPhaseIdx];
        if (phase) {
          events.push(this._phaseToEvent(arc, phase, nextPhaseIdx));
        } else {
          // Arco completado
          state.arcHistory.push({ id: arc.id, completedTurn: state.turn });
          state.activeArc = null;
        }
      }
    }

    // 2. Iniciar nuevo arco si no hay uno activo
    if (!state.activeArc && events.length === 0) {
      const eligible = STORY_ARCS.filter(arc => {
        if (state.arcHistory.find(h => h.id === arc.id)) return false; // ya completado
        if (state.arcs[arc.id] && state.arcs[arc.id].active) return false;
        try { return arc.startCondition(state); } catch(e) { return false; }
      });
      if (eligible.length > 0 && Math.random() < 0.35) {
        const weights = eligible.map(a => a.weight || 5);
        const totalW  = weights.reduce((s,w)=>s+w,0);
        let r = Math.random() * totalW;
        let chosen = eligible[eligible.length-1];
        for (let i=0; i<eligible.length; i++) {
          r -= weights[i];
          if (r <= 0) { chosen = eligible[i]; break; }
        }
        state.activeArc = { id: chosen.id, phaseIndex: 0, chainData: {} };
        events.push(this._phaseToEvent(chosen, chosen.phases[0], 0));
      }
    }

    // 3. Eventos encadenados en cola
    const now = state.chainQueue.filter(cq => state.turn >= cq.triggerTurn);
    now.forEach(cq => {
      const evDef = CHAINED_EVENTS[cq.eventId];
      if (evDef) {
        try {
          if (!evDef.condition || evDef.condition(state)) events.push(evDef);
        } catch(e) {}
      }
    });
    state.chainQueue = state.chainQueue.filter(cq => state.turn < cq.triggerTurn);

    // 4. Eventos encadenados por condición inmediata
    Object.values(CHAINED_EVENTS).forEach(ev => {
      if (state.resolvedEvents && state.resolvedEvents.includes(ev.id)) return;
      if (state.chainQueue.find(cq => cq.eventId === ev.id)) return;
      try {
        if (ev.condition && ev.condition(state)) events.push(ev);
      } catch(e) {}
    });

    return events;
  },

  // Convertir fase de arco en evento
  _phaseToEvent(arc, phase, phaseIdx) {
    return {
      id:          arc.id + '_' + phase.id,
      arcId:       arc.id,
      arcPhaseIdx: phaseIdx,
      isArcEvent:  true,
      arcName:     arc.name,
      category:    '🔱 ARCO NARRATIVO',
      priority:    'high',
      icon:        phase.icon || arc.icon,
      title:       phase.title,
      description: phase.description,
      context:     (phase.context || '') + '\n📖 Arco: ' + arc.name + ' · Fase ' + (phaseIdx+1) + '/' + arc.phases.length,
      condition:   () => true,
      weight:      20,
      options:     phase.options.map(opt => ({
        label:      opt.label,
        effects:    opt.effects || {},
        effectText: opt.effectText || [],
        _chainNext: opt.chainNext || false,
        _chainData: opt.chainData || {}
      }))
    };
  },

  // Procesar decisión de arco o evento encadenado
  onDecision(state, event, optionIdx) {
    const option = event.options[optionIdx];
    if (!option) return;

    // Si es evento de arco, avanzar la fase
    if (event.isArcEvent && state.activeArc && state.activeArc.id === event.arcId) {
      if (option._chainNext) {
        // Guardar datos del encadenamiento y pasar a siguiente fase
        Object.assign(state.activeArc.chainData, option._chainData || {});
        state.activeArc.phaseIndex++;
      } else {
        // El arco termina aquí
        state.arcHistory.push({ id: event.arcId, completedTurn: state.turn, result: option.label });
        state.activeArc = null;
      }
    }

    // Acción especial del evento
    if (option.effects && option.effects.food_bonus_turns) {
      state._foodBonusTurns = (state._foodBonusTurns||0) + option.effects.food_bonus_turns;
      state._foodBonusPerTurn = 15;
    }
    if (option.specialAction === 'setTax15' && typeof Game !== 'undefined') {
      Game.setTaxRate(15);
    }

    // Registrar batalla ganada para victory_aftermath
    if (event.id === 'victory_aftermath') state._lastBattleWon = false;
  },

  // Aplicar bonos de food_bonus_turns si activos
  applyTurnBonus(state) {
    if (state._foodBonusTurns > 0) {
      state.resources.food += (state._foodBonusPerTurn || 15);
      state._foodBonusTurns--;
      if (state._foodBonusTurns === 0) {
        Systems.Log.add(state, '⏱️ El bonus de irrigación ha terminado.', 'info');
      }
    }
  },

  // Obtener estado del arco activo para mostrar en UI
  getActiveArcStatus(state) {
    if (!state.activeArc) return null;
    const arc = STORY_ARCS.find(a => a.id === state.activeArc.id);
    if (!arc) return null;
    return {
      name:        arc.name,
      icon:        arc.icon,
      phase:       state.activeArc.phaseIndex,
      totalPhases: arc.phases.length,
      description: arc.description
    };
  }
};

// ════════════════════════════════════════════════════════════════
// EXPANSIÓN DE ARCS.JS — Nuevos sistemas añadidos:
// • FACTION_ARCS: misiones por facción (pueblo, ejército, nobleza)
// • CIV_ARCS: historia única para cada civilización
// • GLOBAL_ARC: arco narrativo de 4 actos para toda la partida
// • ArcSystem: motor de arcos que extiende ArcManager
// ════════════════════════════════════════════════════════════════

// ── ARCOS DE FACCIÓN ─────────────────────────────────────────
var FACTION_ARCS = {
  pueblo: {
    name:'El Grito del Pueblo', icon:'👥',
    missions: [
      {
        id:'fac_pueblo_1', turnMin:4,
        condition:(s)=>{ const f=s.factions.find(x=>x.id==='pueblo'); return f&&f.satisfaction<60&&s.turn>3; },
        event:{
          id:'fac_pueblo_1', title:'Petición del Pueblo', icon:'👥',
          category:'MISIÓN DE FACCIÓN', priority:'normal',
          description:'Una delegación de ciudadanos llega al palacio. Piden educación gratuita, reducción de impuestos y más festividades.',
          context:'El pueblo tiene paciencia finita. Los impuestos actuales son '+((typeof Game!=='undefined'&&Game.state)?Game.state.economy&&Game.state.economy.taxRate||20:20)+'%',
          options:[
            {label:'Conceder todo',         effects:{gold_rate:-30,morale:+20,faction_pueblo:+25},effectText:['-30💰/t','+20 moral'],chainId:'fac_pueblo_2_ok'},
            {label:'Conceder festividades', effects:{gold_rate:-15,morale:+10,faction_pueblo:+10},effectText:['-15💰/t','+10 moral'],chainId:'fac_pueblo_2_ok'},
            {label:'Ignorarlos',            effects:{morale:-10,faction_pueblo:-20},effectText:['-10 moral','Pueblo -20'],chainId:'fac_pueblo_crisis'}
          ]
        }
      },
      {
        id:'fac_pueblo_3', turnMin:16,
        condition:(s)=>s['arcChain_fac_pueblo_1'],
        event:{
          id:'fac_pueblo_3', title:'¿El Pueblo en el Poder?', icon:'🗳️',
          category:'MISIÓN DE FACCIÓN · CONCLUSIÓN', priority:'high',
          description:'El movimiento popular exige un consejo electo que comparta el poder contigo.',
          context:'La historia cambia aquí.',
          options:[
            {label:'Aceptar gobierno compartido', effects:{stability:+10,morale:+30,faction_pueblo:+40,faction_nobleza:-25},effectText:['+30 moral','Pueblo +40'], reward:{type:'bonus',morale:5,stability:5,description:'El Pueblo como Pilar: +5 moral y estab permanentes'}},
            {label:'Rechazar con represión',       effects:{stability:-20,morale:-30,faction_pueblo:-40},effectText:['-30 moral','Pueblo -40']}
          ]
        }
      }
    ]
  },
  ejercito: {
    name:'La Legión Exige', icon:'⚔️',
    missions:[
      {
        id:'fac_ejercito_1', turnMin:4,
        condition:(s)=>{ const f=s.factions.find(x=>x.id==='ejercito'); return f&&f.satisfaction<70&&s.turn>3; },
        event:{
          id:'fac_ejercito_1', title:'El General Exige', icon:'🗡️',
          category:'MISIÓN DE FACCIÓN', priority:'normal',
          description:'Tu general exige 500 oro en pagas atrasadas o amenaza con "medidas".',
          context:'Un ejército sin paga es un ejército sin lealtad.',
          options:[
            {label:'Pagar (500 oro)',        effects:{gold:-500,faction_ejercito:+25,army_strength:+10},effectText:['-500💰','Ejército +25'],chainId:'fac_ejercito_2_ok'},
            {label:'Pagar parcial (200 oro)',effects:{gold:-200,faction_ejercito:+5},effectText:['-200💰'],chainId:'fac_ejercito_2_ok'},
            {label:'Negarse',               effects:{faction_ejercito:-30,morale:-10},effectText:['Ejército -30','-10 moral'],chainId:'fac_ejercito_crisis'}
          ]
        }
      },
      {
        id:'fac_ejercito_3', turnMin:16,
        condition:(s)=>s['arcChain_fac_ejercito_1'],
        event:{
          id:'fac_ejercito_3', title:'El Título del Conquistador', icon:'🏆',
          category:'MISIÓN DE FACCIÓN · CONCLUSIÓN', priority:'high',
          description:'Tus generales exigen un triunfo: desfile, títulos, tierras.',
          context:'Los héroes se vuelven peligrosos si no se honran.',
          options:[
            {label:'Gran Triunfo',    effects:{morale:+20,faction_ejercito:+35,gold:-300},effectText:['+20 moral','Ejército +35'],reward:{type:'bonus',army_strength:15,description:'Ejército Veterano: +15% fuerza permanente'}},
            {label:'Honores modestos',effects:{morale:+8,faction_ejercito:+10},effectText:['+8 moral']}
          ]
        }
      }
    ]
  },
  nobleza: {
    name:'La Conspiración de los Grandes', icon:'👑',
    missions:[
      {
        id:'fac_nobleza_1', turnMin:5,
        condition:(s)=>{ const f=s.factions.find(x=>x.id==='nobleza'); return f&&f.satisfaction<65&&s.turn>4; },
        event:{
          id:'fac_nobleza_1', title:'El Susurro en la Corte', icon:'👁️',
          category:'MISIÓN DE FACCIÓN', priority:'normal',
          description:'Tres casas nobles planean reuniones secretas. Tu espía sospecha un complot.',
          context:'En la corte, los silencios son más elocuentes que las palabras.',
          options:[
            {label:'Conceder privilegios fiscales',effects:{gold_rate:-25,faction_nobleza:+30,corruption:+5},effectText:['-25💰/t','Nobleza +30'],chainId:'fac_nobleza_2_ok'},
            {label:'Vigilarlos',                   effects:{gold:-100},effectText:['-100💰 (espías)'],chainId:'fac_nobleza_2_ok'},
            {label:'Arrestar líderes',             effects:{stability:-15,faction_nobleza:-35,morale:+5},effectText:['-15 estab','Nobleza -35'],chainId:'fac_nobleza_crisis'}
          ]
        }
      },
      {
        id:'fac_nobleza_3', turnMin:18,
        condition:(s)=>s['arcChain_fac_nobleza_1'],
        event:{
          id:'fac_nobleza_3', title:'La Cámara Alta', icon:'🏛️',
          category:'MISIÓN DE FACCIÓN · CONCLUSIÓN', priority:'high',
          description:'La nobleza propone una Cámara Alta con poder de veto sobre impuestos.',
          context:'Las instituciones viven más que los reyes.',
          options:[
            {label:'Aceptar Cámara Alta',           effects:{stability:+20,corruption:-10,gold_rate:-15,faction_nobleza:+30},effectText:['+20 estab','Nobleza +30'],reward:{type:'bonus',stability:8,description:'Aristocracia Organizada: +8 estabilidad permanente'}},
            {label:'Rechazar — poder solo del trono',effects:{stability:-15,faction_nobleza:-30,morale:+10},effectText:['-15 estab','Nobleza -30']}
          ]
        }
      }
    ]
  }
};

// ── ARCOS DE CIVILIZACIÓN ────────────────────────────────────
var CIV_ARCS = {
  roman:{
    events:[
      {id:'civ_roman_1',turnMin:6,
       event:{id:'civ_roman_1',title:'El Senado Exige Más Poder',icon:'🏛️',category:'ARCO DE CIV · AUREA',priority:'high',
        description:'Los senadores claman por poder de veto sobre impuestos y guerras.',
        context:'El alma de la República Aurea: ¿ley o espada?',
        options:[
          {label:'Ceder al Senado',    effects:{stability:+20,gold_rate:-10,faction_burocracia:+25},effectText:['+20 estab'],chainId:'civ_roman_2'},
          {label:'Disolver el Senado', effects:{stability:-20,morale:+15,faction_burocracia:-30,army_strength:+15},effectText:['-20 estab','+15 moral'],chainId:'civ_roman_2'}
        ]}}
    ]
  },
  norse:{
    events:[
      {id:'civ_norse_1',turnMin:5,
       event:{id:'civ_norse_1',title:'La Profecía del Skaldr',icon:'🔮',category:'ARCO DE CIV · NORTE',priority:'high',
        description:'El skaldr más anciano canta una profecía: seguir la senda del Lobo (guerra) o del Cuervo (sabiduría).',
        context:'En el Norte, los dioses hablan a través de los poetas.',
        options:[
          {label:'Senda del Lobo (guerra)', effects:{army_strength:+20,faction_ejercito:+20},effectText:['+20% fuerza']},
          {label:'Senda del Cuervo (espías)',effects:{corruption:-15,gold:+200},effectText:['-15 corrupción','+200💰']}
        ]}}
    ]
  },
  byzantine:{
    events:[
      {id:'civ_byzantine_1',turnMin:4,
       event:{id:'civ_byzantine_1',title:'La Herejía del Este',icon:'✝️',category:'ARCO DE CIV · ESTE',priority:'high',
        description:'Un teólogo peligroso predica que el pueblo puede gobernar sin rey. Miles lo siguen.',
        context:'En el Imperio del Este, religión y poder son lo mismo.',
        options:[
          {label:'Condenar al hereje',  effects:{stability:+15,morale:-10,faction_burocracia:+20},effectText:['+15 estab','-10 moral']},
          {label:'Proteger al teólogo', effects:{stability:-10,morale:+20,faction_pueblo:+25},effectText:['-10 estab','+20 moral']}
        ]}}
    ]
  },
  mongol:{
    events:[
      {id:'civ_mongol_1',turnMin:3,
       event:{id:'civ_mongol_1',title:'El Kuriltái de los Clanes',icon:'🐎',category:'ARCO DE CIV · ESTEPAS',priority:'high',
        description:'Los cuatro clanes exigen un Kuriltái para renegociar la unidad de la Horda.',
        context:'La Horda unida es invencible. Dividida, vulnerable.',
        options:[
          {label:'Kuriltái generoso', effects:{stability:+10,army_strength:+15,morale:+10,gold_rate:-15},effectText:['+15% fuerza','+10 moral']},
          {label:'Kuriltái de hierro',effects:{stability:+20,army_strength:+5,morale:-10},effectText:['+20 estab','-10 moral']}
        ]}}
    ]
  },
  aztec:{
    events:[
      {id:'civ_aztec_1',turnMin:4,
       event:{id:'civ_aztec_1',title:'El Sacrificio del Quinto Sol',icon:'☀️',category:'ARCO DE CIV · DRAGÓN',priority:'high',
        description:'Los sacerdotes anuncian un eclipse. El Quinto Sol muere si no se hace el Gran Sacrificio.',
        context:'La fe mueve ejércitos.',
        options:[
          {label:'Gran Sacrificio (1000💰)',    effects:{gold:-1000,morale:+30,stability:+15,faction_ejercito:+20},effectText:['-1000💰','+30 moral']},
          {label:'Sacrificio simbólico (200💰)',effects:{gold:-200,morale:+10},effectText:['-200💰','+10 moral']},
          {label:'Rechazar el ritual',          effects:{morale:-25,stability:-15},effectText:['-25 moral','-15 estab']}
        ]}}
    ]
  },
  chinese:{
    events:[
      {id:'civ_chinese_1',turnMin:4,
       event:{id:'civ_chinese_1',title:'El Examen Imperial',icon:'📚',category:'ARCO DE CIV · CELESTE',priority:'high',
        description:'La nobleza quiere abolir los exámenes imperiales para reservar cargos a sus hijos.',
        context:'El mérito vs. el privilegio. El dilema eterno.',
        options:[
          {label:'Mantener los exámenes',    effects:{corruption:-20,stability:+10,faction_nobleza:-20,faction_burocracia:+25},effectText:['-20 corrupción','Burocracia +25']},
          {label:'Cargos para la nobleza',   effects:{corruption:+15,gold_rate:+10,faction_nobleza:+25},effectText:['+15 corrupción','Nobleza +25']}
        ]}}
    ]
  }
};

// ── MOTOR DE ARCOS EXTENDIDO ────────────────────────────────
// Complementa a ArcManager con los nuevos tipos de arcos
window.ArcSystem = window.ArcSystem || {

  init(state) {
    ArcManager.init(state);
    if (!state.arcsFaction) state.arcsFaction = { completed:{}, choices:{} };
    if (!state.arcsCiv)     state.arcsCiv     = { completed:{}, choices:{} };
  },

  // Llamar al inicio de cada turno
  tick(state) {
    this.init(state);
    const toAdd = [];
    toAdd.push(...this._tickFactionArcs(state));
    toAdd.push(...this._tickCivArc(state));
    if (!state.currentEvents) state.currentEvents = [];
    toAdd.forEach(ev=>{
      if (!state.currentEvents.find(e=>e.id===ev.id)) state.currentEvents.unshift(ev);
    });
    // También tick ArcManager original
    const arcEvts = ArcManager.generateForTurn(state);
    arcEvts.forEach(ev=>{
      if (!state.currentEvents.find(e=>e.id===ev.id)) state.currentEvents.push(ev);
    });
  },

  _tickFactionArcs(state) {
    const evts=[];
    Object.entries(FACTION_ARCS).forEach(([facId,arcDef])=>{
      arcDef.missions.forEach(mission=>{
        if (state.turn<(mission.turnMin||0)) return;
        if (state.arcsFaction.completed[mission.id]) return;
        if (state.currentEvents&&state.currentEvents.find(e=>e.id===mission.event.id)) return;
        if (mission.condition&&!mission.condition(state)) return;
        evts.push(this._prepareEvent(mission.event,'faction',mission.id));
      });
    });
    return evts.slice(0,1);
  },

  _tickCivArc(state) {
    const civId=state.civId;
    const arcDef=CIV_ARCS[civId];
    if (!arcDef) return [];
    const evts=[];
    arcDef.events.forEach(entry=>{
      if (state.turn<(entry.turnMin||0)) return;
      if (state.arcsCiv.completed[entry.id]) return;
      if (state.currentEvents&&state.currentEvents.find(e=>e.id===entry.event.id)) return;
      if (entry.condition&&!entry.condition(state)) return;
      evts.push(this._prepareEvent(entry.event,'civ',entry.id));
    });
    return evts.slice(0,1);
  },

  _prepareEvent(evDef,source,sourceId) {
    return Object.assign({},evDef,{
      arcSource:source,
      arcSourceId:sourceId,
      options:(evDef.options||[]).map((opt,i)=>Object.assign({},opt,{
        action:(s)=>{ this.applyEffect(s,opt,source,sourceId,i); }
      }))
    });
  },

  applyEffect(state,opt,source,sourceId,optIdx) {
    const fx=opt.effects||{};
    if (fx.morale)        state.morale=Math.max(0,Math.min(100,state.morale+(fx.morale||0)));
    if (fx.stability)     state.stability=Math.max(0,Math.min(100,state.stability+(fx.stability||0)));
    if (fx.gold)          state.resources.gold=Math.max(0,state.resources.gold+(fx.gold||0));
    if (fx.food)          state.resources.food=Math.max(0,state.resources.food+(fx.food||0));
    if (fx.corruption)    state.economy.corruption=Math.max(0,Math.min(100,(state.economy.corruption||0)+(fx.corruption||0)));
    if (fx.gold_rate)     state.economy.goldRateBonus=(state.economy.goldRateBonus||0)+(fx.gold_rate||0);
    if (fx.army_strength) state.economy.armyStrengthBonus=(state.economy.armyStrengthBonus||0)+(fx.army_strength||0);
    Object.keys(fx).filter(k=>k.startsWith('faction_')).forEach(k=>{
      const fid=k.replace('faction_','');
      const fac=(state.factions||[]).find(f=>f.id===fid);
      if(fac) fac.satisfaction=Math.max(0,Math.min(100,fac.satisfaction+(fx[k]||0)));
    });
    // Mark completed
    const choiceKey='arcChain_fac_'+sourceId;
    state[choiceKey]=optIdx===0?'conceder':optIdx===1?'moderar':'negar';
    if(source==='faction'){state.arcsFaction.completed[sourceId]=true;}
    if(source==='civ'){state.arcsCiv.completed[sourceId]=true;}
    // Reward
    if(opt.reward) this.applyReward(state,opt.reward);
    // Log
    const logMsg=opt.effectText?opt.effectText.join(' · '):'';
    if(logMsg&&typeof Systems!=='undefined') Systems.Log.add(state,'📜 '+opt.label+': '+logMsg,'info');
  },

  applyReward(state,reward) {
    if(!reward) return;
    if(reward.type==='bonus'){
      if(reward.gold_rate)     state.economy.goldRateBonus=(state.economy.goldRateBonus||0)+reward.gold_rate;
      if(reward.army_strength) state.economy.armyStrengthBonus=(state.economy.armyStrengthBonus||0)+reward.army_strength;
      if(reward.stability)     state.stability=Math.min(100,state.stability+(reward.stability||0));
      if(reward.morale)        state.morale=Math.min(100,state.morale+(reward.morale||0));
      if(reward.description&&typeof Systems!=='undefined') Systems.Log.add(state,'🏆 RECOMPENSA: '+reward.description,'good');
    }
  }
};

var ArcSystem = window.ArcSystem;

var ArcManager = window.ArcManager;
