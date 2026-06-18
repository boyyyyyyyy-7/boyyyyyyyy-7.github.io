/* ============================================================================
   PARTS.JS — every junk part in the game lives in this one file.
   ----------------------------------------------------------------------------
   WANT TO ADD A NEW PART? Add one entry to TP_PARTS.defs below and it will
   automatically work as a pickup, attach to the cart, show up in levels, and
   be ejectable. That's the whole job.

   Each part definition:
     name      — shown nowhere yet, but handy for debugging
     mass      — how much it weighs (the cart's handling changes with mass!)
     update    — (optional) called every physics tick while attached;
                 push forces/torques onto the cart here (balloon lift, fan…)
     onGround  — (optional) called when this part's cell touches the ground
     onEject   — (optional) extra effect when the player ejects it
     draw      — paints the part on the canvas. (0,0) is the CENTER of the
                 part's grid cell, one cell is CELL px wide. Keep art inside
                 roughly ±CELL/2 so parts don't overlap their neighbours.
   ========================================================================== */

(function () {
    'use strict';

    const CELL = 34; // grid cell size in px — must match engine.js

    /* Tiny helpers so the draw functions below stay short and readable */
    function rounded(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    const defs = {

        /* ------------------------------------------------------------------
           COOKIE JAR — the cargo. The whole point. Place it ANYWHERE in the
           grid (it can even be the first piece); the machine exists to get
           THIS to the den. The raccoon rides wherever the jar is. You can't
           launch without it. Engine.js draws the in-world version (with
           damage cracks + the raccoon) — this draw() is for the parts bin.
           ------------------------------------------------------------------ */
        jar: {
            name: 'Cookie Jar',
            mass: 1.4,
            isCargo: true,
            tough: 1.4,                    // its joints hold on a bit harder
            draw(ctx) {
                ctx.fillStyle = 'rgba(214, 235, 240, 0.55)';
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.roundRect(-12, -12, 24, 26, 6);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#b3793f';
                for (const [cx2, cy2] of [[-4, 4], [5, 1], [-1, 9]]) {
                    ctx.beginPath(); ctx.arc(cx2, cy2, 4.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = '#7e2f3c';
                ctx.fillRect(-13, -16, 26, 6);
            }
        },

        /* ------------------------------------------------------------------
           WOODEN FRAME — the basic structure block. Light and a little
           flexible; what most machines are built from. Breaks like wood.
           ------------------------------------------------------------------ */
        woodframe: {
            name: 'Wooden Frame',
            mass: 0.7,
            frame: true,
            stiff: 0.25,                   // FLOPPY — wood visibly bends on bumps
                                           // (a joint's stiffness is the average
                                           // of the two parts it links — see engine)
            draw(ctx) {
                ctx.fillStyle = 'rgba(190, 140, 80, 0.6)';
                ctx.fillRect(-CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4);
                ctx.strokeStyle = 'rgba(120, 80, 40, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-CELL / 2 + 4, -CELL / 2 + 4);
                ctx.lineTo(CELL / 2 - 4, CELL / 2 - 4);
                ctx.stroke();
                ctx.strokeStyle = '#7a5028';
                ctx.lineWidth = 3.5;
                ctx.strokeRect(-CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4);
            }
        },

        /* ------------------------------------------------------------------
           IRON FRAME — the heavy-duty structure block. Much tougher joints
           (the machine bends and breaks somewhere ELSE first), but heavy:
           an all-iron machine is a slow machine.
           ------------------------------------------------------------------ */
        ironframe: {
            name: 'Iron Frame',
            mass: 1.4,                     // ≈2× wood (wiki: "metal box weighs
                                           // twice the wooden box")
            frame: true,
            tough: 2.4,                    // joints to iron survive real abuse
            stiff: 1.0,                    // RIGID — iron barely flexes; an
                                           // iron machine bends/breaks elsewhere
            draw(ctx) {
                ctx.fillStyle = '#8d999e';
                ctx.fillRect(-CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4);
                ctx.strokeStyle = '#52595d';
                ctx.lineWidth = 3.5;
                ctx.strokeRect(-CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4);
                // cross brace + corner rivets
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(-CELL / 2 + 5, CELL / 2 - 5);
                ctx.lineTo(CELL / 2 - 5, -CELL / 2 + 5);
                ctx.stroke();
                ctx.fillStyle = '#3f4549';
                const o = CELL / 2 - 7;
                for (const [rx, ry] of [[-o, -o], [o, -o], [-o, o], [o, o]]) {
                    ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, Math.PI * 2); ctx.fill();
                }
            }
        },

        /* ------------------------------------------------------------------
           WHEEL — the workhorse. Touching the ground gives suspension +
           grip (that logic lives in engine.js — a cell simply being a wheel
           is what turns it into a suspension point).
           ------------------------------------------------------------------ */
        wheel: {
            name: 'Wheel',
            mass: 1.6,
            isWheel: true,                 // engine treats wheel cells specially
            radius: CELL * 0.52,           // a hair larger than the cell looks right
            draw(ctx, part, spin) {
                const r = CELL * 0.5;
                // tire
                ctx.fillStyle = '#241d22';
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
                // rusty hubcap
                ctx.fillStyle = '#8a5a33';
                ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
                // spokes rotate with travel so wheels visibly roll
                ctx.strokeStyle = '#3c2d20';
                ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    const a = (spin || 0) + i * (Math.PI / 1.5);
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * r * 0.5 * -1, Math.sin(a) * r * 0.5 * -1);
                    ctx.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
                    ctx.stroke();
                }
            }
        },

        /* ------------------------------------------------------------------
           ENGINE — the power plant. It does nothing by itself, but every
           POWERED part (powered wheels, fans) that is structurally connected
           to an engine runs off it. One engine powers the whole machine.
           The ⚙ button (or clicking any engine) switches power on/off for
           the entire linked system at once.
           ------------------------------------------------------------------ */
        engine: {
            name: 'Engine',
            mass: 2.0,
            isEngine: true,
            activate(cart) {
                cart.enginesOn = !cart.enginesOn;    // system-wide toggle
            },
            draw(ctx, part, spin) {
                // engine block
                rounded(ctx, -14, -12, 28, 24, 4);
                ctx.fillStyle = '#7a8288'; ctx.fill();
                ctx.strokeStyle = '#3f4549'; ctx.lineWidth = 2; ctx.stroke();
                // cylinder head fins
                ctx.fillStyle = '#5a6166';
                for (const fx2 of [-10, -3, 4]) ctx.fillRect(fx2, -16, 5, 5);
                // flywheel spins while the system is powered
                const running = part.poweredNow;
                ctx.save();
                ctx.rotate(running ? (spin || 0) * 3 : 0);
                ctx.fillStyle = running ? '#e07a3f' : '#4a4038';
                ctx.beginPath(); ctx.arc(0, 2, 7, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#2d2520'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(7, 2); ctx.stroke();
                ctx.restore();
            }
        },

        /* ------------------------------------------------------------------
           POWERED WHEEL — a wheel that DRIVES, but ONLY while it's connected
           (through the structure) to an Engine that's switched on. No engine
           in the machine = it's just a heavy wheel. Click it to toggle just
           this wheel.
           ------------------------------------------------------------------ */
        motorwheel: {
            name: 'Powered Wheel',
            mass: 2.4,
            isWheel: true,
            needsPower: true,
            radius: CELL * 0.52,
            drive: 140,                    // forward push per unit of machine
                                           // mass (engine multiplies by mass,
                                           // so every build climbs the same)
            activate(cart, part) {
                part.on = (part.on === false);   // toggle (undefined = running)
            },
            draw(ctx, part, spin) {
                const r = CELL * 0.5;
                const off = part.on === false;
                // tire
                ctx.fillStyle = '#241d22';
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
                // hot-rod orange hub so it reads as POWERED
                ctx.fillStyle = off ? '#7a6a5a' : '#e07a3f';
                ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
                // lightning-ish spokes spin twice as fast as travel
                ctx.strokeStyle = off ? '#4a4038' : '#ffd24a';
                ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    const a = (off ? 0 : (spin || 0) * 2) + i * (Math.PI / 1.5);
                    ctx.beginPath();
                    ctx.moveTo(-Math.cos(a) * r * 0.45, -Math.sin(a) * r * 0.45);
                    ctx.lineTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45);
                    ctx.stroke();
                }
                // center bolt
                ctx.fillStyle = '#1d1023';
                ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
            }
        },

        /* ------------------------------------------------------------------
           TNT — click it mid-run and BOOM: a big fixed blast that hurls the
           machine away from wherever the crate sat. No charging, no waiting,
           just a red button for your problems. Also goes off if it snaps
           off in a crash. That's a feature.
           ------------------------------------------------------------------ */
        tnt: {
            name: 'TNT',
            mass: 0.9,
            onEject(cart, part, engine) {
                engine.impulseAwayFromCell(part, 560);
                engine.fx('tntBoom', part);
            },
            draw(ctx) {
                // red crate
                rounded(ctx, -13, -13, 26, 26, 4);
                ctx.fillStyle = '#c0392b'; ctx.fill();
                ctx.strokeStyle = '#7a1f14'; ctx.lineWidth = 2; ctx.stroke();
                // warning stripes
                ctx.fillStyle = '#7a1f14';
                ctx.fillRect(-13, -3, 26, 6);
                // "fuse" on top
                ctx.strokeStyle = '#46301f';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(5, -20, 9, -17); ctx.stroke();
                // spark
                ctx.fillStyle = '#ffd24a';
                ctx.beginPath(); ctx.arc(9, -17, 2.4, 0, Math.PI * 2); ctx.fill();
            }
        },

        /* ------------------------------------------------------------------
           BALLOON — constant upward force at its cell. Because the force is
           applied AT the cell (not the cart's center), balloons attached on
           one side will tilt the cart — placement matters!
           Pops if its cell touches anything sharp.
           ------------------------------------------------------------------ */
        balloon: {
            name: 'Balloon',
            mass: 0.15,
            lift: 260,                     // upward force (engine units)
            popsOnSharp: true,
            soft: true,                    // squishy: never drags on the ground
            // CLICK a balloon mid-run to pop it yourself — instant descent
            activate(cart, part, engine) {
                if (part.broken) return;
                part.broken = true;
                engine.fx('balloonPop', part);
            },
            update(cart, part, forces) {
                if (part.broken) return;   // popped balloons do nothing
                forces.push({ cell: part, fx: 0, fy: -defs.balloon.lift });
            },
            draw(ctx, part) {
                if (part.broken) {
                    // sad rubber scrap after popping
                    ctx.strokeStyle = '#d8506a';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(-6, 8); ctx.quadraticCurveTo(0, 14, 6, 6);
                    ctx.stroke();
                    return;
                }
                // string
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, 2); ctx.stroke();
                // balloon body (slightly squashed circle, drawn above the cell)
                const g = ctx.createRadialGradient(-4, -10, 2, 0, -6, 16);
                g.addColorStop(0, '#ff90a8');
                g.addColorStop(1, '#d8506a');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.ellipse(0, -6, 12, 15, 0, 0, Math.PI * 2); ctx.fill();
                // knot
                ctx.fillStyle = '#b03a52';
                ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(3, 8); ctx.lineTo(0, 13); ctx.fill();
            }
        },

        /* ------------------------------------------------------------------
           BOX FAN — hold W to blow yourself forward. Runs off a small
           battery (seconds of total use), then it's dead weight.
           ------------------------------------------------------------------ */
        fan: {
            name: 'Box Fan',
            mass: 1.2,
            thrust: 420,                   // push while running
            needsPower: true,              // dead without an Engine connected
            rotatable: true,               // click in the workshop to aim it
            // CLICK the fan during a run to switch just this one on/off;
            // the 🌀 button toggles all fans at once.
            activate(cart, part) {
                part.on = (part.on === false);
            },
            update(cart, part, forces, input, dt) {
                const wantsOn = (part.on !== false) && (cart.fansOn !== false);
                if (wantsOn && part.poweredNow) {
                    part.spinning = true;
                    // thrust along the fan's AIM (rotates with the machine).
                    // part.worldDir is kept up to date by the engine.
                    const d = part.worldDir || { x: 1, y: 0 };
                    forces.push({ cell: part, fx: d.x * defs.fan.thrust, fy: d.y * defs.fan.thrust });
                } else {
                    part.spinning = false;
                }
            },
            draw(ctx, part, spin) {
                // box housing
                rounded(ctx, -14, -14, 28, 28, 4);
                ctx.fillStyle = '#cfd6d9'; ctx.fill();
                ctx.strokeStyle = '#8d999e'; ctx.lineWidth = 2; ctx.stroke();
                // blades — spin fast while thrusting
                const a = part.spinning ? (spin || 0) * 6 : 0;
                ctx.save();
                ctx.rotate(a);
                ctx.fillStyle = (part.battery !== undefined && part.battery <= 0) ? '#777' : '#59c2b4';
                for (let i = 0; i < 3; i++) {
                    ctx.rotate(Math.PI * 2 / 3);
                    ctx.beginPath(); ctx.ellipse(6, 0, 7, 3.4, 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
                ctx.fillStyle = '#444';
                ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
            }
        },

        /* ------------------------------------------------------------------
           PLANK — heavy armor. Every plank in one of the 4 cells around the
           cookie jar soaks 40% of incoming jar damage (engine handles it,
           it just checks for cells of type 'plank').
           ------------------------------------------------------------------ */
        plank: {
            name: 'Plank',
            mass: 2.2,
            isArmor: true,
            draw(ctx) {
                rounded(ctx, -15, -10, 30, 20, 3);
                ctx.fillStyle = '#a8763e'; ctx.fill();
                // wood grain lines
                ctx.strokeStyle = 'rgba(80, 48, 18, 0.55)';
                ctx.lineWidth = 1.5;
                for (const y of [-4, 1, 6]) {
                    ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(12, y + 1); ctx.stroke();
                }
                // nail heads
                ctx.fillStyle = '#574033';
                ctx.beginPath(); ctx.arc(-10, -5, 1.6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(10, 5, 1.6, 0, Math.PI * 2); ctx.fill();
            }
        },

        /* ------------------------------------------------------------------
           MATTRESS SPRING — when its cell hits the ground, bounce!
           A free trampoline glued to your cart. Also bounces when you'd
           rather it didn't. That's the deal.
           ------------------------------------------------------------------ */
        spring: {
            name: 'Mattress Spring',
            mass: 0.9,
            bounce: 480,                   // upward impulse on ground contact
            onGround(cart, part, impact, engine) {
                // Only fire on solid hits, and not more than ~4 times a second
                if (impact < 80) return;
                const now = cart.elapsed;
                if (part.lastBounce && now - part.lastBounce < 0.25) return;
                part.lastBounce = now;
                engine.impulseAtCell(part, 0, -defs.spring.bounce);
                engine.fx('springBounce', part);
            },
            draw(ctx) {
                ctx.strokeStyle = '#b9c2c6';
                ctx.lineWidth = 3;
                ctx.beginPath();
                // a zig-zag coil
                ctx.moveTo(-10, 12);
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(i % 2 === 0 ? 10 : -10, 12 - (i + 1) * 4.5);
                }
                ctx.stroke();
                // top + bottom plates
                ctx.fillStyle = '#7e6a52';
                rounded(ctx, -13, -14, 26, 5, 2); ctx.fill();
                rounded(ctx, -13, 10, 26, 5, 2); ctx.fill();
            }
        },

        /* ------------------------------------------------------------------
           SODA BOTTLE — an AIMED one-shot booster. In the workshop, click
           a placed bottle to rotate where it fires (→ ↓ ← ↑). Mid-run,
           hit the 🥤 button (or click the bottle): it shakes for a moment,
           then fires a hard burst in its aimed direction. One use; the
           empty bottle stays bolted on as dead weight.
           ------------------------------------------------------------------ */
        soda: {
            name: 'Soda Bottle',
            mass: 0.8,
            rotatable: true,
            thrust: 30000,                 // burst force while firing. Sounds
                                           // huge, but it must out-shove the
                                           // WHOLE machine's weight AND
                                           // gravity for 0.3s — rocket rules
            shakeTime: 0.45,               // fizz-up delay before the burst
            burstTime: 0.3,                // how long the burst lasts
            activate(cart, part, engine) {
                if (part.spent || part.firing) return;
                part.firing = true;
                part.fireT = 0;
            },
            update(cart, part, forces, input, dt) {
                if (!part.firing) return;
                part.fireT += dt;
                if (part.fireT < defs.soda.shakeTime) return;        // shaking…
                if (part.fireT < defs.soda.shakeTime + defs.soda.burstTime) {
                    const d = part.worldDir || { x: 1, y: 0 };        // FIRE!
                    forces.push({ cell: part, fx: d.x * defs.soda.thrust, fy: d.y * defs.soda.thrust });
                    part.bursting = true;
                } else {
                    part.firing = false;                              // empty
                    part.bursting = false;
                    part.spent = true;
                }
            },
            draw(ctx, part) {
                // bottle body — drawn lying along +x (the fire direction);
                // the engine rotates the canvas by the part's aim for us.
                // neck points BACKWARD (-x): it pushes opposite the spray.
                ctx.save();
                ctx.rotate(Math.PI / 2);   // art was drawn upright — lay it down
                rounded(ctx, -8, -14, 16, 26, 6);
                ctx.fillStyle = part.spent ? '#9bb894' : '#71d44c'; ctx.fill();
                ctx.fillStyle = '#f3efdc';
                ctx.fillRect(-8, -4, 16, 9);
                ctx.fillStyle = '#e8e8e8';
                ctx.fillRect(-3.5, -17, 7, 4);
                if (part.firing && part.fireT < defs.soda.shakeTime) {
                    // shaking wobble lines
                    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(-11, -10); ctx.lineTo(-14, -14);
                    ctx.moveTo(11, -10);  ctx.lineTo(14, -14);
                    ctx.stroke();
                }
                if (part.bursting) {
                    // spray plume out the neck
                    ctx.fillStyle = 'rgba(216,255,233,0.85)';
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.arc(-4 + (Math.random() - 0.5) * 8, -22 - i * 7, 3.5 - i, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.restore();
            }
        },

        /* ------------------------------------------------------------------
           UMBRELLA — opens automatically while falling and slows the drop.
           One hard landing flips it inside-out forever. Eject the corpse.
           ------------------------------------------------------------------ */
        umbrella: {
            name: 'Umbrella',
            mass: 0.5,
            soft: true,                    // squishy: never drags on the ground
            drag: 5.2,                     // how strongly it fights falling
            update(cart, part, forces) {
                if (part.broken) return;
                if (cart.vy > 60) {        // falling — open and brake
                    part.open = true;
                    forces.push({ cell: part, fx: 0, fy: -cart.vy * defs.umbrella.drag });
                } else {
                    part.open = false;
                }
            },
            // NOTE: it breaks when the CART lands hard while it's open —
            // the engine handles that (soft parts never touch ground itself)
            draw(ctx, part) {
                ctx.strokeStyle = '#6b5742';
                ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -4); ctx.stroke();
                ctx.fillStyle = part.broken ? '#7a4f5e' : '#c2476f';
                ctx.beginPath();
                if (part.broken) {
                    // inside-out: sad upward cup
                    ctx.moveTo(-14, -6);
                    ctx.quadraticCurveTo(0, 6, 14, -6);
                    ctx.quadraticCurveTo(0, -2, -14, -6);
                } else if (part.open) {
                    // open canopy
                    ctx.moveTo(-16, -2);
                    ctx.quadraticCurveTo(0, -22, 16, -2);
                    ctx.quadraticCurveTo(8, -7, 0, -2);
                    ctx.quadraticCurveTo(-8, -7, -16, -2);
                } else {
                    // closed — slim wrap
                    ctx.ellipse(0, -4, 4, 12, 0, 0, Math.PI * 2);
                }
                ctx.fill();
            }
        }
    };

    /* Public API ------------------------------------------------------------ */
    window.TP_PARTS = {
        CELL,
        defs,
        /** Create a fresh attached-part instance of a given type. */
        make(type, col, row) {
            return { type, col, row, def: defs[type] };
        }
    };
})();
