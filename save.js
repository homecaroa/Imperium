// ============================================================
// IMPERIUM — SAVE.JS + AUTH.JS
// Sistema de login, guardado y carga de partidas (3 slots)
// Usa localStorage — persistencia entre sesiones
// ============================================================

// -- AUTH ----------------------------------------------------
window.Auth = window.Auth || {
  currentUser: null,

  init() {
    // Comprobar si hay sesión guardada
    const saved = localStorage.getItem('imperium_user');
    if (saved) {
      this.currentUser = saved;
      this.onLoginSuccess();
    }
  },

  login() {
    const input = document.getElementById('login-name');
    const name = input ? input.value.trim() : '';
    if (!name || name.length < 2) {
      input.style.borderColor = '#c83030';
      input.placeholder = '⚠ Mínimo 2 caracteres';
      return;
    }
    this.currentUser = name;
    localStorage.setItem('imperium_user', name);
    this.onLoginSuccess();
  },

  loginGuest() {
    this.currentUser = 'Gobernante Anónimo';
    this.onLoginSuccess();
  },

  onLoginSuccess() {
    // Actualizar UI de bienvenida
    const wn = document.getElementById('welcome-name');
    if (wn) wn.textContent = '⚜ Bienvenido, ' + this.currentUser + ' ⚜';

    showScreen('screen-start');

    // Mostrar partidas guardadas en inicio
    SaveSystem.renderStartSaves();
  },

  logout() {
    localStorage.removeItem('imperium_user');
    this.currentUser = null;
    showScreen('screen-login');
    SaveSystem.renderLoginSaves();
  },

  getUser() {
    return this.currentUser || 'Gobernante';
  }
};

