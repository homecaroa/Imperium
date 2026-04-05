// ============================================================
// IMPERIUM — AI.JS
// Inteligencia artificial de naciones enemigas
// Cada nación evalúa el estado del mundo y toma decisiones
// ============================================================

const AI = {

  // ============================================================
  // PERSONALIDADES
  // Cada personalidad define pesos de evaluación y umbrales
  // ============================================================
  personalities: {
    agresiva: {
      warThreshold: 10,       // relación mínima para atacar
      expansionWeight: 0.8,   // cuánto valora el territorio
      economyWeight: 0.3,
      diplomacyWeight: 0.2,
      riskTolerance: 0.8,     // qué tanto riesgo acepta
      description: 'Busca conflicto y expansión. Ataca cuando ve debilidad.'
    },
    diplomática: {
      warThreshold: -60,
      expansionWeight: 0.3,
      economyWeight: 0.7,
      diplomacyWeight: 0.9,
      riskTolerance: 0.3,
      description: 'Prefiere tratados. Construye redes de alianzas. Ataca solo si acorralada.'
    },
    oportunista: {
      warThreshold: 5,
      expansionWeight: 0.6,
      economyWeight: 0.6,
      diplomacyWeight: 0.5,
      riskTolerance: 0.6,
      description: 'Cambia de bando según convenga. Traiciona alianzas cuando hay ganancia.'
    },
    aislacionista: {
      warThreshold: -80,
      expansionWeight: 0.1,
      economyWeight: 0.5,
      diplomacyWeight: 0.4,
      riskTolerance: 0.1,
      description: 'Evita guerras y diplomacia. Crece internamente. Solo defiende su territorio.'
    }
  },

  // ============================================================
  // ESTADO INTERNO DE CADA NACIÓN IA
  // ============================================================
  initNation(nationDef) {
    return {
      ...nationDef,
      army: 200 + Math.floor(Math.random() * 300),
      resources: { food: 300, gold: 200, iron: 150 },
      stability: 40 + Math.floor(Math.random() * 30),
      morale: 40 + Math.floor(Math.random() * 30),
      relation: nationDef.startRelation,
      atWar: false,
      warTurns: 0,
      treaties: [],
      memory: [], // acciones pasadas del jugador que recuerda
      aggressionLevel: 0,
      lastAction: null
    };
  },

  // ============================================================
  // TICK PRINCIPAL DE IA — ejecutar cada fin de turno
  // ============================================================
  // Power score of player
  _playerPower(state) {
    return (state.army||0) * 0.4
         + (state.stability||50) * 2
         + (state.morale||50) * 1.5
         + (state.resources?.gold||0) * 0.1
         + (state.althoriaRegions||1) * 150;
  },

  tick(state) {
    if (!state.diplomacy) return;

    const playerPower = this._playerPower(state);
    state.diplomacy.forEach(nation => {
      const personality = this.personalities[nation.personality];
      if (!personality) return;

      // 1. EVALUAR SITUACIÓN
      const playerStrength = Systems.Military.calculateEffectiveStrength(state);
      const aiStrength  = (nation.army||300) * ((nation.morale||60) / 100);
      const strengthRatio = aiStrength / Math.max(1, playerStrength);
      const myPower     = aiStrength * 0.4 + 50;
      const powerRatio  = playerPower / (myPower + 1);  // >1 = player stronger

      const playerWeakness = state.morale < 40 || state.stability < 30 || state.resources.food < 100;
      const playerStrong   = state.morale > 70 && state.stability > 60 && playerStrength > 600;

      // 2. ACTUALIZAR RELACIÓN (deriva natural)
      this.updateRelation(state, nation, personality, playerWeakness, playerStrong);

      // 2b. TRAICIÓN — oportunista traiciona aliados cuando el jugador está débil
      if (nation.personality === 'oportunista' && !nation.atWar
          && (nation.treaties||[]).includes('alliance')
          && powerRatio < 0.6 && Math.random() < 0.12) {
        nation.atWar = true;
        nation.treaties = (nation.treaties||[]).filter(t => t !== 'alliance');
        nation.relation = -80;
        const betrayalLoss = Math.floor((state.army||0) * 0.15);
        state.army = Math.max(0, (state.army||0) - betrayalLoss);
        Systems.Log.add(state, '💔 ¡TRAICIÓN! ' + nation.name + ' rompe la alianza y ataca. Aprovecharon tu debilidad.', 'crisis');
      }

      // 2c. Sabotaje económico si oportunista/agresiva y jugador tiene rutas activas
      if (!nation.atWar && (state.activeTradeRoutes||[]).length > 0 && Math.random() < 0.12) {
        if (nation.personality === 'oportunista' || (nation.personality === 'agresiva' && nation.relation < -30)) {
          const richRoute = (state.activeTradeRoutes||[]).sort((a,b)=>(b.income?.gold||0)-(a.income?.gold||0))[0];
          if (richRoute) {
            richRoute.health = Math.max(0, (richRoute.health||100) - 15);
            if (richRoute.health < 50) Systems.Log.add(state, '🗡️ ' + nation.name + ' saboteó tu ruta "' + (richRoute.routeName||richRoute.routeId) + '" (' + richRoute.health + '% salud).', 'crisis');
          }
        }
      }

      // 2d. Construcción silenciosa cuando jugador es más fuerte
      if (powerRatio > 1.4 && !nation.atWar && personality.expansionWeight > 0.5) {
        nation.army = Math.floor((nation.army||300) * 1.10);
      }

      // 3. DECIDIR ACCIÓN (con prob ajustada por powerRatio)
      const action = this.decideAction(state, nation, personality, strengthRatio, playerWeakness, powerRatio);
      this.executeAction(state, nation, action);

      // 4. CRECIMIENTO INTERNO DE IA
      this.growInternally(nation);
    });
  },

  updateRelation(state, nation, personality, playerWeakness, playerStrong) {
    let delta = 0;

    // Decay natural según personalidad
    if (personality === this.personalities.agresiva) delta -= 1;
    if (personality === this.personalities.aislacionista) delta += 0.5; // estable

    // El jugador en guerra con alguien que la IA no quiere → mejorar relación con jugador
    // (simplificado: si estabilidad baja del jugador, la IA oportunista mejora para luego traicionar)
    if (nation.personality === 'oportunista' && playerWeakness) {
      delta += 2; // se acerca cuando el jugador está débil para traicionar
      nation.aggressionLevel += 1;
    }

    if (playerStrong && nation.personality === 'agresiva') {
      delta += 1; // la agresiva respeta la fuerza temporalmente
    }

    // Si la IA está en guerra, las relaciones se deterioran
    if (nation.atWar) {
      delta -= 3;
      nation.warTurns++;
      if (nation.warTurns > 6) {
        // La IA busca paz si la guerra dura mucho
        nation.atWar = false;
        nation.warTurns = 0;
        nation.relation += 10;
        Systems.Log.add(state, `${nation.name} te propone un armisticio después de una larga guerra.`, 'warn');
      }
    }

    nation.relation = Math.max(-100, Math.min(100, nation.relation + delta));
  },

  decideAction(state, nation, personality, strengthRatio, playerWeakness, powerRatio) {
    const roll = Math.random();

    // GUERRA: condiciones para atacar
    const canAttack = nation.relation < personality.warThreshold &&
                      strengthRatio > (1 - personality.riskTolerance) &&
                      !nation.atWar;

    if (canAttack && playerWeakness && roll < personality.riskTolerance * 0.4) {
      return 'attack';
    }

    // TRAICIÓN: oportunista traiciona si tenía tratado y ve debilidad extrema
    if (nation.personality === 'oportunista' &&
        nation.treaties.includes('alliance') &&
        playerWeakness &&
        nation.aggressionLevel > 3 &&
        roll < 0.3) {
      return 'betray';
    }

    // DIPLOMACIA: ofrecer acuerdo si la relación es media-alta
    if (nation.relation > 20 && !nation.atWar && roll < personality.diplomacyWeight * 0.3) {
      return 'offer_trade';
    }

    // EXPANSIÓN INTERNA: crecer ejército si tiene recursos
    if (nation.resources.gold > 150 && roll < personality.expansionWeight * 0.5) {
      return 'build_army';
    }

    return 'idle';
  },

  executeAction(state, nation, action) {
    switch(action) {
      case 'attack':
        this.launchAttack(state, nation);
        break;

      case 'betray':
        nation.treaties = nation.treaties.filter(t => t !== 'alliance');
        nation.relation -= 30;
        nation.atWar = true;
        nation.aggressionLevel = 0;
        Systems.Log.add(state, `¡${nation.name} HA TRAICIONADO la alianza y declara la guerra!`, 'crisis');
        break;

      case 'offer_trade':
        if (!nation.treaties.includes('trade')) {
          // Solo añade al log como propuesta, el jugador decide en diplomacia
          nation.pendingOffer = 'trade';
          Systems.Log.add(state, `${nation.name} te propone un acuerdo comercial.`, 'info');
        }
        break;

      case 'build_army':
        const recruit = Math.floor(nation.resources.gold / 20);
        nation.army += recruit;
        nation.resources.gold -= recruit * 20;
        break;

      case 'idle':
      default:
        // IA descansa, crece pasivamente
        break;
    }

    nation.lastAction = action;
  },

  launchAttack(state, nation) {
    const aiStrength = nation.army * (nation.morale / 100);
    const playerStrength = Systems.Military.calculateEffectiveStrength(state);
    const result = Systems.Military.resolveBattle(state, nation);

    nation.atWar = true;

    if (result.won) { // Jugador gana la defensa
      const aiCasualties = Math.floor(aiStrength * (0.2 + Math.random() * 0.3));
      nation.army = Math.max(0, nation.army - aiCasualties);
      nation.morale = Math.max(10, nation.morale - 15);
      nation.relation -= 20;
      Systems.Log.add(state, `¡${nation.name} ataca pero es rechazado! Sus bajas: ${aiCasualties}`, 'warn');
    } else { // IA gana, el jugador sufre
      state.army = Math.max(0, state.army - result.casualties);
      state.morale = Math.max(0, state.morale - 20);
      state.stability = Math.max(0, state.stability - 10);

      // Pierde territorio
      if (state.territories > 1) {
        state.territories--;
        state.resources.food = Math.max(0, state.resources.food - 100);
        Systems.Log.add(state, `¡${nation.name} conquista un territorio! Pierdes ${result.casualties} soldados.`, 'crisis');
      } else {
        Systems.Log.add(state, `¡${nation.name} ataca tu capital! Bajas: ${result.casualties}. ¡Peligro máximo!`, 'crisis');
      }
    }
  },

  growInternally(nation) {
    // Crecimiento pasivo de recursos IA
    nation.resources.food = Math.min(800, nation.resources.food + 30);
    nation.resources.gold = Math.min(600, nation.resources.gold + 20);
    nation.army = Math.max(100, Math.min(1200, nation.army + Math.floor(Math.random() * 10)));

    // Recuperación de moral
    if (nation.morale < 60) nation.morale = Math.min(60, nation.morale + 2);

    // Recuperación de estabilidad
    if (nation.stability < 50) nation.stability = Math.min(50, nation.stability + 1);
  },

  // ============================================================
  // ACCIÓN DE DIPLOMACIA DEL JUGADOR
  // ============================================================
  playerDiplomaticAction(state, nationId, action) {
    const nation = state.diplomacy.find(n => n.id === nationId);
    if (!nation) return;

    switch(action) {
      case 'gift':
        if (state.resources.gold >= 100) {
          state.resources.gold -= 100;
          nation.relation = Math.min(100, nation.relation + 20);
          Systems.Log.add(state, `Enviaste un regalo diplomático a ${nation.name}. Relación mejorada.`, 'good');
        }
        break;

      case 'demand_tribute': {
        // Cooldown de 15 turnos, máximo 3 veces por nación, consecuencias severas
        const lastTribTurn    = nation._lastTributeTurn || 0;
        const tributeCount    = nation._tributeCount || 0;
        const TRIB_COOLDOWN   = 15;
        const TRIB_MAX        = 3;

        if (nation.atWar) {
          Systems.Log.add(state, `No puedes pedir tributo mientras hay guerra con ${nation.name}.`, 'warn');
          break;
        }
        if (tributeCount >= TRIB_MAX) {
          Systems.Log.add(state, `${nation.name} ya no soportará más exigencias de tributo. Han llegado al límite.`, 'warn');
          break;
        }
        const cooldownLeft = TRIB_COOLDOWN - (state.turn - lastTribTurn);
        if (cooldownLeft > 0) {
          Systems.Log.add(state, `${nation.name} no puede pagar aún. Quedan ${cooldownLeft} turno(s) de tregua.`, 'warn');
          break;
        }
        if (nation.relation >= -10) {
          Systems.Log.add(state, `Las relaciones con ${nation.name} no son lo bastante tensas para exigir tributo (necesitas rel < -10).`, 'warn');
          break;
        }
        if (state.army < 400) {
          Systems.Log.add(state, `Tu ejército es demasiado pequeño para intimidar a ${nation.name}. Necesitas al menos 400 soldados.`, 'warn');
          break;
        }
        if (nation._tributePending) {
          Systems.Log.add(state, `Ya enviaste una exigencia de tributo a ${nation.name}. Espera su respuesta.`, 'warn');
          break;
        }
        nation._tributePending = true;
        nation._tributePendingTurn = state.turn;
        Systems.Log.add(state, `💰 Exigencia de tributo enviada a ${nation.name}. Respuesta en el siguiente turno.`, 'info');
        (function(){
          state.diplomacyInbox = state.diplomacyInbox || [];
          state.diplomacyInbox.push({
            id: 'diplo_' + Date.now() + Math.random(),
            nationId: nation.id,
            nationIcon: nation.icon || '🏳',
            nationName: nation.name,
            charName: nation.character ? nation.character.name : '',
            char: nation.character || null,
            text: 'Hemos recibido tu exigencia. Decidiremos si cumplimos... o resistimos.',
            turn: state.turn,
            read: false,
            options: [{label:'De acuerdo',action:'ignore',effect:''}]
          });
        })()
        break; // Early exit — response resolved in processPendingDiplomacy

        // Probabilidad: ejército propio vs rival, máx 75%
        const playerStr   = Systems.Military.calculateEffectiveStrength(state);
        const defenderStr = nation.army * (0.8 + Math.random() * 0.4);
        const successChance = Math.min(0.75, Math.max(0.1, playerStr / (playerStr + defenderStr)));
        const success = Math.random() < successChance;

        if (success) {
          // Tributo exitoso — cantidad basada en la relación de fuerzas
          const baseAmount  = 80 + Math.floor(successChance * 200);
          const amount      = baseAmount + Math.floor(Math.random() * 80);
          state.resources.gold  += amount;
          nation.relation        = Math.max(-100, nation.relation - 40);
          nation._lastTributeTurn = state.turn;
          nation._tributeCount   = tributeCount + 1;
          // Consecuencias: estabilidad baja (extorsión daña imagen), facción pueblo descontenta
          state.stability = Math.max(0, state.stability - 3);
          const pueblo = (state.factions||[]).find(f=>f.id==='pueblo');
          if (pueblo) pueblo.satisfaction = Math.max(0, pueblo.satisfaction - 8);
          const remaining = TRIB_MAX - (tributeCount + 1);
          var tributeMsg = '⛏️ ' + nation.name + ' paga ' + amount + ' de oro en tributo. Humillados (' + (remaining > 1 ? remaining + ' veces mas' : 'ultima vez') + ').';
          Systems.Log.add(state, tributeMsg, 'good');
          if (tributeCount + 1 >= TRIB_MAX) {
            Systems.Log.add(state, `⚠️ ${nation.name} no tolerará más tributos. Próxima exigencia declarará guerra.`, 'warn');
          }
        } else {
          // Fracaso — guerra inevitable
          nation.relation = Math.max(-100, nation.relation - 25);
          nation.atWar    = true;
          state.morale    = Math.max(0, state.morale - 5);
          Systems.Log.add(state, `💀 ${nation.name} rechaza el tributo con ira. ¡Declara la guerra!`, 'crisis');
          if (typeof BattleSystem !== 'undefined') BattleSystem.initBattle(state, nation);
        }
        break;
      }

      case 'propose_alliance':
        // Petición asíncrona: se registra y se resuelve el siguiente turno
        if (nation._alliancePending) {
          Systems.Log.add(state, `Ya hay una propuesta de alianza pendiente con ${nation.name}. Espera su respuesta.`, 'warn');
          break;
        }
        if (nation.allied) {
          Systems.Log.add(state, `${nation.name} ya es tu aliado.`, 'warn');
          break;
        }
        nation._alliancePending = true;
        nation._alliancePendingTurn = state.turn;
        Systems.Log.add(state, `📨 Propuesta de alianza enviada a ${nation.name}. Respuesta en el siguiente turno.`, 'info');
        // Añadir mensaje diplomático de confirmación
        (function(){
          state.diplomacyInbox = state.diplomacyInbox || [];
          state.diplomacyInbox.push({
            id: 'diplo_' + Date.now() + Math.random(),
            nationId: nation.id,
            nationIcon: nation.icon || '🏳',
            nationName: nation.name,
            charName: nation.character ? nation.character.name : '',
            char: nation.character || null,
            text: 'Recibimos tu propuesta. Deliberaremos y responderemos pronto.',
            turn: state.turn,
            read: false,
            options: [{label:'Entendido',action:'ignore',effect:''}]
          });
        })()
        break;

      case 'declare_war':
        nation.atWar = true;
        nation.relation = Math.max(-100, nation.relation - 40);
        Systems.Log.add(state, `Declaras la guerra a ${nation.name}.`, 'warn');
        break;

      case 'sue_peace':
        if (nation.atWar) {
          const peaceCost = Math.floor(Math.random() * 200) + 100;
          if (state.resources.gold >= peaceCost) {
            state.resources.gold -= peaceCost;
            nation.atWar = false;
            nation.warTurns = 0;
            nation.relation += 10;
            Systems.Log.add(state, `${nation.name} acepta la paz por ${peaceCost} oro.`, 'good');
          } else {
            Systems.Log.add(state, `No tienes suficiente oro para la paz. Necesitas ${peaceCost}.`, 'warn');
          }
        }
        break;
    }
  }
};
