// ============================================================
// IMPERIUM — DATA.JS  (v2)
// ============================================================

var CIVILIZATIONS = [
  { id:'roman',    name:'República Aurea',      icon:'🦅', description:'Estado republicano maduro. Senado poderoso, tradición militar.',       government:'república',          startResources:{food:300,gold:250,wood:200,stone:180,iron:120}, startStats:{population:8000,stability:65,morale:70,army:400},  factions:['senado','ejercito','pueblo','comerciantes'], traits:['+15% fuerza militar','+10% estabilidad','-5% alimentos'],         unitBonuses:{legionarios:1.2,ballistas:1.15} },
  { id:'mongol',   name:'Horda de las Estepas', icon:'🐎', description:'Pueblo guerrero nómada. Ejército devastador, economía frágil.',         government:'autocracia_militar', startResources:{food:200,gold:150,wood:100,stone:50, iron:180}, startStats:{population:5000,stability:45,morale:80,army:700},  factions:['ejercito','nobleza','chamanes','pueblo'],    traits:['+30% poder militar','Conquistas→recursos','-15% estabilidad'],    unitBonuses:{caballeria:1.35,arqueros:1.2} },
  { id:'byzantine',name:'Imperio del Este',     icon:'🕌', description:'Maestros de la diplomacia y el espionaje. Economía diversificada.',     government:'teocracia_imperial', startResources:{food:280,gold:350,wood:150,stone:220,iron:90},  startStats:{population:10000,stability:60,morale:65,army:280}, factions:['iglesia','burocracia','comerciantes','ejercito'], traits:['+20% oro','+2 espías iniciales','-10% ejército'],                unitBonuses:{ballistas:1.2}, startSpies:2 },
  { id:'norse',    name:'Reinos del Norte',     icon:'🐉', description:'Guerreros del mar. Alta moral pero inestabilidad constante.',           government:'oligarquia_tribal',  startResources:{food:220,gold:130,wood:300,stone:100,iron:150}, startStats:{population:4000,stability:40,morale:85,army:350},  factions:['jarls','guerreros','pueblo','escaldos'],     traits:['+20% moral','Inmunes a frío extremo','-20% estabilidad'],        unitBonuses:{berserkers:1.3,infanteria:1.15}, coldImmune:true },
  { id:'chinese',  name:'Imperio del Dragón',   icon:'🐲', description:'La más avanzada. Burocracia eficiente, corrupción endémica.',           government:'burocracia_imperial',startResources:{food:450,gold:300,wood:280,stone:300,iron:160}, startStats:{population:15000,stability:55,morale:60,army:500}, factions:['burocracia','ejercito','pueblo','comerciantes'], traits:['+20% alimentos','+15% piedra','Corrupción +15'],                  unitBonuses:{ballistas:1.25,infanteria:1.1} },
  { id:'aztec',    name:'Alianza Triple',        icon:'🌞', description:'Imperio teocrático. El ritual mantiene la moral.',                      government:'teocracia',          startResources:{food:350,gold:180,wood:200,stone:250,iron:80},  startStats:{population:9000,stability:50,morale:75,army:450},  factions:['sacerdotes','guerreros','pueblo','comerciantes'], traits:['+15% moral','Rituales potencian ejército','-20% diplomacia'],    unitBonuses:{guerreros_jaguar:1.4,infanteria:1.1} }
];

var FACTION_DEFINITIONS = {
  senado:       {name:'Senado',       icon:'🏛',wants:['estabilidad','leyes'],       hates:['guerra_prolongada'],   color:'#c8a84b',baseInfluence:30},
  ejercito:     {name:'Ejército',     icon:'⚔', wants:['guerra','equipamiento'],     hates:['paz_prolongada'],      color:'#888',   baseInfluence:25},
  pueblo:       {name:'Pueblo',       icon:'👥',wants:['alimentos','paz'],            hates:['hambre','impuestos'],  color:'#7c9c7c',baseInfluence:35},
  comerciantes: {name:'Comerciantes', icon:'💰',wants:['comercio','paz'],             hates:['guerra','inflacion'],  color:'#c8a020',baseInfluence:20},
  iglesia:      {name:'Iglesia',      icon:'✝', wants:['religion','estabilidad'],    hates:['herejia','corrupcion'],color:'#d4c4a0',baseInfluence:25},
  nobleza:      {name:'Nobleza',      icon:'👑',wants:['privilegios','tierras'],      hates:['impuestos'],           color:'#b08850',baseInfluence:30},
  chamanes:     {name:'Chamanes',     icon:'🔮',wants:['tradicion','autonomia'],      hates:['modernizacion'],       color:'#8080c0',baseInfluence:20},
  jarls:        {name:'Jarls',        icon:'⚔', wants:['autonomia','tributo'],        hates:['centralizacion'],      color:'#c08040',baseInfluence:35},
  guerreros:    {name:'Guerreros',    icon:'🗡',wants:['guerra','gloria'],            hates:['paz'],                 color:'#a06040',baseInfluence:25},
  escaldos:     {name:'Escaldos',     icon:'📜',wants:['cultura','gloria_epica'],     hates:['deshonra'],            color:'#8090a0',baseInfluence:10},
  burocracia:   {name:'Burocracia',   icon:'📋',wants:['orden','eficiencia'],         hates:['caos'],                color:'#7090c0',baseInfluence:30},
  sacerdotes:   {name:'Sacerdotes',   icon:'🌞',wants:['rituales','expansion'],       hates:['derrota'],             color:'#d0a030',baseInfluence:35}
};

