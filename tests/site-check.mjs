#!/usr/bin/env node
// Our Kirtipur's own end-to-end check (replaces the engine harness's smoke/modes modes,
// which click the cast rail and the time/weather/render buttons this site now hides on
// purpose - see diorama/kirtipur-map/NOTES-gnhf.md).
//
//   node diorama/kirtipur-map/tests/site-check.mjs <screenshot-dir>
//
// Serves this project directory over a local HTTP server, drives the installed Chrome
// through Playwright (imported from the engine's node_modules), and exits 1 on any
// failure. Covers the whole-island view (chrome hidden, no clouds, no scroll, data
// credits, frame time, reduced motion), the map furniture (pins, north arrow, scale bar,
// legend, toolbar controls) and the six-place detail panel: keys 1-6, the place bar, pin
// clicks (all six places, content and two photos each), #place=<key> deep links
// (spot-checked), and Esc closing the panel and clearing the hash.
import { chromium } from '../../_engine/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const t0 = Date.now();

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function dirname(p) { return p.replace(/\/[^/]*$/, ''); }

const outDir = resolve(process.argv[2] || 'site-check-out');
mkdirSync(outDir, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => {
  const p = decodeURIComponent(q.url.split('?')[0]);
  const f = join(ROOT, p === '/' ? 'index.html' : p);
  if (!existsSync(f)) { r.writeHead(404); r.end('missing ' + p); return; }
  r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise((ok) => server.listen(0, ok));
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`  FAIL ${msg}`); };

async function open({ width = 1440, height = 900, colorScheme = 'light', reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion });
  const pg = await ctx.newPage();
  pg.problems = [];
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') pg.problems.push(`console ${m.type()}: ${m.text()}`); });
  pg.on('pageerror', (e) => pg.problems.push(`pageerror: ${e.message}`));
  pg.on('requestfailed', (req) => pg.problems.push(`request failed: ${req.url()} (${req.failure()?.errorText})`));
  pg.on('response', (res) => { if (res.status() >= 400) pg.problems.push(`request ${res.status()}: ${res.url()}`); });
  await pg.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await pg.waitForFunction(() => document.querySelectorAll('#feed p').length > 0, null, { timeout: 180000 });
  return pg;
}
const reportProblems = (pg, where) => { for (const p of pg.problems.slice(0, 8)) fail(`${where}: ${p}`); };
const scroll = (pg) => pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, w: innerWidth, h: innerHeight }));

// "Visible" here means a human could actually see it: non-zero rendered area and non-zero
// opacity, not just "not display:none" (the harness's own debug build needs #btnPause to
// stay a real, clickable element - see src/style.css - so it is deliberately excluded here).
const CHROME_SEL = ['.scoreboard', '#feed', '.rail', '.kicker', '.head h1', '.intro', '#btnSpeed', '#btnTheme'];
async function chromeHidden(pg) {
  return pg.evaluate((sels) => sels.every((s) => {
    const el = document.querySelector(s);
    if (!el) return true;
    const r = el.getBoundingClientRect();
    return (r.width * r.height === 0) || getComputedStyle(el).opacity === '0' || getComputedStyle(el).display === 'none';
  }), CHROME_SEL);
}

