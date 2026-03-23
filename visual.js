// ============================================================
// IMPERIUM — VISUAL.JS
// Animaciones de pantallas de login y inicio
// Canvas con partículas, estrellas, llamas y efectos de entrada
// ============================================================

const Visual = {

  // ── LOGIN CANVAS — campo estelar con niebla dorada ──────
  loginAnim: null,

  startLoginCanvas() {
    const canvas = document.getElementById('login-canvas');
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Estrellas
    const stars = Array.from({length: 180}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      speed: Math.random() * 0.3 + 0.05,
      brightness: Math.random(),
      phase: Math.random() * Math.PI * 2
    }));

    // Partículas doradas flotantes
    const particles = Array.from({length: 40}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height + canvas.height * 0.3,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(Math.random() * 0.6 + 0.2),
      size: Math.random() * 2 + 0.5,
      life: Math.random(),
      maxLife: Math.random() * 200 + 100
    }));

    let frame = 0;
    const draw = () => {
      this.loginAnim = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fondo — gradiente oscuro con venas doradas
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0,   '#04030100');
      bg.addColorStop(0.4, '#080602ff');
      bg.addColorStop(1,   '#0c0804ff');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Niebla dorada
      const fogX = canvas.width  * 0.5 + Math.sin(frame * 0.004) * canvas.width * 0.1;
      const fogY = canvas.height * 0.45 + Math.cos(frame * 0.003) * canvas.height * 0.05;
      const fog  = ctx.createRadialGradient(fogX, fogY, 0, fogX, fogY, canvas.width * 0.55);
      fog.addColorStop(0,    'rgba(200,160,48,0.045)');
      fog.addColorStop(0.5,  'rgba(160,100,20,0.02)');
      fog.addColorStop(1,    'transparent');
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Estrellas
      stars.forEach(s => {
        const twinkle = 0.4 + 0.6 * Math.sin(s.phase + frame * 0.02 * s.speed);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(248,230,160,${twinkle * 0.8})`;
        ctx.fill();
        s.phase += 0.01;
      });

      // Partículas flotantes doradas
      particles.forEach(p => {
        p.x  += p.vx; p.y  += p.vy; p.life++;
        if (p.life > p.maxLife) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height * (0.5 + Math.random() * 0.5);
          p.life = 0; p.maxLife = Math.random() * 200 + 100;
          p.vx = (Math.random() - 0.5) * 0.4;
          p.vy = -(Math.random() * 0.6 + 0.2);
        }
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,160,48,${alpha})`;
        ctx.fill();
      });

      // Líneas horizontales tenues (pergamino)
      ctx.strokeStyle = 'rgba(58,44,24,0.12)';
      ctx.lineWidth   = 0.5;
      for (let y = 0; y < canvas.height; y += 48) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
      }

      frame++;
    };
    draw();
  },

  stopLoginCanvas() {
    if (this.loginAnim) { cancelAnimationFrame(this.loginAnim); this.loginAnim = null; }
  },

  // ── START SCREEN — campo de batalla con brasas ──────────
  startAnim: null,
  sparkTimer: null,

  startStartCanvas() {
    const canvas = document.getElementById('start-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Estrellas de fondo
    const stars = Array.from({length: 120}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.7,
      r: Math.random() * 1.2 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01
    }));

    // Brasas / partículas de fuego en la parte baja
    const embers = Array.from({length: 60}, () => this._newEmber(canvas));

    let frame = 0;
    const draw = () => {
      this.startAnim = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fondo cielo nocturno
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0,   '#040302');
      sky.addColorStop(0.5, '#080502');
      sky.addColorStop(0.8, '#140a02');
      sky.addColorStop(1,   '#200e03');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Niebla de horizonte
      const hor = ctx.createLinearGradient(0, canvas.height*0.6, 0, canvas.height);
      hor.addColorStop(0,   'transparent');
      hor.addColorStop(0.5, 'rgba(120,60,10,0.08)');
      hor.addColorStop(1,   'rgba(180,80,10,0.15)');
      ctx.fillStyle = hor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Resplandor central dorado (reflejo de la antorcha)
      const glow = ctx.createRadialGradient(
        canvas.width/2, canvas.height * 0.35, 0,
        canvas.width/2, canvas.height * 0.35, canvas.width * 0.6
      );
      glow.addColorStop(0,   `rgba(200,160,48,${0.04 + Math.sin(frame*0.03)*0.015})`);
      glow.addColorStop(0.6, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Estrellas
      stars.forEach(s => {
        s.phase += s.speed;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(248,230,160,${tw * 0.7})`;
        ctx.fill();
      });

      // Brasas flotantes
      embers.forEach((e, i) => {
        e.y  += e.vy; e.x  += e.vx; e.life++;
        e.vx += (Math.random()-0.5) * 0.05; // drift
        if (e.life > e.maxLife || e.y < 0) embers[i] = this._newEmber(canvas);
        const alpha = Math.sin((e.life / e.maxLife) * Math.PI) * 0.9;
        const r = e.size * (1 - e.life / e.maxLife * 0.5);
        // Core
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${e.hot ? '255,200,60' : '200,100,20'},${alpha})`;
        ctx.fill();
        // Glow
        if (e.hot) {
          ctx.beginPath(); ctx.arc(e.x, e.y, r*3, 0, Math.PI*2);
          const gg = ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,r*3);
          gg.addColorStop(0, `rgba(255,200,60,${alpha*0.3})`);
          gg.addColorStop(1, 'transparent');
          ctx.fillStyle = gg; ctx.fill();
        }
      });

      // Grid de líneas horizontales estilo pergamino
      ctx.strokeStyle = 'rgba(58,44,24,0.08)';
      ctx.lineWidth = 0.4;
      for (let y = 0; y < canvas.height; y += 52) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
      }

      frame++;
    };
    draw();

    // Chispas CSS con JS
    this._createSparks();
  },

  _newEmber(canvas) {
    return {
      x:       Math.random() * canvas.width,
      y:       canvas.height * (0.7 + Math.random() * 0.3),
      vx:      (Math.random()-0.5) * 0.8,
      vy:      -(Math.random() * 1.2 + 0.4),
      size:    Math.random() * 2 + 0.8,
      life:    0,
      maxLife: Math.random() * 120 + 60,
      hot:     Math.random() > 0.6
    };
  },

  _createSparks() {
    const container = document.getElementById('start-particles');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 30; i++) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.cssText = [
        'left:'    + (Math.random() * 100) + '%',
        'bottom:'  + (Math.random() * 30)  + '%',
        '--dx:'    + ((Math.random()-0.5) * 60) + 'px',
        'animation-duration:' + (Math.random() * 4 + 2) + 's',
        'animation-delay:'    + (Math.random() * 3)     + 's',
        'width:'   + (Math.random() * 3 + 1) + 'px',
        'height:'  + (Math.random() * 3 + 1) + 'px',
        'background: rgba(' + [
          'rgba(255,200,60,0.9)',
          'rgba(255,160,40,0.8)',
          'rgba(200,120,20,0.7)',
          'rgba(248,230,160,0.9)'
        ][Math.floor(Math.random()*4)] + ')'
      ].join(';');
      container.appendChild(spark);
    }
  },

  stopStartCanvas() {
    if (this.startAnim) { cancelAnimationFrame(this.startAnim); this.startAnim = null; }
  },

  // ── TRANSICIÓN ENTRE PANTALLAS ──────────────────────────
  transition(fromId, toId, callback) {
    const from = document.getElementById(fromId);
    const to   = document.getElementById(toId);
    if (!from || !to) { if(callback) callback(); return; }

    from.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    from.style.opacity    = '0';
    from.style.transform  = 'scale(1.02)';

    setTimeout(() => {
      from.classList.remove('active');
      from.style.opacity   = '';
      from.style.transform = '';
      from.style.transition= '';
      to.classList.add('active');
      to.style.opacity     = '0';
      to.style.transition  = 'opacity 0.4s ease';
      setTimeout(() => { to.style.opacity = '1'; setTimeout(() => { to.style.opacity=''; to.style.transition=''; if(callback) callback(); }, 400); }, 30);
    }, 500);
  },

  // ── INICIALIZACIÓN ───────────────────────────────────────
  init() {
    // Arrancar canvas del login
    this.startLoginCanvas();

    // Cuando se va al start screen, arrancar su canvas
    const origShowScreen = window.showScreen;
    window.showScreen = (id) => {
      if (id === 'screen-login') {
        this.stopStartCanvas();
        setTimeout(() => this.startLoginCanvas(), 50);
      }
      if (id === 'screen-start') {
        this.stopLoginCanvas();
        setTimeout(() => this.startStartCanvas(), 50);
      }
      // Usar transición suave
      const current = document.querySelector('.screen.active');
      if (current && current.id !== id) {
        this.transition(current.id, id);
      } else {
        if (origShowScreen) origShowScreen(id);
        else {
          document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
          const el = document.getElementById(id);
          if (el) el.classList.add('active');
        }
      }
    };
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Visual.init();
});
