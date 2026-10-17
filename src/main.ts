import L from 'leaflet';
import { MappingEditor } from './editor';
import { getMapping } from './entities';
import { createIcons, ImagePlus, FolderOpen, Package, CircleHelp, Flag, Scan, Eye, EyeOff, Map, Upload, Download, Minus, Plus, X, ArrowUpRight, Sun, Moon } from 'lucide';
const icons = { ImagePlus, FolderOpen, Package, CircleHelp, Flag, Scan, Eye, EyeOff, Map, Upload, Download, Minus, Plus, X, ArrowUpRight, Sun, Moon };
import 'leaflet/dist/leaflet.css';
import './style.css';
import { validateFile, validateDimensions, validateRaster } from './image';
import { newProject, readProject, writeProject, type Project, type JsonObject } from './project';
const icon = (name: string, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="topbar">
  <a class="brand" href="./" aria-label="WicsoX home"><span class="brand-mark">W</span><span class="brand-name">Wicso<em>X</em></span></a>
  <button id="edit-project" class="project" disabled title="Edit project name and notes">
    <span id="project-title">Untitled world</span>
    <span id="project-subtitle">A new world starts with your map</span>
  </button>
  <div class="topbar-actions">
    <button id="import-top" class="action">${icon('image-plus')}<span>Import</span></button>
    <button id="open-project" class="action">${icon('folder-open')}<span>Open</span></button>
    <button id="save-project" class="action primary" disabled>${icon('package')}<span>Save</span></button>
    <span class="topbar-divider"></span>
    <button id="theme-toggle" class="icon" aria-label="Switch colour theme" title="Switch theme">${icon('sun')}</button>
    <button id="guide" class="action">${icon('circle-help')}<span>Quick guide</span></button>
  </div>
</header>
<div class="shell">
  <nav class="rail" aria-label="Map tools">
    <button id="import-tool" class="rail-button" aria-label="Import artwork" title="Import artwork">${icon('image-plus')}</button>
    <button id="fit-tool" class="rail-button" aria-label="Fit map to screen" title="Fit map (F)" disabled>${icon('scan')}</button>
    <span class="rail-divider"></span>
    <button id="visibility" class="rail-button" aria-label="Hide original artwork" title="Toggle artwork" disabled>${icon('eye')}</button>
    <button id="countries" class="rail-button" aria-label="Countries & regions" title="Countries & regions" disabled>${icon('flag')}</button>
    <span class="rail-spacer"></span>
    <a class="rail-button" href="https://github.com/Alextheplayer919/Wicso-X" target="_blank" rel="noopener" aria-label="View project on GitHub" title="GitHub">${icon('arrow-up-right')}</a>
  </nav>
  <main class="canvas-area">
    <div id="map" aria-label="Interactive map canvas" tabindex="0"></div>
    <section class="welcome" id="welcome">
      <h2>Bring your map.</h2>
      <p>A local-first workspace for worlds you draw elsewhere.</p>
      <div class="dropzone" id="dropzone">
        <span class="drop-mark">${icon('map')}</span>
        <h3>Start with your map</h3>
        <button class="button primary" id="import-main">${icon('upload')} Import map image</button>
        <small>PNG · JPG · WEBP — up to 100 MB</small>
      </div>
      <button id="open-welcome" class="link">Open a project ZIP</button>
    </section>
    <aside class="info-card" id="map-info" hidden>
      <div id="details-empty"><h3>No map loaded</h3><p>Import artwork to see its details.</p></div>
      <div id="details-loaded">
        <strong id="file-name"></strong>
        <small id="file-dimensions"></small>
        <dl>
          <div><dt>Dimensions</dt><dd id="detail-size"></dd></div>
          <div><dt>File size</dt><dd id="detail-bytes"></dd></div>
          <div><dt>Format</dt><dd id="detail-format"></dd></div>
          <div><dt>Source</dt><dd>Locked &amp; preserved</dd></div>
        </dl>
        <button class="button" id="download">${icon('download')} Download original</button>
      </div>
    </aside>
    <div class="view-controls">
      <button id="zoom-out" aria-label="Zoom out" disabled>${icon('minus')}</button>
      <span id="zoom-level">—</span>
      <button id="zoom-in" aria-label="Zoom in" disabled>${icon('plus')}</button>
      <span class="control-divider"></span>
      <button id="fit" aria-label="Fit map" title="Fit to screen (F)" disabled>${icon('scan')}</button>
      <button id="actual" aria-label="Original scale" title="Original scale (1)" disabled>1:1</button>
    </div>
    <div id="drop-overlay" hidden><span>${icon('image-plus')}</span><h2>Drop your map to import</h2><p>Original artwork stays untouched</p></div>
  </main>
</div>
<footer>
  <span class="footer-left"><i class="status-dot"></i><span id="status" role="status">Ready to import your map</span><b>·</b><span id="canvas-name">No map loaded</span></span>
  <span class="footer-right"><span class="hints">Drag to pan <b>·</b> Scroll to zoom <b>·</b> <kbd>F</kbd> fit</span><button id="milestones" class="link">Roadmap</button><span class="footer-version">v0.4.0</span></span>
</footer>
<input id="project-input" type="file" accept=".zip" hidden><input id="file-input" type="file" accept=".png,.jpg,.jpeg,.webp" hidden><dialog id="dialog"><button class="dialog-close icon-button" aria-label="Close dialog">${icon('x')}</button><span class="eyebrow">WICSOX</span><h2 id="dialog-title"></h2><div id="dialog-body"></div><button class="button primary dialog-done">Got it</button></dialog><div id="toast" role="alert" hidden></div>`;
createIcons({ icons });
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };
let theme: 'dark' | 'light' = store.get('wicsox-theme') === 'light' ? 'light' : store.get('wicsox-theme') === 'dark' ? 'dark' : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
function applyTheme(next: 'dark' | 'light') {
  theme = next; document.documentElement.dataset.theme = next;
  $('theme-toggle').innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
  $('theme-toggle').setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  createIcons({ icons });
}
applyTheme(theme);
$('theme-toggle').onclick = () => { applyTheme(theme === 'dark' ? 'light' : 'dark'); store.set('wicsox-theme', theme); };
const map = L.map('map', { crs: L.CRS.Simple, zoomControl: false, attributionControl: false, minZoom: -8, maxZoom: 4, zoomSnap: 0, zoomDelta: .5 }).setView([0, 0], 0);
let current: { file: File; url: string; width: number; height: number; overlay: L.ImageOverlay; bounds: L.LatLngBounds } | undefined;
let project: Project | undefined;
let dirty = false;
let loading = false;
let shown = true;
const editor = new MappingEditor(map, () => project, () => { dirty = true; updateSavedLabel(); }, () => loading);
const dialog = $('dialog') as HTMLDialogElement;
function info(title: string, body: string) { $('dialog-title').textContent = title; $('dialog-body').innerHTML = body; if (!dialog.open) dialog.showModal(); }
$('guide').onclick = () => info('WicsoX in one minute', '<p>Import a PNG, JPEG, or WebP you created elsewhere. Drag with your mouse or one finger to pan; scroll or pinch to zoom.</p><p>The left rail holds import, fit, artwork visibility and <b>Countries &amp; regions</b>. Use <b>F</b> to fit the map, <b>1</b> for original scale, and <b>+</b> / <b>−</b> to zoom.</p><p>Use <b>Save</b> to download a complete portable project ZIP; <b>Open</b> restores artwork, name, notes, visibility and view. Browser memory is temporary, not an autosave: before replacing a loaded project a backup ZIP is downloaded. <b>Trace territory</b> places at least three points, then <b>Finish trace</b>; <b>Edit boundary</b> lets you drag, insert or remove vertices. Undo/redo covers mapping edits in this session.</p>');
const roadmap = () => info('Roadmap', '<ol class="roadmap-list"><li><b>01 · Foundation — available now</b><br>Local image import, zoom, pan, and original artwork preservation.</li><li><b>02 · Portable projects — available now</b><br>Validated ZIP import/export and data-integrity tests.</li><li><b>03 · Territories & dossiers — tracing available</b><br>Trace boundaries, assign countries, and keep dossiers.</li><li><b>04–05 · War room & infrastructure</b><br>Independent front lines, markers, and connected networks.</li><li><b>06–07 · History & mobile</b><br>Snapshots, recovery, deployment verification, and Android packaging.</li></ol><p>Split/merge, multipolygon holes, nested subdivisions, military and infrastructure editors, browser autosave and an Android build are not implemented yet. Download a ZIP to keep your work.</p>');
$('milestones').onclick = roadmap;
document.querySelectorAll<HTMLButtonElement>('.dialog-close,.dialog-done').forEach(b => b.onclick = () => dialog.close());
const input = $('file-input') as HTMLInputElement;
for (const id of ['import-top', 'import-main', 'import-tool']) $(id).onclick = () => input.click();
let toastTimer: ReturnType<typeof setTimeout>;
function notify(text: string) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 7000); }
function fit() { if (current) { map.fitBounds(current.bounds, { padding: [24, 24], animate: false }); updateZoomLabel(); } }
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function captureProject() {
  if (!project) throw new Error('Import a map or open a project first.');
  if (editor.hasDraft) throw new Error('Finish or cancel your boundary before saving the project.');
  const center = map.getCenter();
  project.world.view = { ...((project.world.view as JsonObject) || {}), center: [center.lat, center.lng], zoom: map.getZoom() };
  project.world.layers = { ...((project.world.layers as JsonObject) || {}), artwork: shown };
  return project;
}
function projectFilename(backup = false) {
  return `${(project?.manifest.name || 'WicsoX_World').replace(/[^a-zA-Z0-9 _-]/g, '_').slice(0,80)}${backup ? '-backup-' + Date.now() : ''}.zip`;
}
function updateSavedLabel() { $('project-subtitle').textContent = dirty ? 'Unsaved changes · download a ZIP to keep' : 'ZIP saved/opened · browser memory is temporary'; }
async function backupBeforeReplace() {
  if (!current) return true;
  if (!confirm('Replace the current project? A backup ZIP will download first. Check that your browser saves it before closing this workspace.')) return false;
  const backup = await writeProject(captureProject());
  downloadBlob(backup, projectFilename(true)); return true;
}
async function showProject(next: Project, file: File, url: string, width: number, height: number, fromZip: boolean) {
  if (!await backupBeforeReplace()) { URL.revokeObjectURL(url); $('status').textContent = 'Replacement cancelled · previous project kept'; return; }
  const bounds = L.latLngBounds([0, 0], [height, width]);
  const overlay = L.imageOverlay(url, bounds, { interactive: false, alt: file.name }).addTo(map);
  if (current) { current.overlay.remove(); URL.revokeObjectURL(current.url); }
  current = { file, url, width, height, bounds, overlay }; project = next;
  shown = (next.world.layers as JsonObject | undefined)?.artwork !== false;
  overlay.setOpacity(shown ? 1 : 0);
  $('welcome').hidden = true; $('map-info').hidden = false; $('details-empty').hidden = true; $('details-loaded').hidden = false;
  $('project-title').textContent = next.manifest.name;
  $('canvas-name').textContent = file.name; $('file-name').textContent = file.name;
  $('file-dimensions').textContent = `${width.toLocaleString()} × ${height.toLocaleString()} px · locked background`;
  $('detail-size').textContent = `${width.toLocaleString()} × ${height.toLocaleString()} px`;
  $('detail-bytes').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  $('detail-format').textContent = file.name.split('.').pop()!.toUpperCase();
  for (const id of ['visibility','fit','fit-tool','actual','zoom-in','zoom-out','save-project','edit-project']) ($(id) as HTMLButtonElement).disabled = false;
  updateVisibility();
  const view = next.world.view as { center: [number, number]; zoom: number } | undefined;
  if (view) map.setView(view.center, view.zoom, { animate: false }); else fit();
  editor.reset();
  dirty = !fromZip; updateSavedLabel();
  updateZoomLabel();
  $('status').textContent = fromZip ? 'Project opened · artwork and data restored' : 'Map loaded · original artwork preserved';
  if (fromZip) notify('Project restored, including supported territories and dossiers. Legacy or unrecognized entity data is retained unchanged, not rendered.');
}
async function importFile(file: File) {
  if (loading) return;
  if (editor.hasDraft) { notify('Finish or cancel your boundary before replacing the project.'); input.value = ''; return; }
  loading = true; $('status').textContent = 'Opening artwork…';
  let url: string | undefined;
  try {
    const fromZip = /\.zip$/i.test(file.name);
    let next: Project | undefined;
    if (fromZip) {
      next = await readProject(file);
      const checkedFlags = new Set<string>();
      for (const country of getMapping(next).countries) {
        if (!country.flag || checkedFlags.has(country.flag)) continue;
        checkedFlags.add(country.flag);
        const flagUrl = URL.createObjectURL(next.extras.get(country.flag)!);
        try {
          const flagImage = new window.Image(); flagImage.src = flagUrl;
          await flagImage.decode();
          if (flagImage.naturalWidth * flagImage.naturalHeight > 4_000_000) throw new Error('Country flag exceeds the 4-megapixel limit.');
        } finally { URL.revokeObjectURL(flagUrl); }
      }
      file = new File([next.artwork], next.manifest.artwork.name, { type: next.manifest.artwork.mime });
    } else {
      validateFile(file);
      if (file.size > 25 * 1024 * 1024 && !confirm('Large images may use significant memory, especially on mobile. Continue importing?')) return;
    }
    await validateRaster(file, file.name);
    url = URL.createObjectURL(file);
    const image = new window.Image(); image.src = url;
    try { await image.decode(); } catch { throw new Error('Could not open this image. Choose an intact PNG, JPEG, or WebP file.'); }
    const width = image.naturalWidth, height = image.naturalHeight;
    validateDimensions(width, height);
    if (next && (next.manifest.artwork.width !== width || next.manifest.artwork.height !== height)) throw new Error('Artwork dimensions do not match the project manifest.');
    next ??= await newProject(file, width, height);
    await showProject(next, file, url, width, height, fromZip);
  } catch (e) {
    if (url) URL.revokeObjectURL(url);
    notify((e as Error).message || 'Could not open this project.');
    $('status').textContent = current ? 'Previous project preserved' : 'Ready to import your map';
  } finally { if ($('status').textContent === 'Opening artwork…') $('status').textContent = current ? 'Previous project kept' : 'Ready to import your map'; loading = false; input.value = ''; ($('project-input') as HTMLInputElement).value = ''; }
}
$('save-project').onclick = async () => {
  if (loading || !project) return;
  loading = true; $('status').textContent = 'Preparing portable project…';
  try {
    project.manifest.updatedAt = new Date().toISOString();
    const data = captureProject();
    const savedWorld = JSON.stringify(data.world);
    const blob = await writeProject(data);
    downloadBlob(blob, projectFilename()); dirty = JSON.stringify(captureProject().world) !== savedWorld; updateSavedLabel();
    $('status').textContent = 'ZIP download requested · check your downloads';
    notify('Your complete project ZIP is ready. Keep it somewhere safe; browser memory is temporary.');
  } catch(e) { notify(`Could not save project: ${(e as Error).message}`); }
  finally { loading = false; }
};
const projectInput = $('project-input') as HTMLInputElement;
$('open-project').onclick = $('open-welcome').onclick = () => projectInput.click();
projectInput.onchange = () => { if (projectInput.files?.[0]) void importFile(projectInput.files[0]); };
$('edit-project').onclick = () => {
  if (!project || loading) return;
  info('Project details', '<form id="project-form"><label for="world-name">World name</label><input id="world-name" maxlength="200" required><label for="world-notes">Project notes</label><textarea id="world-notes" maxlength="100000" rows="7"></textarea><p>Saved in your project ZIP. No account or cloud storage required.</p><button class="button primary" type="submit">Apply changes</button></form>');
  ($('world-name') as HTMLInputElement).value = project.manifest.name;
  ($('world-notes') as HTMLTextAreaElement).value = (project.world.notes as string) || '';
  $('project-form').onsubmit = e => {
    e.preventDefault(); const name = ($('world-name') as HTMLInputElement).value.trim(); if (!name) return;
    project!.manifest.name = name; project!.world.notes = ($('world-notes') as HTMLTextAreaElement).value;
    $('project-title').textContent = name; dirty = true; updateSavedLabel(); dialog.close();
  };
};
input.onchange = () => { if (input.files?.[0]) void importFile(input.files[0]); };
$('download').onclick = () => { if (!current) return; const a = document.createElement('a'); a.href = current.url; a.download = current.file.name; a.click(); };
function updateVisibility() { $('visibility').innerHTML = icon(shown ? 'eye' : 'eye-off'); $('visibility').setAttribute('aria-label', shown ? 'Hide original artwork' : 'Show original artwork'); createIcons({ icons }); }
$('visibility').onclick = () => { if (!current) return; shown = !shown; current.overlay.setOpacity(shown ? 1 : 0); updateVisibility(); dirty = true; updateSavedLabel(); };
function updateZoomLabel() { if (current) $('zoom-level').textContent = `${Math.round(2 ** map.getZoom() * 100)}%`; }
function actualSize() { if (current) { map.setZoom(0, { animate: false }); updateZoomLabel(); } }
$('fit').onclick = fit; $('fit-tool').onclick = fit;
$('actual').onclick = actualSize;
$('zoom-in').onclick = () => map.zoomIn(.5); $('zoom-out').onclick = () => map.zoomOut(.5);
map.on('moveend', () => { if (project && !loading) { dirty = true; updateSavedLabel(); } });
map.on('zoom zoomend', updateZoomLabel);
new ResizeObserver(() => map.invalidateSize()).observe($('map'));
document.addEventListener('keydown', e => { if (dialog.open || /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName) || e.ctrlKey || e.metaKey || e.altKey || !current) return; if (e.key.toLowerCase() === 'f') { e.preventDefault(); fit(); } if (e.key === '1') actualSize(); if (e.key === '+' || e.key === '=') map.zoomIn(.5); if (e.key === '-') map.zoomOut(.5); });
let dragDepth = 0;
document.addEventListener('dragenter', e => { if (!e.dataTransfer?.types.includes('Files')) return; e.preventDefault(); dragDepth++; $('drop-overlay').hidden = false; });
document.addEventListener('dragover', e => { e.preventDefault(); });
document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('drop-overlay').hidden = true; } });
document.addEventListener('drop', e => { e.preventDefault(); dragDepth = 0; $('drop-overlay').hidden = true; if (e.dataTransfer?.files.length !== 1) return notify('Please import one map image at a time.'); void importFile(e.dataTransfer.files[0]); });
window.addEventListener('beforeunload', e => { if (dirty || editor.hasPendingChanges) { e.preventDefault(); e.returnValue = ''; } });
