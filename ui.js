// ============================================================
// IMPERIUM — UI.JS
// Renderizado de todos los paneles
// ============================================================

const UI = {

  // ============================================================
  // TOP BAR
  // ============================================================
  updateTopBar(state) {
    const rates = state.rates || {};

    const setResource = (id, val, rate) => {
      const el = document.getElementById(`val-${id}`);
      const dt = document.getElementById(`dlt-${id}`);
      if (el) el.textContent = val.toLocaleString();
      if (dt) {
        dt.textContent = (rate >= 0 ? '+' : '') + rate;
        dt.className = 'res-delta' + (rate < 0 ? ' neg' : '');
      }
    };

    setResource('food', Math.floor(state.resources.food), rates.food || 0);
    setResource('gold', Math.floor(state.resources.gold), rates.gold || 0);
    setResource('wood', Math.floor(state.resources.wood), rates.wood || 0);
    setResource('stone', Math.floor(state.resources.stone), rates.stone || 0);
    setResource('iron', Math.floor(state.resources.iron), rates.iron || 0);

    const setVal = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };

    setVal('val-pop', state.population.toLocaleString());
    setVal('val-stab', state.stability);
    setVal('val-moral', state.morale);
    setVal('val-army', state.army.toLocaleString());
    setVal('val-year', state.year);
    setVal('val-turn', state.turn);

    // Season — new data model
    const currentKey = state.climate.current;
    const climObj = SEASONS[currentKey] || EXTREME_CLIMATE_EVENTS[currentKey] || SEASONS.spring;
    setVal('turn-season', `${climObj.icon} ${climObj.name}`);

    // Color del pill de estabilidad según valor
    const stabPill = document.getElementById('pill-stab');
    if (stabPill) {
      stabPill.style.borderColor = state.stability < 30 ? '#c44' : state.stability < 50 ? '#c8a' : '#4a6a9c';
      stabPill.style.color = state.stability < 30 ? '#e88' : state.stability < 50 ? '#dca' : '#6a8cbc';
    }

    // Color del pill de moral
    const moralPill = document.getElementById('pill-moral');
    if (moralPill) {
      moralPill.style.borderColor = state.morale < 30 ? '#c44' : state.morale > 70 ? '#4a7c59' : '#a44';
      moralPill.style.color = state.morale < 30 ? '#e55' : state.morale > 70 ? '#5c9c6e' : '#e88';
    }
  },

  // ============================================================
  // MAPA — usa Canvas del MapRenderer
  // ============================================================
  renderMap(state) {
    // Si el canvas ya existe, solo refrescamos los overlays de territorio
    if (MapRenderer.canvas && MapRenderer.map) {
      // Sincronizar ownership desde el estado del juego al mapa
      if (state.mapData) {
        state.mapData.cells.forEach(cell => {
          if (state.playerCells && state.playerCells.includes(cell.id)) {
            cell.owner = 'player';
          }
        });
        if (state.diplomacy) {
          state.diplomacy.forEach((nation, i) => {
            if (nation.cells) {
              nation.cells.forEach(cid => {
                const c = state.mapData.cells[cid];
                if (c && c.owner !== 'player') c.owner = `ai_${i+1}`;
              });
            }
          });
        }
      }
      MapRenderer.refresh(state);
    }
    // Si no hay canvas aún, el Game.selectCiv lo inicializará via setTimeout
  },

  // ============================================================
  // FACCIONES
  // ============================================================
  renderFactions(state) {
    const container = document.getElementById('factions-list');
    if (!container) return;

    container.innerHTML = '';
    state.factions.forEach(faction => {
      const mood = faction.satisfaction > 70 ? '😊 Leal' :
                   faction.satisfaction > 45 ? '😐 Neutral' :
                   faction.satisfaction > 25 ? '😤 Inquieta' : '😡 FURIOSA';
      const moodClass = faction.satisfaction < 25 ? 'danger' : faction.satisfaction < 45 ? 'warn' : '';

      const barColor = faction.satisfaction > 60 ? '#4a7c59' :
                       faction.satisfaction > 35 ? '#c8a84b' : '#c44';

      container.innerHTML += `
        <div class="faction-card">
          <div class="faction-header">
            <span class="faction-name">${faction.icon} ${faction.name}</span>
            <span class="faction-power">Influencia: ${faction.influence}%</span>
          </div>
          <div class="faction-bar-wrap">
            <div class="faction-bar-label">
              <span>Satisfacción</span><span>${faction.satisfaction}/100</span>
            </div>
            <div class="faction-bar">
              <div class="faction-bar-fill" style="width:${faction.satisfaction}%; background:${barColor}"></div>
            </div>
          </div>
          <div class="faction-mood">${mood}</div>
          ${faction.angryTurns > 1 ? `<div class="alert-box danger">⚠ Llevan ${faction.angryTurns} turnos furiosos</div>` : ''}
          <div class="faction-demand">📋 Exigen: ${faction.currentDemand}</div>
        </div>
      `;
    });
  },

  // ============================================================
  // PANEL MILITAR
  // ============================================================
  renderMilitary(state) {
    const container = document.getElementById('military-panel');
    if (!container) return;

    const effective = Systems.Military.calculateEffectiveStrength(state);
    const moraleMod = Math.floor(state.morale);
    const equipMod = state.resources.iron > 200 ? 'Alto' : state.resources.iron < 50 ? 'Bajo' : 'Medio';

    container.innerHTML = `
      <div class="mil-section">
        <div class="mil-label">Soldados Totales</div>
        <div class="mil-val">${state.army.toLocaleString()}</div>
      </div>
      <div class="mil-section">
        <div class="mil-label">Fuerza Efectiva de Combate</div>
        <div class="mil-val" style="color:var(--gold2)">${effective.toLocaleString()}</div>
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">⚙ Modificadores</div>
        <div class="mil-unit-row"><span>Moral de tropa</span><span>${moraleMod}%</span></div>
        <div class="mil-unit-row"><span>Equipamiento</span><span>${equipMod}</span></div>
        <div class="mil-unit-row"><span>Corrupción</span><span>-${Math.floor(state.economy.corruption/2)}%</span></div>
        <div class="mil-unit-row"><span>Coste/turno</span><span>-${Math.floor(state.army * 0.5)} oro</span></div>
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">📜 Política Militar</div>
        ${POLICIES.militar.map(p => `
          <button class="policy-btn ${state.activePolicies.includes(p.id) ? 'active' : ''}"
                  onclick="Game.togglePolicy('${p.id}', 'militar')">
            <span>${p.name}</span>
            <span class="policy-cost">${p.cost_gold > 0 ? `-${p.cost_gold}⚙` : 'gratis'}</span>
          </button>
        `).join('')}
      </div>

    `;
  },

  // ============================================================
  // PANEL POLÍTICO
  // ============================================================
  renderPolitics(state) {
    const container = document.getElementById('politics-panel');
    if (!container) return;

    const gov = GOVERNMENT_TYPES[state.government];
    const politicalPower = Systems.Factions.calculatePoliticalPower(state);

    container.innerHTML = `
      <div class="rpanel-section">
        <div class="rpanel-title">🏛 Sistema de Gobierno</div>
        <div style="margin-bottom:8px"><span class="gov-badge">${gov.name}</span></div>
        <div class="faction-mood" style="margin:6px 0;font-size:12px">${gov.description}</div>
        <div class="mil-unit-row"><span>Estabilidad base</span><span>${gov.stabilityBonus > 0 ? '+' : ''}${gov.stabilityBonus}</span></div>
        <div class="mil-unit-row"><span>Corrupción base</span><span>+${gov.corruptionPenalty}/turno</span></div>
        <div class="mil-unit-row"><span>Influencia facciones</span><span>×${gov.factionInfluenceMultiplier}</span></div>
      </div>

      <div class="rpanel-section">
        <div class="rpanel-title">📊 Poder Político</div>
        <div class="bar-wrap">
          <div class="bar-label"><span>Apoyo ponderado</span><span>${politicalPower}/100</span></div>
          <div class="bar-track">
            <div class="bar-fill ${politicalPower > 60 ? 'green' : politicalPower > 40 ? 'gold' : 'red'}"
                 style="width:${politicalPower}%"></div>
          </div>
        </div>
        ${politicalPower < 35 ? `<div class="alert-box danger">⚠ Gobierno en riesgo. Apoyo popular crítico.</div>` : ''}
      </div>

      <div class="rpanel-section">
        <div class="rpanel-title">📋 Política Económica</div>
        ${POLICIES.economia.map(p => `
          <button class="policy-btn ${state.activePolicies.includes(p.id) ? 'active' : ''}"
                  onclick="Game.togglePolicy('${p.id}', 'economia')">
            <span>${p.name}</span>
          </button>
        `).join('')}
      </div>

      <div class="rpanel-section">
        <div class="rpanel-title">👥 Política Social</div>
        ${POLICIES.social.map(p => `
          <button class="policy-btn ${state.activePolicies.includes(p.id) ? 'active' : ''}"
                  onclick="Game.togglePolicy('${p.id}', 'social')">
            <span>${p.name}</span>
            ${p.cost_gold > 0 ? `<span class="policy-cost">${p.cost_gold}🪙</span>` : ''}
          </button>
        `).join('')}
      </div>

      <div class="rpanel-section">
        <div class="rpanel-title">⚖ Estabilidad e Indicadores</div>
        <div class="bar-wrap">
          <div class="bar-label"><span>Estabilidad</span><span>${state.stability}/100</span></div>
          <div class="bar-track"><div class="bar-fill ${state.stability > 60 ? 'green' : state.stability > 35 ? 'gold' : 'red'}" style="width:${state.stability}%"></div></div>
        </div>
        <div class="bar-wrap">
          <div class="bar-label"><span>Moral Popular</span><span>${state.morale}/100</span></div>
          <div class="bar-track"><div class="bar-fill ${state.morale > 60 ? 'green' : state.morale > 35 ? 'gold' : 'red'}" style="width:${state.morale}%"></div></div>
        </div>
        <div class="bar-wrap">
          <div class="bar-label"><span>Corrupción</span><span>${Math.floor(state.economy.corruption)}/100</span></div>
          <div class="bar-track"><div class="bar-fill red" style="width:${state.economy.corruption}%"></div></div>
        </div>
      </div>
    `;
  },

  // ============================================================
  // PANEL DIPLOMACIA
  // ============================================================
  renderDiplomacy(state) {
    const container = document.getElementById('diplomacy-panel');
    if (!container || !state.diplomacy) return;

    container.innerHTML = '';
    state.diplomacy.forEach(nation => {
      const relColor = nation.relation > 40 ? 'var(--green2)' :
                       nation.relation > 0 ? 'var(--text2)' :
                       nation.relation > -40 ? '#c8a' : 'var(--red2)';
      const relLabel = nation.relation > 50 ? 'Aliado' :
                       nation.relation > 20 ? 'Amistoso' :
                       nation.relation > -10 ? 'Neutral' :
                       nation.relation > -40 ? 'Hostil' : 'ENEMIGO';

      const warBadge = nation.atWar ? '<span style="color:var(--red2); font-size:10px;">⚔ EN GUERRA</span>' : '';
      const treaties = nation.treaties.length ? `<div style="font-family:var(--font-mono);font-size:10px;color:var(--green2);margin-top:4px">📜 ${nation.treaties.join(', ')}</div>` : '';

      container.innerHTML += `
        <div class="diplo-nation">
          <div class="diplo-name">${nation.icon} ${nation.name} ${warBadge}</div>
          <div class="diplo-rel" style="color:${relColor}">${relLabel} (${nation.relation > 0 ? '+' : ''}${nation.relation})</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">Personalidad: ${nation.personality} | Ejército: ${nation.army}</div>
          ${treaties}
          <div class="diplo-actions">
            <button class="diplo-btn" onclick="AI.playerDiplomaticAction(Game.state, '${nation.id}', 'gift');UI.fullRender(Game.state)">🎁 Regalo (-100🪙)</button>
            <button class="diplo-btn" onclick="AI.playerDiplomaticAction(Game.state, '${nation.id}', 'propose_alliance');UI.fullRender(Game.state)">🤝 Alianza</button>
            ${nation.atWar ?
              `<button class="diplo-btn" onclick="AI.playerDiplomaticAction(Game.state, '${nation.id}', 'sue_peace');UI.fullRender(Game.state)">🕊 Pedir Paz</button>` :
              `<button class="diplo-btn" onclick="AI.playerDiplomaticAction(Game.state, '${nation.id}', 'declare_war');UI.fullRender(Game.state)">⚔ Declarar Guerra</button>`
            }
            <button class="diplo-btn" onclick="AI.playerDiplomaticAction(Game.state, '${nation.id}', 'demand_tribute');UI.fullRender(Game.state)">💰 Exigir Tributo</button>
          </div>
          ${UI.renderBattleAnalysis(Game.state, nation)}
        </div>
      `;
    });
  },

  // ============================================================
  // PANEL ECONOMÍA
  // ============================================================
  renderEconomy(state) {
    const container = document.getElementById('economy-panel');
    if (!container) return;

    const rates = state.rates || {};

    container.innerHTML = `
      <div class="rpanel-section">
        <div class="rpanel-title">📈 Flujo Económico</div>
        ${[
          ['🌾 Alimentos', rates.food || 0],
          ['◈ Oro', rates.gold || 0],
          ['🪵 Madera', rates.wood || 0],
          ['⬡ Piedra', rates.stone || 0],
          ['⚙ Hierro', rates.iron || 0]
        ].map(([label, val]) => `
          <div class="stat-row">
            <span class="stat-row-label">${label}</span>
            <span class="stat-row-val" style="color:${val >= 0 ? 'var(--green2)' : 'var(--red2)'}">${val >= 0 ? '+' : ''}${val}/turno</span>
          </div>
        `).join('')}
      </div>

      <div class="rpanel-section">
        <div class="rpanel-title">⚠ Indicadores de Riesgo</div>
        <div class="bar-wrap">
          <div class="bar-label"><span>Inflación</span><span>${Math.floor(state.economy.inflation)}/100</span></div>
          <div class="bar-track"><div class="bar-fill red" style="width:${state.economy.inflation}%"></div></div>
        </div>
        <div class="stat-row"><span class="stat-row-label">Deuda pública</span><span class="stat-row-val" style="color:${state.economy.debt > 300 ? 'var(--red2)' : 'var(--text)'}">${state.economy.debt} 🪙</span></div>
        <div class="stat-row"><span class="stat-row-label">Comercio exterior</span><span class="stat-row-val">+${state.economy.trade_income}/turno</span></div>
        <div class="stat-row"><span class="stat-row-label">Coste militar</span><span class="stat-row-val" style="color:var(--red2)">-${Math.floor(state.army * 0.5)}/turno</span></div>
        ${state.economy.inflation > 60 ? '<div class="alert-box danger">⚠ Hiperinflación: el oro pierde valor cada turno</div>' : ''}
        ${state.economy.debt > 400 ? '<div class="alert-box warn">⚠ Deuda elevada. El interés drena 20 oro/turno</div>' : ''}
      </div>

      <div class="rpanel-section">
        <div class="rpanel-title">🏦 Acciones Financieras</div>
        <button class="policy-btn" onclick="Game.takeLoan()">Solicitar Préstamo (+200🪙, +200 deuda)</button>
        <button class="policy-btn" onclick="Game.payDebt()">Pagar Deuda (−100🪙, −100 deuda)</button>
        <button class="policy-btn" onclick="Game.raiseTexes()">Subir Impuestos (+30🪙/t, −10 moral)</button>
      </div>
    `;
  },

  // ============================================================
  // PANEL CLIMA (Estaciones + Eventos Extremos)
  // ============================================================
  renderClimate(state) {
    const container = document.getElementById('climate-panel');
    if (!container) return;

    const climSummary = Systems.Climate.getSummary(state);
    const season  = climSummary.season;
    const extreme = climSummary.extreme;
    const turnInYear = ((state.turn - 1) % 16) + 1;
    const turnInSeason = ((state.turn - 1) % 4) + 1;
    const nextSeason = ['spring','summer','autumn','winter'][(Math.floor((state.turn % 16) / 4)) % 4];
    const nextSeasonData = SEASONS[nextSeason];

    container.innerHTML = `
      <!-- ESTACIÓN ACTUAL -->
      <div class="climate-indicator" style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:12px">
        <span class="climate-icon">${season.icon}</span>
        <div class="climate-name">${season.name}</div>
        <div class="climate-desc">${season.description}</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:6px">
          Turno ${turnInSeason}/4 de la estación · Año ${state.year}, turno ${turnInYear}/16
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:3px">
          Próxima: ${nextSeasonData.icon} ${nextSeasonData.name} en ${4 - turnInSeason + 1} turno(s)
        </div>
      </div>

      <!-- EVENTO EXTREMO ACTIVO -->
      ${extreme ? `
      <div class="alert-box ${extreme.foodMod < -30 || extreme.moraleMod < -20 ? 'danger' : 'warn'}" style="margin-bottom:10px">
        <b>${extreme.icon} ${extreme.name}</b><br>
        Dura ${state.climate.extremeDuration} turno(s) más
        ${extreme.triggersChain ? `<br><span style="font-size:10px">⚠ Puede encadenar: ${EXTREME_CLIMATE_EVENTS[extreme.triggersChain]?.name||''}</span>` : ''}
      </div>` : `
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--green2);margin-bottom:10px;padding:6px 8px;background:rgba(74,124,89,0.08);border:1px solid var(--green)">
        ✓ Sin eventos climáticos extremos activos
      </div>`}

      <!-- EFECTOS TOTALES ACTUALES -->
      <div class="rpanel-section">
        <div class="rpanel-title">📊 Efectos Combinados (Estación + Evento)</div>
        ${[
          ['🌾 Alimentos', climSummary.totalFoodMod],
          ['❤ Moral',      climSummary.totalMoralMod],
          ['⚔ Ejército',   climSummary.totalArmyMod]
        ].map(([label, val]) => `
          <div class="stat-row">
            <span class="stat-row-label">${label}</span>
            <span class="stat-row-val" style="color:${val >= 0 ? 'var(--green2)' : 'var(--red2)'}">
              ${val >= 0 ? '+' : ''}${val}%
            </span>
          </div>
        `).join('')}
      </div>

      <!-- PREVISIÓN DE RIESGOS -->
      <div class="rpanel-section">
        <div class="rpanel-title">⚠ Riesgos por Estación</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);line-height:1.8">
          ${season.name === 'Verano' ? '🔥 Alta probabilidad de sequía (28%)' : ''}
          ${season.name === 'Invierno' ? '❄ Alta probabilidad de frío extremo (35%)' : ''}
          ${season.name === 'Otoño' ? '🐀 Posible plaga en graneros (18%)' : ''}
          ${season.name === 'Primavera' ? '🌸 Posible florecimiento excepcional (12%)' : ''}
          ${extreme && extreme.triggersChain ? `⚠ "${extreme.name}" puede desencadenar "${EXTREME_CLIMATE_EVENTS[extreme.triggersChain]?.name}"` : ''}
          ${!extreme && season.extremeChance < 0.2 ? '✓ Estación estable' : ''}
        </div>
      </div>

      <!-- ACCIONES -->
      <div class="rpanel-section">
        <div class="rpanel-title">🌿 Mitigación Climática</div>
        <button class="policy-btn" onclick="Game.buildIrrigation()">Irrigación (150🪵 100⬡ 200🪙 → +50% comida base)</button>
        <button class="policy-btn" onclick="Game.buildGranary()">Graneros (100🪵 → +200 alimentos reserva)</button>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:6px;line-height:1.6">
          El clima no es tu mayor amenaza, pero sí el catalizador<br>de las otras. Una sequía en tiempo de crisis política es letal.
        </div>
      </div>
    `;
  },

  // ============================================================
  // PANEL EJÉRCITO (unidades detalladas + análisis de batalla)
  // ============================================================
  renderMilitary(state) {
    const container = document.getElementById('military-panel');
    if (!container) return;

    const effective = Systems.Military.calculateEffectiveStrength(state);
    const total     = Systems.Military.totalSoldiers(state);

    container.innerHTML = `
      <div class="rpanel-section">
        <div class="rpanel-title">⚔ Composición del Ejército</div>
        ${(state.armyUnits || []).map(unit => {
          const def = MILITARY_UNITS[unit.typeId];
          if (!def) return '';
          return `<div class="mil-unit-row">
            <span>${def.icon} ${def.name}</span>
            <span style="color:var(--gold2)">${unit.count.toLocaleString()}</span>
          </div>`;
        }).join('') || '<div style="color:var(--text3);font-family:var(--font-mono);font-size:11px">Sin unidades</div>'}
        ${state.legendaryUnit ? `
          <div class="mil-unit-row" style="color:var(--gold3);border-color:var(--gold)">
            <span>⭐ ${state.legendaryUnit.icon} ${state.legendaryUnit.name}</span>
            <span>LEGENDARIA</span>
          </div>` : ''}
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <div class="mil-unit-row"><span>Total soldados</span><span>${total.toLocaleString()}</span></div>
          <div class="mil-unit-row"><span>Fuerza efectiva</span><span style="color:var(--gold2)">${effective.toLocaleString()}</span></div>
          <div class="mil-unit-row"><span>Coste/turno</span><span style="color:var(--red2)">-${Systems.Economy.calculateArmyUpkeep(state)} 🪙</span></div>
        </div>
      </div>

      <div class="rpanel-section">
        <div class="rpanel-title">🪖 Reclutar Unidades</div>
        ${Object.entries(MILITARY_UNITS).map(([id, def]) => {
          const restricted = def.civRestrict && state.civId && !def.civRestrict.includes(state.civId);
          const needsPolicy = def.requires && !def.requires.some(r => state.activePolicies.includes(r));
          if (restricted) return '';
          return `<button class="policy-btn ${needsPolicy ? 'disabled' : ''}" 
                    onclick="Game.recruitUnit('${id}', 50)" 
                    title="${def.description}" 
                    ${needsPolicy ? 'disabled' : ''}>
            <span>${def.icon} ${def.name} ×50</span>
            <span class="policy-cost">${def.cost.gold}🪙 ${def.cost.iron ? def.cost.iron+'⚙' : ''} ${def.cost.wood ? def.cost.wood+'🪵' : ''}</span>
          </button>`;
        }).join('')}
      </div>

      ${!state.legendaryUnit ? `
      <div class="rpanel-section">
        <div class="rpanel-title">⭐ Unidades Legendarias</div>
        ${LEGENDARY_UNITS.map(leg => `
          <div style="margin-bottom:8px;padding:8px;background:var(--bg4);border:1px solid var(--border2)">
            <div style="font-family:var(--font-title);color:var(--gold3);font-size:12px">${leg.icon} ${leg.name}</div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin:3px 0">${leg.unlockCondition}</div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text2)">${leg.special}</div>
            <button class="diplo-btn" style="margin-top:6px" onclick="Game.recruitLegendary('${leg.id}')">
              Reclutar: ${leg.cost.gold}🪙 ${leg.cost.iron ? leg.cost.iron+'⚙ ':''} ${leg.cost.food ? leg.cost.food+'🌾 ':''}${leg.cost.wood ? leg.cost.wood+'🪵':''}
            </button>
          </div>
        `).join('')}
      </div>` : `
      <div class="rpanel-section">
        <div class="rpanel-title">⭐ Unidad Legendaria Activa</div>
        <div style="padding:10px;background:rgba(200,168,75,0.06);border:1px solid var(--gold)">
          <div style="font-family:var(--font-title);color:var(--gold3);font-size:16px">${state.legendaryUnit.icon} ${state.legendaryUnit.name}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:4px">
            ${LEGENDARY_UNITS.find(l=>l.id===state.legendaryUnit.id)?.special || ''}
          </div>
        </div>
      </div>`}

      <div class="rpanel-section">
        <div class="rpanel-title">📜 Política Militar</div>
        ${POLICIES.militar.map(p => `
          <button class="policy-btn ${state.activePolicies.includes(p.id) ? 'active' : ''}"
                  onclick="Game.togglePolicy('${p.id}', 'militar')">
            <span>${p.name}</span>
            <span class="policy-cost">${p.cost_gold > 0 ? p.cost_gold+'🪙' : 'gratis'}</span>
          </button>
        `).join('')}
      </div>
    `;
  },

  // ============================================================
  // PANEL ESPÍAS
  // ============================================================
  renderSpies(state) {
    const container = document.getElementById('spies-panel');
    if (!container) return;

    const spies = state.spies || { count: 1, active: [] };

    container.innerHTML = `
      <div class="rpanel-section">
        <div class="rpanel-title">🕵 Red de Espionaje</div>
        <div class="mil-unit-row"><span>Espías disponibles</span><span style="color:var(--gold2)">${spies.count - spies.active.length} / ${spies.count}</span></div>
        ${spies.active.length ? `
          <div style="margin-top:8px">
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-bottom:4px">Misiones activas:</div>
            ${spies.active.map(m => {
              const mDef = SPY_MISSIONS[m.missionId];
              const nation = (state.diplomacy||[]).find(n=>n.id===m.targetId);
              return `<div class="mil-unit-row">
                <span>${mDef?.icon||'🕵'} ${mDef?.name} → ${nation?.name}</span>
                <span>${m.turnsLeft}t</span>
              </div>`;
            }).join('')}
          </div>` : ''}
      </div>

      <div class="rpanel-section">
        <div class="rpanel-title">🎯 Enviar Misión</div>
        ${(state.diplomacy||[]).map(nation => `
          <div style="margin-bottom:10px">
            <div style="font-family:var(--font-title);font-size:12px;color:var(--gold);margin-bottom:5px">
              ${nation.icon} ${nation.name}
              ${nation.revealed ? `<span style="color:var(--green2);font-size:10px"> · Ejército conocido: ${nation.army}</span>` : '<span style="color:var(--text3);font-size:10px"> · Ejército: ???</span>'}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${Object.entries(SPY_MISSIONS).map(([id, m]) => `
                <button class="diplo-btn" onclick="Game.sendSpy('${id}','${nation.id}')" title="${m.description} (${Math.round(m.successChance*100)}% éxito)">
                  ${m.icon} ${m.name.split(' ').slice(-1)[0]} (${m.cost.gold}🪙)
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
        <button class="policy-btn" onclick="Game.trainSpy()" style="margin-top:8px">
          Entrenar espía adicional (200🪙)
        </button>
      </div>
    `;
  },

  // ============================================================
  // PANEL COMERCIO
  // ============================================================
  renderTrade(state) {
    const container = document.getElementById('trade-panel');
    if (!container) return;

    const routes = state.activeTradeRoutes || [];

    container.innerHTML = `
      <div class="rpanel-section">
        <div class="rpanel-title">🏪 Rutas Activas</div>
        ${routes.length ? routes.map(rt => `
          <div style="background:var(--bg4);border:1px solid var(--border);padding:8px;margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-family:var(--font-title);font-size:12px;color:var(--gold)">${rt.icon} ${rt.routeName}</span>
              <button class="diplo-btn" onclick="Game.closeTradeRoute('${rt.routeId}','${rt.nationId}')">✕</button>
            </div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:3px">
              Con: ${rt.nationName} · 
              ${Object.entries(rt.income||{}).map(([k,v]) => `${v>0?'+':''}${v} ${k}`).join(', ')}
              · Relación +${rt.relationBonus}/turno
            </div>
          </div>
        `).join('') : '<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3)">Sin rutas activas. Abre nuevas abajo.</div>'}
      </div>

      <div class="rpanel-section">
        <div class="rpanel-title">📋 Abrir Nueva Ruta</div>
        ${(state.diplomacy||[]).filter(n=>!n.atWar).map(nation => `
          <div style="margin-bottom:10px">
            <div style="font-family:var(--font-title);font-size:12px;color:${nation.relation>0?'var(--gold)':'var(--text3)'};margin-bottom:4px">
              ${nation.icon} ${nation.name} (Rel: ${nation.relation > 0 ? '+' : ''}${nation.relation})
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${Object.entries(TRADE_ROUTES).map(([id, rt]) => {
                const canOpen = nation.relation >= rt.requires.relation && !(!rt.requires.alliance || (nation.treaties||[]).includes('alliance'));
                const locked  = nation.relation < rt.requires.relation;
                return `<button class="diplo-btn ${locked ? '' : ''}" 
                                onclick="Game.openTradeRoute('${id}','${nation.id}')" 
                                title="${rt.description}" 
                                ${locked ? 'style="opacity:0.4;cursor:not-allowed"' : ''}>
                  ${rt.icon} ${rt.name} (${rt.cost.gold}🪙, min rel.${rt.requires.relation})
                </button>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // ANÁLISIS DE BATALLA (en panel diplomacia)
  renderBattleAnalysis(state, targetNation) {
    const intel = state.intelligence && state.intelligence[targetNation.id];
    const analysis = Systems.Military.analyzeBattle(state, targetNation, !!intel);
    return `
      <div style="background:var(--bg3);border:1px solid var(--border2);padding:10px;margin-top:8px">
        <div style="font-family:var(--font-title);font-size:12px;color:var(--gold);margin-bottom:6px">📊 Análisis de Batalla</div>
        <div class="mil-unit-row"><span>Tu fuerza efectiva</span><span style="color:var(--green2)">${analysis.attackerStrength.toLocaleString()}</span></div>
        <div class="mil-unit-row"><span>Fuerza estimada rival</span><span style="color:${intel ? 'var(--gold2)' : 'var(--text3)'}">${analysis.defenderStrength.toLocaleString()} ${!intel ? '(estimado ±40%)' : '(dato espía)'}</span></div>
        <div class="mil-unit-row"><span>Ratio</span><span>${analysis.ratio}:1</span></div>
        <div class="mil-unit-row"><span>Efecto estacional</span><span style="color:${analysis.seasonEffect<0?'var(--red2)':'var(--green2)'}">${analysis.seasonEffect>0?'+':''}${analysis.seasonEffect}%</span></div>
        <div class="mil-unit-row"><span>Probabilidad de victoria</span><span style="color:${analysis.winChance>65?'var(--green2)':analysis.winChance>45?'var(--gold2)':'var(--red2)'}"><b>${analysis.winChance}%</b></span></div>
        <div style="margin-top:6px;font-family:var(--font-title);font-size:13px;color:var(--gold)">${analysis.recommendation}</div>
        ${!intel ? '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:4px">💡 Usa espías para reducir la incertidumbre</div>' : ''}
      </div>
    `;
  },

  // ============================================================
  // COLA DE EVENTOS
  // ============================================================
  renderEventQueue(state) {
    const container = document.getElementById('event-queue');
    const countEl = document.getElementById('event-count');
    if (!container) return;

    const events = state.currentEvents || [];
    if (countEl) countEl.textContent = events.length;

    if (events.length === 0) {
      container.innerHTML = `<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);padding:4px">— Sin eventos pendientes —</div>`;
      return;
    }

    container.innerHTML = events.map((ev, i) => `
      <div class="event-item ${ev.priority === 'critical' ? 'critical' : ''} ${state.activeEventIndex === i ? 'active' : ''}"
           onclick="Game.selectEvent(${i})">
        ${ev.icon} ${ev.title} <span style="float:right;font-size:9px;color:var(--text3)">${ev.category}</span>
      </div>
    `).join('');
  },

  // ============================================================
  // EVENTO ACTIVO (decisión)
  // ============================================================
  renderActiveEvent(state) {
    const container = document.getElementById('active-event');
    if (!container) return;

    const events = state.currentEvents || [];
    const idx = state.activeEventIndex;

    if (events.length === 0 || idx === undefined || idx === null) {
      container.innerHTML = `
        <div class="no-events">
          <div style="font-size:32px">⚖</div>
          <div>Selecciona un evento de la agenda</div>
          <div style="font-size:10px;margin-top:8px">Cada decisión tiene consecuencias sistémicas</div>
        </div>
      `;
      return;
    }

    const ev = events[idx];
    if (!ev) return;

    container.innerHTML = `
      <div class="decision-card">
        <div class="decision-header">
          <span class="decision-icon">${ev.icon}</span>
          <div>
            <div class="decision-title">${ev.title}</div>
            <div class="decision-category">${ev.category} · ${ev.priority === 'critical' ? '⚠ URGENTE' : 'Normal'}</div>
          </div>
        </div>
        <p class="decision-desc">${ev.description}</p>
        <div class="decision-context">${ev.context}</div>
        <div class="decision-options">
          ${ev.options.map((opt, oi) => `
            <button class="option-btn" onclick="Game.resolveEvent(${idx}, ${oi})">
              <div class="option-label">${opt.label}</div>
              <div class="option-effects">
                ${opt.effectText.map(et => {
                  const isPos = et.startsWith('+');
                  const isNeg = et.startsWith('-');
                  const cls = isPos ? 'effect-pos' : isNeg ? 'effect-neg' : 'effect-neu';
                  return `<span class="${cls}">${et}</span>`;
                }).join('  ·  ')}
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ============================================================
  // LOG
  // ============================================================
  renderLog(state) {
    const container = document.getElementById('game-log');
    if (!container || !state.log) return;

    container.innerHTML = state.log.slice(0, 20).map(entry => `
      <div class="log-entry ${entry.type === 'crisis' ? 'log-crisis' : entry.type === 'warn' ? 'log-warn' : entry.type === 'good' ? 'log-good' : ''}">
        <span class="log-turn">A${entry.year}T${entry.turn}</span>
        <span class="log-msg">${entry.message}</span>
      </div>
    `).join('');
  },

  // ============================================================
  // RENDER COMPLETO
  // ============================================================
  fullRender(state) {
    this.updateTopBar(state);
    this.renderMap(state);
    this.renderFactions(state);
    this.renderMilitary(state);
    this.renderPolitics(state);
    this.renderDiplomacy(state);
    this.renderEconomy(state);
    this.renderClimate(state);
    this.renderSpies(state);
    this.renderTrade(state);
    this.renderEventQueue(state);
    this.renderActiveEvent(state);
    this.renderLog(state);
  }
};

// ============================================================
// HELPERS DE NAVEGACIÓN
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function switchPanelTab(tab) {
  document.querySelectorAll('.ptab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#left-panel .ptab').forEach(el => el.classList.remove('active'));
  const content = document.getElementById(`ptab-${tab}`);
  if (content) content.classList.add('active');
  event.target.classList.add('active');
}

function switchRightTab(tab) {
  document.querySelectorAll('.rtab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#right-panel .ptab').forEach(el => el.classList.remove('active'));
  const content = document.getElementById(`rtab-${tab}`);
  if (content) content.classList.add('active');
  event.target.classList.add('active');
}
