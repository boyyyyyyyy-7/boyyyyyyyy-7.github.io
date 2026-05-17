# BITG Streak System — v3 Implementation Guide

This document tells you exactly how to rip out the old v2 streak code and plug in the new v3 system across your entire site.

---

## What's New in v3

| Thing | v2 | v3 |
|---|---|---|
| Streak resets at 8 PM? | Yes (UTC bug) | Fixed — uses local midnight |
| localStorage keys | `streakDataV2`, `streakFreezes` | `bitg_streak`, `bitg_freeze`, `bitg_milestones` |
| Milestone notifications | None | Yes — at 3, 7, 14, 30 days |
| Code location | Baked into `background-loader.js` | Isolated in `streak.js` + `streak.css` |
| Encryption | RC4 + Base64 | Removed (plain JSON) |
| Monday bonus | Yes | Yes (kept) |

---

## New Files

| File | Purpose |
|---|---|
| `bitg-crypto.js` | Reusable tamper-resistant storage layer (RC4 + keyed checksum + Base64) |
| `streak.js` | All streak logic — drop in anywhere |
| `streak.css` | Notification styles — link once in your `<head>` |
| `README-streak.md` | This file |

> **Why crypto?** Without it, students can open DevTools and set `localStorage.bitg_streak = '{...current: 999}'` to fake a 100-day streak. With it, they'd have to reverse the algorithm AND forge a valid keyed checksum. It's obfuscation, not real cryptography (the key lives in the JS), but it defeats casual cheating.

---

## Step 1 — Add the New Files to Every Page

In the `<head>` of every HTML file on your site, add these three lines.  
Put them **after** your existing font and icon links, **before** the closing `</head>` tag.

```html
<link  rel="stylesheet" href="/streak.css">
<script src="/bitg-crypto.js" defer></script>
<script src="/streak.js"      defer></script>
```

**Order matters between the two scripts**: `bitg-crypto.js` must come before `streak.js` (the crypto file defines `window.BITGCrypto` which streak.js uses). The `defer` attribute guarantees this order even when the scripts load asynchronously.

**If your pages already have a `<script src="background-loader.js">` tag**, just add the three new lines directly below it.

---

## Step 2 — Clean Up `background-loader.js`

Open `background-loader.js`. You are going to delete the streak-related sections and leave the background/theme system completely untouched.

### Delete this block — SecureStorage (lines ~188–257)

Find the comment `// --- SECURITY (Sync with index.html) ---` and delete from there down through the closing `})();` and the line `window.Obfuscator = SecureStorage;`.

```js
// DELETE EVERYTHING BETWEEN THESE TWO LINES (inclusive):
  // --- SECURITY (Sync with index.html) ---
  const SecureStorage = (() => {
    ...
  })();
  window.Obfuscator = SecureStorage;
```

### Delete this block — StreakEngine (lines ~260–445)

Find the comment `// Sitewide Streak Engine` and delete from there through `window.StreakEngine = StreakEngine;`.

```js
// DELETE EVERYTHING BETWEEN THESE TWO LINES (inclusive):
  // Sitewide Streak Engine
  const StreakEngine = (() => {
    ...
  })();
  window.StreakEngine = StreakEngine;
```

### Delete this block — syncStreak function (lines ~447–465)

```js
// DELETE THIS ENTIRE FUNCTION:
  function syncStreak() {
    ...
  }
```

### Edit the DOMContentLoaded listener — remove one line

Find this block near the bottom of the file:

```js
  document.addEventListener('DOMContentLoaded', () => {
    applyBackground();
    syncStreak();      // <-- DELETE THIS LINE ONLY
  });
```

Leave `applyBackground();` in place. Just remove the `syncStreak();` line.

### Edit the storage event listener — remove streak branch

Find this block:

```js
  window.addEventListener('storage', (event) => {
    if (['customBackground', 'bgType', 'selectedTheme'].includes(event.key)) {
      applyBackground();
    }
    if (event.key === 'streakDataV2') {   // <-- DELETE THESE
      syncStreak();                        // <-- THREE LINES
    }                                      // <-- 
  });
```

### Delete the exposed alias at the bottom

```js
// DELETE THIS LINE:
  window.syncStreakDisplay = syncStreak;
```

After these deletions, `background-loader.js` only contains the background/theme/fireworks/snow system — clean and untouched.

---

## Step 3 — Update `index.html` Version Script Tag

In `index.html` you have:

```html
<script src="background-loader.js?v=S3.9"></script>
```

Add the new script tag directly below it:

```html
<script src="background-loader.js?v=S3.9"></script>
<link  rel="stylesheet" href="streak.css">
<script src="streak.js" defer></script>
```

---

## Step 4 — Verify It's Working

1. Open your site in a browser
2. Open DevTools → Console
3. You should see:
   ```
   [BITG Streak v3] Ready. Streak: 1 | Best: 1 | Freezes: 0
   ```
4. Check DevTools → Application → Local Storage. You should see:
   - `bitg_streak` — JSON with `version: 3`
   - `bitg_freeze` — JSON with `available: 0`
5. The streak counter (🔥) on the page should update to `1`

If you see any errors mentioning `streakDataV2` or `StreakEngine`, one of the deletions in Step 2 was missed.

---

## Step 5 — Optional: Clear v2 Data for Testing

Old v2 data (`streakDataV2`, `streakFreezes`, `bestStreak`) will sit in localStorage harmlessly — v3 ignores them completely. But if you want a clean slate:

Open DevTools Console and run:
```js
// Clear v2 leftovers
localStorage.removeItem('streakDataV2');
localStorage.removeItem('streakFreezes');
localStorage.removeItem('bestStreak');

// Clear v3 data (if you want to reset your own streak for testing)
BITG_Streak.reset();
```

---

## Public API Reference

From any page, after `streak.js` has loaded:

```js
BITG_Streak.getStreak()    // → current streak number
BITG_Streak.getBest()      // → all-time best streak
BITG_Streak.getFreezes()   // → available freeze count
BITG_Streak.syncDisplay()  // → re-push streak number to DOM (useful for late-loaded pages)
BITG_Streak.addFreeze(2)   // → give the user 2 freezes (for a future rewards system)
BITG_Streak.reset()        // → wipe all v3 data (dev/testing only)
```

---

## How Freezes Work

- Every **Monday**, one free freeze is automatically added
- If a **weekday** is missed, a freeze is automatically used to protect the streak
- **Weekends** are always forgiven — no freeze needed, streak never breaks over a weekend
- Used freeze days are stored by date in `bitg_freeze.used` so they are never charged twice

---

## How to Add a New Milestone

Open `streak.js`, find the `CONFIG` object at the top, and add to the `MILESTONES` array:

```js
MILESTONES: [3, 7, 14, 30, 60],  // added 60
```

Then add the content for it in the `MILESTONE_CONTENT` object a bit further down:

```js
60: { emoji: '🚀', title: '60 Days!', body: 'Two months. Unbelievable.' },
```

That's all. No other changes needed.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Streak shows 0 after upgrade | `BITG_Streak.reset()` in console, reload |
| Console error: `syncStreak is not defined` | Step 2 removal incomplete — check `background-loader.js` |
| Milestone toast doesn't appear | Make sure `streak.css` is linked in `<head>` |
| Streak counter not updating in DOM | Check that `.streak-count` or `#streakNumber` exists on the page |
| Monday bonus fires every day | `bitg_freeze.lastMondayBonus` got corrupted — run `BITG_Streak.reset()` |