var GOVERNMENT_TYPES = {
  república:           {name:'República',           stabilityBonus:10,  corruptionPenalty:-5,  factionInfluenceMultiplier:1.3, description:'Poder compartido entre instituciones.'},
  autocracia_militar:  {name:'Autocracia Militar',  stabilityBonus:-10, corruptionPenalty:10,  factionInfluenceMultiplier:0.7, description:'El caudillo decide solo. Rápido pero frágil.'},
  teocracia_imperial:  {name:'Teocracia Imperial',  stabilityBonus:5,   corruptionPenalty:5,   factionInfluenceMultiplier:1.0, description:'Dios y Estado como uno.'},
  oligarquia_tribal:   {name:'Oligarquía Tribal',   stabilityBonus:-15, corruptionPenalty:-10, factionInfluenceMultiplier:1.5, description:'Los clanes compiten. Inestable pero adaptable.'},
  burocracia_imperial: {name:'Burocracia Imperial', stabilityBonus:5,   corruptionPenalty:20,  factionInfluenceMultiplier:1.0, description:'El Estado lo gestiona todo. Corrupto.'},
  teocracia:           {name:'Teocracia',           stabilityBonus:0,   corruptionPenalty:0,   factionInfluenceMultiplier:1.2, description:'La voluntad divina guía al pueblo.'}
};

// ============================================================
// ESTACIONES — eje temporal del clima
// 4 estaciones × 4 turnos = 16 turnos/año
// ============================================================
var SEASONS = {
  spring:{name:'Primavera',icon:'🌱',foodMod:+18,goldMod:+5, woodMod:+5, moraleMod:+6, armyMod:0,
    extremeEvents:['lluvias_torrenciales','florecimiento_excepcional'],extremeChance:0.12,
    description:'Cosechas tempranas. Ideal para construir y negociar.',
    flavorTexts:['Los campos florecen. Los graneros se llenan de esperanza.','El deshielo trae agua a los ríos.','Primera cosecha del año.']},
  summer:{name:'Verano',icon:'☀',foodMod:+8, goldMod:+12,woodMod:+8, moraleMod:+2, armyMod:+5,
    extremeEvents:['sequia_leve','sequia_severa','ola_de_calor','langostas'],extremeChance:0.28,
    description:'Comercio activo. Ejércitos en campaña. Riesgo de sequía.',
    flavorTexts:['El sol abrasa los campos. La sed es constante.','Temporada de campaña militar.','El calor endurece a los hombres.']},
  autumn:{name:'Otoño',icon:'🍂',foodMod:+22,goldMod:+8, woodMod:+10,moraleMod:-2, armyMod:-3,
    extremeEvents:['cosecha_excepcional','tormenta_otonal','plaga_graneros'],extremeChance:0.18,
    description:'Gran cosecha. Preparar reservas para el invierno.',
    flavorTexts:['Los árboles se tiñen de oro. La cosecha llena los graneros.','Última oportunidad antes del frío.','El otoño huele a pan y madera.']},
  winter:{name:'Invierno',icon:'❄',foodMod:-28,goldMod:-10,woodMod:-15,moraleMod:-12,armyMod:-15,
    extremeEvents:['frio_extremo','blizzard','hambruna_invernal','invierno_suave'],extremeChance:0.35,
    description:'Producción cae drásticamente. Supervivencia es prioridad.',
    flavorTexts:['El hielo congela los caminos y el ánimo.','Los soldados tiemblan. Los pobres mueren de frío.','El invierno: más letal que cualquier ejército.']}
};

// ============================================================
// EVENTOS CLIMÁTICOS EXTREMOS — con encadenamiento
// ============================================================
var EXTREME_CLIMATE_EVENTS = {
  lluvias_torrenciales:{name:'Lluvias Torrenciales',icon:'⛈',foodMod:-15,goldMod:-5, moraleMod:-8, armyMod:-20,duration:[2,3],triggersChain:'inundacion_fluvial',chainChance:0.4,  message:'Lluvias torrenciales inundan campos. Los ríos amenazan desbordarse.'},
  florecimiento_excepcional:{name:'Florecimiento Excepcional',icon:'🌸',foodMod:+30,goldMod:+10,moraleMod:+15,armyMod:0,duration:[1,2],triggersChain:null,chainChance:0,           message:'Florecimiento excepcional. Los campos producen el doble.'},
  sequia_leve:{name:'Sequía Leve',icon:'🌤',foodMod:-20,goldMod:0,  moraleMod:-5, armyMod:0,  duration:[2,3],triggersChain:'sequia_severa',chainChance:0.30,                        message:'El verano es seco. Los campesinos miran al cielo.'},
  sequia_severa:{name:'Gran Sequía',icon:'🔥',foodMod:-45,goldMod:-8, moraleMod:-20,armyMod:-5, duration:[3,5],triggersChain:'hambruna_invernal',chainChance:0.50,                  message:'¡Gran Sequía! Cosechas devastadas. El hambre asoma.'},
  ola_de_calor:{name:'Ola de Calor',icon:'🌡',foodMod:-12,goldMod:+3, moraleMod:-10,armyMod:-8, duration:[1,2],triggersChain:null,chainChance:0,                                    message:'El calor agota a la población y al ejército.'},
  langostas:{name:'Plaga de Langostas',icon:'🦗',foodMod:-35,goldMod:-5,moraleMod:-15,armyMod:0,duration:[1,2],triggersChain:'sequia_severa',chainChance:0.20,                      message:'Una nube de langostas devora los campos.'},
  cosecha_excepcional:{name:'Cosecha Excepcional',icon:'🌾',foodMod:+40,goldMod:+15,moraleMod:+20,armyMod:0,duration:[1,1],triggersChain:null,chainChance:0,                        message:'¡Cosecha histórica! Los graneros no son suficientes.'},
  tormenta_otonal:{name:'Tormentas de Otoño',icon:'🌩',foodMod:-10,goldMod:-8,moraleMod:-8,armyMod:-12,duration:[1,2],triggersChain:'inundacion_fluvial',chainChance:0.25,          message:'Tormentas dañan infraestructura y cosechas tardías.'},
  plaga_graneros:{name:'Plaga en los Graneros',icon:'🐀',foodMod:-25,goldMod:0,moraleMod:-12,armyMod:0,duration:[2,3],triggersChain:'hambruna_invernal',chainChance:0.45,           message:'Ratas e insectos devastan las reservas almacenadas.'},
  frio_extremo:{name:'Frío Extremo',icon:'🥶',foodMod:-15,goldMod:-5,moraleMod:-18,armyMod:-25,duration:[2,4],triggersChain:null,chainChance:0,                                     message:'Temperaturas mortales. Las tropas sufren. Los pobres mueren.'},
  blizzard:{name:'Ventisca Total',icon:'🌨',foodMod:-20,goldMod:-15,moraleMod:-20,armyMod:-40,duration:[1,3],triggersChain:null,chainChance:0,                                       message:'Ventisca. Caminos cortados, ejércitos paralizados.'},
  hambruna_invernal:{name:'Hambruna Invernal',icon:'💀',foodMod:-35,goldMod:-5,moraleMod:-30,armyMod:-20,duration:[3,4],triggersChain:'revuelta_hambre',chainChance:0.60,stabilityLoss:10,message:'Las reservas se agotan. La muerte recorre el reino.'},
  invierno_suave:{name:'Invierno Suave',icon:'🌥',foodMod:+10,goldMod:+5,moraleMod:+8,armyMod:+10,duration:[2,4],triggersChain:null,chainChance:0,                                  message:'Un invierno inusualmente templado. El pueblo lo agradece.'},
  inundacion_fluvial:{name:'Inundación de Ríos',icon:'🌊',foodMod:-20,goldMod:-12,moraleMod:-15,armyMod:-18,duration:[2,3],triggersChain:null,chainChance:0,                        message:'Los ríos desbordan sus cauces. Aldeas anegadas.'},
  revuelta_hambre:{name:'Revueltas por Hambre',icon:'✊',foodMod:0,goldMod:-10,moraleMod:-25,armyMod:0,duration:[2,3],triggersChain:null,chainChance:0,stabilityLoss:20,             message:'El hambre se convierte en rabia. Motines en las ciudades.'}
};

