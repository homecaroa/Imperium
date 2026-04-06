// ============================================================
// IMPERIUM — BATTLE.JS  v3  (Grid Battle System)
// Grid 10×10 · drag & drop · combate por turnos
// Conectado a WarDeclaration.declare y declareWar
// ============================================================

var BattleSystem = {

  activeBattle: null,
  _drag: null,

  // ── TERRENO ───────────────────────────────────────────────
  _buildTerrain(seed) {
    var rng = function() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return (seed >>> 0) / 0x7fffffff; };
    var t = [];
    for (var r = 0; r < 10; r++) {
      t[r] = [];
      for (var c = 0; c < 10; c++) {
        var edge = (r === 0 || r === 9 || c === 0 || c === 9) ? 0.40 : 0;
        t[r][c] = rng() > (edge + 0.12) ? 1 : 0;
      }
    }
    // Garantizar franja central jugable
    for (var r2 = 2; r2 <= 7; r2++)
      for (var c2 = 2; c2 <= 7; c2++) t[r2][c2] = 1;
    return t;
  },

  // ── UNIDADES IA ──────────────────────────────────────────
  _generateAIUnits(army, nation) {
    var base = ['infanteria','arqueros','caballeria'];
    var bonus = {aztec:'guerreros_jaguar',norse:'berserkers',ottoman:'caballeria_pesada',roman:'legionarios',arabic:'caballeria_pesada',chinese:'infanteria'};
    if (bonus[nation.civId] && typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[bonus[nation.civId]]) base.unshift(bonus[nation.civId]);
    var types = base.slice(0, 3);
    var fracs = [0.5, 0.3, 0.2];
    return types.map(function(tid, i) {
      var def = (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[tid]) || {name:tid,icon:'⚔',strength:10,attack:10,defense:8,category:'infantry',color:'#c83030'};
      return { typeId:tid, count:Math.max(10, Math.floor(army * fracs[i])), def:def };
    });
  },

  // ── INICIAR BATALLA ───────────────────────────────────────
  initBattle(attackerState, targetNation, opts) {
    opts = opts || {};
    var seed = ((attackerState.mapSeed || 42) ^ 0xBEEF) >>> 0;
    var playerUnits = (attackerState.armyUnits || []).filter(function(u) { return u.count > 0; }).map(function(u) {
      var def = (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[u.typeId]) || {name:u.typeId,icon:'⚔',strength:10,attack:10,defense:8,category:'infantry',color:'#72c882'};
      return { typeId:u.typeId, count:u.count, def:def };
    });
    if (!playerUnits.length) {
      if (typeof Systems !== 'undefined') Systems.Log.add(attackerState, '⚠️ Sin unidades para batallar.', 'warn');
      return;
    }

    this.activeBattle = {
      attacker:    attackerState,
      defender:    targetNation,
      terrain:     this._buildTerrain(seed),
      phase:       'placement',
      turn:        1,
      maxTurns:    8,
      grid:        {},
      playerUnits: playerUnits,
      aiUnits:     this._generateAIUnits(targetNation.army || 200, targetNation),
      log:         [],
      territory:   opts.territory || null,
    };

    // Show modal
    var modal = document.getElementById('modal-battle');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
    this._renderAll();
  },

  // ── RENDER COMPLETO ───────────────────────────────────────
  _renderAll() {
    var b = this.activeBattle;
    if (!b) return;
    var box = document.getElementById('battle-modal-inner');
    if (!box) return;

    var phaseLabel =
      b.phase === 'placement' ? '📍 Coloca tus unidades (col. 0-4) · Turno ' + b.turn + '/' + b.maxTurns :
      b.phase === 'fighting'  ? '⚔️ Resolviendo combate…' : '🏆 Resultado de la batalla';

    box.innerHTML =
      '<div class="bg-header">' +
        '<span class="bg-title">⚔ ' + b.attacker.civName + ' vs ' + b.defender.name + '</span>' +
        '<span class="bg-phase">' + phaseLabel + '</span>' +
        '<button class="bg-close-btn" onclick="BattleSystem.retreat()">✕ Retirada</button>' +
      '</div>' +
      '<div class="bg-body">' +
        '<div class="bg-left">'  + this._renderTray('player') + '</div>' +
        '<div class="bg-center">' + this._renderGrid()         + '</div>' +
        '<div class="bg-right">'  + this._renderTray('ai') + this._renderLog() + '</div>' +
      '</div>' +
      '<div class="bg-footer">' + this._renderFooter() + '</div>';

    this._attachListeners();
  },

  // ── BANDEJA DE UNIDADES ───────────────────────────────────
  _renderTray(side) {
    var b = this.activeBattle;
    var units = side === 'player' ? b.playerUnits : b.aiUnits;
    var label = side === 'player'
      ? '<div class="bg-tray-title" style="color:#72c882">🏰 ' + b.attacker.civName + '</div>'
      : '<div class="bg-tray-title" style="color:#e05050">🔴 '  + b.defender.name  + '</div>';

    var html = label + '<div class="bg-tray">';
    units.forEach(function(u) {
      if (u.count <= 0) return;
      var placed    = BattleSystem._countPlaced(side, u.typeId);
      var remaining = Math.max(0, u.count - placed);
      var drag = (side === 'player' && b.phase === 'placement' && remaining > 0)
        ? 'draggable="true" data-typeid="' + u.typeId + '" data-count="' + remaining + '"'
        : '';
      html +=
        '<div class="bg-unit-card' + (remaining === 0 ? ' bg-unit-placed' : '') + '" ' + drag + '>' +
          '<span class="bg-unit-icon">' + (u.def.icon || '⚔') + '</span>' +
          '<span class="bg-unit-name">' + (u.def.name || u.typeId) + '</span>' +
          '<span class="bg-unit-count" style="color:' + (side==='player'?'#72c882':'#e05050') + '">' +
            (remaining > 0 ? remaining.toLocaleString() : '✓') +
          '</span>' +
        '</div>';
    });
    return html + '</div>';
  },

  _countPlaced(side, typeId) {
    return Object.values(this.activeBattle.grid).reduce(function(sum, cell) {
      return sum + (cell.side === side && cell.typeId === typeId ? cell.count : 0);
    }, 0);
  },

  _allPlaced() {
    var b = this.activeBattle;
    return b.playerUnits.every(function(u) {
      return u.count <= 0 || BattleSystem._countPlaced('player', u.typeId) >= u.count;
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
        var cls  = 'bg-cell';
        if (!land)             cls += ' bg-water';
        else if (cell && cell.side === 'player') cls += ' bg-cell-player';
        else if (cell && cell.side === 'ai')     cls += ' bg-cell-ai';
        else                   cls += ' bg-land';

        // Half-field markers
        if (land && c === 4) cls += ' bg-cell-midline';

        var dropAttr = (land && b.phase === 'placement') ? 'data-row="' + r + '" data-col="' + c + '"' : '';
        var content  = '';
        if (!land) {
          content = '<span class="bg-terrain-icon">🌊</span>';
        } else if (cell) {
          var def = (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[cell.typeId]) || cell.def || {icon:'⚔'};
          content =
            '<span class="bg-cell-icon">' + (def.icon || '⚔') + '</span>' +
            '<span class="bg-cell-count">' + cell.count.toLocaleString() + '</span>';
        }
        html += '<div class="' + cls + '" id="cell-' + key + '" ' + dropAttr + '>' + content + '</div>';
      }
    }
    return html + '</div>';
  },

  // ── LOG ───────────────────────────────────────────────────
  _renderLog() {
    var b = this.activeBattle;
    if (!b.log.length) return '<div class="bg-log"></div>';
    return '<div class="bg-log">' +
      b.log.slice(-7).map(function(l) { return '<div class="bg-log-line">' + l + '</div>'; }).join('') +
    '</div>';
  },

  // ── FOOTER ────────────────────────────────────────────────
  _renderFooter() {
    var b = this.activeBattle;
    if (b.phase === 'placement') {
      var ready = this._allPlaced();
      return (ready
        ? '<button class="bg-btn-primary" onclick="BattleSystem.confirmPlacement()">⚔ Confirmar y Combatir</button>'
        : '<button class="bg-btn-primary" style="opacity:0.4;cursor:not-allowed" disabled>📍 Coloca todas las unidades (izquierda)</button>') +
        '<button class="bg-btn" onclick="BattleSystem.retreat()">🏃 Retirada</button>';
    }
    if (b.phase === 'result') {
      return '<button class="bg-btn-primary" onclick="BattleSystem.closeBattle()">✅ Continuar</button>';
    }
    return '<div style="color:var(--text3);font-family:var(--font-mono);font-size:11px">⚔️ Calculando…</div>';
  },

  // ── DRAG & DROP ───────────────────────────────────────────
  _attachListeners() {
    var b = this.activeBattle;
    if (!b || b.phase !== 'placement') return;

    // Draggable unit cards
    document.querySelectorAll('.bg-unit-card[draggable="true"]').forEach(function(el) {
      el.addEventListener('dragstart', function(e) {
        BattleSystem._drag = { typeId: el.dataset.typeid, count: parseInt(el.dataset.count) };
        e.dataTransfer.effectAllowed = 'move';
        el.style.opacity = '0.5';
      });
      el.addEventListener('dragend', function() { el.style.opacity = '1'; });
    });

    // Drop targets
    document.querySelectorAll('#battle-grid [data-row]').forEach(function(cell) {
      cell.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cell.classList.add('bg-cell-dragover');
      });
      cell.addEventListener('dragleave', function() { cell.classList.remove('bg-cell-dragover'); });
      cell.addEventListener('drop', function(e) {
        e.preventDefault();
        cell.classList.remove('bg-cell-dragover');
        BattleSystem.handleDrop(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
      });
    });

    // Click to remove player cell
    document.querySelectorAll('.bg-cell-player').forEach(function(el) {
      el.addEventListener('click', function() {
        var key = el.id.replace('cell-', '');
        if (b.grid[key] && b.grid[key].side === 'player') {
          delete b.grid[key];
          BattleSystem._renderAll();
        }
      });
    });
  },

  // ── COLOCAR ───────────────────────────────────────────────
  handleDrop(r, c) {
    if (!this._drag) return;
    var v = this.validatePlacement(r, c, 'player');
    if (!v.ok) { this._toast(v.msg); return; }
    var key = r + ',' + c;
    var def = (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[this._drag.typeId]) || {icon:'⚔',attack:10,defense:8,category:'infantry',color:'#72c882'};
    this.activeBattle.grid[key] = { side:'player', typeId:this._drag.typeId, count:this._drag.count, def:def };
    this._drag = null;
    this._renderAll();
  },

  // ── VALIDAR ───────────────────────────────────────────────
  validatePlacement(r, c, side) {
    var b = this.activeBattle;
    if (!b.terrain[r] || b.terrain[r][c] !== 1)
      return { ok:false, msg:'No se puede colocar en agua.' };
    var key = r + ',' + c;
    if (b.grid[key] && b.grid[key].side !== side)
      return { ok:false, msg:'Casilla ocupada por el enemigo.' };
    if (side === 'player' && c > 4)
      return { ok:false, msg:'Coloca tus tropas en la mitad izquierda (columnas 0-4).' };
    if (side === 'ai' && c < 5)
      return { ok:false, msg:'Zona reservada al jugador.' };
    return { ok:true };
  },

  // ── IA: COLOCAR UNIDADES ─────────────────────────────────
  aiPlacement() {
    var b = this.activeBattle;
    // Clear old AI cells
    Object.keys(b.grid).forEach(function(k) { if (b.grid[k].side === 'ai') delete b.grid[k]; });

    // Build candidate cells sorted by proximity to frontline (col 5 = closest)
    var candidates = [];
    for (var r = 0; r < 10; r++)
      for (var c = 5; c < 10; c++)
        if (b.terrain[r][c] === 1) candidates.push([r, c]);

    // Shuffle then sort by column (prefer col 5-6 = frontline)
    candidates.sort(function() { return Math.random() - 0.5; });
    candidates.sort(function(a, b2) { return a[1] - b2[1]; });

    var placed = 0;
    b.aiUnits.forEach(function(u) {
      if (u.count <= 0 || placed >= candidates.length) return;
      var rc = candidates[placed++];
      var def = (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[u.typeId]) || u.def || {icon:'⚔',attack:10,defense:8,category:'infantry',color:'#c83030'};
      b.grid[rc[0] + ',' + rc[1]] = { side:'ai', typeId:u.typeId, count:u.count, def:def };
    });
  },

  // ── CONFIRMAR COLOCACIÓN ──────────────────────────────────
  confirmPlacement() {
    var b = this.activeBattle;
    if (!this._allPlaced()) return;
    b.phase = 'fighting';
    this.aiPlacement();
    this._renderAll();
    var self = this;
    setTimeout(function() { self.resolveBattleTurn(); }, 700);
  },

  // ── RESOLVER TURNO ────────────────────────────────────────
  resolveBattleTurn() {
    var b = this.activeBattle;
    if (!b || b.phase !== 'fighting') return;

    var playerCells = Object.entries(b.grid).filter(function(e) { return e[1].side === 'player'; });
    var aiCells     = Object.entries(b.grid).filter(function(e) { return e[1].side === 'ai'; });

    if (!playerCells.length || !aiCells.length) {
      return this._endBattle(playerCells.length > 0);
    }

    var dmgToAI     = this._calcDamage(playerCells, aiCells);
    var dmgToPlayer = this._calcDamage(aiCells, playerCells);

    this.applyCasualties('ai',     dmgToAI,     aiCells);
    this.applyCasualties('player', dmgToPlayer, playerCells);

    b.log.push('T' + b.turn + ': Infligiste ' + dmgToAI + ' bajas. Recibiste ' + dmgToPlayer + '.');
    b.turn++;

    var pLeft = Object.values(b.grid).filter(function(v) { return v.side==='player' && v.count>0; }).length;
    var aLeft = Object.values(b.grid).filter(function(v) { return v.side==='ai'     && v.count>0; }).length;

    if (!aLeft) return this._endBattle(true);
    if (!pLeft) return this._endBattle(false);

    if (b.turn > b.maxTurns) {
      var pTot = Object.values(b.grid).filter(function(v){return v.side==='player';}).reduce(function(s,v){return s+v.count;},0);
      var aTot = Object.values(b.grid).filter(function(v){return v.side==='ai';}).reduce(function(s,v){return s+v.count;},0);
      return this._endBattle(pTot >= aTot);
    }

    // Next turn: back to placement
    b.phase = 'placement';
    this._renderAll();
  },

  // ── CALCULAR DAÑO ────────────────────────────────────────
  _calcDamage(attackers, defenders) {
    var total = 0;
    attackers.forEach(function(ae) {
      var aKey = ae[0], aCell = ae[1];
      var def  = aCell.def || (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[aCell.typeId]) || {attack:10};
      var atk  = (def.attack || 10) * aCell.count;
      var ar   = parseInt(aKey.split(',')[0]), ac = parseInt(aKey.split(',')[1]);

      // +20% adjacency bonus
      var adjacent = defenders.some(function(de) {
        var dr = parseInt(de[0].split(',')[0]), dc = parseInt(de[0].split(',')[1]);
        return Math.abs(ar-dr) <= 1 && Math.abs(ac-dc) <= 1;
      });
      if (adjacent) atk = Math.floor(atk * 1.20);

      // vsBonus
      defenders.forEach(function(de) {
        var dDef = de[1].def || (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[de[1].typeId]) || {category:'infantry'};
        var bonus = ((def.vsBonus || {})[dDef.category] || 1.0);
        atk = Math.floor(atk * bonus * 0.012);
      });
      total += atk;
    });
    return Math.max(1, Math.floor(total));
  },

  // ── APLICAR BAJAS ────────────────────────────────────────
  applyCasualties(side, damage, cells) {
    var b = this.activeBattle;
    if (!cells.length) return;
    var perCell = Math.ceil(damage / cells.length);
    cells.forEach(function(entry) {
      var key = entry[0], cell = entry[1];
      cell.count = Math.max(0, cell.count - perCell);
      if (cell.count === 0) delete b.grid[key];
      else b.grid[key] = cell;
    });
  },

  // ── FIN DE BATALLA ───────────────────────────────────────
  _endBattle(playerWon) {
    var b = this.activeBattle;
    b.phase = 'result';

    var playerLeft  = Object.values(b.grid).filter(function(v){return v.side==='player';}).reduce(function(s,v){return s+v.count;},0);
    var playerStart = b.playerUnits.reduce(function(s,u){return s+u.count;},0);
    var casualties  = Math.max(0, playerStart - playerLeft);

    // Apply casualties to real army
    var ratio = playerStart > 0 ? playerLeft / playerStart : 0;
    if (b.attacker.armyUnits) {
      b.attacker.armyUnits = b.attacker.armyUnits.map(function(u) {
        return Object.assign({}, u, { count: Math.max(0, Math.floor(u.count * ratio)) });
      }).filter(function(u) { return u.count > 0; });
    }
    if (typeof Systems !== 'undefined') b.attacker.army = Systems.Military.totalSoldiers(b.attacker);

    // WarSystem resolution — ensure _war stub exists for WarSystem methods
    if (typeof WarSystem !== 'undefined' && b.defender._war) {
      // _war exists: use full WarSystem resolution
      if (playerWon) {
        b.log.push('🏆 ¡VICTORIA! El enemigo abandona el campo.');
        WarSystem._resolveVictory(b.attacker, b.defender);
      } else {
        b.log.push('💀 DERROTA. El ejército se retira.');
        WarSystem._resolveLoss(b.attacker, b.defender);
      }
    } else {
      // No _war object: apply results directly
      if (playerWon) {
        b.log.push('🏆 ¡VICTORIA! El enemigo abandona el campo.');
        var gold = Math.floor(((b.defender.resources && b.defender.resources.gold) || 200) * 0.4);
        b.attacker.resources.gold = (b.attacker.resources.gold || 0) + gold;
        b.attacker.territories    = (b.attacker.territories || 1) + 1;
        b.attacker.althoriaRegions = (b.attacker.althoriaRegions || 1) + 1;
        b.attacker.morale = Math.min(100, (b.attacker.morale || 50) + 15);
        b.attacker._warsWon = (b.attacker._warsWon || 0) + 1;
        b.attacker._winsAgainst = b.attacker._winsAgainst || {};
        b.attacker._winsAgainst[b.defender.id] = (b.attacker._winsAgainst[b.defender.id] || 0) + 1;
        b.defender.army = Math.max(50, Math.floor((b.defender.army || 200) * 0.5));
        b.defender.atWar = false; b.defender.relation = Math.max(-100, (b.defender.relation || 0) - 20);
        if (typeof Progression !== 'undefined') Progression.awardXP(b.attacker, 'battle_won');
        if (typeof Systems !== 'undefined') Systems.Log.add(b.attacker, '⚔️ ¡Victoria táctica! +' + gold + '💰 · Bajas propias: ' + casualties, 'good');
      } else {
        b.log.push('💀 DERROTA. El ejército se retira.');
        b.attacker.morale    = Math.max(0, (b.attacker.morale || 50) - 20);
        b.attacker.stability = Math.max(0, (b.attacker.stability || 50) - 10);
        if (b.attacker.territories > 1) b.attacker.territories--;
        b.defender.atWar = false;
        if (typeof Progression !== 'undefined') Progression.awardXP(b.attacker, 'battle_lost');
        if (typeof Systems !== 'undefined') Systems.Log.add(b.attacker, '💀 Derrota táctica ante ' + b.defender.name + '. Bajas: ' + casualties, 'crisis');
      }
    }

    b._won       = playerWon;
    b._casualties = casualties;
    this._renderAll();
    if (typeof UI !== 'undefined') UI.fullRender(b.attacker);
  },

  // ── RETIRADA ─────────────────────────────────────────────
  retreat() {
    if (!this.activeBattle) return;
    var b = this.activeBattle;
    b.defender.atWar = false;
    if (b.defender._war) b.defender._war = null;
    if (typeof Systems !== 'undefined') Systems.Log.add(b.attacker, '🏃 Retirada. La guerra con ' + b.defender.name + ' se suspende.', 'warn');
    this.closeBattle();
  },

  requestPeace() {
    if (!this.activeBattle) return;
    if (typeof AI !== 'undefined') AI.playerDiplomaticAction(this.activeBattle.attacker, this.activeBattle.defender.id, 'sue_peace');
    this.closeBattle();
  },

  // ── CERRAR MODAL ─────────────────────────────────────────
  closeBattle() {
    this.activeBattle = null;
    this._drag = null;
    var modal = document.getElementById('modal-battle');
    if (modal) { modal.classList.add('hidden'); modal.style.display = ''; }
    if (typeof Game !== 'undefined' && Game.state) {
      if (typeof UI !== 'undefined') UI.fullRender(Game.state);
    }
  },

  // ── TOAST DE ERROR ───────────────────────────────────────
  _toast(msg) {
    var el = document.getElementById('bg-error');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(function() { el.style.opacity = '0'; }, 2200);
  },

  // Legacy compatibility stubs
  renderBattleModal() { if (this.activeBattle) this._renderAll(); },
  resolveBattle()     { this.confirmPlacement(); },
};
