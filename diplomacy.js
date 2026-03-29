// ============================================================
// IMPERIUM — DIPLOMACY.JS
// Sistema de diplomacia activa:
// • Personajes únicos por nación (nombre, cargo, retrato emoji)
// • Mensajes por turno con opciones de respuesta
// • Ceder territorios (proactivo + demandas)
// • Panel de nación ampliado con relación, ejército, gobernador
// ============================================================

// ── GOBERNADORES / PERSONAJES POR NACIÓN ──────────────────
const NATION_CHARACTERS = {
  // id del pool → personaje embajador
  'ai_1': [
    { name:'Vorkan el Implacable',  role:'Gran Caudillo',      portrait:'⚔️', trait:'agresiva'  },
    { name:'Darius el Conquistador',role:'Señor de la Guerra', portrait:'🗡️', trait:'agresiva'  }
  ],
  'ai_2': [
    { name:'Lady Seraphina',        role:'Cónsul Suprema',     portrait:'⚖️', trait:'diplomática'},
    { name:'Marcus Bellator',       role:'Senador Plenipotenciario', portrait:'📜', trait:'diplomática'}
  ],
  'ai_3': [
    { name:'Xotl el Astuto',        role:'Jefe de Clan',       portrait:'🌿', trait:'oportunista'},
    { name:'Keira Dos Mundos',      role:'Chamana Mayor',      portrait:'🔮', trait:'oportunista'}
  ],
  'ai_4': [
    { name:'Al-Rashid Ibn Yusuf',   role:'Gran Visir',         portrait:'🌙', trait:'agresiva'  },
    { name:'Sultán Mehmed el Pío',  role:'Señor del Sultanato',portrait:'👑', trait:'agresiva'  }
  ],
  'ai_5': [
    { name:'Gilda Tesoro',          role:'Maestra de Gremios', portrait:'💎', trait:'diplomática'},
    { name:'Roderic el Banquero',   role:'Cónsul Mercantil',   portrait:'⚓', trait:'diplomática'}
  ],
  'ai_6': [
    { name:'Ragnar Colmillo Roto',  role:'Jarl Supremo',       portrait:'🐺', trait:'agresiva'  },
    { name:'Sigrid la Furiosa',     role:'Skald de la Batalla',portrait:'🪓', trait:'agresiva'  }
  ],
  'ai_7': [
    { name:'Zhang Wei el Eterno',   role:'Canciller Imperial', portrait:'🐉', trait:'oportunista'},
    { name:'Li Bao Celestial',      role:'Mandarín de Jade',   portrait:'🏯', trait:'oportunista'}
  ]
};