// ============================================================
// UNIDADES MILITARES
// ============================================================
var MILITARY_UNITS = {
  levas:             {name:'Levas',             icon:'🪓',category:'infantry',      cost:{gold:20,iron:0},        upkeep:0.2,strength:8,  count:50,terrainBonus:{plains:1.0,hills:0.9,forest:0.85,mountains:0.7}, vsBonus:{infantry:1.0,cavalry:0.7,ranged:1.1,siege:1.2},  description:'Campesinos armados. Baratos pero débiles.',buildTurns:1,attack:6,defense:4,color:'#8a7050'},
  infanteria:        {name:'Infantería',        icon:'⚔', category:'infantry',      cost:{gold:60,iron:20},       upkeep:0.5,strength:20, count:40,terrainBonus:{plains:1.0,hills:1.0,forest:0.9,mountains:0.8},  vsBonus:{infantry:1.0,cavalry:0.9,ranged:1.15,siege:1.3}, description:'Soldado entrenado. Versátil.',buildTurns:1,attack:16,defense:14,color:'#6a8a6a'},
  legionarios:       {name:'Legionarios',       icon:'🛡',category:'heavy_infantry', cost:{gold:100,iron:40},      upkeep:0.9,strength:35, count:30,terrainBonus:{plains:1.2,hills:1.0,forest:0.75,mountains:0.7},vsBonus:{infantry:1.3,cavalry:1.1,ranged:1.2,siege:1.4},  description:'Élite pesada. Invencibles en campo abierto.',buildTurns:2,requires:['standing_army'],attack:28,defense:30,color:'#8a6a30'},
  caballeria:        {name:'Caballería',        icon:'🐴',category:'cavalry',        cost:{gold:80,iron:15},       upkeep:0.8,strength:28, count:25,terrainBonus:{plains:1.4,hills:0.8,forest:0.5,mountains:0.3}, vsBonus:{infantry:1.3,cavalry:1.0,ranged:1.5,siege:0.8},  description:'Rápida e impactante. Domina las llanuras.',buildTurns:2,attack:26,defense:16,color:'#7a6a9a'},
  caballeria_pesada: {name:'Cab. Pesada',       icon:'🏇',category:'heavy_cavalry',  cost:{gold:150,iron:35},      upkeep:1.2,strength:45, count:20,terrainBonus:{plains:1.5,hills:0.7,forest:0.3,mountains:0.2}, vsBonus:{infantry:1.5,cavalry:1.2,ranged:1.6,siege:0.7},  description:'La carga que rompe líneas.',buildTurns:3,requires:['standing_army'],attack:38,defense:30,color:'#5a5a9a'},
  arqueros:          {name:'Arqueros',          icon:'🏹',category:'ranged',          cost:{gold:50,wood:20},       upkeep:0.4,strength:22, count:35,terrainBonus:{plains:1.0,hills:1.3,forest:1.1,mountains:1.4}, vsBonus:{infantry:1.2,cavalry:0.9,ranged:1.0,siege:0.6},  description:'Fuego a distancia desde posición elevada.',buildTurns:1,attack:20,defense:10,color:'#6a9a5a'},
  ballistas:         {name:'Balistas',          icon:'🎯',category:'siege',           cost:{gold:120,wood:60,iron:20},upkeep:1.0,strength:40, count:10,terrainBonus:{plains:1.2,hills:1.0,forest:0.6,mountains:0.7}, vsBonus:{infantry:1.0,cavalry:1.1,ranged:0.7,siege:1.0,fortification:2.5},description:'Artillería de asedio. Letal contra murallas.',buildTurns:3,requires:['war_economy'],attack:36,defense:12,color:'#9a7a30'},
  berserkers:        {name:'Berserkers',        icon:'🪓',category:'berserker',        cost:{gold:90,iron:10},       upkeep:0.7,strength:42, count:20,terrainBonus:{plains:1.1,hills:1.2,forest:1.3,mountains:1.0}, vsBonus:{infantry:1.5,cavalry:0.9,ranged:1.2,siege:1.3},  moralBonus:+5,description:'Guerreros en trance de furia.',buildTurns:2,civRestrict:['norse'],attack:40,defense:22,color:'#9a3a3a'},
  guerreros_jaguar:  {name:'G. Jaguar',         icon:'🐆',category:'elite_infantry',  cost:{gold:110,iron:5,stone:10},upkeep:0.9,strength:38,count:25,terrainBonus:{plains:1.0,hills:1.1,forest:1.5,mountains:1.2}, vsBonus:{infantry:1.3,cavalry:1.0,ranged:1.3,siege:1.2},  moralBonus:+8,description:'Élite ritual. Perfectos en bosque.',buildTurns:2,civRestrict:['aztec']}
};

