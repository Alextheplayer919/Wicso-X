import type { JsonObject, Project } from './project';

export type LayerKind = 'source-image' | 'paint' | 'vector' | 'operations' | 'infrastructure' | 'geographic-reference';
export type CoordinateSpace = 'image-pixels' | 'geographic';

export interface LayerBase extends JsonObject {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  locked: boolean;
  opacity: number;
}
export interface RasterLayer extends LayerBase {
  kind: 'source-image' | 'paint' | 'geographic-reference';
  /** A paint layer may have no asset until its first stroke is committed. */
  assetPath?: string;
}
export interface VectorLayer extends LayerBase {
  kind: 'vector' | 'operations' | 'infrastructure';
}
export type EditorLayer = RasterLayer | VectorLayer;
export interface LayerStack extends JsonObject {
  version: 1;
  coordinateSpace: CoordinateSpace;
  activeLayerId: string;
  layers: EditorLayer[];
}

const fail = (message: string): never => { throw new Error(message); };
const idPattern = /^[a-zA-Z0-9_-]{1,100}$/;
const assetPattern = /^(artwork|layers)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp)$/i;

/** Create a non-destructive default stack for an imported image document. */
export function createInitialLayerStack(sourceAssetPath: string): LayerStack {
  if (!assetPattern.test(sourceAssetPath) || sourceAssetPath.split('/').some(p => p === '..' || p === '.')) {
    return fail('The source image path is invalid.');
  }
  return {
    version: 1,
    coordinateSpace: 'image-pixels',
    activeLayerId: 'paint-1',
    layers: [
      { id: 'source-image', name: 'Original artwork', kind: 'source-image', assetPath: sourceAssetPath, visible: true, locked: true, opacity: 1 },
      { id: 'paint-1', name: 'Paint layer 1', kind: 'paint', visible: true, locked: false, opacity: 1 },
      { id: 'countries', name: 'Countries & borders', kind: 'vector', visible: true, locked: false, opacity: 1 },
      { id: 'operations', name: 'Operations', kind: 'operations', visible: true, locked: false, opacity: 1 },
      { id: 'infrastructure', name: 'Infrastructure', kind: 'infrastructure', visible: true, locked: false, opacity: 1 },
    ],
  };
}

export function validateLayerStack(value: unknown, project?: Project): asserts value is LayerStack {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Layer stack must be an object.');
  const stack = value as Record<string, unknown>;
  const coordinateSpace = stack.coordinateSpace;
  const rawLayers = stack.layers;
  if (stack.version !== 1 || !['image-pixels', 'geographic'].includes(String(coordinateSpace))) throw new Error('Unsupported layer stack version or coordinate space.');
  if (!Array.isArray(rawLayers) || rawLayers.length < 1 || rawLayers.length > 128) throw new Error('Layer count must be between 1 and 128.');
  const layers = rawLayers as unknown[];
  const ids = new Set<string>();
  let sourceCount = 0;
  for (const raw of layers) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('Invalid layer record.');
    const layer = raw as Record<string, unknown>;
    const layerId = layer.id;
    if (typeof layerId !== 'string' || !idPattern.test(layerId) || ids.has(layerId)) fail('Layer IDs must be valid and unique.');
    ids.add(layerId);
    if (typeof layer.name !== 'string' || !layer.name.trim() || layer.name.length > 120) fail('Layer names must contain 1–120 characters.');
    const kinds: LayerKind[] = ['source-image', 'paint', 'vector', 'operations', 'infrastructure', 'geographic-reference'];
    if (!kinds.includes(layer.kind as LayerKind)) fail('Unknown layer type.');
    if (typeof layer.visible !== 'boolean' || typeof layer.locked !== 'boolean' || typeof layer.opacity !== 'number' || !Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1) fail('Invalid layer visibility, lock or opacity.');
    if (layer.kind === 'source-image') sourceCount++;
    if (['source-image', 'paint', 'geographic-reference'].includes(String(layer.kind))) {
      if (layer.assetPath === undefined && layer.kind === 'paint') continue;
      const assetPath = layer.assetPath;
      if (typeof assetPath !== 'string' || !assetPattern.test(assetPath) || assetPath.split('/').some(p => p === '..' || p === '.')) fail('Raster layer asset path is invalid.');
      if (project && !project.extras.has(assetPath) && assetPath !== project.manifest.artwork.path) fail('Raster layer asset is missing from the project.');
    }
  }
  if (sourceCount > 1) fail('An image document can contain only one original source-image layer.');
  const activeLayerId = stack.activeLayerId;
  if (typeof activeLayerId !== 'string' || !ids.has(String(activeLayerId))) fail('The active layer must reference an existing layer.');
  if (coordinateSpace === 'geographic' && sourceCount > 0) fail('A geographic document cannot use an image-pixel source layer; place artwork as a reference layer instead.');
}
