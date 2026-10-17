import L from 'leaflet';
import { MappingEditor } from './editor';
import { getMapping } from './entities';
import { createIcons, Orbit, ShieldCheck, CircleHelp, FolderOpen, ImagePlus, Package, Map, Flag, Swords, Route, History, Image, Eye, LockKeyhole, Sprout, ArrowUpRight, Hand, Scan, Upload, ArrowRight, Minus, Plus, SlidersHorizontal, Layers2, Download, Lightbulb, Mouse, X, Check, EyeOff } from 'lucide';
const icons = { Orbit, ShieldCheck, CircleHelp, FolderOpen, ImagePlus, Package, Map, Flag, Swords, Route, History, Image, Eye, LockKeyhole, Sprout, ArrowUpRight, Hand, Scan, Upload, ArrowRight, Minus, Plus, SlidersHorizontal, Layers2, Download, Lightbulb, Mouse, X, Check, EyeOff };
import 'leaflet/dist/leaflet.css';
import './style.css';
import { validateFile, validateDimensions, validateRaster } from './image';
import { newProject, readProject, writeProject, type Project, type JsonObject } from './project';
const icon = (name: string, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="topbar"><a class="brand" href="./" aria-label="WICSO Mapper home"><span class="brandmark">${icon('orbit')}</span><span>WICSO<span class="brand-light"> MAPPER</span></span><span class="beta">ALPHA</span></a><div class="header-right"><span class="private">${icon('shield-check')} Local-first. Yours to keep.</span><button id="guide" class="quiet">${icon('circle-help')} <span>Quick guide</span></button><span class="avatar">W</span></div></header>
<div class="projectbar"><div class="project-name">${icon('folder-open')}<div><h1 id="project-title">Untitled world</h1><span id="project-subtitle">A new world starts with your map</span></div><button class="session" id="edit-project" disabled title="Edit project name and notes">PROJECT DETAILS</button></div><div class="project-actions"><button id="import-top" class="button">${icon('image-plus')} Import map</button><button id="open-project" class="button">${icon('folder-open')} Open ZIP</button><button id="save-project" class="button primary" disabled>${icon('package')} Save ZIP</button></div></div>
<div class="workspace"><aside class="sidebar"><div class="side-heading"><span>WORKSPACE</span><span class="version">01</span></div><button class="nav-item active">${icon('map')} Map canvas <span class="nav-dot"></span></button><button class="nav-item" id="countries" disabled>${icon('flag')} Countries & regions</button><button class="nav-item future" data-feature="Military mapping">${icon('swords')} War room <span class="soon">SOON</span></button><button class="nav-item future" data-feature="Infrastructure networks">${icon('route')} Infrastructure <span class="soon">SOON</span></button><button class="nav-item future" data-feature="Historical snapshots">${icon('history')} Timeline <span class="soon">SOON</span></button>
<div class="layers-title"><h2>Layers</h2><span class="count">1</span></div><div class="layer"><span class="layer-icon">${icon('image')}</span><div><strong>Original artwork</strong><small>Locked background</small></div><button id="visibility" class="icon-button" aria-label="Hide original artwork" disabled>${icon('eye')}</button>${icon('lock-keyhole','lock')}</div><p class="layer-note">Your original map is never modified.</p><div class="sidebar-bottom"><div class="foundation">${icon('sprout')} <span>Built for your worlds.</span></div><p>No accounts. No cloud required.<br>Just your maps, on your device.</p><a href="https://github.com/Alextheplayer919/Wicso-X" target="_blank" rel="noopener">View project on GitHub ${icon('arrow-up-right')}</a></div></aside>
<main class="canvas-area"><div class="canvas-top"><div><span class="canvas-label">MAP CANVAS</span><span class="separator">/</span><span id="canvas-name">No map loaded</span></div><span class="artwork-badge">${icon('lock-keyhole')} Non-destructive workspace</span></div><div id="map" aria-label="Interactive map canvas" tabindex="0"></div><div class="canvas-grain"></div>
<div class="tools" aria-label="Map tools"><button class="tool selected" id="pan" aria-label="Pan map" title="Pan map">${icon('hand')}</button><div class="tool-divider"></div><button class="tool" id="import-tool" aria-label="Import artwork" title="Import artwork">${icon('image-plus')}</button><button class="tool" id="fit-tool" aria-label="Fit map to screen" title="Fit map (F)" disabled>${icon('scan')}</button></div>
<section class="welcome" id="welcome"><div class="eyebrow"><span></span> YOUR WORLD. YOUR STORY.</div><h2>A place for worlds<br>worth <em>documenting.</em></h2><p>Bring your map. Build its story.<br>A local-first workspace for fictional worlds,<br>alternate histories, and everything in between.</p><div class="dropzone" id="dropzone"><div class="upload-symbol">${icon('map')}</div><h3>Start with your map</h3><p>Drop your artwork here, or choose a file</p><button class="button primary" id="import-main">${icon('upload')} Import map image ${icon('arrow-right')}</button><span class="file-types">PNG, JPG, WEBP <span>·</span> Up to 100 MB</span></div><button id="open-welcome" class="open-welcome">Already have a world? Open a project ZIP ${icon('arrow-right')}</button><div class="welcome-foot">${icon('shield-check')} Your files stay on your device. Always.</div></section>
<div class="map-info" id="map-info" hidden><span class="info-icon">${icon('image')}</span><div><strong id="file-name"></strong><small id="file-dimensions"></small></div><span class="original-tag">ORIGINAL</span></div><div class="view-controls"><button id="zoom-out" aria-label="Zoom out" disabled>${icon('minus')}</button><span id="zoom-level">—</span><button id="zoom-in" aria-label="Zoom in" disabled>${icon('plus')}</button><span class="control-divider"></span><button id="fit" aria-label="Fit map" title="Fit to screen (F)" disabled>${icon('scan')}</button><button id="actual" aria-label="Original scale" title="Original scale (1)" disabled>1:1</button></div><div id="drop-overlay" hidden>${icon('image-plus')}<h2>Drop your map to import</h2><p>Original artwork stays untouched</p></div>
</main><aside class="inspector"><div class="side-heading"><span>MAP DETAILS</span>${icon('sliders-horizontal')}</div><div class="inspector-empty" id="details-empty"><span class="details-illustration">${icon('layers-2')}</span><h3>A foundation for your world</h3><p>Import your artwork to see its<br>details and get started.</p></div><div id="details-loaded" hidden><div class="loaded-preview">${icon('image')}</div><h3>Original artwork</h3><dl><dt>Dimensions</dt><dd id="detail-size"></dd><dt>File size</dt><dd id="detail-bytes"></dd><dt>Format</dt><dd id="detail-format"></dd><dt>Background</dt><dd>Locked & preserved</dd></dl><button class="button" id="download">${icon('download')} Download original</button></div><div class="tip"><span>${icon('lightbulb')} A LITTLE GUIDANCE</span><p>Already made a map in ibis Paint or another drawing app? Export it as a PNG and bring it right here.</p></div><div class="next"><span class="tiny-label">THE ROAD AHEAD</span><h3>Every world has layers.</h3><p>Territories, country dossiers, front lines, and history. One foundation at a time.</p><button id="milestones">Explore the roadmap ${icon('arrow-right')}</button></div></aside></div>
<footer><span><i class="status-dot"></i><span id="status" role="status">Ready to import your map</span></span><span class="footer-center">${icon('mouse')} Drag to pan <b>·</b> Scroll to zoom <b>·</b> <kbd>F</kbd> Fit map</span><span>Mapping release <span class="footer-version">v0.3.0</span></span></footer>
<input id="project-input" type="file" accept=".zip" hidden><input id="file-input" type="file" accept=".png,.jpg,.jpeg,.webp" hidden><dialog id="dialog"><button class="dialog-close icon-button" aria-label="Close dialog">${icon('x')}</button><span class="eyebrow">WICSO MAPPER</span><h2 id="dialog-title"></h2><div id="dialog-body"></div><button class="button primary dialog-done">Got it ${icon('check')}</button></dialog><div id="toast" role="alert" hidden></div>`;
createIcons({ icons });
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const map = L.map('map', { crs: L.CRS.Simple, zoomControl: false, attributionControl: false, minZoom: -8, maxZoom: 4, zoomSnap: 0, zoomDelta: .5 }).setView([0, 0], 0);
let current: { file: File; url: string; width: number; height: number; overlay: L.ImageOverlay; bounds: L.LatLngBounds } | undefined;
let project: Project | undefined;
let dirty = false;
let loading = false;
let shown = true;
const editor = new MappingEditor(map, () => project, () => { dirty = true; updateSavedLabel(); }, () => loading);
const dialog = $('dialog') as HTMLDialogElement;
function info(title: string, body: string) { $('dialog-title').textContent = title; $('dialog-body').innerHTML = body; if (!dialog.open) dialog.showModal(); }
$('guide').onclick = () => info('Your map. A fresh perspective.', '<p>Import a PNG, JPEG, or WebP you created elsewhere. Drag with your mouse or one finger to pan; scroll or pinch to zoom.</p><p>Use <b>F</b> to fit the full map, <b>1</b> for original scale, and <b>+</b> / <b>−</b> to zoom. The eye in Layers hides or shows the artwork.</p><p>Use Save ZIP to download a complete portable project. Open that ZIP to restore artwork, project name, notes, visibility, and view. Browser memory is temporary, not an autosave. Before replacing a loaded project, a backup ZIP is downloaded. Use Trace territory to place at least three points, then Finish trace. Countries & regions opens dossiers and territory records. Edit boundary lets you drag vertices or insert/remove points. Undo/redo covers mapping edits in this session; save a ZIP to keep them.</p>');
const roadmap = () => info('A reliable foundation, first.', '<ol class="roadmap-list"><li><b>01 · Foundation — available now</b><br>Local image import, zoom, pan, and original artwork preservation.</li><li><b>02 · Portable projects — available now</b><br>Validated ZIP import/export and data-integrity tests.</li><li><b>03 · Territories & profiles — tracing & dossiers available</b><br>Trace boundaries, assign countries, and create dossiers.</li><li><b>04–05 · War & infrastructure</b><br>Independent front lines, markers, and connected networks.</li><li><b>06–07 · History & mobile</b><br>Snapshots, recovery, deployment verification, and Android evaluation.</li></ol><p>Territory tracing, vertex editing, and country dossiers are available. Split/merge tools and browser autosave are not included yet. Download a ZIP to keep your work.</p>');
$('milestones').onclick = roadmap;
document.querySelectorAll<HTMLButtonElement>('.future').forEach(b => b.onclick = () => info(`${b.dataset.feature} is on the roadmap`, '<p>This tool is not available in the foundation release. Start by importing and exploring your original map.</p><p>Portable ZIP saving is available now. Country dossiers and territory tracing are available now. War and infrastructure editors will follow later.</p>'));
document.querySelectorAll<HTMLButtonElement>('.dialog-close,.dialog-done').forEach(b => b.onclick = () => dialog.close());
const input = $('file-input') as HTMLInputElement;
for (const id of ['import-top', 'import-main', 'import-tool']) $(id).onclick = () => input.click();
let toastTimer: ReturnType<typeof setTimeout>;
function notify(text: string) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 7000); }
function fit() { if (current) map.fitBounds(current.bounds, { padding: [45, 45], animate: false }); }
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
  return `${(project?.manifest.name || 'WICSO_World').replace(/[^a-zA-Z0-9 _-]/g, '_').slice(0,80)}${backup ? '-backup-' + Date.now() : ''}.zip`;
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
  $('file-dimensions').textContent = `${width.toLocaleString()} × ${height.toLocaleString()} px · Locked background`;
  $('detail-size').textContent = `${width.toLocaleString()} × ${height.toLocaleString()} px`;
  $('detail-bytes').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  $('detail-format').textContent = file.name.split('.').pop()!.toUpperCase();
  for (const id of ['visibility','fit','fit-tool','actual','zoom-in','zoom-out','save-project','edit-project']) ($(id) as HTMLButtonElement).disabled = false;
  updateVisibility();
  const view = next.world.view as { center: [number, number]; zoom: number } | undefined;
  if (view) map.setView(view.center, view.zoom, { animate: false }); else fit();
  editor.reset();
  dirty = !fromZip; updateSavedLabel();
  $('zoom-level').textContent = `${Math.round(2 ** map.getZoom() * 100)}%`;
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
$('fit').onclick = fit; $('fit-tool').onclick = fit;
$('actual').onclick = () => { if (current) map.setZoom(0); };
$('zoom-in').onclick = () => map.zoomIn(.5); $('zoom-out').onclick = () => map.zoomOut(.5);
map.on('moveend', () => { if (project && !loading) { dirty = true; updateSavedLabel(); } });
map.on('zoomend', () => { if (current) $('zoom-level').textContent = `${Math.round(2 ** map.getZoom() * 100)}%`; });
$('pan').onclick = () => { $('map').focus(); notify('Drag to pan. Scroll or pinch to zoom.'); };
new ResizeObserver(() => map.invalidateSize()).observe($('map'));
document.addEventListener('keydown', e => { if (dialog.open || /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName) || e.ctrlKey || e.metaKey || e.altKey || !current) return; if (e.key.toLowerCase() === 'f') { e.preventDefault(); fit(); } if (e.key === '1') map.setZoom(0); if (e.key === '+' || e.key === '=') map.zoomIn(.5); if (e.key === '-') map.zoomOut(.5); });
let dragDepth = 0;
document.addEventListener('dragenter', e => { if (!e.dataTransfer?.types.includes('Files')) return; e.preventDefault(); dragDepth++; $('drop-overlay').hidden = false; });
document.addEventListener('dragover', e => { e.preventDefault(); });
document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('drop-overlay').hidden = true; } });
document.addEventListener('drop', e => { e.preventDefault(); dragDepth = 0; $('drop-overlay').hidden = true; if (e.dataTransfer?.files.length !== 1) return notify('Please import one map image at a time.'); void importFile(e.dataTransfer.files[0]); });
window.addEventListener('beforeunload', e => { if (dirty || editor.hasPendingChanges) { e.preventDefault(); e.returnValue = ''; } });
