// ============================================================
// IMPERIUM — UNLOCKS.JS
// Sistema de desbloqueo progresivo de acciones
//
// Las acciones se desbloquean cumpliendo condiciones:
//   - Turno mínimo
//   - Recursos / estadísticas
//   - Otras acciones previas desbloqueadas
//   - Conquistas / alianzas
//
// Cada unlock tiene: id, nombre, descripción, icono,
// condición de desbloqueo, hint de qué hacer para desbloquearlo
// ============================================================

const UNLOCK_TREE = {

  // ═══════════════════════════════════════════════════════
  // POLÍTICA Y GOBIERNO
  // ═══════════════════════════════════════════════════════
  politica_basica: {
    id: 'politica_basica',
    name: 'Política Básica',
    desc: 'Acceso a políticas económicas y sociales fundamentales.',
    icon: '🏛️',
    category: 'politica',
    tier: 0,
    requires: [],
    condition: s => s.turn >= 1,
    hint: 'Disponible desde el inicio.'
  },
  economia_dirigida: {
    id: 'economia_dirigida',
    name: 'Economía Dirigida',
    desc: 'Capacidad de dirigir la economía del estado.',
    icon: '📊',
    category: 'politica',
    tier: 1,
    requires: ['politica_basica'],
    condition: s => s.turn >= 4 && s.stability >= 40,
    hint: 'Necesitas 4 turnos y Estabilidad ≥ 40.'
  },
  guerra_economica: {
    id: 'guerra_economica',
    name: 'Economía de Guerra',
    desc: 'Producción industrial orientada al conflicto.',
    icon: '⚙️',
    category: 'politica',
    tier: 2,
    requires: ['economia_dirigida'],
    condition: s => s.turn >= 8 && s.army >= 500,
    hint: 'Necesitas 8 turnos y 500 soldados.'
  },
  politica_social_avanzada: {
    id: 'politica_social_avanzada',
    name: 'Políticas Sociales Avanzadas',
    desc: 'Pan y Circo, Escuelas Públicas.',
    icon: '🎭',
    category: 'politica',
    tier: 2,
    requires: ['economia_dirigida'],
    condition: s => s.population >= 3000 && s.morale >= 50,
    hint: 'Necesitas 3000 habitantes y Moral ≥ 50.'
  },
  ejercito_permanente: {
    id: 'ejercito_permanente',
    name: 'Ejército Permanente',
    desc: 'Tropas entrenadas constantemente. Requiere política militar.',
    icon: '⚔️',
    category: 'politica',
    tier: 2,
    requires: ['politica_basica'],
    condition: s => s.army >= 300 && s.resources.gold >= 200,
    hint: 'Necesitas 300 soldados y 200 oro.'
  },
  mercenarios: {
    id: 'mercenarios',
    name: 'Mercenarios',
    desc: 'Contrata soldados de fortuna. Caro pero efectivo.',
    icon: '💰',
    category: 'politica',
    tier: 3,
    requires: ['ejercito_permanente'],
    condition: s => s.resources.gold >= 500 && s.turn >= 12,
    hint: 'Necesitas 500 oro y 12 turnos.'
  },

  // ═══════════════════════════════════════════════════════
  // MILITAR
  // ═══════════════════════════════════════════════════════
  recluta_levas: {
    id: 'recluta_levas',
    name: 'Levas',
    desc: 'Reclutar campesinos como soldados básicos.',
    icon: '🗡️',
    category: 'militar',
    tier: 0,
    requires: [],
    condition: s => s.turn >= 1,
    hint: 'Disponible desde el inicio.'
  },
  recluta_infanteria: {
    id: 'recluta_infanteria',
    name: 'Infantería',
    desc: 'Soldados de infantería entrenados.',
    icon: '🛡️',
    category: 'militar',
    tier: 1,
    requires: ['recluta_levas'],
    condition: s => s.army >= 100,
    hint: 'Necesitas 100 soldados primero.'
  },
  recluta_arqueros: {
    id: 'recluta_arqueros',
    name: 'Arqueros',
    desc: 'Unidades de largo alcance.',
    icon: '🏹',
    category: 'militar',
    tier: 1,
    requires: ['recluta_levas'],
    condition: s => s.resources.wood >= 50,
    hint: 'Necesitas 50 madera en reserva.'
  },
  recluta_caballeria: {
    id: 'recluta_caballeria',
    name: 'Caballería',
    desc: 'Jinetes rápidos y letales.',
    icon: '🐴',
    category: 'militar',
    tier: 2,
    requires: ['recluta_infanteria'],
    condition: s => s.army >= 300 && s.resources.gold >= 150,
    hint: 'Necesitas 300 soldados y 150 oro.'
  },
  recluta_elite: {
    id: 'recluta_elite',
    name: 'Unidades de Élite',
    desc: 'Legionarios, Berserkers, Guerreros Jaguar.',
    icon: '⭐',
    category: 'militar',
    tier: 3,
    requires: ['recluta_caballeria', 'ejercito_permanente'],
    condition: s => s.army >= 800 && s.turn >= 16,
    hint: 'Necesitas 800 soldados, política de ejército permanente y 16 turnos.'
  },
  ballistas: {
    id: 'ballistas',
    name: 'Artillería de Asedio',
    desc: 'Balistas y maquinaria de guerra.',
    icon: '🎯',
    category: 'militar',
    tier: 3,
    requires: ['recluta_elite', 'guerra_economica'],
    condition: s => s.resources.iron >= 100 && s.resources.wood >= 100,
    hint: 'Necesitas economía de guerra y 100 de hierro y madera.'
  },
  unidades_legendarias: {
    id: 'unidades_legendarias',
    name: 'Unidad Legendaria',
    desc: 'Reclutar héroes y campeones únicos.',
    icon: '🌟',
    category: 'militar',
    tier: 4,
    requires: ['recluta_elite'],
    condition: s => s.althoriaRegions >= 3 && s.morale >= 60 && s.turn >= 20,
    hint: 'Necesitas 3 regiones, Moral ≥ 60 y 20 turnos.'
  },

  // ═══════════════════════════════════════════════════════
  // DIPLOMACIA
  // ═══════════════════════════════════════════════════════
  diplomacia_basica: {
    id: 'diplomacia_basica',
    name: 'Diplomacia',
    desc: 'Enviar regalos y establecer relaciones.',
    icon: '🤝',
    category: 'diplomacia',
    tier: 0,
    requires: [],
    condition: s => s.turn >= 1,
    hint: 'Disponible desde el inicio.'
  },
  declarar_guerra: {
    id: 'declarar_guerra',
    name: 'Declarar Guerra',
    desc: 'Iniciar conflictos militares formales.',
    icon: '⚔️',
    category: 'diplomacia',
    tier: 1,
    requires: ['diplomacia_basica', 'recluta_infanteria'],
    condition: s => s.army >= 200,
    hint: 'Necesitas 200 soldados.'
  },
  alianzas: {
    id: 'alianzas',
    name: 'Alianzas',
    desc: 'Proponer tratados de defensa mutua.',
    icon: '📜',
    category: 'diplomacia',
    tier: 2,
    requires: ['diplomacia_basica'],
    condition: s => s.turn >= 6 && s.diplomacy && s.diplomacy.some(n => n.relation >= 30),
    hint: 'Necesitas 6 turnos y al menos una nación con relación ≥ 30.'
  },
  tributo: {
    id: 'tributo',
    name: 'Exigir Tributo',
    desc: 'Forzar a naciones débiles a pagar tributo.',
    icon: '💰',
    category: 'diplomacia',
    tier: 2,
    requires: ['declarar_guerra'],
    condition: s => s.army >= 500 && s.althoriaRegions >= 2,
    hint: 'Necesitas 500 soldados y 2 regiones de Althoria.'
  },
  ceder_territorio: {
    id: 'ceder_territorio',
    name: 'Ceder Territorio',
    desc: 'Ceder regiones a otras naciones para ganar paz o relación.',
    icon: '🗺️',
    category: 'diplomacia',
    tier: 2,
    requires: ['alianzas'],
    condition: s => s.althoriaRegions >= 3,
    hint: 'Necesitas al menos 3 regiones para poder ceder una.'
  },

  // ═══════════════════════════════════════════════════════
  // ESPIONAJE
  // ═══════════════════════════════════════════════════════
  espias_basico: {
    id: 'espias_basico',
    name: 'Red de Espionaje',
    desc: 'Crear y entrenar espías.',
    icon: '🕵️',
    category: 'espias',
    tier: 1,
    requires: ['diplomacia_basica'],
    condition: s => s.turn >= 5 && s.resources.gold >= 100,
    hint: 'Necesitas 5 turnos y 100 oro.'
  },
  reconocimiento: {
    id: 'reconocimiento',
    name: 'Reconocimiento',
    desc: 'Misiones de espionaje básico.',
    icon: '🔍',
    category: 'espias',
    tier: 1,
    requires: ['espias_basico'],
    condition: s => s.spies && s.spies.count >= 1,
    hint: 'Necesitas al menos 1 espía entrenado.'
  },
  sabotaje: {
    id: 'sabotaje',
    name: 'Sabotaje y Conjuras',
    desc: 'Sabotaje económico, intriga política, veneno.',
    icon: '🗡️',
    category: 'espias',
    tier: 2,
    requires: ['reconocimiento'],
    condition: s => s.spies && s.spies.count >= 2 && s.turn >= 10,
    hint: 'Necesitas 2 espías y 10 turnos.'
  },
  robo_planos: {
    id: 'robo_planos',
    name: 'Robo de Secretos',
    desc: 'Robar planos militares y tecnologías.',
    icon: '📋',
    category: 'espias',
    tier: 3,
    requires: ['sabotaje'],
    condition: s => s.spies && s.spies.count >= 3 && s.althoriaRegions >= 3,
    hint: 'Necesitas 3 espías y 3 regiones.'
  },

  // ═══════════════════════════════════════════════════════
  // COMERCIO
  // ═══════════════════════════════════════════════════════
  comercio_basico: {
    id: 'comercio_basico',
    name: 'Comercio Básico',
    desc: 'Acuerdos comerciales simples.',
    icon: '🤝',
    category: 'comercio',
    tier: 0,
    requires: [],
    condition: s => s.turn >= 3,
    hint: 'Disponible en el turno 3.'
  },
  rutas_avanzadas: {
    id: 'rutas_avanzadas',
    name: 'Rutas Avanzadas',
    desc: 'Ruta de la Seda, Comercio de Armas.',
    icon: '🐪',
    category: 'comercio',
    tier: 1,
    requires: ['comercio_basico'],
    condition: s => s.activeTradeRoutes && s.activeTradeRoutes.length >= 1 && s.turn >= 8,
    hint: 'Necesitas 1 ruta activa y 8 turnos.'
  },
  rutas_maritimas: {
    id: 'rutas_maritimas',
    name: 'Rutas Marítimas',
    desc: 'Comercio por mar. Mayor rentabilidad.',
    icon: '⚓',
    category: 'comercio',
    tier: 2,
    requires: ['rutas_avanzadas'],
    condition: s => s.activeTradeRoutes && s.activeTradeRoutes.length >= 2 && s.althoriaRegions >= 2,
    hint: 'Necesitas 2 rutas activas y 2 regiones.'
  },
  alianza_economica: {
    id: 'alianza_economica',
    name: 'Alianza Económica',
    desc: 'El tratado comercial más rentable del juego.',
    icon: '💎',
    category: 'comercio',
    tier: 3,
    requires: ['rutas_maritimas', 'alianzas'],
    condition: s => s.diplomacy && s.diplomacy.some(n => (n.treaties||[]).includes('alliance')) && s.turn >= 20,
    hint: 'Necesitas una alianza formal y 20 turnos.'
  },

  // ═══════════════════════════════════════════════════════
  // ECONOMÍA / CONSTRUCCIÓN
  // ═══════════════════════════════════════════════════════
  prestamos: {
    id: 'prestamos',
    name: 'Sistema de Préstamos',
    desc: 'Tomar deuda pública para financiar emergencias.',
    icon: '💳',
    category: 'economia',
    tier: 0,
    requires: [],
    condition: s => s.turn >= 1,
    hint: 'Disponible desde el inicio.'
  },
  irrigacion: {
    id: 'irrigacion',
    name: 'Irrigación',
    desc: 'Construir sistemas de riego. +50 alimentos/turno.',
    icon: '🚿',
    category: 'economia',
    tier: 1,
    requires: ['prestamos'],
    condition: s => s.turn >= 4 && s.population >= 2000,
    hint: 'Necesitas 4 turnos y 2000 habitantes.'
  },
  graneros: {
    id: 'graneros',
    name: 'Graneros',
    desc: 'Almacenes de grano. +200 alimentos inmediatos.',
    icon: '🏚️',
    category: 'economia',
    tier: 1,
    requires: ['prestamos'],
    condition: s => s.turn >= 2,
    hint: 'Disponible en turno 2.'
  },
  gasto_avanzado: {
    id: 'gasto_avanzado',
    name: 'Gasto Público Avanzado',
    desc: 'Templos, academias, aqueductos y más.',
    icon: '🏗️',
    category: 'economia',
    tier: 2,
    requires: ['irrigacion', 'graneros'],
    condition: s => s.resources.gold >= 300 && s.stability >= 50,
    hint: 'Necesitas 300 oro y Estabilidad ≥ 50.'
  }
};

