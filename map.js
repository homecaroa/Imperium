// ============================================================
// IMPERIUM — MAP.JS
// Generación procedural de mapas ~500km²
// Grid: 40×25 celdas = 1000 celdas, cada celda = ~0.5km²
// Relieve: Simplex Noise multicapa
// Biomas: 8 tipos con efectos en recursos
// Naciones: colocadas en extremos opuestos garantizados
// Seed aleatoria → millones de mapas únicos
// ============================================================

// ============================================================
// SIMPLEX NOISE — implementación compacta y eficiente
// Basada en Stefan Gustavson's Simplex Noise
// ============================================================
const Noise = (() => {
  const grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];

  let p = [];
  let perm = new Array(512);
  let permMod12 = new Array(512);

  function seedNoise(seed) {
    // LCG para generar permutación determinista desde seed
    let s = seed & 0xffffffff;
    p = [];
    for (let i = 0; i < 256; i++) p[i] = i;

    // Fisher-Yates shuffle con LCG
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = (s >>> 0) % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod12[i] = perm[i] % 12;
    }
  }

  function dot(g, x, y) { return g[0]*x + g[1]*y; }

  function noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;

    const X0 = i - t, Y0 = j - t;
    const x0 = xin - X0, y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;

    const ii = i & 255, jj = j & 255;
    const gi0 = permMod12[ii + perm[jj]];
    const gi1 = permMod12[ii + i1 + perm[jj + j1]];
    const gi2 = permMod12[ii + 1 + perm[jj + 1]];

    let t0 = 0.5 - x0*x0 - y0*y0;
    const n0 = t0 < 0 ? 0 : (t0 *= t0, t0 * t0 * dot(grad3[gi0], x0, y0));

    let t1 = 0.5 - x1*x1 - y1*y1;
    const n1 = t1 < 0 ? 0 : (t1 *= t1, t1 * t1 * dot(grad3[gi1], x1, y1));

    let t2 = 0.5 - x2*x2 - y2*y2;
    const n2 = t2 < 0 ? 0 : (t2 *= t2, t2 * t2 * dot(grad3[gi2], x2, y2));

    return 70 * (n0 + n1 + n2); // rango ~[-1, 1]
  }

  // Fractal Brownian Motion: múltiples octavas de ruido
  function fbm(x, y, octaves, persistence, lacunarity) {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return value / maxValue; // normalizar a [-1, 1]
  }

  return { seedNoise, noise2D, fbm };
})();

