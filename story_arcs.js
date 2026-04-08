// ============================================================
// IMPERIUM — STORY_ARCS.JS
// Story arcs: cadenas de 3-5 eventos relacionados por civilización
// Chained events: cada decisión desbloquea eventos futuros distintos
// ============================================================

// -- STORY ARCS -----------------------------------------------
// Formato: { id, civId (null=global), title, phases:[] }
// Cada phase: { id, title, condition, eventId (evento que dispara esta fase) }
var STORY_ARCS = [

  // -- ARCO GLOBAL: La Sombra de la Plaga ------------------
  {
    id: 'plague_arc',
    civId: null,   // global — afecta a todas
    title: 'La Sombra de la Plaga',
    icon: '🦠',
    description: 'Una enfermedad desconocida avanza desde el Este. Sus consecuencias dependerán de cómo respondan los reinos.',
    triggerTurn: 12,     // se activa en turno 12
    triggerChance: 0.6,
    phases: [
      {
        id: 'plague_rumours',
        title: 'Rumores del Este',
        description: 'Mercaderes traen noticias de una enfermedad devastadora en las provincias orientales.',
        eventId: 'arc_plague_rumours',
        unlockNext: 6   // en 6 turnos o antes si condición
      },
      {
        id: 'plague_border',
        title: 'La Plaga en la Frontera',
        description: 'Los primeros casos aparecen en tus fronteras. Tus médicos trabajan contra el tiempo.',
        eventId: 'arc_plague_border',
        unlockNext: 5
      },
      {
        id: 'plague_crisis',
        title: 'Crisis Sanitaria',
        description: 'La enfermedad está en el corazón de tu reino. Debes tomar decisiones drásticas.',
        eventId: 'arc_plague_crisis',
        unlockNext: 4
      },
      {
        id: 'plague_end',
        title: 'El Final de la Plaga',
        description: 'La plaga remite... pero las cicatrices permanecen. Tu elección de cómo la manejaste marcará tu historia.',
        eventId: 'arc_plague_end',
        unlockNext: null
      }
    ]
  },

  // -- ARCO GLOBAL: La Gran Sequía -------------------------
  {
    id: 'drought_arc',
    civId: null,
    title: 'La Gran Sequía',
    icon: '☀️',
    description: 'Los cielos se secan. Los ríos bajan. Una crisis alimentaria amenaza a todos los reinos.',
    triggerTurn: 20,
    triggerChance: 0.5,
    phases: [
      {
        id: 'drought_signs',
        title: 'Señales de Alarma',
        description: 'Las cosechas son menores. Los campesinos murmuran. El verano dura demasiado.',
        eventId: 'arc_drought_signs',
        unlockNext: 5
      },
      {
        id: 'drought_severe',
        title: 'Sequía Severa',
        description: 'Los pozos se secan. Los rebaños menguan. El precio del grano se dispara.',
        eventId: 'arc_drought_severe',
        unlockNext: 5
      },
      {
        id: 'drought_famine',
        title: 'Al Borde del Hambre',
        description: 'Tu pueblo pasa hambre. Otras naciones tampoco están mejor. ¿Ayudas o aprovechas?',
        eventId: 'arc_drought_famine',
        unlockNext: null
      }
    ]
  },

  // -- ARCO DE CIV: República Aurea — La Crisis del Senado -
  {
    id: 'roman_senate_arc',
    civId: 'roman',
    title: 'La Crisis del Senado',
    icon: '🏛️',
    description: 'La República se fractura. El Senado debate entre la democracia y el poder de un solo hombre.',
    triggerTurn: 8,
    triggerChance: 0.8,
    phases: [
      {
        id: 'senate_tensions',
        title: 'Tensiones Senatoriales',
        description: 'Dos facciones del Senado se disputan el control. Debes elegir bando.',
        eventId: 'arc_senate_tensions',
        unlockNext: 6
      },
      {
        id: 'senate_conspiracy',
        title: 'La Conspiración',
        description: 'Se descubre un complot para derrocarte. Alguien en el Senado es un traidor.',
        eventId: 'arc_senate_conspiracy',
        unlockNext: 5
      },
      {
        id: 'senate_reform',
        title: 'El Gran Debate',
        description: 'El momento decisivo. ¿Refuerzas la República o te conviertes en César?',
        eventId: 'arc_senate_reform',
        unlockNext: null
      }
    ]
  },

  // -- ARCO DE CIV: Horda de las Estepas — El Gran Khan ----
  {
    id: 'mongol_khan_arc',
    civId: 'mongol',
    title: 'El Legado del Gran Khan',
    icon: '🐎',
    description: 'Una profecía anuncia la llegada de un nuevo Gran Khan. ¿Será tu pueblo el que unifique las estepas?',
    triggerTurn: 5,
    triggerChance: 0.9,
    phases: [
      {
        id: 'khan_prophecy',
        title: 'La Profecía del Chamanismo',
        description: 'Los chamanes hablan de señales en el cielo. Un Gran Khan debe surgir.',
        eventId: 'arc_khan_prophecy',
        unlockNext: 8
      },
      {
        id: 'khan_rivals',
        title: 'Rivales de las Estepas',
        description: 'Otros jefes reclaman el título. La unidad de la Horda peligra.',
        eventId: 'arc_khan_rivals',
        unlockNext: 6
      },
      {
        id: 'khan_ascension',
        title: 'La Ascensión',
        description: 'Ha llegado el momento. ¿Te proclamas Gran Khan o cedes el poder?',
        eventId: 'arc_khan_ascension',
        unlockNext: null
      }
    ]
  },

  // -- ARCO GLOBAL: El Imperio en Llamas -------------------
  {
    id: 'war_arc',
    civId: null,
    title: 'El Imperio en Llamas',
    icon: '⚔️',
    description: 'Una guerra entre dos naciones grandes amenaza con arrastrar a todos los reinos.',
    triggerCondition: 'two_nations_at_war',  // condición especial
    triggerTurn: 15,
    triggerChance: 0.45,
    phases: [
      {
        id: 'war_rumors',
        title: 'Vientos de Guerra',
        description: 'Dos grandes naciones movilizan ejércitos. La paz del continente tiembla.',
        eventId: 'arc_war_rumors',
        unlockNext: 4
      },
      {
        id: 'war_intervention',
        title: '¿A quién apoyar?',
        description: 'Ambas naciones te piden que tomes partido. Tu decisión definirá alianzas para años.',
        eventId: 'arc_war_intervention',
        unlockNext: 6
      },
      {
        id: 'war_aftermath',
        title: 'Las Cenizas de la Guerra',
        description: 'El conflicto termina. El mapa ha cambiado. Quien ganó ahora es más fuerte... y peligroso.',
        eventId: 'arc_war_aftermath',
        unlockNext: null
      }
    ]
  }
];

