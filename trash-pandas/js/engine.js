/* ============================================================================
   ENGINE.JS — soft-body contraption physics + rendering. The beating heart.
   ----------------------------------------------------------------------------
   THE BIG IDEA (version 2 — read this first):
   The machine is NOT one solid object. Every part is its own little physics
   particle, and neighbouring parts are tied together with springy JOINTS.
   The whole machine flexes and wobbles as it rolls — and when a joint gets
   stretched too hard (a big crash), it SNAPS, and the machine genuinely
   falls apart into separate pieces that each keep simulating.

   This is "Verlet integration + distance constraints" — the same trick big
   physics engines use, boiled down to ~100 lines of actual math. Cheap
   enough for 60fps on a school Chromebook.

   WIN RULE: the cookie jar (the cargo!) must reach the den. Even if the
   machine disintegrates, a jar bouncing across the finish line counts.

   COORDINATES: x → right, y → DOWN (canvas style).
   All the game-feel numbers live in TUNING just below.
   ========================================================================== */

(function () {
    'use strict';

    const CELL = TP_PARTS.CELL;          // 34px — one grid cell

    /* ========================================================================
       TUNING — the game feel control panel
       ===================================================================== */
    const TUNING = {
        GRAVITY: 1000,           // world gravity (px/s²)
        DT: 1 / 120,             // physics tick (two per rendered frame)
        SOLVER_ITERS: 10,        // joint passes per tick (general stability +
                                 // keeps machines stiff enough to DRIVE well).
                                 // Frame FLEX is NOT done here — it's the hard
                                 // stretch-clamp below, which is mass-independent
                                 // so heavy iron still reads as rigid.
        FLEX_RANGE: 0.16,        // a fully-floppy joint (stiff 0) may stretch
                                 // up to this fraction before the clamp catches
                                 // it. Rigid joints (stiff 1) clamp to ~zero.
        AIR_DAMP: 0.999,         // velocity keep-factor per tick (air drag)

        JOINT_BREAK: 0.22,       // joints snap when stretched/squashed past
                                 // this fraction of their rest length.
                                 // (Part defs can multiply this: iron frames
                                 // have tough: 2.4, the jar 1.4 — see parts.js)
        IMPACT_BREAK: 430,       // a part slamming the ground faster than
                                 // this rips clean off the machine

        FRICTION_WHEEL: 0.995,   // tangential velocity keep-factor on ground
        FRICTION_BODY: 0.6,      // bare parts grind hard
        BOUNCE: 0.18,            // how bouncy ground impacts are (0..1)

        MOTOR_ACCEL: 360,        // motor wheel acceleration while grounded
        MOTOR_TOP: 460,          // motor stops pushing past this speed

        JAR_HP: 100,
        JAR_SAFE_SPEED: 250,     // jar impacts slower than this never hurt
        JAR_DMG_SCALE: 0.20,     // damage per px/s past the safe limit
        JAR_SHARP_MULT: 2.5,     // spikes hurt extra
        PLANK_SOAK: 0.6,         // each plank joined to the jar soaks damage

        BLAST_RADIUS: CELL * 4,  // TNT / soda blast reach
        FOCUS_SCALE: 0.35,       // slow-mo while aiming at the machine

        STUCK_SPEED: 9,
        STUCK_TIME: 5,
        CAM_LOOKAHEAD: 0.33,
        CAM_SMOOTH: 4.2,
        GHOST_STEP: 0.05
    };

    /* ========================================================================
       MODULE STATE
       ===================================================================== */
    let canvas, ctx, W = 0, H = 0, DPR = 1;
    let level = null;
    let particles = [];          // every physics dot in the world
    let joints = [];             // the springy connections between parts
    let cells = new Map();       // "col,row" → part (parts hold their particle)
    let jarPart = null;          // quick handle to the cargo
    let cart = null;             // shared run-state bag (elapsed, jarHP, jolt…)
    let buildOrigin = null;
    let buildCursor = null;
    let hoveredCell = null;
    let hoveredPart = null;
    let lastLaunchDesign = [];
    let decor = [];              // sparkle particles (visual only)
    let cam = { x: 0, y: 0, zoom: 1 };
    let status = 'idle';         // idle | building | playing | paused | won | lost
    let input = { fan: false };
    let ghost = null;
    let recording = null;
    let skyCache = null;
    let shake = 0;
    let mouse = { x: -9999, y: -9999 };
    let timeScale = 1;
    let slowTimer = 0;

    const events = { onWin: null, onLose: null, onJarHit: null };

    /* ========================================================================
       WORKSHOP GRID (levels can size it: level.grid = {w, h})
       ===================================================================== */
    let COLS = [-2, -1, 0, 1, 2], ROWS = [-2, -1, 0, 1];
    function setGrid(w, h) {
        const half = Math.floor(w / 2);
        COLS = []; for (let c = -half; c <= half; c++) COLS.push(c);
        ROWS = []; for (let r = 2 - h; r <= 1; r++) ROWS.push(r);
    }

    /* ========================================================================
       SMALL HELPERS
       ===================================================================== */
    const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const key = (c, r) => c + ',' + r;

    function screenToWorld(px, py) {
        return { x: (px - W / 2) / cam.zoom + cam.x, y: (py - H / 2) / cam.zoom + cam.y };
    }

    /* ========================================================================
       TERRAIN QUERIES (same data shape as always)
       ===================================================================== */
    function groundAt(x) {
        const t = level.terrain;
        if (x <= t[0][0]) return { y: t[0][1], nx: 0, ny: -1, sharp: false };
        for (let i = 1; i < t.length; i++) {
            const [x1, y1] = t[i - 1], [x2, y2] = t[i];
            if (x <= x2) {
                if (x2 === x1) continue;
                const f = (x - x1) / (x2 - x1);
                const dx = x2 - x1, dy = y2 - y1;
                const len = Math.hypot(dx, dy) || 1;
                let nx = dy / len, ny = -dx / len;
                if (ny > 0) { nx = -nx; ny = -ny; }
                return { y: y1 + (y2 - y1) * f, nx, ny, sharp: isSharp(x) };
            }
        }
        const last = t[t.length - 1];
        return { y: last[1], nx: 0, ny: -1, sharp: false };
    }

    function isSharp(x) {
        for (const [a, b] of level.sharp) if (x >= a && x <= b) return true;
        return false;
    }

    /** Surface under a point: terrain, or a one-way platform top. */
    function surfaceUnder(px, py, vy) {
        let best = null;
        const g = groundAt(px);
        if (py >= g.y - 2) best = g;
        for (const p of level.platforms) {
            if (px < p.x1 || px > p.x2) continue;
            const f = (px - p.x1) / (p.x2 - p.x1 || 1);
            const py2 = p.y1 + (p.y2 - p.y1) * f;
            if (py >= py2 - 2 && py <= py2 + 22 && vy >= -40) {
                if (!best || py2 < best.y) {
                    const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
                    const len = Math.hypot(dx, dy) || 1;
                    best = { y: py2, nx: dy / len, ny: -dx / len, sharp: !!p.sharp };
                    if (best.ny > 0) { best.nx = -best.nx; best.ny = -best.ny; }
                }
            }
        }
        return best;
    }

    /* ========================================================================
       PARTICLES & JOINTS — the soft-body core
       ===================================================================== */
    function makeParticle(x, y, mass, radius, part) {
        const p = { x, y, px: x, py: y, m: mass, r: radius, part, pinned: false, spin: 0, onGround: false };
        particles.push(p);
        return p;
    }

    /** Tie two parts together. `tough` scales how much abuse before it snaps;
        `stiff` (0..1) is how RIGIDLY the joint holds its length each solver
        pass — high = rigid (iron), low = floppy (wood visibly bends). */
    function makeJoint(pa, pb, tough, stiff) {
        const rest = Math.hypot(pb.particle.x - pa.particle.x, pb.particle.y - pa.particle.y);
        joints.push({
            a: pa.particle, b: pb.particle, rest,
            breakAt: TUNING.JOINT_BREAK * (tough || 1),
            stiff: stiff == null ? 0.8 : stiff,
            intact: true
        });
    }

    function partMass(part) {
        return part.def.mass;     // every part (jar included) is a real def now
    }
    function partRadius(part) {
        if (part.def && part.def.isWheel) return part.def.radius;
        if (part.def && part.def.soft) return CELL * 0.4;
        return CELL * 0.46;
    }

    /** How tough a part's joints are (iron frames > jar > everything). */
    function toughFor(part) {
        return (part.def && part.def.tough) || 1;
    }

    /** How stiff a part is (1 = rigid iron, 0.45 = floppy wood, 0.8 default). */
    function stiffFor(part) {
        return (part.def && part.def.stiff != null) ? part.def.stiff : 0.8;
    }

    /** Create a part at a grid cell: particle + joints to its neighbours. */
    function addPart(part, atWorldX, atWorldY) {
        part.particle = makeParticle(atWorldX, atWorldY, partMass(part), partRadius(part), part);
        cells.set(key(part.col, part.row), part);
        // join to the 4 neighbours (and that's what holds machines together).
        // Joint toughness = average of the two parts' tough ratings, so a
        // wheel bolted to an IRON frame holds on much harder than one bolted
        // to wood. That's the whole reason iron frames exist.
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const n = cells.get(key(part.col + dc, part.row + dr));
            if (n && n.particle) {
                makeJoint(part, n, (toughFor(part) + toughFor(n)) / 2,
                                   (stiffFor(part) + stiffFor(n)) / 2);
            }
        }
        // diagonal braces to neighbours-of-neighbours keep shapes from folding.
        // These are the TRIANGULATION: strong diagonals = rigid (iron), weak
        // diagonals let the structure shear/parallelogram = the visible "bend"
        // of wood. So we extra-soften the diagonal for floppy parts.
        for (const [dc, dr] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            const n = cells.get(key(part.col + dc, part.row + dr));
            if (n && n.particle) {
                const s = (stiffFor(part) + stiffFor(n)) / 2;
                makeJoint(part, n, ((toughFor(part) + toughFor(n)) / 2) * 1.15,
                                   s * s);     // squaring softens wood far more
            }                                  // than iron (0.25²=0.06 vs 1²=1)
        }
    }

    /** "Core" now just means the cargo — the one thing crashes can't shed. */
    function isCore(part) { return part.type === 'jar'; }

    /** Detach a part from the machine: its joints snap, it flies free. */
    function detachPart(part) {
        for (const j of joints) {
            if (j.intact && (j.a === part.particle || j.b === part.particle)) j.intact = false;
        }
        cells.delete(key(part.col, part.row));
        part.loose = true;       // still drawn + simulated, just not "the machine"
    }

    /* ========================================================================
       MACHINE SETUP
       ===================================================================== */
    function resetMachine(startX, startY, design) {
        particles = [];
        joints = [];
        cells = new Map();
        decor = [];
        cart = {
            elapsed: 0, jarHP: TUNING.JAR_HP, jolt: 0, gotStarBox: false,
            stuckTimer: 0, distance: 0,
            // parts.js reads these (umbrella checks vy, fans check power…):
            angle: 0, vx: 0, vy: 0,
            enginesOn: true,    // ⚙ system power switch (engine button)
            fansOn: true        // 🌀 all-fans switch (fan button)
        };

        // NOTHING is pre-placed. The machine is 100% whatever the design
        // says — the player placed every single part, jar included.
        jarPart = null;
        for (const d of (level.preAttached || []).concat(design || [])) {
            if (cells.has(key(d.col, d.row))) continue;
            const part = TP_PARTS.make(d.type, d.col, d.row);
            part.dir = d.dir || 0;            // restore the part's aim too
            addPart(part, startX + part.col * CELL, startY + part.row * CELL);
            if (part.type === 'jar') jarPart = part;
        }
        // in the workshop the machine hangs frozen in place
        for (const p of particles) p.pinned = true;
    }

    /**
     * THE POWER SYSTEM. Parts flagged needsPower (powered wheels, fans) only
     * run while they're STRUCTURALLY CONNECTED — through intact joints — to
     * an Engine, and the engine switch is on. Lose the engine in a crash and
     * everything downstream of it goes dead. Just like real machines!
     */
    function updatePower() {
        const powered = new Set();
        if (cart.enginesOn !== false) {
            const queue = [];
            for (const part of cells.values()) {
                if (part.def && part.def.isEngine) { powered.add(part.particle); queue.push(part.particle); }
            }
            while (queue.length) {
                const p = queue.pop();
                for (const j of joints) {
                    if (!j.intact) continue;
                    const o = j.a === p ? j.b : (j.b === p ? j.a : null);
                    if (o && !powered.has(o)) { powered.add(o); queue.push(o); }
                }
            }
        }
        for (const part of cells.values()) {
            if (part.def && part.def.isEngine) {
                part.poweredNow = cart.enginesOn !== false;
            } else if (part.def && part.def.needsPower) {
                part.poweredNow = powered.has(part.particle);
            } else {
                part.poweredNow = true;
            }
        }
    }

    /** Aimable parts (soda, fans) carry a build-time direction (0=→ 1=↓
        2=← 3=↑). Convert it to a live WORLD vector that tilts with the
        machine, so a bottle aimed "down" still fires down-ish mid-flip. */
    function updateWorldDirs() {
        for (const part of cells.values()) {
            if (!part.def || !part.def.rotatable) continue;
            const a = partAngle(part) + (part.dir || 0) * Math.PI / 2;
            part.worldDir = { x: Math.cos(a), y: Math.sin(a) };
        }
    }

    /** Machine facing (for fans + the raccoon's eyes). There's no fixed
        crate anymore, so we read it from ANY two horizontally-joined parts.
        A one-part machine has no meaningful facing — call it level. */
    function machineAngle() {
        for (const j of joints) {
            if (!j.intact || !j.a.part || !j.b.part) continue;
            const dc = j.b.part.col - j.a.part.col;
            const dr = j.b.part.row - j.a.part.row;
            if (dr === 0 && Math.abs(dc) === 1) {
                const left  = dc === 1 ? j.a : j.b;
                const right = dc === 1 ? j.b : j.a;
                return Math.atan2(right.y - left.y, right.x - left.x);
            }
        }
        return 0;
    }

    /** Velocity of one particle (Verlet stores it as position history). */
    function velOf(p) { return { x: (p.x - p.px) / TUNING.DT, y: (p.y - p.py) / TUNING.DT }; }

    /* ========================================================================
       PHYSICS STEP
       ===================================================================== */
    function step(dt) {
        cart.elapsed += dt;
        const jp = jarPart.particle;

        // shared state parts.js reads
        cart.angle = machineAngle();
        const jv = velOf(jp);
        cart.vx = jv.x; cart.vy = jv.y;

        // who has power, and which way is every aimable part pointing
        updatePower();
        updateWorldDirs();

        /* ---- forces from parts (balloon lift, fan thrust, umbrella drag) -- */
        const partForces = [];
        for (const part of cells.values()) {
            if (part.def && part.def.update) part.def.update(cart, part, partForces, input, dt);
        }

        /* ---- integrate (Verlet: position - previous position = velocity) -- */
        for (const p of particles) {
            if (p.pinned) continue;
            let ax = 0, ay = TUNING.GRAVITY;
            for (const f of partForces) {
                if (f.cell.particle === p) { ax += f.fx / p.m; ay += f.fy / p.m; }
            }
            const vx = (p.x - p.px) * TUNING.AIR_DAMP;
            const vy = (p.y - p.py) * TUNING.AIR_DAMP;
            p.px = p.x; p.py = p.y;
            p.x += vx + ax * dt * dt;
            p.y += vy + ay * dt * dt;
        }

        /* ---- joints that got over-stretched by raw motion SNAP -------------
           Checked BEFORE the solver: this is where real violence shows up.
           (After solving, everything looks calm again — too late to notice.) */
        for (const j of joints) {
            if (!j.intact) continue;
            const dist = Math.hypot(j.b.x - j.a.x, j.b.y - j.a.y);
            if (Math.abs(dist - j.rest) / j.rest > j.breakAt) {
                j.intact = false;
                fx('breakOff', null, { x: (j.a.x + j.b.x) / 2, y: (j.a.y + j.b.y) / 2 });
                shake = Math.min(shake + 2, 12);
            }
        }

        /* ---- solve joints (this is what makes it a MACHINE) ---------------
           Two-stage so that frame FLEX is mass-independent:

           STAGE 1 — soft solve, partly correcting each joint toward its rest
           length. Springy and stable; this carries most of the structure.

           STAGE 2 — HARD stretch clamp. Each joint may only stretch/squash up
           to FLEX_RANGE × (1 - stiff): a rigid iron joint (stiff 1 → 0%)
           is snapped back to its exact rest length and reads ROCK SOLID no
           matter how heavy; a floppy wood joint (stiff 0.25 → 12%) is allowed
           to sag that far, so wood VISIBLY bends while iron does not. Because
           it's a geometric clamp, mass doesn't change it — heavy iron stays
           rigid, the thing the soft solver alone could never do. */
        for (let iter = 0; iter < TUNING.SOLVER_ITERS; iter++) {
            for (const j of joints) {
                if (!j.intact) continue;
                const dx = j.b.x - j.a.x, dy = j.b.y - j.a.y;
                const dist = Math.hypot(dx, dy) || 0.0001;
                const diff = (dist - j.rest) / dist;             // full strength
                                                                 // so machines
                                                                 // stay drivable
                const wa = j.a.pinned ? 0 : 1 / j.a.m;
                const wb = j.b.pinned ? 0 : 1 / j.b.m;
                const wsum = wa + wb || 1;
                j.a.x += dx * diff * (wa / wsum);
                j.a.y += dy * diff * (wa / wsum);
                j.b.x -= dx * diff * (wb / wsum);
                j.b.y -= dy * diff * (wb / wsum);
            }
        }
        // STAGE 2 — the hard, mass-independent flex clamp
        for (const j of joints) {
            if (!j.intact) continue;
            const maxStretch = TUNING.FLEX_RANGE * (1 - j.stiff);   // iron→0
            const dx = j.b.x - j.a.x, dy = j.b.y - j.a.y;
            const dist = Math.hypot(dx, dy) || 0.0001;
            const over = Math.abs(dist - j.rest) / j.rest - maxStretch;
            if (over <= 0) continue;                  // within its allowed flex
            // pull both ends to the clamped length (weighted by mass)
            const allowed = j.rest * (1 + Math.sign(dist - j.rest) * maxStretch);
            const corr = (dist - allowed) / dist;
            const wa = j.a.pinned ? 0 : 1 / j.a.m;
            const wb = j.b.pinned ? 0 : 1 / j.b.m;
            const wsum = wa + wb || 1;
            j.a.x += dx * corr * (wa / wsum);
            j.a.y += dy * corr * (wa / wsum);
            j.b.x -= dx * corr * (wb / wsum);
            j.b.y -= dy * corr * (wb / wsum);
        }

        // a part with no intact joints left is officially loose junk
        for (const part of [...cells.values()]) {
            if (isCore(part)) continue;
            let connected = false;
            for (const j of joints) {
                if (j.intact && (j.a === part.particle || j.b === part.particle)) { connected = true; break; }
            }
            if (!connected) detachPart(part);
        }

        /* ---- ground collision per particle --------------------------------- */
        let tickImpact = 0;
        for (const p of particles) {
            if (p.pinned) continue;
            const v = velOf(p);
            const surf = surfaceUnder(p.x, p.y + p.r, v.y);
            p.onGround = false;
            if (!surf) continue;
            const pen = (p.y + p.r) - surf.y;
            if (pen <= 0) continue;
            p.onGround = true;

            // push out of the ground along the surface normal
            p.x += surf.nx * pen;
            p.y += surf.ny * pen;

            // split velocity into into-the-ground + along-the-ground
            const vn = v.x * surf.nx + v.y * surf.ny;       // − = approaching
            const tx = -surf.ny, ty = surf.nx;
            let vt = v.x * tx + v.y * ty;

            // impacts: hitting hard hurts (the jar) and stresses joints
            if (vn < -TUNING.JAR_SAFE_SPEED) {
                tickImpact = Math.max(tickImpact, -vn);
                if (p.part === jarPart) {
                    let hit = (-vn - TUNING.JAR_SAFE_SPEED) * TUNING.JAR_DMG_SCALE;
                    if (surf.sharp) hit *= TUNING.JAR_SHARP_MULT;
                    hurtJar(hit);
                }
                if (window.TP_SOUND && -vn > 300) TP_SOUND.thud(Math.min(1, -vn / 800));
                fx('dust', null, { x: p.x, y: p.y + p.r });

                // CRASH DISASSEMBLY: a part slamming in this hard rips clean
                // off the machine (wheels and planks hold on a bit longer)
                if (p.part && !isCore(p.part) && !p.part.loose) {
                    let limit = TUNING.IMPACT_BREAK;
                    const def = p.part.def;
                    if (def.isWheel) limit *= def.drive ? 1.35 : 1.5;
                    if (p.part.type === 'plank') limit *= 1.2;
                    if (-vn > limit) {
                        fx('breakOff', p.part);
                        detachPart(p.part);
                        shake = Math.min(shake + 3, 14);
                    }
                }
            }

            // friction + bounce, written back as a velocity change
            const isWheel = p.part && p.part.def && p.part.def.isWheel;
            vt *= isWheel ? TUNING.FRICTION_WHEEL : TUNING.FRICTION_BODY;
            const bounce = vn < -120 ? -vn * TUNING.BOUNCE : 0;
            const nvx = tx * vt + surf.nx * bounce;
            const nvy = ty * vt + surf.ny * bounce;
            p.px = p.x - nvx * dt;
            p.py = p.y - nvy * dt;

            // powered wheels push along the ground — but ONLY with an engine
            // connected and switched on (that's what poweredNow tracks)
            if (isWheel && p.part.def.drive && p.part.on !== false && p.part.poweredNow &&
                cells.has(key(p.part.col, p.part.row))) {
                const sp = Math.hypot(nvx, nvy);
                if (sp < TUNING.MOTOR_TOP) {
                    const fdot = (tx * Math.cos(cart.angle) + ty * Math.sin(cart.angle)) >= 0 ? 1 : -1;
                    p.px -= tx * fdot * TUNING.MOTOR_ACCEL * dt * dt * 60;
                    p.py -= ty * fdot * TUNING.MOTOR_ACCEL * dt * dt * 60;
                }
            }

            // sharp ground: pops balloons, and any part hit hard may detach
            if (surf.sharp && p.part && p.part.def) {
                if (p.part.def.popsOnSharp && !p.part.broken) {
                    p.part.broken = true;
                    fx('balloonPop', p.part, { x: p.x, y: p.y });
                }
            }
            if (p.part && p.part.def && p.part.def.onGround) {
                p.part.def.onGround(cart, p.part, -vn, api);
            }
            // wheel spin visual
            if (isWheel) p.spin += vt * dt / p.r;
        }
        cart.jolt = tickImpact;

        /* ---- star box ------------------------------------------------------- */
        if (level.starBox && !cart.gotStarBox) {
            const sb = level.starBox;
            for (const p of particles) {
                if (p.part && p.part.loose) continue;
                if ((sb.x - p.x) ** 2 + (sb.y - p.y) ** 2 < (CELL * 1.2) ** 2) {
                    cart.gotStarBox = true;
                    fx('confetti', null, { x: sb.x, y: sb.y + 150 });
                    if (window.TP_SOUND) TP_SOUND.star();
                    shake = Math.min(shake + 4, 10);
                    break;
                }
            }
        }

        /* ---- win / lose — it's all about the JAR ----------------------------- */
        if (jp.x > level.goalX - 40) finish('won');
        if (jp.y > level.killY) finish('lost', 'The cookies are lost in the junk abyss…');

        const jspeed = Math.hypot(cart.vx, cart.vy);
        if (jspeed < 60 && cart.elapsed > 1.5) slowTimer += dt; else slowTimer = 0;
        if (jspeed < TUNING.STUCK_SPEED && cart.elapsed > 2) {
            cart.stuckTimer += dt;
            if (cart.stuckTimer > TUNING.STUCK_TIME) {
                finish('lost', 'Out of momentum. Build differently and GO again!');
            }
        } else {
            cart.stuckTimer = 0;
        }

        /* ---- ghost recording -------------------------------------------------- */
        if (recording && cart.elapsed - recording.last >= TUNING.GHOST_STEP) {
            recording.last = cart.elapsed;
            recording.t.push(Math.round(cart.elapsed * 100) / 100);
            recording.x.push(Math.round(jp.x));
            recording.y.push(Math.round(jp.y));
            recording.a.push(Math.round(cart.angle * 100) / 100);
        }
    }

    function hurtJar(amount) {
        if (status !== 'playing' || amount <= 0) return;
        // planks still JOINED to the jar soak damage
        let mult = 1;
        for (const j of joints) {
            if (!j.intact) continue;
            const other = j.a === jarPart.particle ? j.b : (j.b === jarPart.particle ? j.a : null);
            if (other && other.part && other.part.type === 'plank') mult *= TUNING.PLANK_SOAK;
        }
        const dmg = amount * mult;
        if (dmg < 1) return;
        cart.jarHP = Math.max(0, cart.jarHP - dmg);
        if (events.onJarHit) events.onJarHit(cart.jarHP, dmg);
        fx('jarHit', null, { x: jarPart.particle.x, y: jarPart.particle.y });
        shake = Math.min(shake + dmg * 0.35, 16);
        if (cart.jarHP <= 0) finish('lost', 'The cookie jar shattered… the heist is off.');
    }

    function finish(result, detail) {
        if (status !== 'playing') return;
        status = result === 'won' ? 'won' : 'lost';
        if (result === 'won' && events.onWin) events.onWin(buildResults());
        if (result === 'lost' && events.onLose) events.onLose(detail);
    }

    /**
     * Score one secondary goal. Levels declare their own pair via
     * level.goals — from the menu: time (beat par), box (grab the star
     * box), avoid (finish WITHOUT a named part in the launched design).
     */
    function scoreGoal(g) {
        if (g.type === 'time') {
            return { ok: cart.elapsed <= level.par, label: `⏱ beat ${level.par}s` };
        }
        if (g.type === 'box') {
            return { ok: cart.gotStarBox, label: '⭐ grab the star box' };
        }
        if (g.type === 'avoid') {
            const used = lastLaunchDesign.some(d => d.type === g.part);
            const pname = (TP_PARTS.defs[g.part] && TP_PARTS.defs[g.part].name) || g.part;
            return { ok: !used, label: `🚫 win without the ${pname}` };
        }
        return { ok: false, label: '?' };
    }

    function buildResults() {
        // star 1 = you finished; stars 2 + 3 are the level's chosen goals
        const goals = level.goals || [{ type: 'time' }, { type: 'box' }];
        return {
            time: cart.elapsed,
            jarHP: cart.jarHP,
            parts: api.partsCount(),
            stars: [
                { ok: true, label: '🏁 reached the den' },
                scoreGoal(goals[0] || { type: 'time' }),
                scoreGoal(goals[1] || { type: 'box' })
            ],
            recording
        };
    }

    /* ========================================================================
       DECOR PARTICLES (sparkles — visual only)
       ===================================================================== */
    const MAX_DECOR = 220;
    function spawn(n, maker) {
        for (let i = 0; i < n && decor.length < MAX_DECOR; i++) decor.push(maker(i));
    }

    const FX_SOUNDS = {
        attach: 'snap', balloonPop: 'pop', sodaBlast: 'fizz',
        springBounce: 'spring', jarHit: 'crack', breakOff: 'crack', tntBoom: 'boom'
    };

    function fx(name, part, posOverride) {
        const pos = posOverride ||
            (part && part.particle ? { x: part.particle.x, y: part.particle.y } : { x: 0, y: 0 });
        if (window.TP_SOUND && FX_SOUNDS[name]) TP_SOUND[FX_SOUNDS[name]]();

        if (name === 'attach') {
            spawn(10, () => ({ x: pos.x, y: pos.y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.5, max: 0.5, size: 3, color: '#ffd24a', grav: 0.3 }));
        } else if (name === 'dust') {
            spawn(4, () => ({ x: pos.x + (Math.random() - 0.5) * 16, y: pos.y, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 90, life: 0.7, max: 0.7, size: 5, color: 'rgba(150,120,90,0.55)', grav: -0.15 }));
        } else if (name === 'balloonPop') {
            spawn(12, () => ({ x: pos.x, y: pos.y - 8, vx: (Math.random() - 0.5) * 380, vy: (Math.random() - 0.5) * 380, life: 0.45, max: 0.45, size: 3.5, color: '#ff90a8', grav: 0.6 }));
        } else if (name === 'sodaBlast') {
            spawn(26, () => ({ x: pos.x, y: pos.y, vx: (Math.random() - 0.5) * 460, vy: (Math.random() - 0.3) * 460, life: 0.8, max: 0.8, size: 4, color: Math.random() < 0.5 ? '#d8ffe9' : '#71d44c', grav: 0.8 }));
        } else if (name === 'tntBoom') {
            spawn(34, () => ({ x: pos.x, y: pos.y, vx: (Math.random() - 0.5) * 560, vy: (Math.random() - 0.5) * 560, life: 0.7, max: 0.7, size: 5, color: Math.random() < 0.5 ? '#ffb35c' : '#e0533f', grav: 0.5 }));
        } else if (name === 'breakOff') {
            spawn(8, () => ({ x: pos.x, y: pos.y, vx: (Math.random() - 0.5) * 340, vy: -Math.random() * 260, life: 0.55, max: 0.55, size: 4, color: '#a8763e', grav: 1.1 }));
        } else if (name === 'springBounce') {
            spawn(8, () => ({ x: pos.x, y: pos.y + 10, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 160, life: 0.4, max: 0.4, size: 3, color: '#b9c2c6', grav: 1 }));
        } else if (name === 'jarHit') {
            spawn(8, () => ({ x: pos.x, y: pos.y, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 200, life: 0.6, max: 0.6, size: 3, color: '#e8c178', grav: 1.4 }));
        } else if (name === 'confetti') {
            spawn(60, () => ({ x: pos.x + (Math.random() - 0.5) * 300, y: pos.y - 200 - Math.random() * 160, vx: (Math.random() - 0.5) * 240, vy: Math.random() * 120, life: 1.8, max: 1.8, size: 4, color: ['#ffd24a', '#59c2b4', '#e07a3f', '#ff90a8'][Math.floor(Math.random() * 4)], grav: 0.35 }));
        }
    }

    function updateDecor(dt) {
        for (let i = decor.length - 1; i >= 0; i--) {
            const p = decor[i];
            p.life -= dt;
            if (p.life <= 0) { decor.splice(i, 1); continue; }
            p.vy += TUNING.GRAVITY * (p.grav || 0) * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
        }
        shake = Math.max(0, shake - dt * 26);
    }

    /* ========================================================================
       RENDERING
       ===================================================================== */
    function paintSky() {
        skyCache = document.createElement('canvas');
        skyCache.width = W; skyCache.height = H;
        const c = skyCache.getContext('2d');
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#5db8f2');
        g.addColorStop(0.55, '#9ed9f7');
        g.addColorStop(1, '#e8f7ff');
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255, 245, 180, 0.95)';
        c.beginPath(); c.arc(W * 0.16, H * 0.18, Math.min(W, H) * 0.07, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255, 250, 210, 0.35)';
        c.beginPath(); c.arc(W * 0.16, H * 0.18, Math.min(W, H) * 0.12, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255, 255, 255, 0.92)';
        for (const [cx, cy, s] of [[W * 0.42, H * 0.16, 1], [W * 0.74, H * 0.26, 1.3], [W * 0.9, H * 0.1, 0.8]]) {
            c.beginPath();
            c.arc(cx - 34 * s, cy, 22 * s, 0, Math.PI * 2);
            c.arc(cx, cy - 12 * s, 30 * s, 0, Math.PI * 2);
            c.arc(cx + 36 * s, cy, 24 * s, 0, Math.PI * 2);
            c.fill();
        }
    }

    function drawParallax(layer, offsetX) {
        const period = 900;
        const baseY = H * (layer === 0 ? 0.68 : 0.8);
        ctx.fillStyle = layer === 0 ? 'rgba(140, 185, 120, 0.55)' : 'rgba(96, 148, 84, 0.8)';
        const shift = ((offsetX % period) + period) % period;
        for (let px = -shift - period; px < W + period; px += period) {
            ctx.beginPath();
            ctx.moveTo(px, H);
            ctx.lineTo(px, baseY + 40);
            ctx.quadraticCurveTo(px + 110, baseY - 60, px + 240, baseY + 30);
            ctx.lineTo(px + 270, baseY - 10);
            ctx.lineTo(px + 330, baseY - 10);
            ctx.lineTo(px + 350, baseY + 25);
            ctx.quadraticCurveTo(px + 470, baseY - 80, px + 600, baseY + 20);
            ctx.lineTo(px + 640, baseY + 20);
            ctx.lineTo(px + 645, baseY - 130);
            ctx.lineTo(px + 760, baseY - 125);
            ctx.lineTo(px + 760, baseY - 112);
            ctx.lineTo(px + 658, baseY - 116);
            ctx.lineTo(px + 663, baseY + 25);
            ctx.quadraticCurveTo(px + 800, baseY - 30, px + period, baseY + 45);
            ctx.lineTo(px + period, H);
            ctx.closePath();
            ctx.fill();
        }
    }

    function render(time) {
        if (W < 2 || H < 2) return;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        if (!skyCache) paintSky();
        ctx.drawImage(skyCache, 0, 0, W, H);
        if (!level || !cart) return;

        drawParallax(0, cam.x * 0.06);
        drawParallax(1, cam.x * 0.16);

        const sx = (Math.random() - 0.5) * shake;
        const sy = (Math.random() - 0.5) * shake;
        ctx.save();
        ctx.translate(W / 2 + sx, H / 2 + sy);
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-cam.x, -cam.y);

        drawTerrain();
        drawPlatforms();
        drawSigns();
        drawGoal();
        drawStarBox(time);
        if (status === 'building') drawBuildGrid();
        if (ghost) drawGhost();
        drawMachine(time);
        drawDecor();
        drawStuckHint(time);

        ctx.restore();
    }

    function drawTerrain() {
        const t = level.terrain;
        ctx.beginPath();
        ctx.moveTo(t[0][0], t[0][1]);
        for (let i = 1; i < t.length; i++) ctx.lineTo(t[i][0], t[i][1]);
        ctx.lineTo(t[t.length - 1][0], cam.y + H);
        ctx.lineTo(t[0][0], cam.y + H);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, cam.y - 200, 0, cam.y + H * 0.8);
        g.addColorStop(0, '#9c6b42');
        g.addColorStop(1, '#5e3f28');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = '#5fae3f';
        ctx.lineWidth = 9;
        ctx.stroke();

        // grass + pebbles (visible strip only, hash-stable so no flicker)
        const viewL = cam.x - (W / 2) / cam.zoom - 80;
        const viewR = cam.x + (W / 2) / cam.zoom + 80;
        const h01 = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
        ctx.strokeStyle = '#4c9434';
        ctx.lineWidth = 2.5;
        for (let gx = Math.floor(viewL / 70) * 70; gx < viewR; gx += 70) {
            const r = h01(gx);
            if (r < 0.25 || isSharp(gx)) continue;
            const gy = groundAt(gx).y;
            const lean = (r - 0.5) * 8;
            ctx.beginPath();
            ctx.moveTo(gx, gy + 2);     ctx.lineTo(gx - 4 + lean, gy - 9);
            ctx.moveTo(gx + 3, gy + 2); ctx.lineTo(gx + 5 + lean, gy - 12);
            ctx.moveTo(gx + 6, gy + 2); ctx.lineTo(gx + 10 + lean, gy - 7);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(60, 38, 22, 0.35)';
        for (let gx = Math.floor(viewL / 110) * 110; gx < viewR; gx += 110) {
            const r = h01(gx + 7);
            const gy = groundAt(gx + r * 40).y;
            ctx.beginPath();
            ctx.ellipse(gx + r * 40, gy + 28 + r * 50, 7 + r * 6, 5 + r * 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // spikes
        ctx.fillStyle = '#3a2026';
        ctx.strokeStyle = '#d8506a';
        ctx.lineWidth = 1.5;
        for (const [a, b] of level.sharp) {
            for (let x = a; x < b - 12; x += 26) {
                const g1 = groundAt(x), g2 = groundAt(x + 26);
                ctx.beginPath();
                ctx.moveTo(x, g1.y + 2);
                ctx.lineTo(x + 13, Math.min(g1.y, g2.y) - 20);
                ctx.lineTo(x + 26, g2.y + 2);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
            }
        }
    }

    function drawPlatforms() {
        for (const p of level.platforms) {
            ctx.save();
            ctx.translate(p.x1, p.y1);
            ctx.rotate(Math.atan2(p.y2 - p.y1, p.x2 - p.x1));
            const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
            ctx.fillStyle = '#6e4a35';
            ctx.fillRect(0, 0, len, 14);
            ctx.fillStyle = '#8a5a3a';
            ctx.fillRect(0, 0, len, 4);
            ctx.fillStyle = '#46301f';
            for (let x = 14; x < len; x += 48) {
                ctx.beginPath(); ctx.arc(x, 9, 2.4, 0, Math.PI * 2); ctx.fill();
            }
            if (p.sharp) {
                ctx.fillStyle = '#3a2026';
                ctx.strokeStyle = '#d8506a';
                for (let x = 6; x < len - 16; x += 22) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0); ctx.lineTo(x + 11, -16); ctx.lineTo(x + 22, 0);
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                }
            }
            ctx.restore();
        }
    }

    function drawSigns() {
        for (const s of (level.signs || [])) {
            const gy = groundAt(s.x).y;
            ctx.save();
            ctx.translate(s.x, gy);
            ctx.fillStyle = '#5e3c1e';
            ctx.fillRect(-4, -52, 8, 52);
            ctx.font = '700 15px "Segoe UI", sans-serif';
            const w = ctx.measureText(s.text).width + 26;
            ctx.fillStyle = '#8a5a33';
            ctx.beginPath(); ctx.roundRect(-w / 2, -86, w, 38, 6); ctx.fill();
            ctx.strokeStyle = '#46301f'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#ffe9c9';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(s.text, 0, -67);
            ctx.restore();
        }
    }

    function drawGoal() {
        const gx = level.goalX;
        const gy = groundAt(gx).y;
        ctx.fillStyle = '#33202c';
        ctx.beginPath();
        ctx.moveTo(gx - 55, gy);
        ctx.quadraticCurveTo(gx, gy - 110, gx + 55, gy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#150b14';
        ctx.beginPath();
        ctx.moveTo(gx - 32, gy);
        ctx.quadraticCurveTo(gx, gy - 68, gx + 32, gy);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d8c9b0';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(gx + 48, gy - 4); ctx.lineTo(gx + 48, gy - 130); ctx.stroke();
        ctx.fillStyle = '#59c2b4';
        ctx.beginPath();
        ctx.moveTo(gx + 48, gy - 130);
        ctx.lineTo(gx + 100, gy - 116);
        ctx.lineTo(gx + 48, gy - 102);
        ctx.closePath(); ctx.fill();
    }

    function drawStarBox(time) {
        if (!level.starBox || (cart && cart.gotStarBox)) return;
        const sb = level.starBox;
        const bob = Math.sin(time * 0.003) * 6;
        ctx.save();
        ctx.translate(sb.x, sb.y + bob);
        ctx.rotate(Math.sin(time * 0.0016) * 0.12);
        const pulse = 0.45 + Math.sin(time * 0.005) * 0.2;
        ctx.strokeStyle = `rgba(255, 210, 74, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, CELL * 1.05, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#a8763e';
        ctx.fillRect(-16, -16, 32, 32);
        ctx.strokeStyle = '#5e3c1e'; ctx.lineWidth = 2;
        ctx.strokeRect(-16, -16, 32, 32);
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 ? 5 : 12;
            const a = -Math.PI / 2 + i * Math.PI / 5;
            ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    function drawBuildGrid() {
        ctx.save();
        ctx.translate(buildOrigin.x, buildOrigin.y);
        const x0 = COLS[0] * CELL - CELL * 0.85;
        const y0 = ROWS[0] * CELL - CELL * 0.85;
        const w = (COLS.length - 1) * CELL + CELL * 1.7;
        const h = (ROWS.length - 1) * CELL + CELL * 1.7;
        ctx.fillStyle = 'rgba(43, 92, 158, 0.88)';
        ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 14); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let gx = x0 + CELL / 2; gx < x0 + w; gx += CELL / 2) { ctx.moveTo(gx, y0 + 4); ctx.lineTo(gx, y0 + h - 4); }
        for (let gy = y0 + CELL / 2; gy < y0 + h; gy += CELL / 2) { ctx.moveTo(x0 + 4, gy); ctx.lineTo(x0 + w - 4, gy); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (const [px, py] of [[x0 + 10, y0 + 10], [x0 + w - 10, y0 + 10], [x0 + 10, y0 + h - 10], [x0 + w - 10, y0 + h - 10]]) {
            ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
        }
        for (const c of COLS) for (const r of ROWS) {
            const occupied = cells.has(key(c, r));
            const isHover = hoveredCell && hoveredCell.col === c && hoveredCell.row === r;
            ctx.beginPath();
            ctx.roundRect(c * CELL - CELL / 2 + 2, r * CELL - CELL / 2 + 2, CELL - 4, CELL - 4, 6);
            if (occupied) {
                ctx.strokeStyle = 'rgba(255, 244, 227, 0.10)';
                ctx.lineWidth = 1;
                ctx.stroke();
            } else if (isHover && buildCursor && api.canPlace(c, r)) {
                ctx.fillStyle = 'rgba(89, 194, 180, 0.18)';
                ctx.fill();
                ctx.strokeStyle = '#59c2b4';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.save();
                ctx.translate(c * CELL, r * CELL);
                ctx.globalAlpha = 0.45;
                TP_PARTS.defs[buildCursor].draw(ctx, {}, 0);
                ctx.restore();
            } else if (isHover && buildCursor) {
                ctx.fillStyle = 'rgba(224, 83, 63, 0.14)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(224, 83, 63, 0.7)';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        ctx.restore();
    }

    function drawGhost() {
        const t = cart.elapsed;
        const g = ghost;
        let i = g._i || 0;
        while (i < g.t.length - 1 && g.t[i + 1] < t) i++;
        g._i = i;
        if (i >= g.t.length - 1) i = g.t.length - 2;
        if (i < 0 || g.t.length < 2) return;
        const f = clamp((t - g.t[i]) / ((g.t[i + 1] - g.t[i]) || 1), 0, 1);
        const x = lerp(g.x[i], g.x[i + 1], f);
        const y = lerp(g.y[i], g.y[i + 1], f);
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.translate(x, y);
        ctx.fillStyle = '#9fd9ff';
        ctx.fillRect(-CELL * 1.5, 0, CELL * 3, CELL);
        ctx.beginPath(); ctx.arc(-CELL, CELL * 1.4, CELL * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(CELL, CELL * 1.4, CELL * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    /** Orientation of a part = direction to a joined neighbour (so pieces
        tilt naturally as the machine flexes, and debris keeps its last tilt). */
    function partAngle(part) {
        const p = part.particle;
        for (const j of joints) {
            if (!j.intact) continue;
            let other = null, expect = 0;
            if (j.a === p) other = j.b; else if (j.b === p) other = j.a; else continue;
            if (!other.part) continue;
            const dc = (other.part.col - part.col), dr = (other.part.row - part.row);
            if (dc === 0 && dr === 0) continue;
            expect = Math.atan2(dr, dc);
            return Math.atan2(other.y - p.y, other.x - p.x) - expect;
        }
        return p.spin || 0;
    }

    function drawMachine(time) {
        /* joints first — drawn as little wooden beams so the machine visibly
           hangs together (and you SEE where it broke) */
        ctx.strokeStyle = '#8a5a33';
        ctx.lineWidth = 6;
        for (const j of joints) {
            if (!j.intact) continue;
            ctx.beginPath();
            ctx.moveTo(j.a.x, j.a.y);
            ctx.lineTo(j.b.x, j.b.y);
            ctx.stroke();
        }

        for (const part of allParts()) {
            const p = part.particle;
            const ang = partAngle(part);
            ctx.save();
            ctx.translate(p.x, p.y);
            // aimable parts also carry their build-time rotation (90° steps)
            ctx.rotate(ang + (part.dir || 0) * Math.PI / 2);

            if (part.type === 'jar') {
                // the cargo — and the raccoon rides wherever the jar is
                drawJar();
                drawRaccoon(time);
            } else {
                // (no auto-frame anymore — structure is the frames YOU placed)
                if (part === hoveredPart && (part.def.activate || part.def.onEject)) {
                    ctx.strokeStyle = '#59c2b4';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([5, 4]);
                    ctx.beginPath(); ctx.arc(0, 0, CELL * 0.72, 0, Math.PI * 2); ctx.stroke();
                    ctx.setLineDash([]);
                }
                part.def.draw(ctx, part, part.particle.spin);
            }
            ctx.restore();
        }
    }

    /** Every part that still exists in the world (attached + loose). */
    function allParts() {
        const out = [];
        for (const p of particles) if (p.part) out.push(p.part);
        return out;
    }

    function drawJar() {
        ctx.fillStyle = 'rgba(214, 235, 240, 0.55)';
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-12, -12, 24, 26, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b3793f';
        for (const [cx2, cy2] of [[-4, 4], [5, 1], [-1, 9]]) {
            ctx.beginPath(); ctx.arc(cx2, cy2, 4.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#7e2f3c';
        ctx.fillRect(-13, -16, 26, 6);
        const hp = cart.jarHP;
        if (hp < 67) {
            ctx.strokeStyle = 'rgba(40,30,30,0.8)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(-8, -8); ctx.lineTo(-2, 0); ctx.lineTo(-7, 7);
            ctx.stroke();
        }
        if (hp < 34) {
            ctx.beginPath();
            ctx.moveTo(9, -8); ctx.lineTo(3, 2); ctx.lineTo(8, 6); ctx.lineTo(2, 11);
            ctx.stroke();
        }
    }

    function drawRaccoon(time) {
        ctx.save();
        ctx.translate(0, -CELL * 0.72);
        const wag = Math.sin(time * 0.008) * 0.25;
        ctx.save();
        ctx.rotate(-0.6 + wag);
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 ? '#4a4a52' : '#23232a';
            ctx.beginPath();
            ctx.ellipse(-10 - i * 7, 0, 8 - i, 6 - i * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = '#5a5a64';
        ctx.beginPath(); ctx.ellipse(0, 4, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6a6a74';
        ctx.beginPath(); ctx.arc(4, -7, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a4a52';
        ctx.beginPath(); ctx.arc(-2, -14, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -14, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#23232a';
        ctx.beginPath(); ctx.ellipse(4, -7, 8.4, 4, 0, 0, Math.PI * 2); ctx.fill();
        const look = clamp((cart.vx || 0) * 0.004, -2, 2);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(1 + look, -7, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8 + look, -7, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1d1023';
        ctx.beginPath(); ctx.arc(1.6 + look, -7, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8.6 + look, -7, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d8d3c8';
        ctx.beginPath(); ctx.ellipse(6, -2.5, 4.4, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1d1023';
        const airborne = status === 'playing' && !anyWheelGrounded();
        if (airborne) { ctx.beginPath(); ctx.arc(6, -2, 1.8, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(6, -3.4, 1.2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    }

    function anyWheelGrounded() {
        for (const p of particles) {
            if (p.part && p.part.def && p.part.def.isWheel && p.onGround) return true;
        }
        return false;
    }

    function drawDecor() {
        for (const p of decor) {
            ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    function drawStuckHint(time) {
        if (status !== 'playing' || slowTimer < 0.9) return;
        const a = Math.min(1, (slowTimer - 0.9) * 2);
        const bob = Math.sin(time * 0.006) * 4;
        const jp = jarPart.particle;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(jp.x, jp.y - CELL * 3.4 + bob);
        ctx.font = '800 17px "Segoe UI", sans-serif';
        const msg = 'Stuck? Click your motor / soda / TNT!';
        const w = ctx.measureText(msg).width + 30;
        ctx.fillStyle = 'rgba(20, 10, 26, 0.88)';
        ctx.beginPath(); ctx.roundRect(-w / 2, -20, w, 40, 12); ctx.fill();
        ctx.strokeStyle = '#59c2b4'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#d8fff7';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(msg, 0, 1);
        ctx.restore();
    }

    /* ========================================================================
       FRAME DRIVER
       ===================================================================== */
    let accumulator = 0;

    function frame(dtReal, time) {
        if (window.innerWidth >= 2 && (W !== window.innerWidth || H !== window.innerHeight)) {
            api.resize();
        }

        if (status === 'playing') {
            const jp = jarPart.particle;
            const mw = screenToWorld(mouse.x, mouse.y);
            const nearMachine = (mw.x - jp.x) ** 2 + (mw.y - jp.y) ** 2 < (CELL * 5) ** 2;
            timeScale = lerp(timeScale, nearMachine ? TUNING.FOCUS_SCALE : 1, 1 - Math.exp(-10 * dtReal));

            hoveredPart = null;
            if (nearMachine) {
                let bestD = (CELL * 1.6) ** 2;
                for (const part of cells.values()) {
                    if (isCore(part)) continue;
                    const d = (mw.x - part.particle.x) ** 2 + (mw.y - part.particle.y) ** 2;
                    if (d < bestD) { bestD = d; hoveredPart = part; }
                }
            }

            accumulator += Math.min(dtReal, 0.1) * timeScale;
            while (accumulator >= TUNING.DT) {
                step(TUNING.DT);
                accumulator -= TUNING.DT;
                if (status !== 'playing') break;
            }

            const jp2 = jarPart.particle;
            const v = velOf(jp2);
            const k = 1 - Math.exp(-TUNING.CAM_SMOOTH * dtReal);
            cam.x = lerp(cam.x, jp2.x + v.x * TUNING.CAM_LOOKAHEAD, k);
            cam.y = lerp(cam.y, jp2.y - 40 + v.y * 0.08, k);
            const speed = Math.hypot(v.x, v.y);
            cam.zoom = lerp(cam.zoom, clamp(1.04 - speed * 0.00028, 0.78, 1.04) * (H / 720), 2.5 * dtReal);
        } else if (status === 'building') {
            hoveredCell = api.cellAtScreen(mouse.x, mouse.y);
        }
        updateDecor(dtReal);
        render(time);
    }

    /* ========================================================================
       PUBLIC API
       ===================================================================== */
    const api = {
        TUNING,

        init(canvasEl) {
            canvas = canvasEl;
            ctx = canvas.getContext('2d');
            api.resize();
        },

        resize() {
            if (window.innerWidth < 2 || window.innerHeight < 2) return;
            DPR = Math.min(window.devicePixelRatio || 1, 1.5);
            W = window.innerWidth; H = window.innerHeight;
            canvas.width = Math.round(W * DPR);
            canvas.height = Math.round(H * DPR);
            skyCache = null;
        },

        loadLevel(def, design) {
            level = def;
            setGrid((def.grid && def.grid.w) || 5, (def.grid && def.grid.h) || 4);
            resetMachine(def.start.x, def.start.y, design);
            buildOrigin = { x: def.start.x, y: def.start.y };
            cam.x = def.start.x; cam.y = def.start.y - 40; cam.zoom = (H / 720) * 0.92;
            status = 'building';
            accumulator = 0;
            shake = 0;
            timeScale = 1; slowTimer = 0; hoveredPart = null; hoveredCell = null;
            ghost = null;
            recording = { t: [], x: [], y: [], a: [], last: -1 };
        },

        launch() {
            if (status !== 'building') return false;
            if (!jarPart) return false;        // no cargo, no heist
            lastLaunchDesign = api.getDesign();
            for (const p of particles) {
                p.pinned = false;
                p.px = p.x - 40 * TUNING.DT;       // the classic starting push
                p.py = p.y;
            }
            cart.elapsed = 0;
            status = 'playing';
        },

        getDesign() {
            // EVERYTHING is part of the design now — jar position included.
            // Retry rebuilds exactly this, aim directions and all.
            const out = [];
            for (const p of cells.values()) {
                out.push({ type: p.type, col: p.col, row: p.row, dir: p.dir || 0 });
            }
            return out;
        },

        /** What's at a build cell? (main.js uses this to route clicks) */
        partInfoAt(col, row) {
            const p = cells.get(key(col, row));
            if (!p) return null;
            return {
                type: p.type,
                removable: !isCore(p) && !p.builtIn,
                rotatable: !!(p.def && p.def.rotatable)
            };
        },

        /** Workshop: spin an aimable part 90° (→ ↓ ← ↑). */
        rotatePart(col, row) {
            if (status !== 'building') return false;
            const p = cells.get(key(col, row));
            if (!p || !p.def || !p.def.rotatable) return false;
            p.dir = ((p.dir || 0) + 1) % 4;
            if (window.TP_SOUND) TP_SOUND.snap();
            return true;
        },

        getLaunchDesign() { return lastLaunchDesign.slice(); },

        cellAtScreen(px, py) {
            const w = screenToWorld(px, py);
            const col = Math.round((w.x - buildOrigin.x) / CELL);
            const row = Math.round((w.y - buildOrigin.y) / CELL);
            if (col < COLS[0] || col > COLS[COLS.length - 1]) return null;
            if (row < ROWS[0] || row > ROWS[ROWS.length - 1]) return null;
            return { col, row };
        },

        canPlace(col, row) {
            if (cells.has(key(col, row))) return false;
            if (cells.size === 0) return true;     // first part seeds the build
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                if (cells.has(key(col + dc, row + dr))) return true;
            }
            return false;
        },

        placePart(type, col, row, dir) {
            if (status !== 'building' || !api.canPlace(col, row)) return false;
            if (type === 'jar' && jarPart) return false;   // only one cargo
            const part = TP_PARTS.make(type, col, row);
            part.dir = dir || 0;
            addPart(part, buildOrigin.x + col * CELL, buildOrigin.y + row * CELL);
            part.particle.pinned = true;
            if (part.type === 'jar') jarPart = part;
            fx('attach', part);
            return true;
        },

        /** Take a part off the grid. Returns {type, dir} so drags and the
            tray can restore its aim, or null if there's nothing to take. */
        removePart(col, row) {
            if (status !== 'building') return null;
            const part = cells.get(key(col, row));
            if (!part) return null;
            // delete its joints AND its particle (we're in the workshop —
            // it goes back in the tray, it doesn't fall on the floor)
            joints = joints.filter(j => j.a !== part.particle && j.b !== part.particle);
            particles = particles.filter(p => p !== part.particle);
            cells.delete(key(col, row));
            if (part.type === 'jar') jarPart = null;       // GO greys out
            if (window.TP_SOUND) TP_SOUND.unsnap();
            return { type: part.type, dir: part.dir || 0 };
        },

        /** Is the cookie jar placed? (GO button stays off until it is.) */
        hasCargo() { return !!jarPart; },

        setBuildCursor(type) { buildCursor = type; },
        setMouse(px, py) { mouse.x = px; mouse.y = py; },

        /** Mid-run click: ACTIVATE the part (motor toggle, fan toggle, TNT,
            soda, balloon-pop). Plain structure does nothing — build better! */
        activateAtScreen(px, py) {
            if (status !== 'playing') return false;
            const { x: wx, y: wy } = screenToWorld(px, py);
            let best = null, bestD = (CELL * 1.6) ** 2;
            for (const part of cells.values()) {
                if (isCore(part)) continue;
                const d = (wx - part.particle.x) ** 2 + (wy - part.particle.y) ** 2;
                if (d < bestD) { bestD = d; best = part; }
            }
            if (!best) return false;
            if (best.def.activate) { best.def.activate(cart, best, api); return true; }
            if (best.def.onEject) {           // TNT + soda: detach & detonate
                detachPart(best);
                best.def.onEject(cart, best, api);
                return true;
            }
            return false;
        },

        ejectLast() { return false; },        // gone — BP machines don't yeet

        /* ------------------------------------------------------------------
           RUN-PHASE BUTTON BAR support. The bar shows one button per part
           CLASS that's on the machine; these two calls drive it.
           ------------------------------------------------------------------ */
        getRunActions() {
            const out = {};
            let engines = 0, fans = 0, sodas = 0, tnts = 0, balloons = 0;
            for (const p of cells.values()) {
                if (!p.def) continue;
                if (p.def.isEngine) engines++;
                if (p.type === 'fan') fans++;
                if (p.type === 'soda' && !p.spent && !p.firing) sodas++;
                if (p.type === 'tnt') tnts++;
                if (p.type === 'balloon' && !p.broken) balloons++;
            }
            if (engines)  out.engine  = { on: cart.enginesOn !== false, count: engines };
            if (fans)     out.fan     = { on: cart.fansOn !== false, count: fans };
            if (sodas)    out.soda    = { count: sodas };
            if (tnts)     out.tnt     = { count: tnts };
            if (balloons) out.balloon = { count: balloons };
            return out;
        },

        runAction(kind) {
            if (status !== 'playing' || !cart) return false;
            if (kind === 'engine') {                  // whole-system power
                cart.enginesOn = !(cart.enginesOn !== false);
                if (window.TP_SOUND) TP_SOUND.click();
                return true;
            }
            if (kind === 'fan') {                     // all fans at once
                cart.fansOn = !(cart.fansOn !== false);
                if (window.TP_SOUND) TP_SOUND.click();
                return true;
            }
            if (kind === 'soda') {                    // fire ALL ready bottles
                for (const p of cells.values()) {
                    if (p.type === 'soda' && !p.spent && !p.firing) p.def.activate(cart, p, api);
                }
                return true;
            }
            if (kind === 'tnt') {                     // detonate ALL the TNT
                for (const p of [...cells.values()]) {
                    if (p.type === 'tnt') { detachPart(p); p.def.onEject(cart, p, api); }
                }
                return true;
            }
            if (kind === 'balloon') {                 // pop ONE random balloon
                const bs = [...cells.values()].filter(p => p.type === 'balloon' && !p.broken);
                if (bs.length) {
                    const b = bs[Math.floor(Math.random() * bs.length)];
                    b.def.activate(cart, b, api);
                }
                return true;
            }
            return false;
        },

        setGhost(g) { ghost = g ? { ...g, _i: 0 } : null; },
        getRecording() { return recording; },
        celebrate() { if (jarPart) fx('confetti', null, { x: jarPart.particle.x, y: jarPart.particle.y }); },

        /* hooks for parts.js -------------------------------------------------- */
        impulseAtCell(part, jx, jy) {
            const p = part.particle;
            p.px -= jx * TUNING.DT * 0.9;
            p.py -= jy * TUNING.DT * 0.9;
        },
        /** Radial blast: every connected particle near the source gets shoved. */
        impulseAwayFromCell(part, power) {
            const src = part.particle;
            for (const p of particles) {
                if (p === src || p.pinned) continue;
                const dx = p.x - src.x, dy = p.y - src.y;
                const d = Math.hypot(dx, dy);
                if (d > TUNING.BLAST_RADIUS) continue;
                const fall = 1 - d / TUNING.BLAST_RADIUS;
                const s = power * fall * TUNING.DT;
                p.px -= (dx / (d || 1)) * s;
                p.py -= (dy / (d || 1)) * s - s * 0.35;   // extra "up" for fun arcs
            }
            // the blasted part itself rockets the other way
            src.px = src.x + power * 0.6 * TUNING.DT;
            src.py = src.y + power * 0.3 * TUNING.DT;
        },
        fx,

        frame,
        setInput(o) { Object.assign(input, o); },

        get status() { return status; },
        set status(v) { status = v; },
        elapsed: () => cart ? cart.elapsed : 0,
        jarHP: () => cart ? cart.jarHP : 0,

        /** Parts still joined (directly or indirectly) to the jar. */
        partsCount() {
            if (!jarPart || !jarPart.particle) return 0;
            const seen = new Set([jarPart.particle]);
            const queue = [jarPart.particle];
            while (queue.length) {
                const p = queue.pop();
                for (const j of joints) {
                    if (!j.intact) continue;
                    const o = j.a === p ? j.b : (j.b === p ? j.a : null);
                    if (o && !seen.has(o)) { seen.add(o); queue.push(o); }
                }
            }
            let n = 0;
            for (const p of seen) {
                if (p.part && !isCore(p.part)) n++;
            }
            return n;
        },

        // world Y of a given cell's particle — used by tests to measure how
        // far a cantilever arm's tip droops (frame flex, isolated from wheels)
        cellY(col, row) {
            const p = cells.get(key(col, row));
            return p && p.particle ? p.particle.y : null;
        },

        _debug() {
            const jp = jarPart ? jarPart.particle : { x: 0, y: 0 };
            const v = jarPart ? velOf(jp) : { x: 0, y: 0 };
            // peak joint stretch — how far any intact joint is from its rest
            // length right now (as a fraction). Higher = the machine is
            // flexing more. Used to prove wood flexes more than iron.
            let peakStretch = 0;
            for (const j of joints) {
                if (!j.intact) continue;
                const d = Math.hypot(j.b.x - j.a.x, j.b.y - j.a.y);
                peakStretch = Math.max(peakStretch, Math.abs(d - j.rest) / j.rest);
            }
            return {
                x: Math.round(jp.x), y: Math.round(jp.y),
                vx: Math.round(v.x), vy: Math.round(v.y),
                angle: Math.round((cart ? cart.angle : 0) * 100) / 100,
                particles: particles.length,
                jointsIntact: joints.filter(j => j.intact).length,
                peakStretch: Math.round(peakStretch * 1000) / 1000,
                gotStarBox: cart ? cart.gotStarBox : false,
                cells: [...cells.keys()]
            };
        },

        events
    };

    window.TP_ENGINE = api;
})();