// ============================================================
// DEFINICIÓN DE BIOMAS
// Determinados por elevación + humedad
// Cada bioma tiene efectos en producción de recursos
// ============================================================
const BIOMES = {
  deep_water: {
    name: 'Mar Profundo',    icon: '🌊', color: '#0a3a6a',
    passable: false, settleable: false,
    resources: { food: 0, gold: 0, wood: 0, stone: 0, iron: 0 },
    description: 'Aguas profundas. Infranqueable por tierra.'
  },
  shallow_water: {
    name: 'Costa / Estuario', icon: '🐟', color: '#1a5a9a',
    passable: false, settleable: false,
    resources: { food: 15, gold: 8, wood: 0, stone: 0, iron: 0 },
    description: 'Pesca abundante. Rutas comerciales marítimas.'
  },
  beach: {
    name: 'Playa / Delta',    icon: '🏖', color: '#c8b860',
    passable: true, settleable: true,
    resources: { food: 8, gold: 12, wood: 2, stone: 5, iron: 0 },
    description: 'Fácil acceso al mar. Poco fértil.'
  },
  plains: {
    name: 'Llanura',          icon: '🌾', color: '#8aaa40',
    passable: true, settleable: true,
    resources: { food: 20, gold: 5, wood: 5, stone: 3, iron: 2 },
    description: 'Tierras fértiles. Óptima para agricultura.'
  },
  grassland: {
    name: 'Pradera',          icon: '🌿', color: '#5a9a30',
    passable: true, settleable: true,
    resources: { food: 15, gold: 3, wood: 8, stone: 2, iron: 1 },
    description: 'Buenos pastos. Ganadería y algo de madera.'
  },
  forest: {
    name: 'Bosque',           icon: '🌲', color: '#2a6a20',
    passable: true, settleable: true,
    resources: { food: 8, gold: 2, wood: 25, stone: 1, iron: 3 },
    description: 'Rico en madera. Caza abundante.'
  },
  dense_forest: {
    name: 'Bosque Denso',     icon: '🌳', color: '#1a4a14',
    passable: true, settleable: false,
    resources: { food: 5, gold: 1, wood: 35, stone: 0, iron: 5 },
    description: 'Madera excepcional. Difícil de cruzar.'
  },
  hills: {
    name: 'Colinas',          icon: '⛰', color: '#9a8060',
    passable: true, settleable: true,
    resources: { food: 6, gold: 10, wood: 6, stone: 18, iron: 12 },
    description: 'Minería de hierro y piedra. Posición defensiva.'
  },
  mountains: {
    name: 'Montañas',         icon: '🏔', color: '#7a6a5a',
    passable: false, settleable: false,
    resources: { food: 2, gold: 15, wood: 3, stone: 25, iron: 20 },
    description: 'Riqueza mineral. Barrera natural.'
  },
  high_mountains: {
    name: 'Picos Nevados',    icon: '🗻', color: '#d0d0e0',
    passable: false, settleable: false,
    resources: { food: 0, gold: 8, wood: 0, stone: 20, iron: 15 },
    description: 'Infranqueable. Fuente de ríos.'
  },
  desert: {
    name: 'Desierto',         icon: '🏜', color: '#d4a840',
    passable: true, settleable: false,
    resources: { food: 2, gold: 20, wood: 0, stone: 8, iron: 5 },
    description: 'Raro oro y especias. Hostil para asentamientos.'
  },
  swamp: {
    name: 'Marisma',          icon: '🌿', color: '#4a6a3a',
    passable: true, settleable: false,
    resources: { food: 10, gold: 3, wood: 10, stone: 0, iron: 0 },
    description: 'Difícil de cruzar. Recursos limitados.'
  },
  tundra: {
    name: 'Tundra',           icon: '🌨', color: '#9ab0c0',
    passable: true, settleable: false,
    resources: { food: 3, gold: 5, wood: 5, stone: 10, iron: 8 },
    description: 'Frío extremo. Poco productiva.'
  },
  volcano: {
    name: 'Tierra Volcánica', icon: '🌋', color: '#8a2000',
    passable: false, settleable: false,
    resources: { food: 0, gold: 5, wood: 0, stone: 30, iron: 25 },
    description: 'Tierra de lava. Peligrosa pero rica en minerales.'
  }
};

