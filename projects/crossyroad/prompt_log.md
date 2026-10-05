# Prompt Log

A record of the prompts and key decisions behind this project, kept per the original request.

## Initial request

> Build a playable JavaScript remake of Crossy Road, in this folder, as a static page with a
> README.md and a prompt_log.md, deployable under a folder in my github.io (plain HTML/CSS/JS, no
> build step, no server). Use the chunky, blocky, pseudo-3D camera angle from the original — nail
> the core mechanics: movement, lanes, collisions, scoring, can't walk backward past the edge,
> correct camera angle. At minimum: a character that moves forward across lanes, hazards that can
> end your run, and a score that increases the further you get. Ask as many questions as needed
> before starting.

## Clarifying questions asked, and answers given

Before writing any code, I asked four questions to pin down scope:

1. **Rendering approach** — real WebGL 3D (Three.js) vs. a hand-rolled 2D-canvas fake-3D
   projection.
   → **Answer: Three.js**, for a genuine low-poly 3D look with an orthographic camera, loaded
   from a CDN via an import map (no bundler needed).

2. **Hazard variety** — just roads + rivers, or also trains.
   → **Answer: roads, rivers, and trains**, with a warning telegraph before trains sweep a lane.

3. **Art style** — code-drawn blocky/voxel placeholder shapes, with or without room to swap in
   real assets later.
   → **Answer: simple voxel/blocky placeholder shapes**, everything built from primitives
   (boxes, etc.) in code — no image assets to source.

4. **Controls & scope** — keyboard + mobile buttons with endless procedural generation and a
   persisted high score, vs. a smaller fixed-length demo course with keyboard only.
   → **Answer: keyboard/WASD + on-screen mobile buttons, endless procedural lanes, high score
   saved to `localStorage`.**

## Implementation approach

- Built the whole thing as ES modules (`js/*.js`) with no bundler, importing Three.js from
  `cdn.jsdelivr.net` via an `<script type="importmap">` in `index.html`.
- Fixed-angle **orthographic** camera (not perspective) that only translates as the player
  advances — this is the specific technical choice that produces Crossy Road's "toy diorama"
  look, as opposed to a normal 3D game camera.
- Lane system: procedurally generated rows (`grass`, `road`, `water`, `rail`), generated ahead of
  the player and pruned once far behind, so the run is effectively endless.
- Movement is grid-based with a queued/buffered single-hop-at-a-time model, an arc + squash hop
  animation, and per-hazard death animations (squash for cars/trains, sink for water, topple for
  falling off an edge).
- Scoring is the player's furthest row reached in the run (never decreases even if they retreat),
  displayed live and persisted as a high score via `localStorage`.
- Boundaries: a fixed-width playable corridor (side edges block movement outright — you can't
  walk off the edge), and a "can't retreat more than a few rows behind your best" rule so the
  camera never has to backtrack.
- Trains: a per-lane state machine (`idle` → `warning` → `active` → `idle`) with blinking warning
  lights before the train sweeps across.
- Sound effects are tiny synthesized WebAudio beeps (hop / score / warning / death) rather than
  audio files, to keep the project fully self-contained.

## Testing performed

No JS runtime was available in the sandbox for a quick syntax check (`node` wasn't installed), so
verification was done end-to-end with a headless browser instead:

- Installed Playwright + a headless Chromium build, served the folder with
  `python3 -m http.server`, and drove the actual page.
- Confirmed: the start screen, HUD, and game-over/restart flow all work; no console errors during
  play.
- Directly asserted, via the running game's own objects: side-boundary clamping (can't exceed the
  play-area edges), the backward-retreat limit (row never drops below `bestRow - 3`, and `bestRow`
  itself never decreases), and monotonically non-decreasing score across a full run to death.
- Directly exercised the collision-detection functions (`checkHazard`, `getSupportingLog`) against
  live car/log positions pulled from the running scene, confirming hits register on-target and
  misses don't.