// ── MENSAJES POR PERSONALIDAD Y SITUACIÓN ─────────────────
const DIPLOMACY_MESSAGES = {
  agresiva: {
    turn_start: [
      'Nuestros ejércitos se preparan. ¿Tienes algo que ofrecernos, o seguimos avanzando?',
      'La fuerza es el único lenguaje que entendemos. Demuestra la tuya.',
      'Los débiles piden paz. Los fuertes la imponen. ¿Cuál eres tú?',
      'Hemos observado tu reino. Parece... apetecible.',
      'Más vale que fortifiques tus fronteras. Los tiempos cambian.'
    ],
    at_war: [
      'La guerra entre nosotros es inevitable. Entrégate o lucha.',
      'Cada turno que pasa, más de tus súbditos se arrodillan ante nosotros.',
      'Pide la paz ahora y conservarás algo. Espera y perderás todo.'
    ],
    high_relation: [
      'Has demostrado ser digno de respeto. Por ahora.',
      'Tu fuerza nos complace. Sigamos siendo... civilizados.',
      'Quizás hay espacio para algo más que tolerancia entre nosotros.'
    ],
    low_relation: [
      'No te queremos cerca. Mantén tus tropas al otro lado del río.',
      'Nuestros exploradores han cruzado tu frontera. Accidentalmente.',
      'Alguien en tu corte nos ha insultado. Exigimos disculpas.'
    ],
    wants_territory: [
      'Esa región al norte... nos vendría bien. Cédela.',
      'Conocemos el valor de ese territorio. Te pagaremos... o lo tomaremos.',
      'Queremos expandirnos. Tu mapa tiene un hueco que podemos llenar.'
    ],
    offers_alliance: [
      'Juntos seríamos imparables. Considera aliarte con nosotros.',
      'Propongo un pacto de no agresión. Por ahora.'
    ]
  },
  diplomática: {
    turn_start: [
      'Que este mensaje te encuentre en prosperidad. Tenemos propuestas interesantes.',
      'Nuestros comerciantes hablan maravillas de tus territorios.',
      'Una nueva era de cooperación podría beneficiarnos a ambos.',
      'Los tiempos cambian. La alianza hoy puede ser la salvación mañana.',
      'Extendemos nuestra mano. ¿La recibes?'
    ],
    at_war: [
      'Esta guerra nos empobrece a ambos. Reflexionemos sobre la paz.',
      'Propongo un armisticio. Las condiciones son negociables.',
      'Nuestros pueblos no merecen este sufrimiento. Dialoguemos.'
    ],
    high_relation: [
      'La amistad entre nuestros reinos florece. Propongamos algo más formal.',
      'Estamos muy satisfechos con nuestra colaboración. ¿Profundizamos?',
      'Los lazos que nos unen son fuertes. Hagámoslos indestructibles.'
    ],
    low_relation: [
      'Nuestra relación se ha enfriado. ¿Podemos remediar esto?',
      'Hemos notado ciertas tensiones. Propongo una reunión.',
      'Hay malentendidos entre nosotros. Hablemos antes de que escalen.'
    ],
    wants_territory: [
      'Esa región nos daría acceso a rutas comerciales vitales. ¿Negociamos?',
      'Ofrecemos compensación generosa por cierto territorio. Piénsalo.'
    ],
    offers_alliance: [
      'Una alianza formal entre nosotros traería estabilidad a la región.',
      'Propongo una alianza económica. Los beneficios serían mutuos.',
      'Unidos seríamos más prósperos. ¿Qué condiciones propones?'
    ]
  },
  oportunista: {
    turn_start: [
      'Los tiempos son... interesantes. ¿Aprovechamos juntos la situación?',
      'Hemos observado el tablero. Hay movimientos que convienen a ambos.',
      'La fortuna favorece a los audaces. ¿Eres audaz?',
      'Ciertas circunstancias nos hacen más... compatibles que antes.',
      'El equilibrio de poder cambia. Posicionémonos bien.'
    ],
    at_war: [
      'Esta guerra es costosa. Pero podría resultarnos rentable a ambos...',
      'Hay formas de terminar esto que benefician más a unos que a otros.',
      'Propongo un acuerdo secreto. Lo que el mapa muestre será distinto de la realidad.'
    ],
    high_relation: [
      'Nuestra colaboración ha sido fructífera. Llevémosla más lejos.',
      'Confío en ti más de lo que confío en la mayoría. Es un cumplido.',
      'Hay una oportunidad que solo podemos aprovechar juntos.'
    ],
    low_relation: [
      'Hemos tomado caminos distintos. Quizás convenga reconsiderar.',
      'Lo pasado, pasado está. Miremos hacia el futuro... y sus posibilidades.',
      'Ciertos eventos han cambiado mi perspectiva sobre nuestras relaciones.'
    ],
    wants_territory: [
      'Esa zona no te aporta gran cosa. A nosotros sí. ¿Hay trato?',
      'Hacemos una oferta por ese territorio. Temporal o permanente, como prefieras.'
    ],
    offers_alliance: [
      'Una alianza de conveniencia. Sin ataduras sentimentales.',
      'Propongo un acuerdo. Beneficios mutuos, compromisos mínimos.'
    ]
  }
};

