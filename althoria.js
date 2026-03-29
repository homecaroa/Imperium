// ============================================================
// IMPERIUM — ALTHORIA.JS
// Mapa de Althoria como imagen base con overlays Canvas
//
// RESPUESTAS DE DISEÑO:
// 1. Zonas: aleatorias con lógica geográfica (costeras→mar, etc.)
// 2. Visual: overlay semitransparente + bordes + iconos de capital
// 3. Guerra: zona roja parpadeante + cruce de espadas
// 4. Recursos: iconos flotantes sobre zonas productoras
// 5. Influencia: halo difuso + puntos de espionaje + frontera punteada
// 6. Despliegue: botón fijo top-bar → panel lateral deslizante 50%
// 7. Relación: independiente del grid de celdas (solo visual/narrativo)
// ============================================================

// ── DEFINICIÓN DE REGIONES DE ALTHORIA ──────────────────────
// Cada región tiene: nombre, polígono (% de imagen), tipo geográfico
// Los polígonos son arrays de [x%, y%] sobre la imagen 855×1115px
const ALTHORIA_REGIONS = [
  {
    id: 'norte_glaciar',
    name: 'Glaciar Cuerno de Escarcha',
    geoType: 'mountain_cold',
    center: [33, 6],
    polygon: [[15,2],[55,2],[58,12],[35,14],[18,10]],
    resourceIcon: '⛰️',
    baseResources: { stone: 30, iron: 20, food: 2 }
  },
  {
    id: 'picos_hielo',
    name: 'Picos de Hielo',
    geoType: 'mountain_cold',
    center: [47, 10],
    polygon: [[38,4],[62,4],[65,16],[42,16]],
    resourceIcon: '🏔️',
    baseResources: { stone: 25, iron: 25, gold: 5 }
  },
  {
    id: 'picos_destrozados',
    name: 'Los Picos Destrozados',
    geoType: 'mountain',
    center: [63, 12],
    polygon: [[58,5],[80,8],[78,20],[60,18]],
    resourceIcon: '⛰️',
    baseResources: { stone: 20, iron: 30, gold: 8 }
  },
  {
    id: 'bosque_sombra',
    name: 'El Bosque Sombra de Corona',
    geoType: 'forest',
    center: [30, 23],
    polygon: [[15,14],[45,14],[48,32],[28,34],[12,28]],
    resourceIcon: '🌲',
    baseResources: { wood: 40, food: 15, iron: 5 }
  },
  {
    id: 'planicies_orientales',
    name: 'Vastas Planicies Orientales',
    geoType: 'plains',
    center: [78, 30],
    polygon: [[65,10],[92,10],[95,50],[70,48],[62,38]],
    resourceIcon: '🌾',
    baseResources: { food: 35, gold: 15, wood: 8 }
  },
  {
    id: 'velo_niebla_norte',
    name: 'El Velo de Niebla',
    geoType: 'plains',
    center: [35, 40],
    polygon: [[15,28],[55,28],[58,52],[32,55],[12,48]],
    resourceIcon: '🌿',
    baseResources: { food: 28, wood: 18, gold: 10 }
  },
  {
    id: 'laguna_central',
    name: 'Laguna Central',
    geoType: 'coastal',
    center: [62, 44],
    polygon: [[52,30],[72,30],[75,55],[55,58],[48,45]],
    resourceIcon: '🐟',
    baseResources: { food: 32, gold: 22, wood: 5 }
  },
  {
    id: 'picos_centrales',
    name: 'Picos Centrales',
    geoType: 'mountain',
    center: [57, 58],
    polygon: [[48,50],[68,48],[70,65],[50,68]],
    resourceIcon: '⛏️',
    baseResources: { stone: 22, iron: 28, gold: 12 }
  },
  {
    id: 'islas_serpiente',
    name: 'Las Islas Serpiente Pequeñas',
    geoType: 'coastal',
    center: [18, 58],
    polygon: [[5,48],[32,48],[35,68],[8,70]],
    resourceIcon: '⚓',
    baseResources: { food: 20, gold: 30, wood: 10 }
  },
  {
    id: 'montanas_sur',
    name: 'Montañas del Sur',
    geoType: 'mountain',
    center: [52, 72],
    polygon: [[38,64],[68,62],[72,80],[40,82]],
    resourceIcon: '🪨',
    baseResources: { stone: 28, iron: 25, gold: 10 }
  },
  {
    id: 'castillo_aprendiz',
    name: 'Región del Castillo del Aprendiz',
    geoType: 'plains',
    center: [32, 76],
    polygon: [[12,62],[50,62],[52,85],[15,88]],
    resourceIcon: '🏰',
    baseResources: { food: 22, gold: 25, stone: 12 }
  },
  {
    id: 'paso_cuervo',
    name: 'El Paso del Cuervo',
    geoType: 'mountain',
    center: [80, 68],
    polygon: [[68,55],[92,55],[94,82],[70,85]],
    resourceIcon: '🦅',
    baseResources: { iron: 20, stone: 18, gold: 15 }
  },
  {
    id: 'mar_serpientes',
    name: 'Mar de las Serpientes',
    geoType: 'coastal',
    center: [55, 90],
    polygon: [[35,84],[72,82],[75,95],[32,96]],
    resourceIcon: '🌊',
    baseResources: { food: 25, gold: 20, wood: 8 }
  },
  {
    id: 'pantanos_brumosos',
    name: 'Los Pantanos Brumosos',
    geoType: 'swamp',
    center: [55, 98],
    polygon: [[35,94],[75,93],[78,100],[32,100]],
    resourceIcon: '🌿',
    baseResources: { food: 15, wood: 20, iron: 8 }
  },
  {
    id: 'drownos',
    name: 'Los Drownos Hundida',
    geoType: 'coastal',
    center: [85, 92],
    polygon: [[75,85],[95,85],[97,100],[73,100]],
    resourceIcon: '🐚',
    baseResources: { food: 18, gold: 28, wood: 12 }
  },
  {
    id: 'valle_niebla',
    name: 'Valle de los Bosques de Niebla',
    geoType: 'forest',
    center: [22, 94],
    polygon: [[5,85],[38,85],[35,100],[5,100]],
    resourceIcon: '🌲',
    baseResources: { wood: 35, food: 18, iron: 6 }
  }
];

