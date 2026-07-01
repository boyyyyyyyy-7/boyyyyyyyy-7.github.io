/* ============================================================================
   LEVELS.JS — every handmade level lives in this one file.
   ----------------------------------------------------------------------------
   WANT TO ADD A LEVEL? Copy any entry in TP_LEVELS, change the data, done.
   The level select menu, stars, ghosts and saves all pick it up automatically.

   Coordinate system: x grows to the RIGHT, y grows DOWN (canvas-style).
   The machine starts around y=480 and "downhill" means y gets BIGGER.

   A level object:
     id        — unique save key, don't reuse!
     name      — shown in menus
     par       — par time in seconds (star #2 = finish under this)
     inventory — the parts bin for the workshop: { type: count, ... }
                 (types = keys in TP_PARTS — wheel, balloon, fan, plank,
                  spring, soda, umbrella)
     starBox   — {x, y} floating crate; touch it mid-run = star #3
     terrain   — list of [x, y] points, left to right. Straight lines between.
     sharp     — list of [startX, endX] ranges where the ground is SPIKES:
                 pops balloons, hurts the jar extra.
     platforms — floating one-way ledges: {x1, y1, x2, y2} (+ sharp: true)
     signs     — wooden tutorial boards: {x, text}
     preAttached — parts already bolted on at spawn (rarely needed now)
     start     — {x, y} machine spawn / workshop position
     goalX     — cross this x = win
     killY     — fall below this y = lose
   ========================================================================== */

