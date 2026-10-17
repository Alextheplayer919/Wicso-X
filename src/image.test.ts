import { describe, it, expect } from 'vitest';
import { validateDimensions, validateFile, validateRaster } from './image';
const file = (name: string, size = 32) => ({name, size}) as File;
describe('import guards', () => {
  it('accepts supported raster names', () => { for(const ext of ['png','JPG','jpeg','webp']) expect(() => validateFile(file(`world.${ext}`))).not.toThrow(); });
  it('rejects unsupported/empty/oversized files', () => { for(const f of [file('world.psd'),file('world.zip'),file('world.svg'),file('world.png',0),file('world.png',101*1024*1024)]) expect(() => validateFile(f)).toThrow(); });
  it('handles different aspect ratios without normalizing', () => { for(const [w,h] of [[6000,3000],[100,5000],[8000,8000]]) expect(() => validateDimensions(w,h)).not.toThrow(); });
  it('rejects excessive dimensions', () => { for(const [w,h] of [[0,100],[17000,100],[9000,9000]]) expect(() => validateDimensions(w,h)).toThrow(); });
});

describe('raster content signatures', () => {
  it('rejects SVG masquerading as a raster', async () => { await expect(validateRaster(new Blob(['<svg></svg>']), 'map.png')).rejects.toThrow('contents'); });
  it('accepts PNG magic bytes and rejects mismatched extensions', async () => { const b = new Blob([new Uint8Array([137,80,78,71,13,10,26,10])]); await expect(validateRaster(b, 'map.png')).resolves.toBeUndefined(); await expect(validateRaster(b, 'map.jpg')).rejects.toThrow(); });
});