async function wholeIsland(pg, label) {
  await pg.click('#btnHome');
  await pg.waitForTimeout(1000);
  const s = await scroll(pg);
  if (s.sw > s.w || s.sh > s.h + 1) fail(`${label}: page scrolls (${s.sw}x${s.sh} in ${s.w}x${s.h})`);
  if (!(await chromeHidden(pg))) fail(`${label}: engine chrome is visible`);
  const title = await pg.evaluate(() => ({ doc: document.title, onMap: document.querySelector('.map-title')?.textContent.trim() }));
  if (title.doc !== 'Our Kirtipur') fail(`${label}: document title is "${title.doc}", not "Our Kirtipur"`);
  if (title.onMap !== 'Our Kirtipur') fail(`${label}: on-map title is "${title.onMap}", not "Our Kirtipur"`);
  const creditHidden = await pg.evaluate(() => {
    const el = document.querySelector('.map-credit');
    if (!el) return true;
    return getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden' || getComputedStyle(el).opacity === '0';
  });
  if (!creditHidden) fail(`${label}: metric detail section should be hidden`);
  const insta = await pg.evaluate(() => {
    const el = document.getElementById('instaLink');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      href: el.href,
      visible: r.width * r.height > 0 && getComputedStyle(el).display !== 'none'
    };
  });
  if (!insta || !insta.visible) fail(`${label}: instagram link is not visible`);
  if (!insta.href.includes('instagram.com/mrturingdev.diorama')) fail(`${label}: instagram link href is ${insta?.href}`);
  // Host review: the map must fill the whole viewport (the engine shell's own mobile rule used
  // to cap #stage - and the canvas inside it - at 58vh) and, in dark theme, the backdrop behind
  // the island must be a single flat colour, not the post pass's two-colour dither checkerboard.
  const box = await pg.evaluate(() => { const r = document.querySelector('.stage canvas').getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
  const vp = pg.viewportSize();
  if (box.x !== 0 || box.y !== 0 || box.w !== vp.width || box.h !== vp.height) fail(`${label}: canvas is ${box.w}x${box.h} at (${box.x},${box.y}), not the full ${vp.width}x${vp.height} viewport`);
  if (label.includes('dark')) {
    const corners = await pg.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => {
      const src = document.querySelector('.stage canvas');
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const at = (x, y) => { const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
      resolve([at(c.width - 5, 5), at(c.width - 5, Math.floor(c.height / 2)), at(5, c.height - 5)]);
    })));
    const [a, b, cc] = corners;
    if (!(a.every((v, i) => v === b[i]) && a.every((v, i) => v === cc[i]))) fail(`${label}: dark background is not a flat colour (sampled ${JSON.stringify(corners)})`);
  }
  reportProblems(pg, label);
}

// The six places in src/places.js's FOCUS order, which is also the keys-1-6 order.
const PLACES = [
  { key: 'uma', name: 'Uma Maheshwar' },
  { key: 'lyaku', name: 'Lyaku Museum' },
  { key: 'bhairab', name: 'Bagh Bhairab' },
  { key: 'pukhu', name: 'Dey Pukhu' },
  { key: 'lohan', name: 'Lohan Dega' },
  { key: 'stupa', name: 'Chilancho' }
];
const panelState = (pg) => pg.evaluate(() => ({
  hidden: document.getElementById('panel')?.hidden !== false,
  name: document.getElementById('panelName')?.textContent || '',
  history: document.getElementById('panelHistory')?.textContent || '',
  look: document.getElementById('panelLook')?.textContent || '',
  photos: document.querySelectorAll('#panelPhotos img').length,
  hash: location.hash
}));