// -- EVENTOS DE ARC (conectados a los arcos anteriores) ----
var ARC_EVENTS = {

  // -- PLAGA ----------------------------------------------
  arc_plague_rumours: {
    id:'arc_plague_rumours', category:'PLAGA',  priority:'critical', icon:'🦠',
    title:'Rumores de Pestilencia',
    description:'Mercaderes del Este describen ciudades vacías, campos abandonados. Una enfermedad desconocida. Tus médicos piden recursos para prepararse.',
    context:'Población en riesgo: media · Tiempo de respuesta: 6 turnos',
    options:[
      { label:'Cuarentena preventiva',
        effects:{food:-30,gold:-100,morale:-8,stability:+5},
        effectText:['-30 comida','-100 oro','-8 moral','+5 estabilidad'],
        chainEventId:'arc_plague_border', chainDelay:5, chainVariant:'prepared' },
      { label:'Ignorar los rumores',
        effects:{},
        effectText:['Sin coste inmediato','La plaga llegará sin preparación'],
        chainEventId:'arc_plague_border', chainDelay:4, chainVariant:'unprepared' },
      { label:'Invertir en medicina (+300💰)',
        effects:{gold:-300,stability:+3},
        effectText:['-300 oro','Tus médicos están listos','+3 estabilidad'],
        chainEventId:'arc_plague_border', chainDelay:6, chainVariant:'invested' }
    ]
  },
  arc_plague_border: {
    id:'arc_plague_border', category:'PLAGA',  priority:'critical', icon:'⚕️',
    title:'La Plaga en la Frontera',
    description:'Los primeros enfermos aparecen en pueblos fronterizos. El pánico se extiende. Los guardias de frontera desertan.',
    context:'Variant: ver estado anterior',
    options:[
      { label:'Cerrar fronteras',
        effects:{gold:-50,trade_income:-20,morale:-5,stability:+8},
        effectText:['-50 oro','-20 comercio','-5 moral','+8 estabilidad'],
        chainEventId:'arc_plague_crisis', chainDelay:4, chainVariant:'contained' },
      { label:'Llamar a los curanderos del pueblo',
        effects:{food:-40,morale:-3},
        effectText:['-40 comida','-3 moral','Coste moderado'],
        chainEventId:'arc_plague_crisis', chainDelay:5, chainVariant:'folk_medicine' },
      { label:'Rezar a los dioses (+moral ritual)',
        effects:{morale:+5,stability:-5,population_mod:-50},
        effectText:['+5 moral ritual','-5 estabilidad','Muertos: 50 hab'],
        chainEventId:'arc_plague_crisis', chainDelay:4, chainVariant:'prayer' }
    ]
  },
  arc_plague_crisis: {
    id:'arc_plague_crisis', category:'PLAGA',  priority:'critical', icon:'💀',
    title:'Crisis Sanitaria Total',
    description:'La plaga ha llegado a la capital. Las calles están vacías. Los nobles huyen al campo. Tus consejeros sugieren medidas draconianas.',
    context:'Consecuencias acumulativas de decisiones anteriores',
    options:[
      { label:'Medidas drásticas: quemar aldeas infectadas',
        effects:{population_mod:-200, stability:-10, morale:-20, gold:-100},
        effectText:['-200 población','-10 estabilidad','-20 moral','Plaga contenida'],
        chainEventId:'arc_plague_end', chainDelay:4, chainVariant:'brutal' },
      { label:'Distribuir reservas de alimentos',
        effects:{food:-200, morale:+10, stability:+5},
        effectText:['-200 comida','+10 moral','+5 estabilidad','Mayor confianza'],
        chainEventId:'arc_plague_end', chainDelay:5, chainVariant:'humane' },
      { label:'Imponer trabajo forzado en hospitales',
        effects:{morale:-25, stability:-8, population_mod:-100},
        effectText:['-25 moral','-8 estabilidad','Se contiene lentamente'],
        chainEventId:'arc_plague_end', chainDelay:6, chainVariant:'forced' }
    ]
  },
  arc_plague_end: {
    id:'arc_plague_end', category:'PLAGA',  priority:'normal', icon:'🌿',
    title:'El Fin de la Pestilencia',
    description:'La plaga remite. Las campanas tocan. Pero el coste ha sido alto. Tu pueblo mira hacia ti: ¿cómo gestionaste la crisis?',
    context:'Consecuencias finales según historial de decisiones',
    options:[
      { label:'Decreto de reconstrucción (+200💰 inversión)',
        effects:{gold:-200, stability:+15, morale:+10, population_mod:+100},
        effectText:['-200 oro','+15 estabilidad','+10 moral','+100 habitantes'] },
      { label:'Celebrar la supervivencia (fiesta popular)',
        effects:{gold:-80, morale:+20, stability:+5},
        effectText:['-80 oro','+20 moral','+5 estabilidad'] },
      { label:'Silencio oficial — no reconocer el desastre',
        effects:{stability:-5, morale:-10, corruption:+10},
        effectText:['-5 estabilidad','-10 moral','+10 corrupción'] }
    ]
  },

  // -- SEQUÍA --------------------------------------------
  arc_drought_signs: {
    id:'arc_drought_signs', category:'SEQUÍA', priority:'normal', icon:'☀️',
    title:'Señales de la Sequía',
    description:'Los pozos bajan. Las cosechas son mediocres. Los animales adelgazan. Un campesino profeta anuncia siete años de calamidad.',
    context:'Ventana de preparación: 5 turnos',
    options:[
      { label:'Construir cisternas y canales',
        effects:{gold:-250,wood:-100,food_bonus:+30},
        effectText:['-250 oro','-100 madera','+30 comida/turno permanente'],
        chainEventId:'arc_drought_severe', chainDelay:5, chainVariant:'prepared' },
      { label:'Acumular reservas de grano',
        effects:{gold:-100,food:-200},
        effectText:['-100 oro','-200 comida ahora','Reservas para después'],
        chainEventId:'arc_drought_severe', chainDelay:5, chainVariant:'stored' },
      { label:'Ignorar las señales',
        effects:{},
        effectText:['Sin coste ahora','Efecto devastador después'],
        chainEventId:'arc_drought_severe', chainDelay:4, chainVariant:'ignored' }
    ]
  },
  arc_drought_severe: {
    id:'arc_drought_severe', category:'SEQUÍA', priority:'critical', icon:'🌵',
    title:'Sequía Devastadora',
    description:'Los ríos se han convertido en barrizales. Las ciudades compiten por el agua. Los disturbios empiezan en los mercados.',
    context:'Consecuencias según preparación anterior',
    options:[
      { label:'Racionamiento obligatorio',
        effects:{morale:-15, stability:+5, food:-100},
        effectText:['-15 moral','+5 estabilidad','Se distribuye lo poco que hay'],
        chainEventId:'arc_drought_famine', chainDelay:5, chainVariant:'rationed' },
      { label:'Comerciar comida con vecinos (+alianza)',
        effects:{gold:-150, food:+200, relation_all:+10},
        effectText:['-150 oro','+200 comida','+10 relación con todos'],
        chainEventId:'arc_drought_famine', chainDelay:5, chainVariant:'traded' },
      { label:'Dejar que el mercado regule',
        effects:{gold:+50, morale:-25, stability:-10},
        effectText:['+50 oro (especuladores)','-25 moral','-10 estabilidad'],
        chainEventId:'arc_drought_famine', chainDelay:4, chainVariant:'market' }
    ]
  },
  arc_drought_famine: {
    id:'arc_drought_famine', category:'SEQUÍA', priority:'critical', icon:'💀',
    title:'Al Borde del Abismo',
    description:'El hambre llegó. La gente emigra. Aldeas enteras quedan vacías. Pero hay quienes se enriquecen con la crisis.',
    context:'Resolución final de la sequía',
    options:[
      { label:'Distribuir las reservas de oro para alimentos',
        effects:{gold:-300, food:+400, morale:+15, stability:+10},
        effectText:['-300 oro','+400 comida','+15 moral','Pueblo agradecido'] },
      { label:'Pedir ayuda humanitaria a aliados',
        effects:{food:+250, stability:+5, morale:+5, relation_allies:-10},
        effectText:['+250 comida','Deuda moral con aliados'] },
      { label:'Trabajo forzado en los campos',
        effects:{food:+100, morale:-30, stability:-15, population_mod:-150},
        effectText:['+100 comida','-30 moral','-15 estabilidad','Explotación brutal'] }
    ]
  },

  // -- SENADO ROMANO ------------------------------------
  arc_senate_tensions: {
    id:'arc_senate_tensions', category:'POLÍTICA', priority:'critical', icon:'🏛️',
    title:'Tensiones en el Senado',
    description:'El Senado romano se divide. La facción Populares, liderada por el carismático Marco Servilio, exige más poder para el pueblo. Los Optimates, encabezados por Cayo Licinio, defienden la tradición aristocrática.',
    context:'Tu decisión determinará el carácter de tu gobierno',
    options:[
      { label:'Apoyar a los Populares',
        effects:{morale:+20, stability:-10, factionEffect:{pueblo:+30,nobleza:-25}},
        effectText:['+20 moral','Pueblo contento','Nobles hostiles'],
        chainEventId:'arc_senate_conspiracy', chainDelay:6, chainVariant:'populares' },
      { label:'Apoyar a los Optimates',
        effects:{stability:+15, gold:+100, factionEffect:{nobleza:+25,pueblo:-20}},
        effectText:['+15 estabilidad','+100 oro','Pueblo resentido'],
        chainEventId:'arc_senate_conspiracy', chainDelay:6, chainVariant:'optimates' },
      { label:'Mantenerse neutral — jugar a ambos bandos',
        effects:{corruption:+15, stability:+5},
        effectText:['+5 estabilidad','+15 corrupción','Desconfianza mutua'],
        chainEventId:'arc_senate_conspiracy', chainDelay:5, chainVariant:'neutral' }
    ]
  },
  arc_senate_conspiracy: {
    id:'arc_senate_conspiracy', category:'POLÍTICA', priority:'critical', icon:'🗡️',
    title:'La Conspiración del Ides',
    description:'Un espía infiltrado descubre un complot para asesinarte. Los conspiradores son senadores de alto rango. Tienes sus nombres, pero no pruebas suficientes.',
    context:'Decisión de alto riesgo — el error puede desencadenar guerra civil',
    options:[
      { label:'Arrestar a los sospechosos públicamente',
        effects:{stability:-15, morale:-10, factionEffect:{nobleza:-30}},
        effectText:['-15 estabilidad','-10 moral','Nobleza furiosa'],
        chainEventId:'arc_senate_reform', chainDelay:5, chainVariant:'arrests' },
      { label:'Fingir ignorancia, pero eliminarlos en secreto',
        effects:{corruption:+20, stability:+5, morale:-5},
        effectText:['+20 corrupción','+5 estabilidad','Miedo en palacio'],
        chainEventId:'arc_senate_reform', chainDelay:5, chainVariant:'secret' },
      { label:'Confrontarlos en el Senado y perdonarles',
        effects:{morale:+15, stability:+10, factionEffect:{nobleza:+10}},
        effectText:['+15 moral','+10 estabilidad','Acto de magnanimidad'],
        chainEventId:'arc_senate_reform', chainDelay:6, chainVariant:'forgave' }
    ]
  },
  arc_senate_reform: {
    id:'arc_senate_reform', category:'POLÍTICA', priority:'critical', icon:'⚖️',
    title:'El Gran Debate: República o César',
    description:'Ha llegado el momento decisivo. El pueblo y el ejército te aclaman. El Senado está dividido. La historia se escribe hoy.',
    context:'Consecuencias permanentes según el historial de decisiones',
    options:[
      { label:'Reforzar la República — rechazar el poder absoluto',
        effects:{stability:+20, morale:+15, corruption:-20, factionEffect:{pueblo:+20,nobleza:+15}},
        effectText:['+20 estabilidad','+15 moral','-20 corrupción','Historia te recordará como el Justo'] },
      { label:'Proclamarte Dictador Perpetuo',
        effects:{stability:-20, morale:+10, army_strength:+30, gold:+500},
        effectText:['-20 estabilidad (guerra civil posible)','+30 fuerza militar','+500 oro'],
      },
      { label:'Reforma constitucional: monarquía constitucional',
        effects:{stability:+10, morale:+5, corruption:-10, gold:+200},
        effectText:['+10 estabilidad','+5 moral','-10 corrupción','Solución de compromiso'] }
    ]
  },

  // -- GUERRA CONTINENTAL --------------------------------
  arc_war_rumors: {
    id:'arc_war_rumors', category:'GUERRA', priority:'critical', icon:'⚔️',
    title:'Vientos de Guerra',
    description:'Dos grandes naciones movilizan ejércitos. Los embajadores corren de un lado a otro. El continente contiene la respiración.',
    context:'Puedes posicionarte o esperar',
    options:[
      { label:'Mediación: proponer paz entre ambas',
        effects:{stability:+5,gold:-100,relation_all:+15},
        effectText:['-100 oro','+15 relación con todos','Reputación de mediador'],
        chainEventId:'arc_war_intervention', chainDelay:4, chainVariant:'mediator' },
      { label:'Movilizar ejércitos preventivamente',
        effects:{gold:-200,army_strength:+20,morale:-5},
        effectText:['-200 oro','+20 fuerza ejército','Preparado para lo peor'],
        chainEventId:'arc_war_intervention', chainDelay:4, chainVariant:'prepared' },
      { label:'Observar desde lejos',
        effects:{},
        effectText:['Sin coste','Sin ventaja','Los eventos decidirán por ti'],
        chainEventId:'arc_war_intervention', chainDelay:5, chainVariant:'observer' }
    ]
  },
  arc_war_intervention: {
    id:'arc_war_intervention', category:'GUERRA', priority:'critical', icon:'🤝',
    title:'El Momento de Elegir',
    description:'Ambas naciones beligerantes te piden que tomes partido. Una te ofrece alianza y territorios. La otra te amenaza si no te unes.',
    context:'Elección de alianza con consecuencias a largo plazo',
    options:[
      { label:'Unirte al más fuerte',
        effects:{relation_strongest:+30,relation_weakest:-50,army_bonus:+50},
        effectText:['Alianza con el ganador probable','Enemista al perdedor'],
        chainEventId:'arc_war_aftermath', chainDelay:6, chainVariant:'winner_side' },
      { label:'Unirte al más débil (por honor)',
        effects:{morale:+20,stability:-10,army_bonus:+20},
        effectText:['+20 moral (acto heroico)','Mayor riesgo militar'],
        chainEventId:'arc_war_aftermath', chainDelay:6, chainVariant:'underdog_side' },
      { label:'Declarar neutralidad armada',
        effects:{stability:+10,trade_bonus:+30,relation_all:-10},
        effectText:['Comercias con ambos bandos','Nadie te fía al 100%'],
        chainEventId:'arc_war_aftermath', chainDelay:7, chainVariant:'neutral' }
    ]
  },
  arc_war_aftermath: {
    id:'arc_war_aftermath', category:'GUERRA', priority:'normal', icon:'🏳️',
    title:'Las Cenizas de la Guerra',
    description:'El conflicto termina. El mapa ha cambiado. El ganador es ahora más poderoso. Tu posición dependió de cómo jugaste.',
    context:'Resolución según historial de alianzas',
    options:[
      { label:'Negociar la paz continental',
        effects:{stability:+10,morale:+10,relation_all:+20,gold:+200},
        effectText:['+10 estabilidad','+20 relación general','+200 oro en reparaciones'] },
      { label:'Exigir territorios al perdedor',
        effects:{althoriaRegions:+1,gold:+300,relation_all:-15},
        effectText:['+1 región de Althoria','+300 oro','-15 relación general'] },
      { label:'Reconstruir en silencio',
        effects:{stability:+5,morale:+5},
        effectText:['Sin compromisos extra','Tiempo para crecer'] }
    ]
  }
};