// Tipos geográficos que prefieren ciertos tipos de nación
const GEO_AFFINITY = {
  mountain_cold: ['norse','mongol'],
  mountain:      ['roman','byzantine','norse'],
  forest:        ['aztec','norse'],
  plains:        ['roman','chinese','mongol'],
  coastal:       ['byzantine','roman'],
  swamp:         ['aztec','chinese']
};

// ── SISTEMA PRINCIPAL DE ALTHORIA ───────────────────────────
const AlthoriаMap = {

  // Estado
  isOpen:        false,
  canvas:        null,
  ctx:           null,
  img:           null,
  imgLoaded:     false,
  nationZones:   {},   // { nationId: [regionId, ...] }
  warZones:      [],   // [{ a: nationId, b: nationId, regionId }]
  influencePoints: [], // [{ x, y, nationId }]
  tradeRouteLines: [], // [{ from:[x,y], to:[x,y], type:'sea'|'land', nationId, routeId }]
  animFrame:     0,
  animTimer:     null,
  tooltip:       null,

  // Despliegues de tropas { regionId: { nationId, count, unitType } }
  deployedTroops: {},

  // Colores de naciones
  NATION_COLORS: {
    player: { fill: 'rgba(100,220,130,0.32)', border: '#72c882', halo: 'rgba(100,220,130,0.12)', icon: '👑' },
    ai_1:   { fill: 'rgba(200,60,60,0.30)',   border: '#e05050', halo: 'rgba(200,60,60,0.10)',   icon: '🌟' },
    ai_2:   { fill: 'rgba(60,110,210,0.30)',  border: '#5080e0', halo: 'rgba(60,110,210,0.10)',  icon: '⚓' },
    ai_3:   { fill: 'rgba(200,160,40,0.30)',  border: '#d0a030', halo: 'rgba(200,160,40,0.10)',  icon: '🌲' }
  },

  // ── INIT ──────────────────────────────────────────────────
  init() {
    this._buildPanel();
    this._loadImage();
  },

  _buildPanel() {
    // Panel deslizante (50% pantalla desde la derecha)
    const panel = document.createElement('div');
    panel.id = 'althoria-panel';
    panel.innerHTML = `
      <div id="althoria-header">
        <div id="althoria-title">
          <span style="font-size:18px">🗺️</span>
          <span>ALTHORIA</span>
        </div>
        <div id="althoria-legend-row"></div>
        <button id="althoria-close" onclick="AlthoriаMap.close()">✕</button>
      </div>
      <div id="althoria-canvas-wrap">
        <canvas id="althoria-canvas"></canvas>
        <div id="althoria-tooltip"></div>
      </div>
      <div id="althoria-info-bar">
        <span id="althoria-hover-text">Pasa el cursor sobre una región para ver información</span>
      </div>
    `;
    document.getElementById('app').appendChild(panel);

    this.canvas  = document.getElementById('althoria-canvas');
    this.ctx     = this.canvas.getContext('2d');
    this.tooltip = document.getElementById('althoria-tooltip');

    this.canvas.addEventListener('mousemove',  (e) => this._onHover(e));
    this.canvas.addEventListener('mouseleave', ()  => this._clearHover());
    this.canvas.addEventListener('click',      (e) => this._onClick(e));
    this.canvas.addEventListener('wheel',      (e) => this._onWheel(e), { passive: false });
    this.canvas.addEventListener('mousedown',  (e) => this._onPanStart(e));
    this.canvas.addEventListener('mousemove',  (e) => this._onPan(e));
    this.canvas.addEventListener('mouseup',    ()  => this._onPanEnd());

    // Zoom & pan state
    this.zoom   = 1.0;    // 1.0 = normal, max 3.0, min 0.8
    this.panX   = 0;
    this.panY   = 0;
    this._panning = false;
    this._panStartX = 0;
    this._panStartY = 0;
    this._panStartPX = 0;
    this._panStartPY = 0;
  },

  _loadImage() {
    this.img = new Image();
    this.img.onload = () => {
      this.imgLoaded = true;
      this._sizeCanvas();
      if (this.isOpen) this.render();
    };
    this.img.src = 'althoria_map.png';
  },

  _sizeCanvas() {
    const wrap = document.getElementById('althoria-canvas-wrap');
    if (!wrap || !this.img.naturalWidth) return;
    const wW = wrap.clientWidth  || 600;
    const wH = wrap.clientHeight || 700;
    const ratio = this.img.naturalWidth / this.img.naturalHeight;
    let cW = wW, cH = wW / ratio;
    if (cH > wH) { cH = wH; cW = wH * ratio; }
    this.canvas.width  = Math.floor(cW);
    this.canvas.height = Math.floor(cH);
    this.canvas.style.width  = cW + 'px';
    this.canvas.style.height = cH + 'px';
  },

  // ── ASIGNACIÓN DE ZONAS — CLUSTERING GEOGRÁFICO ──────────
  // Las naciones reciben zonas contiguas en el mapa de Althoria.
  // Estrategia: cada nación "crece" desde un punto de origen
  // expandiéndose hacia regiones geográficamente cercanas.
  assignZones(gameState) {
    if (!gameState) return;
    const civ  = gameState.civId;
    const nats = (gameState.diplomacy || []).map((n, i) => ({
      id: `ai_${i+1}`, civId: n.id || 'mongol'
    }));
    const all  = [{ id: 'player', civId: civ }, ...nats];
    const seed = gameState.mapSeed || 42;
    const rng  = this._seededRng(seed + 9001);

    this.nationZones = {};
    all.forEach(n => { this.nationZones[n.id] = []; });

    // ── PASO 1: Elegir región de origen para cada nación ──
    // Dividir el mapa en 4 cuadrantes y asignar uno a cada nación
    const regions    = [...ALTHORIA_REGIONS];
    const totalR     = regions.length;
    const midX       = 50, midY = 50;

    // Cuadrantes: NW, NE, SW, SE
    const quadrants = [
      regions.filter(r => r.center[0] < midX && r.center[1] < midY), // NW
      regions.filter(r => r.center[0] >= midX && r.center[1] < midY), // NE
      regions.filter(r => r.center[0] < midX && r.center[1] >= midY), // SW
      regions.filter(r => r.center[0] >= midX && r.center[1] >= midY), // SE
    ];

    // Barajar orden de cuadrantes con seed
    const quadOrder = [0,1,2,3].sort(() => rng() - 0.5);

    // Asignar cuadrante a cada nación
    const assigned   = new Set();
    const origins    = {};

    all.forEach((nation, i) => {
      const quad = quadrants[quadOrder[i % 4]];
      // Preferir región con afinidad geográfica dentro del cuadrante
      const affin  = quad.filter(r => (GEO_AFFINITY[r.geoType]||[]).includes(nation.civId) && !assigned.has(r.id));
      const others = quad.filter(r => !assigned.has(r.id));
      const pool   = affin.length ? affin : others;
      if (!pool.length) return;
      const origin = pool[Math.floor(rng() * pool.length)];
      origins[nation.id] = origin;
      this.nationZones[nation.id].push(origin.id);
      assigned.add(origin.id);
    });

    // ── PASO 2: Expandir cada nación a regiones cercanas ──
    // Distancia euclidiana entre centros de regiones
    const dist = (a, b) => { var dx=a.center[0]-b.center[0], dy=a.center[1]-b.center[1]; return Math.sqrt(dx*dx+dy*dy); };

    const perNation = Math.floor(totalR / all.length);
    let   rounds    = 0;

    while (assigned.size < totalR && rounds < 50) {
      rounds++;
      all.forEach(nation => {
        if (this.nationZones[nation.id].length >= perNation + 1) return;
        const myRegions = this.nationZones[nation.id].map(id => regions.find(r => r.id === id));
        // Buscar región no asignada más cercana a cualquiera de mis regiones
        let best = null, bestDist = Infinity;
        regions.forEach(r => {
          if (assigned.has(r.id)) return;
          myRegions.forEach(mine => {
            const d = dist(mine, r);
            if (d < bestDist) { bestDist = d; best = r; }
          });
        });
        if (best) {
          this.nationZones[nation.id].push(best.id);
          assigned.add(best.id);
        }
      });
    }

    // ── PASO 3: Repartir sobrantes al vecino más cercano ──
    regions.filter(r => !assigned.has(r.id)).forEach(r => {
      let bestNat = null, bestDist = Infinity;
      all.forEach(nation => {
        const myR = this.nationZones[nation.id].map(id => regions.find(x=>x.id===id));
        myR.forEach(mine => {
          const d = dist(mine, r);
          if (d < bestDist) { bestDist = d; bestNat = nation.id; }
        });
      });
      if (bestNat) {
        this.nationZones[bestNat].push(r.id);
        assigned.add(r.id);
      }
    });

    this._buildLegend(gameState);
    this._generateInfluencePoints(gameState, rng);
  },

  _generateInfluencePoints(state, rng) {
    this.influencePoints = [];
    const all = ['player', ...((state.diplomacy||[]).map((_,i)=>`ai_${i+1}`))];
    all.forEach(natId => {
      const zones = this.nationZones[natId] || [];
      // 2-4 puntos de influencia en zonas adyacentes (espías)
      const count = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i++) {
        // Punto en zona aleatoria no controlada
        const others = ALTHORIA_REGIONS.filter(r => !zones.includes(r.id));
        if (!others.length) continue;
        const target = others[Math.floor(rng() * others.length)];
        // Punto cerca del centro de esa región con offset
        const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
        this.influencePoints.push({
          x: clamp(target.center[0] + (rng() - 0.5) * 8, 2, 98),
          y: clamp(target.center[1] + (rng() - 0.5) * 8, 2, 98),
          nationId: natId,
          regionId: target.id,
          type: natId === 'player' ? 'spy' : 'spy'
        });
      }
    });
  },

  // ── ACTUALIZAR ZONAS DE GUERRA ────────────────────────────
  updateWar(gameState) {
    this.warZones = [];
    if (!gameState || !gameState.diplomacy) return;

    gameState.diplomacy.forEach((nation, i) => {
      if (!nation.atWar) return;
      const natId  = `ai_${i + 1}`;
      const pZones = this.nationZones['player'] || [];
      const nZones = this.nationZones[natId]    || [];

      // Encontrar regiones fronterizas (simplificado: cualquier zona del atacante)
      nZones.forEach(rId => {
        this.warZones.push({
          a:        'player',
          b:        natId,
          regionId: rId,
          type:     'active_war'
        });
      });
    });
  },

  // ── RENDER PRINCIPAL ──────────────────────────────────────
  render() {
    if (!this.ctx || !this.imgLoaded) return;
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;

    // Limpiar
    ctx.clearRect(0, 0, W, H);

    // Aplicar zoom + pan como transform de canvas
    const z  = this.zoom  || 1;
    const px = this.panX  || 0;
    const py = this.panY  || 0;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(z, z);

    // 1. Imagen base (con imageSmoothingQuality alta para evitar pixelado)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.img, 0, 0, W, H);

    // 2. Halos de influencia (capa más profunda)
    this._renderInfluenceHalos(ctx, W, H);

    // 3. Overlays de territorio
    this._renderTerritoryOverlays(ctx, W, H);

    // 4. Fronteras punteadas de expansión potencial
    this._renderExpansionBorders(ctx, W, H);

    // 5. Zonas de guerra (parpadeante con animFrame)
    this._renderWarZones(ctx, W, H);

    // 6. Iconos de recursos
    this._renderResourceIcons(ctx, W, H);

    // 7. Iconos de capital
    this._renderCapitalIcons(ctx, W, H);

    // 8. Puntos de influencia/espionaje
    this._renderInfluencePoints(ctx, W, H);

    // 9. Iconos de guerra (espadas)
    this._renderWarIcons(ctx, W, H);

    // 10. Rutas comerciales
    this._renderTradeRoutes(ctx, W, H);

    // 11. Tropas desplegadas
    this._renderDeployedTroops(ctx, W, H);

    ctx.restore();  // Restaurar transform de zoom/pan
    this.animFrame++;
  },

  // ── CAPA: HALOS DE INFLUENCIA ─────────────────────────────
  _renderInfluenceHalos(ctx, W, H) {
    Object.entries(this.nationZones).forEach(([natId, zones]) => {
      const col = this.NATION_COLORS[natId];
      if (!col) return;
      zones.forEach(rId => {
        const region = ALTHORIA_REGIONS.find(r => r.id === rId);
        if (!region) return;
        const cx = region.center[0] / 100 * W;
        const cy = region.center[1] / 100 * H;
        const r  = Math.min(W, H) * 0.12;

        const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
        grad.addColorStop(0, col.halo.replace('0.12', '0.20'));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  },

  // ── CAPA: OVERLAYS DE TERRITORIO ─────────────────────────
  _renderTerritoryOverlays(ctx, W, H) {
    Object.entries(this.nationZones).forEach(([natId, zones]) => {
      const col = this.NATION_COLORS[natId];
      if (!col) return;

      zones.forEach(rId => {
        const region = ALTHORIA_REGIONS.find(r => r.id === rId);
        if (!region) return;

        const pts = region.polygon.map(([px, py]) => [px / 100 * W, py / 100 * H]);

        // Fill semitransparente más fuerte
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fillStyle = col.fill.replace('0.28','0.38').replace('0.30','0.40').replace('0.32','0.42');
        ctx.fill();

        // Borde sólido más grueso
        ctx.strokeStyle = col.border;
        ctx.lineWidth   = 3.0;
        ctx.setLineDash([]);
        ctx.stroke();

        // Etiqueta de nación en el centroide
        const cx2 = pts.reduce((s,[x])=>s+x,0)/pts.length;
        const cy2 = pts.reduce((s,[,y])=>s+y,0)/pts.length;
        ctx.font = 'bold 10px Cinzel,serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(col.icon, cx2+1, cy2+1);
        ctx.fillStyle = col.border;
        ctx.fillText(col.icon, cx2, cy2);
      });
    });
  },

  // ── CAPA: FRONTERAS PUNTEADAS ─────────────────────────────
  _renderExpansionBorders(ctx, W, H) {
    // Dibuja fronteras punteadas alrededor de zonas neutras adyacentes
    Object.entries(this.nationZones).forEach(([natId, zones]) => {
      const col = this.NATION_COLORS[natId];
      if (!col) return;

      ctx.strokeStyle = col.border.replace('#', 'rgba(').length > 7
        ? col.border
        : col.border + '80';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.2;

      zones.forEach(rId => {
        const region = ALTHORIA_REGIONS.find(r => r.id === rId);
        if (!region) return;
        const cx = region.center[0] / 100 * W;
        const cy = region.center[1] / 100 * H;
        const r  = Math.min(W, H) * 0.10;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });
    });
    ctx.setLineDash([]);
  },

  // ── CAPA: ZONAS DE GUERRA ─────────────────────────────────
  _renderWarZones(ctx, W, H) {
    if (!this.warZones.length) return;
    const pulse = Math.sin(this.animFrame * 0.15) * 0.5 + 0.5; // 0→1→0

    this.warZones.forEach(wz => {
      const region = ALTHORIA_REGIONS.find(r => r.id === wz.regionId);
      if (!region) return;
      const pts = region.polygon.map(([px, py]) => [px / 100 * W, py / 100 * H]);

      // Overlay rojo pulsante
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle = `rgba(220,40,40,${0.15 + pulse * 0.25})`;
      ctx.fill();

      // Borde rojo pulsante
      ctx.strokeStyle = `rgba(255,60,60,${0.6 + pulse * 0.4})`;
      ctx.lineWidth   = 2.5 + pulse * 1.5;
      ctx.stroke();
    });
  },

  // ── CAPA: ICONOS DE RECURSOS ──────────────────────────────
  _renderResourceIcons(ctx, W, H) {
    // Mostrar iconos de recursos en las zonas controladas
    Object.entries(this.nationZones).forEach(([natId, zones]) => {
      zones.forEach(rId => {
        const region = ALTHORIA_REGIONS.find(r => r.id === rId);
        if (!region) return;

        const cx = region.center[0] / 100 * W;
        const cy = region.center[1] / 100 * H;

        // Icono del recurso principal
        ctx.font         = Math.floor(Math.min(W, H) * 0.028) + 'px serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(region.resourceIcon, cx + 1, cy + 14);
        // Icono
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText(region.resourceIcon, cx, cy + 13);

        // Nombre de región (pequeño, solo si hay espacio)
        if (W > 400) {
          ctx.font      = Math.floor(Math.min(W,H) * 0.013) + 'px "Cinzel", serif';
          ctx.fillStyle = 'rgba(0,0,0,0.75)';
          ctx.fillText(region.name.split(' ').slice(0,3).join(' '), cx+1, cy + 28);
          ctx.fillStyle = 'rgba(240,220,160,0.95)';
          ctx.fillText(region.name.split(' ').slice(0,3).join(' '), cx, cy + 27);
        }
      });
    });
  },

  // ── CAPA: ICONOS DE CAPITAL (más grandes y visibles) ────────
  _renderCapitalIcons(ctx, W, H) {
    Object.entries(this.nationZones).forEach(([natId, zones]) => {
      if (!zones.length) return;
      const col = this.NATION_COLORS[natId];
      if (!col) return;
      const capRegion = ALTHORIA_REGIONS.find(r => r.id === zones[0]);
      if (!capRegion) return;

      const cx  = capRegion.center[0] / 100 * W;
      const cy  = capRegion.center[1] / 100 * H;
      const r   = Math.min(W, H) * 0.030;  // mucho más grande

      ctx.save();
      // Halo exterior pulsante
      const pulse = 0.5 + 0.5*Math.sin(this.animFrame*0.08);
      ctx.beginPath(); ctx.arc(cx, cy, r+4+pulse*3, 0, Math.PI*2);
      ctx.fillStyle = col.border.replace("#","") + "30" ? col.halo.replace("0.12","0.35") : "rgba(200,160,48,0.2)";
      ctx.fillStyle = col.halo.replace("0.12","0.4");
      ctx.fill();

      // Círculo de capital con sombra
      ctx.shadowColor = col.border; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fillStyle   = "rgba(10,8,4,0.85)"; ctx.fill();
      ctx.strokeStyle = col.border; ctx.lineWidth = 3; ctx.stroke();
      ctx.shadowBlur = 0;

      // Icono de nación grande
      ctx.font = Math.floor(r*1.6)+"px serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(col.icon, cx, cy);

      // Nombre de nación — elemento visual más reconocible
      if (typeof Game !== "undefined" && Game.state) {
        const diplo = Game.state.diplomacy || [];
        let natName = natId === "player" ? (Game.state.civName||"Tu Reino") : "";
        if (!natName) {
          const idx = parseInt(natId.replace("ai_",""))-1;
          natName = diplo[idx]?.name || natId;
        }
        const shortName = natName.split(" ").slice(0,2).join(" ");

        // Escalar nombre con zoom — más grande en zoom out
        const z = this.zoom || 1;
        const nameSize = Math.max(10, Math.floor((W * 0.028) / z));  // ~14px base
        const yOff = cy + r + nameSize + 4;

        // Fondo negro semitransparente para legibilidad
        ctx.font = `bold ${nameSize}px 'Cinzel','Georgia',serif`;
        const tw = ctx.measureText(shortName).width;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(cx - tw/2 - 4, yOff - nameSize, tw + 8, nameSize + 4);

        // Sombra fuerte
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur  = 6;

        // Stroke blanco para máximo contraste
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth   = 3;
        ctx.strokeText(shortName, cx, yOff);

        // Texto coloreado de la nación
        ctx.fillStyle = col.border;
        ctx.shadowBlur = 0;
        ctx.fillText(shortName, cx, yOff);

        // Dot indicator bajo el nombre
        ctx.beginPath();
        ctx.arc(cx, yOff + 6, 2.5, 0, Math.PI*2);
        ctx.fillStyle = col.border;
        ctx.fill();
      }
      ctx.restore();
    });
  },

  // ── CAPA: PUNTOS DE INFLUENCIA/ESPIONAJE ──────────────────
  _renderInfluencePoints(ctx, W, H) {
    const pulse = Math.sin(this.animFrame * 0.10) * 0.5 + 0.5;

    this.influencePoints.forEach(pt => {
      const col = this.NATION_COLORS[pt.nationId];
      if (!col) return;
      const px = pt.x / 100 * W;
      const py = pt.y / 100 * H;
      const r  = Math.min(W, H) * 0.008 + pulse * Math.min(W, H) * 0.003;

      // Punto pulsante
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle   = col.border + 'cc';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth   = 0.8;
      ctx.stroke();

      // Icono de espía si es del jugador
      if (pt.nationId === 'player') {
        ctx.font         = Math.floor(r * 1.8) + 'px serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔍', px, py);
      }
    });
  },

  // ── CAPA: RUTAS COMERCIALES ──────────────────────────────
  _renderTradeRoutes(ctx, W, H) {
    if (!this.tradeRouteLines || !this.tradeRouteLines.length) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.animFrame * 0.05);

    this.tradeRouteLines.forEach(rt => {
      const fx = rt.from[0]/100*W, fy = rt.from[1]/100*H;
      const tx = rt.to[0]/100*W,   ty = rt.to[1]/100*H;

      ctx.save();
      if (rt.type === 'sea') {
        // Ruta marítima — línea discontinua azul con ondas
        ctx.strokeStyle = `rgba(80,140,220,${0.7+pulse*0.25})`;
        ctx.lineWidth   = 2.5;
        ctx.setLineDash([8, 5]);
        ctx.shadowColor = 'rgba(80,160,255,0.5)';
        ctx.shadowBlur  = 6;
      } else {
        // Ruta terrestre — línea sólida dorada
        ctx.strokeStyle = `rgba(200,160,48,${0.6+pulse*0.2})`;
        ctx.lineWidth   = 2;
        ctx.setLineDash([6, 4]);
        ctx.shadowColor = 'rgba(200,160,48,0.4)';
        ctx.shadowBlur  = 4;
      }
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);

      // Icono animado que viaja por la ruta
      const progress = (this.animFrame * 0.008) % 1;
      const mx = fx + (tx-fx)*progress, my = fy + (ty-fy)*progress;
      ctx.shadowBlur = 0;
      ctx.font = '13px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle = rt.type==='sea' ? 'rgba(255,255,255,0.9)' : 'rgba(255,220,100,0.9)';
      ctx.fillText(rt.type==='sea' ? '🚢' : '🐪', mx, my);

      // Etiqueta en el punto medio
      const lx=(fx+tx)/2, ly=(fy+ty)/2;
      ctx.font = '9px JetBrains Mono,monospace';
      ctx.fillStyle='rgba(0,0,0,0.6)';
      ctx.fillText(rt.name||rt.routeId, lx+1, ly-7);
      ctx.fillStyle=rt.type==='sea'?'rgba(120,200,255,0.95)':'rgba(240,210,100,0.95)';
      ctx.fillText(rt.name||rt.routeId, lx, ly-8);
      ctx.restore();
    });
  },

  // ── CAPA: TROPAS DESPLEGADAS ──────────────────────────────
  _renderDeployedTroops(ctx, W, H) {
    if (!this.deployedTroops || !Object.keys(this.deployedTroops).length) return;
    const col = this.NATION_COLORS['player'];
    if (!col) return;

    Object.entries(this.deployedTroops).forEach(([rId, count]) => {
      if (!count) return;
      const region = ALTHORIA_REGIONS.find(r => r.id === rId);
      if (!region) return;
      const cx = region.center[0]/100*W;
      const cy = region.center[1]/100*H;

      // Escalar el tamaño del icono según el tamaño del ejército
      const size = Math.min(20, Math.max(12, Math.log10(count+1) * 8));

      ctx.save();
      // Fondo circular
      ctx.beginPath(); ctx.arc(cx+15, cy-20, size+2, 0, Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fill();
      ctx.strokeStyle=col.border; ctx.lineWidth=1.5; ctx.stroke();

      // Escudo de tropas
      ctx.font = size+'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('⚔️', cx+15, cy-20);

      // Contador
      ctx.font = 'bold 9px JetBrains Mono,monospace';
      ctx.fillStyle='rgba(0,0,0,0.8)';
      ctx.fillText(count>=1000?Math.floor(count/1000)+'k':count, cx+16, cy-8);
      ctx.fillStyle=col.border;
      ctx.fillText(count>=1000?Math.floor(count/1000)+'k':count, cx+15, cy-9);
      ctx.restore();
    });
  },

  // ── CAPA: ICONOS DE GUERRA ────────────────────────────────
  _renderWarIcons(ctx, W, H) {
    if (!this.warZones.length) return;
    const pulse = Math.sin(this.animFrame * 0.15) * 0.5 + 0.5;

    // Agrupar por pares de naciones
    const pairs = {};
    this.warZones.forEach(wz => {
      const key = [wz.a, wz.b].sort().join('_');
      if (!pairs[key]) pairs[key] = wz;
    });

    Object.values(pairs).forEach(wz => {
      // Posición: entre centros de zonas de ambas naciones
      const aZones = this.nationZones[wz.a] || [];
      const bZones = this.nationZones[wz.b] || [];
      if (!aZones.length || !bZones.length) return;

      const aReg = ALTHORIA_REGIONS.find(r => r.id === aZones[0]);
      const bReg = ALTHORIA_REGIONS.find(r => r.id === bZones[0]);
      if (!aReg || !bReg) return;

      const mx = ((aReg.center[0] + bReg.center[0]) / 2) / 100 * W;
      const my = ((aReg.center[1] + bReg.center[1]) / 2) / 100 * H;
      const sz = Math.min(W, H) * (0.04 + pulse * 0.01);

      // Fondo circular
      ctx.beginPath();
      ctx.arc(mx, my, sz * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,20,20,${0.7 + pulse * 0.3})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,${80 + pulse*80},80,${0.8 + pulse * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Icono de espadas
      ctx.font         = Math.floor(sz) + 'px serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = '#fff';
      ctx.fillText('⚔️', mx, my);
    });
  },

  // ── LEYENDA ───────────────────────────────────────────────
  _buildLegend(state) {
    const row = document.getElementById('althoria-legend-row');
    if (!row || !state) return;

    const nations = [
      { id: 'player', name: state.civName || 'Tu Reino', icon: state.civIcon || '👑' },
      ...((state.diplomacy || []).map((n, i) => ({ id: `ai_${i+1}`, name: n.name, icon: n.icon })))
    ];

    row.innerHTML = nations.map(n => {
      const col = this.NATION_COLORS[n.id] || {};
      const zones = (this.nationZones[n.id] || []).length;
      return `<div class="alth-legend-item">
        <span class="alth-dot" style="background:${col.border||'#888'}"></span>
        <span>${n.icon} ${n.name}</span>
        <span class="alth-zones-count">${zones} zonas</span>
      </div>`;
    }).join('');
  },

  // ── HOVER SOBRE EL MAPA ───────────────────────────────────
  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.15;
    const newZoom = Math.max(0.8, Math.min(3.5, (this.zoom || 1) * delta));
    // Zoom toward cursor position
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const z = this.zoom || 1;
    this.panX = mouseX - (mouseX - (this.panX||0)) * (newZoom / z);
    this.panY = mouseY - (mouseY - (this.panY||0)) * (newZoom / z);
    this.zoom = newZoom;
    // Clamp pan
    this._clampPan();
    this.render();
  },

  _onPanStart(e) {
    if (e.button !== 0) return;
    this._panning    = true;
    this._panStartX  = e.clientX;
    this._panStartY  = e.clientY;
    this._panStartPX = this.panX || 0;
    this._panStartPY = this.panY || 0;
    this.canvas.style.cursor = 'grabbing';
  },

  _onPan(e) {
    if (!this._panning) return;
    this.panX = this._panStartPX + (e.clientX - this._panStartX);
    this.panY = this._panStartPY + (e.clientY - this._panStartY);
    this._clampPan();
    this.render();
  },

  _onPanEnd() {
    this._panning = false;
    this.canvas.style.cursor = 'crosshair';
  },

  _clampPan() {
    const W = this.canvas.width, H = this.canvas.height;
    const z = this.zoom || 1;
    const maxPX = W * (z - 1) * 0.5;
    const maxPY = H * (z - 1) * 0.5;
    this.panX = Math.max(-maxPX * 1.5, Math.min(maxPX * 1.5, this.panX || 0));
    this.panY = Math.max(-maxPY * 1.5, Math.min(maxPY * 1.5, this.panY || 0));
  },

  // Convert screen coords to map % (accounting for zoom/pan)
  _screenToMapPct(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const z  = this.zoom || 1;
    const px = ((clientX - rect.left) - (this.panX||0)) / z;
    const py = ((clientY - rect.top)  - (this.panY||0)) / z;
    return [px / this.canvas.width * 100, py / this.canvas.height * 100];
  },

  _onClick(e) {
    const [mapX, mapY] = this._screenToMapPct(e.clientX, e.clientY);
    const region = ALTHORIA_REGIONS.find(r => this._pointInPolygon(mapX, mapY, r.polygon));
    if (!region) return;

    let owner = 'neutral';
    Object.entries(this.nationZones).forEach(([natId, zones]) => {
      if (zones.includes(region.id)) owner = natId;
    });

    // RegionSelector intercepts if active
    if (typeof RegionSelector !== 'undefined' && RegionSelector._active) {
      RegionSelector.onRegionClick(region.id, owner, Game?.state);
      return;
    }

    // Default: show region info in hover bar
    if (owner !== 'player' && owner !== 'neutral') {
      const gameState = (typeof Game !== 'undefined') ? Game.state : null;
      if (gameState) {
        const info = (typeof TerritorySystem !== 'undefined')
          ? TerritorySystem.getRegionInfo(region.id, gameState)
          : null;
        if (info) {
          Systems?.Log?.add(gameState, `🗺️ Región seleccionada: ${info.name} — Propietario: ${info.ownerName}, Guarnición: ~${info.garrison}`, 'info');
          if (typeof UI !== 'undefined') UI.renderLog(gameState);
        }
      }
    }
  },

    _onHover(e) {
    if (this._panning) return;  // Don't hover while panning
    const [px, py] = this._screenToMapPct(e.clientX, e.clientY);

    const region = ALTHORIA_REGIONS.find(r => this._pointInPolygon(px, py, r.polygon));
    if (!region) { this._clearHover(); return; }

    // Owner
    let owner = null, ownerNatId = null;
    Object.entries(this.nationZones).forEach(([natId, zones]) => {
      if (zones.includes(region.id)) { owner = natId; ownerNatId = natId; }
    });
    const col     = owner ? this.NATION_COLORS[owner] : null;
    const warHere = this.warZones.some(wz => wz.regionId === region.id);

    // Garrison in this region
    const garrison = (this.deployedTroops || {})[region.id] || 0;

    // Trade routes passing through this region
    const hasRoute = (this.tradeRouteLines || []).some(rt =>
      Math.abs(rt.from[0] - region.center[0]) < 20 || Math.abs(rt.to[0] - region.center[0]) < 20
    );

    // Resources
    const resEntries = Object.entries(region.baseResources || {}).filter(([,v]) => v > 0);
    const resText    = resEntries.map(([k,v]) => this._resIcon(k) + v).join('  ');

    // Geo type description
    const geoLabels = {
      mountain_cold: '🏔️ Montaña Helada', mountain: '⛰️ Montaña',
      forest: '🌲 Bosque', plains: '🌿 Llanura',
      coastal: '🌊 Costa', swamp: '🦟 Pantano', valley: '🏞️ Valle'
    };
    const geoLabel = geoLabels[region.geoType] || region.geoType;

    // Build owner label — show nation name if we have state
    let ownerLabel = '<span style="color:#888">⚪ Neutral</span>';
    if (owner === 'player') {
      ownerLabel = '<span style="color:' + (col?.border||'#6bb5ff') + '">🏰 Tu Reino</span>';
    } else if (owner && col) {
      // Find nation name from state
      const gameState = (typeof Game !== 'undefined') ? Game.state : null;
      const nationIdx = parseInt((owner||'').replace('ai_','')) - 1;
      const nationName = gameState?.diplomacy?.[nationIdx]?.name || owner;
      const atWar = gameState?.diplomacy?.[nationIdx]?.atWar;
      ownerLabel = '<span style="color:' + col.border + '">' + col.icon + ' ' + nationName + '</span>'
                 + (atWar ? ' <span style="color:#e05050">⚔️</span>' : '');
    }

    const warBadge   = warHere   ? '<span style="color:#e05050;font-weight:bold"> ⚔️ ZONA DE GUERRA</span>' : '';
    const garrBadge  = garrison  ? '<span style="color:#6bb5ff"> · 🛡️ ' + garrison.toLocaleString() + ' tropas</span>' : '';
    const routeBadge = hasRoute  ? ' · <span style="color:#c8a030">🐪 Ruta comercial</span>' : '';

    const infoBar = document.getElementById('althoria-hover-text');
    if (infoBar) {
      infoBar.innerHTML =
        '<b style="color:#e8d090">' + region.resourceIcon + ' ' + region.name + '</b>'
        + ' <span style="color:#888;font-size:10px">(' + geoLabel + ')</span>'
        + ' &nbsp;·&nbsp; ' + ownerLabel + warBadge + garrBadge + routeBadge
        + ' &nbsp;·&nbsp; <span style="color:#c8a84b;font-family:monospace;font-size:11px">' + resText + '</span>';
    }

    // Also show floating tooltip near cursor
    const tip = document.getElementById('althoria-tooltip');
    if (tip) {
      tip.style.display = 'block';
      tip.style.left    = (e.clientX - rect.left + 14) + 'px';
      tip.style.top     = (e.clientY - rect.top  + 10) + 'px';
      tip.innerHTML =
        '<div class="alth-tip-title">' + region.resourceIcon + ' ' + region.name + '</div>'
        + '<div class="alth-tip-geo">' + geoLabel + '</div>'
        + '<div class="alth-tip-owner">' + ownerLabel + warBadge + '</div>'
        + (garrison ? '<div class="alth-tip-row">🛡️ Guarnición: <b>' + garrison.toLocaleString() + '</b></div>' : '')
        + (hasRoute ? '<div class="alth-tip-row">🐪 Ruta comercial activa</div>' : '')
        + '<div class="alth-tip-res">'
        + resEntries.map(([k,v]) => '<span>' + this._resIcon(k) + ' <b>' + v + '</b>/t</span>').join('')
        + '</div>';
    }
  },

  _clearHover() {
    const infoBar = document.getElementById('althoria-hover-text');
    if (infoBar) infoBar.textContent = 'Pasa el cursor sobre una región';
    const tip = document.getElementById('althoria-tooltip');
    if (tip) tip.style.display = 'none';
  },



  _pointInPolygon(px, py, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  },

  _resIcon(res) {
    return { food:'🌾', gold:'💰', wood:'🪵', stone:'🪨', iron:'⚙️' }[res] || '';
  },

  // ── ABRIR / CERRAR PANEL ──────────────────────────────────
  open(gameState) {
    this.isOpen = true;
    const panel = document.getElementById('althoria-panel');
    if (panel) panel.classList.add('open');

    if (gameState) {
      this.assignZones(gameState);
      this.updateWar(gameState);
      this._syncTradeRoutes(gameState);
      this._renderDeployPanel(gameState);
    }

    // Esperar al DOM para tener dimensiones reales
    setTimeout(() => {
      this._sizeCanvas();
      this.render();
      this._startAnimation();
    }, 60);
  },

  close() {
    this.isOpen = false;
    const panel = document.getElementById('althoria-panel');
    if (panel) panel.classList.remove('open');
    this._stopAnimation();
  },

  toggle(gameState) {
    if (this.isOpen) this.close();
    else this.open(gameState);
  },

  // ── ANIMACIÓN ─────────────────────────────────────────────
  _startAnimation() {
    this._stopAnimation();
    const loop = () => {
      if (!this.isOpen) return;
      this.render();
      this.animTimer = requestAnimationFrame(loop);
    };
    this.animTimer = requestAnimationFrame(loop);
  },

  _stopAnimation() {
    if (this.animTimer) {
      cancelAnimationFrame(this.animTimer);
      this.animTimer = null;
    }
  },

  // ── ACTUALIZAR DESDE EL JUEGO ─────────────────────────────
  // Llamar al final de cada turno para reflejar cambios
  sync(gameState) {
    if (!gameState) return;
    this.updateWar(gameState);
    this._buildLegend(gameState);
    this._syncSpies(gameState);
    this._syncTradeRoutes(gameState);
    this._renderDeployPanel(gameState);
  },

  // ── Sincronizar rutas comerciales activas ────────────────
  _syncTradeRoutes(state) {
    this.tradeRouteLines = [];
    if (!state.activeTradeRoutes) return;
    const myZones = this.nationZones['player'] || [];
    if (!myZones.length) return;
    const myRegion = ALTHORIA_REGIONS.find(r => r.id === myZones[0]);
    if (!myRegion) return;

    state.activeTradeRoutes.forEach(rt => {
      // Encontrar la nación destino
      const natIdx = (state.diplomacy||[]).findIndex(n => n.id === rt.nationId);
      if (natIdx < 0) return;
      const natId    = 'ai_'+(natIdx+1);
      const natZones = this.nationZones[natId] || [];
      if (!natZones.length) return;
      const natRegion = ALTHORIA_REGIONS.find(r => r.id === natZones[0]);
      if (!natRegion) return;

      const routeDef = (typeof TRADE_ROUTES !== 'undefined') ? TRADE_ROUTES[rt.routeId] : null;
      this.tradeRouteLines.push({
        from: myRegion.center,
        to:   natRegion.center,
        type: routeDef && routeDef.type === 'sea' ? 'sea' : 'land',
        nationId: natId,
        routeId: rt.routeId,
        name: routeDef ? routeDef.name : rt.routeId
      });
    });
  },

  // ── Panel de despliegue de tropas ────────────────────────
  _renderDeployPanel(state) {
    let panel = document.getElementById('alth-deploy-panel');
    if (!panel) {
      const wrap = document.getElementById('althoria-canvas-wrap');
      if (!wrap) return;
      panel = document.createElement('div');
      panel.id = 'alth-deploy-panel';
      panel.className = 'alth-deploy-panel';
      wrap.parentNode.insertBefore(panel, wrap.nextSibling.nextSibling || null);
    }
    if (!state) { panel.innerHTML = ''; return; }

    const myZones = this.nationZones['player'] || [];
    const options = myZones.map(rId => {
      const reg = ALTHORIA_REGIONS.find(r => r.id === rId);
      const dep = this.deployedTroops[rId] || 0;
      return `<option value="${rId}">${reg ? reg.name : rId}${dep ? ' ['+dep+' tropas]' : ''}</option>`;
    }).join('');

    const totalTroops = state.army || 0;
    const deployed = Object.values(this.deployedTroops).reduce((s,v)=>s+v,0);
    const available = Math.max(0, totalTroops - deployed);

    const depList = Object.entries(this.deployedTroops).filter(([,v])=>v>0).map(([rId,cnt])=>{
      const reg = ALTHORIA_REGIONS.find(r=>r.id===rId);
      return `<div class="alth-deployed-item">
        <span>⚔️ ${reg?reg.name:rId}</span>
        <span style="color:var(--gold2)">${cnt.toLocaleString()} tropas</span>
        <button onclick="AlthoriаMap.undeploy('${rId}')" style="background:none;border:none;color:var(--red2);cursor:pointer;font-size:10px">✕</button>
      </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="alth-deploy-title">⚔️ DESPLEGAR TROPAS · Disponibles: <b style="color:var(--gold2)">${available.toLocaleString()}</b> / ${totalTroops.toLocaleString()}</div>
      <div class="alth-deploy-row">
        <select class="alth-region-select" id="alth-region-sel">${options}</select>
        <input  class="alth-troop-input" id="alth-troop-num" type="number" min="1" max="${available}" value="${Math.floor(available/2)||0}" placeholder="Cantidad">
        <button class="alth-deploy-btn" onclick="AlthoriаMap.deployTroops(Game.state)">⚔️ Desplegar</button>
      </div>
      ${depList ? '<div class="alth-deployed-list">'+depList+'</div>' : ''}
    `;
  },

  // ── Desplegar tropas en región ───────────────────────────
  deployTroops(state) {
    const sel = document.getElementById('alth-region-sel');
    const num = document.getElementById('alth-troop-num');
    if (!sel || !num || !state) return;
    const rId   = sel.value;
    const count = parseInt(num.value) || 0;
    if (count <= 0) return;
    const deployed = Object.values(this.deployedTroops).reduce((s,v)=>s+v,0);
    const available = Math.max(0, (state.army||0) - deployed);
    if (count > available) {
      if (typeof showResourceError === 'function')
        showResourceError([{icon:'⚔️',name:'Tropas',need:count,have:available}]);
      return;
    }
    this.deployedTroops[rId] = (this.deployedTroops[rId]||0) + count;
    this._renderDeployPanel(state);
    this.render();
  },

  undeploy(rId) {
    delete this.deployedTroops[rId];
    const state = (typeof Game !== 'undefined') ? Game.state : null;
    this._renderDeployPanel(state);
    this.render();
  },

  _syncSpies(state) {
    if (!state.spies || !state.spies.active) return;
    // Añadir marcadores donde el jugador tiene espías activos
    state.spies.active.forEach(mission => {
      const targetNation = (state.diplomacy || []).find(n => n.id === mission.targetId);
      if (!targetNation) return;
      // Buscar zona del rival
      const natIdx = (state.diplomacy || []).indexOf(targetNation);
      const natId  = `ai_${natIdx + 1}`;
      const zones  = this.nationZones[natId] || [];
      if (!zones.length) return;

      const rng    = this._seededRng(Date.now() % 999 + mission.turnsLeft);
      const region = ALTHORIA_REGIONS.find(r => r.id === zones[Math.floor(rng() * zones.length)]);
      if (!region) return;

      // Asegurar que no duplicamos
      const exists = this.influencePoints.find(p =>
        p.nationId === 'player' && p.missionId === mission.id
      );
      if (!exists) {
        this.influencePoints.push({
          x: region.center[0] + (rng() - 0.5) * 6,
          y: region.center[1] + (rng() - 0.5) * 6,
          nationId: 'player',
          regionId: region.id,
          missionId: mission.id,
          type: 'active_spy'
        });
      }
    });
  },

  _seededRng(seed) {
    let s = seed;
    return () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
  },

  // ── RESIZE ────────────────────────────────────────────────
  onResize() {
    if (!this.isOpen) return;
    this._sizeCanvas();
    this.render();
  }
};

// Auto-init cuando carga el DOM (el juego lo llamará también)
document.addEventListener('DOMContentLoaded', () => {
  AlthoriаMap.init();
  window.addEventListener('resize', () => AlthoriаMap.onResize());
});
