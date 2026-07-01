# MECHANICS-SPEC — Bad Piggies behavior, researched
*(Mechanics only. Art, names, characters, sounds and level layouts stay original
to Trash Pandas. "Jar" below = our cargo, equivalent to the pig.)*

Sources used:
- https://en.wikipedia.org/wiki/Bad_Piggies
- https://badpiggies.fandom.com/wiki/Parts (+ Item_List, Engine, Wheel, Spring,
  Rope, Grappling_Hook, Sandbag, Boxing_Glove, Soda_Bottles, Game_Physics,
  Sandbox pages, via search summaries — direct fetch is blocked)
- https://angrybirds.fandom.com/wiki/Bad_Piggies_(game)/Objects
- https://pocketgamer.com/articles/045296/ (how-to-play guide)
- https://www.angrybirdsnest.com/bad-piggies-complete-sandbox-guide/
- https://www.ldplayer.net/blog/bad-piggies-beginners-guide-for-the-new-players.html

Legend: [ ] = to verify in our game · status filled in by the gap audit.

---

## 1. Core loop
- [ ] **1.1** Two phases: BUILD (assemble in a grid) then RUN (physics plays out). — MATCHES
- [ ] **1.2** Build happens inside a marked region of "darkened squares"; grid size varies per level. — MATCHES
- [x] **1.3** The cargo (pig/jar) is itself a placeable part — it does NOT have to ride inside the machine. — **MATCHES (TP6.0)**: jar is a bin part, place it anywhere, GO is gated on it, raccoon rides with it.
- [ ] **1.4** Win = the CARGO reaches the goal, by any means, even thrown loose. — MATCHES
- [ ] **1.5** Retry returns to the build screen with the same design; unlimited attempts. — MATCHES
- [ ] **1.6** Levels can be solved multiple ways; optional secondary goals exist. — MATCHES (by design)

## 2. Construction rules
- [x] **2.1** FRAMES are the structure: wooden frame (light, flexible, breaks easier) and iron frame (heavier, stronger). Other parts attach to/inside frames. — **MATCHES (TP6.0)**: real woodframe + ironframe parts; joint toughness averages the two parts joined, so iron makes a sturdier machine. Auto-framing removed.
- [x] **2.2** Parts have placement rules (4-neighbour adjacency; jar seeds the build; every part drag-to-move and drag-off-to-bin). — **MATCHES (TP6.0)**: full free placement + drag & drop with ghost preview.
- [ ] **2.3** Some parts are ROTATABLE at build time (soda bottles aim N/S/E/W; push is opposite to facing). — MISSING
- [ ] **2.4** Per-level parts inventory; you may use fewer than given. — MATCHES

## 3. Run-phase controls
- [ ] **3.1** Activatable parts get ON-SCREEN BUTTONS at the bottom during the run (one per part class/color). — MISSING (we only click parts directly)
- [ ] **3.2** Tapping the part directly on the machine also works (fans, TNT, ropes at exact point). — MATCHES
- [ ] **3.3** Engine button toggles power for the whole linked system. — MISSING (no engine system)
- [ ] **3.4** Fan button toggles ALL fans at once. — DIFFERS (per-fan only)
- [ ] **3.5** TNT button detonates. — MATCHES (click on part)
- [ ] **3.6** Balloon button pops ONE balloon (a random one). — DIFFERS (we pop a specific clicked one — arguably better; flag for decision)
- [ ] **3.7** Soda-bottle button fires all bottles of that color group. — MISSING (no groups/aiming)
- [ ] **3.8** No steering/leaning of the machine itself. Build = fate. — MATCHES

## 4. Parts catalog (mechanical behavior)
- [ ] **4.1** Wooden frame: light, flexible, weakest. — MISSING as explicit part
- [ ] **4.2** Iron frame: heavier, much stronger. — MISSING
- [ ] **4.3** Wheel (plain): free-rolling; wood tier breaks easier, rubber tier grips/survives better. — PARTIAL (one tier)
- [ ] **4.4** Powered wheel: only turns when an ENGINE is in the connected system; toggleable. — DIFFERS (ours self-powers)
- [ ] **4.5** Engines (3 tiers: weak/medium/V8-strong): power all motorized parts in the linked structure; stronger = more force. — MISSING
- [ ] **4.6** Fan: pushes air one way (thrust opposite), engine-powered in BP; toggleable. — PARTIAL (battery instead of engine)
- [ ] **4.7** Propeller: like fan but stronger/lift-oriented; engine-powered. — MISSING
- [ ] **4.8** Balloon: constant lift, attached by string above; pops on spikes/ceiling or on command; multi-balloon packs lift faster. — PARTIAL (have single)
- [ ] **4.9** Soda bottle: aimable; on activation shakes briefly THEN fires a burst opposite its facing; color groups fire together. — DIFFERS (ours = charge-by-driving + radial blast)
- [ ] **4.10** TNT: manual detonation; blast can break the machine and chain-detonate other TNT. — PARTIAL (no chaining)
- [ ] **4.11** Umbrella: slows falls; can also push the vehicle (powered yellow tier exists). — PARTIAL
- [ ] **4.12** Spring: a CONNECTOR that joins two structure segments flexibly; stretches, compresses, bends; breaks past its limit. — DIFFERS (ours is a bounce pad)
- [ ] **4.13** Rope: limp connector with tensile limit; cuttable mid-run at the exact click point. — MISSING
- [ ] **4.14** Sandbag: heavy ballast; release at any time → machine pops upward. 1/2/3-bag packs. — MISSING
- [ ] **4.15** Boxing glove: punches outward; recoil nudges the vehicle slightly if it hits nothing. — MISSING
- [ ] **4.16** Wings + tail: wing gives lift at speed; tail stabilizes; without tail the plane spins. — MISSING
- [ ] **4.17** Grappling hook: fires a hook on a rope, pulls machine to anchor point. — MISSING (stretch goal)