// -- SISTEMA GESTOR DE ARCOS -------------------------------
window.StoryArcSystem = window.StoryArcSystem || {

  // Inicializar para la partida
  init(state) {
    state.activeArcs      = state.activeArcs      || [];
    state.completedArcs   = state.completedArcs   || [];
    state.pendingChainEvents = state.pendingChainEvents || [];
  },

  // Comprobar si activar nuevos arcos este turno
  checkActivations(state) {
    if (!state.activeArcs)    state.activeArcs    = [];
    if (!state.completedArcs) state.completedArcs = [];

    STORY_ARCS.forEach(arc => {
      const alreadyActive    = state.activeArcs.find(a => a.arcId === arc.id);
      const alreadyCompleted = state.completedArcs.includes(arc.id);
      if (alreadyActive || alreadyCompleted) return;

      // Condición de turno
      if (state.turn < (arc.triggerTurn || 5)) return;

      // Condición especial
      if (arc.triggerCondition === 'two_nations_at_war') {
        const atWar = (state.diplomacy||[]).filter(n=>n.atWar).length;
        if (atWar < 1) return;
      }

      // Condición de civilización
      if (arc.civId && arc.civId !== state.civId) return;

      // Probabilidad de activación
      if (Math.random() > (arc.triggerChance || 0.5)) return;

      // Activar
      state.activeArcs.push({
        arcId:        arc.id,
        currentPhase: 0,
        startTurn:    state.turn,
        history:      []
      });

      Systems.Log.add(state, `📖 Nuevo arco narrativo: "${arc.title}" — ${arc.description.substring(0,80)}…`, 'good');

      // Añadir el primer evento de este arco a la cola
      this._queueArcPhaseEvent(state, arc.id, 0);
    });
  },

  // Encolar el evento de una fase del arco
  _queueArcPhaseEvent(state, arcId, phaseIdx) {
    const arc   = STORY_ARCS.find(a => a.id === arcId);
    if (!arc || !arc.phases[phaseIdx]) return;
    const phase = arc.phases[phaseIdx];
    if (!phase.eventId) return;

    // Añadir a eventos pendientes con delay 1
    if (!state.pendingChainEvents) state.pendingChainEvents = [];
    state.pendingChainEvents.push({
      eventId:   phase.eventId,
      fireOnTurn: state.turn + 1,
      source:    'arc:' + arcId + ':' + phaseIdx
    });
  },

  // Avanzar fase de un arco al resolver su evento
  advanceArc(state, arcId, variant) {
    const activeArc = (state.activeArcs||[]).find(a => a.arcId === arcId);
    if (!activeArc) return;

    const arc = STORY_ARCS.find(a => a.id === arcId);
    if (!arc) return;

    activeArc.history.push({ phase: activeArc.currentPhase, variant });
    activeArc.currentPhase++;

    if (activeArc.currentPhase >= arc.phases.length) {
      // Arco completado
      state.activeArcs = state.activeArcs.filter(a => a.arcId !== arcId);
      if (!state.completedArcs) state.completedArcs = [];
      state.completedArcs.push(arcId);
      Systems.Log.add(state, `📖 Arco completado: "${arc.title}". Tu historia avanza.`, 'good');
    } else {
      this._queueArcPhaseEvent(state, arcId, activeArc.currentPhase);
    }
  },

  // Procesar eventos encadenados pendientes
  processPendingChains(state) {
    if (!state.pendingChainEvents || !state.pendingChainEvents.length) return;

    const toFire = state.pendingChainEvents.filter(e => e.fireOnTurn <= state.turn);
    state.pendingChainEvents = state.pendingChainEvents.filter(e => e.fireOnTurn > state.turn);

    toFire.forEach(pending => {
      const ev = ARC_EVENTS[pending.eventId];
      if (!ev) return;

      // Añadir a la cola de eventos actual
      if (!state.currentEvents) state.currentEvents = [];
      const newEvent = Object.assign({}, ev, {
        _chainSource: pending.source,
        _variant:     pending.variant || null
      });
      state.currentEvents.push(newEvent);
      Systems.Log.add(state, `🔗 Nuevo evento encadenado: "${ev.title}"`, 'warn');
    });
  },

  // Registrar decisión encadenada (llamado al resolver eventos de arco)
  onEventDecision(state, event, optionIdx) {
    if (!event || !event.options) return;
    const opt = event.options[optionIdx];
    if (!opt) return;

    // ¿Es parte de un arco?
    if (event._chainSource && event._chainSource.startsWith('arc:')) {
      const parts = event._chainSource.split(':');
      this.advanceArc(state, parts[1], opt.chainVariant || 'default');
    }

    // ¿Tiene encadenamiento propio?
    if (opt.chainEventId) {
      if (!state.pendingChainEvents) state.pendingChainEvents = [];
      state.pendingChainEvents.push({
        eventId:    opt.chainEventId,
        fireOnTurn: state.turn + (opt.chainDelay || 4),
        variant:    opt.chainVariant || 'default',
        source:     'decision:' + event.id
      });
      Systems.Log.add(state, `🔗 Tus acciones tendrán consecuencias en ${opt.chainDelay||4} turnos…`, 'info');
    }
  },

  // Renderizar banner del arco activo (para el panel de decisiones)
  renderActiveBanner(state) {
    if (!state.activeArcs || !state.activeArcs.length) return '';
    const active = state.activeArcs[0];
    const arc    = STORY_ARCS.find(a => a.id === active.arcId);
    if (!arc) return '';

    const dots = arc.phases.map((p, i) => {
      const cl = i < active.currentPhase ? 'done' : i === active.currentPhase ? 'active' : '';
      return `<div class="arc-dot ${cl}" title="${p.title}"></div>`;
    }).join('');

    const curPhase = arc.phases[active.currentPhase];
    return `
      <div class="story-arc-banner">
        <div class="arc-phase">📖 ARCO ACTIVO · ${arc.icon} ${arc.title}</div>
        <div class="arc-title">${curPhase ? curPhase.title : 'Completando…'}</div>
        <div class="arc-desc">${curPhase ? curPhase.description : 'El arco avanza hacia su conclusión.'}</div>
        <div class="arc-progress">${dots}</div>
      </div>`;
  },

  // Obtener todos los arcos completados como resumen
  getArcSummary(state) {
    if (!state.completedArcs || !state.completedArcs.length) return null;
    return state.completedArcs.map(id => {
      const arc = STORY_ARCS.find(a => a.id === id);
      return arc ? `${arc.icon} ${arc.title}` : id;
    });
  }
};

var StoryArcSystem = window.StoryArcSystem;