// ============================================================
// UNIDADES LEGENDARIAS
// ============================================================
var LEGENDARY_UNITS = [
  {id:'titan_de_bronce',  name:'Titán de Bronce',      icon:'🗿',cost:{gold:500,iron:200,stone:100},upkeep:3.0,strength:180,count:1,description:'Máquina de guerra de bronce. Impenetrable e imparable.',    unlockCondition:'3 balistas + economía de guerra',    special:'Inmune a arqueros. +100% vs infantería.',             flavorText:'"Cuando los ingenieros construyen dioses, los reyes conquistan imperios."',attack:34,defense:26,color:'#3a8a5a'},
  {id:'dragon_de_guerra', name:'Dragón de Guerra',     icon:'🐲',cost:{gold:600,iron:50,food:200},  upkeep:4.0,strength:220,count:1,description:'Bestia mítica domesticada. Su fuego arrasa formaciones.',  unlockCondition:'Moral > 85 + 3 victorias consecutivas', special:'-30 moral enemiga al inicio. Devastador en todo terreno.',flavorText:'"Los hombres huyen ante el rugido."'},
  {id:'guardia_inmortal', name:'Guardia Inmortal',     icon:'⚱', cost:{gold:450,iron:150},          upkeep:2.5,strength:160,count:1,description:'Mil soldados de élite que se reemplazan al caer.',         unlockCondition:'Estabilidad > 75 + ejército > 800 (5 turnos)',special:'Las bajas no afectan a la moral. +50% defensa.',  flavorText:'"¿Cómo matas a los que no mueren?"'},
  {id:'gran_khan',        name:'El Gran Khan',         icon:'🏆',cost:{gold:300,food:150},           upkeep:2.0,strength:100,count:1,description:'Líder carismático que multiplica la fuerza de todo el ejército.',unlockCondition:'Ejército satisfacción > 80 durante 4 turnos',special:'+25% fuerza a TODAS las unidades.',            flavorText:'"Un líder que sus hombres seguirían al infierno."'},
  {id:'mago_guerra',      name:'Hechicero de Batalla', icon:'🔮',cost:{gold:350},                    upkeep:2.5,strength:80, count:1,description:'Conjura calamidades sobre las líneas enemigas.',           unlockCondition:'Iglesia/Sacerdotes/Chamanes satisfacción > 75',special:'-20 moral enemiga/turno de batalla.',          flavorText:'"El miedo es el arma más efectiva."'},
  {id:'orden_paladin',    name:'Orden de Paladines',   icon:'✝', cost:{gold:480,iron:100,stone:50},  upkeep:3.0,strength:170,count:1,description:'Caballeros consagrados. No conocen el miedo.',            unlockCondition:'Gobierno teocrático + moral > 80',           special:'Inmunes a moral baja. +40% en montañas.',             flavorText:'"Dios los envía. El rey los dirige."'},
  {id:'elefantes_guerra', name:'Elefantes de Guerra',  icon:'🐘',cost:{gold:420,food:300},           upkeep:3.5,strength:190,count:1,description:'Bestias colosales que deshacen formaciones.',              unlockCondition:'Bioma selvático/desierto + 400 alimentos reserva',special:'+80% vs caballería. Riesgo de girar contra propias tropas.',flavorText:'"Los caballos huyen ante su olor."'},
  {id:'barco_fantasma',   name:'Flota Fantasma',       icon:'👻',cost:{gold:400,wood:300},            upkeep:2.0,strength:140,count:1,description:'Naves espectrales que atacan de noche.',                 unlockCondition:'Norse + 2 tratados activos',                 special:'+30% sorpresa en primer ataque. Requiere costa.',     flavorText:'"Lo que no existe no puede ser derrotado."'}
];

// ============================================================
// MISIONES DE ESPÍAS
// ============================================================
var SPY_MISSIONS = {
  reconocimiento:   {name:'Reconocimiento Militar',   cost:{gold:80}, duration:2,successChance:0.70,icon:'🔍',description:'Descubre ejército y composición de tropas enemigas.'},
  sabotaje_economico:{name:'Sabotaje Económico',      cost:{gold:150},duration:3,successChance:0.50,icon:'💣',description:'Destruye reservas de recursos del rival.'},
  intriga_politica: {name:'Intriga Política',         cost:{gold:200},duration:4,successChance:0.40,icon:'🎭',description:'Siembra discordia en las facciones rivales.'},
  robo_planos:      {name:'Robo de Planos Militares', cost:{gold:120},duration:2,successChance:0.55,icon:'📜',description:'Obtiene planes de campaña. Neutraliza ataques sorpresa.'},
  envenenar_lider:  {name:'Asesinato del Líder',      cost:{gold:350},duration:3,successChance:0.25,icon:'☠', description:'Elimina al gobernante rival. Crisis sucesoria masiva.'}
};

