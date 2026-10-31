import { afterEach, describe, it, expect, vi } from 'vitest';
import { encodeCanvas, rasterExportFilename, rasterMimeType, validateDimensions, validateFile, validateRaster } from './image';

const file = (name: string, size = 32) => ({ name, size }) as File;

describe('import guards', () => {
  it('accepts PNG, WebP and common JPEG filename variants', () => {
    for (const ext of ['png', 'JPG', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'webp']) {
      expect(() => validateFile(file(`world.${ext}`))).not.toThrow();
    }
  });
  it('rejects unsupported/empty/oversized files', () => {
    for (const f of [file('world.psd'), file('world.zip'), file('world.svg'), file('world.png', 0), file('world.png', 101 * 1024 * 1024)]) {
      expect(() => validateFile(f)).toThrow();
    }
  });
  it('handles different aspect ratios without normalizing', () => {
    for (const [w, h] of [[6000, 3000], [100, 5000], [8000, 8000]]) expect(() => validateDimensions(w, h)).not.toThrow();
  });
  it('rejects excessive dimensions', () => {
    for (const [w, h] of [[0, 100], [17000, 100], [9000, 9000]]) expect(() => validateDimensions(w, h)).toThrow();
  });
});

describe('raster content signatures', () => {
  it('rejects SVG masquerading as a raster', async () => {
    await expect(validateRaster(new Blob(['<svg></svg>']), 'map.png')).rejects.toThrow('contents');
  });
  it('accepts PNG magic bytes and rejects mismatched extensions', async () => {
    const b = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]);
    await expect(validateRaster(b, 'map.png')).resolves.toBeUndefined();
    await expect(validateRaster(b, 'map.jpg')).rejects.toThrow();
  });
  it('accepts JPEG signatures with JPG, JPEG and JFIF filename extensions', async () => {
    const b = new Blob([new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1])]);
    for (const name of ['map.jpg', 'map.jpeg', 'map.jfif', 'map.pjpeg', 'map.pjp']) {
      await expect(validateRaster(b, name)).resolves.toBeUndefined();
    }
    await expect(validateRaster(b, 'map.png')).rejects.toThrow();
  });
});

describe('raster export policy', () => {
  it('uses the correct MIME types and file extensions', () => {
    expect(rasterMimeType('png')).toBe('image/png');
    expect(rasterMimeType('jpeg')).toBe('image/jpeg');
    expect(rasterMimeType('webp')).toBe('image/webp');
    expect(rasterExportFilename('world.png', 'jpeg')).toBe('world.jpg');
    expect(rasterExportFilename('world.jpeg', 'png')).toBe('world.png');
  });

  afterEach(() => vi.unstubAllGlobals());

  it('exports a PNG canvas when the browser PNG encoder responds', async () => {
    const canvas = {
      width: 2, height: 2,
      toBlob: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })),
    } as unknown as HTMLCanvasElement;
    await expect(encodeCanvas(canvas, 'png')).resolves.toMatchObject({ type: 'image/png' });
  });

  it('does not mislabel a PNG fallback as JPEG', async () => {
    const context = { fillStyle: '', fillRect: () => undefined, drawImage: () => undefined };
    const canvas = {
      width: 2, height: 2,
      getContext: () => context,
      toBlob: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })),
    } as unknown as HTMLCanvasElement;
    vi.stubGlobal('document', { createElement: () => canvas });
    await expect(encodeCanvas(canvas, 'jpeg')).rejects.toThrow('cannot export JPEG');
  });
});
