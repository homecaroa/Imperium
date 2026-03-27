// ============================================================
// IMPERIUM — VISUAL.JS  (ES5-compatible rewrite)
// Animaciones canvas: login y start screen
// ============================================================

var _rgba = function(r,g,b,a){return 'rgba('+r+','+g+','+b+','+(a===undefined?1:a)+')';  };
var Visual = {

  loginAnim: null,
  startAnim: null,

  startLoginCanvas: function() {
    var canvas = document.getElementById('login-canvas');
    if (!canvas) return;
    var drawCtx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize);

    var stars = [];
    for (var s = 0; s < 180; s++) {
      stars.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        r: Math.random()*1.4+0.3, phase: Math.random()*Math.PI*2 });
    }
    var particles = [];
    for (var q = 0; q < 40; q++) {
      particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height+canvas.height*0.3,
        vx: (Math.random()-0.5)*0.4, vy: -(Math.random()*0.6+0.2),
        size: Math.random()*2+0.5, life: Math.random(), maxLife: Math.random()*200+100 });
    }

    var frame = 0;
    var self = Visual;
    function draw() {
      self.loginAnim = requestAnimationFrame(draw);
      drawCtx.clearRect(0, 0, canvas.width, canvas.height);
      var bg = drawCtx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, '#040302'); bg.addColorStop(0.4, '#080602'); bg.addColorStop(1, '#0c0804');
      drawCtx.fillStyle = bg; drawCtx.fillRect(0, 0, canvas.width, canvas.height);
      var fogX = canvas.width*0.5 + Math.sin(frame*0.004)*canvas.width*0.1;
      var fogY = canvas.height*0.45 + Math.cos(frame*0.003)*canvas.height*0.05;
      var fog = drawCtx.createRadialGradient(fogX, fogY, 0, fogX, fogY, canvas.width*0.55);
      fog.addColorStop(0, _rgba(200,160,48,0.045)); fog.addColorStop(1, 'transparent');
      drawCtx.fillStyle = fog; drawCtx.fillRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i]; st.phase += 0.01;
        var tw = 0.4 + 0.6*Math.abs(Math.sin(st.phase));
        drawCtx.beginPath(); drawCtx.arc(st.x, st.y, st.r, 0, Math.PI*2);
        drawCtx.fillStyle = _rgba(248,230,160,tw*0.8); drawCtx.fill();
      }
      for (var j = 0; j < particles.length; j++) {
        var p = particles[j]; p.x+=p.vx; p.y+=p.vy; p.life++;
        if (p.life > p.maxLife) { p.x=Math.random()*canvas.width; p.y=canvas.height*(0.5+Math.random()*0.5); p.life=0; p.maxLife=Math.random()*200+100; p.vx=(Math.random()-0.5)*0.4; p.vy=-(Math.random()*0.6+0.2); }
        var alpha = Math.sin((p.life/p.maxLife)*Math.PI)*0.7;
        drawCtx.beginPath(); drawCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        drawCtx.fillStyle = _rgba(200,160,48,alpha); drawCtx.fill();
      }
      drawCtx.strokeStyle=_rgba(58,44,24,0.12); drawCtx.lineWidth=0.5;
      for (var y = 0; y < canvas.height; y += 48) { drawCtx.beginPath(); drawCtx.moveTo(0,y); drawCtx.lineTo(canvas.width,y); drawCtx.stroke(); }
      frame++;
    }
    draw();
  },

  stopLoginCanvas: function() {
    if (this.loginAnim) { cancelAnimationFrame(this.loginAnim); this.loginAnim = null; }
  },

  startStartCanvas: function() {
    var canvas = document.getElementById('start-canvas');
    if (!canvas) return;
    var drawCtx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize);

    var stars = [];
    for (var s = 0; s < 120; s++) {
      stars.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height*0.7,
        r: Math.random()*1.2+0.2, phase: Math.random()*Math.PI*2, speed: Math.random()*0.02+0.01 });
    }
    var embers = [];
    for (var e = 0; e < 60; e++) { embers.push(Visual._newEmber(canvas)); }

    var frame = 0;
    var self = Visual;
    function draw() {
      self.startAnim = requestAnimationFrame(draw);
      drawCtx.clearRect(0, 0, canvas.width, canvas.height);
      var sky = drawCtx.createLinearGradient(0,0,0,canvas.height);
      sky.addColorStop(0,'#040302'); sky.addColorStop(0.5,'#080502'); sky.addColorStop(0.8,'#140a02'); sky.addColorStop(1,'#200e03');
      drawCtx.fillStyle=sky; drawCtx.fillRect(0,0,canvas.width,canvas.height);
      var hor = drawCtx.createLinearGradient(0,canvas.height*0.6,0,canvas.height);
      hor.addColorStop(0,'transparent'); hor.addColorStop(1,_rgba(180,80,10,0.15));
      drawCtx.fillStyle=hor; drawCtx.fillRect(0,0,canvas.width,canvas.height);
      var ga = 0.04+Math.sin(frame*0.03)*0.015;
      var glow = drawCtx.createRadialGradient(canvas.width/2,canvas.height*0.35,0,canvas.width/2,canvas.height*0.35,canvas.width*0.6);
      glow.addColorStop(0,_rgba(200,160,48,ga)); glow.addColorStop(0.6,'transparent');
      drawCtx.fillStyle=glow; drawCtx.fillRect(0,0,canvas.width,canvas.height);
      for (var i=0;i<stars.length;i++) {
        var st=stars[i]; st.phase+=st.speed;
        var tw=0.3+0.7*Math.abs(Math.sin(st.phase));
        drawCtx.beginPath(); drawCtx.arc(st.x,st.y,st.r,0,Math.PI*2);
        drawCtx.fillStyle=_rgba(248,230,160,tw*0.7); drawCtx.fill();
      }
      for (var j=0;j<embers.length;j++) {
        var em=embers[j]; em.y+=em.vy; em.x+=em.vx; em.life++; em.vx+=(Math.random()-0.5)*0.05;
        if (em.life>em.maxLife||em.y<0) { embers[j]=Visual._newEmber(canvas); continue; }
        var alpha=Math.sin((em.life/em.maxLife)*Math.PI)*0.9;
        var r=em.size*(1-em.life/em.maxLife*0.5);
        drawCtx.beginPath(); drawCtx.arc(em.x,em.y,r,0,Math.PI*2);
        drawCtx.fillStyle = em.hot ? _rgba(255,200,60,alpha) : _rgba(200,100,20,alpha); drawCtx.fill();
      }
      drawCtx.strokeStyle=_rgba(58,44,24,0.08); drawCtx.lineWidth=0.4;
      for (var y=0;y<canvas.height;y+=52) { drawCtx.beginPath(); drawCtx.moveTo(0,y); drawCtx.lineTo(canvas.width,y); drawCtx.stroke(); }
      frame++;
    }
    draw();
    this._createSparks();
  },

  _newEmber: function(canvas) {
    return { x: Math.random()*(canvas?canvas.width:1920), y: (canvas?canvas.height:1080)*(0.7+Math.random()*0.3),
      vx: (Math.random()-0.5)*0.8, vy: -(Math.random()*1.2+0.4),
      size: Math.random()*2+0.8, life: 0, maxLife: Math.random()*120+60, hot: Math.random()>0.6 };
  },

  _createSparks: function() {
    var container = document.getElementById('start-particles');
    if (!container) return;
    container.innerHTML = '';
    var colors = [_rgba(255,200,60,0.9),_rgba(255,160,40,0.8),_rgba(200,120,20,0.7),_rgba(248,230,160,0.9)];
    for (var i = 0; i < 30; i++) {
      var spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.cssText = 'left:'+(Math.random()*100)+'%;bottom:'+(Math.random()*30)+'%;'
        +'--dx:'+((Math.random()-0.5)*60)+'px;animation-duration:'+(Math.random()*4+2)+'s;'
        +'animation-delay:'+(Math.random()*3)+'s;width:'+(Math.random()*3+1)+'px;'
        +'height:'+(Math.random()*3+1)+'px;background:'+colors[Math.floor(Math.random()*colors.length)];
      container.appendChild(spark);
    }
  },

  stopStartCanvas: function() {
    if (this.startAnim) { cancelAnimationFrame(this.startAnim); this.startAnim = null; }
  },

  transition: function(fromId, toId) {
    var from = document.getElementById(fromId);
    var to   = document.getElementById(toId);
    if (!from || !to) {
      if (to) { if(from) from.classList.remove('active'); to.classList.add('active'); }
      return;
    }
    from.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
    from.style.opacity    = '0';
    from.style.transform  = 'scale(1.02)';
    setTimeout(function() {
      from.classList.remove('active');
      from.style.opacity = ''; from.style.transform = ''; from.style.transition = '';
      to.classList.add('active');
      to.style.opacity = '0'; to.style.transition = 'opacity 0.35s ease';
      setTimeout(function() {
        to.style.opacity = '1';
        setTimeout(function() { to.style.opacity = ''; to.style.transition = ''; }, 350);
      }, 20);
    }, 450);
  },

  init: function() {
    Visual.startLoginCanvas();
    var origShowScreen = window.showScreen;
    window.showScreen = function(id) {
      if (id === 'screen-login') { Visual.stopStartCanvas(); setTimeout(function(){ Visual.startLoginCanvas(); }, 50); }
      if (id === 'screen-start') { Visual.stopLoginCanvas(); setTimeout(function(){ Visual.startStartCanvas(); }, 50); }
      var current = document.querySelector('.screen.active');
      if (current && current.id !== id) {
        Visual.transition(current.id, id);
      } else {
        if (origShowScreen) origShowScreen(id);
        else {
          document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
          var el = document.getElementById(id);
          if (el) el.classList.add('active');
        }
      }
    };
  }
};

document.addEventListener('DOMContentLoaded', function() { Visual.init(); });
