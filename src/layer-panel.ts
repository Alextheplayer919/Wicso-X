import { createInitialLayerStack, validateLayerStack, type LayerStack, type EditorLayer } from './layers';

const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export class LayerPanel {
  private stack?: LayerStack;
  private root: HTMLElement;
  constructor(root: HTMLElement, private changed: (stack: LayerStack) => void) {
    this.root = root;
    this.root.innerHTML = `
      <div class="layer-panel-head"><strong>Layers</strong><button type="button" data-action="close" aria-label="Close layers">×</button></div>
      <p class="layer-panel-hint">Top layers appear above the artwork.</p>
      <div class="layer-list" role="list"></div>
      <div class="layer-panel-actions"><button type="button" data-action="add-paint">＋ Paint layer</button><button type="button" data-action="add-vector">＋ Map layer</button></div>`;
    this.root.addEventListener('click', e => this.handleClick(e));
  }
  open() { this.root.hidden = false; this.render(); }
  close() { this.root.hidden = true; }
  toggle() { this.root.hidden ? this.open() : this.close(); }
  setForImage(sourcePath: string, saved?: unknown) {
    if (saved) {
      try { validateLayerStack(saved); this.stack = structuredClone(saved); }
      catch { this.stack = createInitialLayerStack(sourcePath); }
    } else this.stack = createInitialLayerStack(sourcePath);
    this.changed(this.stack);
    this.render();
  }
  getStack() { return this.stack ? structuredClone(this.stack) : undefined; }
  private commit() { if (!this.stack) return; this.changed(this.stack); this.render(); }
  private render() {
    const list = this.root.querySelector<HTMLElement>('.layer-list')!;
    if (!this.stack) { list.innerHTML = '<p class="layer-empty">Import a map to create its layer stack.</p>'; return; }
    list.innerHTML = this.stack.layers.slice().reverse().map((layer, index) => `
      <div class="layer-row ${layer.id === this.stack!.activeLayerId ? 'active' : ''}" role="listitem" data-id="${esc(layer.id)}">
        <button type="button" class="layer-select" data-action="select" data-id="${esc(layer.id)}" aria-pressed="${layer.id === this.stack.activeLayerId}">
          <span class="layer-kind">${layer.kind === 'source-image' ? '▧' : layer.kind === 'paint' ? '◩' : layer.kind === 'vector' ? '⬡' : layer.kind === 'operations' ? '⌁' : '↗'}</span>
          <span class="layer-name">${esc(layer.name)}</span>
        </button>
        <button type="button" data-action="visibility" data-id="${esc(layer.id)}" aria-label="${layer.visible ? 'Hide' : 'Show'} ${esc(layer.name)}">${layer.visible ? '◉' : '○'}</button>
        <button type="button" data-action="lock" data-id="${esc(layer.id)}" aria-label="${layer.locked ? 'Unlock' : 'Lock'} ${esc(layer.name)}">${layer.locked ? '▣' : '□'}</button>
        <button type="button" data-action="up" data-id="${esc(layer.id)}" aria-label="Move ${esc(layer.name)} up" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" data-action="down" data-id="${esc(layer.id)}" aria-label="Move ${esc(layer.name)} down" ${index === this.stack.layers.length - 1 ? 'disabled' : ''}>↓</button>
      </div>`).join('');
  }
  private handleClick(event: Event) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!button) return;
    const action = button.dataset.action!;
    if (action === 'close') { this.close(); return; }
    if (!this.stack) return;
    const id = button.dataset.id;
    const index = this.stack.layers.findIndex(layer => layer.id === id);
    if (action === 'add-paint' || action === 'add-vector') {
      const kind = action === 'add-paint' ? 'paint' : 'vector';
      const nextId = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
      const layer: EditorLayer = kind === 'paint'
        ? { id: nextId, name: 'Paint layer', kind: 'paint', visible: true, locked: false, opacity: 1 }
        : { id: nextId, name: 'Map layer', kind: 'vector', visible: true, locked: false, opacity: 1 };
      this.stack.layers.push(layer); this.stack.activeLayerId = nextId; this.commit(); return;
    }
    if (index < 0) return;
    const layer = this.stack.layers[index];
    if (action === 'select') { if (!layer.locked) this.stack.activeLayerId = layer.id; }
    if (action === 'visibility') layer.visible = !layer.visible;
    if (action === 'lock') layer.locked = !layer.locked;
    if (action === 'up' && index < this.stack.layers.length - 1) [this.stack.layers[index + 1], this.stack.layers[index]] = [this.stack.layers[index], this.stack.layers[index + 1]];
    if (action === 'down' && index > 0) [this.stack.layers[index - 1], this.stack.layers[index]] = [this.stack.layers[index], this.stack.layers[index - 1]];
    this.commit();
  }
}
