// ============================================================
// IMPERIUM — UI.JS v4
// Renderizado completo con: hover info en columna derecha,
// agenda compacta, estética medieval, todos los paneles
// ============================================================

const UI = {

  // ══════════════════════════════════════════════
  // TOP BAR
  // ══════════════════════════════════════════════
  updateTopBar(state) {
    // Visual feedback
    if (typeof VisualFeedback !== 'undefined') VisualFeedback.apply(state);
    // AP display
    const apEl = document.getElementById('ap-display');
    if (apEl && state.actionPoints !== undefined) {
      const filled = state.actionPoints;
      const empty  = Math.max(0, (state.actionPointsMax||3) - filled);
      apEl.innerHTML = '<span class="ap-pip filled">⚡</span>'.repeat(filled)
                     + '<span class="ap-pip empty">○</span>'.repeat(empty);
    }
    // XP bar
    const xpEl = document.getElementById('xp-bar-slot');
    if (xpEl && typeof Progression !== 'undefined') xpEl.innerHTML = Progression.renderXPBar(state);
    // Blitz countdown
    const blitzEl = document.getElementById('blitz-countdown');
    if (blitzEl) {
      if (state._blitzMode) {
        const left = (state._blitzMaxTurns||20) - state.turn;
        blitzEl.innerHTML = `<span class="blitz-badge tb-tip" data-tip="⚡ Modo Blitz — Quedan ${left} turnos">⚡ T${state.turn}/${state._blitzMaxTurns||20}</span>`;
        blitzEl.style.display = '';
      } else {
        blitzEl.style.display = 'none';
      }
    }
    const rates = state.rates || {};
    const setRes = (id, val, rate) => {
      const ve = document.getElementById('val-' + id);
      const de = document.getElementById('dlt-' + id);
      if (ve) ve.textContent = Math.floor(val).toLocaleString();
      if (de) {
        de.textContent = (rate >= 0 ? '+' : '') + rate;
        de.className = 'res-delta' + (rate < 0 ? ' neg' : '');
      }
    };
    setRes('food',  state.resources.food,  rates.food  || 0);
    setRes('gold',  state.resources.gold,  rates.gold  || 0);
    setRes('wood',  state.resources.wood,  rates.wood  || 0);
    setRes('stone', state.resources.stone, rates.stone || 0);
    setRes('iron',  state.resources.iron,  rates.iron  || 0);

    const sv = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
    sv('val-pop',   state.population.toLocaleString());
    sv('val-stab',  Math.floor(state.stability));
    sv('val-moral', Math.floor(state.morale));
    sv('val-army',  (state.army || 0).toLocaleString());
    sv('val-year',  state.year);
    sv('val-turn',  state.turn);

    // Estación
    const currentKey = state.climate.current;
    const climObj = SEASONS[currentKey] || EXTREME_CLIMATE_EVENTS[currentKey] || SEASONS.spring;
    sv('turn-season', climObj.icon + ' ' + climObj.name);

    // Colores dinámicos de pills
    const stabPill = document.getElementById('pill-stab');
    if (stabPill) {
      const c = state.stability < 30 ? '#c83030' : state.stability < 50 ? '#c8a030' : '#4070a0';
      stabPill.style.borderColor = c;
    }
    const moralPill = document.getElementById('pill-moral');
    if (moralPill) {
      const c = state.morale < 30 ? '#c83030' : state.morale > 70 ? '#5a9030' : '#803030';
      moralPill.style.borderColor = c;
    }
  },

  // ══════════════════════════════════════════════
  // MAPA — delega en MapRenderer
  // ══════════════════════════════════════════════
  renderMap(state) {
    if (MapRenderer.canvas && MapRenderer.map) {
      if (state.mapData) {
        state.mapData.cells.forEach(cell => {
          if (state.playerCells && state.playerCells.includes(cell.id)) cell.owner = 'player';
        });
        (state.diplomacy || []).forEach((nation, i) => {
          (nation.cells || []).forEach(cid => {
            const c = state.mapData.cells[cid];
            if (c && c.owner !== 'player') c.owner = 'ai_' + (i+1);
          });
        });
      }
      MapRenderer.refresh(state);
    }
  },

  // ══════════════════════════════════════════════
  // HOVER INFO — aparece en columna derecha
  // ══════════════════════════════════════════════
  updateHoverInfo(cell) {
    const container = document.getElementById('hover-content');
    if (!container) return;
    if (!cell) {
      container.innerHTML = '<span style="color:var(--text3)">🗺️ Señala el mapa para ver información</span>';
      return;
    }
    const biome  = cell.biome;
    const yields = cell.resourceYield || {};
    const ownerLabel =
      cell.owner === 'player'  ? '<span style="color:var(--green2)">⚔️ Tu reino</span>' :
      cell.owner === 'neutral' ? '<span style="color:var(--text3)">○ Tierra neutral</span>'
                                : '<span style="color:var(--red2)">⚔️ Territorio rival</span>';

    const extras = [
      cell.isCapital    ? '🏰 Capital' : '',
      cell.featureLabel ? '✦ ' + cell.featureLabel : '',
      (cell.features && cell.features.includes('river')) ? '💧 Río' : '',
    ].filter(Boolean).join('  ·  ');

    container.innerHTML = `
      <div class="hover-title">${biome.icon || ''} ${biome.name}</div>
      <div class="hover-yields">
        <span>🌾 <b>${yields.food||0}</b></span>
        <span>💰 <b>${yields.gold||0}</b></span>
        <span>🪵 <b>${yields.wood||0}</b></span>
        <span>🪨 <b>${yields.stone||0}</b></span>
        <span>⚙️ <b>${yields.iron||0}</b></span>
      </div>
      <div class="hover-owner">${ownerLabel}${extras ? '  ·  <span style="color:var(--gold)">' + extras + '</span>' : ''}</div>
      <div style="font-size:9px;color:var(--text3);margin-top:2px;font-style:italic">${biome.description}</div>
    `;
  },

  // ══════════════════════════════════════════════
  // FACCIONES
  // ══════════════════════════════════════════════
  renderFactions(state) {
    const container = document.getElementById('factions-list');
    if (!container) return;
    container.innerHTML = '';
    state.factions.forEach(f => {
      const mood     = f.satisfaction > 70 ? '😊 Leal' : f.satisfaction > 45 ? '😐 Neutral' : f.satisfaction > 25 ? '😤 Inquieta' : '😡 FURIOSA';
      const barColor = f.satisfaction > 60 ? '#5a9030' : f.satisfaction > 35 ? '#c8a030' : '#c83030';
      const riskText = f.satisfaction < 25 ? ' Riesgo golpe de estado.' : f.satisfaction < 40 ? ' Demandas urgentes.' : '';
      // Rich tooltip with precise info
      const tip = [
        f.icon+' '+f.name,
        'Influencia política: '+f.influence+'%',
        'Satisfacción: '+Math.round(f.satisfaction)+'/100 — '+mood.replace(/[😊😐😤😡]/u,'').trim(),
        'Exigen: '+f.currentDemand,
        riskText ? '⚠️'+riskText : '',
        f.angryTurns>1 ? '🔴 '+f.angryTurns+' turnos de tensión' : '',
      ].filter(Boolean).join('&#10;');
      container.innerHTML += `
        <div class="faction-card tb-tip" data-tip="${tip}">
          <div class="faction-header">
            <span class="faction-name">${f.icon} ${f.name}</span>
            <span class="faction-power">⚖️ ${f.influence}%</span>
          </div>
          <div class="bar-wrap">
            <div class="bar-label"><span>${mood}</span><span>${Math.round(f.satisfaction)}/100</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${f.satisfaction}%;background:${barColor}"></div></div>
          </div>
          ${f.angryTurns > 1 ? `<div class="alert-box danger" style="padding:2px 5px;font-size:9px;margin-top:2px">⚠️ ${f.angryTurns}t furiosos</div>` : ''}
          <div class="faction-demand">📋 ${f.currentDemand}</div>
        </div>`;
    });
  },

  // ══════════════════════════════════════════════
  // RUTAS COMERCIALES EN MAPA LATERAL
  // ══════════════════════════════════════════════
  renderTradeOverlay(state) {
    const el = document.getElementById('trade-map-overlay');
    if (!el) return;
    const routes = state.activeTradeRoutes || [];
    if (!routes.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="trade-overlay-header">🐪 Rutas activas</div>'
      + routes.map(rt => {
          const health = rt.health !== undefined ? rt.health : 100;
          const hColor = health > 70 ? 'var(--green2)' : health > 40 ? 'var(--gold)' : 'var(--red2)';
          const inc = Object.entries(rt.income||{}).filter(([,v])=>v>0).map(([k,v])=>'+'+v+' '+k).join(', ');
          return '<div class="trade-overlay-row">'
            + '<span class="tor-icon">'+(rt.icon||'🤝')+'</span>'
            + '<span class="tor-name">'+rt.routeName+'</span>'
            + '<span class="tor-nation" style="color:var(--text3)">→'+rt.nationName+'</span>'
            + '<span class="tor-income" style="color:'+hColor+'">'+inc+'</span>'
            + '<div class="tor-bar"><div class="tor-fill" style="width:'+health+'%;background:'+hColor+'"></div></div>'
            + '</div>';
        }).join('');
  },

  // ══════════════════════════════════════════════
  // EJÉRCITO
  // ══════════════════════════════════════════════
  // ── FORMACIÓN VISUAL — renderiza filas de iconos escaladas por cantidad ──
  _renderFormation(units, legendaryUnit) {
    if (!units || !units.length) return '<div class="formation-empty">Sin unidades desplegadas</div>';

    // Ordenar: primero ranged, luego cavalry, luego melee
    const order = { arqueros:0, ballistas:1, caballeria:2, caballeria_pesada:3, guerreros_jaguar:4,
                    legionarios:5, berserkers:6, infanteria:7, levas:8 };
    const sorted = [...units].sort((a,b)=>(order[a.typeId]??9)-(order[b.typeId]??9));

    const rows = sorted.map(u => {
      const def = MILITARY_UNITS[u.typeId];
      if (!def || u.count === 0) return '';
      // Calcular cuántos iconos mostrar (escala 1–20)
      const maxIcons  = 20;
      const totalAll  = units.reduce((s,x)=>s+x.count,0);
      const proportion= Math.max(1, Math.round((u.count / Math.max(totalAll,1)) * maxIcons * 3));
      const iconCount = Math.min(proportion, maxIcons);
      const icons     = Array(iconCount).fill(def.icon).join(' ');
      const barPct    = Math.min(100, Math.round(u.count / Math.max(totalAll, 1) * 100));
      return `<div class="formation-row tb-tip" data-tip="${def.icon} ${def.name}&#10;${def.description}&#10;&#10;Fuerza base: ${def.attack} ataque · ${def.defense} defensa&#10;Coste: ${def.cost.gold}💰${def.cost.iron?' '+def.cost.iron+'⚙️':''}${def.cost.wood?' '+def.cost.wood+'🪵':''}">
        <div class="formation-label"><span class="fl-icon">${def.icon}</span><span class="fl-name">${def.name}</span><span class="fl-count">${u.count.toLocaleString()}</span></div>
        <div class="formation-bar"><div class="formation-fill" style="width:${barPct}%;background:${def.color||'var(--gold)'}"></div></div>
        <div class="formation-sprites" title="${u.count.toLocaleString()} ${def.name}">${icons}</div>
      </div>`;
    }).join('');

    return rows || '<div class="formation-empty">Sin unidades</div>';
  },

  renderMilitary(state) {
    const container = document.getElementById('military-panel');
    if (!container) return;
    const effective = Systems.Military.calculateEffectiveStrength(state);
    const total     = Systems.Military.totalSoldiers(state);

    container.innerHTML = `
      <div class="rpanel-section formation-section">
        <div class="rpanel-title">⚔️ Ejército en Formación</div>
        <div class="formation-panel">
          ${this._renderFormation(state.armyUnits, state.legendaryUnit)}
          ${state.legendaryUnit ? `<div class="formation-legendary tb-tip" data-tip="⭐ ${state.legendaryUnit.name}&#10;Unidad legendaria única. Bonificación especial en combate.">⭐ ${state.legendaryUnit.icon} ${state.legendaryUnit.name} <span class="leg-badge">LEGENDARIA</span></div>` : ''}
        </div>
        <div class="formation-stats">
          <div class="fstat"><span>⚔️ Total</span><b>${total.toLocaleString()}</b></div>
          <div class="fstat"><span>💪 Efectiva</span><b style="color:var(--gold2)">${effective.toLocaleString()}</b></div>
          <div class="fstat"><span>💰 Coste/T</span><b style="color:var(--red2)">-${Systems.Economy.calculateArmyUpkeep(state)}</b></div>
        </div>
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">🪖 Reclutar Unidades</div>
        ${(function(){
          var unlockMap = {
            levas:'recluta_levas', infanteria:'recluta_infanteria', arqueros:'recluta_arqueros',
            caballeria:'recluta_caballeria', caballeria_pesada:'recluta_caballeria',
            legionarios:'recluta_elite', berserkers:'recluta_elite', guerreros_jaguar:'recluta_elite',
            ballistas:'ballistas'
          };
          return Object.entries(MILITARY_UNITS).map(([id, def]) => {
            const restricted = def.civRestrict && state.civId && !def.civRestrict.includes(state.civId);
            if (restricted) return '';
            const unlockId = unlockMap[id] || 'recluta_levas';
            const isUnlocked = (typeof UnlockSystem !== 'undefined') ? UnlockSystem.isUnlocked(state, unlockId) : true;
            const needsPolicy = def.requires && !def.requires.some(r => state.activePolicies.includes(r));
            if (!isUnlocked) {
              const hint = (typeof UnlockSystem !== 'undefined') ? UnlockSystem.getHint(unlockId) : '';
              return '<button class="policy-btn locked-action tb-tip" disabled data-tip="🔒 BLOQUEADO&#10;'+hint+'">'
                +'<span>🔒 '+def.name+'</span>'
                +'<span class="lock-hint">'+hint.split('.')[0]+'</span>'
                +'</button>';
            }
            var onclk='Game.recruitUnit(\"'+id+'\",50)';
            return '<button class="policy-btn" onclick="'+onclk+'" '+(needsPolicy?'disabled':'')
              +' title="'+def.description+'">'
              +'<span>'+def.icon+' '+def.name+' ×50</span>'
              +'<span class="policy-cost">'+def.cost.gold+'💰'+(def.cost.iron?' '+def.cost.iron+'⚙️':'')+(def.cost.wood?' '+def.cost.wood+'🪵':'')+'</span>'
              +'</button>';
          }).join('');
        })()}
      </div>
      ${!state.legendaryUnit ? `
      <div class="rpanel-section">
        <div class="rpanel-title">⭐ Unidades Legendarias</div>
        ${LEGENDARY_UNITS.map(leg => `
          <div style="margin-bottom:8px;padding:7px;background:var(--bg4);border:1px solid var(--border2)">
            <div style="font-family:var(--font-title);color:var(--gold3);font-size:12px">${leg.icon} ${leg.name}</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin:3px 0">${leg.unlockCondition}</div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text2)">${leg.special}</div>
            <button class="diplo-btn" style="margin-top:5px" onclick="Game.recruitLegendary('${leg.id}')">
              Reclutar: ${leg.cost.gold}💰 ${leg.cost.iron?leg.cost.iron+'⚙️ ':''}${leg.cost.food?leg.cost.food+'🌾 ':''}${leg.cost.wood?leg.cost.wood+'🪵':''}
            </button>
          </div>`).join('')}
      </div>` : `
      <div class="rpanel-section">
        <div class="rpanel-title">⭐ Unidad Legendaria</div>
        <div style="padding:8px;background:rgba(200,160,48,0.06);border:1px solid var(--gold)">
          <div style="font-family:var(--font-title);color:var(--gold3);font-size:15px">${state.legendaryUnit.icon} ${state.legendaryUnit.name}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:3px">${LEGENDARY_UNITS.find(l=>l.id===state.legendaryUnit.id)?.special||''}</div>
        </div>
      </div>`}
      <div class="rpanel-section">
        <div class="rpanel-title">📜 Política Militar</div>
        ${(function(){
          var milUnlock = {standing_army:'ejercito_permanente', militia:'politica_basica', mercenaries:'mercenarios'};
          return POLICIES.militar.map(function(p){
            var uid=milUnlock[p.id]||'politica_basica';
            var ok=(typeof UnlockSystem==='undefined')||UnlockSystem.isUnlocked(state,uid);
            if(!ok){var h=(typeof UnlockSystem!=='undefined')?UnlockSystem.getHint(uid):'';return '<button class="policy-btn locked-action tb-tip" disabled data-tip="🔒 BLOQUEADO&#10;'+h+'"><span>🔒 '+p.name+'</span><span class="lock-hint">'+h.split('.')[0]+'</span></button>';}
            return '<button class="policy-btn '+(state.activePolicies.includes(p.id)?'active':'')+'" onclick="Game.togglePolicy(\'' + p.id + '\',\'militar\')"><span>'+p.name+'</span><span class="policy-cost">'+(p.cost_gold>0?p.cost_gold+'💰':'gratis')+'</span></button>';
          }).join('');
        })()}
      </div>
      ${typeof TacticalMap !== 'undefined' ? TacticalMap.renderGarrisonPanel(state) : ''}`;
  },

  // ══════════════════════════════════════════════
  // POLÍTICA
  // ══════════════════════════════════════════════
  renderPolitics(state) {
    const container = document.getElementById('politics-panel');
    if (!container) return;
    const gov = GOVERNMENT_TYPES[state.government];
    const pp  = Systems.Factions.calculatePoliticalPower(state);
    container.innerHTML = `
      <div class="rpanel-section">
        <div class="rpanel-title">🏛️ Gobierno</div>
        <div style="margin-bottom:6px"><span class="gov-badge">${gov.name}</span></div>
        <div style="font-style:italic;font-size:12px;color:var(--text2);margin-bottom:8px">${gov.description}</div>
        <div class="mil-unit-row"><span>⚖️ Estabilidad base</span><span>${gov.stabilityBonus>0?'+':''}${gov.stabilityBonus}</span></div>
        <div class="mil-unit-row"><span>💸 Corrupción base</span><span>+${gov.corruptionPenalty}/turno</span></div>
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">📊 Poder Político</div>
        <div class="bar-wrap">
          <div class="bar-label"><span>Apoyo ponderado</span><span>${pp}/100</span></div>
          <div class="bar-track"><div class="bar-fill ${pp>60?'green':pp>40?'gold':'red'}" style="width:${pp}%"></div></div>
        </div>
        ${pp < 35 ? '<div class="alert-box danger">⚠️ Gobierno en riesgo. Apoyo crítico.</div>' : ''}
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">📋 Política Económica</div>
        ${(function(){
          var econUnlock={free_market:'politica_basica',state_control:'economia_dirigida',war_economy:'guerra_economica'};
          return POLICIES.economia.map(function(p){
            var uid=econUnlock[p.id]||'politica_basica';
            var ok=(typeof UnlockSystem==='undefined')||UnlockSystem.isUnlocked(state,uid);
            if(!ok){var h=(typeof UnlockSystem!=='undefined')?UnlockSystem.getHint(uid):'';return '<button class="policy-btn locked-action tb-tip" disabled data-tip="🔒 BLOQUEADO&#10;'+h+'"><span>🔒 '+p.name+'</span></button>';}
            return '<button class="policy-btn '+(state.activePolicies.includes(p.id)?'active':'')+'" onclick="Game.togglePolicy(\'' + p.id + '\',\'economia\')"><span>'+p.name+'</span></button>';
          }).join('');
        })()}
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">👥 Política Social</div>
        ${(function(){
          var socUnlock={bread_circus:'politica_social_avanzada',forced_labor:'economia_dirigida',education:'politica_social_avanzada'};
          return POLICIES.social.map(function(p){
            var uid=socUnlock[p.id]||'politica_basica';
            var ok=(typeof UnlockSystem==='undefined')||UnlockSystem.isUnlocked(state,uid);
            if(!ok){var h=(typeof UnlockSystem!=='undefined')?UnlockSystem.getHint(uid):'';return '<button class="policy-btn locked-action tb-tip" disabled data-tip="🔒 BLOQUEADO&#10;'+h+'"><span>🔒 '+p.name+'</span></button>';}
            return '<button class="policy-btn '+(state.activePolicies.includes(p.id)?'active':'')+'" onclick="Game.togglePolicy(\'' + p.id + '\',\'social\')"><span>'+p.name+'</span>'+(p.cost_gold>0?'<span class="policy-cost">'+p.cost_gold+'💰</span>':'')+'</button>';
          }).join('');
        })()}
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">📉 Indicadores</div>
        ${[['⚖️ Estabilidad',state.stability,'green'],['❤️ Moral',state.morale,'red'],['💸 Corrupción',state.economy.corruption,'red']].map(([l,v,t])=>`
          <div class="bar-wrap">
            <div class="bar-label"><span>${l}</span><span>${Math.floor(v)}/100</span></div>
            <div class="bar-track"><div class="bar-fill ${t==='red'?v>60?'red':'gold':'green'}" style="width:${Math.floor(v)}%"></div></div>
          </div>`).join('')}
      </div>`;
  },

  // ══════════════════════════════════════════════
  // DIPLOMACIA — Usa DiplomacySystem para tarjetas expandidas
  // ══════════════════════════════════════════════
  renderDiplomacy(state) {
    const container = document.getElementById('diplomacy-panel');
    if (!container || !state.diplomacy) return;
    // Inicializar personajes si es primera vez
    if (typeof DiplomacySystem !== 'undefined') DiplomacySystem.initCharacters(state);
    // Inject sabotage/attack actions into each nation card via post-render
    // Sabotage/attack buttons are defined in DiplomacySystem.renderNationCard via diplomacy.js
    // Contar mensajes sin leer
    const unread = (state.diplomacyInbox||[]).filter(m=>!m.read).length;
    const inboxHeader = unread ? `<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold);padding:6px 10px;border-bottom:1px solid var(--border);background:rgba(200,160,48,0.08)">✉️ ${unread} mensaje${unread>1?'s':''} sin leer</div>` : '';
    container.innerHTML = inboxHeader +
      state.diplomacy.map((nation, i) =>
        (typeof DiplomacySystem !== 'undefined')
          ? DiplomacySystem.renderNationCard(nation, state, i)
          : '<div>' + nation.name + '</div>'
      ).join('');
  },

  // ══════════════════════════════════════════════
  // ECONOMÍA
  // ══════════════════════════════════════════════
  renderEconomy(state) {
    const container = document.getElementById('economy-panel');
    if (!container) return;
    const rates   = state.rates || {};
    const taxRate = state.economy ? (state.economy.taxRate || 20) : 20;
    const taxLabel= taxRate<=5?'✨ Exento':taxRate<=20?'📊 Moderado':taxRate<=40?'📈 Alto':taxRate<=65?'💸 Oneroso':'🔥 Confiscatorio';
    const taxColor= taxRate<=20?'var(--green2)':taxRate<=40?'var(--gold2)':taxRate<=65?'var(--gold)':'var(--red2)';
    const moralFx = taxRate<=5?'+3/t':taxRate<=20?'±0':taxRate<=35?'-5/t':taxRate<=50?'-10/t':taxRate<=75?'-18/t':'-30/t';
    const moralCol= taxRate<=20?'var(--green2)':taxRate<=35?'var(--text3)':'var(--red2)';
    const goldExtra= Math.max(0,Math.floor((taxRate-20)*0.8));

    container.innerHTML =
      '<div class="rpanel-section tax-section">'
      +'<div class="rpanel-title">📊 Política Fiscal</div>'
      +'<div class="tax-display"><div class="tax-pct" style="color:'+taxColor+'">'+taxRate+'%</div>'
      +'<div class="tax-label" style="color:'+taxColor+'">'+taxLabel+'</div></div>'
      +'<input type="range" class="tax-slider" id="tax-slider" min="0" max="90" step="5" value="'+taxRate+'"'
      +' oninput="Game.setTaxRate(this.value)">'
      +'<div class="tax-ruler"><span>0%</span><span>Moderado</span><span>Alto</span><span>Oneroso</span><span>90%</span></div>'
      +'<div class="tax-effects">'
      +'<span style="color:var(--gold2)">💰 Oro:</span><span>+'+(goldExtra||0)+'/t vs base</span>'
      +'<span style="color:'+moralCol+'">❤️ Moral:</span><span style="color:'+moralCol+'">'+moralFx+'</span>'
      +'</div>'
      +(taxRate>65?'<div class="alert-box danger" style="margin-top:6px">🔥 Confiscatorio: riesgo revolución</div>':'')
      +(taxRate>40&&taxRate<=65?'<div class="alert-box warn" style="margin-top:6px">⚠️ Pueblo descontento</div>':'')
      +'</div>'

      +'<div class="rpanel-section">'
      +'<div class="rpanel-title">📈 Flujo por Turno</div>'
      +[['🌾 Alimentos',rates.food||0],['💰 Oro',rates.gold||0],['🪵 Madera',rates.wood||0],['🪨 Piedra',rates.stone||0],['⚙️ Hierro',rates.iron||0]].map(function(x){
        var l=x[0],v=x[1];
        return '<div class="stat-row"><span class="stat-row-label">'+l+'</span>'
          +'<span style="font-family:var(--font-mono);font-size:11px;color:'+(v>=0?'var(--green2)':'var(--red2)')+'">'+((v>=0?'+':'')+v)+'/t</span></div>';
      }).join('')
      +'</div>'

      +'<div class="rpanel-section">'
      +'<div class="rpanel-title">⚠️ Indicadores</div>'
      +'<div class="bar-wrap"><div class="bar-label"><span>📉 Inflación</span><span>'+Math.floor(state.economy.inflation)+'/100</span></div>'
      +'<div class="bar-track"><div class="bar-fill red" style="width:'+state.economy.inflation+'%"></div></div></div>'
      +'<div class="stat-row"><span class="stat-row-label">📜 Deuda</span><span style="font-family:var(--font-mono);font-size:11px;color:'+(state.economy.debt>300?'var(--red2)':'var(--text)')+'">'+state.economy.debt+'💰</span></div>'
      +'<div class="stat-row"><span class="stat-row-label">⚓ Comercio</span><span style="font-family:var(--font-mono);font-size:11px">+'+state.economy.trade_income+'/t</span></div>'
      +'<div class="stat-row"><span class="stat-row-label">⚔️ Manten.</span><span style="font-family:var(--font-mono);font-size:11px;color:var(--red2)">-'+Systems.Economy.calculateArmyUpkeep(state)+'/t</span></div>'
      +(state.economy.inflation>60?'<div class="alert-box danger">⚠️ Hiperinflación</div>':'')
      +(state.economy.debt>400?'<div class="alert-box warn">⚠️ Deuda crítica</div>':'')
      +'</div>'

      +'<div class="rpanel-section">'
      +'<div class="rpanel-title">🏦 Finanzas</div>'
      +'<button class="policy-btn" onclick="Game.takeLoan()">💳 Préstamo (+200💰 +200 deuda)</button>'
      +'<button class="policy-btn" onclick="Game.payDebt()">📤 Pagar deuda (-100💰 -100 deuda)</button>'
      +'<button class="policy-btn" onclick="Game.buildIrrigation()">🚿 Irrigación (150🪵 100🪨 200💰)</button>'
      +'<button class="policy-btn" onclick="Game.buildGranary()">🏚️ Graneros (100🪵)</button>'
      +'</div>';
  },

  // ══════════════════════════════════════════════
  // CLIMA
  // ══════════════════════════════════════════════
  renderClimate(state) {
    const container = document.getElementById('climate-panel');
    if (!container) return;
    const cs = Systems.Climate.getSummary(state);
    const season  = cs.season;
    const extreme = cs.extreme;
    const turnInSeason = ((state.turn - 1) % 4) + 1;
    const seasons = ['spring','summer','autumn','winter'];
    const nextKey = seasons[(Math.floor((state.turn % 16) / 4)) % 4];
    const nextS   = SEASONS[nextKey];
    container.innerHTML = `
      <div class="climate-indicator">
        <span class="climate-icon">${season.icon}</span>
        <div class="climate-name">${season.name}</div>
        <div class="climate-desc">${season.description}</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:5px">
          📅 Turno ${turnInSeason}/4 · Próxima: ${nextS.icon} ${nextS.name} en ${5-turnInSeason} turno(s)
        </div>
      </div>
      ${extreme ? `
        <div class="alert-box ${extreme.foodMod < -30 || extreme.moraleMod < -20 ? 'danger' : 'warn'}" style="margin:0 10px 10px">
          <b>${extreme.icon} ${extreme.name}</b> — ${state.climate.extremeDuration} turno(s) más
          ${extreme.triggersChain ? `<br><span style="font-size:9px">⚠️ Puede desencadenar: ${EXTREME_CLIMATE_EVENTS[extreme.triggersChain]?.name||''}</span>` : ''}
        </div>` :
        `<div style="font-family:var(--font-mono);font-size:10px;color:var(--green2);margin:0 10px 10px;padding:5px;background:rgba(90,144,48,0.08);border:1px solid var(--green)">✓ Sin eventos climáticos extremos</div>`}
      <div class="rpanel-section">
        <div class="rpanel-title">📊 Efectos Combinados</div>
        ${(function(){
          var rows=[['🌾 Alimentos',cs.totalFoodMod,'%'],['❤️ Moral',cs.totalMoralMod,''],['⚔️ Ejército',cs.totalArmyMod,'%']];
          return rows.map(function(r){
            var label=r[0],val=r[1],unit=r[2];
            var col=val>0?'var(--green2)':val<0?'var(--red2)':'var(--text2)';
            var sign=val>0?'+':'';
            return '<div class="stat-row"><span class="stat-row-label">'+label+'</span>'
              +'<span style="font-family:var(--font-mono);font-size:11px;color:'+col+'">'+sign+val+unit+'</span></div>';
          }).join('');
        })()}
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">🌿 Mitigación</div>
        <button class="policy-btn" onclick="Game.buildIrrigation()">🚿 Irrigación (150🪵 100🪨 200💰)</button>
        <button class="policy-btn" onclick="Game.buildGranary()">🏚️ Graneros (100🪵 → +200 alimentos)</button>
      </div>`;
  },

  // ══════════════════════════════════════════════
  // ESPÍAS
  // ══════════════════════════════════════════════
  renderSpies(state) {
    const container = document.getElementById('spies-panel');
    if (!container) return;
    const spies = state.spies || { count: 1, active: [] };
    container.innerHTML = `
      <div class="rpanel-section">
        <div class="rpanel-title">🕵️ Red de Espionaje</div>
        <div class="mil-unit-row"><span>Espías disponibles</span><span style="color:var(--gold2)">${spies.count - spies.active.length} / ${spies.count}</span></div>
        ${spies.active.length ? spies.active.map(m => {
          const mDef = SPY_MISSIONS[m.missionId];
          const nat  = (state.diplomacy||[]).find(n=>n.id===m.targetId);
          return `<div class="mil-unit-row"><span>${mDef?.icon||'🕵️'} ${mDef?.name||m.missionId} → ${nat?.name||m.targetId}</span><span>${m.turnsLeft}t</span></div>`;
        }).join('') : '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">Sin misiones activas</div>'}
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">🎯 Enviar Misión</div>
        ${(state.diplomacy||[]).map(nation => `
          <div style="margin-bottom:10px">
            <div style="font-family:var(--font-title);font-size:12px;color:var(--gold);margin-bottom:4px">
              ${nation.icon} ${nation.name} ${nation.revealed?'<span style="color:var(--green2);font-size:10px">🔍 '+nation.army+' soldados</span>':'<span style="color:var(--text3);font-size:10px">❓ ejército desconocido</span>'}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${(function(){
                var adv=['sabotaje_economico','intriga_politica','robo_planos','envenenar_lider'];
                return Object.entries(SPY_MISSIONS).map(function(e){var id=e[0],m=e[1];
                  var uid=adv.indexOf(id)>=0?'sabotaje':'reconocimiento';
                  if(adv.indexOf(id)>=2) uid='robo_planos';
                  var ok=(typeof UnlockSystem==='undefined')||UnlockSystem.isUnlocked(state,uid);
                  if(!ok){var h=(typeof UnlockSystem!=='undefined')?UnlockSystem.getHint(uid):'';return '<button class="diplo-btn tb-tip" disabled data-tip="🔒 '+h+'">🔒 '+m.icon+'</button>';}
                  var oc='Game.sendSpy("'+id+'","'+nation.id+'")'; return '<button class="diplo-btn" onclick="'+oc+'" title="'+m.description+' ('+Math.round(m.successChance*100)+'% éxito)">'+m.icon+' '+m.cost.gold+'💰</button>';
                }).join('');
              })()}
            </div>
          </div>`).join('')}
        ${(function(){
          var ok=(typeof UnlockSystem==='undefined')||UnlockSystem.isUnlocked(state,'espias_basico');
          if(!ok){var h=(typeof UnlockSystem!=='undefined')?UnlockSystem.getHint('espias_basico'):'';return '<div class="locked-panel tb-tip" data-tip="🔒 ESPIONAJE BLOQUEADO&#10;'+h+'"><span>🔒 Espionaje no disponible aún</span><div class="lock-hint">'+h+'</div></div>';}
          return '<button class="policy-btn" onclick="Game.trainSpy()">🎓 Entrenar espía adicional (200💰)</button>';
        })()}
      </div>`;
  },

  // ══════════════════════════════════════════════
  // COMERCIO
  // ══════════════════════════════════════════════
  renderTrade(state) {
    const container = document.getElementById('trade-panel');
    if (!container) return;
    const routes = state.activeTradeRoutes || [];
    container.innerHTML = `
      <div class="rpanel-section">
        <div class="rpanel-title">⚓ Rutas Activas</div>
        ${routes.length ? routes.map(rt => {
          const health = rt.health !== undefined ? rt.health : 100;
          const hColor = health > 70 ? 'var(--green2)' : health > 40 ? 'var(--gold)' : 'var(--red2)';
          const guardsHtml = rt.guards > 0 ? '<span style="font-family:var(--font-mono);font-size:9px;color:var(--green2)">🛡️' + rt.guards + '</span>' : '';
          return '<div style="background:var(--bg4);border:1px solid var(--border);padding:7px;margin-bottom:6px">'
            + '<div style="display:flex;justify-content:space-between;align-items:center">'
            + '<span style="font-family:var(--font-title);font-size:12px;color:var(--gold)">' + rt.icon + ' ' + rt.routeName + '</span>'
            + '<button class="diplo-btn danger" style="font-size:9px" data-rid="' + rt.routeId + '" data-nid="' + rt.nationId + '" onclick="Game.closeTradeRoute(this.dataset.rid,this.dataset.nid)">✕</button>'
            + '</div>'
            + '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">'
            + '🏰 ' + rt.nationName + ' · ' + Object.entries(rt.income||{}).map(([k,v])=>(v>0?'+':'')+v+' '+k).join(', ') + ' · Rel +' + rt.relationBonus + '/t'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:6px;margin-top:4px">'
            + '<span style="font-family:var(--font-mono);font-size:9px;color:' + hColor + '">Salud: ' + health + '%</span>'
            + '<div style="flex:1;height:3px;background:rgba(255,255,255,0.1);border-radius:2px"><div style="width:' + health + '%;height:100%;background:' + hColor + ';border-radius:2px"></div></div>'
            + guardsHtml
            + '</div>'
            + '</div>';
        }).join('') : '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">Sin rutas activas</div>'}
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">📋 Abrir Ruta</div>
        ${(state.diplomacy||[]).filter(n=>!n.atWar).map(nation => `
          <div style="margin-bottom:10px">
            <div style="font-family:var(--font-title);font-size:12px;color:${nation.relation>0?'var(--gold)':'var(--text3)'};margin-bottom:4px">
              ${nation.icon} ${nation.name} (Rel: ${nation.relation>0?'+':''}${nation.relation})
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${(function(){
                var tradeUnlock={basico:'comercio_basico',intercambio_grano:'comercio_basico',ruta_seda:'rutas_avanzadas',comercio_hierro:'rutas_avanzadas',ruta_maritima:'rutas_maritimas',flota_mercante:'rutas_maritimas',alianza_economica:'alianza_economica'};
                return Object.entries(TRADE_ROUTES).map(function(e){var id=e[0],rt=e[1];
                  var uid=tradeUnlock[id]||'comercio_basico';
                  var ok=(typeof UnlockSystem==='undefined')||UnlockSystem.isUnlocked(state,uid);
                  var relLocked=nation.relation<rt.requires.relation;
                  if(!ok){var h=(typeof UnlockSystem!=='undefined')?UnlockSystem.getHint(uid):'';return '<button class="diplo-btn tb-tip" disabled data-tip="🔒 '+h+'">🔒 '+rt.name+'</button>';}
                  return '<button class="diplo-btn'+(relLocked?' disabled':'')+'" data-id="'+id+'" data-nid="'+nation.id+'" onclick="Game.openTradeRoute(this.dataset.id,this.dataset.nid)" title="'+rt.description+'"'+(relLocked?' style="opacity:0.4"':'')+'>'+rt.icon+' '+rt.name+' ('+rt.cost.gold+'💰)</button>';
                }).join('');
              })()}
            </div>
          </div>`).join('')}
      </div>`;
  },

  // ══════════════════════════════════════════════
  // GASTO PÚBLICO (nuevo)
  // ══════════════════════════════════════════════
  renderSpending(state) {
    const container = document.getElementById('spending-panel');
    if (!container) return;
    const activeSpending = state.activeSpending || [];

    container.innerHTML = `
      <div class="rpanel-section">
        <div class="rpanel-title">🏗️ Gasto Público Activo</div>
        ${activeSpending.length
          ? activeSpending.map(id => {
              const sp = PUBLIC_SPENDING[id];
              return sp ? `<div class="alert-box good">✓ ${sp.name} activo (-${sp.costPerTurn}💰/turno)</div>` : '';
            }).join('')
          : '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">Sin gasto activo</div>'}
      </div>
      <div class="rpanel-section">
        <div class="rpanel-title">💰 Opciones de Gasto</div>
        ${Object.entries(PUBLIC_SPENDING).map(([id, sp]) => {
          const isActive = activeSpending.includes(id);
          return `
            <div class="spending-item ${isActive?'active':''}" onclick="Game.toggleSpending('${id}')">
              <div class="spending-name">${sp.icon} ${sp.name}</div>
              <div class="spending-cost">💰 -${sp.costPerTurn}/turno${sp.costOneTime?' · ${sp.costOneTime} al activar':''}</div>
              <div class="spending-effects">${sp.effectText}</div>
              <div class="spending-reaction">${isActive ? sp.activeReaction : sp.inactiveReaction}</div>
            </div>`;
        }).join('')}
      </div>`;
  },

  // ══════════════════════════════════════════════
  // COLA DE EVENTOS (agenda compacta)
  // ══════════════════════════════════════════════
  renderEventQueue(state) {
    const container = document.getElementById('event-queue');
    const countEl   = document.getElementById('event-count');
    const warnEl    = document.getElementById('agenda-warning');
    if (!container) return;

    const events = state.currentEvents || [];
    if (countEl) countEl.textContent = events.length;

    const hasCritical = events.some(e => e.priority === 'critical');
    if (warnEl && warnEl.classList.toggle) warnEl.classList.toggle('hidden', !hasCritical);
    else if (warnEl) { if (!hasCritical) warnEl.classList.add('hidden'); else warnEl.classList.remove('hidden'); }

    // Banner de arco activo
    const arcBanner = document.getElementById('arc-status-area');
    if (arcBanner && typeof ArcManager !== 'undefined') {
      const arcStatus = ArcManager.getActiveArcStatus(state);
      if (arcStatus) {
        const dots = Array.from({length: arcStatus.totalPhases}, (_,i) =>
          `<div class="arc-dot ${i < arcStatus.phase ? 'done' : i === arcStatus.phase ? 'current' : ''}"></div>`
        ).join('');
        arcBanner.innerHTML = `<div class="arc-status-banner">
          <span class="arc-icon">${arcStatus.icon}</span>
          <div class="arc-info">
            <div class="arc-name">📖 ${arcStatus.name}</div>
            <div class="arc-progress">Fase ${arcStatus.phase + 1} / ${arcStatus.totalPhases}</div>
            <div class="arc-phase-dots">${dots}</div>
          </div>
        </div>`;
      } else {
        arcBanner.innerHTML = '';
      }
    }

    if (events.length === 0) {
      container.innerHTML = '<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);padding:0 4px">— Sin eventos pendientes —</span>';
      return;
    }

    container.innerHTML = events.map((ev, i) => `
      <div class="event-item ${ev.priority==='critical'?'critical':''} ${ev.isArcEvent?'arc-event':''} ${state.activeEventIndex===i?'active':''}"
           onclick="Game.selectEvent(${i})">
        ${ev.icon} ${ev.title}${ev.isArcEvent ? ' <small style=\"opacity:0.6\">📖</small>' : ''}
      </div>`).join('');
  },

  // ══════════════════════════════════════════════
  // EVENTO ACTIVO
  // ══════════════════════════════════════════════
  renderActiveEvent(state) {
    const container = document.getElementById('active-event');
    if (!container) return;
    // Arc banner at top if active
    const arcBanner = (typeof StoryArcSystem !== "undefined") ? StoryArcSystem.renderActiveBanner(state) : "";

    const events = state.currentEvents || [];
    const idx    = state.activeEventIndex;

    if (events.length === 0 || idx === null || idx === undefined) {
      container.innerHTML = `
        <div class="no-events">
          <div class="no-events-icon">⚖️</div>
          <div>Sin eventos pendientes</div>
          <div class="no-events-sub">Señala el mapa con el cursor<br>para ver información del territorio</div>
        </div>`;
      return;
    }

    const ev = events[idx];
    if (!ev) return;

    const chainTag = ev._chainSource ? '<div class="chained-event-tag">🔗 Evento encadenado</div>' : '';
    container.innerHTML = arcBanner + chainTag + `
      <div class="decision-card">
        <div class="decision-header">
          <span class="decision-icon">${ev.icon}</span>
          <div>
            <div class="decision-title">${ev.title}</div>
            <div class="decision-category">${ev.category} · ${ev.priority==='critical'?'⚠️ URGENTE':ev.priority==='high'?'🔴 Importante':'Normal'}</div>
          </div>
        </div>
        <p class="decision-desc">${ev.description}</p>
        <div class="decision-context">${ev.context}</div>
        <div class="decision-options">
          ${(ev.options||[]).map((opt, oi) => `
            <button class="option-btn" onclick="Game.resolveEvent(${idx}, ${oi})">
              <div class="option-label">▶ ${opt.label}</div>
              <div class="option-effects">
                ${(opt.effectText||[]).map(et => {
                  const cls = et.startsWith('+') ? 'effect-pos' : et.startsWith('-') ? 'effect-neg' : 'effect-neu';
                  return `<span class="${cls}">${et}</span>`;
                }).join('  ·  ')}
              </div>
            </button>`).join('')}
        </div>
      </div>`;
  },

  // ══════════════════════════════════════════════
  // LOG
  // ══════════════════════════════════════════════
  renderLog(state) {
    const container = document.getElementById('game-log');
    if (!container || !state.log) return;
    container.innerHTML = state.log.slice(0, 30).map(entry => `
      <div class="log-entry ${entry.type==='crisis'?'log-crisis':entry.type==='warn'?'log-warn':entry.type==='good'?'log-good':''}">
        <span class="log-turn">A${entry.year}T${entry.turn}</span>
        <span class="log-msg">${entry.message}</span>
      </div>`).join('');
  },

  // ══════════════════════════════════════════════
  // FULL RENDER
  // ══════════════════════════════════════════════
  // ── ÁRBOL DE DESBLOQUEOS (renderiza en pestaña spending por ahora) ──
  renderUnlocks(state) {
    if (typeof UnlockSystem === 'undefined') return;
    var container = document.getElementById('unlocks-panel');
    if (!container) return;
    container.innerHTML = UnlockSystem.renderProgressPanel(state);
  },

  fullRender(state) {
    this.updateTopBar(state);
    this.renderFactions(state);
    this.renderMilitary(state);
    this.renderTradeOverlay(state);
    this.renderPolitics(state);
    this.renderDiplomacy(state);
    this.renderEconomy(state);
    this.renderClimate(state);
    this.renderSpies(state);
    this.renderTrade(state);
    this.renderSpending(state);
    this.renderUnlocks(state);
    this.renderEventQueue(state);
    this.renderActiveEvent(state);
    this.renderLog(state);
  }
};

// ══════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function switchMapTab(tab) {
  document.querySelectorAll('.mtab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.mtab').forEach(el => el.classList.remove('active'));
  const content = document.getElementById('mtab-' + tab);
  if (content) content.classList.add('active');
  if (event && event.target) event.target.classList.add('active');
}

function switchRightTab(tab) {
  document.querySelectorAll('.rtab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.panel-tabs .ptab').forEach(el => el.classList.remove('active'));
  const content = document.getElementById('rtab-' + tab);
  if (content) content.classList.add('active');
  if (event && event.target) event.target.classList.add('active');
}