// ============================================================
// RUTAS COMERCIALES
// ============================================================
var TRADE_ROUTES = {
  // ── RUTAS TERRESTRES ──────────────────────────────────────
  basico:           {name:'Acuerdo Básico',        icon:'🤝',type:'land',  cost:{gold:50},          requires:{relation:15},              income:{gold:20},                duration:'permanent',relationBonus:+1, description:'Intercambio básico de bienes por tierra.'},
  ruta_seda:        {name:'Ruta de la Seda',       icon:'🐪',type:'land',  cost:{gold:150,wood:50}, requires:{relation:30},              income:{gold:45,morale:+3},      duration:'permanent',relationBonus:+2, description:'Caravanas de lujo. Mejora la moral del pueblo.'},
  comercio_hierro:  {name:'Comercio de Armas',     icon:'⚔️', type:'land', cost:{gold:100,iron:30}, requires:{relation:20},              income:{gold:35,iron:10},        duration:'permanent',relationBonus:+1, description:'Venta y compra de armas y metales.'},
  intercambio_grano:{name:'Intercambio de Grano',  icon:'🌾',type:'land',  cost:{gold:80},          requires:{relation:10},              income:{food:60,gold:-10},       duration:'permanent',relationBonus:+2, description:'Vital en sequías y hambrunas.'},
  // ── RUTAS MARÍTIMAS — más oro, requieren costa ────────────
  ruta_maritima:    {name:'Ruta Marítima Básica',  icon:'⚓',type:'sea',   cost:{gold:120,wood:80}, requires:{relation:25,coastal:true},  income:{gold:55,morale:+2},      duration:'permanent',relationBonus:+2, description:'Barcos mercantes. +30% oro vs rutas terrestres.'},
  flota_mercante:   {name:'Flota Mercante',         icon:'🚢',type:'sea',   cost:{gold:250,wood:150},requires:{relation:40,coastal:true},  income:{gold:90,food:30,morale:+5},duration:'permanent',relationBonus:+3,description:'Flota completa. Gran volumen de comercio.'},
  alianza_economica:{name:'Alianza Económica',      icon:'💎',type:'land',  cost:{gold:300},         requires:{relation:60,alliance:true}, income:{gold:80,morale:+5,stability:+3},duration:'permanent',relationBonus:+3,description:'Solo con aliados firmes.'}
};

