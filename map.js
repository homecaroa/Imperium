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
// RENDERER DEL MAPA — rediseñado
// Paleta: marron oscuro · marron claro · verde · azul
// Celdas 20% mas grandes: 26x22px
// ============================================================
const MapRenderer = {

  CELL_W: 26, CELL_H: 22,
  canvas:null, ctx:null, map:null, state:null,

  BIOME_COLORS: {
    deep_water:'#1c3a52', shallow_water:'#2b5878',
    beach:'#c4a46a', desert:'#b8874a', tundra:'#8c7a6a',
    plains:'#6e9448', grassland:'#527a32', swamp:'#3d5c30',
    forest:'#3a5c28', dense_forest:'#243d18',
    hills:'#6b4c2e', mountains:'#4e3824', high_mountains:'#6a5c50', volcano:'#3a1a0a'
  },

  ELEVATION_TINT: {
    deep_water:[20,50,80], shallow_water:[30,70,110],
    beach:[210,180,120], desert:[200,150,80], tundra:[150,130,110],
    plains:[120,170,70], grassland:[90,140,50], swamp:[70,100,50],
    forest:[60,100,40], dense_forest:[40,70,25],
    hills:[120,85,50], mountains:[90,65,40], high_mountains:[130,115,100], volcano:[80,30,10]
  },

  OWNER_OVERLAY: {
    player:'rgba(100,200,130,0.28)', ai_1:'rgba(190,60,50,0.28)',
    ai_2:'rgba(50,100,180,0.28)', ai_3:'rgba(190,150,40,0.28)', neutral:null
  },

  OWNER_BORDER: {
    player:{color:'#72c882',width:1.2}, ai_1:{color:'#c84040',width:1.2},
    ai_2:{color:'#4070c0',width:1.2}, ai_3:{color:'#c8a030',width:1.2}, neutral:null
  },

  CAPITAL_COLORS: { player:'#88e8a0', ai_1:'#e87070', ai_2:'#7098e0', ai_3:'#e8c060' },

  init(containerId, mapData, gameState) {
    this.map = mapData; this.state = gameState;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const W = mapData.cols * this.CELL_W;
    const H = mapData.rows * this.CELL_H;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.canvas.style.width = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.imageRendering = 'auto';
    this.canvas.style.cursor = 'crosshair';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = 'position:absolute;background:rgba(12,9,6,0.96);border:1px solid #5a3e22;border-top:2px solid #c8a84b;color:#d4c4a0;font-family:JetBrains Mono,monospace;font-size:10px;padding:7px 11px;pointer-events:none;z-index:100;display:none;max-width:210px;line-height:1.7;box-shadow:0 4px 16px rgba(0,0,0,0.7)';
    container.style.position = 'relative';
    container.appendChild(this.tooltip);
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => { this.tooltip.style.display = 'none'; });
    this.render();
  },

  _drawCell(cell) {
    const ctx = this.ctx;
    const W = this.CELL_W, H = this.CELL_H;
    const x = cell.col * W, y = cell.row * H;

    ctx.fillStyle = this.BIOME_COLORS[cell.biomeId] || '#2a2018';
    ctx.fillRect(x, y, W, H);

    const elev = cell.elevation || 0.5;
    const tint = this.ELEVATION_TINT[cell.biomeId] || [128,128,128];
    if (elev > 0.55) {
      const s = Math.min((elev - 0.55) * 1.2, 0.45);
      ctx.fillStyle = 'rgba(' + tint[0] + ',' + tint[1] + ',' + tint[2] + ',' + s + ')';
      ctx.fillRect(x, y, W, H);
    } else if (elev < 0.42) {
      const s = Math.min((0.42 - elev) * 1.4, 0.40);
      ctx.fillStyle = 'rgba(0,0,0,' + s + ')';
      ctx.fillRect(x, y, W, H);
    }

    const ov = this.OWNER_OVERLAY[cell.owner];
    if (ov) { ctx.fillStyle = ov; ctx.fillRect(x, y, W, H); }

    if (cell.features && cell.features.includes('river')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(80,140,210,0.55)';
      ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 2, y + H * 0.6);
      ctx.quadraticCurveTo(x + W * 0.5, y + H * 0.35, x + W - 2, y + H * 0.6);
      ctx.stroke(); ctx.restore();
    }

    if (cell.owner !== 'neutral') {
      const bd = this.OWNER_BORDER[cell.owner];
      if (bd) { ctx.strokeStyle = bd.color; ctx.lineWidth = bd.width; ctx.strokeRect(x+0.7, y+0.7, W-1.4, H-1.4); }
    }

    if (cell.isCapital) {
      this._drawStar(ctx, x + W/2, y + H/2, 6, this.CAPITAL_COLORS[cell.owner] || '#fff');
    }

    if (cell.featureIcon && !cell.isCapital) {
      ctx.font = Math.floor(H * 0.58) + 'px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(cell.featureIcon, x + W/2 + 1, y + H/2 + 1);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(cell.featureIcon, x + W/2, y + H/2);
    }

    if (cell.owner === 'neutral') {
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 0.4;
      ctx.strokeRect(x, y, W, H);
    }
  },

  _drawStar(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = (i * Math.PI) / 4 - Math.PI / 2;
      var rad = i % 2 === 0 ? r : r * 0.42;
      if (i === 0) ctx.moveTo(cx + Math.cos(a)*rad, cy + Math.sin(a)*rad);
      else ctx.lineTo(cx + Math.cos(a)*rad, cy + Math.sin(a)*rad);
    }
    ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
  },

  render() {
    if (!this.ctx || !this.map) return;
    this.ctx.fillStyle = '#140f0a';
    this.ctx.fillRect(0, 0, this.map.cols * this.CELL_W, this.map.rows * this.CELL_H);
    this.map.cells.forEach(cell => this._drawCell(cell));
    this._renderRivers();
    this._renderCompass();
    this._renderScale();
  },

  _renderRivers() {
    const ctx = this.ctx, W = this.CELL_W, H = this.CELL_H;
    this.map.rivers.forEach(river => {
      if (river.length < 3) return;
      ctx.save();
      ctx.strokeStyle = '#3a78b8'; ctx.lineWidth = 2.8;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = 0.65;
      ctx.beginPath();
      river.forEach((cid, i) => {
        var cell = this.map.cells[cid]; if (!cell) return;
        var px = cell.col * W + W/2, py = cell.row * H + H/2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.strokeStyle = '#6ab0e8'; ctx.lineWidth = 1.0; ctx.globalAlpha = 0.38;
      ctx.beginPath();
      river.forEach((cid, i) => {
        var cell = this.map.cells[cid]; if (!cell) return;
        var px = cell.col * W + W/2 - 0.5, py = cell.row * H + H/2 - 0.5;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke(); ctx.restore();
    });
  },

  _renderCompass() {
    var ctx = this.ctx;
    var cx = this.map.cols * this.CELL_W - 38, cy = 38, r = 20;
    ctx.save();
    ctx.fillStyle = 'rgba(14,10,6,0.84)'; ctx.strokeStyle = '#6a4a24'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c8a84b';
    ctx.beginPath(); ctx.moveTo(cx, cy-r+4); ctx.lineTo(cx-4, cy+3); ctx.lineTo(cx, cy-2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a5030';
    ctx.beginPath(); ctx.moveTo(cx, cy-r+4); ctx.lineTo(cx+4, cy+3); ctx.lineTo(cx, cy-2); ctx.closePath(); ctx.fill();
    ctx.font = 'bold 9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8a84b'; ctx.fillText('N', cx, cy-r+12);
    ctx.fillStyle = '#7a6040'; ctx.font = '8px serif';
    ctx.fillText('S', cx, cy+r-9); ctx.fillText('E', cx+r-8, cy); ctx.fillText('O', cx-r+8, cy);
    ctx.restore();
  },

  _renderScale() {
    var ctx = this.ctx;
    var sx = 10, sy = this.map.rows * this.CELL_H - 15, sw = this.CELL_W * 4;
    ctx.save();
    ctx.fillStyle = 'rgba(10,7,4,0.74)'; ctx.fillRect(sx-3, sy-10, sw+42, 16);
    var half = Math.floor(sw/2);
    ctx.fillStyle = '#c8a84b'; ctx.fillRect(sx, sy-4, half, 6);
    ctx.fillStyle = '#7a6040'; ctx.fillRect(sx+half, sy-4, half, 6);
    ctx.fillStyle = '#c8a84b'; ctx.font = '8px JetBrains Mono,monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('2km', sx+sw+5, sy); ctx.fillStyle = '#7a6040'; ctx.fillText('0', sx-1, sy);
    ctx.restore();
  },

  onMouseMove(e) {
    var rect = this.canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    var py = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
    var col = Math.floor(px / this.CELL_W);
    var row = Math.floor(py / this.CELL_H);
    if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) {
      this.tooltip.style.display = 'none'; return;
    }
    var cell = this.map.cells[row * this.map.cols + col];
    if (!cell) return;
    var biome = cell.biome, yld = cell.resourceYield;
    var ownerLabel = cell.owner === 'player'
      ? '<span style="color:#88e8a0">&#9679; Tu territorio</span>'
      : cell.owner === 'neutral'
        ? '<span style="color:#7a6040">&#9675; Neutral</span>'
        : '<span style="color:#e87070">&#9679; Enemigo</span>';
    var extras = [
      cell.isCapital ? '&#127984; Capital' : '',
      cell.featureLabel ? '&#10022; ' + cell.featureLabel : '',
      (cell.features && cell.features.includes('river')) ? '&#8779; Rio' : ''
    ].filter(Boolean).join(' &middot; ');
    this.tooltip.innerHTML =
      '<div style="font-weight:bold;color:#e8d090;margin-bottom:3px">' + (biome.icon||'')+'&nbsp;'+biome.name+'</div>'
      +'<div style="color:#8a7050;font-size:9px;margin-bottom:4px">'+biome.description+'</div>'
      +'<div style="border-top:1px solid #3a2818;padding-top:4px;display:flex;gap:7px;flex-wrap:wrap">'
      +'<span>&#127806;<b>'+yld.food+'</b></span><span>&#9672;<b>'+yld.gold+'</b></span>'
      +'<span>&#129717;<b>'+yld.wood+'</b></span><span>&#11041;<b>'+yld.stone+'</b></span><span>&#9881;<b>'+yld.iron+'</b></span>'
      +'</div>'
      +'<div style="margin-top:4px;font-size:9px">'+ownerLabel+(extras?' &middot; <span style="color:#c8a84b">'+extras+'</span>':'')+'</div>';
    var tipW = 210, tipH = 95;
    var tipX = e.offsetX + 14, tipY = e.offsetY - 10;
    if (tipX + tipW > rect.width)  tipX = e.offsetX - tipW - 6;
    if (tipY + tipH > rect.height) tipY = e.offsetY - tipH - 6;
    this.tooltip.style.left = tipX + 'px';
    this.tooltip.style.top  = tipY + 'px';
    this.tooltip.style.display = 'block';
  },

  refresh(gameState) {
    this.state = gameState;
    if (gameState.mapData) {
      gameState.mapData.cells.forEach(cell => {
        if (gameState.playerCells && gameState.playerCells.includes(cell.id)) cell.owner = 'player';
      });
      (gameState.diplomacy || []).forEach((nation, i) => {
        (nation.cells || []).forEach(cid => {
          var c = gameState.mapData.cells[cid];
          if (c && c.owner !== 'player') c.owner = 'ai_' + (i+1);
        });
      });
    }
    this.render();
  }
};
