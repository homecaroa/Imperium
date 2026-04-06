// ============================================================
// IMPERIUM — BATTLE.JS  v2  (Grid Battle System)
// Grid 10×10 · drag & drop · combate automático por turno
// ============================================================

var BattleSystem = {

  // ── ESTADO ────────────────────────────────────────────────
  activeBattle: null,
  _drag:        null,   // { unitTypeId, count, side }

  // ── TERRENO: 1=tierra 0=agua ──────────────────────────────
  // Generado con la seed del mapa para ser reproducible
  _terrain: [],

  // Genera un terreno 10×10 con ~20% agua en bordes/islas
  _buildTerrain(seed) {
    var t = [];
    var rng = (n) => { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed % n; };
    for (var r = 0; r < 10; r++) {
      t[r] = [];
      for (var c = 0; c < 10; c++) {
        // Bordes y manchas de agua pseudo-aleatorias
        var edge = (r === 0 || r === 9 || c === 0 || c === 9) ? 0.35 : 0;
        t[r][c] = (rng(100) / 100 > edge + 0.12) ? 1 : 0; // 1=tierra
      }
    }
    // Garantizar franja de tierra central
    for (var r2 = 3; r2 <= 6; r2++) {
      for (var c2 = 2; c2 <= 7; c2++) { t[r2][c2] = 1; }
    }
    return t;
  },

  // ── INICIAR BATALLA ───────────────────────────────────────
  initBattle(attackerState, targetNation, opts) {
    opts = opts || {};
    var seed  = (attackerState.mapSeed || 42) ^ 0xBEEF;
    var terrain = this._buildTerrain(seed);

    // Convertir armyUnits del jugador a unidades de batalla
    var playerUnits = (attackerState.armyUnits || []).filter(u => u.count > 0).map(u => ({
      typeId: u.typeId,
      count:  u.count,
      def:    MILITARY_UNITS[u.typeId] || { name:u.typeId, icon:'⚔', strength:10, attack:10, defense:8, category:'infantry', color:'#888' }
    }));

    // Unidades de la IA (generar desde su army)
    var aiArmy    = targetNation.army || 200;
    var aiUnits   = this._generateAIUnits(aiArmy, targetNation);

    this.activeBattle = {
      attacker:    attackerState,
      defender:    targetNation,
      terrain,
      phase:       'placement',  // placement | fighting | result
      turn:        1,
      maxTurns:    8,
      grid:        {},   // key="r,c" → { side:'player'|'ai', typeId, count }
      playerUnits, aiUnits,
      log:         [],
      territory:   opts.territory || null,
    };

    this._showModal();
    this._renderAll();
  },

  // Genera 1-3 tipos de unidades para la IA
  _generateAIUnits(army, nation) {
    var types = ['infanteria', 'arqueros', 'caballeria'];
    var civBonus = { aztec:'guerreros_jaguar', norse:'berserkers', ottoman:'caballeria_pesada', roman:'legionarios' };
    var bonus = civBonus[nation.civId];
    if (bonus && MILITARY_UNITS[bonus]) types.unshift(bonus);
    return types.slice(0,3).map((tid, i) => {
      var def = MILITARY_UNITS[tid] || { name:tid, icon:'⚔', strength:10, attack:10, defense:8, category:'infantry', color:'#c83030' };
      var frac = i === 0 ? 0.5 : i === 1 ? 0.3 : 0.2;
      return { typeId:tid, count: Math.max(10, Math.floor(army * frac)), def };
    });
  },

  // ── RENDER PRINCIPAL ─────────────────────────────────────
  _renderAll() {
    var b = this.activeBattle;
    if (!b) return;
    var box = document.getElementById('battle-modal-inner');
    if (!box) return;

    var phaseLabel = b.phase === 'placement'
      ? '📍 Coloca tus unidades · Turno ' + b.turn + '/' + b.maxTurns
      : b.phase === 'fighting'
      ? '⚔️ Combate en curso…'
      : '🏆 Resultado';

    box.innerHTML =
      '<div class="bg-header">' +
        '<span class="bg-title">⚔ ' + b.attacker.civName + ' vs ' + b.defender.name + '</span>' +
        '<span class="bg-phase">' + phaseLabel + '</span>' +
        '<button class="bg-close-btn" onclick="BattleSystem.retreat()">✕ Retirada</button>' +
      '</div>' +
      '<div class="bg-body">' +
        '<div class="bg-left">' + this._renderUnitTray('player') + '</div>' +
        '<div class="bg-center">' + this._renderGrid() + '</div>' +
        '<div class="bg-right">' + this._renderUnitTray('ai') + this._renderLog() + '</div>' +
      '</div>' +
      '<div class="bg-footer">' + this._renderFooter() + '</div>';

    this._attachDragListeners();
  },

  // ── BANDEJAS DE UNIDADES ─────────────────────────────────
  _renderUnitTray(side) {
    var b = this.activeBattle;
    var units = side === 'player' ? b.playerUnits : b.aiUnits;
    var label = side === 'player'
      ? '<div class="bg-tray-title" style="color:#72c882">🏰 Tu ejército</div>'
      : '<div class="bg-tray-title" style="color:#e05050">🔴 ' + b.defender.name + '</div>';

    var html = label + '<div class="bg-tray">';
    units.forEach(u => {
      if (u.count <= 0) return;
      var placed = this._countPlaced(side, u.typeId);
      var remaining = u.count - placed;
      if (remaining < 0) remaining = 0;
      var draggable = (side === 'player' && b.phase === 'placement' && remaining > 0)
        ? 'draggable="true" data-typeid="' + u.typeId + '" data-count="' + remaining + '" data-side="player"'
        : '';
      html +=
        '<div class="bg-unit-card ' + (remaining === 0 ? 'bg-unit-placed' : '') + '" ' + draggable + '>' +
          '<span class="bg-unit-icon">' + (u.def.icon||'⚔') + '</span>' +
          '<span class="bg-unit-name">' + (u.def.name||u.typeId) + '</span>' +
          '<span class="bg-unit-count" style="color:' + (side==='player'?'#72c882':'#e05050') + '">' +
            (remaining > 0 ? remaining.toLocaleString() : '✓') +
          '</span>' +
        '</div>';
    });
    html += '</div>';
    return html;
  },

  _countPlaced(side, typeId) {
    var b = this.activeBattle;
    return Object.values(b.grid).reduce((sum, cell) => {
      return sum + (cell.side === side && cell.typeId === typeId ? cell.count : 0);
    }, 0);
  },

  _allPlayerUnitsPlaced() {
    var b = this.activeBattle;
    return b.playerUnits.every(u => {
      if (u.count <= 0) return true;
      return this._countPlaced('player', u.typeId) >= u.count;
    });
  },

  // ── GRID 10×10 ───────────────────────────────────────────
  _renderGrid() {
    var b = this.activeBattle;
    var html = '<div class="bg-grid" id="battle-grid">';
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 10; c++) {
        var key  = r + ',' + c;
        var land = b.terrain[r][c] === 1;
        var cell = b.grid[key];
        var side = cell ? cell.side : null;
        var cls  = 'bg-cell';
        if (!land)              cls += ' bg-water';
        else if (side==='player') cls += ' bg-cell-player';
        else if (side==='ai')     cls += ' bg-cell-ai';
        else                    cls += ' bg-land';

        // Drag-over zones: player only right half, AI left half
        var dropZone = land && b.phase === 'placement'
          ? 'data-row="' + r + '" data-col="' + c + '"'
          : '';

        var content = '';
        if (!land) {
          content = '<span class="bg-terrain-icon">🌊</span>';
        } else if (cell) {
          var def = MILITARY_UNITS[cell.typeId] || { icon:'⚔' };
          content =
            '<span class="bg-cell-icon">' + (def.icon||'⚔') + '</span>' +
            '<span class="bg-cell-count">' + cell.count.toLocaleString() + '</span>';
        }

        html +=
          '<div class="' + cls + '" ' + dropZone + ' id="cell-' + key + '">' +
            content +
          '</div>';
      }
    }
    html += '</div>';
    return html;
  },

  // ── LOG DE BATALLA ────────────────────────────────────────
  _renderLog() {
    var b = this.activeBattle;
    if (!b.log.length) return '<div class="bg-log"></div>';
    return '<div class="bg-log">' +
      b.log.slice(-6).map(l => '<div class="bg-log-line">' + l + '</div>').join('') +
    '</div>';
  },

  // ── FOOTER CON BOTONES ───────────────────────────────────
  _renderFooter() {
    var b = this.activeBattle;
    if (b.phase === 'placement') {
      var ready  = this._allPlayerUnitsPlaced();
      var btn    = ready
        ? '<button class="bg-btn-primary" onclick="BattleSystem.confirmPlacement()">⚔ Confirmar y Combatir</button>'
        : '<button class="bg-btn-primary" style="opacity:0.5;cursor:not-allowed" disabled>📍 Coloca todas las unidades</button>';
      return btn + '<button class="bg-btn" onclick="BattleSystem.retreat()">🏃 Retirada</button>';
    }
    if (b.phase === 'result') {
      return '<button class="bg-btn-primary" onclick="BattleSystem.closeBattle()">✅ Continuar</button>';
    }
    return '<div style="color:var(--text3);font-family:var(--font-mono);font-size:11px">⚔️ Calculando resultado…</div>';
  },

  // ── DRAG & DROP ───────────────────────────────────────────
  _attachDragListeners() {
    var b = this.activeBattle;
    if (b.phase !== 'placement') return;

    // Draggable unit cards
    document.querySelectorAll('[draggable="true"][data-side="player"]').forEach(el => {
      el.addEventListener('dragstart', e => {
        this._drag = {
          typeId: el.dataset.typeid,
          count:  parseInt(el.dataset.count),
          side:   'player'
        };
        e.dataTransfer.effectAllowed = 'move';
        el.style.opacity = '0.5';
      });
      el.addEventListener('dragend', () => { el.style.opacity = '1'; });
    });

    // Drop targets (grid cells)
    document.querySelectorAll('[data-row][data-col]').forEach(cell => {
      cell.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cell.classList.add('bg-cell-dragover');
      });
      cell.addEventListener('dragleave', () => {
        cell.classList.remove('bg-cell-dragover');
      });
      cell.addEventListener('drop', e => {
        e.preventDefault();
        cell.classList.remove('bg-cell-dragover');
        var r = parseInt(cell.dataset.row);
        var c = parseInt(cell.dataset.col);
        this.handleDrop(r, c);
      });
    });

    // Also: click on placed player cell to remove
    document.querySelectorAll('.bg-cell-player').forEach(cell => {
      var id = cell.id.replace('cell-','');
      cell.addEventListener('click', () => this.removeFromGrid(id));
    });
  },

  // ── COLOCAR UNIDAD EN CELDA ──────────────────────────────
  handleDrop(r, c) {
    var b = this.activeBattle;
    if (!this._drag) return;
    var key = r + ',' + c;
    var valid = this.validatePlacement(r, c, 'player');
    if (!valid.ok) {
      this._showError(valid.msg);
      return;
    }
    // Remove previous placement of this unit type (1 type per grid = OK to overwrite cell)
    var existing = b.grid[key];
    if (existing && existing.side === 'player' && existing.typeId !== this._drag.typeId) {
      // Return previous unit to pool (implicit, count tracking handles it)
    }
    // Place
    b.grid[key] = { side:'player', typeId: this._drag.typeId, count: this._drag.count };
    this._drag = null;
    this._renderAll();
  },

  removeFromGrid(key) {
    var b = this.activeBattle;
    if (b.grid[key] && b.grid[key].side === 'player') {
      delete b.grid[key];
      this._renderAll();
    }
  },

  // ── VALIDAR POSICIÓN ─────────────────────────────────────
  validatePlacement(r, c, side) {
    var b = this.activeBattle;
    if (!b.terrain[r] || b.terrain[r][c] !== 1)
      return { ok:false, msg:'No se puede colocar en el agua.' };
    var key = r + ',' + c;
    if (b.grid[key] && b.grid[key].side !== side && b.grid[key].side)
      return { ok:false, msg:'Casilla ocupada por el enemigo.' };
    // Player: columnas 0-4  |  AI: columnas 5-9
    if (side === 'player' && c > 4)
      return { ok:false, msg:'Coloca tus tropas en la mitad izquierda del campo.' };
    if (side === 'ai' && c < 5)
      return { ok:false, msg:'Zona del jugador.' };
    return { ok:true };
  },

  // ── IA: COLOCAR UNIDADES ─────────────────────────────────
  aiPlacement() {
    var b = this.activeBattle;
    // Clear previous AI placements
    Object.keys(b.grid).forEach(k => { if (b.grid[k].side === 'ai') delete b.grid[k]; });

    // AI prioritizes columns 5-6 (frontline), rows vary
    var candidateCells = [];
    for (var r = 0; r < 10; r++) {
      for (var c = 5; c < 10; c++) {
        if (b.terrain[r][c] === 1) candidateCells.push([r,c]);
      }
    }
    // Shuffle
    candidateCells.sort(() => Math.random() - 0.5);
    // AI prioritizes being close to col 5 (frontline)
    candidateCells.sort((a,b2) => a[1] - b2[1]);

    var placed = 0;
    b.aiUnits.forEach(u => {
      if (u.count <= 0 || placed >= candidateCells.length) return;
      var rc = candidateCells[placed++];
      b.grid[rc[0]+','+rc[1]] = { side:'ai', typeId:u.typeId, count:u.count };
    });
  },

  // ── CONFIRMAR COLOCACIÓN Y RESOLVER ──────────────────────
  confirmPlacement() {
    var b = this.activeBattle;
    if (!this._allPlayerUnitsPlaced()) return;

    b.phase = 'fighting';
    this.aiPlacement();
    this._renderAll();

    // Small delay so player sees the AI placement before combat fires
    setTimeout(() => this.resolveBattleTurn(), 800);
  },

  // ── RESOLVER UN TURNO DE COMBATE ─────────────────────────
  resolveBattleTurn() {
    var b = this.activeBattle;
    if (!b || b.phase !== 'fighting') return;

    var playerCells = Object.entries(b.grid).filter(([,v]) => v.side === 'player');
    var aiCells     = Object.entries(b.grid).filter(([,v]) => v.side === 'ai');

    if (!playerCells.length || !aiCells.length) {
      return this._endBattle(playerCells.length > 0);
    }

    // Calcular daño: cada célula ataca a las más cercanas del lado contrario
    var dmgToAI     = this._calcDamage(playerCells, aiCells, b);
    var dmgToPlayer = this._calcDamage(aiCells, playerCells, b);

    this.applyCasualties('ai',     dmgToAI,     aiCells,     b);
    this.applyCasualties('player', dmgToPlayer, playerCells, b);

    b.log.push('T' + b.turn + ': Tu ejército inflige ' + dmgToAI + ' bajas. El enemigo causa ' + dmgToPlayer + ' bajas.');
    b.turn++;

    // Check end conditions
    var remainPlayer = Object.values(b.grid).filter(v => v.side === 'player' && v.count > 0).length;
    var remainAI     = Object.values(b.grid).filter(v => v.side === 'ai'     && v.count > 0).length;

    if (!remainAI)                   return this._endBattle(true);
    if (!remainPlayer)               return this._endBattle(false);
    if (b.turn > b.maxTurns) {
      // Tiempo agotado: gana quien tiene más tropas
      var pTotal = Object.values(b.grid).filter(v=>v.side==='player').reduce((s,v)=>s+v.count,0);
      var aTotal = Object.values(b.grid).filter(v=>v.side==='ai').    reduce((s,v)=>s+v.count,0);
      return this._endBattle(pTotal >= aTotal);
    }

    // Siguiente turno: volver a placement
    b.phase = 'placement';
    this._renderAll();
  },

  // ── CALCULAR DAÑO ────────────────────────────────────────
  _calcDamage(attackers, defenders, b) {
    var total = 0;
    attackers.forEach(([aKey, aCell]) => {
      var [ar, ac] = aKey.split(',').map(Number);
      var def = aCell.def || MILITARY_UNITS[aCell.typeId] || { attack:10, strength:10 };
      var atk = (def.attack || def.strength || 10) * aCell.count;

      // Adjacency bonus: +20% if any enemy cell is adjacent
      var adjacent = defenders.some(([dKey]) => {
        var [dr, dc] = dKey.split(',').map(Number);
        return Math.abs(ar-dr) <= 1 && Math.abs(ac-dc) <= 1;
      });
      if (adjacent) atk = Math.floor(atk * 1.2);

      // vsBonus
      defenders.forEach(([, dCell]) => {
        var dDef = dCell.def || MILITARY_UNITS[dCell.typeId] || { category:'infantry' };
        var bonus = (def.vsBonus || {})[dDef.category] || 1.0;
        atk = Math.floor(atk * bonus * 0.01); // scale down
      });
      total += atk;
    });
    return Math.max(1, Math.floor(total));
  },

  // ── APLICAR BAJAS ────────────────────────────────────────
  applyCasualties(side, damage, cells, b) {
    if (!cells.length) return;
    var perCell = Math.ceil(damage / cells.length);
    cells.forEach(([key, cell]) => {
      cell.count = Math.max(0, cell.count - perCell);
      b.grid[key] = cell;
      if (cell.count === 0) delete b.grid[key];
    });
  },

  // ── FIN DE BATALLA ───────────────────────────────────────
  _endBattle(playerWon) {
    var b = this.activeBattle;
    b.phase = 'result';

    // Calcular bajas totales
    var playerLeft  = Object.values(b.grid).filter(v=>v.side==='player').reduce((s,v)=>s+v.count,0);
    var playerStart = b.playerUnits.reduce((s,u)=>s+u.count,0);
    var casualties  = Math.max(0, playerStart - playerLeft);

    // Aplicar bajas al estado real
    var ratio = playerLeft / Math.max(1, playerStart);
    if (b.attacker.armyUnits) {
      b.attacker.armyUnits = b.attacker.armyUnits.map(u => ({
        ...u, count: Math.max(0, Math.floor(u.count * ratio))
      })).filter(u => u.count > 0);
    }
    b.attacker.army = Systems.Military.totalSoldiers(b.attacker);

    if (playerWon) {
      b.log.push('🏆 ¡VICTORIA! El enemigo huye del campo de batalla.');
      // Plunder
      var gold = Math.floor((b.defender.resources?.gold || 200) * 0.4);
      b.attacker.resources.gold += gold;
      b.attacker.territories = (b.attacker.territories || 1) + 1;
      b.attacker.althoriaRegions = (b.attacker.althoriaRegions || 1) + 1;
      b.defender.army = Math.max(50, Math.floor(b.defender.army * 0.5));
      b.defender.atWar = false;
      b.defender.relation = Math.max(-100, (b.defender.relation || 0) - 20);
      b.attacker.morale = Math.min(100, b.attacker.morale + 15);
      Systems.Log.add(b.attacker, '⚔️ Victoria táctica contra ' + b.defender.name + '. Botín: +' + gold + '💰. Bajas: ' + casualties, 'good');
    } else {
      b.log.push('💀 DERROTA. El ejército se retira en desorden.');
      b.attacker.morale    = Math.max(0, b.attacker.morale - 20);
      b.attacker.stability = Math.max(0, b.attacker.stability - 10);
      if (b.attacker.territories > 1) b.attacker.territories--;
      b.defender.atWar = false;
      Systems.Log.add(b.attacker, '💀 Derrota táctica ante ' + b.defender.name + '. Bajas: ' + casualties, 'crisis');
    }

    b._won      = playerWon;
    b._casualties = casualties;
    this._renderAll();
    if (typeof UI !== 'undefined') UI.fullRender(b.attacker);
  },

  // ── RETIRADA ─────────────────────────────────────────────
  retreat() {
    if (!this.activeBattle) return;
    var b = this.activeBattle;
    b.defender.atWar = false;
    Systems.Log.add(b.attacker, '🏃 Retirada estratégica. La guerra con ' + b.defender.name + ' se suspende.', 'warn');
    this.closeBattle();
  },

  // ── CERRAR ───────────────────────────────────────────────
  closeBattle() {
    this.activeBattle = null;
    this._drag = null;
    var modal = document.getElementById('modal-battle');
    if (modal) modal.classList.add('hidden');
    if (typeof Game !== 'undefined' && Game.state) UI.fullRender(Game.state);
  },

  // ── MODAL ────────────────────────────────────────────────
  _showModal() {
    var modal = document.getElementById('modal-battle');
    if (modal) modal.classList.remove('hidden');
  },

  _showError(msg) {
    var el = document.getElementById('bg-error');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2000);
  },

  // Legacy stubs for compatibility
  renderBattleModal() { if (this.activeBattle) this._renderAll(); },
  resolveBattle()     { this.confirmPlacement(); },
  requestPeace() {
    if (!this.activeBattle) return;
    AI.playerDiplomaticAction(this.activeBattle.attacker, this.activeBattle.defender.id, 'sue_peace');
    this.closeBattle();
  }
};
