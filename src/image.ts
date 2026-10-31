const JPEG_EXTENSIONS = ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp'] as const;

export function validateFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const supportedExtensions = new Set<string>(['png', 'webp', ...JPEG_EXTENSIONS]);
  if (!supportedExtensions.has(extension)) {
    throw new Error('Choose a PNG, JPEG/JPG, or WebP image. PSD and layered project files are not supported yet.');
  }
  if (!file.size) throw new Error('This file is empty. Please choose a valid map image.');
  if (file.size > 100 * 1024 * 1024) throw new Error('This image exceeds the 100 MB import limit. Use a smaller copy; keep your original safe.');
}

export function validateDimensions(width: number, height: number) {
  if (!width || !height) throw new Error('This image has no readable dimensions.');
  if (width > 16384 || height > 16384 || width * height > 64_000_000) throw new Error('This image is too large for this release (maximum 64 megapixels and 16,384 pixels per side).');
}

export type RasterExportFormat = 'png' | 'jpeg' | 'webp';

export function rasterMimeType(format: RasterExportFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
}

export function rasterExtension(format: RasterExportFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

export function rasterExportFilename(sourceName: string, format: RasterExportFormat): string {
  const base = sourceName.replace(/\.[^.]+$/, '').trim() || 'wicsox-map';
  return `${base}.${rasterExtension(format)}`;
}

/** Export a rendered canvas without silently accepting the browser's PNG fallback for JPEG/WebP. */
export async function encodeCanvas(
  source: HTMLCanvasElement,
  format: RasterExportFormat,
  options: { quality?: number; jpegBackground?: string } = {},
): Promise<Blob> {
  validateDimensions(source.width, source.height);
  const mime = rasterMimeType(format);
  let canvas = source;

  // JPEG has no alpha channel. Flatten explicitly so transparent pixels do not become
  // an unpredictable black background in the resulting map.
  if (format === 'jpeg') {
    const flattened = document.createElement('canvas');
    flattened.width = source.width;
    flattened.height = source.height;
    const context = flattened.getContext('2d');
    if (!context) throw new Error('Could not create a canvas for JPEG export.');
    context.fillStyle = options.jpegBackground || '#ffffff';
    context.fillRect(0, 0, flattened.width, flattened.height);
    context.drawImage(source, 0, 0);
    canvas = flattened;
  }

  const quality = Math.min(1, Math.max(0, options.quality ?? 0.92));
  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('The browser could not encode this image.')), mime,
        format === 'png' ? undefined : quality);
    } catch (error) {
      reject(error);
    }
  });
  if (blob.type.toLowerCase() !== mime) {
    throw new Error(`This browser cannot export ${format.toUpperCase()} from canvas. Choose PNG or use a supported browser.`);
  }
  return blob;
}

export async function validateRaster(blob: Blob, name: string) {
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const extension = name.split('.').pop()?.toLowerCase() || '';
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => b[i] === n);
  const jpeg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const webp = String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
  const matches = extension === 'png' && png
    || (JPEG_EXTENSIONS as readonly string[]).includes(extension) && jpeg
    || extension === 'webp' && webp;
  if (!matches) throw new Error('Could not open this image. Its contents do not match a supported PNG, JPEG, or WebP filename.');
}