- Took screenshots at desktop and mobile viewport sizes to confirm the isometric camera angle, the
  blocky/voxel look, and the on-screen D-pad layout all render correctly. One visual read during
  testing (a single rail lane's track pattern, viewed at a steep diagonal angle, initially looked
  like it was bleeding into every lane) turned out to be a misreading of the perspective, not an
  actual bug — confirmed by cross-checking the real per-row lane types against the render.

## Follow-up tweak round

> Define the left/right border more clearly (it's currently an invisible wall). For water deaths,
> have the bird sink rather than fall over. Bring the camera closer so the edge of the map isn't
> visible — can the angle be tuned to match Crossy Road more closely? Have the train actually run
> you over instead of killing you the instant it spawns. Logs shouldn't spawn on top of each other.

- **Border**: added a striped red/white guardrail (posts + rail) running along both edges of the
  playable corridor on every row, so the boundary reads as a real barrier instead of an invisible
  wall. The wall itself is still a hard movement-block, just now visible.
- **Water death**: found the actual bug — `_animateDeath()` was writing the sink offset to
  `root.position.y`, but the per-frame `root.position.set(...)` call right after it was
  unconditionally resetting that back to 0, so the sink/tumble animations never visibly played at
  all (only the car/train squash worked, since that touches `mesh.scale` instead). Fixed by
  animating `mesh.position.y`/`mesh.scale` instead of `root.position`, and changed the water case
  specifically to a straight vertical sink with a slight shrink — no tipping rotation.
- **Camera**: reduced the orthographic frustum (`VIEW_SIZE`) for a closer zoom and lowered the
  elevation angle from ~41° to ~32° for a shallower, closer-to-the-original angle. This exposed a
  separate, non-obvious issue: at a closer zoom the camera could see past the actual edges of the
  generated world — past the *start* of the world (row 0, since nothing exists at rows < 0), and,
  at wide aspect ratios, past the finite side width of the generated terrain strip. Neither was
  fixable by tuning fog (verified directly by disabling fog entirely and confirming the artifact
  didn't change) or by generating far more rows *ahead* (verified by testing up to 150 rows ahead
  with no change) — a raycast from the suspect screen pixels onto the ground plane pinned down the
  world-space location precisely and showed the real cause. Fixed by pre-generating a run of
  purely decorative grass rows behind row 0 (never reachable by the player) and widening the extra
  terrain margin rendered past the playable columns.
- **Train collision**: found the actual bug — `checkHazard` returned `'train'` for any rail lane in
  the `'active'` state, regardless of the player's position, so it killed the instant the train
  spawned off-screen rather than when it actually reached the player. Fixed to check the train
  mesh's live x-position against the player's, matching how car collisions already worked.
- **Log/car overlap**: the old spawn formula (evenly spaced slots plus a random offset) was
  overlap-free at spawn, but each item wrapped independently back to a *fixed* absolute position
  when it exited the track. Since items in a lane can have different lengths, their individual wrap
  periods differ, so spacing would drift out of sync over time and could overlap. Replaced with a
  conveyor model: items are laid out back-to-back with random gaps at spawn, and on wrap, an item is
  recycled to sit just past its current trailing neighbour (not a fixed spot) — spacing can never
  collapse regardless of how long the lane runs. Applied to both logs and cars.

Verified all five with the running game's own objects again (not just visually): no log/car overlap
at spawn or after 8+ seconds of drift, a rail lane forced into `'active'` state only reports a hit
when the train's x-position actually overlaps the player's (not merely from being active), and the
water death animation now moves `mesh.position.y` downward with no rotation and a slight shrink.

## Second follow-up: spawn placement

> The logs & cars shouldn't spawn in the middle of the track, they should spawn outside and cross.
> Also, sometimes they still spawn outside the barriers and travel the wrong way.

The immediately-preceding "spread evenly across the whole track" fix for the overlap bug was itself
the cause of both of these: spreading items uniformly across the full track length, with no regard
for which way a lane's traffic moves, meant some items landed inside the visible corridor at spawn
(popping into view already in front of the player) and, depending on direction, some landed on the
*exit* side of the corridor instead of the entry side — meaning they'd have to travel all the way
around the wrap-around before ever crossing, which reads as "moving the wrong way."

Fixed by making spawn placement direction-aware: a lane's items are now laid out as a queue entirely
within the margin on whichever side its traffic *enters* from (left margin for lanes moving right,
right margin for lanes moving left) — never inside the playable corridor — with the item closest to
the corridor edge positioned to cross almost immediately and the rest queued behind it. Widened
`TERRAIN_MARGIN` further to comfortably fit a full queue of the longest possible items without
spilling past the rendered ground tile.

Verified directly against a snapshot of true spawn-time positions (not positions after any
simulated time had elapsed, which was skewing an earlier pass of this same check): across 574
sampled cars/logs over 15 fresh games, zero spawned overlapping the corridor and zero spawned on the
wrong side for their direction.

## Third follow-up: bursty traffic and a lingering spawn bug

> After the initial set of logs, they still spawn outside the barrier. Also, when there's two
> things of water I can almost never cross both. I'd like to reduce the density of cars & logs but
> improve consistency — there are periods where a ton of cars spawn, and periods where none do.

The direction-aware entry-queue design from the previous round (spawn everything nose-to-tail just
outside the corridor, closest item first) turned out to be the root cause of all three complaints,
not just the first:

- It only fixed placement *at initial generation*. The wrap-around recycling logic (introduced two
  rounds ago to fix the overlap bug) repositioned a recycled item relative to its current trailing
  neighbour's live position — which drifts all over the track as the lane runs — so a recycled item
  could reappear well inside the corridor once the lane had been running a while. Fine at t=0,
  broken later, exactly matching "after the initial set, they still spawn outside the barrier."
- Bunching every item into one tight queue at one edge is, by construction, a platoon: they all
  cross together, then the entire group has to travel the full loop distance before the next
  platoon arrives — the "ton of cars, then none" pattern.
- Two independent lanes each running their own platoon cycle rarely have a "both currently have
  something in view" moment at the same time, which is most of why crossing two consecutive water
  lanes was so hard.

Replaced both pieces with a simpler, provably-stable design:
- **Spawn**: items are laid out with roughly even random gaps across the *entire* track (not
  clustered at one edge), so a lane's traffic arrives at a steady rate. Any item that would land
  inside the visible corridor is nudged out to the nearer edge as it's placed (adjusting the cursor
  so the next item still can't overlap it) — so nothing pops into view already in front of the
  player, without needing the queue structure that caused the platooning.
- **Wrap**: replaced neighbour-relative recycling with plain modular wraparound — when an item
  exits, it's shifted by exactly one track-length, independent of every other item. Since all items
  in a lane share one speed, this preserves every pairwise distance exactly forever (no drift, no
  compounding), and because the wrap threshold sits right at the track's outer edge, the shifted
  position naturally lands just outside the corridor on the far margin — the same guarantee the
  entry-queue was trying to enforce, but now true permanently instead of only at spawn.
- **Density**: cut car/log counts (from 2–4 to 2–3 for cars) and shrunk `TERRAIN_MARGIN` back down
  now that a nose-to-tail queue no longer needs room to fit in it, which also shortens the average
  gap between items. Logs were kept slightly denser than cars (3–4) since gaps are a *feature* for
  roads but a *hazard* for rivers — a car lane wants crossable gaps, a water lane doesn't.

Verified with simulation rather than just eyeballing it: replayed each lane's actual generated
logs/cars forward through the real update math (outside the live game) for 40 simulated seconds.
Zero overlaps at t=0/15s/30s across a 30-second live run. For 19 sampled consecutive-water-lane
pairs, there's *some* column with both lanes simultaneously log-covered 51.9% of the time on
average (16.6% in the worst sampled case, never 0%) — a big improvement over the old design, where
independent platoon cycles could leave extended stretches with no simultaneous coverage at all.

## Feature: powerups + respawn cosmetics

> Introducing something new on top of the standard Crossy Road game: Shield (blocks one car/train
> hit), Floatie (crossing rivers), x2 Score (10s), Frog (jump 2 cells for 10s). Spawn on the ground
> at reachable locations, picked up by walking over them, shown as an icon top-left with a cooldown
> indicator if timed, can hold multiple at once, plus a visual cue on the character per powerup.
> Also: cycle the chicken's color randomly on every respawn.

Before writing any code, asked four questions to pin down the genuinely ambiguous design points:

1. **Spawn locations** — safe lanes only (grass/rail) vs. also on roads/rivers.
   → **Safe lanes only.** Powerups always spawn on an open (non-tree/rock) column of a grass or
   rail lane, so a visible one is always reachable without needing risky timing.
2. **Duplicate pickups** — stack a count, or ignore extras while one is already held/active?
   → **Ignore extras.** You can hold one of each of the four types at once, never two of the same;
   walking over a duplicate while already holding/using that type does nothing.
3. **Frog's 2-cell jump** — replace normal movement entirely for the duration, or an optional
   longer-jump input alongside normal hops?
   → **Replaces movement entirely.** Every directional input covers 2 cells for the full 10s; the
   skipped cell is passed through safely, same as hopping over a single car normally.
4. **Exactly when Floatie gets consumed** — a one-time save at the instant it would prevent a
   drowning, or a free-floating window that engages on first water contact and lasts until you
   reach dry land?
   → **Free-floating window.** The moment you set foot on *any* water tile while holding it, you
   can cross freely (logs irrelevant) until you reach a non-water lane, at which point it's used up.

### Implementation

- New `js/powerups.js`: a catalogue of the four types (emoji, color, duration-or-null for
  single-use), a ground pickup mesh (a small spinning gem topped with a billboard sprite rendered
  from the powerup's emoji onto a `CanvasTexture` at runtime — no image assets needed), and the
  on-player "equipped" effect for each: a translucent bubble (Shield), a torus ring at the feet
  (Floatie), three small orbiting octahedra (x2 Score), and two angled cone "legs" (Frog).
- `world.js`: grass/rail lanes get a small independent chance to spawn one powerup at an open
  column (capped at 3 uncollected in the world at once); `tryCollectPowerup(row, col)` removes it
  and returns its type. Pickups get a gentle bob/spin each frame.
- `player.js`: added `powerups` state (`shield`, `floatieHeld`/`floatieActive`, `x2Time`,
  `frogTime`), a `score` field distinct from `bestRow` (bestRow still drives the camera/backward-
  retreat/world-generation logic exactly as before; `score` is the displayed/saved points total,
  incremented by 1 or 2 per row crossed depending on whether x2 is active — needed because the two
  concepts diverge for the first time once x2 Score exists). Frog doubles `dRow`/`dCol` right in
  `_executeMove` before any bounds/collision checks, so only the landing cell is ever validated.
  Powerup collection is checked on hop-completion (landing), not hop-start.
- `main.js`: a shield converts what would've been a car/train death into consuming the shield plus
  a brief 0.5s invulnerability window (so the same still-overlapping hazard can't instantly kill
  you again the very next frame); floatie logic sits alongside the existing water/log branch —
  activates the moment `isWater(row)` is true while held, bypasses the log-support check entirely
  while active, and is consumed the first time the player is on a non-water row again.
- `ui.js`/`style.css`: a top-left icon row, built/removed per powerup as `player.powerups` changes.
  Timed ones get a `conic-gradient` "pie" ring driven by a `--remaining` CSS custom property
  (fraction of duration left) updated every frame, masked to a thin ring around the icon.
- Cosmetics: `Player` now takes a body color, and `resetGame()` in `main.js` picks one at random
  from a 7-color palette (white/yellow/brown/black/grey/buff/rust) on every start and restart.

### Testing

Used temporary `window.__debug*` hooks (added, exercised, then removed before finishing — none
shipped) to test the actual game objects rather than just reading the code:

- Shield: forced a car onto the player's exact position while shielded — survived, shield flag
  flipped to consumed, HUD icon disappeared, a 0.5s `invulnT` grace window was set.
- Floatie: forced a water lane's logs away from the player's position while holding Floatie —
  survived (didn't drown), `floatieActive` flipped on; then moved to a grass lane and confirmed
  both `floatieHeld`/`floatieActive` cleared (consumed on reaching dry land).
- x2 Score / Frog: collected each and confirmed a single row-advance awarded 2 points (not 1), and
  a single hop covered 2 rows (not 1), respectively.
- Duplicate pickups: collecting x2 Score twice while already active left the remaining timer
  untouched (didn't reset to 10) and the second call reported nothing collected.
- Respawn colors: sampled the body-mesh color across 6 fresh games — 5 distinct colors seen,
  confirming real randomization rather than a fixed default.
- World spawn rules: sampled 29 organically-generated powerups across 25 fresh games — zero were
  on a road/water lane, zero were on a column blocked by a tree/rock, and the concurrent-in-world
  count never exceeded the configured cap of 3.
- End-to-end (not bypassed): located an organically-spawned powerup, teleported the player to the
  row directly before it at the right column, pressed the move key once, and confirmed the *real*
  `world.tryCollectPowerup` → `player.collectPowerup` pathway fired on landing (not a direct call)
  and produced a HUD icon.
- Full playthroughs and screenshots at each step confirmed no console errors and that the on-player
  equip visuals and HUD cooldown ring render and animate as intended (checked the cooldown ring
  specifically at t=0 vs. t=4s of a 10s timer and saw it visibly shrink by roughly the expected
  fraction).

## Powerup density x2, floatie fix, and a retreat-limit indicator

> Increase density of powerups by 2x. Also: make it so the life ring doesn't disappear when you
> use a log. Add a more clear indicator that you can't walk backwards too far - not a solid
> barrier like the left-right one.

- **Density**: doubled both `POWERUP_SPAWN_CHANCE` (0.09 → 0.18) and `POWERUP_MAX_ACTIVE` (3 → 6).
  Doubling the chance alone wouldn't have doubled what a player actually sees, since testing showed
  the old cap of 3 concurrent powerups was already being hit regularly - raising only the odds
  would've just meant reaching the same cap sooner, not more powerups in the world at once.
- **Floatie bug**: found the actual cause of the life ring disappearing on a normal log crossing —
  it activated (and thus started the clock toward being consumed on reaching dry land) the instant
  the player touched *any* water lane while holding it, regardless of whether a log was right there
  doing the job. Fixed so the log-riding branch runs first and leaves the floatie untouched
  whenever a log is actually supporting the player; only the no-log branch (i.e., the moment it
  would otherwise be a drowning) activates it. Verified both paths directly: riding a real log with
  floatie held now leaves it `held: true, active: false` (ring still showing) after several frames,
  while the no-log case still correctly activates and saves the player as before.
- **Retreat-limit indicator**: added `js/retreat-wall.js` — a translucent plane with a
  canvas-generated diagonal hazard-stripe texture that fades to transparent toward the top, pulsing
  opacity, and a slow scrolling texture offset for a "shimmering" feel. Deliberately built to read
  as different from the solid, opaque guardrail fence (built from repeated box geometry) rather
  than reusing it, since the retreat limit isn't a physical wall - it's a soft, camera-driven limit
  that continuously moves forward as `bestRow` advances. Repositioned every frame in `main.js` to
  sit exactly between the last allowed row and the first blocked one. Verified by reading its mesh
  z-position directly against the actual computed retreat boundary (exact match) and confirming the
  real movement-blocking behavior at that row is unchanged.
