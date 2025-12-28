(function () {
  const DEFAULT_THEME = 'christmas';
  const THEME_BACKGROUNDS = {
    classic: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    light: 'linear-gradient(135deg, #f6f7fb 0%, #e5e7eb 100%)',
    christmas: 'linear-gradient(135deg, #1a2b3c 0%, #0d1a26 100%)',
    newyears: 'linear-gradient(135deg, #0a0a14 0%, #1a0f2e 50%, #2d1b4e 100%)'
  };

  const THEME_CLASSES = ['classic-theme', 'light-theme', 'christmas-theme', 'newyears-theme'];

  function setBackground(body, bgValue) {
    if (!body || !bgValue) return;

    // Clear existing inline values before applying new ones
    body.style.backgroundImage = '';
    body.style.backgroundColor = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundAttachment = '';

    if (bgValue.startsWith('url')) {
      body.style.backgroundImage = bgValue;
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundAttachment = 'fixed';
    } else if (bgValue.startsWith('linear-gradient')) {
      body.style.backgroundImage = bgValue;
      body.style.backgroundSize = 'cover';
      body.style.backgroundAttachment = 'fixed';
    } else {
      body.style.backgroundColor = bgValue;
    }
  }

  function applyBackground() {
    const body = document.body;
    if (!body) return;

    const savedBg = localStorage.getItem('customBackground');
    const savedTheme = localStorage.getItem('selectedTheme') || DEFAULT_THEME;

    // Remove theme classes to avoid stale styles on pages that define them
    body.classList.remove(...THEME_CLASSES);

    if (savedBg) {
      setBackground(body, savedBg);
      return;
    }

    const themeBackground = THEME_BACKGROUNDS[savedTheme] || THEME_BACKGROUNDS[DEFAULT_THEME];
    setBackground(body, themeBackground);

    // Add theme class in case the page defines theme-specific styles
    body.classList.add(`${savedTheme}-theme`);

    // Inject global theme styles for special animations (like New Year)
    let themeStyle = document.getElementById('theme-specific-styles');
    if (!themeStyle) {
      themeStyle = document.createElement('style');
      themeStyle.id = 'theme-specific-styles';
      document.head.appendChild(themeStyle);
    }

    // Handle special effects like snow or sparkles
    if (savedTheme === 'christmas') {
      if (window.initSnow) window.initSnow();
      stopFireworks(); // Stop fireworks if switching to Christmas
      themeStyle.textContent = '';
    } else if (savedTheme === 'newyears') {
      if (window.clearSnow) window.clearSnow();
      themeStyle.textContent = `
        body.newyears-theme {
          background: linear-gradient(135deg, #050510 0%, #100a20 50%, #1a1030 100%) !important;
        }
        #newyears-canvas {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          pointer-events: none;
          z-index: 0;
        }
        .content-wrapper, .container, main, section, header {
          position: relative;
          z-index: 1;
        }
      `;
      initFireworks();
    } else {
      if (window.clearSnow) window.clearSnow();
      stopFireworks();
      themeStyle.textContent = '';
    }

    // Update stars on index page if applicable
    if (window.updateStarsForTheme) {
      window.updateStarsForTheme(savedTheme);
    }
  }

  function stopFireworks() {
    const canvas = document.getElementById('newyears-canvas');
    if (canvas) canvas.remove();
    if (window.nyFireworksInterval) {
      clearInterval(window.nyFireworksInterval);
      window.nyFireworksInterval = null;
    }
  }

  function initFireworks() {
    stopFireworks();
    const canvas = document.createElement('canvas');
    canvas.id = 'newyears-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let width, height;
    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    const colors = ['#FFD700', '#FF69B4', '#00FFFF', '#FF4500', '#ADFF2F', '#FFFFFF'];

    class Particle {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = {
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 8
        };
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.015;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
      }
      update() {
        this.velocity.y += 0.05; // gravity
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= this.decay;
      }
    }

    function createFirework(x, y) {
      const count = 40 + Math.random() * 40;
      const fireworkColor = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, fireworkColor));
      }
    }

    function animate() {
      if (!document.getElementById('newyears-canvas')) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) {
          particles.splice(i, 1);
        }
      }
      requestAnimationFrame(animate);
    }

    animate();
    window.nyFireworksInterval = setInterval(() => {
      createFirework(Math.random() * width, Math.random() * height * 0.6);
    }, 1500);
  }

  document.addEventListener('DOMContentLoaded', applyBackground);
  window.addEventListener('storage', (event) => {
    if (['customBackground', 'bgType', 'selectedTheme'].includes(event.key)) {
      applyBackground();
    }
  });

  // Expose for pages that want to re-run after their own UI interactions
  window.applyUserBackground = applyBackground;
})();

