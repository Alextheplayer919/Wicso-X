export function validateFile(file: File) {
  if (!/\.(png|jpe?g|webp)$/i.test(file.name)) throw new Error('Choose a PNG, JPEG, or WebP image. PSD is not supported. Use Open ZIP for a project archive.');
  if (!file.size) throw new Error('This file is empty. Please choose a valid map image.');
  if (file.size > 100 * 1024 * 1024) throw new Error('This image exceeds the 100 MB import limit. Use a smaller copy; keep your original safe.');
}
export function validateDimensions(width: number, height: number) {
  if (!width || !height) throw new Error('This image has no readable dimensions.');
  if (width > 16384 || height > 16384 || width * height > 64_000_000) throw new Error('This image is too large for this release (maximum 64 megapixels and 16,384 pixels per side).');
}

export async function validateRaster(blob: Blob, name: string) {
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const png = [137,80,78,71,13,10,26,10].every((n,i) => b[i] === n);
  const jpeg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const webp = String.fromCharCode(...b.slice(0,4)) === 'RIFF' && String.fromCharCode(...b.slice(8,12)) === 'WEBP';
  if (!(/\.png$/i.test(name) && png || /\.jpe?g$/i.test(name) && jpeg || /\.webp$/i.test(name) && webp)) throw new Error('Could not open this image. Its contents do not match a PNG, JPEG, or WebP filename.');
}