// ── SISTEMA DE MENSAJERÍA ─────────────────────────────────
const DiplomacySystem = {

  // Inicializar personaje de cada nación
  initCharacters(state) {
    if (!state.diplomacy) return;
    state.diplomacy.forEach((nation, i) => {
      if (!nation.character) {
        const natId   = 'ai_' + (i+1);
        const pool    = NATION_CHARACTERS[natId] || NATION_CHARACTERS['ai_1'];
        const seed    = (state.mapSeed || 42) + i * 7;
        nation.character = pool[seed % pool.length];
        nation.messageHistory = [];
        nation._lastTributeTurn = 0;
      }
    });
  },

  // Generar mensajes al final de turno
  generateTurnMessages(state) {
    if (!state.diplomacy) return;
    const newMessages = [];

    state.diplomacy.forEach((nation, i) => {
      // Probabilidad base de mensaje según situación
      const personality = nation.personality || 'diplomática';
      const msgs = DIPLOMACY_MESSAGES[personality] || DIPLOMACY_MESSAGES.diplomática;
      let pool = null;
      let msgType = null;

      if (nation.atWar) {
        if (Math.random() < 0.7) { pool = msgs.at_war; msgType = 'war'; }
      } else if (nation.relation >= 50) {
        if (Math.random() < 0.35) { pool = msgs.high_relation; msgType = 'friendly'; }
        if (Math.random() < 0.2)  { pool = msgs.offers_alliance; msgType = 'alliance'; }
      } else if (nation.relation <= -20) {
        if (Math.random() < 0.4) { pool = msgs.low_relation; msgType = 'tension'; }
        if (Math.random() < 0.25) { pool = msgs.wants_territory; msgType = 'territory_demand'; }
      } else {
        if (Math.random() < 0.3) { pool = msgs.turn_start; msgType = 'general'; }
      }

      if (!pool || !pool.length) return;
      const text = pool[Math.floor(Math.random() * pool.length)];
      const char = nation.character || { name: 'Embajador', role: 'Enviado', portrait: '📜' };

      const msg = {
        id:         'msg_' + state.turn + '_' + i,
        nationId:   nation.id,
        nationName: nation.name,
        nationIcon: nation.icon,
        char:       char,
        text:       text,
        type:       msgType,
        turn:       state.turn,
        read:       false,
        // Opciones de respuesta según tipo
        options:    this._getResponseOptions(msgType, nation, state)
      };

      if (!state.diplomacyInbox) state.diplomacyInbox = [];
      state.diplomacyInbox.push(msg);
      if (state.diplomacyInbox.length > 30) state.diplomacyInbox.shift();

      newMessages.push(msg);
      if (!nation.messageHistory) nation.messageHistory = [];
      nation.messageHistory.push({ turn: state.turn, type: msgType, text: text.substring(0,60) });
      if (nation.messageHistory.length > 10) nation.messageHistory.shift();
    });

    return newMessages;
  },

  _getResponseOptions(type, nation, state) {
    const base = [
      { label: '✉️ Ignorar',           action: 'ignore',          effect: '' }
    ];
    switch(type) {
      case 'war':
        return [
          { label: '🕊️ Pedir paz',       action: 'sue_peace',       effect: 'Intenta negociar paz (-100💰)' },
          { label: '⚔️ Continuar guerra', action: 'ignore',          effect: 'La guerra sigue' },
          { label: '🏳️ Rendirse',        action: 'surrender',       effect: 'Cedes una región, termina la guerra' }
        ];
      case 'alliance':
        return [
          { label: '🤝 Aceptar alianza', action: 'propose_alliance', effect: 'Relación +15, pacto de defensa' },
          { label: '❌ Rechazar',         action: 'ignore',           effect: 'Relación -5' }
        ];
      case 'territory_demand':
        return [
          { label: '🗺️ Ceder territorio', action: 'cede_territory',  effect: 'Cedes una región, relación +25' },
          { label: '💰 Ofrecer oro',      action: 'offer_gold',       effect: '-200💰, relación +10' },
          { label: '⚔️ Rechazar',         action: 'reject_demand',    effect: 'Relación -20, riesgo guerra' }
        ];
      case 'friendly':
        return [
          { label: '🎁 Enviar regalo',    action: 'gift',             effect: '-100💰, relación +10' },
          { label: '📜 Responder cortés', action: 'ignore',           effect: '' }
        ];
      default:
        return base;
    }
  },

  // Responder a un mensaje
  respondToMessage(state, msgId, action) {
    if (!state.diplomacyInbox) return;
    const msg = state.diplomacyInbox.find(m => m.id === msgId);
    if (!msg) return;
    msg.read = true;

    const nation = (state.diplomacy||[]).find(n => n.id === msg.nationId);
    if (!nation) return;

    switch(action) {
      case 'sue_peace':
        if (state.resources.gold >= 100) {
          state.resources.gold -= 100;
          nation.atWar = false;
          nation.relation = Math.min(100, nation.relation + 20);
          Systems.Log.add(state, `🕊️ Paz firmada con ${nation.name}. Coste: 100💰`, 'good');
        } else {
          Systems.Log.add(state, `⚠️ No tienes 100💰 para la paz.`, 'warn');
        }
        break;
      case 'surrender':
        this.cedeTerritoryTo(state, nation, 'auto');
        nation.atWar = false;
        nation.relation = Math.min(100, nation.relation + 15);
        Systems.Log.add(state, `🏳️ Te rendiste ante ${nation.name}. Se cede una región.`, 'crisis');
        break;
      case 'propose_alliance':
        nation.treaties = nation.treaties || [];
        if (!nation.treaties.includes('alliance')) {
          nation.treaties.push('alliance');
          nation.relation = Math.min(100, nation.relation + 15);
          Systems.Log.add(state, `🤝 Alianza con ${nation.name} formalizada.`, 'good');
        }
        break;
      case 'cede_territory':
        this.cedeTerritoryTo(state, nation, 'auto');
        nation.relation = Math.min(100, nation.relation + 25);
        Systems.Log.add(state, `🗺️ Cediste una región a ${nation.name}. Relación mejora.`, 'warn');
        break;
      case 'offer_gold':
        if (state.resources.gold >= 200) {
          state.resources.gold -= 200;
          nation.relation = Math.min(100, nation.relation + 10);
          Systems.Log.add(state, `💰 Ofreciste 200 oro a ${nation.name} como compensación.`, 'good');
        } else {
          Systems.Log.add(state, `⚠️ No tienes 200💰 para la oferta.`, 'warn');
        }
        break;
      case 'reject_demand':
        nation.relation = Math.max(-100, nation.relation - 20);
        if (Math.random() < 0.4) {
          nation.atWar = true;
          Systems.Log.add(state, `⚔️ ${nation.name} declara guerra al ver rechazada su demanda.`, 'crisis');
        } else {
          Systems.Log.add(state, `😤 ${nation.name} está indignada por el rechazo.`, 'warn');
        }
        break;
      case 'gift':
        if (state.resources.gold >= 100) {
          state.resources.gold -= 100;
          nation.relation = Math.min(100, nation.relation + 10);
          Systems.Log.add(state, `🎁 Regalo enviado a ${nation.name}. Relación +10.`, 'good');
        }
        break;
      default:
        break;
    }

    if (typeof UI !== 'undefined') UI.fullRender(state);
    if (typeof AlthoriаMap !== 'undefined') AlthoriаMap.sync(state);
  },

  // ── CEDER TERRITORIO ──────────────────────────────────────
  // Jugador cede una región de Althoria a una nación
  cedeTerritoryTo(state, nation, regionId) {
    if (!state || !nation) return { ok:false, msg:'Estado inválido' };
    const nationIdx = (state.diplomacy||[]).indexOf(nation);
    const natId     = 'ai_' + (nationIdx+1);

    let regionToCede = null;
    if (regionId === 'auto' || !regionId) {
      // Ceder la región más alejada de la capital
      const playerZones = (typeof AlthoriаMap !== 'undefined') ? (AlthoriаMap.nationZones['player']||[]) : [];
      if (!playerZones.length) return { ok:false, msg:'No tienes regiones que ceder' };
      regionToCede = playerZones[playerZones.length-1]; // la última (más periférica)
    } else {
      regionToCede = regionId;
    }

    if (typeof AlthoriаMap !== 'undefined') {
      const pz = AlthoriаMap.nationZones['player'] || [];
      const nz = AlthoriаMap.nationZones[natId]    || [];
      const idx = pz.indexOf(regionToCede);
      if (idx > -1) {
        pz.splice(idx, 1);
        nz.push(regionToCede);
        state.althoriaRegions = pz.length;
        AlthoriаMap.sync(state);
      }
    }
    return { ok:true, regionId: regionToCede };
  },

  // Ceder territorio proactivamente (llamado desde UI)
  playerCedeTerritory(state, nationId, regionId) {
    const nation = (state.diplomacy||[]).find(n => n.id === nationId);
    if (!nation) return;
    const result = this.cedeTerritoryTo(state, nation, regionId);
    if (result.ok) {
      nation.relation = Math.min(100, nation.relation + 20);
      Systems.Log.add(state, `🗺️ Cediste una región a ${nation.name}. Relación +20.`, 'warn');
      UI.fullRender(state);
    } else {
      Systems.Log.add(state, `⚠️ ${result.msg}`, 'warn');
    }
  },

  // ── RENDER PANEL DE NACIÓN AMPLIADO ──────────────────────
  renderNationCard(nation, state, natIdx) {
    const natId     = 'ai_' + (natIdx+1);
    const char      = nation.character || { name:'Embajador', role:'Enviado', portrait:'📜', trait:'diplomática' };
    const relColor  = nation.relation >  50 ? 'var(--green2)' :
                      nation.relation >  10 ? 'var(--text2)'  :
                      nation.relation > -20 ? 'var(--gold)'   : 'var(--red2)';
    const relLabel  = nation.relation >  50 ? '🤝 Aliado'     :
                      nation.relation >  20 ? '😊 Amistoso'   :
                      nation.relation > -10 ? '😐 Neutral'    :
                      nation.relation > -40 ? '😤 Hostil'     : '⚔️ ENEMIGO';
    const warBadge  = nation.atWar ? '<span class="war-badge">⚔️ EN GUERRA</span>' : '';
    const relBar    = Math.max(0, Math.min(100, nation.relation + 100)) / 2; // 0-50 → 0-100%

    // Fiabilidad del dato de ejército
    const armyInfo  = nation.revealed
      ? `<span style="color:var(--green2)">🔍 ${nation.army.toLocaleString()} soldados <small>(verificado)</small></span>`
      : `<span style="color:var(--text3)">❓ ~${Math.round(nation.army/100)*100} soldados <small>(estimado ±40%)</small></span>`;

    // Rutas comerciales activas con esta nación
    const activeRoutes = (state.activeTradeRoutes||[]).filter(r=>r.nationId===nation.id);
    const routesHtml   = activeRoutes.length
      ? activeRoutes.map(r=>`<span class="diplo-route-tag">${(TRADE_ROUTES[r.routeId]||{icon:'🤝'}).icon} ${(TRADE_ROUTES[r.routeId]||{name:r.routeId}).name}</span>`).join('')
      : '<span style="color:var(--text3);font-size:10px">Sin rutas</span>';

    // Mensajes recientes
    const inbox = (state.diplomacyInbox||[]).filter(m=>m.nationId===nation.id&&!m.read);
    const inboxBadge = inbox.length ? `<span class="diplo-inbox-badge">${inbox.length}</span>` : '';

    // Regiones de Althoria controladas
    const natZones = (typeof AlthoriаMap!=='undefined') ? (AlthoriаMap.nationZones[natId]||[]).length : '?';

    // Historial breve
    const histHtml = (nation.messageHistory||[]).slice(-3).reverse().map(h=>
      `<div class="diplo-hist-row"><span class="dhr-turn">T${h.turn}</span><span class="dhr-text">${h.text}</span></div>`
    ).join('');

    // Ceder territorio — solo si tengo más de 1 región
    const playerZones = (typeof AlthoriаMap!=='undefined') ? (AlthoriаMap.nationZones['player']||[]) : [];
    const cedeHtml = playerZones.length > 1 ? `
      <button class="diplo-btn warn" onclick="DiplomacySystem.playerCedeTerritory(Game.state,'${nation.id}',null)"
        title="Cedes tu región más periférica. Relación +20.">🗺️ Ceder Región</button>` : '';

    return `
    <div class="diplo-nation-card" id="diplo-${natId}">
      <!-- Cabecera: retrato + info básica -->
      <div class="dnc-header">
        <div class="nation-portrait">${char.portrait}</div>
        <div class="dnc-info">
          <div class="dnc-name">${nation.icon} ${nation.name} ${warBadge} ${inboxBadge}</div>
          <div class="dnc-char">${char.name} <span class="dnc-role">· ${char.role}</span></div>
          <div class="dnc-gov" style="font-size:10px;color:var(--text3)">${nation.government||'Desconocido'} · ${nation.personality}</div>
        </div>
      </div>

      <!-- Relación con barra ──────────── -->
      <div class="dnc-section">
        <div class="dnc-row">
          <span>Relación</span>
          <span style="color:${relColor};font-weight:bold">${relLabel} (${nation.relation>0?'+':''}${nation.relation})</span>
        </div>
        <div class="diplo-rel-bar">
          <div class="diplo-rel-fill" style="width:${relBar}%;background:${relColor}"></div>
        </div>
      </div>

      <!-- Ejército + Regiones ───────────── -->
      <div class="dnc-section">
        <div class="dnc-row">⚔️ Ejército: ${armyInfo}</div>
        <div class="dnc-row">🗺️ Regiones: <b style="color:var(--gold2)">${natZones}</b> zonas de Althoria</div>
      </div>

      <!-- Rutas comerciales ─────────────── -->
      <div class="dnc-section">
        <div class="dnc-label">📦 Comercio activo</div>
        <div class="diplo-routes-row">${routesHtml}</div>
      </div>

      <!-- Análisis de batalla ──────────── -->
      <div class="dnc-section">
        ${this._renderBattleAnalysis(state, nation)}
      </div>

      <!-- Acciones diplomáticas ────────── -->
      <div class="dnc-actions">
        <button class="diplo-btn" onclick="AI.playerDiplomaticAction(Game.state,'${nation.id}','gift');UI.fullRender(Game.state)" title="Cuesta 100💰. Mejora relación +15.">🎁 Regalo</button>
        <button class="diplo-btn" onclick="AI.playerDiplomaticAction(Game.state,'${nation.id}','propose_alliance');UI.fullRender(Game.state)" title="Propone alianza si rel>30">🤝 Alianza</button>
        ${nation.atWar
          ? `<button class="diplo-btn warn" onclick="AI.playerDiplomaticAction(Game.state,'${nation.id}','sue_peace');UI.fullRender(Game.state)">🕊️ Paz</button>`
          : `<button class="diplo-btn danger" onclick="Game.declareWar('${nation.id}')">⚔️ Guerra</button>`
        }
        <button class="diplo-btn" onclick="AI.playerDiplomaticAction(Game.state,'${nation.id}','demand_tribute');UI.fullRender(Game.state)" title="Exige tributo si rel<0 y ejército>400. Cooldown 10 turnos.">💰 Tributo</button>
        ${cedeHtml}
      </div>


      <!-- Mensajes sin leer ──────────── -->
      ${inbox.length ? `
      <div class="dnc-inbox">
        <div class="dnc-label">✉️ Mensajes (${inbox.length})</div>
        ${inbox.slice(0,2).map(msg => `
          <div class="diplo-msg-item">
            <div class="dmi-text">"${msg.text}"</div>
            <div class="dmi-opts">
              ${(msg.options||[]).map(opt =>
                `<button class="diplo-btn ${opt.action==='ignore'?'':'primary'}" style="font-size:9px;padding:3px 7px"
                  onclick="DiplomacySystem.respondToMessage(Game.state,'${msg.id}','${opt.action}')"
                  title="${opt.effect}">${opt.label}</button>`
              ).join('')}
            </div>
          </div>`).join('')}
      </div>` : ''}

      <!-- Historial breve ──────────── -->
      ${histHtml ? `<div class="dnc-history">${histHtml}</div>` : ''}
    </div>`;
  },

  _renderBattleAnalysis(state, nation) {
    const analysis = Systems.Military.analyzeBattle(state, nation, !!nation.revealed);
    const wc       = analysis.winChance;
    const wColor   = wc > 65 ? 'var(--green2)' : wc > 45 ? 'var(--gold)' : 'var(--red2)';
    return `<div class="dnc-row" style="font-family:var(--font-mono);font-size:10px">
      📊 Victoria: <b style="color:${wColor}">${wc}%</b>
      · Tu fuerza: <b>${analysis.attackerStrength.toLocaleString()}</b>
      · Rival: <b>${analysis.defenderStrength.toLocaleString()}</b>${!analysis.spyUsed?' <small style="color:var(--text3)">(±40%)</small>':''}
    </div>
    <div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin-top:2px">${analysis.recommendation}</div>`;
  },

  // ── RENDER INBOX GENERAL (panel de mensajes) ──────────────
  renderInbox(state) {
    const inbox = (state.diplomacyInbox||[]).filter(m=>!m.read).slice(-8).reverse();
    if (!inbox.length) return '<div class="diplo-no-msgs">Sin mensajes pendientes de otras naciones</div>';
    return inbox.map(msg => `
      <div class="diplo-msg-card">
        <div class="dmc-header">
          <span class="dmc-portrait">${msg.char.portrait}</span>
          <div>
            <div class="dmc-from">${msg.nationIcon} ${msg.nationName} · <span style="color:var(--text3)">${msg.char.name}, ${msg.char.role}</span></div>
            <div class="dmc-turn" style="font-size:9px;color:var(--text3)">Turno ${msg.turn}</div>
          </div>
        </div>
        <div class="dmc-text">"${msg.text}"</div>
        <div class="dmc-opts">
          ${(msg.options||[]).map(opt =>
            `<button class="diplo-btn ${opt.action==='ignore'?'':'primary'}" style="font-size:10px"
              onclick="DiplomacySystem.respondToMessage(Game.state,'${msg.id}','${opt.action}')"
              title="${opt.effect}">${opt.label}</button>`
          ).join('')}
        </div>
      </div>`).join('');
  }
};
