/* ------------------------------------------------------------------ */
/* Place detail panel: name, sourced history, what to look for, two    */
/* credited photos, previous/next place (src/places.js's FOCUS order). */
/* Opened/closed from hud.js's actOn('site', ...)/goHome(). Content is */
/* fixed per place (no user input), so it is written with textContent  */
/* rather than templated HTML.                                         */
/* ------------------------------------------------------------------ */
const panel = $('panel');
const panelName = $('panelName');
const panelBadge = $('panelBadge');
const panelHistory = $('panelHistory');
const panelLook = $('panelLook');
const panelPhotos = $('panelPhotos');
const panelToggle = $('panelToggle');
const mobileMQ = window.matchMedia('(max-width: 600px)');
let panelReturnFocus = null;

function setPanelCollapsed(collapsed) {
  const on = Boolean(collapsed) && mobileMQ.matches;
  panel.classList.toggle('collapsed', on);
  panelToggle.setAttribute('aria-expanded', String(!on));
  panelToggle.setAttribute('aria-label', on ? 'Expand place description' : 'Collapse place description');
}

function syncToolbarClear() {
  const tb = document.querySelector('.map-toolbar');
  if (!tb) return;
  const sr = stageEl.getBoundingClientRect(), tr = tb.getBoundingClientRect();
  if (tr.height > 0) stageEl.style.setProperty('--toolbar-clear', `${Math.ceil(sr.bottom - tr.top + 8)}px`);
}
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(syncToolbarClear);
  ro.observe(stageEl);
  const tb = document.querySelector('.map-toolbar');
  if (tb) ro.observe(tb);
}
window.addEventListener('resize', syncToolbarClear);
syncToolbarClear();
mobileMQ.addEventListener?.('change', () => { if (!mobileMQ.matches) setPanelCollapsed(false); });

function panelPhoto(P, key) {
  const fig = document.createElement('figure');
  fig.className = 'panel-photo';
  const img = document.createElement('img');
  img.src = `img/${key}/${P.file}`; img.alt = P.alt; img.loading = 'lazy';
  const cap = document.createElement('figcaption');
  cap.textContent = `${P.author}, ${P.date}, ${P.licence}. `;
  const a = document.createElement('a');
  a.href = P.source; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Source';
  cap.appendChild(a);
  fig.append(img, cap);
  return fig;
}
function openPlacePanel(F_) {
  if (panel.hidden) panelReturnFocus = document.activeElement;
  panel.dataset.key = F_.key;
  panelName.textContent = F_.name;
  const idx = FOCUS.findIndex((f) => f.key === F_.key);
  panelBadge.textContent = `Walkthrough · ${idx + 1} of ${FOCUS.length}`;
  panelHistory.textContent = F_.history;
  panelLook.textContent = F_.text;
  panelPhotos.replaceChildren(...F_.photos.map((P) => panelPhoto(P, F_.key)));
  setPanelCollapsed(false);
  panel.hidden = false;
  syncToolbarClear();
  panel.focus(); // decision 8: the panel always takes focus on open, reduced motion only skips the fly animation
}
function closePlacePanel() {
  if (panel.hidden) return;
  setPanelCollapsed(false);
  panel.hidden = true;
  if (panelReturnFocus && panelReturnFocus.isConnected) panelReturnFocus.focus();
  panelReturnFocus = null;
}
function panelStep(delta) {
  const i = FOCUS.findIndex((F_) => F_.key === panel.dataset.key);
  actOn('site', FOCUS[(i + delta + FOCUS.length) % FOCUS.length]);
}
panelToggle.addEventListener('click', () => setPanelCollapsed(!panel.classList.contains('collapsed')));
$('panelTitleWrap').addEventListener('click', () => { if (mobileMQ.matches) setPanelCollapsed(!panel.classList.contains('collapsed')); });
$('panelClose').addEventListener('click', goHome);
$('panelPrev').addEventListener('click', () => panelStep(-1));
$('panelNext').addEventListener('click', () => panelStep(1));
