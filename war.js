// ============================================================
// IMPERIUM — WAR.JS
// Sistemas de guerra multi-turno, conquista de territorios
// y declaración basada en relación diplomática
// ============================================================

// ─────────────────────────────────────────────────────────────
// MODELO DE ESTADO DE GUERRA (por nación)
// nation._war = {
//   phase:       'preparing'|'active'|'decisive'|'ending',
//   turn:        Number,          // turnos de guerra transcurridos
//   momentum:    Number,          // -100 a +100 (+ = jugador ganando)
//   targetRegion: String,         // región objetivo actual
//   playerArmy:  Number,          // fuerzas comprometidas
//   enemyArmy:   Number,
//   goldBurn:    Number,          // oro gastado por turno
//   moraleHit:   Number,          // moral perdida por turno
//   canRetreat:  Boolean,
//   contested:   [regionId],      // regiones en disputa
// }
// ─────────────────────────────────────────────────────────────

window.WarSystem = window.WarSystem || {

  MIN_TURNS: 3,

  // ── Iniciar guerra multi-turno ──────────────────────────────
  startWar(state, nation, targetRegionId) {
    if (nation._war) return; // Ya en guerra con esta nación

    const playerStr  = state.army * (state.morale / 100);
    const enemyStr   = (nation.army || 400) * ((nation.morale || 70) / 100);
    const commitment = Math.min(state.army * 0.4, 600); // Tropas comprometidas

    nation._war = {
      phase:        'preparing',
      turn:         0,
      momentum:     0,           // Neutral al inicio
      targetRegion: targetRegionId || this._pickTargetRegion(nation),
      playerArmy:   commitment,
      enemyArmy:    enemyStr * 0.6,
      goldBurn:     Math.floor(commitment * 0.15),   // 15% del ejército comprometido en oro
      moraleHit:    5,
      canRetreat:   true,
      contested:    [],
      log:          [],
    };

    // Deducir tropas comprometidas
    state.army = Math.max(0, state.army - commitment);

    // Primeras regiones en disputa
    const zones = (typeof AlthoriaMap !== 'undefined')
      ? (AlthoriaMap.nationZones[nation.id] || [])
      : [];
    if (zones.length) nation._war.contested = [zones[0]];

    Systems.Log.add(state, `⚔️ Guerra contra ${nation.name} iniciada. Objetivo: ${nation._war.targetRegion}. Tropas comprometidas: ${Math.floor(commitment)}.`, 'crisis');
    Progression.awardXP(state, 'first_war');
  },

  // ── Procesar turno de guerra (llamado en endTurn) ──────────
  processTurn(state, nation) {
    if (!nation._war || !nation.atWar) return;
    const w = nation._war;
    w.turn++;

    // 0. MODIFICADORES REALISTAS (moral, deserción, corrupción)
    if (typeof RealisticWarModifiers !== 'undefined') RealisticWarModifiers.applyTurnModifiers(state, nation);

    // 1. CONSUMO DE RECURSOS
    const goldCost  = w.goldBurn + Math.floor(w.turn * 8);    // Escala con la duración
    const troopLoss = Math.floor(w.playerArmy * 0.06 * (1 - w.momentum / 200));
    const moraleLoss = w.moraleHit + Math.floor(w.turn * 1.5);

    state.resources.gold = Math.max(0, state.resources.gold - goldCost);
    state.army           = Math.max(0, state.army - troopLoss);
    w.playerArmy         = Math.max(0, w.playerArmy - troopLoss);
    state.morale         = Math.max(0, Math.min(100, state.morale - moraleLoss));

    // 2. CÁLCULO DE MOMENTUM (quién gana terreno)
    const playerPow = w.playerArmy * (state.morale / 100) * (1 + state._fortifiedBonus || 0);
    const enemyPow  = w.enemyArmy  * 0.9;  // IA no mejora tan rápido
    const ratio     = playerPow / Math.max(1, playerPow + enemyPow);
    const swing     = (ratio - 0.5) * 40;  // -20 a +20 por turno
    const noise     = (Math.random() - 0.5) * 15; // Azar táctico
    w.momentum      = Math.max(-100, Math.min(100, w.momentum + swing + noise));

    // 3. BAJAS ENEMIGAS (proporcional a momentum positivo)
    if (w.momentum > 0) {
      w.enemyArmy = Math.max(50, w.enemyArmy - Math.floor(w.momentum * 0.8));
    }

    // 4. AVANZAR DE FASE
    if (w.turn === 1) w.phase = 'active';
    if (w.turn >= 3 && Math.abs(w.momentum) > 50) w.phase = 'decisive';
    if (w.turn >= 6) w.phase = 'ending';

    // 5. LOG NARRATIVO
    const msg = this._buildTurnLog(w, troopLoss, goldCost, nation.name);
    w.log.push(msg);
    Systems.Log.add(state, msg, w.momentum > 10 ? 'good' : w.momentum < -10 ? 'crisis' : 'warn');

    // 6. VERIFICAR RESOLUCIÓN
    this._checkResolution(state, nation);
  },

  // ── Verificar si la guerra termina ─────────────────────────
  _checkResolution(state, nation) {
    const w = nation._war;
    if (!w) return;

    // Derrota: jugador sin tropas o momentum muy negativo por 3 turnos
    if (w.playerArmy <= 50 || (w.momentum < -70 && w.turn >= 3)) {
      this._resolveLoss(state, nation);
      return;
    }

    // Victoria: momentum muy positivo en fase decisiva
    if (w.phase === 'decisive' && w.momentum > 65) {
      this._resolveVictory(state, nation);
      return;
    }

    // Victoria por agotamiento enemigo
    if (w.enemyArmy <= 80 && w.turn >= 3) {
      this._resolveVictory(state, nation);
      return;
    }

    // Paz forzada por duración
    if (w.turn >= 8) {
      this._resolvePeace(state, nation);
    }
  },

  // ── Victoria: conquistar territorio ────────────────────────
  _resolveVictory(state, nation) {
    const w = nation._war;

    // Devolver tropas supervivientes
    state.army += Math.floor(w.playerArmy * 0.7);

    // CONQUISTAR TERRITORIO
    const conquered = TerritorySystem.conquer(state, nation, w.targetRegion);

    // Impacto diplomático
    state.diplomacy.forEach(n => {
      if (n.id !== nation.id) n.relation = Math.max(-100, n.relation - 15);
    });

    state.morale = Math.min(100, state.morale + 20);
    Progression.awardXP(state, 'battle_won');

    // ── Contadores de victoria para objetivos ocultos ──
    state._warsWon = (state._warsWon || 0) + 1;
    state._winsAgainst = state._winsAgainst || {};
    state._winsAgainst[nation.id] = (state._winsAgainst[nation.id] || 0) + 1;

    // Record war summary
    this._recordSummary(state, nation, w, true, conquered);
    Systems.Log.add(state, `🏆 Victoria contra ${nation.name}! ${conquered ? 'Territorio '+conquered+' conquistado.' : 'Nación sometida.'}`, 'good');

    this._endWar(state, nation);
  },

  // ── Derrota ─────────────────────────────────────────────────
  _resolveLoss(state, nation) {
    const w = nation._war;
    state.stability  = Math.max(0, state.stability - 20);
    state.morale     = Math.max(0, state.morale - 25);
    // Perder una región nuestra
    TerritorySystem.loseRegion(state, nation);
    Progression.awardXP(state, 'battle_lost');
    this._recordSummary(state, nation, w, false, null);
    Systems.Log.add(state, `💀 Derrota contra ${nation.name}. Territorio perdido.`, 'crisis');
    this._endWar(state, nation);
  },

  // ── Paz negociada ───────────────────────────────────────────
  _resolvePeace(state, nation) {
    const w = nation._war;
    state.army += Math.floor(w.playerArmy * 0.5);
    nation.relation = Math.max(-100, nation.relation + 10);
    state.morale    = Math.max(0, state.morale - 10);
    Systems.Log.add(state, `🕊️ Armisticio con ${nation.name} tras ${w.turn} turnos de guerra.`, 'warn');
    this._endWar(state, nation);
  },

  _recordSummary(state, nation, w, victory, conqueredRegion) {
    const summary = {
      nationName:       nation.name,
      victory,
      turns:            w.turn,
      troopsLost:       Math.floor((w.playerArmy || 0) * 0.3 + w.turn * 15),
      goldSpent:        Math.floor(w.goldBurn * w.turn + w.turn * 30),
      territoriesGained: victory && conqueredRegion ? 1 : 0,
      territoriesLost:  !victory ? 1 : 0,
      stabilityChange:  victory ? +10 : -20,
      moraleChange:     victory ? +20 : -25,
    };
    state._warSummaries = state._warSummaries || [];
    state._warSummaries.unshift(summary);
    if (state._warSummaries.length > 3) state._warSummaries.pop();
  },

  _endWar(state, nation) {
    nation.atWar  = false;
    nation.warTurns = 0;
    delete nation._war;
    Systems.Trade.closeRoutesForNation(state, nation.id);
    if (typeof AlthoriaMap !== 'undefined') AlthoriaMap.updateWar(state);
  },

  // ── Retirada táctica ────────────────────────────────────────
  retreat(state, nationId) {
    const nation = state.diplomacy.find(n => n.id === nationId);
    if (!nation?._war?.canRetreat) return;
    const w = nation._war;
    // Recuperar 40% de las tropas comprometidas
    state.army += Math.floor(w.playerArmy * 0.4);
    w.momentum  = Math.max(-100, w.momentum - 30); // Penalización por retirada
    w.canRetreat = false; // Solo una retirada por guerra
    Systems.Log.add(state, `↩️ Retirada táctica de ${nation.name}. Momentum caído.`, 'warn');
    this._resolveLoss(state, nation);
  },

  // ── Refuerzo ────────────────────────────────────────────────
  reinforce(state, nationId, troops) {
    const nation = state.diplomacy.find(n => n.id === nationId);
    if (!nation?._war) return;
    const t = Math.min(troops || 200, state.army);
    state.army     -= t;
    nation._war.playerArmy += t;
    nation._war.momentum   += 15;
    Systems.Log.add(state, `➕ Refuerzo enviado a frente ${nation.name}: +${t} tropas.`, 'good');
    if (typeof UI !== 'undefined') UI.fullRender(state);
  },

  _buildTurnLog(w, troopLoss, goldCost, name) {
    const phase = { preparing:'⚔️', active:'🔥', decisive:'💥', ending:'🏳️' }[w.phase] || '⚔️';
    const trend = w.momentum > 20 ? 'ganando terreno' : w.momentum < -20 ? 'perdiendo terreno' : 'en tablas';
    return `${phase} T${w.turn} vs ${name}: ${trend} (momentum ${w.momentum>0?'+':''}${Math.round(w.momentum)}). −${Math.round(troopLoss)} tropas, −${goldCost}💰.`;
  },

  _pickTargetRegion(nation) {
    if (typeof AlthoriaMap === 'undefined') return 'frontera';
    const zones = AlthoriaMap.nationZones[nation.id] || [];
    return zones[0] || 'territorio_desconocido';
  },

  // ── UI: Panel de guerra activa ──────────────────────────────
  renderWarPanel(state) {
    const wars = state.diplomacy.filter(n => n.atWar && n._war);
    if (!wars.length) return '';

    return wars.map(nation => {
      const w = nation._war;
      const mPct = Math.round((w.momentum + 100) / 2); // 0-100
      const mColor = w.momentum > 20 ? 'var(--green2)' : w.momentum < -20 ? 'var(--red2)' : 'var(--gold)';
      const phaseLabel = { preparing:'Preparando', active:'En combate', decisive:'Decisivo', ending:'Finalizando' }[w.phase] || w.phase;
      return `
        <div class="war-card rpanel-section">
          <div class="rpanel-title" style="color:var(--red2)">⚔️ Guerra T${w.turn} vs ${nation.name}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-bottom:6px">Fase: ${phaseLabel} · Tropas: ${Math.floor(w.playerArmy)} vs ${Math.floor(w.enemyArmy)}</div>
          <div style="font-size:10px;margin-bottom:4px;color:var(--text3)">Momentum</div>
          <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;margin-bottom:8px;overflow:hidden">
            <div style="width:${mPct}%;height:100%;background:${mColor};border-radius:4px;transition:width 0.5s"></div>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="diplo-btn" onclick="WarSystem.reinforce(Game.state,'${nation.id}',200)" title="+200 tropas al frente (+15 momentum)">➕ Refuerzo</button>
            ${w.canRetreat ? `<button class="diplo-btn danger" onclick="WarSystem.retreat(Game.state,'${nation.id}')" title="Retirada táctica. Solo una vez.">↩️ Retirar</button>` : ''}
            <button class="diplo-btn warn" onclick="WarSystem._resolvePeace(Game.state,Game.state.diplomacy.find(n=>n.id==='${nation.id}'));UI.fullRender(Game.state)" title="Negociar paz inmediata">🕊️ Paz</button>
          </div>
          ${w.log.length ? `<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin-top:6px;padding:4px 6px;background:rgba(0,0,0,0.2)">${w.log[w.log.length-1]}</div>` : ''}
        </div>`;
    }).join('');
  },
};

// ─────────────────────────────────────────────────────────────
// SISTEMA DE TERRITORIOS — conquista y pérdida
// ─────────────────────────────────────────────────────────────
window.TerritorySystem = window.TerritorySystem || {

  // Conquista un territorio enemigo y lo transfiere al jugador
  conquer(state, nation, regionId) {
    if (typeof AlthoriaMap === 'undefined') return null;

    const natId = nation.id;
    const zones = AlthoriaMap.nationZones[natId] || [];
    if (!zones.length) return null;

    // Escoger región a conquistar (preferencia: la targetRegion)
    const target = zones.includes(regionId) ? regionId : zones[0];
    if (!target) return null;

    // Transferir zona
    AlthoriaMap.nationZones[natId] = zones.filter(z => z !== target);
    AlthoriaMap.nationZones['player'] = AlthoriaMap.nationZones['player'] || [];
    AlthoriaMap.nationZones['player'].push(target);

    // Actualizar contadores
    state.althoriaRegions = (AlthoriaMap.nationZones['player'] || []).length;

    // Bonus de recursos de la región
    const region = ALTHORIA_REGIONS.find(r => r.id === target);
    if (region?.baseResources) {
      state.resources.gold  += (region.baseResources.gold  || 0) * 3;
      state.resources.food  += (region.baseResources.food  || 0) * 2;
      state.resources.stone += (region.baseResources.stone || 0) * 2;
    }

    // Reacción diplomática de terceros
    state.diplomacy.forEach(n => {
      if (n.id !== natId && !n.atWar) {
        n.relation = Math.max(-100, n.relation - 12);
      }
    });

    // Actualizar visual
    AlthoriaMap.updateWar(state);
    AlthoriaMap.render();

    return target;
  },

  // El enemigo conquista una región nuestra
  loseRegion(state, nation) {
    if (typeof AlthoriaMap === 'undefined') return;
    const playerZones = AlthoriaMap.nationZones['player'] || [];
    if (!playerZones.length) return;

    // Pierde la región más alejada de la capital
    const lost = playerZones[playerZones.length - 1];
    AlthoriaMap.nationZones['player'] = playerZones.filter(z => z !== lost);
    AlthoriaMap.nationZones[nation.id] = AlthoriaMap.nationZones[nation.id] || [];
    AlthoriaMap.nationZones[nation.id].push(lost);

    state.althoriaRegions = Math.max(1, (AlthoriaMap.nationZones['player'] || []).length);
    AlthoriaMap.updateWar(state);
    AlthoriaMap.render();
  },

  // Obtener info de un territorio para la UI de selección
  getRegionInfo(regionId, state) {
    const region  = ALTHORIA_REGIONS.find(r => r.id === regionId);
    if (!region) return null;

    // Quién lo controla
    let owner = 'neutral';
    if (typeof AlthoriaMap !== 'undefined') {
      Object.entries(AlthoriaMap.nationZones).forEach(([natId, zones]) => {
        if (zones.includes(regionId)) owner = natId;
      });
    }

    // Guarnición enemiga
    const ownerNation = owner !== 'player' && owner !== 'neutral'
      ? state.diplomacy.find(n => n.id === owner) : null;
    const garrison = ownerNation ? Math.floor((ownerNation.army || 300) * 0.3) : 0;

    // Valor estratégico
    const resValue = Object.values(region.baseResources || {}).reduce((s,v) => s+v, 0);

    return {
      id:          regionId,
      name:        region.name,
      owner,
      ownerName:   ownerNation?.name || (owner === 'player' ? 'Tu Reino' : 'Neutral'),
      garrison,
      geoType:     region.geoType,
      resources:   region.baseResources || {},
      resValue,
      icon:        region.resourceIcon,
      riskLevel:   garrison > 500 ? 'Alto' : garrison > 200 ? 'Medio' : 'Bajo',
    };
  },
};

// ─────────────────────────────────────────────────────────────
// DECLARACIÓN DE GUERRA BASADA EN RELACIÓN
// ─────────────────────────────────────────────────────────────
window.WarDeclaration = window.WarDeclaration || {

  // Evaluar si declarar guerra y qué tipo de respuesta
  // Returns: { result: 'immediate_war'|'tension'|'warning'|'blocked', message }
  evaluate(state, nationId) {
    const nation = state.diplomacy.find(n => n.id === nationId);
    if (!nation) return { result: 'blocked', message: 'Nación no encontrada' };
    if (nation.atWar)  return { result: 'blocked', message: 'Ya en guerra' };

    const rel        = nation.relation;                          // -100 a 100
    const trust      = nation._trust || 50;                     // 0-100 acumulado
    const agression  = { agresiva:80, oportunista:55, aislacionista:20, diplomática:15 }[nation.personality] || 40;
    const playerStr  = (state.army * (state.morale/100));
    const enemyStr   = (nation.army || 400) * 0.7;
    const powerAdv   = playerStr / Math.max(1, enemyStr);       // >1 = jugador más fuerte

    // ── FÓRMULA DE GUERRA INMEDIATA ──
    // Guerra inmediata si: relación muy negativa O agresión alta Y jugador débil
    const warScore = Math.max(0,
      (-rel * 0.5)                             // Mal relación → más probable
      + (agression * 0.3)                      // Personalidad agresiva
      + ((1 - Math.min(2,powerAdv)) * 20)      // Jugador débil
      - (trust * 0.4)                          // Confianza reduce probabilidad
      - ((nation.treaties||[]).includes('alliance') ? 50 : 0)  // Alianza bloquea
    );

    // Escenarios:
    if (rel < -60 || warScore > 70) {
      return {
        result: 'immediate_war',
        message: `⚔️ ${nation.name} acepta tu desafío. ¡La guerra comienza de inmediato!`,
        warScore,
      };
    }
    if (rel < -20 || warScore > 40) {
      // Tensión sin guerra — reduce relación, posible guerra próximo turno
      nation.relation  = Math.max(-100, rel - 20);
      nation._trust    = Math.max(0, trust - 25);
      nation._warThreat = (nation._warThreat || 0) + 1;
      return {
        result: 'tension',
        message: `⚠️ ${nation.name} considera tu movimiento una provocación. Relación deteriorada. La guerra podría estallar pronto.`,
        warScore,
      };
    }
    if (rel < 20) {
      nation.relation = Math.max(-100, rel - 10);
      return {
        result: 'warning',
        message: `📨 ${nation.name} te envía una advertencia diplomática. Tensión +1. No hay guerra aún.`,
        warScore,
      };
    }
    return {
      result: 'blocked',
      message: `🤝 ${nation.name} tiene buena relación contigo. Declara guerra formalmente para proceder.`,
      warScore,
    };
  },

  // Declarar guerra formal (con AP, genera _war multi-turno)
  declare(state, nationId, targetRegionId) {
    if (!ActionPoints.spend(state, 2, 'Declarar guerra')) return;

    const nation = state.diplomacy.find(n => n.id === nationId);
    if (!nation) return;

    const eval_ = this.evaluate(state, nationId);

    if (eval_.result === 'blocked' && nation.relation >= 20) {
      // Declaración formal forzada
      nation.relation = Math.max(-100, nation.relation - 40);
    }

    nation.atWar    = true;
    nation.relation = Math.max(-100, nation.relation - 30);
    Systems.Trade.closeRoutesForNation(state, nationId);

    // Iniciar guerra multi-turno
    WarSystem.startWar(state, nation, targetRegionId);

    // Reacción de otras naciones
    state.diplomacy.forEach(n => {
      if (n.id !== nationId) {
        const aggressor = n.personality === 'agresiva' ? -5 : 5;
        n.relation = Math.max(-100, Math.min(100, n.relation + aggressor));
      }
    });

    if (typeof AlthoriaMap !== 'undefined') AlthoriaMap.updateWar(state);
    Systems.Log.add(state, eval_.message, 'crisis');

    // ── Abrir batalla en grid ─────────────────────────────
    if (typeof BattleSystem !== 'undefined') {
      BattleSystem.initBattle(state, nation, { territory: targetRegionId });
    } else {
      if (typeof UI !== 'undefined') UI.fullRender(state);
    }
  },
};

// ─────────────────────────────────────────────────────────────
// SELECCIÓN DE TERRITORIO EN EL MAPA
// ─────────────────────────────────────────────────────────────
window.RegionSelector = window.RegionSelector || {
  _active:     false,
  _callback:   null,
  _filter:     null, // fn(regionId, owner) => bool

  // Activar modo selección: el siguiente click en el mapa selecciona una región
  activate(filter, callback) {
    this._active   = true;
    this._filter   = filter;
    this._callback = callback;
    const banner = document.getElementById('region-select-banner');
    if (banner) banner.style.display = 'block';
    // Open Althoria map for region selection
    if (typeof AlthoriaMap !== 'undefined' && typeof Game !== 'undefined' && Game.state) {
      if (!AlthoriaMap.isOpen) AlthoriaMap.open(Game.state);
    }
  },

  deactivate() {
    this._active   = false;
    this._callback = null;
    this._filter   = null;
    const banner = document.getElementById('region-select-banner');
    if (banner) banner.style.display = 'none';
  },

  // Llamado desde AlthoriaMap._onHover cuando hay click
  onRegionClick(regionId, owner, state) {
    if (!this._active) return false;
    if (this._filter && !this._filter(regionId, owner)) {
      Systems.Log.add(state, '⚠️ No puedes seleccionar esa región.', 'warn');
      return true;
    }
    const info = TerritorySystem.getRegionInfo(regionId, state);
    if (this._callback) this._callback(regionId, info, state);
    this.deactivate();
    return true;
  },

  // Seleccionar territorio enemigo para atacar
  selectAttackTarget(state) {
    this.activate(
      (regionId, owner) => owner !== 'player' && owner !== 'neutral',
      (regionId, info, state) => {
        // Mostrar modal de confirmación antes de declarar guerra
        this._showAttackConfirm(regionId, info, state);
      }
    );
    Systems.Log.add(state, '🎯 Haz click en un territorio enemigo para atacarlo.', 'info');
    if (typeof UI !== 'undefined') UI.fullRender(state);
  },

  _showAttackConfirm(regionId, info, state) {
    // Use a safe confirmation dialog instead of injecting onclick with dynamic strings
    const resText = Object.entries(info.resources||{}).filter(([,v])=>v>0).map(([k,v])=>v+' '+k).join(', ');
    const msg = [
      'ATACAR: ' + info.name,
      'Propietario: ' + info.ownerName,
      'Guarnición estimada: ' + info.garrison + ' tropas',
      'Riesgo: ' + info.riskLevel,
      'Recursos: ' + (resText||'ninguno'),
      '',
      '¿Declarar guerra?',
    ].join('\n');


    if (!confirm(msg)) return;

    // Store pending attack for the confirm
    this._pendingAttack = { regionId, nationId: info.owner };
    WarDeclaration.declare(state, info.owner, regionId);
  },
};

var RegionSelector = window.RegionSelector;

var WarDeclaration = window.WarDeclaration;

var TerritorySystem = window.TerritorySystem;

var WarSystem = window.WarSystem;
