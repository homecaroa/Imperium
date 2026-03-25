// ============================================================
// IMPERIUM — BATTLE.JS
// Sistema de batalla en mapa al declarar guerra
// Ganancia: 50% de recursos del rival si se gana
// ============================================================

const BattleSystem = {

  activeBattle: null,

  // ── INICIAR BATALLA ──────────────────────────────────────
  // Llamado cuando el jugador declara guerra o un rival ataca
  initBattle(attackerState, targetNation, opts = {}) {
    const analysis = Systems.Military.analyzeBattle(attackerState, targetNation,
      !!(attackerState.intelligence && attackerState.intelligence[targetNation.id]));

    this.activeBattle = {
      attacker:      attackerState,
      defender:      targetNation,
      analysis,
      phase:         'preview',   // preview → fighting → result
      autoResolve:   opts.autoResolve || false,
      territory:     opts.territory || null,
    };

    this.renderBattleModal();
    document.getElementById('modal-battle').classList.remove('hidden');
  },

  // ── RENDER MODAL DE BATALLA ───────────────────────────────
  renderBattleModal() {
    if (!this.activeBattle) return;
    const { attacker, defender, analysis } = this.activeBattle;

    document.getElementById('battle-title').textContent =
      '⚔️ ' + attacker.civName + ' vs ' + defender.name;

    // Mini mapa de batalla (representación simbólica)
    const miniMap = document.getElementById('battle-map-mini');
    miniMap.innerHTML = this._renderMiniBattlefield(attacker, defender);

    // Info de la batalla
    const info = document.getElementById('battle-info');
    const seasonData = Systems.Climate.getSummary(attacker);
    const intelStr = analysis.spyUsed ? '🔍 Dato exacto (espía)' : '❓ Estimación (±40%)';
    info.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="color:var(--green2);font-family:var(--font-title);font-size:12px;margin-bottom:4px">⚔️ ${attacker.civName}</div>
          <div>🛡️ Fuerza efectiva: <b style="color:var(--green2)">${analysis.attackerStrength.toLocaleString()}</b></div>
          <div>👥 Soldados: ${Systems.Military.totalSoldiers(attacker).toLocaleString()}</div>
          <div>❤️ Moral: ${attacker.morale}%</div>
          ${attacker.legendaryUnit ? `<div>⭐ ${attacker.legendaryUnit.name}</div>` : ''}
        </div>
        <div>
          <div style="color:var(--red2);font-family:var(--font-title);font-size:12px;margin-bottom:4px">🏰 ${defender.name}</div>
          <div>🛡️ Fuerza estimada: <b style="color:var(--red2)">${analysis.defenderStrength.toLocaleString()}</b></div>
          <div>👥 Soldados: ~${defender.army}</div>
          <div style="font-size:9px;color:var(--text3)">${intelStr}</div>
        </div>
      </div>
      <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">
        <span>🌤️ Efecto estacional: <b style="color:${seasonData.totalArmyMod < 0 ? 'var(--red2)' : 'var(--green2)'}">${seasonData.totalArmyMod > 0 ? '+' : ''}${seasonData.totalArmyMod}%</b></span>
        &nbsp;&nbsp;
        <span>📊 Probabilidad de victoria: <b style="color:${analysis.winChance > 65 ? 'var(--green2)' : analysis.winChance > 45 ? 'var(--gold)' : 'var(--red2)'}">${analysis.winChance}%</b></span>
        &nbsp;&nbsp;
        <span>${analysis.recommendation}</span>
      </div>
      ${analysis.winChance < 40 ? '<div style="margin-top:6px;color:var(--red2)">⚠️ Campaña arriesgada. Considera reforzar antes de atacar.</div>' : ''}
    `;

    // Ocultar barra de progreso hasta resolver
    document.getElementById('battle-progress').classList.add('hidden');

    // Acciones
    const actions = document.getElementById('battle-actions');
    actions.innerHTML = `
      <button class="menu-btn primary" onclick="BattleSystem.resolveBattle()">⚔️ ¡Atacar!</button>
      <button class="menu-btn" onclick="BattleSystem.retreat()">🏃 Retirada</button>
      ${analysis.winChance < 40 ? '<button class="menu-btn" onclick="BattleSystem.requestPeace()">🕊️ Pedir Paz</button>' : ''}
    `;
  },

  // ── RESOLVER BATALLA ──────────────────────────────────────
  resolveBattle() {
    if (!this.activeBattle) return;
    const { attacker, defender } = this.activeBattle;

    // Cambiar a fase de combate
    this.activeBattle.phase = 'fighting';
    document.getElementById('battle-actions').innerHTML = '<div style="font-family:var(--font-mono);font-size:12px;color:var(--text3)">⚔️ La batalla se libra…</div>';

    // Animación de barra de batalla
    const attackerPct = this.activeBattle.analysis.winChance;
    const defenderPct = 100 - attackerPct;
    setTimeout(() => {
      const barA = document.getElementById('bar-attacker');
      const barD = document.getElementById('bar-defender');
      if (barA) barA.style.width = attackerPct + '%';
      if (barD) barD.style.width = defenderPct + '%';
      document.getElementById('battle-progress').classList.remove('hidden');
    }, 100);

    // Resolver después de animación
    setTimeout(() => this._applyBattleResult(), 1200);
  },

  _applyBattleResult() {
    const { attacker, defender } = this.activeBattle;
    const result = Systems.Military.resolveBattle(attacker, defender);
    this.activeBattle.result = result;
    this.activeBattle.phase = 'result';

    const resultText = document.getElementById('battle-result-text');

    if (result.won) {
      // ── VICTORIA ──
      resultText.innerHTML = `<span style="color:var(--green2);font-size:18px">⚔️ ¡VICTORIA!</span>`;

      // Ganar 50% recursos del rival
      const plunder = {
        food:  Math.floor((defender.resources?.food  || 200) * 0.5),
        gold:  Math.floor((defender.resources?.gold  || 150) * 0.5),
        wood:  Math.floor((defender.resources?.wood  || 100) * 0.5),
        stone: Math.floor((defender.resources?.stone || 80)  * 0.5),
        iron:  Math.floor((defender.resources?.iron  || 60)  * 0.5),
      };
      Object.entries(plunder).forEach(([res, val]) => {
        attacker.resources[res] = (attacker.resources[res] || 0) + val;
        if (defender.resources) defender.resources[res] = Math.max(0, (defender.resources[res] || 0) - val*2);
      });

      // Ganar territorio
      attacker.territories = (attacker.territories || 1) + 1;
      // Syncronizar con regiones de Althoria
      if (typeof AlthoriаMap !== 'undefined') {
        var pz = AlthoriаMap.nationZones['player'] || [];
        var b_idx = (attacker.diplomacy||[]).indexOf(defender);
        var b_id  = b_idx >= 0 ? 'ai_'+(b_idx+1) : null;
        if (b_id) {
          var bz = AlthoriаMap.nationZones[b_id] || [];
          if (bz.length > 0) { pz.push(bz.splice(0,1)[0]); }
        }
        attacker.althoriaRegions = pz.length;
      }

      // Reducir ejército rival
      defender.army = Math.max(50, Math.floor(defender.army * 0.6));
      defender.morale = Math.max(10, (defender.morale || 50) - 20);
      defender.atWar = false;
      defender.relation = Math.max(-100, (defender.relation || 0) - 25);

      // Facción ejército contenta
      const ejFac = attacker.factions?.find(f => f.id === 'ejercito');
      if (ejFac) ejFac.satisfaction = Math.min(100, ejFac.satisfaction + 20);

      Systems.Log.add(attacker,
        `⚔️ Victoria sobre ${defender.name}! Botín: +${plunder.gold}💰 +${plunder.food}🌾 +${plunder.iron}⚙️`, 'good');

      document.getElementById('battle-info').innerHTML = `
        <div style="color:var(--green2);font-family:var(--font-title);font-size:14px;margin-bottom:10px">⚔️ Victoria Gloriosa</div>
        <div>⚔️ Bajas propias: <b>${result.casualties.toLocaleString()}</b> soldados</div>
        <div style="margin-top:8px;color:var(--gold2)">💰 Botín saqueado:</div>
        <div style="display:flex;gap:10px;margin-top:4px">
          ${Object.entries(plunder).filter(([,v])=>v>0).map(([r,v])=>`<span>${this._resIcon(r)}+${v}</span>`).join('')}
        </div>
        <div style="margin-top:8px">🗺️ Territorio conquistado: +1</div>
      `;

      document.getElementById('battle-actions').innerHTML = `
        <button class="menu-btn primary" onclick="BattleSystem.closeBattle()">✅ Continuar</button>
      `;

    } else {
      // ── DERROTA ──
      resultText.innerHTML = `<span style="color:var(--red2);font-size:18px">💀 DERROTA</span>`;

      attacker.morale    = Math.max(0,  attacker.morale - 20);
      attacker.stability = Math.max(0,  attacker.stability - 10);

      // Perder territorio si quedan
      if (attacker.territories > 1) {
        attacker.territories--;
        Systems.Log.add(attacker, `💀 Derrota ante ${defender.name}. Perdemos un territorio. Bajas: ${result.casualties}`, 'crisis');
      } else {
        Systems.Log.add(attacker, `💀 Derrota ante ${defender.name}. ¡La capital en peligro! Bajas: ${result.casualties}`, 'crisis');
      }

      document.getElementById('battle-info').innerHTML = `
        <div style="color:var(--red2);font-family:var(--font-title);font-size:14px;margin-bottom:10px">💀 Derrota</div>
        <div>⚔️ Bajas sufridas: <b style="color:var(--red2)">${result.casualties.toLocaleString()}</b> soldados</div>
        <div>🗺️ Territorio perdido</div>
        <div style="margin-top:6px;color:var(--text3);font-style:italic">El ejército se retira en desorden…</div>
      `;

      document.getElementById('battle-actions').innerHTML = `
        <button class="menu-btn primary" onclick="BattleSystem.closeBattle()">💔 Aceptar derrota</button>
        <button class="menu-btn" onclick="BattleSystem.requestPeace()">🕊️ Pedir paz urgente</button>
      `;
    }

    // Sync army total
    attacker.army = Systems.Military.totalSoldiers(attacker);
    UI.fullRender(attacker);
  },

  retreat() {
    // Retirada: no hay batalla, se relajan relaciones un poco
    if (!this.activeBattle) return;
    const { attacker, defender } = this.activeBattle;
    defender.atWar = false;
    Systems.Log.add(attacker, `🏃 Retirada estratégica de ${defender.name}. Relaciones tensas.`, 'warn');
    this.closeBattle();
  },

  requestPeace() {
    if (!this.activeBattle) return;
    const { attacker, defender } = this.activeBattle;
    AI.playerDiplomaticAction(attacker, defender.id, 'sue_peace');
    this.closeBattle();
  },

  closeBattle() {
    this.activeBattle = null;
    document.getElementById('modal-battle').classList.add('hidden');
    if (Game.state) UI.fullRender(Game.state);
  },

  // ── MINI MAPA DE BATALLA ──────────────────────────────────
  _renderMiniBattlefield(attacker, defender) {
    const unitSymbols = {
      infanteria: '🗡️', caballeria: '🐴', arqueros: '🏹',
      legionarios: '🛡️', ballistas: '🎯', berserkers: '🪓',
      guerreros_jaguar: '🐆', caballeria_pesada: '🏇'
    };

    const attackerUnits = (attacker.armyUnits || []).slice(0,4).map(u => {
      const def = MILITARY_UNITS[u.typeId];
      return `<span title="${def?.name||u.typeId}" style="font-size:18px">${unitSymbols[u.typeId]||'⚔️'}</span>`;
    }).join(' ');

    const defenderIcon = defender.icon || '🏰';

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:0 20px">
        <div style="text-align:center">
          <div style="font-family:var(--font-title);font-size:12px;color:var(--green2);margin-bottom:6px">${attacker.civIcon} ${attacker.civName}</div>
          <div>${attackerUnits || '⚔️ ⚔️ ⚔️'}</div>
        </div>
        <div style="font-size:28px;color:var(--gold);text-shadow:0 0 10px rgba(200,160,48,0.6)">⚔️</div>
        <div style="text-align:center">
          <div style="font-family:var(--font-title);font-size:12px;color:var(--red2);margin-bottom:6px">${defenderIcon} ${defender.name}</div>
          <div style="font-size:22px">${defenderIcon}</div>
        </div>
      </div>
    `;
  },

  _resIcon(res) {
    return { food:'🌾', gold:'💰', wood:'🪵', stone:'🪨', iron:'⚙️' }[res] || '?';
  }
};