// ── SISTEMA DE DESBLOQUEOS ─────────────────────────────────
const UnlockSystem = {

  // Calcular todos los desbloqueos activos para el estado actual
  getUnlocked(state) {
    if (!state._unlocked) state._unlocked = {};
    const result = {};
    Object.values(UNLOCK_TREE).forEach(unlock => {
      const reqMet = unlock.requires.every(r => result[r] || state._unlocked[r]);
      const condMet = unlock.condition(state);
      if (reqMet && condMet) {
        result[unlock.id] = true;
        // Primera vez que se desbloquea — notificar
        if (!state._unlocked[unlock.id]) {
          state._unlocked[unlock.id] = true;
          state._newUnlocks = state._newUnlocks || [];
          state._newUnlocks.push(unlock);
        }
      }
    });
    return result;
  },

  // Verificar si una acción específica está desbloqueada
  isUnlocked(state, unlockId) {
    const unlocked = this.getUnlocked(state);
    return !!unlocked[unlockId];
  },

  // Procesar desbloqueos al final de turno y mostrar notificaciones
  processTurn(state) {
    state._newUnlocks = [];
    const prev = Object.assign({}, state._unlocked || {});
    const current = this.getUnlocked(state);

    const newOnes = Object.keys(current).filter(id => !prev[id]);
    if (newOnes.length > 0) {
      newOnes.forEach(id => {
        const u = UNLOCK_TREE[id];
        if (u) {
          Systems.Log.add(state,
            '🔓 DESBLOQUEADO: ' + u.icon + ' ' + u.name + ' — ' + u.desc,
            'good'
          );
        }
      });
      // Mostrar toast de desbloqueo
      if (typeof showUnlockToast === 'function') {
        showUnlockToast(newOnes.map(id => UNLOCK_TREE[id]).filter(Boolean));
      }
    }
    return newOnes;
  },

  // Obtener hint para una acción bloqueada
  getHint(unlockId) {
    const u = UNLOCK_TREE[unlockId];
    return u ? u.hint : 'Condiciones no cumplidas.';
  },

  // Renderizar árbol de progreso en un panel
  renderProgressPanel(state) {
    const unlocked = this.getUnlocked(state);
    const categories = {
      politica:  { name: 'Política',   icon: '🏛️' },
      militar:   { name: 'Militar',    icon: '⚔️' },
      diplomacia:{ name: 'Diplomacia', icon: '🤝' },
      espias:    { name: 'Espionaje',  icon: '🕵️' },
      comercio:  { name: 'Comercio',   icon: '🐪' },
      economia:  { name: 'Economía',   icon: '💰' }
    };

    const byCategory = {};
    Object.values(UNLOCK_TREE).forEach(u => {
      if (!byCategory[u.category]) byCategory[u.category] = [];
      byCategory[u.category].push(u);
    });

    let html = '<div class="unlock-panel">';

    Object.entries(categories).forEach(([cat, meta]) => {
      const items = (byCategory[cat] || []).sort((a,b) => a.tier - b.tier);
      const unlockedCount = items.filter(u => unlocked[u.id]).length;
      html += `
        <div class="unlock-category">
          <div class="unlock-cat-header">
            <span>${meta.icon} ${meta.name}</span>
            <span class="unlock-progress">${unlockedCount}/${items.length}</span>
          </div>
          <div class="unlock-bar-bg">
            <div class="unlock-bar-fill" style="width:${Math.round(unlockedCount/items.length*100)}%"></div>
          </div>
          <div class="unlock-items">
            ${items.map(u => {
              const isUnlocked = !!unlocked[u.id];
              const reqMet = u.requires.every(r => unlocked[r]);
              const tierClass = 'tier-' + u.tier;
              const stateClass = isUnlocked ? 'unlocked' : reqMet ? 'available' : 'locked';
              return `
                <div class="unlock-item ${stateClass} ${tierClass} tb-tip"
                     data-tip="${u.icon} ${u.name}&#10;${u.desc}&#10;&#10;${isUnlocked ? '✓ DESBLOQUEADO' : '🔒 ' + u.hint}">
                  <span class="ui-icon">${u.icon}</span>
                  <span class="ui-name">${u.name}</span>
                  <span class="ui-state">${isUnlocked ? '✓' : reqMet ? '!' : '🔒'}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }
};

// ── TOAST DE DESBLOQUEO ────────────────────────────────────
function showUnlockToast(unlocks) {
  if (!unlocks || !unlocks.length) return;
  var existing = document.getElementById('unlock-toast');
  if (existing) {
    if (typeof existing.remove === 'function') existing.remove();
    else if (existing.parentNode) existing.parentNode.removeChild(existing);
  }
  var toast = document.createElement('div');
  toast.id = 'unlock-toast';
  toast.className = 'unlock-toast';
  var items = unlocks.slice(0,3).map(function(u){
    return '<div class="ut-item"><span class="ut-icon">'+u.icon+'</span><span>'+u.name+'</span></div>';
  }).join('');
  toast.innerHTML = '<div class="ut-header">🔓 ¡Nuevas acciones desbloqueadas!</div>' + items;
  document.body.appendChild(toast);
  setTimeout(function(){ toast.classList.add('toast-show'); }, 10);
  setTimeout(function(){
    toast.classList.remove('toast-show');
    setTimeout(function(){
      if (typeof toast.remove === 'function') toast.remove();
      else if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 500);
  }, 4000);
}