(function () {
    'use strict';

    window.TP_LEVELS = [

    /* ========================================================================
       LEVEL 1 — GARAGE DAY
       The workshop tutorial. Gentle downhill the whole way — almost any
       machine makes it. The star box sits in a little dip so you learn that
       star boxes are worth steering for. Soda teaches mid-run clicking.
       ===================================================================== */
    {
        id: 'L1',
        name: 'Garage Day',
        par: 26,
        inventory: { jar: 1, woodframe: 4, engine: 1, motorwheel: 1, wheel: 2, soda: 1, plank: 1 },
        // stars: finish · beat par · grab the box
        goals: [{ type: 'time' }, { type: 'box' }],
        // floats high over the uphill lip — build TALL to brush it
        starBox: { x: 3150, y: 505 },
        terrain: [
            [-560, 200],                              // back wall
            [-400, 480], [400, 560], [1100, 640],    // a friendly starting hill…
            [1900, 660], [2600, 660],                 // …then a LONG FLAT: gravity
                                                      //    won't carry you — motor!
            [3000, 650], [3300, 620],                 // even a little uphill
            [4200, 630]                               // home stretch to the den
        ],
        sharp: [],
        platforms: [],
        signs: [
            { x: 250,  text: 'Jar in, frames around it, wheels under, engine on!' },
            { x: 2100, text: 'Flat ground — your powered wheel + engine earn their keep.' }
        ],
        pickups: [],
        preAttached: [],
        start: { x: 60, y: 420 },
        goalX: 3900,
        killY: 1600
    },

    /* ========================================================================
       LEVEL 2 — THE GAP
       A spiky pit splits the course. Build for speed (planks low, wheels)
       and blast the soda at the lip — or balloon over the top. The star
       box hangs above the gap: brave builders only.
       ===================================================================== */
    {
        id: 'L2',
        name: 'The Gap',
        par: 26,
        inventory: { jar: 1, woodframe: 4, wheel: 2, plank: 2, soda: 1, balloon: 1, tnt: 1 },
        // stars: finish · grab the box · cross the gap WITHOUT the balloon
        goals: [{ type: 'box' }, { type: 'avoid', part: 'balloon' }],
        starBox: { x: 1950, y: 560 },
        terrain: [
            [-560, 200],
            [-400, 480], [300, 520], [800, 620], [1300, 700],
            [1750, 740],                       // takeoff lip
            [1750, 1500],                      // cliff!
            [2150, 1500],                      // spiky pit floor
            [2150, 780],                       // landing wall
            [2250, 770],
            [2700, 800], [3200, 880], [3800, 920], [4500, 940]
        ],
        sharp: [[1760, 2140]],
        platforms: [],
        signs: [
            { x: 1400, text: 'Big gap ahead — blast or fly!' }
        ],
        pickups: [],
        preAttached: [],
        start: { x: 60, y: 420 },
        goalX: 4200,
        killY: 1450
    },

    /* ========================================================================
       LEVEL 3 — HIGH ROAD
       Route choice. The floor is a spiky scrapyard; the rooftops are clean.
       Balloons get you up, the umbrella gets you down softly. Or armor up
       with planks and grind the low road. The star box is on the high road.
       ===================================================================== */
    {
        id: 'L3',
        name: 'High Road',
        par: 42,
        grid: { w: 7, h: 5 },          // a roomy workshop for flying machines
        inventory: { jar: 1, woodframe: 4, ironframe: 2, engine: 1, balloon: 2, wheel: 2, umbrella: 1, plank: 2, fan: 1 },
        // stars: finish · beat par · fly it WITHOUT the umbrella safety net
        goals: [{ type: 'time' }, { type: 'avoid', part: 'umbrella' }],
        starBox: { x: 3000, y: 430 },
        terrain: [
            [-560, 200],
            [-400, 480], [300, 540], [700, 600],
            [1100, 700], [1600, 760], [2200, 800], [2800, 830],
            [3400, 850], [4000, 900], [4600, 950], [5200, 990], [5900, 1000]
        ],
        sharp: [[1300, 3900]],
        platforms: [
            { x1: 1250, y1: 560, x2: 1750, y2: 560 },
            { x1: 2000, y1: 520, x2: 2450, y2: 540 },
            { x1: 2750, y1: 500, x2: 3250, y2: 520 },
            { x1: 3550, y1: 560, x2: 4050, y2: 600 }
        ],
        signs: [
            { x: 350, text: 'Spikes below… balloons above?' }
        ],
        pickups: [],
        preAttached: [],
        start: { x: 60, y: 420 },
        goalX: 5600,
        killY: 1600
    },

    /* ========================================================================
       LEVEL 4 — BOTTLE ROCKET
       A washboard rumble strip charges your soda bottles to full fizz,
       then a huge wall says "use them". Double-bottle builds go to space.
       The star box floats in the launch arc.
       ===================================================================== */
    {
        id: 'L4',
        name: 'Bottle Rocket',
        par: 35,
        inventory: { jar: 1, woodframe: 3, ironframe: 1, soda: 2, wheel: 2, spring: 1, plank: 1 },
        // stars: finish · grab the box · clear it WITHOUT the spring
        goals: [{ type: 'box' }, { type: 'avoid', part: 'spring' }],
        starBox: { x: 2900, y: 380 },
        terrain: (function () {
            // A washboard of little bumps to shake the soda — generated in
            // code so we don't hand-type 40 points. Plain data after that.
            const pts = [[-560, 200], [-400, 480], [200, 520]];
            let x = 200, y = 520;
            for (let i = 0; i < 18; i++) {          // the rumble strip
                x += 90;  y += 14;
                pts.push([x, y - (i % 2 ? 0 : 26)]); // up-down-up-down…
            }
            pts.push([x + 400, y + 60]);             // run-up
            pts.push([x + 700, y - 40]);             // launch ramp ↑
            pts.push([x + 700, y + 900]);            // back of the wall (sheer)
            pts.push([x + 1500, y + 900]);           // valley floor
            pts.push([x + 1500, y + 60]);            // far wall up
            pts.push([x + 1900, y + 40]);            // landing meadow
            pts.push([x + 2600, y + 80]);
            pts.push([x + 3300, y + 90]);
            return pts;
        })(),
        sharp: [[2700, 3600]],                       // valley floor = spikes
        platforms: [],
        signs: [
            { x: 400, text: 'Bumps charge your soda. Save it for the wall!' }
        ],
        pickups: [],
        preAttached: [],
        start: { x: 0, y: 420 },
        goalX: 5200,
        killY: 1900
    },

    /* ========================================================================
       LEVEL 5 — JUNK MOUNTAIN
       The graduation exam: long course, two big drops, spikes, a trap
       platform, every part in the bin. Three stars here is a real flex.
       ===================================================================== */
    {
        id: 'L5',
        name: 'Junk Mountain',
        par: 70,
        grid: { w: 7, h: 5 },          // bring everything — and room to bolt it
        inventory: { jar: 1, woodframe: 5, ironframe: 3, engine: 1, motorwheel: 1, wheel: 3, balloon: 2, soda: 2, plank: 2, spring: 1, umbrella: 1, fan: 1, tnt: 1 },
        // stars: finish · beat par · grab the box
        goals: [{ type: 'time' }, { type: 'box' }],
        starBox: { x: 5550, y: 830 },
        terrain: [
            [-560, 100],
            [-400, 300], [300, 360], [800, 460], [1300, 480],
            [1800, 600], [2200, 580], [2600, 700], [3000, 680],
            [3400, 820],
            [3900, 800],                          // ledge before first drop
            [3900, 1100], [4300, 1140],           // drop one
            [4900, 1180], [5400, 1260], [5900, 1240],
            [6400, 1380], [6800, 1360],
            [7200, 1340],                         // ledge before THE drop
            [7200, 1900], [7800, 1960],           // the finale canyon floor
            [8400, 1980], [9000, 2000], [9800, 2010]
        ],
        sharp: [[4000, 4250], [7250, 7750]],
        platforms: [
            { x1: 1900, y1: 420, x2: 2400, y2: 430 },              // shortcut hop
            { x1: 4500, y1: 950, x2: 5050, y2: 980 },              // mid high-road
            { x1: 5350, y1: 900, x2: 5800, y2: 920, sharp: true }, // trap! spiky billboard
            { x1: 7400, y1: 1650, x2: 7900, y2: 1680 }             // canyon step-down
        ],
        signs: [
            { x: 200, text: 'Junk Mountain. Bring everything.' }
        ],
        pickups: [],
        preAttached: [],
        start: { x: 60, y: 240 },
        goalX: 9400,
        killY: 2600
    }
    ];
})();
