// ============================================================
// IMPERIUM — BATTLE.JS  v4
// Grid 10x10 sobre mapa Althoria · Posiciones persistentes
// Sin reinicio de turno · Arqueros con alcance 2 casillas
// ============================================================

var BattleSystem = {

  activeBattle: null,
  _drag:        null,

  // ── TERRENO ───────────────────────────────────────────────
  _buildTerrain(seed) {
    var rng = function() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return (seed >>> 0) / 0x7fffffff; };
    var t = [];
    for (var r = 0; r < 10; r++) {
      t[r] = [];
      for (var c = 0; c < 10; c++) {
        var edge = (r === 0 || r === 9 || c === 0 || c === 9) ? 0.45 : 0;
        t[r][c] = rng() > (edge + 0.15) ? 1 : 0;
      }
    }
    // Guaranteed playable center strip
    for (var r2 = 2; r2 <= 7; r2++)
      for (var c2 = 2; c2 <= 7; c2++) t[r2][c2] = 1;
    return t;
  },

  _generateAIUnits(army, nation) {
    var base = ['infanteria','arqueros','caballeria'];
    var bonus = {aztec:'guerreros_jaguar',norse:'berserkers',ottoman:'caballeria_pesada',roman:'legionarios',arabic:'caballeria_pesada',chinese:'infanteria'};
    if (bonus[nation.civId] && typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[bonus[nation.civId]]) base.unshift(bonus[nation.civId]);
    return base.slice(0,3).map(function(tid, i) {
      var def = (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[tid]) || {name:tid,icon:'⚔',strength:10,attack:10,defense:8,category:'infantry',color:'#c83030'};
      var fracs = [0.5, 0.3, 0.2];
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
      phase:       'placement',  // placement → fighting → result
      turn:        1,
      maxTurns:    10,
      grid:        {},
      playerUnits: playerUnits,
      aiUnits:     this._generateAIUnits(targetNation.army || 200, targetNation),
      log:         [],
      territory:   opts.territory || null,
      _initialPlacement: true,  // first turn always has placement
    };

    // Open Althoria map as background context
    if (typeof AlthoriaMap !== 'undefined' && Game && Game.state) {
      AlthoriaMap.isOpen = true;
      var ap = document.getElementById('althoria-panel');
      if (ap) { ap.classList.add('open'); ap.style.right='0'; ap.style.display='flex'; ap.style.zIndex='7000'; }
    }
    var modal = document.getElementById('modal-battle');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display    = 'flex';
      modal.style.background = 'transparent';
      modal.style.zIndex     = '8500';
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
      b.phase === 'placement' ? '📍 Coloca tus unidades (cols 0-4) — Turno ' + b.turn :
      b.phase === 'move'      ? '🚶 Mueve tus unidades (1-2 casillas) — Turno ' + b.turn :
      b.phase === 'fighting'  ? '⚔️ Resolviendo combate…' : '🏆 Resultado';

    box.innerHTML =
      '<div class="bg-header">' +
        '<span class="bg-title">⚔ ' + b.attacker.civName + ' vs ' + b.defender.name + '</span>' +
        '<span class="bg-phase">' + phaseLabel + '</span>' +
        '<button class="bg-close-btn" onclick="BattleSystem.retreat()">✕ Retirada</button>' +
      '</div>' +
      '<div class="bg-body">' +
        '<div class="bg-left">'  + this._renderTray('player') + '</div>' +
        '<div class="bg-center" style="background:rgba(0,0,0,0.55);backdrop-filter:blur(1px)">' + this._renderGrid() + '</div>' +
        '<div class="bg-right">'  + this._renderTray('ai') + this._renderLog() + '</div>' +
      '</div>' +
      '<div class="bg-footer">' + this._renderFooter() + '</div>';

    this._attachListeners();
  },

  _renderTray(side) {
    var b = this.activeBattle;
    var units = side === 'player' ? b.playerUnits : b.aiUnits;
    var label = side === 'player'
      ? '<div class="bg-tray-title" style="color:#72c882">🏰 ' + b.attacker.civName + '</div>'
      : '<div class="bg-tray-title" style="color:#e05050">🔴 ' + b.defender.name  + '</div>';

    var html = label + '<div class="bg-tray">';
    units.forEach(function(u) {
      if (u.count <= 0) return;
      var placed    = BattleSystem._countPlaced(side, u.typeId);
      var remaining = Math.max(0, u.count - placed);
      var isArcher  = (u.def.category === 'ranged' || u.typeId === 'arqueros' || u.typeId === 'ballistas');
      var drag = (side === 'player' && b.phase === 'placement' && remaining > 0)
        ? 'draggable="true" data-typeid="' + u.typeId + '" data-count="' + remaining + '"'
        : '';
      html +=
        '<div class="bg-unit-card' + (remaining === 0 ? ' bg-unit-placed' : '') + '" ' + drag + '>' +
          '<span class="bg-unit-icon">' + (u.def.icon||'⚔') + '</span>' +
          '<span class="bg-unit-name">' + (u.def.name||u.typeId) + (isArcher ? ' 🏹' : '') + '</span>' +
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
    return this.activeBattle.playerUnits.every(function(u) {
      return u.count <= 0 || BattleSystem._countPlaced('player', u.typeId) >= u.count;
    });
  },

  // ── GRID 10×10 ───────────────────────────────────────────
  _renderGrid() {
    var b = this.activeBattle;
    var html = '<div class="bg-grid" id="battle-grid">';
    for (var r = 0; r < 10; r++) {
      for (var co = 0; co < 10; co++) {
        var key  = r + ',' + co;
        var land = b.terrain[r][co] === 1;
        var cell = b.grid[key];
        var cls  = 'bg-cell';
        if (!land)                        cls += ' bg-water';
        else if (cell && cell.side==='player') cls += ' bg-cell-player';
        else if (cell && cell.side==='ai')     cls += ' bg-cell-ai';
        else                              cls += ' bg-land';
        if (land && co === 4)             cls += ' bg-cell-midline';
        // Highlight selected cell for move
        if (b._moveFrom && b._moveFrom === key) cls += ' bg-cell-selected';

        var dropAttr = '';
        if (land) {
          if (b.phase === 'placement') dropAttr = 'data-row="' + r + '" data-col="' + co + '"';
          else if (b.phase === 'move') dropAttr = 'data-row="' + r + '" data-col="' + co + '"';
        }

        var content = '';
        if (!land) {
          content = '<span class="bg-terrain-icon">🌊</span>';
        } else if (cell) {
          var def = (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[cell.typeId]) || cell.def || {icon:'⚔'};
          var isRanged = def.category === 'ranged' || cell.typeId === 'arqueros' || cell.typeId === 'ballistas';
          content =
            '<span class="bg-cell-icon">' + (def.icon||'⚔') + '</span>' +
            '<span class="bg-cell-count' + (cell.side==='player'?' player-count':' ai-count') + '">' + cell.count.toLocaleString() + '</span>' +
            (isRanged ? '<span class="bg-cell-range">🏹</span>' : '');
        }
        html += '<div class="' + cls + '" id="cell-' + key + '" ' + dropAttr + '>' + content + '</div>';
      }
    }
    return html + '</div>';
  },

  _renderLog() {
    var b = this.activeBattle;
    if (!b.log.length) return '<div class="bg-log"></div>';
    return '<div class="bg-log">' +
      b.log.slice(-8).map(function(l) { return '<div class="bg-log-line">' + l + '</div>'; }).join('') +
    '</div>';
  },

  _renderFooter() {
    var b = this.activeBattle;
    if (b.phase === 'placement') {
      var ready = this._allPlaced();
      return (ready
        ? '<button class="bg-btn-primary" onclick="BattleSystem.confirmPlacement()">⚔ ¡Al combate!</button>'
        : '<button class="bg-btn-primary" style="opacity:0.4;cursor:not-allowed" disabled>📍 Coloca todas tus unidades</button>') +
        '<span style="font-family:var(--font-mono);font-size:9px;color:var(--gold2);opacity:0.8">💡 Col. 4 = línea de frente</span>' +
        '<button class="bg-btn" onclick="BattleSystem.retreat()">🏃 Retirada</button>';
    }
    if (b.phase === 'move') {
      return '<button class="bg-btn-primary" onclick="BattleSystem.confirmMove()">⚔ Confirmar movimiento y combatir</button>' +
        '<button class="bg-btn" style="opacity:0.7" onclick="BattleSystem.skipMove()">⏭ Sin mover</button>' +
        '<button class="bg-btn" onclick="BattleSystem.retreat()">🏃 Retirada</button>';
    }
    if (b.phase === 'result') return '<button class="bg-btn-primary" onclick="BattleSystem.closeBattle()">✅ Continuar</button>';
    return '<div style="color:var(--text3);font-family:var(--font-mono);font-size:11px">⚔️ Calculando…</div>';
  },

  // ── DRAG & DROP (solo en placement) ──────────────────────
  _attachListeners() {
    var b = this.activeBattle;

    if (b.phase === 'placement') {
      document.querySelectorAll('.bg-unit-card[draggable="true"]').forEach(function(el) {
        el.addEventListener('dragstart', function(e) {
          BattleSystem._drag = { typeId: el.dataset.typeid, count: parseInt(el.dataset.count) };
          e.dataTransfer.effectAllowed = 'move';
          el.style.opacity = '0.4';
        });
        el.addEventListener('dragend', function() { el.style.opacity = '1'; });
      });
      document.querySelectorAll('#battle-grid [data-row]').forEach(function(cell) {
        cell.addEventListener('dragover', function(e) { e.preventDefault(); cell.classList.add('bg-cell-dragover'); });
        cell.addEventListener('dragleave', function() { cell.classList.remove('bg-cell-dragover'); });
        cell.addEventListener('drop', function(e) {
          e.preventDefault(); cell.classList.remove('bg-cell-dragover');
          BattleSystem.handleDrop(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
        });
      });
      // Click to remove own cell
      document.querySelectorAll('.bg-cell-player').forEach(function(el) {
        el.addEventListener('click', function() {
          var key = el.id.replace('cell-','');
          if (b.grid[key] && b.grid[key].side === 'player') { delete b.grid[key]; BattleSystem._renderAll(); }
        });
      });
    }

    if (b.phase === 'move') {
      // Click player cell to select it as move origin
      document.querySelectorAll('.bg-cell-player').forEach(function(el) {
        el.addEventListener('click', function() {
          var key = el.id.replace('cell-','');
          b._moveFrom = (b._moveFrom === key) ? null : key;
          BattleSystem._renderAll();
        });
      });
      // Click empty/land cell to move selected unit there
      document.querySelectorAll('#battle-grid [data-row]').forEach(function(cell) {
        cell.addEventListener('click', function() {
          if (!b._moveFrom) return;
          var r2 = parseInt(cell.dataset.row), c2 = parseInt(cell.dataset.col);
          BattleSystem.handleMove(b._moveFrom, r2 + ',' + c2);
        });
      });
    }
  },

  handleDrop(r, co) {
    if (!this._drag) return;
    var v = this.validatePlacement(r, co, 'player');
    if (!v.ok) { this._toast(v.msg); return; }
    var key = r + ',' + co;
    var def = (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[this._drag.typeId]) || {icon:'⚔',attack:10,defense:8,category:'infantry',color:'#72c882'};
    this.activeBattle.grid[key] = { side:'player', typeId:this._drag.typeId, count:this._drag.count, def:def };
    this._drag = null;
    this._renderAll();
  },

  handleMove(fromKey, toKey) {
    var b = this.activeBattle;
    var fromCell = b.grid[fromKey];
    if (!fromCell || fromCell.side !== 'player') return;
    var toCell = b.grid[toKey];
    if (toCell && toCell.side === 'ai') { this._toast('Casilla ocupada por el enemigo.'); return; }
    // Check distance (max 2 cells)
    var fr = parseInt(fromKey.split(',')[0]), fc = parseInt(fromKey.split(',')[1]);
    var tr = parseInt(toKey.split(',')[0]),   tc = parseInt(toKey.split(',')[1]);
    var dist = Math.max(Math.abs(fr-tr), Math.abs(fc-tc));
    if (dist > 2) { this._toast('Máximo 2 casillas de movimiento.'); return; }
    if (!b.terrain[tr] || b.terrain[tr][tc] !== 1) { this._toast('No puedes moverse al agua.'); return; }
    // Move
    delete b.grid[fromKey];
    b.grid[toKey] = fromCell;
    b._moveFrom = null;
    this._renderAll();
  },

  validatePlacement(r, co, side) {
    var b = this.activeBattle;
    if (!b.terrain[r] || b.terrain[r][co] !== 1) return { ok:false, msg:'No se puede colocar en agua.' };
    var key = r + ',' + co;
    if (b.grid[key] && b.grid[key].side !== side) return { ok:false, msg:'Casilla ocupada por el enemigo.' };
    if (side === 'player' && co > 4) return { ok:false, msg:'Coloca tus tropas en la mitad izquierda (cols 0-4).' };
    if (side === 'ai'     && co < 5) return { ok:false, msg:'Zona del jugador.' };
    return { ok:true };
  },

  // ── IA ────────────────────────────────────────────────────
  aiPlacement() {
    var b = this.activeBattle;
    Object.keys(b.grid).forEach(function(k) { if (b.grid[k].side === 'ai') delete b.grid[k]; });
    var candidates = [];
    for (var r = 0; r < 10; r++)
      for (var co = 5; co < 10; co++)
        if (b.terrain[r][co] === 1) candidates.push([r,co]);
    // Sort: col 5 first (frontline, closest to player), center rows preferred
    candidates.sort(function(a,b2) {
      if (a[1] !== b2[1]) return a[1] - b2[1]; // lower col first (col5 before col9)
      return Math.abs(a[0]-4.5) - Math.abs(b2[0]-4.5); // center rows first
    });
    var placed = 0;
    b.aiUnits.forEach(function(u) {
      if (u.count <= 0 || placed >= candidates.length) return;
      var rc = candidates[placed++];
      var def = (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[u.typeId]) || u.def || {icon:'⚔',attack:10,defense:8,category:'infantry',color:'#c83030'};
      b.grid[rc[0]+','+rc[1]] = { side:'ai', typeId:u.typeId, count:u.count, def:def };
    });
  },

  // IA moves units 1 cell toward player each turn
  aiMove() {
    var b = this.activeBattle;
    var aiCells = Object.entries(b.grid).filter(function(e){ return e[1].side==='ai'; });
    aiCells.forEach(function(e) {
      var key=e[0]; var cell=e[1];
      var r=parseInt(key.split(',')[0]), c=parseInt(key.split(',')[1]);
      // Move 1 cell toward col 0 (player side)
      var nc = Math.max(5, c-1);
      var newKey = r+','+nc;
      if (nc !== c && !b.grid[newKey] && b.terrain[r] && b.terrain[r][nc]) {
        delete b.grid[key];
        b.grid[newKey] = cell;
      }
    });
  },

  // ── FLUJO DE BATALLA ─────────────────────────────────────
  confirmPlacement() {
    var b = this.activeBattle;
    if (!this._allPlaced()) return;
    this.aiPlacement();
    b.phase = 'fighting';
    b._initialPlacement = false;
    this._renderAll();
    var self = this;
    setTimeout(function() { self.resolveBattleTurn(); }, 700);
  },

  confirmMove() {
    var b = this.activeBattle;
    b._moveFrom = null;
    this.aiMove();
    b.phase = 'fighting';
    this._renderAll();
    var self = this;
    setTimeout(function() { self.resolveBattleTurn(); }, 700);
  },

  skipMove() {
    var b = this.activeBattle;
    b._moveFrom = null;
    this.aiMove();
    b.phase = 'fighting';
    this._renderAll();
    var self = this;
    setTimeout(function() { self.resolveBattleTurn(); }, 400);
  },

  // ── RESOLVER TURNO ────────────────────────────────────────
  resolveBattleTurn() {
    var b = this.activeBattle;
    if (!b || b.phase !== 'fighting') return;

    var playerCells = Object.entries(b.grid).filter(function(e){ return e[1].side==='player'; });
    var aiCells     = Object.entries(b.grid).filter(function(e){ return e[1].side==='ai'; });

    if (!playerCells.length || !aiCells.length) return this._endBattle(playerCells.length > 0);

    var dmgToAI     = this._calcDamage(playerCells, aiCells);
    var dmgToPlayer = this._calcDamage(aiCells, playerCells);

    this.applyCasualties('ai',     dmgToAI,     aiCells);
    this.applyCasualties('player', dmgToPlayer, playerCells);

    b.log.push('T' + b.turn + ': Infligiste ' + dmgToAI.toLocaleString() + ' bajas · Recibiste ' + dmgToPlayer.toLocaleString());
    b.turn++;

    var pLeft = Object.values(b.grid).filter(function(v){ return v.side==='player' && v.count>0; }).length;
    var aLeft = Object.values(b.grid).filter(function(v){ return v.side==='ai' && v.count>0; }).length;
    if (!aLeft) return this._endBattle(true);
    if (!pLeft) return this._endBattle(false);
    if (b.turn > b.maxTurns) {
      var pTot = Object.values(b.grid).filter(function(v){return v.side==='player';}).reduce(function(s,v){return s+v.count;},0);
      var aTot = Object.values(b.grid).filter(function(v){return v.side==='ai';}).reduce(function(s,v){return s+v.count;},0);
      return this._endBattle(pTot >= aTot);
    }

    // Next turn: movement phase (positions persist — no re-placement)
    b.phase = 'move';
    this._renderAll();
  },

  // ── CALCULAR DAÑO — alta mortalidad + alcance arqueros ────
  _calcDamage(attackers, defenders) {
    var total = 0;
    attackers.forEach(function(ae) {
      var aKey = ae[0], aCell = ae[1];
      var def  = aCell.def || (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[aCell.typeId]) || {attack:10};
      var baseAtk = (def.attack || 10) * aCell.count;
      var ar = parseInt(aKey.split(',')[0]), ac = parseInt(aKey.split(',')[1]);
      var isRanged = def.category === 'ranged' || aCell.typeId === 'arqueros' || aCell.typeId === 'ballistas';

      var bestDmg = 0;
      defenders.forEach(function(de) {
        var dKey = de[0];
        var dr = parseInt(dKey.split(',')[0]), dc = parseInt(dKey.split(',')[1]);
        var dist = Math.max(Math.abs(ar-dr), Math.abs(ac-dc));
        var atk = baseAtk;

        // Distance modifier
        if (dist === 0 || dist === 1) {
          atk = baseAtk; // full damage adjacent
        } else if (dist === 2) {
          atk = isRanged ? baseAtk : 0; // archers: full dmg at 2; melee: can't reach
        } else {
          atk = 0; // out of range
        }

        // vsBonus
        var dDef = de[1].def || (typeof MILITARY_UNITS !== 'undefined' && MILITARY_UNITS[de[1].typeId]) || {category:'infantry'};
        var bonus = ((def.vsBonus || {})[dDef.category] || 1.0);
        atk = Math.floor(atk * bonus);

        if (atk > bestDmg) bestDmg = atk;
      });

      // Scale damage — VERY HIGH mortality ×0.18
      total += Math.floor(bestDmg * 0.18);
    });
    return total > 0 ? Math.max(5, Math.floor(total)) : 0;
  },

  applyCasualties(side, damage, cells) {
    var b = this.activeBattle;
    if (!cells.length) return;
    // Distribute damage — front-line cells (closest to enemy) take more
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
    var ratio = playerStart > 0 ? playerLeft / playerStart : 0;
    if (b.attacker.armyUnits) {
      b.attacker.armyUnits = b.attacker.armyUnits.map(function(u) {
        return Object.assign({}, u, { count: Math.max(0, Math.floor(u.count * ratio)) });
      }).filter(function(u){ return u.count > 0; });
    }
    if (typeof Systems !== 'undefined') b.attacker.army = Systems.Military.totalSoldiers(b.attacker);

    if (playerWon) {
      b.log.push('🏆 ¡VICTORIA! El enemigo abandona el campo.');
      if (typeof WarSystem !== 'undefined' && b.defender._war) {
        WarSystem._resolveVictory(b.attacker, b.defender);
      } else {
        var gold = Math.floor(((b.defender.resources && b.defender.resources.gold) || 200) * 0.4);
        b.attacker.resources.gold = (b.attacker.resources.gold || 0) + gold;
        b.attacker.territories    = (b.attacker.territories || 1) + 1;
        b.attacker.althoriaRegions = (b.attacker.althoriaRegions || 1) + 1;
        b.attacker.morale = Math.min(100, (b.attacker.morale || 50) + 15);
        b.attacker._warsWon = (b.attacker._warsWon || 0) + 1;
        b.defender.army = Math.max(50, Math.floor((b.defender.army || 200) * 0.5));
        b.defender.atWar = false;
        b.defender.relation = Math.max(-100, (b.defender.relation || 0) - 20);
        if (typeof Systems !== 'undefined') Systems.Log.add(b.attacker, '⚔️ Victoria · +' + gold + '💰 · Bajas propias: ' + casualties.toLocaleString(), 'good');
      }
    } else {
      b.log.push('💀 DERROTA. Retirada en desorden.');
      if (typeof WarSystem !== 'undefined' && b.defender._war) {
        WarSystem._resolveLoss(b.attacker, b.defender);
      } else {
        b.attacker.morale    = Math.max(0, (b.attacker.morale || 50) - 20);
        b.attacker.stability = Math.max(0, (b.attacker.stability || 50) - 10);
        if (b.attacker.territories > 1) b.attacker.territories--;
        b.defender.atWar = false;
        if (typeof Systems !== 'undefined') Systems.Log.add(b.attacker, '💀 Derrota · Bajas: ' + casualties.toLocaleString(), 'crisis');
      }
    }
    b._won = playerWon; b._casualties = casualties;
    this._renderAll();
    if (typeof UI !== 'undefined') UI.fullRender(b.attacker);
  },

  retreat() {
    if (!this.activeBattle) return;
    var b = this.activeBattle;
    b.defender.atWar = false;
    if (b.defender._war) b.defender._war = null;
    if (typeof Systems !== 'undefined') Systems.Log.add(b.attacker, '🏃 Retirada de ' + b.defender.name, 'warn');
    this.closeBattle();
  },

  requestPeace() {
    if (!this.activeBattle) return;
    if (typeof AI !== 'undefined') AI.playerDiplomaticAction(this.activeBattle.attacker, this.activeBattle.defender.id, 'sue_peace');
    this.closeBattle();
  },

  closeBattle() {
    this.activeBattle = null; this._drag = null;
    var modal = document.getElementById('modal-battle');
    if (modal) { modal.classList.add('hidden'); modal.style.display = ''; modal.style.background = ''; modal.style.zIndex = ''; }
    // Close Althoria panel (was opened for battle background)
    if (typeof AlthoriaMap !== 'undefined') AlthoriaMap.close();
    if (typeof Game !== 'undefined' && Game.state && typeof UI !== 'undefined') UI.fullRender(Game.state);
  },

  _toast(msg) {
    var el = document.getElementById('bg-error');
    if (!el) return;
    el.textContent = msg; el.style.opacity = '1';
    setTimeout(function(){ el.style.opacity='0'; }, 2200);
  },

  renderBattleModal() { if (this.activeBattle) this._renderAll(); },
  resolveBattle()     { this.confirmPlacement(); },
};
