# Crossy Road Remake

This project was originally attempted in [Kiro](https://kiro.dev/), but Kiro couldn't produce
graphics that looked right, so it was restarted from scratch and rebuilt with
[Claude Code](https://claude.com/claude-code) instead.

A from-scratch, dependency-free (well, almost) remake of [Crossy Road](https://www.youtube.com/watch?v=a3pTw0jmxlg)
built with plain HTML/CSS/JS and [Three.js](https://threejs.org/), designed to run as a static
page with **no build step** — just open it, or drop it on GitHub Pages.

Hop your voxel chicken across endless procedurally-generated roads, rivers, and rail lines.
Get as far as you can before a car, a train, or the river gets you. 

On top of the core game mechanics from Crossy Road, this version features obtainable power-ups such as Floaties and Shield that change the way you can play!

## Play it

Because the game uses native ES module imports (`<script type="module">` and an import map for
Three.js), it must be served over `http(s)://`, not opened directly as a `file://` URL — browsers
block ES module loading over `file://` for CORS reasons.

Locally, run any static file server from this folder, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Or use the VS Code "Live Server" extension, `npx serve`, etc. — anything that serves static files.

On **GitHub Pages** this just works out of the box: push this folder to a repo (or a subfolder of
your `username.github.io` repo) and enable Pages. No build/bundle step required.

## Controls

- **Arrow keys** or **WASD** — hop forward / back / left / right
- **Swipe** on touch devices, or the on-screen D-pad (bottom-right)
- **Space / Enter** or tap/click the start screen — start or restart

## Core mechanics

- **Forward-only progress**: your score is the furthest row you've ever reached in the current
  run. You can hop backward a little (to dodge a car), but you can't retreat past a few rows
  behind your best — matching the original's "camera won't let you go back" feel. A translucent,
  pulsing red hazard-stripe curtain marks that limit (distinct from the solid side guardrails,
  since this one is more "the camera's given up on this ground" than a physical wall) and moves
  with you as your best row advances.
- **Side boundaries**: the play area is bounded left/right by a solid striped guardrail; you can't
  walk off the edge of the world.
- **Lane hazards**:
  - **Roads** — cars stream by at varying speed/direction per lane. Touch one, you die.
  - **Rivers** — you must ride floating logs. Miss one (or drift off the side while riding one)
    and you drown.
  - **Rail lines** — safe to stand on most of the time, but a warning light blinks a second or so
    before a train sweeps the whole lane. Get caught on the tracks and it's over.
  - **Grass medians** — safe, but sometimes dotted with trees/rocks that block a column (you have
    to hop around them, not through them).
- **Endless procedural generation**: lanes are generated ahead of you on the fly and pruned once
  they're far behind, so the run never runs out of road.
- **High score**: your best run is saved to `localStorage` and shown on the start/game-over
  screens.

## Powerups

Small glowing gems occasionally appear on grass/rail lanes (always at an open, walkable column —
never in the middle of traffic or a river). Walk over one to pick it up; you can hold several
different powerups at once, shown as icons top-left (timed ones show a shrinking pie-cooldown).
Picking up a second copy of one you already hold/have active does nothing — you only ever hold one
of each type.

| Powerup | Effect |
|---|---|
| 🛡️ Shield | Absorbs the next car or train hit, then is used up. |
| 🛟 Floatie | Rides along unused while logs are available. The moment you'd otherwise miss one and drown, it kicks in instead, letting you cross freely (no log needed) until you reach dry land — then it's used up. |
| ⭐ x2 Score | Every row you advance is worth double points, for 10 seconds. |
| 🐸 Frog | Every hop covers 2 cells instead of 1 (in whichever direction you press), for 10 seconds — the cell you leap over is passed through safely. |

Each also gives your chicken a visible effect while active — a translucent bubble for Shield, a
pool-ring at your feet for Floatie, orbiting stars for x2 Score, and little frog legs for Frog.

## Cosmetics

Your chicken's color is randomly picked from a small palette (white, yellow, brown, black, grey,
buff, rust) every time you start a new run.

## The 2.5D look

The camera is a fixed-angle **orthographic** camera (no perspective distortion, no rotation) that
only translates as you advance — this is what gives Crossy Road its signature "toy diorama" look.
Everything is built out of simple boxes/primitives with flat lighting to get that chunky voxel
aesthetic, plus a bit of fog on the horizon so distant lanes fade out rather than popping in.

## Project structure

```
index.html          – page shell, HUD/overlay markup
style.css           – UI styling (HUD, start/game-over screens, on-screen D-pad)
js/
  constants.js       – tunable gameplay constants, small math/random helpers
  scene-setup.js     – renderer, orthographic camera, lights, fog
  player.js          – the player character: hop movement, animation, death states
  world.js           – procedural lane generation, cars/logs/trains, collision checks
  obstacles.js       – mesh builders for cars, logs, trees, rocks, trains, warning lights
  powerups.js        – powerup catalogue, pickup meshes (emoji-sprite + gem), on-player equip visuals
  input.js           – keyboard, swipe, and on-screen D-pad input
  audio.js           – tiny synthesized WebAudio sound effects (no audio files)
  ui.js              – score HUD, powerup icon row + cooldowns, start/game-over screens, high-score persistence
  main.js            – game loop, state machine, camera follow, hazard resolution
```

## Tech notes

- **Three.js** is loaded from a CDN via an import map — no `npm install`, no bundler.
- No build tooling at all: what you see in the repo is exactly what ships.
- Tested by scripting a headless Chromium session (Playwright) through the start screen,
  movement, boundary/retreat limits, scoring, log-riding, and game-over/restart flows.

## Possible future additions

- More character skins / a character-select screen (the original's big hook)
- Coins to collect for cosmetic unlocks
- A "left behind by the camera" death if you dawdle too long
- Sound/music assets instead of synthesized beeps
- More powerup types (magnet, extra life, etc.)
