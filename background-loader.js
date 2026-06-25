(function () {
  const DEFAULT_THEME = 'classic';
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

    // Skip particle effects entirely when the OS/browser requests reduced motion.
    // This is critical on low-end Chromebooks where snow/fireworks can tank performance.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Handle special effects like snow or sparkles
    if (savedTheme === 'christmas') {
      if (!prefersReducedMotion && window.initSnow) window.initSnow();
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
      if (!prefersReducedMotion) initFireworks();
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
    function generateSalt(length) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let salt = '';
      for (let i = 0; i < length; i++) salt += chars.charAt(Math.floor(Math.random() * chars.length));
      return salt;
    }
    function toBase64(str) {
      try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
      } catch (e) { return btoa(str); }
    }
    function fromBase64(str) {
      try {
        return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      } catch (e) { return atob(str); }
    }
    return {
      encrypt: (dataObj) => {
        try {
          const json = JSON.stringify(dataObj);
          const checksum = djb2(json);
          const payload = `${json}|${checksum}`;
          const salt = generateSalt(4);
          const key = BASE_KEY + salt;
          const encrypted = rc4(key, payload);
          return toBase64(salt + encrypted);
        } catch (e) { return null; }
      },
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

  // Sitewide Streak Engine
  const StreakEngine = (() => {
    const STORAGE_KEY_V2 = 'streakDataV2';

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
    function validateStreakData(data) {
      if (!data) return false;
      if (data.freezes < 0 || data.freezes > 1000) return false;
      if (data.best < 0 || data.best > 10000) return false;
      if (!Array.isArray(data.visits) || !Array.isArray(data.usedFreezes)) return false;
      return true;
    }
    function mergeDayKeys(existing, add) {
      const set = new Set((existing || []).map(normalizeDayKey).filter(Boolean));
      const incoming = Array.isArray(add) ? add : [add];
      incoming.map(normalizeDayKey).filter(Boolean).forEach(k => set.add(k));
      return Array.from(set).sort();
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
    function computeStreakValue(data) {
      const today = normalizeToNoon(new Date());
      const todayKey = toDayKey(today);
      const result = computeEffectiveUsedSet(data, today);
      const effectiveUsedSet = result.set;
      let streak = 0;
      let streakActive = false;
      const visitsSet = new Set((data.visits || []).map(normalizeDayKey).filter(Boolean));
      const normalizedVisitsArr = (data.visits || []).map(normalizeDayKey).filter(Boolean);
      if (normalizedVisitsArr.length === 0) return 0;
      let earliestVisitStr = normalizedVisitsArr.reduce((min, v) => v < min ? v : min, normalizedVisitsArr[0]);
      let cursor = new Date(today);
      cursor.setHours(12, 0, 0, 0);
      while (true) {
        const key = toDayKey(cursor);
        if (key < earliestVisitStr) break;
        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        const hasVisit = visitsSet.has(key);
        const isSaved = effectiveUsedSet.has(key);
        if (hasVisit) {
          streak++; streakActive = true; 
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
    function getWeekKey(date) {
      const d = normalizeToNoon(date);
      const day = d.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - diffToMonday);
      monday.setHours(12, 0, 0, 0);
      return toDayKey(monday);
    }
    function migrateLegacyIntoV2(data) {
      const practiced = (() => {
        try { return JSON.parse(localStorage.getItem('practicedDays') || '[]'); } catch { return []; }
      })();
      const used = (() => {
        try { return JSON.parse(localStorage.getItem('usedFreezes') || '[]'); } catch { return []; }
      })();
      data.visits = mergeDayKeys(data.visits, practiced);
      data.usedFreezes = mergeDayKeys(data.usedFreezes, used);
      return data;
    }
    return {
      load: () => {
        let parsed = null;
        try {
          const stored = localStorage.getItem(STORAGE_KEY_V2);
          if (stored) {
            if (stored.startsWith('{')) parsed = JSON.parse(stored);
            else parsed = SecureStorage.decrypt(stored);
          }
        } catch (e) { console.error('Load failed', e); }
        const base = {
          version: 2, visits: [], freezes: Number(localStorage.getItem('streakFreezes') || 0) || 0,
          usedFreezes: [], lastFreezeWeek: null, best: Number(localStorage.getItem('bestStreak') || 0) || 0,
          forgivenessData: {}, checksum: null
        };
        if (!parsed) return base;
        const loaded = { ...base, ...parsed };
        return validateStreakData(loaded) ? loaded : base;
      },
      save: (data) => {
        if (!validateStreakData(data)) return;
        try {
          const secure = SecureStorage.encrypt(data);
          localStorage.setItem(STORAGE_KEY_V2, secure);
          localStorage.setItem('streakFreezes', String(data.freezes));
          localStorage.setItem('bestStreak', String(data.best));
        } catch (e) { console.error('Save failed', e); }
      },
      migrateLegacy: migrateLegacyIntoV2,
      recordVisit: (data) => {
        const today = normalizeToNoon(new Date());
        const key = toDayKey(today);
        data.visits = mergeDayKeys(data.visits, key);
        
        // Monday Bonus Logic
        if (today.getDay() === 1) {
          const weekKey = getWeekKey(today);
          if (data.lastFreezeWeek !== weekKey) {
            data.freezes = Math.max(0, Number(data.freezes) || 0) + 1;
            data.lastFreezeWeek = weekKey;
            console.log('Monday бонус: +1 Freeze');
            if (window.showToast) window.showToast('Monday bonus: +1 Freeze');
          }
        }
        return data;
      },
      compute: computeStreakValue,
      // Persist any freeze days that were auto-consumed since the last save.
      // Must be called after recordVisit so today's visit is already in data.visits.
      consumeFreezesIfNeeded: (data) => {
        const today = normalizeToNoon(new Date());
        const todayKey = toDayKey(today);
        const { set: effectiveUsed } = computeEffectiveUsedSet(data, today);

        const visitsSet = new Set((data.visits || []).map(normalizeDayKey).filter(Boolean));
        const alreadyUsedSet = new Set((data.usedFreezes || []).map(normalizeDayKey).filter(Boolean));

        const newlyConsumed = [];
        for (const key of effectiveUsed) {
          // Only persist past missed-weekdays that were covered — not visits, not already-saved, not today's grace
          if (!visitsSet.has(key) && !alreadyUsedSet.has(key) && key !== todayKey) {
            newlyConsumed.push(key);
          }
        }

        if (newlyConsumed.length > 0) {
          data.usedFreezes = mergeDayKeys(data.usedFreezes, newlyConsumed);
          data.freezes = Math.max(0, (Number(data.freezes) || 0) - newlyConsumed.length);
        }

        return data;
      }
    };
  })();
  window.StreakEngine = StreakEngine;

  function syncStreak() {
    const streakElements = document.querySelectorAll('.streak-count');
    
    try {
      let data = StreakEngine.load();
      data = StreakEngine.recordVisit(data);
      data = StreakEngine.consumeFreezesIfNeeded(data);
      const val = StreakEngine.compute(data);
      data.best = Math.max(data.best || 0, val);
      StreakEngine.save(data);
      
      if (streakElements.length > 0) {
        streakElements.forEach(el => { el.textContent = val; });
      }
      const streakNumber = document.getElementById('streakNumber');
      if (streakNumber) streakNumber.textContent = val;
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