// ============================================================
// GENERADOR DE MAPAS
// ============================================================
const MapGenerator = {

  // Parámetros del grid
  COLS: 40,
  ROWS: 25,
  CELL_KM: 0.5, // km² por celda → 40×25×0.5 = 500km²

  // ============================================================
  // FUNCIÓN PRINCIPAL: genera un mapa completo
  // seed: número entero (si undefined → aleatorio)
  // ============================================================
  generate(seed) {
    if (seed === undefined) seed = Math.floor(Math.random() * 9999999);
    Noise.seedNoise(seed);

    const map = {
      seed,
      cols: this.COLS,
      rows: this.ROWS,
      cells: [],
      rivers: [],
      features: [], // ciudades, recursos especiales
      nations: []   // posiciones de naciones
    };

    // 1. Generar capas de ruido
    const elevation = this.generateElevation(seed);
    const humidity  = this.generateHumidity(seed + 1337);
    const temperature = this.generateTemperature(seed + 2674);

    // 2. Asignar biomas
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const idx = r * this.COLS + c;
        const elev = elevation[idx];
        const hum  = humidity[idx];
        const temp = temperature[idx];

        const biomeId = this.classifyBiome(elev, hum, temp, c, r);
        const biome = BIOMES[biomeId];

        map.cells.push({
          id: idx,
          col: c,
          row: r,
          elevation: elev,
          humidity: hum,
          temperature: temp,
          biomeId,
          biome,
          // Dueño: 'neutral' | 'player' | nation_id
          owner: 'neutral',
          // Recursos que esta celda aporta (base × bioma)
          resourceYield: { ...biome.resources },
          // Rasgos especiales (minas, graneros, etc.)
          features: [],
          // Niebla de guerra
          explored: false
        });
      }
    }

    // 3. Generar ríos (mejoran alimentos en celdas adyacentes)
    this.generateRivers(map, seed);

    // 4. Colocar recursos especiales (minas, oasis, ruinas)
    this.placeSpecialFeatures(map, seed);

    // 5. Colocar naciones en extremos opuestos
    this.placeNations(map, seed);

    return map;
  },

  // ============================================================
  // GENERACIÓN DE CAPAS DE RUIDO
  // ============================================================
  generateElevation(seed) {
    const result = [];
    const scale = 0.08; // escala del ruido (menor = más suave)

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        // FBM multicapa: 6 octavas para relieve detallado
        let e = Noise.fbm(c * scale, r * scale, 6, 0.5, 2.0);

        // Sesgo continental: bordes más probablemente agua
        const edgeX = Math.min(c, this.COLS - 1 - c) / (this.COLS / 2);
        const edgeY = Math.min(r, this.ROWS - 1 - r) / (this.ROWS / 2);
        const edgeFactor = Math.pow(Math.min(edgeX, edgeY), 0.6);
        e = e * 0.7 + edgeFactor * 0.3;

        result.push(e);
      }
    }
    return this.normalize(result);
  },

  generateHumidity(seed) {
    Noise.seedNoise(seed);
    const result = [];
    const scale = 0.06;
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        result.push(Noise.fbm(c * scale + 100, r * scale + 100, 4, 0.6, 2.0));
      }
    }
    return this.normalize(result);
  },

  generateTemperature(seed) {
    Noise.seedNoise(seed);
    const result = [];
    const scale = 0.04;
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        // Temperatura decrece con latitud (eje vertical)
        const latFactor = 1 - (r / this.ROWS);
        let t = Noise.fbm(c * scale + 200, r * scale + 200, 3, 0.5, 2.0) * 0.3 + latFactor * 0.7;
        result.push(t);
      }
    }
    return this.normalize(result);
  },

  // Normalizar array a [0, 1]
  normalize(arr) {
    const min = Math.min(...arr), max = Math.max(...arr);
    return arr.map(v => (v - min) / (max - min));
  },

  // ============================================================
  // CLASIFICACIÓN DE BIOMA
  // Basado en elevación + humedad + temperatura
  // ============================================================
  classifyBiome(elev, hum, temp, col, row) {
    // Agua
    if (elev < 0.28) return 'deep_water';
    if (elev < 0.34) return 'shallow_water';
    if (elev < 0.38) return 'beach';

    // Volcán (raro, elevación muy alta + calor)
    if (elev > 0.92 && temp > 0.5) return 'volcano';

    // Alta montaña
    if (elev > 0.85) return 'high_mountains';
    if (elev > 0.75) return 'mountains';

    // Colinas
    if (elev > 0.62) return 'hills';

    // Zonas frías (norte del mapa)
    if (temp < 0.2 && elev > 0.38) return 'tundra';

    // Desierto: caliente y seco
    if (temp > 0.75 && hum < 0.3) return 'desert';

    // Marisma: bajo y húmedo
    if (elev < 0.45 && hum > 0.75) return 'swamp';

    // Bosques
    if (hum > 0.65 && temp > 0.25) return 'dense_forest';
    if (hum > 0.50 && temp > 0.25) return 'forest';

    // Pradera / llanura
    if (hum > 0.35) return 'grassland';

    return 'plains';
  },

  // ============================================================
  // RÍOS — de montaña hacia el mar
  // ============================================================
  generateRivers(map, seed) {
    const rng = this.seededRng(seed + 5000);
    const numRivers = 3 + Math.floor(rng() * 4); // 3-6 ríos

    for (let ri = 0; ri < numRivers; ri++) {
      // Punto de inicio: zona de montañas
      const starts = map.cells.filter(c =>
        c.biomeId === 'mountains' || c.biomeId === 'hills'
      );
      if (!starts.length) continue;

      const start = starts[Math.floor(rng() * starts.length)];
      const river = this.traceRiver(map, start, rng);

      if (river.length > 3) {
        map.rivers.push(river);
        // Los ríos fertilizan celdas adyacentes (+30% alimentos)
        river.forEach(cellId => {
          const cell = map.cells[cellId];
          if (cell && cell.biome.settleable) {
            cell.resourceYield.food = Math.floor(cell.resourceYield.food * 1.3);
            cell.features.push('river');
          }
        });
      }
    }
  },

  traceRiver(map, startCell, rng) {
    const path = [startCell.id];
    let current = startCell;
    const visited = new Set([startCell.id]);
    let steps = 0;

    while (steps < 30) {
      const neighbors = this.getNeighbors(map, current.col, current.row);
      // Fluir hacia elevación más baja
      const lower = neighbors
        .filter(n => n.elevation < current.elevation && !visited.has(n.id))
        .sort((a, b) => a.elevation - b.elevation);

      if (!lower.length) break;

      // A veces toma el segundo más bajo (naturalidad)
      const next = lower[Math.floor(rng() * Math.min(2, lower.length))];
      if (!next) break;

      path.push(next.id);
      visited.add(next.id);
      current = next;

      if (current.biomeId === 'deep_water' || current.biomeId === 'shallow_water') break;
      steps++;
    }

    return path;
  },

  // ============================================================
  // RECURSOS ESPECIALES
  // ============================================================
  placeSpecialFeatures(map, seed) {
    const rng = this.seededRng(seed + 8888);

    const featureTypes = [
      { id: 'gold_mine',  icon: '⛏', biomes: ['mountains','hills'], bonus: { gold: 25 }, label: 'Mina de Oro' },
      { id: 'iron_vein',  icon: '🔩', biomes: ['mountains','hills'], bonus: { iron: 30 }, label: 'Veta de Hierro' },
      { id: 'fertile',    icon: '🌻', biomes: ['plains','grassland'], bonus: { food: 25 }, label: 'Tierra Fértil' },
      { id: 'quarry',     icon: '🪨', biomes: ['hills','mountains'], bonus: { stone: 30 }, label: 'Cantera' },
      { id: 'oasis',      icon: '🌴', biomes: ['desert'], bonus: { food: 30, gold: 10 }, label: 'Oasis' },
      { id: 'ruins',      icon: '🏛', biomes: ['plains','hills','desert'], bonus: { gold: 15 }, label: 'Ruinas Antiguas' },
      { id: 'forest_hut', icon: '🪵', biomes: ['forest','dense_forest'], bonus: { wood: 30 }, label: 'Aserradero Natural' },
    ];

    const numFeatures = 12 + Math.floor(rng() * 8); // 12-20 recursos especiales

    for (let i = 0; i < numFeatures; i++) {
      const ft = featureTypes[Math.floor(rng() * featureTypes.length)];
      const candidates = map.cells.filter(c =>
        ft.biomes.includes(c.biomeId) &&
        c.features.length === 0 &&
        c.owner === 'neutral'
      );
      if (!candidates.length) continue;

      const cell = candidates[Math.floor(rng() * candidates.length)];
      cell.features.push(ft.id);
      cell.featureIcon = ft.icon;
      cell.featureLabel = ft.label;
      // Aplicar bonificación
      Object.entries(ft.bonus).forEach(([res, val]) => {
        cell.resourceYield[res] = (cell.resourceYield[res] || 0) + val;
      });
    }
  },

  // ============================================================
  // COLOCACIÓN DE NACIONES EN EXTREMOS OPUESTOS
  //
  // El mapa se divide en 4 zonas de esquina.
  // Se seleccionan 2 pares de esquinas opuestas:
  //   Par A: [TL, BR] o [TR, BL] → jugador y principal enemigo
  //   Naciones adicionales: laterales medios
  // Garantía: ninguna nación a menos de 60% de distancia del mapa
  // ============================================================
  placeNations(map, seed) {
    const rng = this.seededRng(seed + 3333);
    const COLS = this.COLS, ROWS = this.ROWS;

    // Zonas de esquina: 25% del mapa cada una
    const zoneW = Math.floor(COLS * 0.25);
    const zoneH = Math.floor(ROWS * 0.25);

    const corners = {
      TL: { colRange: [0, zoneW],          rowRange: [0, zoneH] },
      TR: { colRange: [COLS - zoneW, COLS], rowRange: [0, zoneH] },
      BL: { colRange: [0, zoneW],          rowRange: [ROWS - zoneH, ROWS] },
      BR: { colRange: [COLS - zoneW, COLS], rowRange: [ROWS - zoneH, ROWS] },
      // Laterales para naciones adicionales
      ML: { colRange: [0, zoneW],          rowRange: [Math.floor(ROWS*0.35), Math.floor(ROWS*0.65)] },
      MR: { colRange: [COLS - zoneW, COLS], rowRange: [Math.floor(ROWS*0.35), Math.floor(ROWS*0.65)] },
      TM: { colRange: [Math.floor(COLS*0.35), Math.floor(COLS*0.65)], rowRange: [0, zoneH] },
      BM: { colRange: [Math.floor(COLS*0.35), Math.floor(COLS*0.65)], rowRange: [ROWS - zoneH, ROWS] },
    };

    // Par de extremos opuestos para jugador y rival principal
    const oppositePairs = [
      ['TL', 'BR'],
      ['TR', 'BL'],
    ];
    const chosenPair = oppositePairs[Math.floor(rng() * oppositePairs.length)];

    // Naciones adicionales en laterales
    const additionalZones = ['ML', 'MR', 'TM', 'BM'];
    const shuffledAdditional = additionalZones.sort(() => rng() - 0.5).slice(0, 2);

    const allZones = [chosenPair[0], chosenPair[1], ...shuffledAdditional];

    map.nationsPlacement = [];

    allZones.forEach((zoneName, index) => {
      const zone = corners[zoneName];
      const cell = this.findSettleableCell(map, zone, rng);

      if (cell) {
        map.nationsPlacement.push({
          nationIndex: index,
          cellId: cell.id,
          col: cell.col,
          row: cell.row,
          zone: zoneName,
          isPlayer: index === 0 // el primero es el jugador
        });

        // Marcar celdas iniciales (3×3 alrededor del capital)
        this.claimStartingCells(map, cell, index === 0 ? 'player' : `ai_${index}`);
      }
    });
  },

  // Busca la celda más habitable dentro de una zona
  findSettleableCell(map, zone, rng) {
    const candidates = map.cells.filter(c =>
      c.col >= zone.colRange[0] && c.col < zone.colRange[1] &&
      c.row >= zone.rowRange[0] && c.row < zone.rowRange[1] &&
      c.biome.settleable
    );

    if (!candidates.length) {
      // Fallback: cualquier celda pasable en la zona
      const passable = map.cells.filter(c =>
        c.col >= zone.colRange[0] && c.col < zone.colRange[1] &&
        c.row >= zone.rowRange[0] && c.row < zone.rowRange[1] &&
        c.biome.passable
      );
      return passable.length ? passable[Math.floor(rng() * passable.length)] : null;
    }

    // Preferir celdas con mayor productividad total
    candidates.sort((a, b) => {
      const sumA = Object.values(a.resourceYield).reduce((s,v) => s+v, 0);
      const sumB = Object.values(b.resourceYield).reduce((s,v) => s+v, 0);
      return sumB - sumA;
    });

    // Top 3 mejores, elegir aleatoriamente para variedad
    return candidates[Math.floor(rng() * Math.min(3, candidates.length))];
  },

  // Reclamar celdas iniciales (capital + 8 adyacentes)
  claimStartingCells(map, capitalCell, owner) {
    capitalCell.owner = owner;
    capitalCell.isCapital = true;

    // Adyacentes
    const adj = this.getNeighbors(map, capitalCell.col, capitalCell.row);
    adj.forEach(n => {
      if (n.biome.passable) n.owner = owner;
    });

    // Segunda corona (parcial)
    adj.forEach(n => {
      const adj2 = this.getNeighbors(map, n.col, n.row);
      adj2.forEach(n2 => {
        if (n2.owner === 'neutral' && n2.biome.passable && Math.random() > 0.5) {
          n2.owner = owner;
        }
      });
    });
  },

  // ============================================================
  // UTILIDADES
  // ============================================================
  getNeighbors(map, col, row) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    return dirs.map(([dc, dr]) => {
      const nc = col + dc, nr = row + dr;
      if (nc < 0 || nc >= map.cols || nr < 0 || nr >= map.rows) return null;
      return map.cells[nr * map.cols + nc];
    }).filter(Boolean);
  },

  // RNG determinista desde seed
  seededRng(seed) {
    let s = seed;
    return function() {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  },

  // ============================================================
  // CALCULAR ESTADÍSTICAS DEL MAPA (para inicializar civilización)
  // ============================================================
  getPlayerStartStats(map) {
    const playerCells = map.cells.filter(c => c.owner === 'player');
    const totals = { food: 0, gold: 0, wood: 0, stone: 0, iron: 0 };
    playerCells.forEach(c => {
      Object.entries(c.resourceYield).forEach(([res, val]) => {
        if (totals[res] !== undefined) totals[res] += val;
      });
    });
    return {
      cellIds: playerCells.map(c => c.id),
      capitalCell: playerCells.find(c => c.isCapital),
      resourceBonuses: totals,
      territories: playerCells.length
    };
  },

  getAINationCells(map, nationIndex) {
    const ownerId = `ai_${nationIndex}`;
    return map.cells.filter(c => c.owner === ownerId).map(c => c.id);
  }
};

