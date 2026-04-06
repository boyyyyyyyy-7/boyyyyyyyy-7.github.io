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
  // Renamed and improved for Brave/Shields compatibility
  const SecureStorage = (() => {
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
    function fromBase64(str) {
      try {
        return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      } catch (e) { return atob(str); }
    }
    return {
      decrypt: (base64Str) => {
        try {
          const raw = fromBase64(base64Str);
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
  window.Obfuscator = SecureStorage;

  // Lightweight streak engine for non-main pages
  const StreakEngine = (() => {
    function normalizeToNoon(date) {
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      return d;
    }
    function toDayKey(date) {
      const d = normalizeToNoon(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    function parseDayKey(key) {
      if (!key) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const d = new Date(`${key}T12:00:00`);
        return Number.isNaN(d.getTime()) ? null : normalizeToNoon(d);
      }
      const legacy = new Date(key);
      return Number.isNaN(legacy.getTime()) ? null : normalizeToNoon(legacy);
    }
    function normalizeDayKey(value) {
      const parsed = parseDayKey(value);
      return parsed ? toDayKey(parsed) : null;
    }
    function getDayDiff(a, b) {
      const start = normalizeToNoon(a);
      const end = normalizeToNoon(b);
      return Math.round((end - start) / (1000 * 60 * 60 * 24));
    }
    function computeEffectiveUsedSet(data, date = new Date()) {
      const today = normalizeToNoon(date);
      const todayKey = toDayKey(today);
      const visitsSet = new Set((data.visits || []).map(normalizeDayKey).filter(Boolean));
      const originalUsedSet = new Set((data.usedFreezes || []).map(normalizeDayKey).filter(Boolean));
      const normalizedVisitsArr = (data.visits || []).map(normalizeDayKey).filter(Boolean);
      if (normalizedVisitsArr.length === 0) return { set: new Set(), freezesNew: 0 };
      let earliestVisitStr = normalizedVisitsArr.reduce((min, v) => v < min ? v : min, normalizedVisitsArr[0]);
      let available = Math.max(0, Number(data.freezes) || 0);
      let freezesNew = 0;
      const effectiveUsed = new Set();
      for (const key of originalUsedSet) effectiveUsed.add(key);
      let cursor = new Date(today);
      cursor.setHours(12, 0, 0, 0);
      let pending = [];
      while (getDayDiff(cursor, today) < 365) {
        const key = toDayKey(cursor);
        if (key < earliestVisitStr) break;
        const hasVisit = visitsSet.has(key);
        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        if (hasVisit || originalUsedSet.has(key)) {
          pending.forEach(p => { effectiveUsed.add(p.key); if (p.type === 'freeze' && p.key < todayKey) freezesNew++; });
          pending = [];
        } else if (!isWeekend) {
          if (key === todayKey) {
            pending.push({ key: key, type: 'grace' });
          } else if (available > 0) { 
            pending.push({ key: key, type: 'freeze' }); available--; 
          } else if (data.forgivenessData && data.forgivenessData[key]) {
            pending.push({ key: key, type: 'forgiveness' });
          } else break;
        }
        if (pending.length > 7) break;
        cursor.setDate(cursor.getDate() - 1);
        cursor.setHours(12, 0, 0, 0);
      }
      return { set: effectiveUsed, freezesNew: freezesNew };
    }
    function recordVisit(data, date) {
      const key = toDayKey(normalizeToNoon(date));
      const visits = (data.visits || []).map(normalizeDayKey).filter(Boolean);
      if (!visits.includes(key)) visits.push(key);
      return Object.assign({}, data, { visits: visits });
    }
    return {
      recordVisit: recordVisit,
      compute: (data) => {
        const today = normalizeToNoon(new Date());
        const todayKey = toDayKey(today);
        const effectiveUsedSet = computeEffectiveUsedSet(data, today).set;
        let streak = 0;
        let streakActive = false;
        const normalizedVisitsArr = (data.visits || []).map(normalizeDayKey).filter(Boolean);
        const visitsSet = new Set(normalizedVisitsArr);
        let earliestVisitStr = normalizedVisitsArr.length > 0 ? normalizedVisitsArr.reduce((min, v) => v < min ? v : min, normalizedVisitsArr[0]) : todayKey;
        let cursor = new Date(today);
        cursor.setHours(12, 0, 0, 0);
        while (true) {
          const key = toDayKey(cursor);
          if (key < earliestVisitStr) break;
          const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
          const hasVisit = visitsSet.has(key);
          const isSaved = effectiveUsedSet.has(key);
          if (hasVisit) {
            streak++; 
            streakActive = true; 
          } else if (isSaved) {
            if (streakActive) streak++;
          } else if (!isWeekend) {
            if (key !== todayKey || streakActive) break;
          }
          cursor.setDate(cursor.getDate() - 1);
          cursor.setHours(12, 0, 0, 0);
          if (getDayDiff(cursor, today) > 365) break;
        }
        return streak;
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
          data = StreakEngine.recordVisit(data, new Date());
          const val = StreakEngine.compute(data);
          // Always update all streak elements on all pages with the real computed value
          streakElements.forEach(el => {
            el.textContent = val;
          });
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