// -- SAVE SYSTEM ---------------------------------------------
window.SaveSystem = window.SaveSystem || {
  MAX_SLOTS: 3,
  KEY_PREFIX: 'imperium_save_',

  // Clave de guardado específica por usuario (3 slots por login)
  _userKey(slot) {
    const user = Auth.getUser().toLowerCase().replace(/[^a-z0-9]/g,'_').substring(0,20);
    return this.KEY_PREFIX + user + '_' + slot;
  },

  // Guardar en slot (1-3)
  save(slot) {
    if (!Game.state) return;
    const s = Game.state;
    const saveData = {
      slot,
      user:     Auth.getUser(),
      date:     new Date().toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }),
      civName:  s.civName,
      civIcon:  s.civIcon,
      year:     s.year,
      turn:     s.turn,
      stability: s.stability,
      population: s.population,
      // Estado completo serializado (sin el mapData para ahorrar espacio)
      state: this._serializeState(s)
    };
    localStorage.setItem(this._userKey(slot), JSON.stringify(saveData));
    Systems.Log.add(s, '💾 Partida guardada en ranura ' + slot, 'good');
    this.closeModal();
    UI.renderLog(s);
  },

  // Guardar rápido: busca el slot más antiguo o vacío
  quickSave() {
    const slots = this.getAllSlots();
    // Buscar slot vacío
    for (let i = 1; i <= this.MAX_SLOTS; i++) {
      if (!slots[i-1]) { this.save(i); return; }
    }
    // Si todos llenos, sobreescribir el más antiguo (slot 1 por defecto)
    this.showSaveModal();
  },

  // Cargar desde slot
  load(slot) {
    const raw = localStorage.getItem(this._userKey(slot));
    if (!raw) return;
    try {
      const saveData = JSON.parse(raw);
      const state = this._deserializeState(saveData.state);
      Game.state = state;
      showScreen('screen-game');
      setTimeout(() => {
        const seedEl = document.getElementById('map-seed-label');
        if (seedEl) seedEl.textContent = 'Semilla: ' + state.mapSeed;
        if (state.mapData) {
          try { MapRenderer.init('world-map', state.mapData, state); } catch(e) {}
        }
        if (typeof AlthoriaMap !== 'undefined') {
          AlthoriaMap.assignZones(state);
          AlthoriaMap.updateWar(state);
        }
        UI.fullRender(state);
        Game.generateTurnEvents();
        Systems.Log.add(state, '📜 Partida cargada — ' + saveData.date, 'good');
        UI.renderLog(state);
      }, 60);
      this.closeModal();
    } catch(e) {
      alert('⚠ No se pudo cargar la partida: ' + e.message);
    }
  },

  // Borrar slot
  deleteSlot(slot) {
    if (!confirm('¿Borrar la partida de la ranura ' + slot + '?')) return;
    localStorage.removeItem(this._userKey(slot));
    this.renderSaveModal();
  },

  getAllSlots() {
    const result = [];
    for (let i = 1; i <= this.MAX_SLOTS; i++) {
      const raw = localStorage.getItem(this._userKey(i));
      result.push(raw ? JSON.parse(raw) : null);
    }
    return result;
  },

  // -- SERIALIZACIÓN --
  // El mapData es pesado — lo regeneramos desde la seed
  _serializeState(state) {
    const minimal = { ...state };
    // Guardar solo la seed del mapa, no todo el mapData
    minimal._mapSeed = state.mapSeed;
    minimal.mapData  = null; // demasiado grande — se regenera desde seed

    // -- Campos de deep_systems: serializar explícitamente --
    // (ya están en el spread, pero verificamos que existan)
    minimal._reputation         = state._reputation         || 50;
    minimal._cities             = state._cities             || [];
    minimal._hiddenObjectives   = state._hiddenObjectives   || [];
    minimal._permanentDecisions = state._permanentDecisions || {};
    minimal._secrets            = state._secrets            || {};
    minimal._locked             = state._locked             || {};
    minimal._granted            = state._granted            || {};
    minimal._diploMemory        = state._diploMemory        || {};
    minimal._moralHistory       = state._moralHistory       || [];
    minimal._warsWon            = state._warsWon            || 0;
    minimal._winsAgainst        = state._winsAgainst        || {};
    minimal._warSummaries       = state._warSummaries       || [];
    minimal._goldRateBonus      = state._goldRateBonus      || 0;
    minimal._armyStrengthBonus  = state._armyStrengthBonus  || 0;

    // Eliminar funciones no serializables (de _buildTitle etc. en eventos dinámicos)
    if (minimal.currentEvents) {
      minimal.currentEvents = minimal.currentEvents.map(ev => {
        const safe = Object.assign({}, ev);
        delete safe._buildTitle; delete safe._buildDesc; delete safe._buildContext; delete safe._nationId;
        return safe;
      });
    }

    return JSON.parse(JSON.stringify(minimal));
  },

  _deserializeState(data) {
    // Regenerar el mapa desde la seed
    if (data._mapSeed !== undefined) {
      data.mapData = MapGenerator.generate(data._mapSeed);
      data.mapSeed = data._mapSeed;
    }
    // Restaurar referencias de civData
    const civ = CIVILIZATIONS.find(c => c.id === data.civId);
    if (civ) data.civData = civ;

    // -- Garantizar campos de deep_systems con defaults seguros --
    data._reputation         = data._reputation         ?? 50;
    data._cities             = data._cities             || [];
    data._hiddenObjectives   = data._hiddenObjectives   || [];
    data._permanentDecisions = data._permanentDecisions || {};
    data._secrets            = data._secrets            || {};
    data._locked             = data._locked             || {};
    data._granted            = data._granted            || {};
    data._diploMemory        = data._diploMemory        || {};
    data._moralHistory       = data._moralHistory       || [];
    data._warsWon            = data._warsWon            || 0;
    data._winsAgainst        = data._winsAgainst        || {};
    data._warSummaries       = data._warSummaries       || [];
    data._goldRateBonus      = data._goldRateBonus      || 0;
    data._armyStrengthBonus  = data._armyStrengthBonus  || 0;

    // Reinicializar ciudades si están vacías (partida anterior sin deep_systems)
    if (!data._cities.length && typeof CitySystem !== 'undefined') {
      CitySystem.init(data);
    }
    // Reinicializar objetivos si faltan
    if (!data._hiddenObjectives.length && typeof HiddenObjectives !== 'undefined') {
      HiddenObjectives.init(data);
    }

    return data;
  },

  // -- MODALES --
  showSaveModal() {
    this.renderSaveModal();
    document.getElementById('modal-save').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-save').classList.add('hidden');
  },

  showLoadMenu() {
    this.renderSaveModal(true); // modo carga
    document.getElementById('modal-save').classList.remove('hidden');
  },

  renderSaveModal(loadMode = false) {
    const slots = this.getAllSlots();
    const box   = document.getElementById('modal-save');
    if (!box) return;

    box.querySelector('h2').textContent = loadMode ? '📜 Cargar Partida' : '💾 Guardar Partida';

    const container = document.getElementById('save-slots');
    container.innerHTML = '';

    for (let i = 0; i < this.MAX_SLOTS; i++) {
      const slotNum  = i + 1;
      const saveData = slots[i];
      const div      = document.createElement('div');
      div.className  = 'save-slot';

      if (saveData) {
        div.innerHTML = `
          <div class="save-slot-header">
            <span class="save-slot-name">📜 Ranura ${slotNum}: ${saveData.civIcon} ${saveData.civName}</span>
            <span class="save-slot-date">🗓 ${saveData.date}</span>
          </div>
          <div class="save-slot-info">
            👤 ${saveData.user} · 📅 Año ${saveData.year}, Turno ${saveData.turn} · 👥 ${(saveData.population||0).toLocaleString()} hab · ⚖️ ${Math.floor(saveData.stability||0)} estab.
          </div>
          <div class="save-slot-actions">
            ${loadMode
              ? `<button class="diplo-btn" onclick="SaveSystem.load(${slotNum})">📂 Cargar</button>`
              : `<button class="diplo-btn" onclick="SaveSystem.save(${slotNum})">💾 Guardar aquí</button>`
            }
            <button class="diplo-btn danger" onclick="SaveSystem.deleteSlot(${slotNum})">🗑 Borrar</button>
          </div>
        `;
      } else {
        div.innerHTML = `
          <div class="save-slot-header"><span class="save-slot-name">📭 Ranura ${slotNum}</span></div>
          <div class="save-slot-empty">— Vacía —</div>
          <div class="save-slot-actions">
            ${!loadMode
              ? `<button class="diplo-btn" onclick="SaveSystem.save(${slotNum})">💾 Guardar aquí</button>`
              : ''
            }
          </div>
        `;
      }
      container.appendChild(div);
    }
  },

  // Renderizar preview de saves en pantalla de inicio
  renderStartSaves() {
    const slots = this.getAllSlots().filter(Boolean);
    const btn   = document.getElementById('btn-load-save');
    if (btn) {
      btn.style.opacity = slots.length > 0 ? '1' : '0.5';
    }
  },

  // Renderizar en pantalla de login (partidas del usuario)
  renderLoginSaves() {
    const container = document.getElementById('login-saves');
    if (!container) return;
    const slots = this.getAllSlots().filter(Boolean);
    if (slots.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = '<div class="login-saves-title">📜 PARTIDAS GUARDADAS</div>' +
      slots.map(s => `
        <div class="save-preview" onclick="Auth.currentUser='${s.user}';SaveSystem.load(${s.slot})">
          <span>
            <div class="sp-name">${s.civIcon} ${s.civName} — Año ${s.year}</div>
            <div class="sp-info">👤 ${s.user} · 🗓 ${s.date}</div>
          </span>
          <span style="font-size:18px">▶</span>
        </div>
      `).join('');
  }
};

var SaveSystem = window.SaveSystem;

var Auth = window.Auth;
