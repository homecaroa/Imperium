// ============================================================
// IMPERIUM — CHRONICLE.JS
// Crónica automática al inicio de cada turno.
// Tono: juglar medieval, dinámico, basado en el estado real.
// ============================================================

var ChronicleSystem = {

  // ── GENERAR CRÓNICA ──────────────────────────────────────
  generateChronicle(state, prev) {
    if (!state) return '';
    const lines = [];
    const s   = state;
    const p   = prev || {};
    const turn = s.turn || 1;
    const year = s.year || 1;

    // ── APERTURA: año y turno ─────────────────────────────
    const openings = [
      `En el año ${year} del reino, los cronistas toman la pluma para dar cuenta de los sucesos acaecidos.`,
      `Corren tiempos de ${s.morale > 70 ? 'gloria' : s.morale > 40 ? 'incertidumbre' : 'sombra'} en ${s.civName || 'el reino'}, al comenzar el turno ${turn}.`,
      `El pueblo de ${s.civName || 'la nación'} despierta en el año ${year}. Los heraldos transmiten las nuevas de la corte.`,
      `Año ${year}. Los escribas del palacio registran: el destino de ${s.civName || 'este pueblo'} sigue siendo forjado por decisiones de hombres mortales.`,
    ];
    lines.push(openings[turn % openings.length]);

    // ── MORAL ─────────────────────────────────────────────
    const moraleDelta = (s.morale || 50) - (p.morale || s.morale || 50);
    if (s.morale >= 80) {
      lines.push('El fervor es alto entre la tropa y el pueblo llano. Los bardos entonan canciones de victoria y los niños corren por las plazas.');
    } else if (s.morale >= 60) {
      lines.push('La moral del pueblo se mantiene firme, aunque algunos comerciantes murmuran que los tiempos mejores quedaron atrás.');
    } else if (s.morale >= 35) {
      lines.push('Cuentan los cronistas que la fatiga ha calado hondo en el ánimo de la gente. Las tabernas guardan silencio donde antes hubo canciones.');
    } else if (s.morale < 35) {
      lines.push('El desasosiego recorre las calles como viento helado. El pueblo cuestiona a sus gobernantes y los soldados marchan sin ardor.');
    }
    if (moraleDelta <= -15) {
      lines.push(`La caída del ánimo colectivo es alarmante: han menguado ${Math.abs(Math.round(moraleDelta))} grados de confianza en un solo ciclo.`);
    } else if (moraleDelta >= 15) {
      lines.push(`Un soplo de esperanza ha revitalizado al pueblo: la moral ha crecido ${Math.round(moraleDelta)} grados desde la última luna.`);
    }

    // ── ESTABILIDAD ───────────────────────────────────────
    const stabDelta = (s.stability || 50) - (p.stability || s.stability || 50);
    if (s.stability < 25) {
      lines.push('Las bases del orden tambalean. Los nobles conspiran en salones cerrados y el hambre siembra el germen de la revuelta.');
    } else if (s.stability < 45 && stabDelta < -10) {
      lines.push(`La estabilidad ha cedido ${Math.abs(Math.round(stabDelta))} puntos. Los más sabios advierten que el edificio del poder puede derrumbarse.`);
    } else if (s.stability >= 80) {
      lines.push('El orden reina con mano segura. Las leyes se cumplen y los jueces dictan sentencia sin temor a represalia.');
    }

    // ── GUERRAS ───────────────────────────────────────────
    const wars = (s.diplomacy || []).filter(n => n.atWar);
    if (wars.length > 0) {
      const wn = wars.map(n => n.name).join(' y ');
      if (wars.length === 1) {
        const w = wars[0]._war;
        const turns = w ? w.turn : '?';
        const momentum = w ? w.momentum : 0;
        lines.push(`La guerra contra ${wn} lleva ya ${turns} turno${turns !== 1 ? 's' : ''} de fuego y sangre. ${momentum > 30 ? 'Nuestras huestes avanzan con paso firme.' : momentum < -30 ? 'El enemigo nos presiona en varios flancos.' : 'El resultado sigue siendo incierto como los vientos de otoño.'}`);
      } else {
        lines.push(`El reino libra guerras en múltiples frentes contra ${wn}. Los generales advierten que los recursos se agotan más rápido que la paciencia del pueblo.`);
      }
    } else if ((p.diplomacy || []).some(n => n.atWar) && wars.length === 0) {
      lines.push('Los tambores de guerra han enmudecido. La paz regresa, aunque las cicatrices del conflicto tardarán en cerrarse.');
    } else if (wars.length === 0 && s.turn > 3) {
      const allRels = (s.diplomacy || []).map(n => n.relation || 0);
      const avgRel  = allRels.length ? allRels.reduce((a,b)=>a+b,0)/allRels.length : 0;
      if (avgRel < -20) {
        lines.push('Aunque las espadas descansan en sus vainas, las tensiones diplomáticas son un fuego lento que podría estallar en cualquier momento.');
      } else {
        lines.push('El reino goza de paz, al menos por ahora. Los embajadores circulan por las cortes vecinas con palabras de buena voluntad.');
      }
    }

    // ── ECONOMÍA ──────────────────────────────────────────
    const gold     = Math.floor(s.resources?.gold || 0);
    const goldRate = Math.floor(s.rates?.gold || 0);
    const prevGold = Math.floor(p.resources?.gold || gold);
    const goldDelta = gold - prevGold;

    if (goldRate < -50) {
      lines.push(`Las arcas reales sufren: el reino pierde ${Math.abs(goldRate)} monedas de oro cada ciclo. Los tesoreros advierten de un déficit que amenaza con devorar las reservas.`);
    } else if (goldRate > 60) {
      lines.push(`Los ingresos fluyen con generosidad: ${goldRate} monedas de oro ingresan al tesoro cada turno. Los mercaderes celebran la prosperidad.`);
    } else if (gold < 100) {
      lines.push('Las arcas reales están casi vacías. Sin monedas no hay soldados leales, ni obra pública, ni alianza que aguante.');
    }

    if ((s._deficitTurns || 0) >= 2) {
      lines.push(`Por segunda luna consecutiva el ejército no ha cobrado su soldada completa. La deserción crece y los veteranos miran hacia otras banderas.`);
    }

    // ── FACCIONES ─────────────────────────────────────────
    const factions = s.factions || [];
    const angry = factions.filter(f => f.satisfaction < 25);
    const loyal = factions.filter(f => f.satisfaction > 75);

    if (angry.length > 0) {
      const names = angry.map(f => f.name).join(' y ');
      lines.push(`${names} ${angry.length > 1 ? 'claman' : 'clama'} contra las decisiones de la corte. Si el gobernante no atiende sus demandas, la conspiración es inevitable.`);
    }
    if (loyal.length > 0 && angry.length === 0) {
      const loyalName = loyal[0].name;
      lines.push(`${loyalName} permanece fiel al trono, agradecida por las políticas adoptadas en el último periodo.`);
    }

    // ── DIPLOMACIA — alianzas y relaciones ────────────────
    const allies = (s.diplomacy || []).filter(n => n.allied);
    const enemies = (s.diplomacy || []).filter(n => (n.relation || 0) < -50 && !n.atWar);
    const pendingAlliance = (s.diplomacy || []).filter(n => n._alliancePending);

    if (allies.length > 0) {
      lines.push(`La alianza con ${allies.map(n=>n.name).join(' y ')} permanece sellada con sangre y juramento. Los emisarios intercambian noticias con regularidad.`);
    }
    if (enemies.length > 0) {
      lines.push(`Las relaciones con ${enemies[0].name} son frías como el acero en invierno. Los diplomáticos caminan sobre ascuas.`);
    }
    if (pendingAlliance.length > 0) {
      lines.push(`Aguarda respuesta de ${pendingAlliance[0].name} sobre el tratado propuesto. La corte contiene el aliento esperando el veredicto.`);
    }

    // ── CIUDADES ──────────────────────────────────────────
    const cities = (s._cities || []).filter(c => c.owner === 'player');
    if (cities.length > 1) {
      const lowLoyalty = cities.filter(c => c.loyalty < 40);
      if (lowLoyalty.length > 0) {
        lines.push(`${lowLoyalty.map(c=>c.name).join(' y ')} muestran señales de descontento. La lealtad de sus gentes al trono es débil como llama al viento.`);
      }
    }
    if ((s._warsWon || 0) > 0) {
      lines.push(`El historial de victorias de ${s.civName || 'el reino'} —${s._warsWon} en total— ha labrado una reputación que los pueblos vecinos no ignoran.`);
    }

    // ── OBJETIVOS OCULTOS ────────────────────────────────
    const completed = (s._hiddenObjectives || []).filter(o => o.completed && o.revealed);
    if (completed.length > 0) {
      lines.push(`Los escribas anotan en letras de oro: "${completed[completed.length-1].label}" — un logro que pasará a los anales del reino.`);
    }

    // ── REPUTACIÓN ───────────────────────────────────────
    const rep = s._reputation || 50;
    if (rep < 0) {
      lines.push('El nombre del gobernante genera temor más que respeto en las cortes extranjeras. La infamia tiene sus usos, pero también sus costes.');
    } else if (rep > 75) {
      lines.push('La reputación del reino brilla con luz propia. Los embajadores extranjeros llegan con regalos y los poetas componen loas al gobierno.');
    }

    // ── CIERRE ───────────────────────────────────────────
    const closings = [
      'Así comienza un nuevo capítulo en la historia de este pueblo. Lo que sigue depende de las manos que sostienen el cetro.',
      'El destino aguarda, indiferente a los planes de los hombres. Que la sabiduría guíe las decisiones del turno que comienza.',
      'Los dados del destino ruedan una vez más. El pueblo mira a su gobernante esperando señales de esperanza o de tempestad.',
      'Sea cual sea el camino elegido, la historia juzgará con frialdad a quienes tuvieron el poder y supieron —o no— usarlo.',
    ];
    lines.push(closings[turn % closings.length]);

    return lines.join(' ');
  },

  // ── MOSTRAR MODAL ────────────────────────────────────────
  show(state, prev) {
    if (!state || (state.turn || 1) <= 1) return;

    const text = this.generateChronicle(state, prev);

    // Get or create the modal element
    var modal = document.getElementById('chronicle-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'chronicle-modal';
      document.body.appendChild(modal);
    }

    // Build full modal HTML
    modal.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(4,3,2,0.92);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(3px)" id="chr-backdrop">' +
        '<div style="background:linear-gradient(180deg,#1c1508,#0c0a04);border:1px solid #6a4a18;border-top:3px solid #c89020;border-bottom:3px solid #c89020;width:min(680px,92vw);max-height:80vh;display:flex;flex-direction:column;box-shadow:0 0 80px rgba(0,0,0,0.95)">' +
          '<div style="padding:20px 28px 12px;text-align:center;border-bottom:1px solid rgba(200,152,42,0.2)">' +
            '<div style="font-family:Cinzel,Georgia,serif;font-size:9px;color:rgba(200,152,42,0.4);letter-spacing:4px;margin-bottom:6px">✦ ─────── ✦</div>' +
            '<div style="font-family:Cinzel,Georgia,serif;font-size:18px;font-weight:700;color:#c89020;letter-spacing:3px;text-transform:uppercase;text-shadow:0 0 20px rgba(200,152,42,0.4)">📜 Crónica del Reino</div>' +
            '<div style="font-family:monospace;font-size:10px;color:#666;letter-spacing:2px;margin-top:4px">Año ' + (state.year||1) + ' · Turno ' + (state.turn||1) + '</div>' +
            '<div style="font-family:Cinzel,Georgia,serif;font-size:9px;color:rgba(200,152,42,0.4);letter-spacing:4px;margin-top:6px">✦ ─────── ✦</div>' +
          '</div>' +
          '<div style="padding:24px 32px;overflow-y:auto;flex:1">' +
            '<p style="font-family:Georgia,serif;font-size:17px;line-height:1.85;color:#d8c490;text-align:justify;margin:0">' +
              text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') +
            '</p>' +
          '</div>' +
          '<div style="padding:14px 28px 20px;text-align:center;border-top:1px solid rgba(200,152,42,0.15)">' +
            '<button onclick="ChronicleSystem.close()" style="font-family:Cinzel,Georgia,serif;font-size:12px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#0a0800;background:linear-gradient(180deg,#c89020,#a06810);border:none;padding:11px 32px;cursor:pointer;box-shadow:0 3px 14px rgba(200,152,42,0.4)">⚔ Continuar el reinado</button>' +
            '<div style="font-family:monospace;font-size:9px;color:#444;margin-top:8px">o pulsa ESC</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Show with inline styles — no CSS dependency
    modal.style.cssText = 'display:block;position:fixed;inset:0;z-index:9999;';

    // Click backdrop to close
    const backdrop = document.getElementById('chr-backdrop');
    if (backdrop) backdrop.onclick = (e) => { if (e.target === backdrop) this.close(); };
  },

  close() {
    const modal = document.getElementById('chronicle-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
      // Delay display:none until transition finishes
      setTimeout(() => {
        if (!modal.classList.contains('open')) {
          modal.style.display = 'none';
          // Reset so next show() starts fresh
          modal.style.display = '';
        }
      }, 400);
    }
  },

  // ── ESC KEY ──────────────────────────────────────────────
  initKeyListener() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }
};

// Init key listener on load
document.addEventListener('DOMContentLoaded', () => ChronicleSystem.initKeyListener());