// ============================================================
// POOL DE EVENTOS
// ============================================================
var EVENT_POOL = [
  {id:'trade_caravan',image:'img/events/evt_caravan.png',    category:'ECONOMÍA',  priority:'normal',  icon:'🐪',title:'Caravana Mercante',        description:'Una caravana solicita establecer una ruta comercial permanente.',context:'Potencial: +30 oro/turno | Riesgo: espionaje | Coste: 80 madera',condition:(s)=>s.turn>2,weight:8,
    options:[
      {label:'Libre comercio',          effects:{gold_rate:+30,wood:-80,spy_risk:+15},   effectText:['+30 oro/turno','-80 madera','Riesgo espía +15%']},
      {label:'Control estatal',         effects:{gold_rate:+18,wood:-80,corruption:-5},  effectText:['+18 oro/turno','-80 madera','Corrupción -5']},
      {label:'Cobrar peaje y rechazar', effects:{gold:+120,diplomacy_bonus:-15},          effectText:['+120 oro (único)','Relación -15']}]},
  {id:'inflation_crisis', category:'ECONOMÍA',  priority:'critical',icon:'📈',title:'Crisis Inflacionaria',     description:'El exceso de gasto ha devaluado la moneda. Los precios suben. Los comerciantes protestan.',context:'Inflación: ALTA | Comerciantes: FURIOSOS',condition:(s)=>s.economy.inflation>50,weight:10,
    options:[
      {label:'Austeridad drástica',     effects:{gold_rate:-40,stability:-15,morale:-20,inflation:-30,faction_economy:+20},effectText:['-40 oro/turno','Inflación -30','-15 estabilidad']},
      {label:'Emitir deuda pública',    effects:{gold:+300,debt:+300,inflation:+20},      effectText:['+300 oro','Deuda +300','Inflación +20']},
      {label:'Control de precios',      effects:{morale:+10,gold_rate:-15,faction_economy:-25},effectText:['+10 moral','-15 oro/turno','Comerciantes -25']}]},
  {id:'faction_coup',image:'img/events/evt_noble_rebellion.png',     category:'POLÍTICA',  priority:'critical',icon:'🗡',title:'Conspiración de Golpe',    description:'Tu espionaje revela que la facción más poderosa conspira para derrocarte.',context:'Si no actúas esta sesión, el golpe procede el próximo turno.',condition:(s)=>{const f=s.factions.reduce((a,b)=>a.satisfaction<b.satisfaction?a:b);return f.satisfaction<20&&f.influence>35;},weight:15,
    options:[
      {label:'Arrestar líderes',        effects:{stability:-20,morale:-15,faction_influence:-30,gold:-150},effectText:['-20 estabilidad','-15 moral','Facción -30 influencia']},
      {label:'Negociar y ceder',        effects:{stability:+5,faction_satisfaction:+30,power:-20},         effectText:['+5 estabilidad','Facción +30','Tu poder -20']},
      {label:'Contraespionaje',         effects:{gold:-200,spy_power:+15},                                 effectText:['-200 oro','+15 poder espionaje']}]},
  {id:'corruption_scandal',category:'POLÍTICA', priority:'high',    icon:'💸',title:'Escándalo de Corrupción',  description:'Un funcionario desviaba impuestos. La noticia llegó al pueblo.',context:'El escándalo afecta a un aliado político.',condition:(s)=>s.economy.corruption>40,weight:7,
    options:[
      {label:'Juicio público',          effects:{morale:+20,stability:+10,gold_rate:-10},effectText:['+20 moral','+10 estabilidad','-10 oro/turno']},
      {label:'Encubrir',                effects:{gold:+50,corruption:+10,stability:-5}, effectText:['+50 oro','Corrupción +10','-5 estabilidad']},
      {label:'Reforma anticorrupción',  effects:{stability:+15,corruption:-25,gold_rate:-20},effectText:['+15 estabilidad','Corrupción -25','-20 oro/turno']}]},
  {id:'law_reform',       category:'POLÍTICA',  priority:'normal',  icon:'⚖', title:'Reforma Legal',             description:'Las facciones presentan tres propuestas de ley radicalmente distintas.',context:'Cada ley satisface a una facción pero irrita a otra. Efecto: 8 turnos.',condition:(s)=>s.turn%8===0,weight:6,
    options:[
      {label:'Ley del Pueblo',          effects:{morale:+25,faction_pueblo:+30,gold_rate:-15,faction_elite:-25},effectText:['+25 moral','Pueblo +30','-15 oro/turno']},
      {label:'Ley del Orden',           effects:{stability:+20,morale:-10,faction_ejercito:+20,faction_pueblo:-15},effectText:['+20 estabilidad','-10 moral','Ejército +20']},
      {label:'Ley del Mercado',         effects:{gold_rate:+25,morale:-5,faction_comerciantes:+30,faction_pueblo:-20},effectText:['+25 oro/turno','Comerciantes +30','Pueblo -20']}]},
  {id:'plague',image:'img/events/evt_plague.png',           category:'CRISIS',    priority:'critical',icon:'☣',title:'Epidemia',                   description:'Una enfermedad desconocida se propaga. La mortalidad crece.',context:'Sin intervención: -20% población en 5 turnos',condition:(s)=>s.turn>8&&Math.random()<0.10,weight:10,
    options:[
      {label:'Cuarentena total',        effects:{population_loss:-500,gold_rate:-30,morale:-20},effectText:['-500 población','-30 oro/turno','-20 moral']},
      {label:'Investigación médica',    effects:{gold:-400,morale:-5},                          effectText:['-400 oro','-5 moral']},
      {label:'Ignorar',                 effects:{population_loss:-2000,morale:-40,stability:-25},effectText:['-2000 población','-40 moral','-25 estabilidad']}]},
  {id:'alliance_offer',image:'img/events/evt_diplomatic.png',   category:'DIPLOMACIA',priority:'normal',  icon:'🤝',
    _buildTitle:(s)=>{const n=(s.diplomacy||[]).find(n=>n.relation>0&&!n.atWar&&!n.allied);return n?'🤝 '+n.name+' propone Alianza':'🤝 Oferta de Alianza';},
    _buildDesc:(s)=>{const n=(s.diplomacy||[]).find(n=>n.relation>0&&!n.atWar&&!n.allied);return n?n.name+' ('+n.icon+') busca una alianza de defensa mutua. Relación actual: '+(n.relation>0?'+':'')+n.relation+'.':'Una nación vecina propone alianza con mutua defensa.';},
    _buildContext:(s)=>{const n=(s.diplomacy||[]).find(n=>n.relation>0&&!n.atWar&&!n.allied);return n?'Nación: '+n.name+' · Ejército: '+(n.army||'desconocido')+' · Rel: '+(n.relation>0?'+':'')+n.relation:'Ejército medio | Economía estable | Conflicto latente al este';},
    _nationId:(s)=>{const n=(s.diplomacy||[]).find(n=>n.relation>0&&!n.atWar&&!n.allied);return n?n.id:null;},
    title:'Oferta de Alianza',         description:'Una nación vecina propone alianza con mutua defensa.',context:'Ejército medio | Economía estable | Conflicto latente al este',condition:(s)=>s.turn>3,weight:7,
    options:[
      {label:'Alianza completa',        effects:{diplomacy:+40,military_support:+20},  effectText:['Relación +40','+20% fuerza conjunta','Obligación defensa mutua']},
      {label:'Acuerdo comercial',       effects:{diplomacy:+20,gold_rate:+15},          effectText:['Relación +20','+15 oro/turno','Sin compromiso militar']},
      {label:'Rechazar',               effects:{diplomacy:-10},                         effectText:['Relación -10','Independencia total']}]},
  {id:'spy_caught',       category:'DIPLOMACIA',priority:'high',    icon:'🕵',title:'Espía Capturado',           description:'Has capturado a un espía enemigo con información valiosa.',context:'Información: planes militares | Riesgo guerra: Medio',condition:(s)=>s.turn>5,weight:6,
    options:[
      {label:'Interrogar y ejecutar',   effects:{spy_intel:+30,diplomacy_target:-40,war_risk:+25},effectText:['+30 inteligencia','-40 relación','+25% riesgo guerra']},
      {label:'Intercambiar prisioneros',effects:{diplomacy_target:+10},                           effectText:['Relación +10','Prisioneros liberados']},
      {label:'Negociar rescate',        effects:{diplomacy_target:-15,gold:+200},                 effectText:['Relación -15','+200 oro']}]},
  {id:'border_raid',image:'img/events/evt_bandits.png',      category:'MILITAR',   priority:'high',    icon:'🔥',title:'Incursión Fronteriza',      description:'Guerreros de una tribu saquearon tres aldeas. 200 civiles muertos.',context:'Tribu: ~600 guerreros | Frontera débil | La estación afecta la campaña',condition:(s)=>s.turn>4,weight:9,
    options:[
      {label:'Represalia militar',      effects:{army:-150,gold:-200,territory:+1,morale:+10,faction_ejercito:+25},effectText:['-150 soldados','-200 oro','+1 territorio','+10 moral']},
      {label:'Negociar y reforzar',     effects:{gold:-150,stability:+5,morale:-10,faction_ejercito:-20},          effectText:['-150 oro','+5 estabilidad','Ejército -20']},
      {label:'Absorber políticamente',  effects:{gold:-100,population:+1500,stability:-10},                        effectText:['-100 oro','+1500 población','-10 estabilidad']}]},
  {id:'army_rebellion',   category:'CRISIS',    priority:'critical',icon:'⚔',title:'Motín Militar',              description:'Tres legiones se niegan a obedecer. Exigen pagos y gloria.',context:'Amotinados: 800 | Leales: 200 | Facciones: divididas',condition:(s)=>{const f=s.factions.find(f=>f.id==='ejercito');return f&&f.satisfaction<15;},weight:18,
    options:[
      {label:'Ceder a todo',            effects:{gold:-500,faction_ejercito:+50,stability:-15},effectText:['-500 oro','Ejército +50','-15 estabilidad']},
      {label:'Negociar mitad',          effects:{gold:-250,faction_ejercito:+25,stability:-5}, effectText:['-250 oro','Ejército +25','-5 estabilidad']},
      {label:'Aplastamiento',           effects:{army:-400,gold:-100,stability:-30,morale:-20,faction_ejercito:-60},effectText:['-400 soldados','-30 estabilidad','-20 moral']}]},
  {id:'legendary_available',category:'MILITAR', priority:'normal',  icon:'⭐',title:'Oportunidad Legendaria',    description:'Las condiciones están dadas para reclutar una unidad de leyenda que cambiará el curso de la guerra.',context:'Una sola unidad excepcional puede inclinar batallas imposibles.',condition:(s)=>!s.legendaryUnit&&s.army>400&&s.morale>65,weight:5,
    options:[
      {label:'Ver unidades legendarias',effects:{open_legendary_menu:true},effectText:['Abre el reclutamiento legendario']},
      {label:'Ahora no',               effects:{},                          effectText:['La oportunidad volverá']}]}
];

