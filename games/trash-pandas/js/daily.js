/* ============================================================================
   DAILY.JS — the Daily Junkyard: one procedurally-built level per day.
   ----------------------------------------------------------------------------
   HOW IT WORKS (no server needed):
   The seed is just today's date as a number (20260611). Everyone who plays
   today feeds the SAME seed into the SAME generator, so everyone gets the
   SAME level — like Wordle, but with raccoons.

   The generator glues together "chunks" (slope, bumps, gap, ramp, spikes)
   and sprinkles parts in sensible spots. The result is a normal level
   object, identical in shape to the handmade ones in levels.js.
   ========================================================================== */

(function () {
    'use strict';

    /* ------------------------------------------------------------------
       mulberry32 — a tiny, well-known seeded random number generator.
       Same seed in → same sequence of "random" numbers out, every time,
       on every computer. That's what makes the daily level shared.
       ------------------------------------------------------------------ */
    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** Today's date as a seed number, e.g. June 11 2026 → 20260611 */
    function todaySeed() {
        const d = new Date();
        return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }

    /** Pretty label for menus, e.g. "Jun 11" */
    function todayLabel() {
        return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    /* ------------------------------------------------------------------
       generate(seed) — builds and returns a complete level object.
       ------------------------------------------------------------------ */
    function generate(seed) {
        const rnd = mulberry32(seed);
        const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

        const terrain = [[-560, 200], [-400, 480], [250, 510]];  // back wall first
        const sharp = [];
        const platforms = [];
        const inv = {};
        const addInv = (t) => { inv[t] = (inv[t] || 0) + 1; };
        let starBox = null;

        let x = 250, y = 510;

        /* Each chunk advances x/y and may add hazards, platforms, pickups.
           Adding a new chunk type here automatically enriches every future
           daily level. */
        const chunks = {

            slope() {                                  // plain downhill
                const len = 380 + rnd() * 320;
                x += len; y += len * (0.12 + rnd() * 0.16);
                terrain.push([x, y]);
                if (rnd() < 0.5) addInv(pick(['wheel', 'plank', 'wheel']));
            },

            bumps() {                                  // washboard — charges soda
                const n = 4 + Math.floor(rnd() * 5);
                for (let i = 0; i < n; i++) {
                    x += 85; y += 10;
                    terrain.push([x, y - (i % 2 ? 0 : 24)]);
                }
                addInv('soda');
            },

            gap() {                                    // a pit with spikes at the bottom
                const w = 220 + rnd() * 200;
                terrain.push([x, y]);                  // takeoff lip
                terrain.push([x, y + 700]);            // down the cliff
                sharp.push([x + 5, x + w - 5]);
                terrain.push([x + w, y + 700]);        // pit floor
                terrain.push([x + w, y + 30]);         // up the far wall (slightly lower)
                x += w; y += 30;
                terrain.push([x + 60, y]); x += 60;
                // gaps put a flyer in the bin — and hang the star box over the pit
                addInv(pick(['balloon', 'umbrella']));
                if (!starBox) starBox = { x: x - w / 2 - 30, y: y - 260 };
            },

            ramp() {                                   // launch lip then a drop
                x += 260; y -= 70;                     // up the ramp
                terrain.push([x, y]);
                terrain.push([x, y + 420]);            // sheer back side
                x += 90; y += 420;
                terrain.push([x, y]);
                addInv(pick(['wheel', 'spring', 'tnt']));
            },

            spikes() {                                 // flat but angry floor
                const len = 320 + rnd() * 240;
                sharp.push([x + 10, x + len - 10]);
                x += len; y += 20 + rnd() * 40;
                terrain.push([x, y]);
                // offer a platform OVER the spikes about half the time
                if (rnd() < 0.55) {
                    platforms.push({ x1: x - len + 30, y1: y - 190, x2: x - 60, y2: y - 180 });
                    addInv(pick(['wheel', 'soda', 'balloon']));
                    if (!starBox) starBox = { x: x - len / 2, y: y - 250 };
                } else {
                    addInv('balloon');
                }
            }
        };

        /** Ground height at some x we already built (linear scan is fine here) */
        function yAt(qx) {
            for (let i = 1; i < terrain.length; i++) {
                const [x1, y1] = terrain[i - 1], [x2, y2] = terrain[i];
                if (qx >= x1 && qx <= x2 && x2 > x1) {
                    return y1 + (y2 - y1) * ((qx - x1) / (x1 === x2 ? 1 : x2 - x1));
                }
            }
            return y;
        }

        // Always open gently, then 8 random chunks, weighted toward variety
        chunks.slope();
        const bag = ['slope', 'bumps', 'gap', 'ramp', 'spikes', 'slope', 'bumps', 'spikes'];
        let last = '';
        for (let i = 0; i < 8; i++) {
            let c = pick(bag);
            if (c === last && rnd() < 0.7) c = 'slope';   // avoid boring repeats
            chunks[c]();
            last = c;
        }
        chunks.slope();                                    // gentle runway to the den

        const goalX = x - 150;
        terrain.push([x + 700, y + 30]);                   // ground past the goal

        // Everyone deserves a workable bin: top up the randomly-earned parts
        // with a guaranteed baseline so no daily is unwinnable.
        inv.jar = 1;                                          // the cargo, always
        inv.woodframe = Math.max(inv.woodframe || 0, 4);      // structure to build with
        if (rnd() < 0.4) inv.ironframe = 2;                   // sometimes the good stuff
        inv.wheel = Math.max(inv.wheel || 0, 2);
        inv.soda  = Math.max(inv.soda  || 0, 1);
        inv.plank = Math.max(inv.plank || 0, 1);
        inv.motorwheel = Math.max(inv.motorwheel || 0, 1);   // flats happen
        inv.engine = Math.max(inv.engine || 0, 1);           // …and it needs power

        // If no gap/platform claimed the star box, float it mid-course.
        if (!starBox) {
            const mx = goalX * 0.55;
            starBox = { x: mx, y: yAt(mx) - 180 };
        }

        // Par: rough guess from course length — tuned to be beatable but honest
        const par = Math.round(18 + (goalX / 320));

        return {
            id: 'DAILY-' + seed,
            name: 'Daily · ' + todayLabel(),
            par,
            inventory: inv,
            starBox,
            terrain, sharp, platforms,
            pickups: [],
            signs: [],
            preAttached: [],
            start: { x: 40, y: 430 },
            goalX,
            killY: y + 900,
            isDaily: true
        };
    }

    /* Public API ------------------------------------------------------------ */
    window.TP_DAILY = { todaySeed, todayLabel, generate };
})();
