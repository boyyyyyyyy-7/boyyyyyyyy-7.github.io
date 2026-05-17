// ============================================================
//  BITG Streak System — Version 3
//  braydenistallgames.online
//
//  Drop-in replacement for the v2 streak logic that was baked
//  into background-loader.js. See README-streak.md for the
//  step-by-step swap-out guide.
//
//  What's fixed vs v2:
//    - Zero UTC logic. All dates use local year/month/day parts.
//      Streaks no longer reset at 8 PM for EST users.
//    - Streak calculation is a clean forward-readable loop,
//      not a fragile backwards-iteration with nested states.
//    - Freezes are tracked by day key so they are never
//      double-consumed across sessions.
//
//  localStorage keys (prefixed to avoid v2 collision):
//    bitg_streak      — visit history, current + best streak
//    bitg_freeze      — freeze inventory + Monday bonus tracking
//    bitg_milestones  — which milestone toasts have been shown
//
//  REQUIRES: bitg-crypto.js must be loaded BEFORE this file.
//  All three records above are stored as encrypted envelopes
//  so students can't trivially edit them in DevTools.
//  If crypto is unavailable, falls back to plaintext JSON.
//
//  Public API (window.BITG_Streak):
//    .init()          — call once; runs automatically on load
//    .getStreak()     — returns current streak number
//    .getBest()       — returns all-time best streak
//    .getFreezes()    — returns available freeze count
//    .syncDisplay()   — re-pushes streak to all DOM targets
//    .addFreeze(n)    — award n freezes (future rewards system)
//    .reset()         — wipe all v3 data (dev/testing only)
// ============================================================