// Pool completo de 7 naciones — se eligen 3 aleatoriamente cada partida
var AI_NATIONS_POOL = [
  {id:'ai_1',name:'Imperio Dorado',    icon:'🌟',personality:'agresiva',    government:'autocracia_militar', startRelation:-10,color:'#c8a020'},
  {id:'ai_2',name:'República del Mar', icon:'⚓', personality:'diplomática', government:'república',          startRelation:20, color:'#4a6a9c'},
  {id:'ai_3',name:'Tribu del Bosque',  icon:'🌲',personality:'oportunista', government:'oligarquia_tribal',  startRelation:5,  color:'#4a7c59'},
  {id:'ai_4',name:'Sultanato del Sur', icon:'🌙',personality:'agresiva',    government:'teocracia',          startRelation:-5, color:'#c05820'},
  {id:'ai_5',name:'Liga de Mercaderes',icon:'💎',personality:'diplomática', government:'república',          startRelation:30, color:'#40a080'},
  {id:'ai_6',name:'Horda del Norte',   icon:'🐺',personality:'agresiva',    government:'autocracia_militar', startRelation:-20,color:'#8060a0'},
  {id:'ai_7',name:'Imperio Celeste',   icon:'🐉',personality:'oportunista', government:'burocracia_imperial',startRelation:0,  color:'#a04040'}
];

// Función para seleccionar 3 naciones aleatorias para la partida
function pickAINations(seed) {
  var s = seed || Math.floor(Math.random()*99999);
  var pool = AI_NATIONS_POOL.slice();
  // Shuffle con seed
  for (var i=pool.length-1; i>0; i--) {
    s=(s*1664525+1013904223)&0xffffffff; var j=(s>>>0)%(i+1);
    var tmp=pool[i]; pool[i]=pool[j]; pool[j]=tmp;
  }
  // Reasignar ids secuenciales
  return pool.slice(0,3).map(function(n,i){
    return Object.assign({},n,{id:'ai_'+(i+1)});
  });
}

// Compatibilidad: AI_NATIONS como alias del pool completo
var AI_NATIONS = AI_NATIONS_POOL;

var POLICIES = {
  economia:[
    {id:'free_market',   name:'Mercado Libre',     cost_gold:0,  effect_rate:{gold:+20,morale:-5},        factionEffect:{comerciantes:+20,pueblo:-10},  description:'Menos regulación, más crecimiento.'},
    {id:'state_control', name:'Economía Dirigida', cost_gold:50, effect_rate:{gold:-10,food:+15},         factionEffect:{pueblo:+15,comerciantes:-20},  description:'El Estado planifica.'},
    {id:'war_economy',   name:'Economía de Guerra',cost_gold:100,effect_rate:{iron:+20,gold:-15},         factionEffect:{ejercito:+25,comerciantes:-15},description:'Producción orientada al conflicto.'}],
  social:[
    {id:'bread_circus',  name:'Pan y Circo',        cost_gold:80, effect_rate:{morale:+20,gold:-80},       factionEffect:{pueblo:+30},                  description:'Entretenimiento masivo. Costoso.'},
    {id:'forced_labor',  name:'Trabajo Forzado',    cost_gold:0,  effect_rate:{stone:+30,wood:+20,morale:-30},factionEffect:{pueblo:-40},             description:'Producción máxima. Riesgo de revuelta.'},
    {id:'education',     name:'Escuelas Públicas',  cost_gold:150,effect_rate:{corruption:-15,morale:+5},  factionEffect:{pueblo:+20,burocracia:+10},   description:'Inversión a largo plazo.'}],
  militar:[
    {id:'standing_army', name:'Ejército Permanente',cost_gold:200,effect_rate:{gold:-50,army_strength:+30},factionEffect:{ejercito:+25},               description:'Tropas entrenadas constantemente.'},
    {id:'militia',       name:'Milicia Popular',    cost_gold:50, effect_rate:{army:+100,army_quality:-20},factionEffect:{pueblo:+10},                  description:'Muchos pero menos entrenados.'},
    {id:'mercenaries',   name:'Mercenarios',        cost_gold:300,effect_rate:{army_strength:+50,loyalty:-20},factionEffect:{comerciantes:-10},         description:'Los mejores, lealtad al oro.'}]
};

