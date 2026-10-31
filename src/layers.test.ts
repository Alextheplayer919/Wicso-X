import { describe, expect, it } from 'vitest';
import { createInitialLayerStack, validateLayerStack } from './layers';

describe('editor layer stack', () => {
  it('creates a locked source image and independent editable layers', () => {
    const stack = createInitialLayerStack('artwork/original.png');
    expect(stack.coordinateSpace).toBe('image-pixels');
    expect(stack.layers.map(layer => layer.kind)).toEqual(['source-image', 'paint', 'vector', 'operations', 'infrastructure']);
    expect(stack.layers[0]).toMatchObject({ id: 'source-image', locked: true, visible: true });
    expect(stack.activeLayerId).toBe('paint-1');
    expect(() => validateLayerStack(stack)).not.toThrow();
  });

  it('rejects unsafe source paths', () => {
    expect(() => createInitialLayerStack('../outside/map.png')).toThrow('path is invalid');
    expect(() => createInitialLayerStack('artwork/map.svg')).toThrow('path is invalid');
  });

  it('rejects duplicate layer IDs and invalid active-layer references', () => {
    const stack = createInitialLayerStack('artwork/original.jpg');
    const duplicate = structuredClone(stack);
    duplicate.layers.push({ ...duplicate.layers[1] });
    expect(() => validateLayerStack(duplicate)).toThrow('unique');
    const missingActive = structuredClone(stack);
    missingActive.activeLayerId = 'not-here';
    expect(() => validateLayerStack(missingActive)).toThrow('active layer');
  });

  it('accepts an empty paint layer before its first raster stroke', () => {
    const stack = createInitialLayerStack('artwork/original.jpg');
    expect(() => validateLayerStack(stack)).not.toThrow();
  });
});