(function () {
  'use strict';

  // ──────────────────────────────────────────────────────────
  //  CONFIGURATION
  //  All tuneable values live here — easy to build on top of.
  // ──────────────────────────────────────────────────────────
  var CONFIG = {
    // localStorage keys — all prefixed with bitg_ to avoid
    // collisions with the old v2 keys (streakDataV2, etc.)
    KEYS: {
      streak:     'bitg_streak',
      freeze:     'bitg_freeze',
      milestones: 'bitg_milestones'
    },

    // Days that trigger a one-time milestone notification.
    // Add more numbers here to create new milestones.
    MILESTONES: [3, 7, 14, 30],

    // CSS selectors that display the streak number on screen.
    // Matches the same targets v2 used, so no HTML changes needed.
    DOM_TARGETS: ['.streak-count', '#streakNumber'],

    // How long milestone notifications stay visible (milliseconds)
    MILESTONE_DURATION: 6000,

    // How long the Monday bonus toast stays visible (milliseconds)
    TOAST_DURATION: 3500,

    // Encrypt all stored records via bitg-crypto.js.
    // Set to false for local development if you want to inspect
    // raw JSON in DevTools. Production should always be true.
    ENCRYPTION_ENABLED: true
  };


  // ──────────────────────────────────────────────────────────
  //  STORAGE WRAPPERS
  //  Centralize the read/write/encrypt/decrypt logic so every
  //  record (streak, freeze, milestones) goes through the same
  //  path. If BITGCrypto isn't loaded, we silently fall back to
  //  plaintext JSON — the rest of the system keeps working.
  // ──────────────────────────────────────────────────────────

  // True only when crypto is available AND enabled in CONFIG
  function cryptoActive() {
    return CONFIG.ENCRYPTION_ENABLED && typeof window.BITGCrypto === 'object';
  }

  // Read a raw localStorage string and turn it into an object.
  // Handles three cases transparently:
  //   1. Encrypted envelope (v1:...) → decrypt
  //   2. Plaintext JSON (from a pre-encryption v3 install) → parse and silently re-save encrypted on next write
  //   3. Anything else → null
  function readRecord(key) {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      if (cryptoActive() && window.BITGCrypto.isEncrypted(raw)) {
        return window.BITGCrypto.decrypt(raw);
      }
      // Legacy plaintext (from before encryption was added) — accept once
      if (raw.charAt(0) === '{' || raw.charAt(0) === '[') {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[BITG Streak v3] Could not parse record ' + key + ':', e);
    }
    return null;
  }

  // Write an object to localStorage, encrypting if available.
  function writeRecord(key, obj) {
    try {
      var serialized;
      if (cryptoActive()) {
        serialized = window.BITGCrypto.encrypt(obj);
        // If encryption fails for any reason, fall back to JSON so we
        // don't silently lose the user's streak.
        if (!serialized) serialized = JSON.stringify(obj);
      } else {
        serialized = JSON.stringify(obj);
      }
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn('[BITG Streak v3] Could not write record ' + key + ':', e);
    }
  }


  // ──────────────────────────────────────────────────────────
  //  LOCAL DATE HELPERS
  //
  //  THE KEY FIX: We never call new Date('YYYY-MM-DD').
  //  JavaScript treats bare date strings as UTC midnight, which
  //  shifts the calendar day by your timezone offset. A student
  //  in EST (UTC-5) would see "today" become "yesterday" at 7 PM.
  //
  //  Instead, we always pull year/month/day from the explicit
  //  getter methods — those always return LOCAL time values.
  // ──────────────────────────────────────────────────────────

  // Returns today as a "YYYY-MM-DD" string in the user's LOCAL timezone.
  function getTodayKey() {
    var now = new Date();
    var y   = now.getFullYear();
    var m   = String(now.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
    var d   = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // Converts a "YYYY-MM-DD" string back to a local Date object.
  // Uses new Date(year, month, day) — the multi-arg constructor
  // always uses local time, never UTC. Safe.
  function keyToLocalDate(key) {
    var parts = key.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    var d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }

  // Returns the "YYYY-MM-DD" key for a date that is `n` days before
  // the given key. E.g. dateOffset('2026-05-17', 1) = '2026-05-16'.
  function dateOffset(key, daysBack) {
    var date = keyToLocalDate(key);
    date.setDate(date.getDate() - daysBack);
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // Returns true if the given date key falls on Saturday or Sunday.
  function isWeekend(key) {
    var dow = keyToLocalDate(key).getDay(); // 0 = Sunday, 6 = Saturday
    return dow === 0 || dow === 6;
  }

  // Returns a unique string for the calendar week containing a date key.
  // Used to track whether the Monday bonus was already given this week.
  // Format: "YYYY-MM-DD" of the Monday that started that week.
  function getWeekId(key) {
    var date = keyToLocalDate(key);
    var dow  = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    var diffToMonday = (dow + 6) % 7; // how many days since Monday
    date.setDate(date.getDate() - diffToMonday);
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return 'week-' + y + '-' + m + '-' + d;
  }


  // ──────────────────────────────────────────────────────────
  //  STORAGE — STREAK DATA
  //
  //  Stored in localStorage under 'bitg_streak'.
  //  Shape:
  //  {
  //    version:   3,
  //    current:   5,              — current streak (weekdays only)
  //    best:      12,             — all-time best streak
  //    lastVisit: "2026-05-17",   — last day a visit was logged
  //    history:   ["2026-05-13", "2026-05-17", ...]  — all visit days
  //  }
  // ──────────────────────────────────────────────────────────

  function loadStreakData() {
    var parsed = readRecord(CONFIG.KEYS.streak);
    // Only trust data that looks like a valid v3 record
    if (parsed && parsed.version === 3 && Array.isArray(parsed.history)) {
      return parsed;
    }
    // Return a fresh default record if nothing valid is stored
    return {
      version:   3,
      current:   0,
      best:      0,
      lastVisit: null,
      history:   []
    };
  }

  function saveStreakData(data) {
    writeRecord(CONFIG.KEYS.streak, data);
  }


  // ──────────────────────────────────────────────────────────
  //  STORAGE — FREEZE DATA
  //
  //  Stored in localStorage under 'bitg_freeze'.
  //  Shape:
  //  {
  //    available:       2,              — how many freezes the user has
  //    used:            ["2026-05-10"], — days a freeze was auto-applied
  //    lastMondayBonus: "week-2026-05-11" — weekId of last Monday bonus
  //  }
  // ──────────────────────────────────────────────────────────

  function loadFreezeData() {
    var parsed = readRecord(CONFIG.KEYS.freeze);
    if (parsed && typeof parsed.available === 'number' && Array.isArray(parsed.used)) {
      return parsed;
    }
    return {
      available:       0,
      used:            [],
      lastMondayBonus: null
    };
  }

  function saveFreezeData(data) {
    writeRecord(CONFIG.KEYS.freeze, data);
  }


  // ──────────────────────────────────────────────────────────
  //  STORAGE — MILESTONE DATA
  //
  //  Stored in localStorage under 'bitg_milestones'.
  //  Shape:
  //  {
  //    shown: [3, 7]  — milestone numbers already displayed
  //  }
  // ──────────────────────────────────────────────────────────

  function loadMilestoneData() {
    var parsed = readRecord(CONFIG.KEYS.milestones);
    if (parsed && Array.isArray(parsed.shown)) return parsed;
    return { shown: [] };
  }

  function saveMilestoneData(data) {
    writeRecord(CONFIG.KEYS.milestones, data);
  }


  // ──────────────────────────────────────────────────────────
  //  VISIT RECORDING
  //
  //  Adds today to the history array if not already present.
  //  Also handles the Monday Bonus: +1 free freeze every Monday.
  //  Modifies streakData and freezeData in place.
  // ──────────────────────────────────────────────────────────

  function recordVisit(streakData, freezeData) {
    var today = getTodayKey();

    // Only add today if it hasn't been recorded yet
    if (streakData.history.indexOf(today) === -1) {
      streakData.history.push(today);
      streakData.lastVisit = today;
    }

    // ── Monday Bonus ──────────────────────────────────────
    // Award +1 freeze on Mondays, once per week.
    // getDay() === 1 means Monday in local time.
    var dow    = keyToLocalDate(today).getDay();
    var weekId = getWeekId(today);

    if (dow === 1 && freezeData.lastMondayBonus !== weekId) {
      freezeData.available      += 1;
      freezeData.lastMondayBonus = weekId;
      // Show a small toast — the full notification fires after init() finishes.
      // The emoji is passed as plain text; showToast() wraps it in the bitg-emoji span.
      setTimeout(function () {
        showToast('Monday bonus: +1 Streak Freeze!', '🧊');
      }, 800);
      console.log('[BITG Streak v3] Monday bonus awarded. Freezes now:', freezeData.available);
    }
  }


  // ──────────────────────────────────────────────────────────
  //  STREAK CALCULATION
  //
  //  How it works:
  //    1. Build a Set of all visited day keys for O(1) lookup.
  //    2. Build a Set of days where a freeze was already used,
  //       so we never double-consume a freeze across sessions.
  //    3. Start from today and walk backwards one day at a time.
  //    4. Rules per day (checked in this order):
  //         a. In visitSet?           → count it, continue
  //         b. Weekend?               → skip (no break, no count)
  //         c. In usedFreezeSet?      → freeze already applied, count it
  //         d. Available freeze left? → use one, record it, count it
  //         e. None of the above      → streak broken, stop
  //    5. Return final count.
  //
  //  Side effect: if new freezes are consumed, freezeData is
  //  updated and saved before this function returns.
  // ──────────────────────────────────────────────────────────

  function computeStreak(streakData, freezeData) {
    // Nothing to count if the history is empty
    if (!streakData.history || streakData.history.length === 0) return 0;

    var visitSet      = new Set(streakData.history);
    var usedFreezeSet = new Set(freezeData.used);
    var today         = getTodayKey();
    var streak        = 0;
    var freezesLeft   = freezeData.available;
    var newlyUsed     = []; // freezes consumed in this session

    for (var i = 0; i <= 365; i++) {
      var key = dateOffset(today, i);

      if (visitSet.has(key)) {
        // ✓ Visited this day — count it
        streak++;

      } else if (isWeekend(key)) {
        // Weekend with no visit — forgiven, never breaks streak.
        // If streak hasn't started yet, just keep walking back.
        // If streak is active, skip over the weekend day silently.
        continue;

      } else if (usedFreezeSet.has(key)) {
        // A freeze was already recorded for this day from a previous
        // session — honor it without consuming another freeze.
        streak++;

      } else if (freezesLeft > 0) {
        // Weekday, no visit, freeze available — auto-use one.
        freezesLeft--;
        newlyUsed.push(key);
        streak++;

      } else {
        // Weekday, no visit, no freezes — streak is broken.
        break;
      }
    }

    // Persist any newly consumed freezes so they aren't double-charged
    if (newlyUsed.length > 0) {
      freezeData.available = freezesLeft;
      newlyUsed.forEach(function (k) {
        freezeData.used.push(k);
      });
      saveFreezeData(freezeData);
    }

    return streak;
  }


  // ──────────────────────────────────────────────────────────
  //  MILESTONE NOTIFICATIONS
  //
  //  After each streak computation, checks whether any milestone
  //  thresholds (3, 7, 14, 30) have been crossed for the first
  //  time and fires a one-time notification if so.
  // ──────────────────────────────────────────────────────────

  function checkMilestones(streak) {
    var milestoneData = loadMilestoneData();
    var changed       = false;

    CONFIG.MILESTONES.forEach(function (target) {
      // Only show if we've reached this milestone AND haven't shown it before
      if (streak >= target && milestoneData.shown.indexOf(target) === -1) {
        milestoneData.shown.push(target);
        changed = true;
        // Stagger multiple milestones slightly so they don't overlap
        setTimeout(function () {
          showMilestoneNotification(target, streak);
        }, 300);
      }
    });

    if (changed) saveMilestoneData(milestoneData);
  }


  // ──────────────────────────────────────────────────────────
  //  UI — MILESTONE NOTIFICATION
  //
  //  A larger, persistent card that slides in from the bottom-
  //  right. Matches the site's glassmorphism dark aesthetic.
  //  All styles live in streak.css.
  // ──────────────────────────────────────────────────────────

  // Content for each milestone tier.
  // Emojis are stored as plain strings; the renderer wraps them in
  // <span class="bitg-emoji"> so they get the proper color emoji font.
  var MILESTONE_CONTENT = {
    3:  { emoji: '🔥', title: '3-Day Streak!',  body: "You're on fire! Come back tomorrow to keep it going." },
    7:  { emoji: '⚡', title: 'One Full Week!',  body: 'Seven days straight. You are seriously dedicated.' },
    14: { emoji: '💎', title: 'Two Weeks!',      body: 'Two weeks running. You\'re becoming a legend here.' },
    30: { emoji: '👑', title: '30-Day Streak!',  body: 'A whole month. You are the undisputed king of Brayden is Tall Games.' }
  };

  function showMilestoneNotification(milestone, currentStreak) {
    var msg = MILESTONE_CONTENT[milestone] || {
      emoji: '🏆',
      title: milestone + '-Day Streak!',
      body:  'Incredible — ' + milestone + ' days in a row!'
    };

    // Build the notification element using semantic HTML.
    // Note: streak counter splits the number and the flame into two
    // spans so CSS can animate the flame independently.
    var el = document.createElement('div');
    el.className = 'bitg-milestone';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<div class="bitg-milestone__icon bitg-emoji">' + msg.emoji + '</div>' +
      '<div class="bitg-milestone__text">' +
        '<div class="bitg-milestone__title">' + msg.title + '</div>' +
        '<div class="bitg-milestone__body">'  + msg.body  + '</div>' +
      '</div>' +
      '<div class="bitg-milestone__streak">' +
        '<span class="bitg-milestone__streak-num">' + currentStreak + '</span>' +
        '<span class="bitg-milestone__streak-flame bitg-emoji">🔥</span>' +
      '</div>' +
      '<button class="bitg-milestone__close" aria-label="Dismiss">&times;</button>';

    document.body.appendChild(el);

    // Close button handler
    el.querySelector('.bitg-milestone__close').addEventListener('click', function () {
      dismissNotification(el);
    });

    // Auto-dismiss after configured duration
    setTimeout(function () {
      dismissNotification(el);
    }, CONFIG.MILESTONE_DURATION);
  }

  function dismissNotification(el) {
    // Guard against double-dismiss
    if (!el || el.classList.contains('bitg-milestone--exit')) return;
    el.classList.add('bitg-milestone--exit');
    // Remove from DOM after the CSS exit animation finishes (500ms)
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 500);
  }


  // ──────────────────────────────────────────────────────────
  //  UI — SIMPLE TOAST
  //
  //  Lightweight pill notification used for small messages
  //  like the Monday bonus. Slides up from the bottom center.
  // ──────────────────────────────────────────────────────────

  // showToast(message, optionalEmoji)
  //   message — the plain text (escaped)
  //   emoji   — optional emoji character; gets the cross-platform color font
  function showToast(message, emoji) {
    var el = document.createElement('div');
    el.className = 'bitg-toast';

    // Build with optional emoji — use textContent on the message span to
    // avoid any HTML-injection risk if message ever comes from user data.
    if (emoji) {
      var emojiSpan = document.createElement('span');
      emojiSpan.className = 'bitg-emoji';
      emojiSpan.textContent = emoji;
      el.appendChild(emojiSpan);
    }
    var msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    el.appendChild(msgSpan);

    document.body.appendChild(el);

    // Trigger the CSS enter animation on the next frame
    requestAnimationFrame(function () {
      el.classList.add('bitg-toast--visible');
    });

    // Auto-dismiss
    setTimeout(function () {
      el.classList.remove('bitg-toast--visible');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 400);
    }, CONFIG.TOAST_DURATION);
  }


  // ──────────────────────────────────────────────────────────
  //  DOM — SYNC DISPLAY
  //
  //  Pushes the streak number to every element matching
  //  CONFIG.DOM_TARGETS on the current page.
  // ──────────────────────────────────────────────────────────

  function syncDisplay(streak) {
    CONFIG.DOM_TARGETS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        el.textContent = streak;
      });
    });
  }


  // ──────────────────────────────────────────────────────────
  //  MAIN INIT
  //
  //  Orchestrates the full streak cycle in order:
  //    1. Load stored data
  //    2. Record today's visit + Monday bonus check
  //    3. Compute streak (may auto-use freezes)
  //    4. Update best if current is higher
  //    5. Save everything to localStorage
  //    6. Push streak number to DOM
  //    7. Check and fire any milestone notifications
  // ──────────────────────────────────────────────────────────

  function init() {
    try {
      // 1. Load
      var streakData = loadStreakData();
      var freezeData = loadFreezeData();

      // 2. Record today's visit (modifies streakData + freezeData in place)
      recordVisit(streakData, freezeData);

      // 3. Compute (may update freezeData and save it internally)
      var streak = computeStreak(streakData, freezeData);

      // 4. Update current + best
      streakData.current = streak;
      if (streak > streakData.best) streakData.best = streak;

      // 5. Save
      saveStreakData(streakData);
      saveFreezeData(freezeData);

      // 6. Sync DOM
      syncDisplay(streak);

      // 7. Milestone check
      checkMilestones(streak);

      console.log(
        '[BITG Streak v3] Ready. ' +
        'Streak: ' + streak + ' | ' +
        'Best: '   + streakData.best + ' | ' +
        'Freezes: ' + freezeData.available
      );

    } catch (e) {
      // Fail silently — never let a streak bug break the page
      console.error('[BITG Streak v3] Init error:', e);
    }
  }


  // ──────────────────────────────────────────────────────────
  //  PUBLIC API
  //
  //  Exposed on window.BITG_Streak so other scripts on any
  //  page can read streak data or trigger a display re-sync.
  //  Easy to extend — add new methods here as needed.
  // ──────────────────────────────────────────────────────────

  window.BITG_Streak = {

    // Run the full streak cycle (called automatically below)
    init: init,

    // Get current streak from storage (does not re-compute)
    getStreak: function () {
      return loadStreakData().current || 0;
    },

    // Get all-time best streak
    getBest: function () {
      return loadStreakData().best || 0;
    },

    // Get number of available freezes
    getFreezes: function () {
      return loadFreezeData().available || 0;
    },

    // Re-push the stored streak number to all DOM targets.
    // Useful on pages that inject streak elements after load.
    syncDisplay: function () {
      syncDisplay(this.getStreak());
    },

    // Award freeze charges — hook this into a future rewards system.
    addFreeze: function (count) {
      var data = loadFreezeData();
      data.available += (typeof count === 'number' ? count : 1);
      saveFreezeData(data);
      console.log('[BITG Streak v3] Freeze added. Total:', data.available);
    },

    // Wipe all v3 streak data. For dev/admin use only.
    reset: function () {
      localStorage.removeItem(CONFIG.KEYS.streak);
      localStorage.removeItem(CONFIG.KEYS.freeze);
      localStorage.removeItem(CONFIG.KEYS.milestones);
      syncDisplay(0);
      console.warn('[BITG Streak v3] All streak data cleared.');
    }

  };


  // ──────────────────────────────────────────────────────────
  //  AUTO-INIT
  //
  //  Runs init() as soon as the DOM is ready, whether this
  //  script is loaded in <head> or at the bottom of <body>.
  // ──────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Script was loaded after DOMContentLoaded already fired
    init();
  }

})();