// ============================================================
// RENDERER DEL MAPA — Canvas 2D de alta resolución
// ============================================================
const MapRenderer = {

  CELL_W: 22, // píxeles por celda (ancho)
  CELL_H: 18, // píxeles por celda (alto)

  canvas: null,
  ctx: null,
  map: null,
  state: null,

  // Colores de bioma (palette cuidada)
  BIOME_COLORS: {
    deep_water:    '#0e2d5a',
    shallow_water: '#1a4a8a',
    beach:         '#c8b448',
    plains:        '#7aaa32',
    grassland:     '#4a8a22',
    forest:        '#2a6018',
    dense_forest:  '#184010',
    hills:         '#8a7050',
    mountains:     '#6a5848',
    high_mountains:'#c8c8d8',
    desert:        '#c8a030',
    swamp:         '#3a5a2a',
    tundra:        '#8aa0b0',
    volcano:       '#8a1800'
  },

  // Overlay de propietario
  OWNER_OVERLAY: {
    player:  'rgba(74, 180, 100, 0.35)',
    ai_1:    'rgba(200, 60, 60, 0.35)',
    ai_2:    'rgba(60, 100, 200, 0.35)',
    ai_3:    'rgba(200, 160, 40, 0.35)',
    neutral: null
  },

  OWNER_BORDER: {
    player:  '#4ab464',
    ai_1:    '#c83c3c',
    ai_2:    '#3c64c8',
    ai_3:    '#c8a028',
    neutral: null
  },

  init(containerId, mapData, gameState) {
    this.map = mapData;
    this.state = gameState;

    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    this.canvas = document.createElement('canvas');
    const W = mapData.cols * this.CELL_W;
    const H = mapData.rows * this.CELL_H;
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.style.width = '100%';
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.cursor = 'crosshair';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position:absolute; background:rgba(10,8,6,0.95); border:1px solid #3a2e1e;
      color:#d4c4a0; font-family:'JetBrains Mono',monospace; font-size:10px;
      padding:6px 10px; pointer-events:none; z-index:100;
      display:none; max-width:180px; line-height:1.6;
    `;
    container.style.position = 'relative';
    container.appendChild(this.tooltip);

    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => { this.tooltip.style.display = 'none'; });

    this.render();
  },

  render() {
    if (!this.ctx || !this.map) return;
    const ctx = this.ctx;
    const W = this.CELL_W, H = this.CELL_H;

    this.map.cells.forEach(cell => {
      const x = cell.col * W;
      const y = cell.row * H;

      // 1. Color base del bioma
      ctx.fillStyle = this.BIOME_COLORS[cell.biomeId] || '#333';
      ctx.fillRect(x, y, W, H);

      // 2. Variación de elevación sutil (shading)
      const shade = (cell.elevation - 0.5) * 0.3;
      if (shade > 0) {
        ctx.fillStyle = `rgba(255,255,255,${shade * 0.4})`;
      } else {
        ctx.fillStyle = `rgba(0,0,0,${Math.abs(shade) * 0.5})`;
      }
      ctx.fillRect(x, y, W, H);

      // 3. Overlay de dueño
      const overlay = this.OWNER_OVERLAY[cell.owner];
      if (overlay) {
        ctx.fillStyle = overlay;
        ctx.fillRect(x, y, W, H);
      }

      // 4. Ríos
      if (cell.features.includes('river')) {
        ctx.strokeStyle = 'rgba(80,140,220,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y + H/2);
        ctx.lineTo(x + W, y + H/2);
        ctx.stroke();
      }

      // 5. Capital
      if (cell.isCapital) {
        ctx.fillStyle = cell.owner === 'player' ? '#4ab464' :
                        cell.owner === 'ai_1' ? '#c83c3c' :
                        cell.owner === 'ai_2' ? '#3c64c8' : '#c8a028';
        ctx.beginPath();
        ctx.arc(x + W/2, y + H/2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 6. Icono de feature especial (solo texto pequeño)
      if (cell.featureIcon && !cell.isCapital) {
        ctx.font = `${Math.floor(H * 0.65)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.featureIcon, x + W/2, y + H/2);
      }

      // 7. Borde de territorio
      if (cell.owner !== 'neutral') {
        const borderColor = this.OWNER_BORDER[cell.owner];
        if (borderColor) {
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 0.5, y + 0.5, W - 1, H - 1);
        }
      }

      // 8. Grid suave
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.3;
      ctx.strokeRect(x, y, W, H);
    });

    // 9. Ríos como líneas encima de todo
    this.renderRivers();

    // 10. Brújula
    this.renderCompass();

    // 11. Escala del mapa
    this.renderScale();
  },

  renderRivers() {
    const ctx = this.ctx;
    const W = this.CELL_W, H = this.CELL_H;

    this.map.rivers.forEach(river => {
      if (river.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(60,120,220,0.6)';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';

      river.forEach((cellId, i) => {
        const cell = this.map.cells[cellId];
        if (!cell) return;
        const x = cell.col * W + W/2;
        const y = cell.row * H + H/2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  },

  renderCompass() {
    const ctx = this.ctx;
    const x = this.map.cols * this.CELL_W - 30;
    const y = 25;
    ctx.fillStyle = 'rgba(10,8,6,0.7)';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#c8a84b';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x, y - 7);
    ctx.fillStyle = '#786050';
    ctx.fillText('S', x, y + 7);
    ctx.fillText('E', x + 7, y);
    ctx.fillText('O', x - 7, y);
  },

  renderScale() {
    const ctx = this.ctx;
    const scaleX = 10;
    const scaleY = this.map.rows * this.CELL_H - 12;
    const scaleW = this.CELL_W * 4; // 4 celdas = 2km

    ctx.fillStyle = 'rgba(10,8,6,0.6)';
    ctx.fillRect(scaleX - 2, scaleY - 8, scaleW + 24, 12);

    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(scaleX, scaleY);
    ctx.lineTo(scaleX + scaleW, scaleY);
    ctx.moveTo(scaleX, scaleY - 3);
    ctx.lineTo(scaleX, scaleY + 3);
    ctx.moveTo(scaleX + scaleW, scaleY - 3);
    ctx.lineTo(scaleX + scaleW, scaleY + 3);
    ctx.stroke();

    ctx.fillStyle = '#c8a84b';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('2 km', scaleX + scaleW + 3, scaleY + 2);
  },

  // ============================================================
  // TOOLTIP EN HOVER
  // ============================================================
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const col = Math.floor(px / this.CELL_W);
    const row = Math.floor(py / this.CELL_H);

    if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) {
      this.tooltip.style.display = 'none';
      return;
    }

    const cell = this.map.cells[row * this.map.cols + col];
    if (!cell) return;

    const biome = cell.biome;
    const yields = cell.resourceYield;
    const ownerLabel = cell.owner === 'player' ? '🟢 Tuyo' :
                       cell.owner === 'neutral' ? '⬜ Neutral' : '🔴 Enemigo';

    const featureText = cell.featureLabel ? `\n✨ ${cell.featureLabel}` : '';
    const riverText = cell.features.includes('river') ? '\n💧 Río' : '';
    const capitalText = cell.isCapital ? '\n🏰 CAPITAL' : '';

    this.tooltip.innerHTML = `
      <b>${biome.icon} ${biome.name}</b>${capitalText}<br>
      ${biome.description}<br>
      <hr style="border-color:#3a2e1e;margin:3px 0">
      🌾${yields.food} ◈${yields.gold} 🪵${yields.wood} ⬡${yields.stone} ⚙${yields.iron}<br>
      ${ownerLabel}${featureText}${riverText}
    `;

    this.tooltip.style.display = 'block';
    this.tooltip.style.left = (e.offsetX + 12) + 'px';
    this.tooltip.style.top = (e.offsetY - 10) + 'px';
  },

  // Redibujar (tras cambio de territorio)
  refresh(gameState) {
    this.state = gameState;
    this.render();
  }
};