// A trigger (key press, place-bar click or pin click) for all six places, on the already-open
// desktop context (no reload needed): panel opens with the right name, a history, a "what to
// look for" line and two photos, and the hash becomes deep-linkable; then Esc closes it and
// clears the hash.
async function placesByTrigger(pg, label, trigger, shotDir) {
  for (let i = 0; i < PLACES.length; i++) {
    const P = PLACES[i];
    await trigger(pg, P, i);
    await pg.waitForTimeout(350);
    const s = await panelState(pg);
    if (s.hidden) fail(`${label}: did not open the panel for ${P.name}`);
    if (s.name !== P.name) fail(`${label}: panel shows "${s.name}", not "${P.name}"`);
    if (s.history.length < 20) fail(`${label}: (${P.name}) panel has no history text`);
    if (!s.look) fail(`${label}: (${P.name}) panel has no "what to look for" text`);
    if (s.photos !== 2) fail(`${label}: (${P.name}) panel shows ${s.photos} photos, not 2`);
    if (s.hash !== '#place=' + P.key) fail(`${label}: (${P.name}) hash is "${s.hash}", not "#place=${P.key}"`);
    if (shotDir) await pg.screenshot({ path: join(shotDir, `place-${P.key}.png`), timeout: 120000 });
  }
  reportProblems(pg, `${label} places/photos`); // catches any broken (404/failed) photo requests
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(300);
  const s = await panelState(pg);
  if (!s.hidden) fail(`${label}: Esc did not close the panel`);
  if (s.hash !== '') fail(`${label}: Esc did not clear the hash (still "${s.hash}")`);
}
const byKey = (pg, P, i) => pg.keyboard.press(String(i + 1));
const byBar = (pg, P) => pg.click(`#segPlaces button[data-v="${P.key}"]`);
// Pins are anchored to their place in world space, not fixed on screen like the place bar, so a
// pin from a different place can fly off-screen once the camera is close to the previous one;
// go back to the whole island first so all six pins are back in view before clicking the next.
const byPin = async (pg, P) => {
  await pg.click('#btnHome');
  await pg.waitForTimeout(900);
  await pg.click(`.pin[data-v="${P.key}"]`);
};

// #place=<key> deep link: spot-check first and last place for the dedicated on-load
// (instant-snap) code path, separate from the keys-1-6 click-time path above.
async function deepLink(P, label) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  pg.problems = [];
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') pg.problems.push(`console ${m.type()}: ${m.text()}`); });
  pg.on('pageerror', (e) => pg.problems.push(`pageerror: ${e.message}`));
  pg.on('requestfailed', (req) => pg.problems.push(`request failed: ${req.url()} (${req.failure()?.errorText})`));
  pg.on('response', (res) => { if (res.status() >= 400) pg.problems.push(`request ${res.status()}: ${res.url()}`); });
  await pg.goto(`${base}/#place=${P.key}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await pg.waitForFunction(() => document.querySelectorAll('#feed p').length > 0, null, { timeout: 180000 });
  await pg.waitForTimeout(600);
  const s = await panelState(pg);
  if (s.hidden) fail(`${label}: #place=${P.key} did not open the panel on load`);
  if (s.name !== P.name) fail(`${label}: #place=${P.key} panel shows "${s.name}", not "${P.name}"`);
  if (s.photos !== 2) fail(`${label}: #place=${P.key} panel shows ${s.photos} photos, not 2`);
  reportProblems(pg, label);
  await ctx.close();
}

console.log(`site-check: ${base}`);

const desktop = await open({ width: 1440, height: 900 });
await wholeIsland(desktop, 'desktop light');
await desktop.screenshot({ path: join(outDir, 'whole-island-desktop-light.png'), timeout: 120000 });
const ft = await desktop.evaluate(() => new Promise((res) => {
  const d = []; let l = performance.now();
  const f = (t) => { d.push(t - l); l = t; if (d.length < 180) requestAnimationFrame(f); else { d.sort((a, b) => a - b); res(d[90]); } };
  requestAnimationFrame(f);
}));
console.log(`  median frame ${ft.toFixed(1)} ms at 1440x900`);
if (ft > 20) fail(`median frame ${ft.toFixed(1)} ms at 1440x900 (target 16.7)`);

