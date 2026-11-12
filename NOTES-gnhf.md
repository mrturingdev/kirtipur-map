# GNHF run notes: Kirtipur map website + landmark review

Tracks per-landmark photo-vs-model comparisons and website progress across iterations.
Not a blocker log by itself; only used for genuine blockers and per-landmark findings,
per the run's instructions.

## Our Kirtipur rebuild: single page, panel instead of separate site/ pages

A gnhf run (objective-build-the-bb68f2) pivoted the multi-page `site/` (landing
page + `site/places/*.html`, see "Website" section below, now historical) into
a single page: the whole-island 3D map with a detail panel over it, per that
run's prompt. Decision 5 of that objective - fold `site/`'s content into the
panel and delete `site/` entirely - is done as of slice 2 (iteration 2, below):
`site/` no longer exists, its two photos per place now live in
`img/<key>/`, and its history text was ported into `src/places.js`.

### Slice 1: name, full-viewport island, chrome hidden, clouds/rocks removed, map background, data credits, first cut of tests/site-check.mjs (iteration 1)

- `src/page.json`: title is now "Our Kirtipur" (used for the `<title>` tag
  and meta description); description text also names it. The engine's own
  `<h1>{{title}}</h1>` in the hidden header is not exposed to the page (see
  below), so a second, real, visible `<h1 class="map-title">Our
  Kirtipur</h1>` was added to `src/stage.html`, styled as a small pill at
  top-centre of the map in `src/style.css`.
- Engine chrome (the header's kicker/h1/intro, the Pause/2x/Dark-theme
  buttons, the scoreboard, the event feed, and the whole right rail) is
  hidden from `src/style.css` only - no engine shell markup was touched,
  per the constraint that diorama/_engine must never be edited and its
  elements must stay in the DOM (engine JS reads them by id).
  One exception: `#btnPause` is kept a real, non-`display:none`,
  non-zero-size element (shrunk to an 8x8px fully-transparent `position:
  fixed` corner speck, `z-index` above the stage so nothing covers it)
  because `diorama/_engine/tests/harness.mjs`'s `sim` mode (which this run
  must keep passing) clicks `#btnPause` by id on the debug build before
  stepping the simulation; `display:none` on an ancestor would make that
  click fail with a Playwright actionability timeout. Nothing else needed
  an exception: `smoke`/`modes` (which click the cast rail and the time/
  weather/render buttons) are explicitly out of scope per the run's prompt
  and are expected to fail now - confirmed they do (actionability timeout
  on `.cast-item`, as expected) and are no longer part of this project's
  required checks.
  `.app`/`.main` were switched from the engine's grid layout to a plain
  absolutely-positioned `.stage` filling the viewport, since hiding
  grid-row siblings via `display:none` left the grid's auto-placement in a
  fragile state (the stage's content is itself absolutely positioned, so
  an `auto`-sized grid row around it collapses to zero height).
- `src/terrain.js`: removed the "Clouds drifting past" block (the `clouds`
  array, `cloudMat`, the 12-cloud loop) and the 26 loose rocks hanging
  under the lowest island layer, per decision 3. The layered island body
  itself (the 7 stepped-in layers) is unchanged. `src/hud.js`'s per-frame
  cloud-drift update line in `simulate()` was removed to match.
- Map background: decision 3 wants a plain paper/dark background instead
  of the sky-gradient backdrop, tied to the light/dark UI theme rather
  than time of day. The backdrop gradient is driven by `TIMES.<mode>.top`/
  `.bot` (engine `env.js`, read by the post-processing shader in
  `post.js`) - other dioramas already retune `TIMES` from their own
  `src/hud.js` at the top level (see `diorama/hockey-arena/src/hud.js`),
  so this is an established extension point, not an engine edit. Added
  `applyMapBg()` to `src/hud.js`: sets `top`/`bot` on all three `TIMES`
  modes to one flat colour from a small `MAP_BG` table keyed by
  `effectiveTheme()` (paper for light, dark for dark - the engine's own
  `ui.js` already defines `effectiveTheme()` and it is in scope here,
  everything is concatenated into one module by `build.mjs`), then calls
  `setTime(wx.time, true)` to apply it instantly. Only `top`/`bot` are
  touched, so sun colour/position/intensity (and so the day/dusk/night
  lighting on the models) are unaffected - only the backdrop itself stops
  shifting through blue/purple/black and stays flat. Wrapped in the
  existing `selfTime` guard (used by `syncTime()`) so this `setTime` call
  does not also reset the simulated clock via `envHooks.onTime`. Wired to
  `#btnTheme`'s click (that button is currently hidden; a later slice's
  on-map theme control can just call `$('btnTheme').click()` to reuse the
  engine's own toggle plus this listener, no new wiring needed then).
  Verified both themes render as a flat, non-gradient tone via Playwright
  screenshots (`colorScheme: 'light'|'dark'` context emulation, since
  there is no visible theme button yet to click).
- `tests/site-check.mjs` (new): first cut, covers what this slice built -
  console/page errors, failed/4xx requests, no scroll at 1440x900 and
  390x844, no visible engine chrome (own definition: non-zero rendered
  area and non-zero opacity - deliberately excludes `#btnPause`, see
  above), no clouds (static check that the built `index.html` no longer
  contains `cloudMat`/`"Clouds drifting"`), document and on-map title both
  "Our Kirtipur", the data-credit line visible and naming OpenStreetMap,
  SRTM, GHSL and Mapillary, median frame time at 1440x900, and a clean
  `prefers-reduced-motion` load. Screenshots (desktop/mobile x light/dark)
  saved to the directory given as `process.argv[2]`. Does not yet check
  the six places, their panels, deep links, Esc, or photos - none of that
  exists yet; those checks land with the slice that builds them (suggested
  order item 2), per the run's "first cut" allowance. Exits 0 as of this
  iteration; `node diorama/_engine/tests/harness.mjs diorama/kirtipur-map
  sim --minutes 5` still passes (OK, no watchdog stalls).
- Found and fixed one pre-existing bug while in `src/style.css`: the
  `.map-credit` data-credit line (OSM/SRTM/GHSL/Mapillary, required to
  stay visible per decision 7) was unconditionally `display: none` under
  600px width - i.e. hidden on every phone-sized viewport already, before
  this run's changes. Changed it to stay visible (full-width) at narrow
  widths instead, and hid the less essential `.stage-hint` ("drag to
  move..." pill) there instead, since the two shared the bottom edge and
  only one fits comfortably at 390px. Also added a small top-offset for
  `.map-title` under 600px so it does not overlap the existing
  `.map-back-link` ("Kirtipur guide") pill in the same top-left corner -
  both pills are top:8px by default and only collide once the viewport is
  narrow enough that the centred title's pill reaches the left corner.
- Not addressed this slice (left as-is, by design): the island does not
  yet fill a tall 390x844 viewport well (large empty space below it on
  phone) - the isometric camera's framing (`iso.configure(...)` in
  `hud.js`) was not touched. No scroll results either way, so it is not a
  functional regression, but decision 2's "framed whole and centred" will
  need camera/viewport tuning for narrow/tall screens - deferred to the
  "phone bottom sheet, accessibility, reduced motion" slice (suggested
  order item 4) where responsive layout is the explicit focus.

### Slice 2: place detail panel, content folded in from site/, deep links, Esc; site/ deleted (iteration 2)

