// ============================================================
// IMPERIUM — SYSTEMS.JS  (v2)
// Economía, Estaciones, Clima, Facciones, Sociedad,
// Ejército multiunidad, Espías, Comercio, Eventos
// ============================================================

const Systems = {

  // ============================================================
  // ECONOMÍA
  // ============================================================
  Economy: {

    calculateRates(state) {
      const gov = GOVERNMENT_TYPES[state.government];
      const season = SEASONS[state.climate.season] || SEASONS.spring;
      const extremeEv = state.climate.activeExtreme ? EXTREME_CLIMATE_EVENTS[state.climate.activeExtreme] : null;
      const corr = 1 - (state.economy.corruption / 200);

      // Modificadores totales de clima
      const foodMod  = (season.foodMod  + (extremeEv ? extremeEv.foodMod  : 0)) / 100;
      const goldMod  = (season.goldMod  + (extremeEv ? extremeEv.goldMod  : 0)) / 100;
      const woodMod  = (season.woodMod  + 0) / 100;

      // ALIMENTOS
      // Producción bruta (granjas, caza, pesca)
      let food_base = Math.floor(state.population / 12);
      let food_extra = state.economy.food_bonus || 0;
      let food_policy = state.activePolicies.includes('forced_labor') ? 0.15 : 0;
      let food_produced = Math.floor((food_base + food_extra) * (1 + foodMod + food_policy) * corr);
      // Consumo: cada habitante consume ~0.06 unidades/turno (antes era gratuito)
      let food_consumed = Math.floor(state.population * 0.06);
      let food_rate = food_produced - food_consumed;

      // GOLD — impuestos en % sobre ingresos base
      const taxRate   = (state.economy.taxRate || 20) / 100;  // default 20%
      let gold_base = Math.floor(state.population / 20) + state.economy.trade_income;
      // Los impuestos multiplican los ingresos base de oro
      gold_base = Math.floor(gold_base * (1 + (taxRate - 0.20)));  // 20% es la línea base
      // Rutas comerciales activas
      let trade_bonus = 0;
      (state.activeTradeRoutes || []).forEach(rt => {
        if (rt.income && rt.income.gold) trade_bonus += rt.income.gold;
      });
      gold_base += trade_bonus;
      let gold_army = this.calculateArmyUpkeep(state);
      let gold_debt  = Math.floor(state.economy.debt / 20);
      let gold_policy = state.activePolicies.includes('free_market') ? 20 :
                        state.activePolicies.includes('state_control') ? -10 : 0;
      let gold_bread = state.activePolicies.includes('bread_circus') ? -80 : 0;
      let gold_rate  = Math.floor((gold_base + gold_policy + gold_bread) * (1 + goldMod * 0.5) * corr) - gold_army - gold_debt;

      // MADERA
      let wood_rate = Math.floor(state.population / 30);
      if (state.activePolicies.includes('forced_labor')) wood_rate += 20;
      wood_rate = Math.floor(wood_rate * (1 + woodMod * 0.5));

      // PIEDRA
      let stone_rate = Math.floor(state.population / 40);
      if (state.activePolicies.includes('forced_labor')) stone_rate += 30;

      // HIERRO
      let iron_rate = Math.floor(state.population / 50);
      if (state.activePolicies.includes('war_economy')) iron_rate += 20;

      // Ruta comercial hierro
      (state.activeTradeRoutes || []).forEach(rt => {
        if (rt.income && rt.income.iron) iron_rate += rt.income.iron;
      });

      return { food: food_rate, gold: gold_rate, wood: wood_rate, stone: stone_rate, iron: iron_rate };
    },

    calculateArmyUpkeep(state) {
      let total = 0;
      (state.armyUnits || []).forEach(unit => {
        const def = MILITARY_UNITS[unit.typeId];
        if (def) total += def.upkeep * unit.count;
      });
      // Unidad legendaria
      if (state.legendaryUnit) {
        const leg = LEGENDARY_UNITS.find(l => l.id === state.legendaryUnit.id);
        if (leg) total += leg.upkeep;
      }
      return Math.floor(total);
    },

    applyRates(state, rates) {
      state.resources.food  = Math.max(0, state.resources.food  + rates.food);
      state.resources.gold  = Math.max(0, state.resources.gold  + rates.gold);
      state.resources.wood  = Math.max(0, state.resources.wood  + rates.wood);
      state.resources.stone = Math.max(0, state.resources.stone + rates.stone);
      state.resources.iron  = Math.max(0, state.resources.iron  + rates.iron);
      state.rates = rates;

      // Efecto de impuestos en moral (se aplica cada turno)
      const tax = state.economy.taxRate || 20;
      let moralTaxDelta = 0;
      if      (tax <= 5)  moralTaxDelta = +3;   // impuestos muy bajos: pueblo feliz
      else if (tax <= 15) moralTaxDelta = +1;
      else if (tax <= 25) moralTaxDelta = 0;    // zona normal sin efecto
      else if (tax <= 35) moralTaxDelta = -2;
      else if (tax <= 50) moralTaxDelta = -5;
      else if (tax <= 70) moralTaxDelta = -10;
      else                moralTaxDelta = -18;  // impuestos opresivos
      // Facciones también se ven afectadas
      if (tax > 40) {
        const pueblo = (state.factions||[]).find(f=>f.id==='pueblo');
        if (pueblo) pueblo.satisfaction = Math.max(0, pueblo.satisfaction - 2);
        const comerciantes = (state.factions||[]).find(f=>f.id==='comerciantes');
        if (comerciantes) comerciantes.satisfaction = Math.max(0, comerciantes.satisfaction - 1);
      } else if (tax < 10) {
        const burocracia = (state.factions||[]).find(f=>f.id==='burocracia');
        if (burocracia) burocracia.satisfaction = Math.max(0, burocracia.satisfaction - 1);
      }
      if (moralTaxDelta !== 0)
        state.morale = Math.max(0, Math.min(100, state.morale + moralTaxDelta));

      // Inflación
      if (state.economy.debt > 200)  state.economy.inflation = Math.min(100, state.economy.inflation + 3);
      if (state.economy.inflation > 0 && rates.gold > 0) state.economy.inflation = Math.max(0, state.economy.inflation - 1);
      if (state.economy.inflation > 40) state.resources.gold = Math.floor(state.resources.gold * 0.97);

      // Rutas comerciales: moral/estabilidad bonus
      (state.activeTradeRoutes || []).forEach(rt => {
        if (rt.income && rt.income.morale)    state.morale    = Math.min(100, state.morale    + rt.income.morale);
        if (rt.income && rt.income.stability) state.stability = Math.min(100, state.stability + rt.income.stability);
        if (rt.income && rt.income.food)      state.resources.food = Math.max(0, state.resources.food + rt.income.food);
        // Mejora de relación por turno
        if (rt.nationId && rt.relationBonus) {
          const n = (state.diplomacy || []).find(n => n.id === rt.nationId);
          if (n) n.relation = Math.min(100, n.relation + rt.relationBonus);
        }
      });

      // Hambruna
      if (state.resources.food <= 0) {
        state.famineturns = (state.famineturns || 0) + 1;
        state.morale      = Math.max(0, state.morale - 15);
        state.population  = Math.max(1000, state.population - Math.floor(state.population * 0.03));
        Systems.Log.add(state, 'El pueblo pasa hambre. La moral colapsa.', 'crisis');
      } else {
        state.famineturns = 0;
      }
    },

    updateCorruption(state) {
      const gov = GOVERNMENT_TYPES[state.government];
      let delta = (gov.corruptionPenalty / 20) - (state.activePolicies.includes('education') ? 1.5 : 0);
      state.economy.corruption = Math.max(0, Math.min(100, state.economy.corruption + delta));
    }
  },

  // ============================================================
  // SISTEMA DE ESTACIONES Y CLIMA EXTREMO
  //
  // Jerarquía visual:
  //   Base = estación del año (fondo permanente, importancia media)
  //   Modificador = evento extremo (overlay temporal, menor peso sistémico)
  //
  // Los eventos extremos son CONDICIONANTES (no protagonistas):
  //   - Pueden encadenar otros eventos
  //   - Modifican producciones moderadamente
  //   - No reemplazan a la política/diplomacia como ejes del juego
  // ============================================================
  Climate: {
    SEASON_SEQUENCE: ['spring', 'summer', 'autumn', 'winter'],

    update(state) {
      const turnInYear = ((state.turn - 1) % 16);
      const seasonIdx  = Math.floor(turnInYear / 4);
      const newSeason  = this.SEASON_SEQUENCE[seasonIdx];

      const prevSeason = state.climate.season;
      state.climate.season = newSeason;

      // Notificar cambio de estación
      if (newSeason !== prevSeason) {
        const s = SEASONS[newSeason];
        Systems.Log.add(state, `${s.icon} ${s.name}: ${s.flavorTexts[Math.floor(Math.random() * s.flavorTexts.length)]}`, 'info');
      }

      // ── GESTIONAR EVENTO EXTREMO ACTIVO ──
      if (state.climate.activeExtreme) {
        state.climate.extremeDuration--;

        if (state.climate.extremeDuration <= 0) {
          const ev = EXTREME_CLIMATE_EVENTS[state.climate.activeExtreme];
          Systems.Log.add(state, `El evento climático "${ev.name}" ha terminado.`, 'good');

          // Encadenamiento: ¿genera un evento siguiente?
          if (ev.triggersChain && Math.random() < ev.chainChance) {
            const chainEv = EXTREME_CLIMATE_EVENTS[ev.triggersChain];
            if (chainEv) {
              this.activateExtreme(state, ev.triggersChain);
              Systems.Log.add(state, `⚠ El "${ev.name}" ha desencadenado: "${chainEv.name}"`, 'warn');
              return;
            }
          }
          state.climate.activeExtreme = null;
        }
        // Aplicar efectos de estabilidad si el evento los tiene
        const activeEv = EXTREME_CLIMATE_EVENTS[state.climate.activeExtreme];
        if (activeEv && activeEv.stabilityLoss) {
          state.stability = Math.max(0, state.stability - activeEv.stabilityLoss * 0.3);
        }
        state.climate.current = state.climate.activeExtreme;
      } else {
        state.climate.current = newSeason;

        // ── GENERAR NUEVO EVENTO EXTREMO ──
        const season = SEASONS[newSeason];
        if (Math.random() < season.extremeChance) {
          const candidates = season.extremeEvents;
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          // Inmunidad a frío para Norse
          if ((chosen === 'frio_extremo' || chosen === 'blizzard') && state.coldImmune) {
            Systems.Log.add(state, `❄ El frío extremo azota la región, pero tu pueblo está forjado en el frío.`, 'good');
            return;
          }
          this.activateExtreme(state, chosen);
        }
      }
    },

    activateExtreme(state, eventId) {
      const ev = EXTREME_CLIMATE_EVENTS[eventId];
      if (!ev) return;
      const dur = ev.duration[0] + Math.floor(Math.random() * (ev.duration[1] - ev.duration[0] + 1));
      state.climate.activeExtreme   = eventId;
      state.climate.extremeDuration = dur;
      state.climate.current         = eventId;
      Systems.Log.add(state, `${ev.icon} ${ev.message}`, ev.foodMod < -30 || ev.moraleMod < -20 ? 'crisis' : 'warn');

      // Algunos eventos encadenados añaden eventos político/decisión
      if (eventId === 'revuelta_hambre') {
        state.pendingClimateEvent = {
          icon: '✊', title: 'Revueltas por Hambre',
          description: 'El hambre ha encendido la mecha. Grupos armados asaltan los graneros del gobierno.',
          context: `Moral actual: ${state.morale} | Estabilidad: ${state.stability}`,
          options: [
            { label: 'Reprimir con fuerza', effects: { stability:-10, morale:-10, army:-50, faction_ejercito:+10 }, effectText:['-10 estabilidad','-10 moral','-50 soldados'] },
            { label: 'Distribuir reservas', effects: { resources_food:-200, morale:+15, stability:+5 },            effectText:['-200 alimentos','+15 moral','+5 estabilidad'] },
            { label: 'Proclamar estado de emergencia', effects: { stability:-5, corruption:+10, morale:-5 },       effectText:['-5 estabilidad','Corrupción +10','-5 moral'] }
          ]
        };
      }
    },

    // Resumen para la UI
    getSummary(state) {
      const season  = SEASONS[state.climate.season] || SEASONS.spring;
      const extreme = state.climate.activeExtreme ? EXTREME_CLIMATE_EVENTS[state.climate.activeExtreme] : null;
      return {
        season,
        extreme,
        current: extreme || season,
        totalFoodMod:  season.foodMod  + (extreme ? extreme.foodMod  : 0),
        totalMoralMod: season.moraleMod + (extreme ? extreme.moraleMod : 0),
        totalArmyMod:  season.armyMod  + (extreme ? extreme.armyMod  : 0),
        extremeDuration: state.climate.extremeDuration || 0
      };
    }
  },

  // ============================================================
  // FACCIONES
  // ============================================================
  Factions: {
    init(civData) {
      return civData.factions.map(fId => {
        const def = FACTION_DEFINITIONS[fId];
        return {
          id: fId, name: def.name, icon: def.icon, color: def.color,
          satisfaction: 50 + Math.floor(Math.random() * 20) - 10,
          influence: def.baseInfluence + Math.floor(Math.random() * 10),
          loyalTurns: 0, angryTurns: 0,
          currentDemand: this.generateDemand(fId)
        };
      });
    },

    generateDemand(fId) {
      const d = {
        ejercito:['Aumenta presupuesto militar','Declara guerra a un vecino','Equipa 200 soldados más'],
        pueblo:['Reduce los impuestos','Construye graneros','Aplica bienestar social'],
        comerciantes:['Firma acuerdo comercial','Reduce regulaciones','Construye ruta de comercio'],
        senado:['Reforma las leyes','Convoca consultas','Limita el poder ejecutivo'],
        iglesia:['Construye un templo','Declara ciudad sagrada','Expulsa influencias extranjeras'],
        nobleza:['Concede tierras','Exime de impuestos','Refuerza privilegios nobiliarios'],
        burocracia:['Reforma la administración','Aumenta salarios de funcionarios','Implementa censo'],
        chamanes:['Protege ritos tradicionales','Mantén territorios sagrados','No modernices sin consultar'],
        jarls:['Respeta autonomía de clanes','Comparte botín de guerra','No centralices el poder'],
        guerreros:['Organiza una campaña','Aumenta el pillaje permitido','Arma a los mejores'],
        escaldos:['Financia épicas de guerra','Organiza torneos','Preserva la tradición oral'],
        sacerdotes:['Organiza sacrificio ritual','Expande territorio sagrado','Construye pirámide']
      };
      const list = d[fId] || ['Sin demanda'];
      return list[Math.floor(Math.random() * list.length)];
    },

    update(state) {
      const extreme = state.climate.activeExtreme ? EXTREME_CLIMATE_EVENTS[state.climate.activeExtreme] : null;
      state.factions.forEach(f => {
        let delta = 0;
        if (state.morale > 70) delta += 2;
        if (state.morale < 40) delta -= 3;
        if (state.resources.food < 100) delta -= 5;
        if (state.stability < 30) delta -= 4;
        // Clima extremo afecta a pueblo y ejército
        if (extreme) {
          if (f.id === 'pueblo' && extreme.moraleMod < -15) delta -= 3;
          if (f.id === 'ejercito' && extreme.armyMod < -15) delta -= 2;
        }
        switch(f.id) {
          case 'ejercito':
            if (state.army > 500) delta += 2;
            if (state.army < 200) delta -= 3;
            if (state.activePolicies.includes('war_economy'))   delta += 3;
            if (state.activePolicies.includes('standing_army')) delta += 4;
            break;
          case 'pueblo':
            if (state.resources.food > 400) delta += 2;
            if (state.resources.food < 150) delta -= 5;
            if (state.activePolicies.includes('bread_circus'))  delta += 4;
            if (state.activePolicies.includes('forced_labor'))  delta -= 6;
            if (state.economy.corruption > 60) delta -= 3;
            break;
          case 'comerciantes':
            if (state.economy.trade_income > 50)  delta += 3;
            if ((state.activeTradeRoutes||[]).length > 0) delta += 2;
            if (state.activePolicies.includes('free_market'))   delta += 4;
            if (state.activePolicies.includes('state_control')) delta -= 4;
            if (state.economy.inflation > 50) delta -= 5;
            break;
          case 'senado': case 'burocracia':
            if (state.stability > 60) delta += 2;
            if (state.economy.corruption < 30) delta += 2;
            if (state.economy.corruption > 60) delta -= 3;
            break;
          case 'iglesia': case 'sacerdotes':
            if (state.morale > 65) delta += 3;
            if (state.morale < 35) delta -= 4;
            break;
          case 'nobleza': case 'jarls':
            if (state.activePolicies.includes('free_market')) delta += 2;
            break;
        }
        f.satisfaction = Math.max(0, Math.min(100, f.satisfaction + delta));
        if (f.satisfaction < 20) f.angryTurns = (f.angryTurns || 0) + 1;
        else f.angryTurns = Math.max(0, (f.angryTurns || 0) - 1);
        if (f.satisfaction > 60) f.loyalTurns = (f.loyalTurns || 0) + 1;
      });
    },

    calculatePoliticalPower(state) {
      const totalInfluence = state.factions.reduce((s, f) => s + f.influence, 0);
      const weighted = state.factions.reduce((s, f) => s + f.satisfaction * f.influence, 0);
      return Math.floor(weighted / totalInfluence);
    }
  },

  // ============================================================
  // SOCIEDAD
  // ============================================================
  Society: {
    update(state) {
      const climSummary = Systems.Climate.getSummary(state);
      const factionPower = Systems.Factions.calculatePoliticalPower(state);

      // MORAL
      let moralDelta = climSummary.totalMoralMod * 0.4; // clima: efecto moderado
      if (state.resources.food > state.population / 8) moralDelta += 2;
      if (state.resources.food < state.population / 20) moralDelta -= 6;
      if (state.economy.corruption > 60) moralDelta -= 2;
      if (state.activePolicies.includes('bread_circus')) moralDelta += 5;
      if (state.activePolicies.includes('forced_labor')) moralDelta -= 4;
      if (state.activePolicies.includes('education'))    moralDelta += 1;
      if (factionPower > 65) moralDelta += 2;
      if (factionPower < 35) moralDelta -= 3;
      // Rutas comerciales
      (state.activeTradeRoutes||[]).forEach(rt => { if(rt.income&&rt.income.morale) moralDelta += rt.income.morale * 0.5; });
      state.morale = Math.max(0, Math.min(100, state.morale + moralDelta));

      // ESTABILIDAD
      const gov = GOVERNMENT_TYPES[state.government];
      let stabDelta = gov.stabilityBonus / 10;
      const angryFactions  = state.factions.filter(f => f.satisfaction < 25).length;
      const happyFactions  = state.factions.filter(f => f.satisfaction > 65).length;
      stabDelta -= angryFactions * 2;
      stabDelta += happyFactions * 1.5;
      if (state.morale < 30) stabDelta -= 3;
      if (state.morale > 70) stabDelta += 1;
      if (state.economy.debt > 500) stabDelta -= 2;
      state.stability = Math.max(0, Math.min(100, state.stability + stabDelta));

      // Tracking
      if (state.stability <= 0) state.collapseTurns = (state.collapseTurns||0) + 1;
      else state.collapseTurns = 0;
      if (state.stability >= 80 && state.morale >= 80) state.prosperityTurns = (state.prosperityTurns||0) + 1;
      else state.prosperityTurns = 0;

      if (state.morale < 25)    Systems.Log.add(state, `⚠ Moral crítica (${state.morale}). Riesgo de revuelta.`, 'crisis');
      if (state.stability < 20) Systems.Log.add(state, `⚠ Estabilidad crítica (${state.stability}). Las instituciones se desmoronan.`, 'crisis');
    }
  },

  // ============================================================
  // EJÉRCITO Y MOTOR DE BATALLA
  //
  // Fuerza efectiva = Σ (strength × count × terrainBonus × moraleM × corruptionM × seasonM)
  // Las unidades tienen sinergia entre tipos (caballería + arqueros = combo)
  // ============================================================
  Military: {

    // Inicializar ejército base según civilización
    initArmy(civData, armySize) {
      const units = [];
      // Unidades genéricas de inicio
      const startUnits = [
        { typeId: 'infanteria', count: Math.floor(armySize * 0.5) },
        { typeId: 'arqueros',   count: Math.floor(armySize * 0.3) },
        { typeId: 'caballeria', count: Math.floor(armySize * 0.2) }
      ];
      startUnits.forEach(u => {
        if (u.count > 0) units.push({ typeId: u.typeId, count: u.count, id: u.typeId + '_base' });
      });
      // Unidad especial de civilización
      const bonuses = civData.unitBonuses || {};
      Object.keys(bonuses).forEach(uid => {
        const def = MILITARY_UNITS[uid];
        if (def && !def.civRestrict || (def && def.civRestrict && def.civRestrict.includes(civData.id))) {
          if (!units.find(u => u.typeId === uid)) {
            units.push({ typeId: uid, count: Math.floor(armySize * 0.1), id: uid + '_civ' });
          }
        }
      });
      return units;
    },

    // Total de soldados
    totalSoldiers(state) {
      return (state.armyUnits || []).reduce((s, u) => s + u.count, 0);
    },

    // Fuerza efectiva total considerando terreno del capital, moral, estación
    calculateEffectiveStrength(state, terrain = 'plains') {
      const moraleMod   = state.morale / 100;
      const corruptMod  = 1 - (state.economy.corruption / 200);
      const climSummary = Systems.Climate.getSummary(state);
      const seasonArmyM = 1 + climSummary.totalArmyMod / 100;

      let totalStrength = 0;
      (state.armyUnits || []).forEach(unit => {
        const def = MILITARY_UNITS[unit.typeId];
        if (!def) return;
        const terrBonus = def.terrainBonus[terrain] || 1.0;
        const civBonus  = (state.civData && state.civData.unitBonuses && state.civData.unitBonuses[unit.typeId]) || 1.0;
        const policyMod = state.activePolicies.includes('standing_army') ? 1.3 :
                          state.activePolicies.includes('militia')       ? 0.8 :
                          state.activePolicies.includes('mercenaries')   ? 1.5 : 1.0;
        totalStrength += def.strength * unit.count * terrBonus * civBonus * policyMod;
      });

      // Unidad legendaria
      if (state.legendaryUnit) {
        const leg = LEGENDARY_UNITS.find(l => l.id === state.legendaryUnit.id);
        if (leg) {
          totalStrength += leg.strength * leg.count;
          // Gran Khan: +25% a todo
          if (state.legendaryUnit.id === 'gran_khan') totalStrength *= 1.25;
        }
      }

      return Math.floor(totalStrength * moraleMod * corruptMod * seasonArmyM);
    },

    // ── MOTOR DE BATALLA ──
    // Calcula probabilidad de victoria con análisis detallado
    analyzeBattle(attackerState, targetNation, spyIntel) {
      const attackerStr = this.calculateEffectiveStrength(attackerState);

      // Fuerza del defensor
      let defenderStr;
      if (spyIntel && targetNation.revealed) {
        // Con inteligencia: dato exacto + 10% margen
        defenderStr = (targetNation.army * 18) * (0.9 + Math.random() * 0.2);
      } else {
        // Sin inteligencia: estimación con incertidumbre alta (±40%)
        defenderStr = (targetNation.army * 18) * (0.6 + Math.random() * 0.8);
      }

      // Modificadores de contexto
      const seasonSummary = Systems.Climate.getSummary(attackerState);
      const seasonMod     = 1 + seasonSummary.totalArmyMod / 100;
      const adjustedAtk   = attackerStr * seasonMod;
      const ratio         = adjustedAtk / Math.max(1, defenderStr);

      // Curva de probabilidad de victoria (sigmoide suave)
      let winChance;
      if (ratio >= 2.0) winChance = 0.95;
      else if (ratio >= 1.5) winChance = 0.85;
      else if (ratio >= 1.2) winChance = 0.72;
      else if (ratio >= 1.0) winChance = 0.58;
      else if (ratio >= 0.8) winChance = 0.40;
      else if (ratio >= 0.6) winChance = 0.22;
      else if (ratio >= 0.4) winChance = 0.10;
      else winChance = 0.03;

      // Dragón de guerra: moral enemiga -30
      if (attackerState.legendaryUnit && attackerState.legendaryUnit.id === 'dragon_de_guerra') {
        winChance = Math.min(0.98, winChance + 0.15);
      }

      // Elefantes: débiles si se vuelven
      let elephantRisk = false;
      if (attackerState.legendaryUnit && attackerState.legendaryUnit.id === 'elefantes_guerra') {
        winChance = Math.min(0.98, winChance + 0.20);
        if (Math.random() < 0.20 && winChance < 0.7) elephantRisk = true;
      }

      return {
        attackerStrength: Math.floor(adjustedAtk),
        defenderStrength: Math.floor(defenderStr),
        ratio: ratio.toFixed(2),
        winChance: Math.round(winChance * 100),
        seasonEffect: seasonSummary.totalArmyMod,
        spyUsed: spyIntel && targetNation.revealed,
        elephantRisk,
        recommendation: winChance > 0.70 ? '✅ Favorable' :
                        winChance > 0.45 ? '⚠ Arriesgado' : '❌ Peligroso'
      };
    },

    resolveBattle(attackerState, targetNation) {
      const intel = attackerState.intelligence && attackerState.intelligence[targetNation.id];
      const analysis = this.analyzeBattle(attackerState, targetNation, !!intel);
      const won = Math.random() * 100 < analysis.winChance;

      // Bajas propias
      let casualtyRate = won ? (0.05 + Math.random() * 0.15) : (0.20 + Math.random() * 0.30);
      const totalSoldiers = this.totalSoldiers(attackerState);
      const casualties = Math.floor(totalSoldiers * casualtyRate);

      // Distribuir bajas proporcionalmente entre unidades
      if (casualties > 0) {
        let remaining = casualties;
        const units = attackerState.armyUnits || [];
        for (let i = 0; i < units.length && remaining > 0; i++) {
          const loss = Math.min(units[i].count, Math.floor(remaining * (units[i].count / totalSoldiers)));
          units[i].count -= loss;
          remaining -= loss;
        }
        // Limpiar unidades a 0
        attackerState.armyUnits = (attackerState.armyUnits || []).filter(u => u.count > 0);
      }

      // Elefantes que se vuelven
      if (analysis.elephantRisk) {
        const additionalCasualties = Math.floor(totalSoldiers * 0.08);
        attackerState.armyUnits = (attackerState.armyUnits || []).map(u => ({ ...u, count: Math.max(0, u.count - Math.floor(additionalCasualties / 5)) })).filter(u => u.count > 0);
        Systems.Log.add(attackerState, '🐘 ¡Los elefantes se volvieron contra las propias tropas!', 'crisis');
      }

      return { won, casualties, analysis };
    },

    recruitUnit(state, typeId, count) {
      const def = MILITARY_UNITS[typeId];
      if (!def) return { ok: false, msg: 'Unidad desconocida' };

      // Restricción de civilización
      if (def.civRestrict && state.civId && !def.civRestrict.includes(state.civId)) {
        return { ok: false, msg: `Solo disponible para: ${def.civRestrict.join(', ')}` };
      }

      // Requisito de política
      if (def.requires && !def.requires.some(r => state.activePolicies.includes(r))) {
        return { ok: false, msg: `Requiere política: ${def.requires.join(' o ')}` };
      }

      // Coste
      const batallones = Math.ceil(count / def.count);
      const totalCost = { gold: (def.cost.gold || 0) * batallones, wood: (def.cost.wood || 0) * batallones, iron: (def.cost.iron || 0) * batallones, stone: (def.cost.stone || 0) * batallones };
      for (const [res, val] of Object.entries(totalCost)) {
        if (val > 0 && state.resources[res] < val) return { ok: false, msg: `Falta ${res}: necesitas ${val}, tienes ${state.resources[res]}` };
      }
      for (const [res, val] of Object.entries(totalCost)) {
        if (val > 0) state.resources[res] -= val;
      }

      // Añadir o incrementar
      const existing = (state.armyUnits || []).find(u => u.typeId === typeId);
      if (existing) existing.count += count;
      else {
        state.armyUnits = state.armyUnits || [];
        state.armyUnits.push({ typeId, count, id: typeId + '_' + Date.now() });
      }

      // Bonus de moral del berserker/jaguar
      if (def.moralBonus) state.morale = Math.min(100, state.morale + def.moralBonus);

      Systems.Log.add(state, `Reclutados ${count} ${def.name}. Coste: ${totalCost.gold}🪙`, 'good');
      return { ok: true };
    },

    recruitLegendary(state, legendaryId) {
      if (state.legendaryUnit) return { ok: false, msg: 'Ya tienes una unidad legendaria activa.' };
      const leg = LEGENDARY_UNITS.find(l => l.id === legendaryId);
      if (!leg) return { ok: false, msg: 'Unidad no encontrada.' };

      const cost = leg.cost;
      for (const [res, val] of Object.entries(cost)) {
        if (state.resources[res] < val) return { ok: false, msg: `Falta ${res}: necesitas ${val}` };
      }
      for (const [res, val] of Object.entries(cost)) state.resources[res] -= val;

      state.legendaryUnit = { id: legendaryId, name: leg.name, icon: leg.icon, turnsActive: 0 };
      Systems.Log.add(state, `⭐ ${leg.name} se une a tu ejército. "${leg.flavorText}"`, 'good');
      return { ok: true };
    }
  },

  // ============================================================
  // SISTEMA DE ESPÍAS
  // ============================================================
  Spies: {
    init(civData) {
      return {
        count: civData.startSpies || 1,
        active: [],    // misiones en curso
        intelligence: {} // info recopilada
      };
    },

    sendMission(state, missionId, targetNationId) {
      const mission = SPY_MISSIONS[missionId];
      const nation  = (state.diplomacy || []).find(n => n.id === targetNationId);
      if (!mission || !nation) return { ok: false, msg: 'Misión o nación inválida.' };

      const spies = state.spies || { count: 1, active: [], intelligence: {} };
      const busySpies = spies.active.length;
      if (busySpies >= spies.count) return { ok: false, msg: `Todos tus espías están ocupados (${spies.count}).` };

      const cost = mission.cost;
      if (state.resources.gold < (cost.gold || 0)) return { ok: false, msg: `Falta oro: necesitas ${cost.gold}` };
      state.resources.gold -= (cost.gold || 0);

      spies.active.push({
        missionId,
        targetId: targetNationId,
        turnsLeft: mission.duration,
        id: missionId + '_' + Date.now()
      });
      state.spies = spies;

      Systems.Log.add(state, `${mission.icon} Espía enviado: "${mission.name}" contra ${nation.name} (${mission.duration} turnos).`, 'info');
      return { ok: true };
    },

    // Ejecutar misiones activas al final de turno
    processMissions(state) {
      if (!state.spies || !state.spies.active.length) return;

      const completed = [];
      state.spies.active.forEach(mission => {
        mission.turnsLeft--;
        if (mission.turnsLeft <= 0) completed.push(mission);
      });

      completed.forEach(mission => {
        state.spies.active = state.spies.active.filter(m => m.id !== mission.id);
        const missionDef = SPY_MISSIONS[mission.missionId];
        const nation = (state.diplomacy || []).find(n => n.id === mission.targetId);
        if (!missionDef || !nation) return;

        const success = Math.random() < missionDef.successChance;

        if (success) {
          // Ejecutar efecto según tipo
          this.applySuccess(state, mission.missionId, nation);
        } else {
          // Fracaso: consecuencias diplomáticas
          nation.relation = Math.max(-100, nation.relation - 15);
          if (mission.missionId === 'envenenar_lider') {
            nation.atWar = true;
            state.stability = Math.max(0, state.stability - 15);
            Systems.Log.add(state, `☠ ¡El asesino fue capturado! ${nation.name} declara la guerra.`, 'crisis');
          } else {
            Systems.Log.add(state, `🕵 Misión fallida contra ${nation.name}. Relación -15.`, 'warn');
          }
        }
      });
    },

    applySuccess(state, missionId, nation) {
      state.spies = state.spies || { count: 1, active: [], intelligence: {} };
      switch(missionId) {
        case 'reconocimiento':
          nation.revealed = true;
          nation.revealedTurns = 4;
          Systems.Log.add(state, `🔍 Reconocimiento exitoso: ${nation.name} tiene ${nation.army} soldados.`, 'good');
          break;
        case 'sabotaje_economico':
          nation.resources = nation.resources || {};
          nation.resources.gold = Math.max(0, (nation.resources.gold || 200) - 200);
          nation.resources.food = Math.max(0, (nation.resources.food || 300) - 150);
          Systems.Log.add(state, `💣 Sabotaje exitoso. ${nation.name} pierde recursos críticos.`, 'good');
          break;
        case 'intriga_politica':
          nation.stability = Math.max(10, (nation.stability || 50) - 20);
          nation.morale    = Math.max(10, (nation.morale || 60) - 15);
          Systems.Log.add(state, `🎭 Intriga exitosa. Las facciones de ${nation.name} se enfrentan.`, 'good');
          break;
        case 'robo_planos':
          state.intelligence = state.intelligence || {};
          state.intelligence[nation.id] = { plans: true, turns: 5 };
          nation.revealed = true;
          nation.revealedTurns = 5;
          Systems.Log.add(state, `📜 Planos obtenidos. Los movimientos de ${nation.name} están descubiertos.`, 'good');
          break;
        case 'envenenar_lider':
          nation.stability = Math.max(0, (nation.stability || 50) - 40);
          nation.morale    = Math.max(0, (nation.morale || 60) - 30);
          nation.atWar     = false;
          Systems.Log.add(state, `☠ Misión cumplida. ${nation.name} sufre crisis de sucesión.`, 'good');
          break;
      }
    },

    // Decrementar turnos de inteligencia revelada
    tickIntelligence(state) {
      (state.diplomacy || []).forEach(n => {
        if (n.revealed && n.revealedTurns > 0) {
          n.revealedTurns--;
          if (n.revealedTurns <= 0) n.revealed = false;
        }
      });
    }
  },

  // ============================================================
  // COMERCIO
  // ============================================================
  Trade: {
    openRoute(state, routeId, targetNationId) {
      const route = TRADE_ROUTES[routeId];
      const nation = (state.diplomacy || []).find(n => n.id === targetNationId);
      if (!route || !nation) return { ok: false, msg: 'Ruta o nación inválida.' };

      // Verificar relación mínima
      if (nation.relation < route.requires.relation) {
        return { ok: false, msg: `Relación insuficiente. Necesitas ${route.requires.relation}, tienes ${nation.relation}.` };
      }
      if (route.requires.alliance && !(nation.treaties || []).includes('alliance')) {
        return { ok: false, msg: 'Esta ruta requiere alianza formal.' };
      }
      if (nation.atWar) {
        return { ok: false, msg: 'No puedes comerciar con una nación en guerra.' };
      }

      // Coste de apertura
      const cost = route.cost;
      for (const [res, val] of Object.entries(cost)) {
        if (state.resources[res] < val) return { ok: false, msg: `Falta ${res}: necesitas ${val}` };
      }
      for (const [res, val] of Object.entries(cost)) state.resources[res] -= val;

      // Registrar ruta activa
      state.activeTradeRoutes = state.activeTradeRoutes || [];
      const alreadyOpen = state.activeTradeRoutes.find(r => r.routeId === routeId && r.nationId === targetNationId);
      if (alreadyOpen) return { ok: false, msg: 'Esta ruta ya está activa.' };

      state.activeTradeRoutes.push({
        routeId, nationId: targetNationId,
        nationName: nation.name,
        routeName: route.name,
        income: route.income,
        relationBonus: route.relationBonus,
        icon: route.icon
      });

      Systems.Log.add(state, `${route.icon} Ruta "${route.name}" abierta con ${nation.name}.`, 'good');
      return { ok: true };
    },

    closeRoute(state, routeId, nationId) {
      state.activeTradeRoutes = (state.activeTradeRoutes || []).filter(
        r => !(r.routeId === routeId && r.nationId === nationId)
      );
      Systems.Log.add(state, `Ruta comercial cerrada con ${nationId}.`, 'info');
    },

    // Si la nación entra en guerra, cerrar sus rutas
    decayRouteHealth(state) {
      (state.activeTradeRoutes||[]).forEach(rt => {
        if (rt.health === undefined) rt.health = 100;
        // Decay if under attack or guards below threshold
        const underAttack = (state.diplomacy||[]).some(n=>n.atWar && n.id===rt.nationId);
        if (underAttack) rt.health = Math.max(0, rt.health - 8);
        // Guards slow decay
        if (rt.guards > 200) rt.health = Math.min(100, rt.health + 3);
        // Auto-repair
        if (!underAttack && rt.health < 100) rt.health = Math.min(100, rt.health + 5);
      });
    },

    closeRoutesForNation(state, nationId) {
      const closed = (state.activeTradeRoutes || []).filter(r => r.nationId === nationId);
      if (closed.length) {
        state.activeTradeRoutes = state.activeTradeRoutes.filter(r => r.nationId !== nationId);
        Systems.Log.add(state, `⚠ Rutas comerciales cerradas con ${nationId} por conflicto.`, 'warn');
      }
    }
  },

  // ============================================================
  // POBLACIÓN
  // ============================================================
  Population: {
    update(state) {
      const foodRatio = state.resources.food / Math.max(1, state.population / 8);
      let growthRate = foodRatio > 1.5 ? 0.008 : foodRatio > 1.0 ? 0.003 : foodRatio < 0.5 ? -0.015 : -0.005;
      if (state.morale > 70) growthRate += 0.002;
      if (state.morale < 30) growthRate -= 0.005;
      if (state.civId === 'chinese') growthRate += 0.003;
      state.population = Math.max(500, Math.floor(state.population * (1 + growthRate)));
    }
  },

  // ============================================================
  // MOTOR DE EVENTOS
  // ============================================================
  Events: {
    generateForTurn(state) {
      // Evento climático pendiente (encadenado) tiene prioridad
      const pending = [];
      if (state.pendingClimateEvent) {
        pending.push({ ...state.pendingClimateEvent, id: 'climate_chain_' + Date.now(), category: 'CLIMA', priority: 'critical', weight: 20 });
        state.pendingClimateEvent = null;
      }

      // Eventos dinámicos encadenados (pendientes de turnos anteriores)
      if (typeof DynamicEvents !== 'undefined') {
        const chained = DynamicEvents.processPendingEvents(state);
        pending.push(...chained);
      }

      const eligible = EVENT_POOL.filter(ev => {
        if (state.resolvedEvents && state.resolvedEvents.includes(ev.id) && ev.id !== 'trade_caravan' && ev.id !== 'legendary_available') return false;
        try { return ev.condition ? ev.condition(state) : true; } catch(e) { return false; }
      });

      const critical = eligible.filter(e => e.priority === 'critical').slice(0, 2);
      const high     = eligible.filter(e => e.priority === 'high').slice(0, 1);
      const normal   = eligible.filter(e => e.priority === 'normal').sort(() => Math.random() - 0.5).slice(0, 1);

      // Inject one dynamic event if available
      let dynamicEv = null;
      if (typeof DynamicEvents !== 'undefined') {
        const freq = state._blitzMode ? 2 : 4;
        if (state.turn % freq === 0) {
          const d = DynamicEvents.selectForTurn(state);
          if (d) dynamicEv = DynamicEvents.toGameEvent(d);
        }
      }

      const combined = [...pending, ...critical, ...high, ...normal];
      if (dynamicEv) combined.push(dynamicEv);
      return combined.filter((e, i, a) => a.findIndex(x => x.id === e.id) === i).slice(0, 4);
    },

    applyDecision(state, event, optionIndex) {
      // Dynamic events get their own handler
      if (event._dynamic && typeof DynamicEvents !== 'undefined') {
        DynamicEvents.applyDecision(state, event, optionIndex);
        return;
      }
      const option = event.options[optionIndex];
      const effects = option.effects;
      if (!effects) return;

      // Mapa de efectos
      const apply = (key, fn) => { if (effects[key] !== undefined) fn(effects[key]); };
      apply('food',          v => state.resources.food  = Math.max(0, state.resources.food  + v));
      apply('gold',          v => state.resources.gold  = Math.max(0, state.resources.gold  + v));
      apply('wood',          v => state.resources.wood  = Math.max(0, state.resources.wood  + v));
      apply('stone',         v => state.resources.stone = Math.max(0, state.resources.stone + v));
      apply('iron',          v => state.resources.iron  = Math.max(0, state.resources.iron  + v));
      apply('gold_rate',     v => state.economy.trade_income += v);
      apply('stability',     v => state.stability = Math.max(0, Math.min(100, state.stability + v)));
      apply('morale',        v => state.morale    = Math.max(0, Math.min(100, state.morale + v)));
      apply('army',          v => state.army      = Math.max(0, state.army + v));
      apply('population',    v => state.population = Math.max(500, state.population + v));
      apply('population_loss',v=> state.population = Math.max(500, state.population + v));
      apply('corruption',    v => state.economy.corruption = Math.max(0, Math.min(100, state.economy.corruption + v)));
      apply('debt',          v => state.economy.debt += v);
      apply('inflation',     v => state.economy.inflation = Math.max(0, Math.min(100, state.economy.inflation + v)));
      apply('territory',     v => state.territories = Math.max(1, state.territories + v));
      apply('faction_pueblo',v => { const f = state.factions.find(f=>f.id==='pueblo');    if(f) f.satisfaction = Math.max(0,Math.min(100,f.satisfaction+v)); });
      apply('faction_ejercito',v=>{ const f = state.factions.find(f=>f.id==='ejercito');  if(f) f.satisfaction = Math.max(0,Math.min(100,f.satisfaction+v)); });
      apply('faction_economy',v=>{ ['comerciantes','senado','burocracia'].forEach(id=>{ const f=state.factions.find(f=>f.id===id); if(f) f.satisfaction=Math.max(0,Math.min(100,f.satisfaction+v)); }); });
      apply('faction_satisfaction',v=>{ state.factions.forEach(f=>{ f.satisfaction=Math.max(0,Math.min(100,f.satisfaction+v)); }); });
      apply('resources_food',v => state.resources.food = Math.max(0, state.resources.food + v));

      // Abrir menú legendario
      if (effects.open_legendary_menu) state.showLegendaryMenu = true;

      if (state.resolvedEvents && event.id && !event.id.startsWith('climate_chain')) {
        state.resolvedEvents.push(event.id);
      }
      Systems.Log.add(state, `Decisión: "${option.label}" en "${event.title}"`, 'good');
    }
  },

  // ============================================================
  // LOG
  // ============================================================
  Log: {
    add(state, message, type = 'info') {
      if (!state.log) state.log = [];
      state.log.unshift({ turn: state.turn, year: state.year, message, type });
      if (state.log.length > 60) state.log.pop();
    }
  }
};