// Map furniture: 6 pins, a north arrow that turns with the view, a scale bar with a non-zero
// width and metre label, a legend, and the compact toolbar's controls all present and visible.
const furniture = await desktop.evaluate(() => ({
  pins: document.querySelectorAll('.pin').length,
  compassBefore: document.getElementById('compassNeedle')?.style.transform || '',
  scaleWidth: parseFloat(document.getElementById('scaleFill')?.style.width || '0'),
  scaleLabel: document.getElementById('scaleLabel')?.textContent || '',
  legendRows: document.querySelectorAll('.legend p').length,
  toolbarBtns: ['btnHome', 'btnWalkthrough', 'btnZoomIn', 'btnZoomOut', 'btnTurnL', 'btnTurnR', 'btnMeasure', 'btnLabels', 'btnThemeUI'].every((id) => {
    const el = document.getElementById(id); if (!el) return false;
    const r = el.getBoundingClientRect(); return r.width * r.height > 0;
  })
}));
if (furniture.pins !== 6) fail(`desktop light: ${furniture.pins} pins on the map, not 6`);
if (!furniture.scaleWidth) fail('desktop light: scale bar has zero width');
if (!/^\d+(\.\d+)? (m|km)$/.test(furniture.scaleLabel)) fail(`desktop light: scale bar label "${furniture.scaleLabel}" is not a metre/km reading`);
if (furniture.legendRows < 5) fail(`desktop light: legend has ${furniture.legendRows} rows, expected 5 (pin, bands, buildings, lanes, water)`);
if (!furniture.toolbarBtns) fail('desktop light: one or more toolbar controls are not visible');
await desktop.click('#btnTurnR');
await desktop.waitForTimeout(800);
const compassAfter = await desktop.evaluate(() => document.getElementById('compassNeedle').style.transform);
if (compassAfter === furniture.compassBefore) fail('desktop light: north arrow did not turn after Turn right');

console.log('  checking triggers (keys, bar, pins)...');
await placesByTrigger(desktop, 'desktop light keys', byKey, outDir);
await placesByTrigger(desktop, 'desktop light place bar', byBar);
await placesByTrigger(desktop, 'desktop light pins', byPin);

console.log('  checking walkthrough with chilancho...');
await desktop.click('#btnWalkthrough');
await desktop.waitForTimeout(800);
const wtState = await panelState(desktop);
if (wtState.hidden) fail('Walkthrough button did not open place panel');
if (wtState.name !== 'Chilancho') fail(`Walkthrough opened "${wtState.name}", expected "Chilancho"`);
await desktop.keyboard.press('Escape');
await desktop.waitForTimeout(300);

await desktop.context().close();

console.log('  checking deep links...');
await deepLink(PLACES[0], 'deep link uma');
await deepLink(PLACES[PLACES.length - 1], 'deep link stupa');

console.log('  checking dark mode & mobile viewports...');
const desktopDark = await open({ width: 1440, height: 900, colorScheme: 'dark' });
await desktopDark.click('#btnThemeUI');
await desktopDark.waitForTimeout(400);
await wholeIsland(desktopDark, 'desktop dark');
await desktopDark.screenshot({ path: join(outDir, 'whole-island-desktop-dark.png'), timeout: 120000 });
await desktopDark.context().close();

const mobile = await open({ width: 390, height: 844 });
await wholeIsland(mobile, 'mobile light');
await mobile.screenshot({ path: join(outDir, 'whole-island-mobile-light.png'), timeout: 120000 });
await mobile.context().close();

const mobileDark = await open({ width: 390, height: 844, colorScheme: 'dark' });
await mobileDark.click('#btnThemeUI');
await mobileDark.waitForTimeout(400);
await wholeIsland(mobileDark, 'mobile dark');
await mobileDark.screenshot({ path: join(outDir, 'whole-island-mobile-dark.png'), timeout: 120000 });
await mobileDark.context().close();

const reduced = await open({ reducedMotion: 'reduce' });
await reduced.waitForTimeout(1200);
reportProblems(reduced, 'reduced motion');
await reduced.context().close();

// Clouds, static check: the built page is one inlined script; a regression that brings
// clouds back would reintroduce this telltale identifier from src/terrain.js.
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
if (html.includes('cloudMat') || html.includes('Clouds drifting')) fail('clouds are back in the built page');

await browser.close();
server.close();
console.log(`total time ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(failures.length ? `FAILED (${failures.length})` : 'OK');
process.exit(failures.length ? 1 : 0);