- `src/places.js`: each `FOCUS` entry now also carries `history` (a short sourced
  paragraph, ported near-verbatim from the matching `site/places/<key>.html` page -
  same municipal heritage listing numbers/coordinates, same wording, no new
  historical claims added) and `photos` (the same two credited Wikimedia
  Commons/Mapillary photos each place already had on `site/`, as `{file, alt,
  author, date, licence, source}`, `file` now relative to `img/<key>/`). The
  existing `text` field (already shown as a map-click toast) doubles as "what to
  look for" in the panel - it already reads as a highlights line (e.g. "three
  mossy roofs over a tall brick plinth, stone elephants at the stair" for Uma
  Maheshwar), so no new field was added for it.
- Photos moved with `git mv site/img/<key>/*.jpg img/<key>/*.jpg` (credits/alt
  text travel with them into `places.js`, not a separate attribution file), then
  `site/` (the `index.html` landing page, the six `places/*.html` pages and
  `site.css`) was deleted with `git rm -r`. The map's "Kirtipur guide" back-link
  pill (`.map-back-link` in `src/stage.html`/`src/style.css`) was removed along
  with it, per decision 5. Confirmed `site/` had no other referrers left in the
  project (`grep -rl site/`) before deleting.
- New `src/panel.js` (listed in `src/page.json`'s `scripts`, after `life.js` and
  before `hud.js`): builds the panel's photo `<figure>`s via `createElement`/
  `textContent` (content is fixed data, not user input, but this avoids any
  templating/escaping question) and exposes `openPlacePanel(F_)`/
  `closePlacePanel()`/`panelStep(delta)` (previous/next, wrapping through
  `FOCUS`). Markup lives in `src/stage.html` as an `<aside class="panel" id="panel"
  role="dialog" aria-modal="false" aria-labelledby="panelName" tabindex="-1"
  hidden>` with Prev/Close/Next buttons in a head row, then history, "what to
  look for" and the two photos (each a `<figure>` with a credit line and a
  "Source" link) in a scrollable body. Styles in `src/style.css`: a right-side
  panel on desktop (`position:absolute` inside `#stage`, `width:min(380px,92vw)`,
  using the engine's own `--card`/`--ink`/`--rule`/`--accent` theme tokens so it
  follows light/dark automatically), a bottom sheet under 600px width
  (`max-height:45vh`, rounded top corners) per decision 4's "leaves the focused
  landmark visible" phone requirement.
- Wiring, in `src/hud.js`: `actOn('site', r)` now also calls `openPlacePanel(r)`
  (after the existing fly-to/log/hash-replace); `goHome()` (converted from a
  `const` arrow function to a `function` declaration - see below - and now also
  calling `closePlacePanel()`) is unchanged otherwise and already runs on the
  existing `btnHome`/"Whole island" click and the document-level `Escape`
  keydown handler, so Esc and "Whole island" closing the panel and clearing the
  hash came for free from code that already existed, per decision 4's "Close,
  Esc and 'Whole island' return to the whole island and clear the hash" (the
  panel's own new Close button just calls `goHome()` too, for the same
  behaviour). Picking a place by its pin/building hit-box (pre-existing
  `clickables` entries from before this run), the Places bar (`#segPlaces`,
  currently still hidden inside the right rail - its relocation onto the map is
  slice 3's job) and keys 1-6 (pre-existing) all already call `actOn('site', ...)`,
  so they open the panel automatically too, with no further wiring needed.
- Ordering/hoisting note (why `goHome` became a `function` declaration): the
  whole built page is one concatenated ES module script (see build.mjs), and
  `panel.js` has to execute before `hud.js` so that `openPlacePanel`'s DOM-ref
  `const`s (`const panel = $('panel');` etc.) are initialised before `hud.js`'s
  `#place=<key>` deep-link IIFE (which runs immediately at `hud.js`'s position
  in the script) can call them. But `panel.js`'s own top-level code
  (`$('panelClose').addEventListener('click', goHome)`) needs to reference
  `hud.js`'s `goHome`, which is textually *after* `panel.js`. A `function`
  declaration is hoisted to the top of the whole module scope regardless of
  textual position, so it is already callable from `panel.js`'s earlier code;
  a `const goHome = () => {...}` would not be (temporal-dead-zone
  `ReferenceError`, since `panel.js`'s listener registration runs before that
  `const` line executes). Converting `goHome` from a `const` arrow function to
  a `function goHome() {...}` (same body, one new `closePlacePanel();` line)
  was the one-line fix, rather than adding closures/deferred-lookup wrappers
  at every call site. `actOn`/`flyTo` needed no such change since they were
  already `function` declarations.
- Found and fixed one real bug while wiring the deep link, caught by the new
  Playwright check below: `#place=<key>` loads a page and calls `actOn('site',
  F_)` from a top-level IIFE with no prior user gesture; `actOn` unconditionally
  called `sfx.unlock()` (and, for Bagh Bhairab, `ringBell()`), which creates/
  resumes a `window.AudioContext` with no user gesture - Chrome logs this to the
  console as a warning ("The AudioContext was not allowed to start..."), which
  this project's own check (and the run's required check) treats as a failure.
  Fixed by giving `actOn` a fourth `quiet` parameter that skips `sfx.unlock()`/
  `ringBell()` (used only by the deep-link IIFE, `actOn('site', F_, null,
  true)`); normal clicks/keys/Places-bar picks are real user gestures and are
  unaffected (still call `actOn('site', r)` with `quiet` undefined/falsy). This
  is in `src/hud.js` only - `diorama/_engine/src/engine/sfx.js` was not touched.
- `tests/site-check.mjs` extended: on the already-open desktop-light context (no
  extra page loads needed), presses keys 1-6 for all six places in `FOCUS`
  order and checks each opens the panel with the right name, a history string,
  a non-empty "what to look for" line, exactly two `<img>`s, and the matching
  `#place=<key>` hash, then screenshots each (`place-<key>.png`); then presses
  Escape once and checks the panel closes and the hash clears. Two further
  checks each open a fresh page directly at `#place=uma` and `#place=stupa`
  (first/last in `FOCUS`, to spot-check the separate on-load instant-snap code
  path without paying for all six as full page reloads - each cold load is
  ~60s) and confirm the panel opens on load with the right content; the
  existing per-context console/pageerror/requestfailed/4xx listeners (already
  used by `wholeIsland()`) catch any broken photo request on all of these
  passes, satisfying "whose photos are broken" without a separate check. Pin
  clicks and the on-map Places bar are not yet checked (those controls are not
  yet visible on the map - see "not yet addressed" below); that lands with
  slice 3. Verified: build succeeds, `git status` shows only `index.html`
  alongside the `src/` changes, `tests/site-check.mjs /tmp/kirtipur-shots`
  prints `OK` (median frame 16.7ms at 1440x900, no console
  errors/warnings/failed requests on any pass), and `harness.mjs sim --minutes
  5` still passes (0 watchdogs). Screenshots reviewed: the desktop-light panel
  (e.g. `place-bhairab.png`) shows the history/look/photo/credit layout reading
  correctly against the 3D map; a one-off manual check at 390x844 confirmed the
  bottom sheet renders and leaves the landmark visible above it.