var WIN_CONDITIONS = [
  {id:'domination', name:'Dominio',             description:'Controla el 85% del territorio de Althoria (14/16 regiones)', check:(s)=>(s.althoriaRegions||0)>=14},
  {id:'prosperity', name:'Era de Prosperidad',  description:'Estabilidad>80 y Moral>80 durante 15 turnos',       check:(s)=>s.stability>=80&&s.morale>=80&&(s.prosperityTurns||0)>=15},
  {id:'economic',   name:'Hegemonía Económica', description:'Acumula 8000 oro',                                   check:(s)=>s.resources.gold>=8000},
  {id:'diplomatic', name:'Hegemonía Diplomática',description:'3 alianzas + 3 rutas comerciales',                  check:(s)=>(s.activeTradeRoutes||[]).length>=3&&(s.diplomacy||[]).filter(n=>(n.treaties||[]).includes('alliance')).length>=3}
];

var LOSE_CONDITIONS = [
  {id:'collapse',   name:'Colapso Social',  description:'Estabilidad ≤ 0 durante 2 turnos', check:(s)=>s.stability<=0&&(s.collapseTurns||0)>=2},
  {id:'starvation', name:'Hambruna Masiva', description:'Alimentos ≤ 0 durante 3 turnos',   check:(s)=>s.resources.food<=0&&(s.famineturns||0)>=3},
  {id:'revolution', name:'Revolución',      description:'Moral ≤ 10 y Estabilidad ≤ 15',    check:(s)=>s.morale<=10&&s.stability<=15},
  {id:'conquest',   name:'Conquista',       description:'Todos los territorios perdidos',    check:(s)=>s.territories<=0}
];

// ============================================================
// GASTO PÚBLICO — opciones con reacción de la población
// ============================================================
var PUBLIC_SPENDING = {
  feast: {
    icon: '🍖', name: 'Banquetes Populares',
    costPerTurn: 40, costOneTime: 0,
    effectText: '+12 moral · Pueblo +15 satisfacción',
    activeReaction: '"¡El pueblo celebra! Los tambores suenan en las plazas."',
    inactiveReaction: 'Sin festividades. El pueblo trabaja en silencio.',
    effects: { morale: +12, faction_pueblo: +15 }
  },
  cathedral: {
    icon: '⛪', name: 'Construcción de Catedral',
    costPerTurn: 30, costOneTime: 200,
    effectText: '+8 moral · Iglesia +20 · Corrupción -5',
    activeReaction: '"Dios mira a nuestro reino con favor. Los peregrinos llegan."',
    inactiveReaction: 'Las almas buscan guía espiritual en vano.',
    effects: { morale: +8, faction_iglesia: +20, corruption: -5 },
    oneTimeCost: { stone: 100 }
  },
  roads: {
    icon: '🛤️', name: 'Red de Caminos',
    costPerTurn: 25,
    effectText: '+15 oro/turno · Comerciantes +10 · Moral +3',
    activeReaction: '"Los mercaderes traen noticias y riqueza de tierras lejanas."',
    inactiveReaction: 'Los caminos son lodazales. El comercio languidece.',
    effects: { trade_income: +15, faction_comerciantes: +10, morale: +3 }
  },
  barracks: {
    icon: '🏰', name: 'Cuarteles y Academias',
    costPerTurn: 45,
    effectText: 'Ejército +20 · Army quality +15% · Facción Ejército +12',
    activeReaction: '"Los soldados marchan con orgullo. El acero brilla."',
    inactiveReaction: 'Los soldados se aburren. La disciplina cae.',
    effects: { faction_ejercito: +12, army_quality: +15 }
  },
  hospital: {
    icon: '🏥', name: 'Casas de Curación',
    costPerTurn: 35,
    effectText: '+5 crecimiento poblacional · Moral +6 · Plaga resist. +30%',
    activeReaction: '"Los enfermos se recuperan. Las madres dan gracias."',
    inactiveReaction: 'La enfermedad se propaga sin control.',
    effects: { morale: +6, pop_growth: +5 }
  },
  market: {
    icon: '🏪', name: 'Mercado Central',
    costPerTurn: 20, costOneTime: 150,
    effectText: '+20 oro/turno · Inflación -5/turno · Comerciantes +15',
    activeReaction: '"El mercado hierve de vida. El oro fluye como el agua."',
    inactiveReaction: 'Sin mercado central, el trueque empobrecece a todos.',
    effects: { trade_income: +20, inflation: -5, faction_comerciantes: +15 }
  },
  walls: {
    icon: '🧱', name: 'Murallas Defensivas',
    costPerTurn: 15, costOneTime: 300,
    effectText: 'Defensa +40% · Estabilidad +8 · Moral +5',
    activeReaction: '"Las piedras hablan de nuestra determinación. Nadie nos romperá."',
    inactiveReaction: 'Sin murallas, los enemigos nos ven vulnerables.',
    effects: { stability: +8, morale: +5, defense_bonus: +40 },
    oneTimeCost: { stone: 150, wood: 80 }
  },
  library: {
    icon: '📚', name: 'Biblioteca y Scriptorium',
    costPerTurn: 20,
    effectText: 'Corrupción -8/turno · Moral +4 · Estabilidad +3',
    activeReaction: '"Los escribas trabajan a la luz de las velas. El saber nos guía."',
    inactiveReaction: 'La ignorancia alimenta la superstición y la corrupción.',
    effects: { corruption: -8, morale: +4, stability: +3 }
  },
  games: {
    icon: '🎭', name: 'Torneos y Juegos',
    costPerTurn: 30,
    effectText: '+15 moral · Ejército +8 moral · Pueblo +10',
    activeReaction: '"¡Los campeones combaten por el honor del reino!"',
    inactiveReaction: 'Sin entretenimiento, el pueblo solo piensa en sus miserias.',
    effects: { morale: +15, faction_ejercito: +8, faction_pueblo: +10 }
  },
  aqueduct: {
    icon: '🌊', name: 'Acueductos',
    costPerTurn: 25, costOneTime: 0,
    effectText: '+10% crecimiento · Alimentos +20/turno · Salud mejorada',
    activeReaction: '"El agua limpia corre por las calles. La ciudad prospera."',
    inactiveReaction: 'Sin agua corriente, la enfermedad acecha en los pozos.',
    effects: { food_bonus: +20, pop_growth: +10 }
  }
};