## 5. Physics feel
- [ ] **5.1** Machines are multi-piece assemblies that FLEX; wood bends; stiffer parts bend less. — MATCHES (soft-body joints)
- [ ] **5.2** Parts break OFF on hard impacts; heavier/sturdier parts resist longer. — MATCHES
- [ ] **5.3** Machine can collapse at the start line if badly built (structure simulated even at rest). — DIFFERS (we pin the build until GO; BP drops the machine live)
- [ ] **5.4** When the machine breaks, the cargo is ejected and tumbles on independently. — MATCHES
- [ ] **5.5** Equal fall rates regardless of weight (air resistance matters, mass doesn't, for falling). — MATCHES (uniform gravity)
- [ ] **5.6** Weight matters for: momentum, climb, grip; light = faster/fragile, heavy = slower/sturdy. — MATCHES roughly

## 6. Stars & level structure
- [ ] **6.1** Star 1 = finish the level. — DIFFERS (ours: jar health > ⅔ — not a BP rule)
- [ ] **6.2** Stars 2–3 VARY PER LEVEL from a menu of: finish under a time limit / collect the star box / finish WITHOUT using a named part. — DIFFERS (ours: fixed time+box for all levels)
- [ ] **6.3** Star boxes are placed off the easy path; collecting = touch with any part of the machine. — MATCHES
- [ ] **6.4** Level select shows stars earned per level; later levels unlock by progress. — PARTIAL (no unlock gating)
- [ ] **6.5** SANDBOX level type: huge open arena, big parts bin, collect many star boxes across the map at your leisure. — MISSING
- [ ] **6.6** Hidden skull-type collectibles tucked in levels; finding enough unlocks the sandbox. — MISSING
- [ ] **6.7** "Mechanic" helper: a button that auto-builds a known-good machine for the level. — MISSING

## 8. TP7.0 deep-research — remaining mechanics (researched June 2026)
Sources: badpiggies.fandom.com (Spring, Rope, Detacher, Fan, Propeller, Sandbag,
Wing, TNT, Boxing_Glove, Sandbox pages), angrybirds.fandom.com Objects page,
angrybirdsnest.com sandbox + skulls guides, en.wikipedia.org/wiki/Bad_Piggies.

CONNECTORS
- [ ] **8.1** SPRING is a flexible CONNECTOR (one grid cell) joining segments:
  stretches, compresses, bends sideways; snaps if pushed too far. Two segments
  joined by a spring count as ONE vehicle — engines power across it. Connects to
  frames, detachers, TNT, soda, rockets. — Ours: spring is a bounce-pad. DIFFERS.
- [ ] **8.2** ROPE: limp until pulled taut, then resists then SNAPS. Cuttable
  mid-run — tap the snip button OR click the rope at the exact contact point
  (precise weight-shedding). — MISSING.
- [ ] **8.3** DETACHER: clicking it mid-run disconnects everything on its 4
  sides (like a frame breaking on command). Colored; each color = one run
  button. — MISSING. (We have eject-on-click but not a dedicated detacher.)

PROPULSION
- [ ] **8.4** PROPELLER: strong + heavy; PULLS the vehicle in its facing
  direction; engine-powered; best for flight/forward pull. Stronger than the
  fan. — MISSING.
- [ ] **8.5** FAN: weakest powered thruster, average power draw, low thrust;
  engine-powered; pushes opposite its facing. — Ours matches the weak-thruster
  role (PARTIAL — already engine-gated in TP6.0).
- [ ] **8.6** WING + TAIL: wing gives LIFT once the machine is moving fast
  enough (takes off and climbs); TAIL at the rear stops tailspin at high speed.
  No tail = spins out in the air. Wood + iron variants (iron = more lift,
  sturdier). — MISSING.

WEIGHT / IMPACT
- [ ] **8.7** SANDBAG: heavy droppable ballast in packs of 1/2/3. Tap its
  button to drop → weight gone, machine hops up a bit. — MISSING.
- [ ] **8.8** BOXING GLOVE: one-shot punch outward; shoves objects/terrain;
  if it hits nothing, small recoil nudges the machine the other way. — MISSING.
- [ ] **8.9** TNT chaining: a TNT blast close to another TNT sets it off too
  (chain). Blast hurls the machine and usually breaks it. — PARTIAL (we have
  click-detonate + blast, no chaining).

MODES / PROGRESSION
- [ ] **8.10** SANDBOX: one huge open arena, big parts bin, ~20 star boxes
  scattered to collect at leisure, unlimited rebuilds, no time pressure. — MISSING.
- [ ] **8.11** HIDDEN SKULLS: collectibles tucked off the main path; collect
  10 to unlock the sandbox (extras give nothing here). — MISSING.
- [ ] **8.12** MECHANIC helper: a button that auto-builds a known-good machine
  for the level, which the player can then tweak. — MISSING.
- [ ] **8.13** LIVE-AT-REST workshop physics: in BP the machine is simulated
  even before GO, so a poorly-braced build visibly sags/collapses at the start
  line. — Ours: pinned rigid until GO. DIFFERS. (Optional — may hurt our
  difficulty floor; implement last, behind a check.)

## 9. TP6.1 — FRAME + JAR deep dive (researched June 2026)
Sources: badpiggies.fandom.com/wiki/Frame, /wiki/Wooden_Frame, /wiki/Item_List;
angrybirds.fandom.com Objects; speedrun.com/b_p guides.
Confirmed facts:
- Frames are the skeleton; every part bolts to a frame, frames bolt together,
  one frame = one cell.
- WOOD: light, flexible (bends/separates more easily under force), breaks easy.
- IRON: "Metal Box weighs twice that of the Wooden Box"; from the same drop
  "the Metal box did not separate much, whereas wooden frames separate more
  easily." So iron ≈ 2× mass, markedly stiffer + tougher joints.
- The pig (our jar) wins by reaching the goal even thrown free of a wreck;
  fragile to hard hits; needs no frame but padding protects it.

Checklist — verified results (TP6.6):
- [x] **9.1** frame = skeleton, 1 cell, parts bolt to frames + each other —
  **MATCHES** (woodframe/ironframe are 1-cell structural parts; adjacency join).
- [~] **9.2** wood: light ✓ (mass 0.7), breaks easy ✓ (tough 1 → low breakAt),
  per-joint flex ✓ (wood joints clamp at 12% stretch in the solver) — but a
  *whole-machine* "visibly bends more than iron" is **SUBTLE** in this engine,
  see ENGINE-LIMIT note. **PARTIAL.**
- [~] **9.3** iron: ~2× mass ✓ (1.4 vs 0.7, wiki-accurate), ~2.4× joint
  strength ✓ (tough 2.4), per-joint rigidity ✓ (iron joints clamp to ~0%
  stretch, mass-independent) — visible stiffness-vs-wood **SUBTLE**, same note.
  **PARTIAL.**
- [x] **9.4** frames break by stretch AND impact, shed as live debris —
  **MATCHES** (verified: airborne slam shed parts 6→5; both break paths exist).
- [x] **9.5** jar = win object (tracked, wins by any means) — **MATCHES**.
- [x] **9.6** jar fragile: hard hit damages, enough = shatter = loss —
  **MATCHES** (jarHP → 0 = lost, verified).
- [x] **9.7** jar placeable anywhere, no frame required — **MATCHES** (free
  placement; a jar on bare wheels launches and runs).
- [x] **9.8** jar can never be simply shed; stays tracked cargo — **MATCHES**
  (isCore = jar; impact-break + loose-detach both skip the jar).
- [x] **9.9** jar thrown clear of a wreck still wins — **MATCHES** (jar particle
  stays tracked even with all joints broken; win = jar.x > goal).

ENGINE-LIMIT note (honest, per the no-faking rule): in this Verlet engine the
per-joint wood/iron difference (mass, toughness, stretch-rigidity) is real and
in the code, but a *dramatic visible whole-machine bend* can't be cleanly shown
because (a) a compact triangulated cart body is rigid for either frame, (b) the
single most-stretched joint at any instant is always a wheel-suspension joint —
identical in both builds — so aggregate flex metrics don't isolate the frame,
and (c) iron's 2× mass makes everything it touches move MORE, partly cancelling
its greater rigidity. Matching the gameplay-meaningful differences (weight,
breakage resistance, per-joint rigidity) is achieved; matching Box2D's exact
visible floppiness is beyond this lightweight solver.

## 7. Out of scope (won't implement)
- Loot crates, scrap machine, paid currency, part skins/tiers-as-loot — monetization systems, not game mechanics.
- Multi-episode campaign size (we have 5 levels + daily; structure matches, scale doesn't).
- Angry-Birds-attention/noise mechanic (propeller "loud") — no birds in our game.