- Not addressed this slice (left as-is, by design, matching the limitation
  already on record from slice 1): on narrow viewports the engine's own
  `@media (max-width: 600px) { .stage { height: 58vh; min-height: 300px; } }`
  rule (`diorama/_engine/src/shell.html`, not edited - this project may not
  touch `_engine`) still applies, since nothing in this project's
  `src/style.css` overrides the `.stage` element's `height` property under
  600px (only `position`/`inset` are set, on a different property). So `#stage`
  - and everything positioned inside it, including the new mobile panel, which
  correctly anchors to `#stage`'s own box - is currently confined to the top
  58% of the viewport on phones, confirmed via `getBoundingClientRect()`
  (`#stage` height 489.5px of an 844px viewport, exactly 0.58 × 844). This does
  not cause page scroll (already passes the no-scroll check) and the panel
  still correctly "leaves the focused landmark visible" per decision 4 because
  it is anchored within that same shortened box, but it means the island and
  the bottom-sheet panel both currently sit in the top ~58% of a phone screen
  rather than the full viewport. Fixing `#stage`'s mobile height (overriding
  `height` the same way `inset` is already overridden) belongs with slice 4's
  "phone bottom sheet" responsive work, alongside the camera-framing tuning
  slice 1 already deferred there for the same reason.
