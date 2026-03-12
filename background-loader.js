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

  // --- SECURITY (Sync with index.html) ---
  const Obfuscator = (() => {
    const BASE_KEY = "STREAK_SECURE_KEY_V1";
    function rc4(key, str) {
      const s = [], res = [];
      let i, j, x, y;
      for (i = 0; i < 256; i++) s[i] = i;
      for (i = 0, j = 0; i < 256; i++) {
        j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
        x = s[i]; s[i] = s[j]; s[j] = x;
      }
      i = 0; j = 0;
      for (y = 0; y < str.length; y++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        x = s[i]; s[i] = s[j]; s[j] = x;
        res.push(String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]));
      }
      return res.join("");
    }
    function djb2(str) {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
      return hash;
    }
    return {
      decrypt: (base64Str) => {
        try {
          const raw = atob(base64Str);
          const salt = raw.substring(0, 4);
          const encrypted = raw.substring(4);
          const key = BASE_KEY + salt;
          const decrypted = rc4(key, encrypted);
          const lastPipe = decrypted.lastIndexOf('|');
          if (lastPipe === -1) return null;
          const json = decrypted.substring(0, lastPipe);
          const storedChecksum = parseInt(decrypted.substring(lastPipe + 1));
          if (djb2(json) !== storedChecksum) return null;
          return JSON.parse(json);
        } catch (e) { return null; }
      }
    };
  })();

  function syncStreak() {
    const streakElements = document.querySelectorAll('.streak-count');
    if (streakElements.length === 0) return;

    try {
      const stored = localStorage.getItem('streakDataV2');
      if (stored) {
        let data = null;
        if (stored.startsWith('{')) {
          data = JSON.parse(stored);
        } else {
          data = Obfuscator.decrypt(stored);
        }

        if (data) {
          // The streak is calculated dynamically on the main page, 
          // but we can try a basic count of visits or check if the streak was saved
          // For best accuracy, we'll try to find any saved streak value or just default to 0
          // Note: index.html calculates it on the fly. We'll show a fallback or 0 if not found.
          // However, we usually want the CURRENT computed streak.
          // Since we can't easily run the full logic here without duplicating 500 lines of code,
          // we'll rely on a shared value if available or show nothing.

          // Let's assume there might be a simpler way or we show "?" if uncertain
          streakElements.forEach(el => el.textContent = data.currentStreak || data.lastStreak || 0);
        }
      }
    } catch (e) {
      console.error('Error syncing streak:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyBackground();
    syncStreak();
  });
  window.addEventListener('storage', (event) => {
    if (['customBackground', 'bgType', 'selectedTheme'].includes(event.key)) {
      applyBackground();
    }
    if (event.key === 'streakDataV2') {
      syncStreak();
    }
  });

  // Expose for pages that want to re-run after their own UI interactions
  window.applyUserBackground = applyBackground;
  window.syncStreakDisplay = syncStreak;
})();

