/* ============================================================================
   MAIN.JS — the glue. Menus, input, saves, and the frame loop.
   ----------------------------------------------------------------------------
   engine.js simulates and draws the WORLD; this file runs everything around
   it: which screen you're on, what the keyboard does, what gets saved.

   SAVE DATA (all localStorage, no accounts):
     tp_progress      — { levels: { L1: {stars, bestTime}, ... } }
     tp_ghost_<id>    — best-run ghost recording for one level
   ========================================================================== */

(function () {
    'use strict';

    const E = TP_ENGINE;

    /* ------------------------------------------------------------------
       Tiny DOM helpers
       ------------------------------------------------------------------ */
    const $ = (id) => document.getElementById(id);
    const screens = ['screen-title', 'screen-levels', 'screen-pause', 'screen-win', 'screen-lose'];

    function show(id) {
        for (const s of screens) $(s).classList.toggle('active', s === id);
        $('hud').classList.toggle('hidden', id !== null);
        if (id !== null) $('build-bar').classList.add('hidden');
    }

    /* ------------------------------------------------------------------
       SAVES
       ------------------------------------------------------------------ */
    function loadProgress() {
        try { return JSON.parse(localStorage.getItem('tp_progress')) || { levels: {} }; }
        catch { return { levels: {} }; }
    }
    function saveProgress(p) {
        try { localStorage.setItem('tp_progress', JSON.stringify(p)); } catch { /* storage full/blocked — play on */ }
    }

    /** Old daily entries + ghosts pile up over time — keep only today's. */
    function pruneOldDailies() {
        const todayId = 'DAILY-' + TP_DAILY.todaySeed();
        const p = loadProgress();
        let dirty = false;
        for (const id of Object.keys(p.levels)) {
            if (id.startsWith('DAILY-') && id !== todayId) {
                delete p.levels[id];
                try { localStorage.removeItem('tp_ghost_' + id); } catch {}
                dirty = true;
            }
        }
        if (dirty) saveProgress(p);
    }

    function loadGhost(id) {
        try { return JSON.parse(localStorage.getItem('tp_ghost_' + id)); }
        catch { return null; }
    }
    function saveGhost(id, rec) {
        try {
            localStorage.setItem('tp_ghost_' + id,
                JSON.stringify({ t: rec.t, x: rec.x, y: rec.y, a: rec.a }));
        } catch { /* too big / blocked — skip silently */ }
    }

    /* ------------------------------------------------------------------
       GAME FLOW
       ------------------------------------------------------------------ */
    let currentLevel = null;       // the level definition being played
    let paused = false;

    let trayInv = {};              // parts left in the bin (inventory - placed)
    let selectedType = null;       // tray part currently selected for placing

    /**
     * Enter a level's WORKSHOP. `design` (optional) pre-places parts —
     * that's how retry hands your machine back after a crash.
     */
    function startLevel(def, design) {
        currentLevel = def;
        paused = false;
        design = design || [];
        E.loadLevel(def, design);

        // remaining bin = the level's inventory minus what's already placed
        trayInv = Object.assign({}, def.inventory || {});
        for (const d of design) {
            if (trayInv[d.type] !== undefined) trayInv[d.type] = Math.max(0, trayInv[d.type] - 1);
        }
        selectedType = null;
        E.setBuildCursor(null);

        $('hud-level-name').textContent = def.name + '  ·  par ' + def.par + 's';
        show(null);
        $('build-bar').classList.remove('hidden');
        $('hud').classList.add('hidden');
        renderTray();
        updateGoState();   // sets the workshop title + greys GO until the jar is down
    }

    /** GO! — hand the machine to physics. */
    function launchRun() {
        if (E.status !== 'building' || !E.hasCargo()) return;
        E.launch();
        TP_SOUND.launch();
        E.setGhost(loadGhost(currentLevel.id));    // race your best self
        $('build-bar').classList.add('hidden');
        $('hud').classList.remove('hidden');
        refreshRunBar();                           // ⚙ 🌀 🥤 💥 🎈 buttons
    }

    /** Back to the workshop with the machine you launched (the BP loop). */
    function retry() { if (currentLevel) startLevel(currentLevel, E.getLaunchDesign()); }

    /* ------------------------------------------------------------------
       THE PARTS TRAY — one slot per part type in the level's inventory.
       Each slot draws its part with the SAME code the game world uses.
       ------------------------------------------------------------------ */
    function renderTray() {
        const tray = $('build-tray');
        tray.innerHTML = '';
        const types = Object.keys((currentLevel && currentLevel.inventory) || {});
        if (types.length === 0) {
            tray.innerHTML = '<div style="opacity:.6;font-size:.85rem;padding:8px">No extra parts — just hit GO!</div>';
            return;
        }
        for (const type of types) {
            const left = trayInv[type] || 0;
            const slot = document.createElement('div');
            slot.className = 'tray-part'
                + (selectedType === type ? ' selected' : '')
                + (left === 0 ? ' empty' : '');
            slot.title = TP_PARTS.defs[type].name;

            const cv = document.createElement('canvas');
            cv.width = 46; cv.height = 46;
            const c = cv.getContext('2d');
            c.translate(23, 26);              // parts draw around their cell center
            TP_PARTS.defs[type].draw(c, {}, 0);
            slot.appendChild(cv);

            const n = document.createElement('div');
            n.className = 'tray-count';
            n.textContent = left;
            slot.appendChild(n);

            slot.addEventListener('click', () => {
                if ((trayInv[type] || 0) === 0) return;
                selectedType = (selectedType === type) ? null : type;
                E.setBuildCursor(selectedType);
                renderTray();
            });
            tray.appendChild(slot);
        }
    }

    function quitToMenu() {
        paused = false;
        E.status = 'idle';
        buildLevelGrid();
        show('screen-levels');
    }

    function togglePause() {
        if (E.status === 'playing') {
            E.status = 'paused';
            paused = true;
            show('screen-pause');
        } else if (E.status === 'paused') {
            E.status = 'playing';
            paused = false;
            show(null);
        }
    }

    /* ------------------------------------------------------------------
       WIN / LOSE — wired into the engine's callbacks
       ------------------------------------------------------------------ */
    E.events.onWin = (results) => {
        E.celebrate();
        TP_SOUND.win();

        const starCount = results.stars.filter(s => s.ok).length;

        // record progress (keep the BEST stars and time ever achieved)
        const p = loadProgress();
        const prev = p.levels[currentLevel.id] || { stars: 0, bestTime: Infinity };
        const newBest = results.time < prev.bestTime;
        p.levels[currentLevel.id] = {
            stars: Math.max(prev.stars, starCount),
            bestTime: Math.min(prev.bestTime, Math.round(results.time * 10) / 10)
        };
        saveProgress(p);
        if (newBest) saveGhost(currentLevel.id, results.recording);

        // build the win screen — one star per goal, each with its own label
        // (stars is now an ARRAY: [finish, goalA, goalB] from the level data)
        const starsEl = $('win-stars');
        starsEl.innerHTML = '';
        results.stars.forEach((g, i) => {
            const s = document.createElement('span');
            s.textContent = g.ok ? '★' : '☆';
            if (!g.ok) s.className = 'dim';
            s.style.animationDelay = (0.15 + i * 0.22) + 's';
            starsEl.appendChild(s);
        });

        const why = results.stars.map(g => (g.ok ? '✓ ' : '✗ ') + g.label);
        $('win-details').innerHTML =
            `Time: <b>${results.time.toFixed(1)}s</b> · jar at ${Math.round(results.jarHP)}%` +
            (newBest ? ' — <b>new best!</b> ghost saved 👻' : '') +
            '<br>' + why.join('<br>');

        // "Next" goes to the next handmade level, or back to the menu
        const idx = TP_LEVELS.findIndex(l => l.id === currentLevel.id);
        $('btn-next').style.display = (idx >= 0 && idx < TP_LEVELS.length - 1) ? '' : 'none';

        setTimeout(() => show('screen-win'), 600);   // let the confetti breathe
    };

    E.events.onLose = (reason) => {
        if (reason.includes('shattered')) TP_SOUND.shatter(); else TP_SOUND.lose();
        $('lose-title').textContent = reason.includes('shattered') ? 'CRUNCH. 💔' : 'Run over!';
        $('lose-reason').textContent = reason;
        setTimeout(() => show('screen-lose'), 500);
    };

    E.events.onJarHit = (hp) => {
        const bar = $('jar-bar');
        bar.classList.remove('hit');
        void bar.offsetWidth;              // restart the flash animation
        bar.classList.add('hit');
    };

    /* ------------------------------------------------------------------
       LEVEL SELECT
       ------------------------------------------------------------------ */
    function starString(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

    function buildLevelGrid() {
        const p = loadProgress();
        const grid = $('levels-grid');
        grid.innerHTML = '';

        TP_LEVELS.forEach((def, i) => {
            const saved = p.levels[def.id];
            const card = document.createElement('div');
            card.className = 'level-card';
            card.innerHTML =
                `<div class="lv-num">LEVEL ${i + 1}</div>` +
                `<div class="lv-name">${def.name}</div>` +
                `<div class="lv-stars">${starString(saved ? saved.stars : 0)}</div>` +
                `<div class="lv-best">${saved ? 'best ' + saved.bestTime + 's' : 'not cleared'}</div>`;
            card.addEventListener('click', () => startLevel(def));
            grid.appendChild(card);
        });

        // the Daily Junkyard card
        const dailyId = 'DAILY-' + TP_DAILY.todaySeed();
        const dsaved = p.levels[dailyId];
        const daily = document.createElement('div');
        daily.className = 'level-card daily';
        daily.innerHTML =
            `<div class="lv-num">📅 DAILY</div>` +
            `<div class="lv-name">${TP_DAILY.todayLabel()} Junkyard</div>` +
            `<div class="lv-stars">${starString(dsaved ? dsaved.stars : 0)}</div>` +
            `<div class="lv-best">${dsaved ? 'best ' + dsaved.bestTime + 's' : 'same level for everyone'}</div>`;
        daily.addEventListener('click', () => startLevel(TP_DAILY.generate(TP_DAILY.todaySeed())));
        grid.appendChild(daily);
    }

    /* ------------------------------------------------------------------
       INPUT
       ------------------------------------------------------------------ */
    const keys = {};

    window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        keys[e.code] = true;
        pushInput();

        if (e.code === 'KeyR') {
            if (E.status === 'playing' || E.status === 'paused') retry();       // back to workshop
            else if (E.status === 'building') startLevel(currentLevel, []);    // clear the build
        }
        if (e.code === 'Enter' && E.status === 'building') launchRun();
        if (e.code === 'KeyX') E.ejectLast();
        if (e.code === 'KeyM') TP_SOUND.toggleMute();
        if (e.code === 'Escape' || e.code === 'KeyP') {
            if (E.status === 'building') quitToMenu();
            else togglePause();
        }

        // stop arrows/space from scrolling the page
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
        pushInput();
    });

    function pushInput() {
        E.setInput({
            left:  !!(keys.KeyA || keys.ArrowLeft),
            right: !!(keys.KeyD || keys.ArrowRight),
            fan:   !!(keys.KeyW || keys.ArrowUp)
        });
    }

    // canvas clicks do different jobs depending on the mode:
    //   building → place the selected part / pick a placed part back up
    //   playing  → USE the clicked part (fan toggles, soda blasts, rest eject)
    // (window.TP_BLOCK_CLICKS=true disables this — used for automated testing)
    $('game').addEventListener('pointerdown', (e) => {
        if (window.TP_BLOCK_CLICKS) return;

        if (E.status === 'building') {
            const cell = E.cellAtScreen(e.clientX, e.clientY);
            if (!cell) return;
            const info = E.partInfoAt(cell.col, cell.row);
            if (info) {
                // pressing on a placed part ARMS a drag — if the pointer
                // moves it lifts off; if it releases in place, it's a click
                // (clicks rotate aimable parts; see pointerup below)
                dragPending = { cell, info, x: e.clientX, y: e.clientY };
                return;
            }
            // empty cell → try to place the selected tray part here
            if (selectedType && (trayInv[selectedType] || 0) > 0 &&
                E.placePart(selectedType, cell.col, cell.row)) {
                trayInv[selectedType]--;
                renderTray();
                updateGoState();           // placing the jar lights up GO
            }
        } else if (E.status === 'playing') {
            E.activateAtScreen(e.clientX, e.clientY);
            refreshRunBar();
        }
    });

    // the engine watches the cursor: aiming at the cart turns on slow-mo
    // ("raccoon focus") and highlights the part you'd eject
    window.addEventListener('pointermove', (e) => {
        E.setMouse(e.clientX, e.clientY);
    });

    /* ------------------------------------------------------------------
       WORKSHOP DRAG & DROP — every placed part can be picked up and moved.
       pointerdown on a part arms `dragPending`; moving ~8px lifts it into
       `hand`; pointerup drops it: on a valid cell → placed there, on a bad
       cell → snaps back home, off the grid → returned to the parts bin.
       A press that never moves is a CLICK: clicks rotate aimable parts.
       Double-click sends any part straight back to the bin.
       ------------------------------------------------------------------ */
    let dragPending = null;   // {cell, info, x, y} — pressed, not yet moving
    let hand = null;          // {type, dir} — the part currently being dragged

    window.addEventListener('pointermove', (e) => {
        if (!dragPending || hand || E.status !== 'building') return;
        if (Math.hypot(e.clientX - dragPending.x, e.clientY - dragPending.y) < 8) return;
        // lift the part off the grid into the "hand"
        hand = E.removePart(dragPending.cell.col, dragPending.cell.row);
        if (hand) {
            E.setBuildCursor(hand.type);   // engine shows the ghost preview
            updateGoState();               // (dragging the jar dims GO)
        } else {
            dragPending = null;
        }
    });

    window.addEventListener('pointerup', (e) => {
        if (E.status !== 'building') { dragPending = null; hand = null; return; }

        if (hand) {
            // drop: try the cell under the pointer, then home, then the bin
            const cell = E.cellAtScreen(e.clientX, e.clientY);
            if (cell && E.placePart(hand.type, cell.col, cell.row, hand.dir)) {
                // dropped at the new spot
            } else if (E.placePart(hand.type, dragPending.cell.col, dragPending.cell.row, hand.dir)) {
                // invalid drop → snapped back home
            } else {
                // off the grid (or home got orphaned) → back to the bin
                trayInv[hand.type] = (trayInv[hand.type] || 0) + 1;
                renderTray();
            }
            hand = null;
            dragPending = null;
            E.setBuildCursor(selectedType);
            updateGoState();
            return;
        }

        if (dragPending) {
            // never moved → a plain click: rotate aimable parts
            if (dragPending.info.rotatable) {
                E.rotatePart(dragPending.cell.col, dragPending.cell.row);
            }
            dragPending = null;
        }
    });

    // double-click ANY part in the workshop to send it back to the bin
    $('game').addEventListener('dblclick', (e) => {
        if (window.TP_BLOCK_CLICKS || E.status !== 'building') return;
        const cell = E.cellAtScreen(e.clientX, e.clientY);
        if (!cell) return;
        const removed = E.removePart(cell.col, cell.row);
        if (removed) {
            trayInv[removed.type] = (trayInv[removed.type] || 0) + 1;
            renderTray();
            updateGoState();
        }
    });

    /* ------------------------------------------------------------------
       GO GATING — no cookie jar on the machine, no launch. The button
       greys out and the workshop title nags until the cargo is placed.
       ------------------------------------------------------------------ */
    function updateGoState() {
        const has = E.hasCargo();
        $('btn-go').disabled = !has;
        document.querySelector('.build-title').textContent = has
            ? '🔧 WORKSHOP — drag parts to move them · click soda/fans to AIM'
            : '🍪 Place the COOKIE JAR first — no cargo, no heist!';
    }

    /* ------------------------------------------------------------------
       RUN-PHASE BUTTON BAR — one big button per part class on the machine
       (⚙ engine power, 🌀 all fans, 🥤 fire bottles, 💥 TNT, 🎈 pop one).
       This is how activations work on a touchscreen or in a hurry; clicking
       the parts themselves still works too.
       ------------------------------------------------------------------ */
    const RUN_BUTTONS = [
        { kind: 'engine',  icon: '⚙️', title: 'Engine power on/off' },
        { kind: 'fan',     icon: '🌀', title: 'All fans on/off' },
        { kind: 'soda',    icon: '🥤', title: 'Fire soda bottles!' },
        { kind: 'tnt',     icon: '💥', title: 'Detonate TNT!' },
        { kind: 'balloon', icon: '🎈', title: 'Pop a balloon' }
    ];

    function refreshRunBar() {
        const bar = $('run-bar');
        if (E.status !== 'playing') { bar.classList.add('hidden'); return; }
        const acts = E.getRunActions();
        bar.innerHTML = '';
        let any = false;
        for (const b of RUN_BUTTONS) {
            const a = acts[b.kind];
            if (!a) continue;
            any = true;
            const btn = document.createElement('button');
            btn.className = 'run-btn' + (a.on === false ? ' off' : '');
            btn.title = b.title;
            btn.innerHTML = `<span class="rb-icon">${b.icon}</span>` +
                            (a.count > 1 ? `<span class="rb-count">${a.count}</span>` : '');
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();          // don't also click the canvas
                E.runAction(b.kind);
                refreshRunBar();
            });
            bar.appendChild(btn);
        }
        bar.classList.toggle('hidden', !any);
    }

    // browsers only allow audio after a real user gesture — arm it on the
    // first click or key press, whichever comes first
    const armAudio = () => { TP_SOUND.init(); };
    window.addEventListener('pointerdown', armAudio, { once: true });
    window.addEventListener('keydown', armAudio, { once: true });

    // every button/tray/card click gets the cartoon blip
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn, .tray-part, .level-card')) TP_SOUND.click();
    });

    // browser tab hidden → auto-pause so nothing happens unwatched
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && E.status === 'playing') togglePause();
    });

    window.addEventListener('resize', () => E.resize());

    /* ------------------------------------------------------------------
       MENU BUTTONS
       ------------------------------------------------------------------ */
    $('btn-go').addEventListener('click', launchRun);
    $('btn-play').addEventListener('click', () => { buildLevelGrid(); show('screen-levels'); });
    $('btn-daily').addEventListener('click', () => startLevel(TP_DAILY.generate(TP_DAILY.todaySeed())));
    $('btn-back-title').addEventListener('click', () => show('screen-title'));

    $('btn-resume').addEventListener('click', togglePause);
    $('btn-retry-pause').addEventListener('click', retry);
    $('btn-quit-pause').addEventListener('click', quitToMenu);

    $('btn-retry-win').addEventListener('click', retry);
    $('btn-quit-win').addEventListener('click', quitToMenu);
    $('btn-next').addEventListener('click', () => {
        const idx = TP_LEVELS.findIndex(l => l.id === currentLevel.id);
        if (idx >= 0 && idx < TP_LEVELS.length - 1) startLevel(TP_LEVELS[idx + 1]);
        else quitToMenu();
    });

    $('btn-retry-lose').addEventListener('click', retry);
    $('btn-quit-lose').addEventListener('click', quitToMenu);

    /* ------------------------------------------------------------------
       FRAME LOOP + HUD
       ------------------------------------------------------------------ */
    let lastTime = 0;
    let runBarTimer = 0;

    function loop(time) {
        const dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        E.frame(dt, time);

        // HUD refresh (cheap text writes — only while playing)
        if (E.status === 'playing') {
            $('hud-time').textContent = E.elapsed().toFixed(1) + 's';
            $('hud-parts').textContent = '🔩 ' + E.partsCount() + (E.partsCount() === 1 ? ' part' : ' parts');
            $('jar-bar-fill').style.width = E.jarHP() + '%';
        }
        // run-bar refresh ~3×/s: counts change as bottles fire, balloons pop,
        // engines break off in crashes — and it hides itself off-run
        runBarTimer += dt;
        if (runBarTimer > 0.35) { runBarTimer = 0; refreshRunBar(); }
        requestAnimationFrame(loop);
    }

    /* ------------------------------------------------------------------
       BOOT
       ------------------------------------------------------------------ */
    E.init($('game'));
    pruneOldDailies();
    show('screen-title');
    requestAnimationFrame((t) => { lastTime = t; requestAnimationFrame(loop); });
})();