- Also not addressed this slice, per the suggested order: pins 1-6, the north
  arrow, the scale bar, the legend and relocating the compact map controls
  (including the Places bar) out of the still-hidden right rail onto the map
  itself - all slice 3. `#segPlaces`' buttons therefore still cannot be
  Playwright-clicked yet (they are inside `.rail`, hidden via
  `src/style.css`'s existing chrome-hiding rule); keys 1-6 and `#place=<key>`
  exercise the exact same `actOn('site', ...)` call the Places bar will use
  once it is relocated, so this is believed to be the same code path, just not
  yet directly tested via that specific control.

### Slice 3: pins, north arrow, scale bar, legend, compact controls (iteration 3)

- Moved the interactive controls that used to live inert inside the hidden right rail
  (`src/rules.html`, inside `.rail`, `display:none`) onto the map itself: `src/stage.html`
  now has a `.map-toolbar` strip along the bottom edge with `Whole island`, the six-place
  `#segPlaces` bar, new `Zoom in`/`Zoom out`/`Turn left`/`Turn right` buttons, and the
  existing `Measure`/`Labels` toggles, plus a new on-map `Dark theme` button. Per decision 6,
  `Day cycle` and the `Fewer houses` slider have no UI control any more: `src/hud.js` now
  just calls `thinHouses(0.2)` once (the previous slider default, so the rendered house count
  and frame-time budget are unchanged) and dropped the `btnCycle` listener (`day.cycle` stays
  `true` from its own default - the day cycle, people and lamps keep running, just with no
  toggle). `src/rules.html` keeps only its (still-hidden) descriptive paragraph; the two
  relocated `<div class="seg">` rows and the slider were deleted from it, not duplicated.
- Zoom in/out reuse the exact step a wheel tick already uses (`iso.zoom *= 0.926` / `*1.08`,
  clamped to `iso.zoomMin`/`zoomMax` - see `diorama/_engine/src/engine/ui.js`); Turn left/right
  call the engine's own `iso.stepTurn(-1|1)`, the same function the engine's own (still hidden)
  `#turnL`/`#turnR` rail buttons call. The on-map `Dark theme` button does not duplicate the
  engine's theme logic: it just calls `$('btnTheme').click()` (so the engine's own listener and
  slice 1's `applyMapBg` both still fire) and mirrors that hidden button's own label text, per
  the extension point slice 1's notes anticipated.
- Pins: `src/hud.js` adds a `.pin` (numbered 1-6, `src/places.js`'s `FOCUS` order) `<button>`
  per place into a new `#mapPins` overlay (`src/stage.html`), positioned every frame the same
  way the existing name labels already are (`_pv.copy(...).project(iso.cam)`), anchored 2 world
  units above each place's existing label anchor so the two do not overlap on screen. Each pin's
  click handler calls `actOn('site', F_)` directly - it does not go through the engine's 3D
  raycast/`clickables` path the building hit-boxes use, since a 2D screen-anchored button is
  simpler and does not need a 3D hit-box of its own.
- North arrow (`#compass`/`#compassNeedle`, `src/stage.html`, updated from a new
  `updateCompass()` in `src/hud.js`'s `draw()`): `tools/prep.py`'s own `xy(lat, lon)` function
  (`z = -(lat - LAT0) * MZ`) is the source of truth that map z increases southward, so world
  `(0, 0, -1)` is true north; `iso.right`/`iso.up` (camera.js's own per-frame screen-space
  basis vectors, already computed for the current drag/turn) give the needle's on-screen angle
  directly via `atan2(north.dot(right), north.dot(up))`, with no separate bearing trig needed.
- Scale bar (`#scaleFill`/`#scaleLabel`, updated from a new `updateScaleBar()`): px-per-metre is
  `(stage pixel height / iso.viewH) * U` (`U = 0.25` world units/metre, `terrain.js`), then a
  standard "nice number" rounding (1/2/5 x a power of ten) picks the largest metre value that
  keeps the bar near a 70px target width, so it reads a round number at any zoom level.
- Legend (`.legend`, static markup, no JS): swatches reuse this project's own real render
  colours directly rather than inventing new ones - `TINTS[0]`/`TINTS[-1]` (`terrain.js`'s
  hypsometric band colours) for the "2 m height bands" gradient, `#b5603f` (the brick wall
  colour `houses.js`'s `part('brick', plainMat('#b5603f'), ...)` already paints every house
  with) for "Buildings", the stone-flag lane texture's own base fill (`#968e85`,
  `roads.js`'s `flags` texture) for "Lanes", and `PAINT.water` (`#4fa3b8`, `terrain.js`) for
  "Water" - so the legend cannot drift out of sync with what is actually drawn.
- Real bug found and fixed (via this slice's own Playwright click checks, not caught by any
  earlier slice because those only ever drove the map by keyboard, `#place=<key>` loads, or a
  programmatic `.click()` call - never a real simulated pointer click): every button placed
  inside `#stage` - the toolbar's buttons, the panel's Close/Prev/Next, and now the pins - never
  received a real mouse/touch click's `click` event, only a programmatic `element.click()` one.
  Root cause: `diorama/_engine/src/engine/ui.js`'s own `#stage` `pointerdown` handler
  unconditionally calls `stageEl.setPointerCapture(e.pointerId)` for every pointer (so it can
  track camera-drag gestures), with no check for whether the real target was a UI control; per
  the Pointer Events spec, once a pointer is captured by an element, that pointer's later events
  - including the synthesised `click` - are retargeted to the *capturing* element (`#stage`,
  since our buttons are `#stage` descendants so the map UI can overlay the canvas) instead of
  the one actually under the pointer, so the button's own `click` listener never ran. This is an
  engine-code bug (`_engine/src/engine/ui.js`), so it cannot be fixed by editing that file
  (constraint); fixed instead by adding one more `pointerdown` listener of our own to the same
  `stageEl`, in the capture phase (`{ capture: true }`, so it runs before ui.js's bubble-phase
  one), that calls `e.stopPropagation()` whenever the real target is one of our own controls
  (`e.target.closest('button, .panel')` - `.panel` so clicks on the photo "Source" links and
  prose inside the panel are covered too, not just its own buttons). This is the same
  "extend via an extra listener on an existing engine element" pattern slice 1/2 already used
  for `applyMapBg`/the fly-cancelling `pointermove`/`wheel` listeners - no `_engine` file touched.
  Confirmed fixed with a small standalone reproduction (`element.click()` worked before and
  after; a real `page.click()` only started reaching the handler after this fix) before relying
  on it in `tests/site-check.mjs`.
- `tests/site-check.mjs` extended: a `furniture` check (6 pins present, the scale bar has a
  non-zero width and a "`<number> m`"/"`<number> km`" label, the legend has 5 rows, all 8
  toolbar control ids are visible) plus a `Turn right` click that confirms the compass needle's
  CSS `transform` actually changes; `placesByKey` was generalised into `placesByTrigger(pg,
  label, trigger, shotDir)` and is now run three times - by key (unchanged, still the one that
  takes screenshots), by the place bar (`byBar`, clicks `#segPlaces button[data-v=...]`), and by
  pin (`byPin`, clicks `.pin[data-v=...]` - first clicking `Whole island` and waiting ~1.5s,
  since pins are anchored in world space, not fixed on screen like the place bar, so a different
  place's pin can fly off-screen once the camera is close to the previously-picked one).
  Verified: build succeeds, `git status` shows only `index.html` + this slice's `src`/`tests`
  changes, `git diff --name-only 464a1f4` lists only `diorama/kirtipur-map/` paths,
  `tests/site-check.mjs /tmp/kirtipur-shots5` prints `OK` (median frame 16.7ms at 1440x900, all
  four place-trigger passes and the deep links clean) and `harness.mjs sim --minutes 5` still
  passes (0 watchdogs). Screenshots reviewed at both breakpoints and both themes: pins/compass/
  scale bar/legend/toolbar all render and read correctly on desktop; on mobile the legend was
  initially found overlapping the "Our Kirtipur" title pill (a regression from this slice, since
  slice 1 had nothing in that top-left corner) - fixed with one `@media (max-width: 600px)` rule
  moving the legend down below the title - then reverified clean.
- One Playwright run hit a `page.goto: Page crashed` failure (a Chrome renderer crash, not a
  code bug - this session had launched many back-to-back headless Chrome instances for ad hoc
  debugging first) and the backgrounded shell command then hung past its own timeout waiting on
  a process that had already crashed; re-ran the same unmodified check in the foreground per
  this run's own verification protocol and it passed cleanly. Not a project bug, noted only so a
  future iteration does not mistake an isolated environment flake for a regression.
- Not addressed this slice, left as-is (already on record, not caused by this slice): the
  mobile `#stage` 58vh height limit (slice 1/2's notes) is still open, still deferred to slice
  4's responsive work - visible again in this slice's own mobile screenshots as the large empty
  band below the island. Also still open, first flagged in the "Host review after iteration 1"
  section above and not yet attempted in any slice since: the dark/light map background shows a
  faint dither checkerboard rather than a flat tone. Root cause is now understood precisely
  (not just hypothesised): `diorama/_engine/src/engine/post.js`'s post-process pass quantises
  every rendered pixel to the nearest of a fixed 64-colour `PALETTE` and ordered-dithers between
  the two nearest entries for any colour that does not land exactly on one (this is the engine's
  intentional "64-colour palette + dither" pixel-art style, on by default for every diorama, not
  a bug in the engine itself) - `src/hud.js`'s `MAP_BG` light/dark RGB values do not exactly
  match any `PALETTE` entry, so they dither against their two nearest neighbours. The likely fix
  is to pick `MAP_BG` values that exactly equal two `PALETTE` entries (`PALETTE` is in scope,
  concatenated the same way `TINTS`/`PAINT` already are) - but the *shader-visible* colour that
  needs to land on a palette entry is the fully-rendered pixel after tonemapping, not the raw
  `top`/`bot` input vector fed to the sky-gradient shader, so simply setting `MAP_BG` to a
  `PALETTE` hex is not guaranteed to be exact without rendering and sampling to check; left
  unattempted this iteration (out of this slice's scope, and risked a trial-and-error detour)
  rather than guess. A good candidate approach for whichever slice picks this up: render once,
  read back the actual backdrop pixel colour via a debug-build screenshot, and iterate `MAP_BG`
  toward whichever exact `PALETTE` entry it lands nearest to.

### Host review findings addressed (iteration 4)

All 9 host findings raised after iteration 1 and repeated (unfixed) after iteration 3 are fixed
this iteration, verified by rendering the built page and reading back real pixels/boxes (not just
eyeballing screenshots) wherever the fix was a calibrated number:

1. **Mobile `#stage` 58vh cap.** Root cause was actually `@media (max-width: 900px)` in the
   engine shell (not 600px as earlier notes assumed), setting `.main { padding: 12px 16px 0 }`
   and `.stage { height: 58vh }`; fixed with a matching `.stage { height: 100vh; height: 100dvh;
   min-height: 0 }` inside our own existing 600px media block (same `.stage` specificity, our
   rule loads after the engine's, so it wins). While tracking this down, found a second, smaller
   bug: `.head` (kept non-`display:none` only because `#btnPause`, the harness's required click
   target, lives inside it - see slice 1) still claimed about 8 CSS px of height from inherited
   line-height even with every visible child hidden, offsetting `.main` (and everything
   absolutely positioned inside it, including `#stage`) down by 8px with the bottom 8px clipped
   off-screen. Fixed with `.head { height: 0; margin: 0; padding: 0; overflow: hidden }`;
   `#btnPause`'s own `position: fixed` keeps it clickable regardless of its ancestor's size.
   Verified: `.stage canvas`'s `getBoundingClientRect()` is exactly `(0,0,1440,900)` and
   `(0,0,390,844)` now (read back via Playwright, not estimated) - this is also now a permanent
   `site-check.mjs` assertion (`wholeIsland`'s canvas-bbox check).
2. **Dark-theme background dither.** `_engine/src/engine/post.js`'s post pass quantises every
   pixel - including the sky backdrop (`uSkyTop`/`uSkyBot`) - to the nearest of its 64-colour
   `PALETTE` in OkLab space and dithers between the two nearest entries for anything that doesn't
   land exactly on one; `uSkyTop`/`uSkyBot` feed `toOkLab` directly in the shader with no
   sRGB-to-linear step of their own, while the palette's own Lab table (`uLab`, built CPU-side)
   decodes each hex from sRGB to linear first - so `MAP_BG`'s values need to equal that same
   gamma-decode of a palette hex, not the hex's raw `/255` fraction. The previous dark value
   (`[0.07, 0.06, 0.09]`) sat almost exactly between `hexToLinear('#403a35')` and
   `hexToLinear('#5c554e')`, which is exactly the two-colour checkerboard the host saw and matches
   the pixel samples I read back from a built-page screenshot (`[64,58,53]` /`[92,85,78]`, both
   exact `PALETTE` hexes). `MAP_BG` is now `{ light: hexToLinear('#f9efe3'), dark:
   hexToLinear('#171417') }` (computed once, pasted as literals with a comment explaining why);
   light's new value is the same colour it already rendered as (that one already happened to be
   close enough to land flat, now made deliberate), dark is a near-black warm tone. Verified by
   sampling three corner pixels of the rendered `.stage canvas` (via an in-page `drawImage` to a
   2D canvas + `getImageData`, no screenshot/PNG decode needed) at both breakpoints: all three
   now read an identical RGB triple in dark theme. This read-back is also now a permanent
   `site-check.mjs` assertion in `wholeIsland` (only for `label.includes('dark')`).
3. **Desktop (and mobile) framing sat high.** The isometric camera always renders its look-at
   `target` at the exact screen centre; the whole-island `HOME.at` (`[0, -16, 0]`) wasn't tuned
   for a title-top/toolbar-bottom layout and left the island's visible top near the title with a
   large empty band above the toolbar. Measured the built page's actual island bounding box at
   1440x900 (same canvas-pixel-scan technique as finding 2, scanning for the first/last row that
   differs from the background colour): island spanned y 57-677 (centre 367); the usable band
   between the title and toolbar is roughly y 40-858 (centre ~449) - about 82px of downward shift
   needed. Since the camera's elevation angle is fixed, a *pure world-Y* nudge to the home target
   moves the whole scene down on screen with **zero** left/right drift at any turn angle (the
   camera's screen-right axis always has a zero Y-component for this camera basis - see
   `updateCompass`'s `iso.right`/`iso.up`), unlike using `iso.up` directly (which does have an
   azimuth-dependent horizontal component). Added `frameScale(zoom)` (mirrors camera.js's own
   `base`/`viewH` formula to get world-units-per-CSS-pixel for a target zoom before the glide
   there finishes) and `homeTarget()` (applies `HOME_DOWN_PX = 80` through that scale, divided by
   `cos²(el)` to undo the fixed look-down angle's foreshortening of a pure-Y move) - used for both
   `goHome()` and the page's initial `iso.configure(...)` call, so the very first frame is already
   correctly framed, not just after a later `Whole island` click.
4. **Focused landmark hid behind/under the panel.** `actOn('site', ...)`'s `flyTo(r.view, ...)`
   always put the landmark at dead screen centre, which is behind the right-side panel on desktop
   and under the bottom sheet on phones. Added `panelOffset(zoom)`, which nudges the fly-to target
   along the camera's *current* screen-space `iso.right` (desktop) or `iso.up` (mobile) axes by
   half the panel's own CSS size (`min(380px, 92vw)` / `stageH * 0.45`, mirroring
   `src/style.css`'s own numbers) converted to world units via `frameScale`, so the landmark lands
   centred in whatever map area is actually still visible next to/above the panel instead of at
   the canvas's literal centre. Applies uniformly to clicks, the place bar, keys 1-6 and
   `#place=<key>` deep links, since they all go through the same `actOn('site', ...)` branch.
   Verified visually (`#place=bhairab` screenshots at both breakpoints): the temple now sits
   clearly in the open map area, not jammed against the panel's left edge or under the sheet.
5. **"What to look for" line read like a game banner.** Only Bagh Bhairab's did
   ("the bells ring as you come close..."); the other five were already concrete object
   descriptions. Reworded to match the sourced `history` field already on that place: "Bagh
   Bhairab: the three-roofed pagoda on a cream ground storey in dark timber, named shrines ringing
   its court, facing Dey Pukhu." - no new facts, same source already cited for `history`.
6. **Pins covering their own label text.** Slice 3's notes claimed this was fixed (a 2-world-unit
   vertical gap between the pin's and label's anchor points), but that gap is in *world* space,
   and 2 world units is only ~10 screen px at the whole-island zoom (where all 6 pins/labels are
   visible at once) - nowhere near enough to clear a pin's own 22px diameter plus the label's text
   height, which a 1440x900 screenshot crop confirmed was still genuinely overlapping (pins 1, 2
   and 4 each sat on top of a letter of their own label). Fixed properly this time with a *screen*
   pixel offset instead: pins now share the exact same world anchor as their label, and
   `placePins()` subtracts a fixed `PIN_LABEL_GAP_PX = 22` CSS pixels after projecting to screen
   space, which clears the label at any zoom level by construction (not something that can drift
   back out of sync between pin and label positioning again). Verified with a cropped, upscaled
   screenshot: no pin overlaps any letter of its own label at 1440x900 any more.
7. **Mobile legend overlapping the title, and losing its last two rows.** Slice 3 only fixed the
   title overlap (moved the legend to `top: 40px`); the `.legend p:nth-child(n+4) { display: none
   }` rule that drops the Lanes/Water rows to make it fit was left in place, so the "loses its
   last entries" half of the finding was never actually addressed. Replaced both with a collapsed
   state on phones: a new small `#btnLegend` toggle (`Legend`) sits where the legend used to,
   `.legend` itself stays `display: none` until `.open` is toggled by a click handler in
   `src/hud.js`, and when open it shows every one of its 5 rows (the `nth-child(n+4)` rule is
   gone) at `top: 38px`, clear of the title. No-op on desktop (`.legend-toggle { display: none }`
   outside the 600px breakpoint; the legend is always shown there, as before).
8. **Mobile toolbar overflowing ("5 Lo..." cut off).** Split each place button's markup into a
   `<b>` number and a `.place-name` span (`aria-label` now carries the full name, since `title`
   tooltips don't help touch users anyway); on phones `.place-name` is hidden (numbers only,
   matching the on-map pins) and `.map-toolbar` switches from `overflow-x: auto` to `flex-wrap:
   wrap` with `overflow-x: visible`, so it wraps to two rows instead of requiring a sideways
   scroll. `.map-credit`'s mobile `bottom` was widened (46px -> 96px) to clear the now-taller
   two-row toolbar; checked by screenshot, not just computed, since the exact wrapped height
   depends on the browser's own flex line-breaking.
9. **site-check runtime.** Was 516s (8:36, over budget) the first time this iteration's new
   canvas-bbox/dark-flat-bg assertions were added; trimmed several `waitForTimeout` paddings that
   had headroom (place-trigger settle 500ms -> 350ms, Esc-settle 400ms -> 300ms, `byPin`'s
   post-`Whole island` wait 1500ms -> 900ms, `wholeIsland`'s own settle 2500ms -> 1200ms, the
   compass-turn wait 1500ms -> 800ms, the reduced-motion wait 2000ms -> 1200ms, each deep link's
   settle 1000ms -> 600ms) without touching the real page-load waits (`waitForFunction` on the
   feed, which is what actually gates correctness) or dropping any covered trigger/place/
   breakpoint. Re-ran in the foreground: **374.2s (6:14)**, printed via a `total time ...s` line
   added at the very end, now under budget with real margin. (The first number, 516s, was itself
   likely already close to or over budget before this iteration, since the prior slices never
   measured or printed it - flagged as a recurring host note in two iterations running.)

**Known remaining issue, not one of the 9 numbered findings above, left for a future slice:** at
the mobile whole-island view (390x844), the six places sit close enough together in world space
that even with finding 6's fix, some pins/labels still crowd each other (not a pin-vs-its-own-label
problem any more, but place-N vs place-(N+1), e.g pin 5 sitting near the "Trisandhya Kirti Bihar"
minor-tole label and "Lohan Dega"'s own label). This is pre-existing (the same six places are just
as close together in world space regardless of this iteration's changes, and the previous,
much-more-cramped 58vh mobile canvas - finding 1 - almost certainly hid the same crowding at an
even smaller effective scale), not a regression introduced here, and wasn't one of the 9 findings
raised for this iteration (which only called out *desktop* pin/label overlap for finding 6). Fixing
it properly needs the pins to participate in the same label-collision system `placeLabels()` already
runs for labels (or a deliberate priority/hide rule for minor labels at a wide zoom), not a one-off
pixel constant - a real next slice, not a quick fix bolted onto this one.

## Landmark photo comparisons

### Bagh Bhairab - checked, one change made (iteration 1)

Compared `src/bhairab.js` against the 96 Wikimedia Commons photos in
`ref/bhairab` (see `ref/bhairab/ATTRIBUTION.md` for author/licence per file;
that file has no capture dates, only Commons filenames - treat as undated
until re-verified against each file's Commons page).

Photos reviewed directly: `Bagh_Bhairab_Temple_Kirtipur_01.jpg` (Nabin K.
Sapkota, CC BY-SA 4.0), `South-east_view_of_Bagh_Bhairab_temple.jpg` (Pratik
Mani Gyawali, CC BY-SA 4.0), `Bagh_bhairab_madir.jpg` (Ritik, CC BY-SA 4.0),
`Bagh_Bhairab_Kritipur_IMG_8037_06.jpg` (Harry Paudyal, CC BY-SA 4.0),
`Bhaghbhairab_Temple_Kritipur-IMG_3903.jpg` (Bijaya2043, CC BY-SA 4.0).

Checked and already correct, no change:
- Three-roof pagoda massing and the tapering proportions between storeys.
- Ground-storey cream wall in a dark timber frame, outer ring of black posts.
- Gilded torana and lions at the main door, hanging bells either side.
- Row of finials along the top roof's ridge and the small grey-metal top
  roof shape.
- Carved second/third storey brick with the dark carved timber band.

Changed: the lower two tiled roofs (first and second storey) carry visible
patches of moss/grass near the ridge in every wide photo (clearest in
`Bagh_Bhairab_Kritipur_IMG_8037_06.jpg` and `Bagh_bhairab_madir.jpg`); the
model's roofs were a flat tile colour. Added a `mossRidge` helper in
`bhairab.js` (same two-layer technique as `mossRoof` in `uma.js`, generalised
to rectangular roofs) and applied it to the first and second roofs only -
the third (grey metal) roof shows no moss in the photos, so it was left as
a plain `roof()` call.

### Uma Maheshwar - checked against the site's two Commons photos (iteration 10), no further change needed

Compared `src/uma.js` against `site/img/uma/uma-maheshwar-01.jpg` (Nabin K.
Sapkota, CC BY-SA 4.0, 22 Sep 2018) and `-02.jpg` (same author/licence, same
date, the clearer full-elevation shot).

Checked and already correct, no change:
- Three-tiered pagoda massing on a tall three-step brick plinth, narrowing
  storey by storey - matches both photos' proportions.
- All three roofs show moss/grass growing near the ridge in photo 2 (every
  tier, not just the top), which the model already renders via `mossRoof`
  on the lower two roofs and (from an earlier iteration) `mossPyramid` on
  the top roof - visually confirmed this iteration with a `#place=uma`
  Playwright screenshot (zoomed crop) after rebuilding: all three roof
  tiers render moss-green, matching the photo. This closes the "not yet
  visually checked" item carried over from the previous iteration.
- Open ground-storey colonnade (a solid cella box ringed by thin corner
  posts standing in for the carved-post arcade) - a reasonable low-poly
  read of photo 2's columned ground floor with a darker inner cella wall.
- Brick plinth with light stone step edges and a front stair - matches the
  striped brick/stone steps in both photos.
- The arched whitewashed gate and retaining wall on the lane side (photo 1)
  - already modelled as a separate gate structure on the `+x` side.

No roof edge/trim colour was added even though photo 1 shows a lighter
pinkish-red fascia band under the eaves, distinct from the darker roof
tile: every other landmark's `roof()` calls in this codebase render as a
single flat colour with no separate edge trim (confirmed in `city.js`), so
adding one here only would be a one-off stylistic inconsistency rather than
a real mismatch fix; left as-is.

Uma Maheshwar's Priority 2 review is now complete (moss fix from an earlier
iteration, confirmed correct this iteration, no further changes needed).

### Lyaku Museum - checked against the site's two Commons photos (iteration 12), two changes made

Compared `src/lyaku.js` against `site/img/lyaku/lyaku-01.jpg` ("Kirtipur 18th
century palace", Avista7, CC BY-SA 4.0, 30 Jun 2018 - a straight-on street
shot of the museum building itself) and `-02.jpg` (a wider Layaku lane shot,
mostly useful for general wall colour/material context, not the museum's own
facade).

Checked and already correct, no change:
- Three-storey box massing with cream floor bands between storeys, matching
  the brick facade's horizontal decorative bands in the photo.
- Front carved-timber post arcade along the ground floor, carved tiki
  windows across the upper storeys, and the projecting carved sanjhya bay -
  all consistent with the carved timber window bands clearly visible across
  every storey in the photo.
- The tiled gable roof shape and strut brackets.

Changed (two real mismatches, both visible in `lyaku-01.jpg`):
- The ground-floor door was a gilded gold box (`#d99926`) under a gilded
  torana arch (`#f5b841`) - temple-door treatment (gajur/torana gilding is
  reserved for shrine doorways elsewhere in this codebase, e.g. `gajur()` in
  `city.js`, the bhairab/uma temple doors). The photo shows a plain dark
  carved-wood doorway with no gilding anywhere on the building - this is a
  secular palace-turned-museum, not a temple. Changed the door to `WOOD` and
  replaced the torana with a plain carved-wood lintel (`carvedMat`).
- Three gilded roof-ridge finials (gold `cyl()` pairs, again a temple
  signature) had no basis in the photo - the real roof ridge is plain tiled,
  no gilding. Removed them and replaced with the building's actual signature
  roof feature visible in the photo: a small square lookout tower/cupola
  rising above the main roofline toward one end, with its own little hipped
  roof - added as a boxed tower with two carved-wood window strips and a
  small grey pyramid roof, positioned the same side (toward the lane end) as
  the photo shows it.

Verified with build + smoke (both pass) and a `#place=lyaku` Playwright
screenshot (cropped/zoomed): the tower reads clearly on the roofline, the
door is now plain wood with no stray gold, and no other geometry regressed.

### Dey Pukhu - checked against the site's two Commons photos (iteration 13), two changes made

Compared `src/pukhu.js` against `site/img/pukhu/dey-pukhu-01.jpg` and
`-02.jpg` (Rajesh Dhungana, CC BY-SA 4.0, 6 August 2021), plus a web search
for other descriptions of the site (no further openly-licensed 2022+ photos
turned up; Dey Pukhu is described everywhere as a rain-fed reservoir, never
a spout/fountain).

Checked and already correct, no change:
- Tank proportions, sunken brick retaining walls with a lighter plastered
  band at the water line, niched brick parapet, corner stairs down to a
  ledge - all visible in both photos.
- The white Narayan shrine at the west end: plinth, large weathered/mossy
  dome with a gilded tiered finial on top, deep maroon arched doorway -
  matches the zoomed-in shrine visible across the tank in photo 1.

Changed (both in the water, a real mismatch in both photos):
- The water had a fountain jet and spray-ring in the middle (a post plus a
  ring of 8 small boxes). Neither photo shows any post, spray or disturbance
  on the tank surface - it is dead flat - and every description found of Dey
  Pukhu calls it a still rain-fed reservoir, not a spout (the Newar term for
  a spout, `hiti`/`dhunge dhara`, is never used for this pond). Removed the
  fountain entirely.
- A third of the floating-plant patches were a bright teal-blue
  (`#4fa3b8`), meant as "open water" showing through the duckweed. Both
  photos show the tank almost fully carpeted in dull yellow-green duckweed
  with darker green clumps of a second floating plant on top, and exactly
  one small patch of visibly open water - which reads dark/murky, not
  bright blue. Changed the occasional patch colour from teal-blue to a dark
  murky green (`#30362a`) and made it rarer (1 in 6 patches instead of 1 in
  3), closer to the photos' near-total coverage.

Verified with build + smoke (both pass), the `modes` harness (passes, no
regression in the day/dusk/night screenshots), and a `#place=pukhu`
screenshot: the tank now reads as solid green with no blue patches and no
fountain structure, the Narayan shrine's dome and gold finial render
correctly.

### Chilancho - reviewed (iteration 14)

Compared `src/chilancho.js` against the two credited `site/img/stupa` photos
(zoomed crops of the stepped brick base and the four shrine niches).

What already matches: the two-tier brick plinth and terrace, the squarish
brick base mass with a recessed shrine niche and brick-stepped pediment roof
on each of the four sides, the brick corner pinnacles at the top of that
base, the white dome, the single gilded thirteen-ring spire with gajur
finial, the four white corner stupas at their OSM positions, the iron fence
with gate and stone lions, and the brick chaityas round the square - all
confirmed present and correctly shaped/coloured in both photos.

Real mismatch found: each of the four shrine niches had a gilded ("GILT",
`#f5b841`/`#d99926`) torana arch over the door, a gilded threshold bar, and
two small gilded finial cylinders beside the door. Both photos (including a
3x zoomed crop of one niche) show these niches as bare weathered stone and
brick with moss staining - no gold anywhere except the dome's harmika and
spire far above. Recoloured the torana, threshold and corner finials from
`GILT` to a new `NICHE_STONE` (`#8c8176`) constant, matching the
surrounding weathered stone colour seen in the photos; left the dome,
harmika and spire rings gilded since those are correctly gold in both
photos.

Verified with build + smoke (both pass), the `modes` harness (passes, no
regression), and a `#place=stupa` screenshot: the dome, spire, corner
stupas and prayer flags render as before, with no visible gold on the
lower niches.

This closes the Priority 2 landmark review list: Bagh Bhairab, Uma
Maheshwar, Lohan Dega, Lyaku Museum, Dey Pukhu and Chilancho have all now
been compared against their photos and fixed or confirmed matching.

### Lohan Dega - how its site photos were found (iteration 5)

Wikimedia Commons has no photo identifiable as this specific temple under its
name or known alternate spellings (Lohan Dehar, Lon Degah, Lodegal) - checked
again this iteration via the Commons search API and the `Category:Temples in
Kirtipur` / `Category:Royal Palace, Kirtipur` trees, same dead end noted in
iteration 4.

Found via Mapillary instead: querying `graph.mapillary.com/images` with the
token at `tools/.mapillary_token` (main checkout only, gitignored) over a
bbox around the temple's computed lat/lon (27.67786, 85.277602, derived from
`places.js`'s `lohan` metres via `tools/mapillary.py`'s projection) returned
21 images; the three closest (10-38m away, all by Mapillary user `brojenmay`,
captured 2022-05-17) clearly show a stone shikhara temple matching Lohan
Dega's description - stepped stone plinth, arcaded shrine storey, tall ribbed
tower - down the lanes converging on it. (Iteration 4's "5 nearest images are
unrelated" finding looked at a different/smaller result set; this bbox search
surfaced closer ones it missed.)

Used image IDs `168746835570204` and `132826862682414` (both CC BY-SA 4.0,
captured 2022-05-17 by brojenmay) as `site/img/lohan/lohan-dega-0{1,2}.jpg`,
credited and linked to `https://www.mapillary.com/app/?pKey=<id>` from
`site/places/lohan.html`.

### Lohan Dega - model checked against the two Mapillary photos (iteration 9), one change made

Compared `src/lohan.js` against `site/img/lohan/lohan-dega-01.jpg` and
`-02.jpg` (both brojenmay, CC BY-SA 4.0, 2022-05-17).

Checked and already correct, no change:
- Four-step stone plinth narrowing upward, with a front stair.
- Arcaded shrine storey massing (stone cella with a colonnade) under a
  cornice, cella doorway roughly centred and recessed/dark.
- Tall tapering shikhara tower rising straight from the shrine storey, no
  intermediate flat pagoda roofs - matches the curvilinear stone-temple
  silhouette in both photos (the model's stacked-box taper is a reasonable
  low-poly stand-in for the real tower's smooth curve, consistent with the
  diorama's blocky style used for every other landmark).
- Small corner turrets at the shrine-storey roofline, each with their own
  finial - visible flanking the base of the main spire in photo 1.

Changed: in both photos the shrine-storey colonnade and cella are
noticeably darker (sooted/weathered near-black-brown stone) than the paler
grey-brown shikhara tower above, a consistent pattern across two different
angles/lighting conditions so not just a shadow artefact. The model used the
same light stone tones (`ST`/`ST_L`) for the cella and its columns as the
plinth and tower. Added an `ST_SOOT` (`#4d453d`) colour and applied it to the
shrine-storey cella box and its arcade columns only, leaving the plinth,
cornice and shikhara in their original lighter stone tones. Rebuilt,
reverified with build + smoke (both pass), and confirmed visually via a
`#place=lohan` screenshot: the base now reads as a dark stone podium under a
lighter tower, matching the photos, and the deep-link camera/collapse
convergence fix from iteration 8 still lands correctly.

## Website (landing page, place pages, map deep links) - historical, site/ deleted in slice 2

This section documents the old multi-page `site/`, which slice 2 (iteration 2,
see above) folded into the single-page map's detail panel and then deleted
entirely, per the newer objective's decision 5. Kept here as the history of
where the panel's content and photo credits came from.

Scaffold built (iteration 4): `site/index.html` landing page, `site/site.css`
shared nav/tokens (light + dark via `prefers-color-scheme`), and
`site/places/<key>.html` for all six keys, each with an "Open in 3D map"
link to `../../index.html#place=<key>`. `#place=<key>` deep links wired into
`src/hud.js` (fly to place on load from `location.hash`; picking a place
sets the hash via `history.replaceState`; Whole island/Esc clears it) and a
back-link pill from the map to `site/index.html` via `src/stage.html` /
`src/style.css`. All six place pages now have 2+ credited, openly licensed
photos (iteration 5 added Lohan Dega's, the last gap).

Host review item 1 (deep link vs click camera convergence) - fixed this
iteration. Root cause: `startLoop`'s per-frame `dt` is clamped to a max of
0.05s (`loop.js`), so the camera glide (`updateFly`) and house-collapse
easing (`updateCollapse`) in `hud.js` only ever advance a small amount of
*simulated* time per real frame, however long that frame actually took to
render. Headless Chrome with no GPU renders the first few frames after a
cold page load (shader compiles, scene build) far slower than 60fps, so a
deep-linked load got only a handful of real frames within the 8s the host
reviewer waited, leaving the glide partway through - while a click made
after the page had already warmed up got many more frames in the same real
time and converged. Fix: in the `#place=<key>` startup IIFE in `hud.js`,
after calling `actOn('site', F_)`, snap `iso.target`/`iso.zoom` and
`COLLAPSE.amount.value` straight to their final values instead of leaving
them to the glide, so the deep-linked page lands on the exact close-up (and
collapsed houses) on the very first frame, with no dependence on render
speed. Verified by reading `window.__dbg.run(...)` state (debug build) right
after a deep-linked load vs. the state after a click plus a real 3s wait:
deep link lands on `zoom:0.06, collapse:1` immediately for Lohan Dega
(`places.js`'s `lohan.zoom`), matching the click's settled
`zoom:~0.0602, collapse:~0.9999` - same destination, reached without
waiting on slow frames. Click behaviour (still animated, unaffected) was
left as-is since the host only flagged the deep-link case.

Full Playwright pass (iteration 8): all 7 site pages (`site/index.html` +
six place pages) at 1440x900 and 390x844 - no console errors, no failed
requests, no horizontal overflow. All six `#place=<key>` deep links plus
plain `index.html`, at both 1440x900 and 390x844 - same, clean. This closes
host review item 1, the last of the 5 items raised after iteration 4; all
five are now fixed and verified.

Host review item 2 (after iteration 8): the landing page's place-card
thumbnails stopped 32px short of the card's right edge, leaving a white
strip, despite the iteration-7 fix setting `.thumb { width: 100% }`. Root
cause (iteration 11): `site.css` has a generic `img { max-width: 100%; }`
rule (needed so photos never overflow their container elsewhere on the
site), and `max-width` always wins over a conflicting `width`, so the
`.thumb`'s width was actually capped at the card's *content-box* width
(100% minus the card's own padding/border), not the border-box width the
`-16px` negative margins were trying to bleed into. Fixed by adding
`max-width: calc(100% + 32px)` alongside the existing
`width: calc(100% + 32px)` on `.place-card .thumb` in `site/site.css`, so
the explicit value is no longer clamped back down. Verified with a
Playwright script measuring each card's image-to-card edge gap directly
(not just a visual screenshot check): all six cards now show a 1px gap on
each side (the card's own 1px border, correct) at both 1440x900 and
390x844, down from a 33px right-side gap before the fix; no console errors,
no failed requests, no overflow. This closes the last open host-review
finding - Priority 1 (the website) is now fully closed.

## Src cleanup

### Moss-roof helpers consolidated into city.js (iteration 15)

bhairab.js's `mossRidge(g, y, hw, hd, k, h, col)` and uma.js's
`mossRoof(g, y, hw, k, h)` / `mossPyramid(g, y, r, h)` were three separate
functions doing the same thing (a base roof/pyramid plus a second,
proportionally-enlarged overlay mesh in a moss colour over the upper half) -
uma.js's versions just hardcoded a square footprint (hw used for both width
and depth) and each file's own colour constants instead of taking them as
parameters. Moved a single generalised `mossRidge(g, y, hw, hd, k, h, col,
mossCol)` and `mossPyramid(g, y, r, h, col, mossCol)` into city.js (which
loads before both landmark files in page.json, so the function declarations
are available via hoisting) and updated both call sites to pass their own
base/moss colours explicitly. bhairab.js's local moss colour constant was
renamed `MOSS_B` to avoid colliding with uma.js's existing `MOSS` constant
in the concatenated build's single global scope.

No behaviour change: every call site passes the exact same numbers that
were hardcoded inside the old per-file functions. Verified with
`build.mjs` (succeeds, index.html matches), `harness.mjs smoke` (OK),
`harness.mjs modes` (OK), and `#place=bhairab` / `#place=uma` screenshots
(1440x900, 10s settle) showing the same moss-green roof overlays as before
the refactor - the two lower tiled roofs on Bagh Bhairab and all three
roofs on Uma Maheshwar.

All six landmark src files were already well under the 500-line cap before
this change (bhairab.js was the largest at 173 lines); this cleanup did not
need to address file length, only the duplicated helper logic named in the
objective.

## Tooling baseline (confirmed working, iteration 1)

- `cd diorama/_engine && npm ci` - works, installs playwright + three from
  the lockfile (node_modules gitignored, not committed).
- `node diorama/_engine/scripts/build.mjs diorama/kirtipur-map` - succeeds.
- `node diorama/_engine/tests/harness.mjs diorama/kirtipur-map smoke` -
  prints OK.
- `node diorama/_engine/tests/harness.mjs diorama/kirtipur-map modes` -
  prints OK, screenshots in `_engine/out/kirtipur-map/` (gitignored, outside
  this repo's tracked files already via the engine's own out dir).

## Host changes after the run (user requests, made directly)

- Raw 3D is the default render mode (hud.js sets `view.raw` directly; clicking the hidden button would start audio without a gesture).
- Night lights (src/lamps.js): street lamps every ~24 m on paved lanes with additive pools; diyas on each temple's own lamp places (Uma's plinth step edges and cella threshold, Bagh Bhairab's brass lamp racks and door threshold, Lohan Dega's plinth steps and shrine threshold, Chilancho's dome ring and niche fronts, Lyaku's threshold, Dey Pukhu's water ledge), recorded by the models through `diyaRow`/`diyaRing` (city.js); one flickering point light per site; warm-white LED strings on Uma Maheshwar's eaves, hips and plinth steps (`ledRoof`).
- Moss removed from every temple roof (the moss helpers are gone); Dey Pukhu shows clear dark water. The panel history still says the real tank is typically duckweed-covered, which is what the photos show.
- The bus follows the longest unbroken run of the drawn asphalt road; it used to join the road's in-board points across the gap where the road leaves the board, cutting over the old town.
- Live Kirtipur time: the clock is the real Nepal time (UTC+5:45) with today's sunrise and sunset from NOAA's low-precision solar formulas; a time slider in the toolbar shifts it, Now returns to live.
- Carving: carved and painted roof struts on every pagoda (`strutMat`), gilded toranas over Uma Maheshwar's and Bagh Bhairab's doors, bell fringes under the eaves, carved lattice windows on the upper storeys, a carved stone cornice on Lohan Dega.
- The heritage walk (src/walk.js): the shortest lane route joining the six places in order, re-laid with irregular stone flags, kerb stones and a drain channel; lane textures are mipmapped. roads.js's ribbon builder is shared (`ribbonMesh`).
- Surroundings within 60 m of each place: stone step strips along house fronts, carved lattice windows standing proud of Newar facades, grey-green shop doors, rolling shutters and balconies on newer houses (houses.js parts, so they sink with the houses in close-ups); the street detail of detail.js (shopfronts, poles and wires, motorbikes, drums) now also fills those areas, while tole labels stay to the original stretch.
- Reference photos (Mapillary, CC BY-SA 4.0, viewed for modelling only, not stored in the repo): brojenmay, 17 May 2022, round Bagh Bhairab (1640579282994997, 126122830063243, 1066000690933972, 1216702892434309, 1167358967422174), Lohan Dega (394797855878988, 151459880723556, 1642159302838090, 997822797766609, 982081445791261, 1238064136730027), Chilancho (987540698460787, 586018412749919, 3244364219127618, 169075178829059) and Lyaku (259803149663306, 135031752453409, 1182550832572633); agmcdonald, 13 March 2018, round Uma Maheshwar (299241911696352, 466852784623241, 505245724003764). No Mapillary images within 30 m of Dey Pukhu.
