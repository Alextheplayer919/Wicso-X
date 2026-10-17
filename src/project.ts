import { BlobReader, BlobWriter, TextReader, ZipReader, ZipWriter } from '@zip.js/zip.js';
import type { FileEntry } from '@zip.js/zip.js';
import { getMapping, validateMapping } from './entities';
import { validateDimensions, validateRaster } from './image';
export type JsonObject = { [key: string]: unknown };
export interface Manifest extends JsonObject {
  format: 'wicso-project'; version: 1; id: string; name: string; createdAt: string; updatedAt: string;
  artwork: JsonObject & { path: string; name: string; mime: string; width: number; height: number; sha256: string };
}
export interface Project {
  manifest: Manifest; world: JsonObject; history: JsonObject; artwork: Blob; extras: Map<string, Blob>;
}
const MB = 1024 * 1024;
export const LIMITS = { archive: 150 * MB, total: 200 * MB, entry: 100 * MB, json: 2 * MB, entries: 512, ratio: 250 };
const fail = (message: string): never => { throw new Error(message); };
function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be a JSON object.`);
  return value as JsonObject;
}
export function safePath(path: string) {
  if (!path || path.length > 240 || /[\\:\x00-\x1f]/.test(path) || path.startsWith('/') || path.split('/').some(p => !p || p === '.' || p === '..')) fail('Archive contains an unsafe file path.');
}
export async function sha256(blob: Blob) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('');
}
export function validateManifest(value: unknown): Manifest {
  const m = object(value, 'Manifest');
  if (m.format !== 'wicso-project') fail('This ZIP is not a WICSO project.');
  if (m.version !== 1) fail(`Unsupported project format version ${String(m.version)}. This release reads version 1 only; your file was not changed.`);
  for (const key of ['id', 'name', 'createdAt', 'updatedAt']) if (typeof m[key] !== 'string' || !(m[key] as string).trim() || (m[key] as string).length > 500) fail(`Invalid project ${key}.`);
  for (const key of ['createdAt', 'updatedAt']) if (!Number.isFinite(Date.parse(m[key] as string))) fail('Invalid project timestamp.');
  const a = object(m.artwork, 'Artwork');
  if (typeof a.path !== 'string') fail('Missing artwork path.');
  safePath(a.path as string);
  if (!(a.path as string).startsWith('artwork/') || !/\.(png|jpe?g|webp)$/i.test(a.path as string)) fail('Artwork must be a PNG, JPEG, or WebP in artwork/.');
  if (typeof a.name !== 'string' || !a.name || a.name.length > 240 || /[\\/\x00-\x1f]/.test(a.name)) fail('Invalid artwork filename.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(a.mime as string)) fail('Unsupported artwork media type.');
  if (!Number.isInteger(a.width) || !Number.isInteger(a.height) || (a.width as number) < 1 || (a.height as number) < 1) fail('Invalid artwork dimensions.');
  validateDimensions(a.width as number, a.height as number);
  if (typeof a.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(a.sha256)) fail('Missing or invalid artwork checksum.');
  return m as Manifest;
}
function validateWorld(value: unknown): JsonObject {
  const world = object(value, 'World');
  if (world.notes !== undefined && (typeof world.notes !== 'string' || world.notes.length > 100000)) fail('Project notes must be text under 100,000 characters.');
  if (world.layers !== undefined) {
    const layers = object(world.layers, 'Layers');
    if (layers.artwork !== undefined && typeof layers.artwork !== 'boolean') fail('Invalid artwork layer visibility.');
  }
  if (world.view !== undefined) {
    const v = object(world.view, 'View');
    if (typeof v.zoom !== 'number' || !Number.isFinite(v.zoom) || v.zoom < -8 || v.zoom > 4 || !Array.isArray(v.center) || v.center.length !== 2 || !v.center.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e8)) fail('Invalid saved map view.');
  }
  // Unrendered entity data is preserved verbatim, never coerced or silently omitted.
  return world;
}
export async function newProject(file: File, width: number, height: number): Promise<Project> {
  const now = new Date().toISOString();
  const ext = file.name.split('.').pop()!.toLowerCase();
  return {
    manifest: { format: 'wicso-project', version: 1, id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, '') || 'Untitled world', createdAt: now, updatedAt: now,
      artwork: { path: `artwork/original.${ext}`, name: file.name, mime: ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg', width, height, sha256: await sha256(file) } },
    world: { notes: '', layers: { artwork: true }, countries: [], territories: [], military: [], infrastructure: { nodes: [], edges: [] }, labels: [] },
    history: { events: [], snapshots: [] }, artwork: file, extras: new Map(),
  };
}
export async function readProject(blob: Blob): Promise<Project> {
  if (blob.size > LIMITS.archive) fail('Project ZIP exceeds the 150 MB limit.');
  const reader = new ZipReader(new BlobReader(blob), { useWebWorkers: false, checkSignature: true, strictness: 'strict' });
  try {
    const entries = await reader.getEntries();
    if (entries.length > LIMITS.entries) fail('Project contains too many entries (maximum 512).');
    let total = 0; const paths = new Set<string>();
    for (const e of entries) {
      safePath(e.directory ? e.filename.replace(/\/$/, '') : e.filename);
      const key = e.filename.replace(/\/$/, '').toLowerCase();
      if (paths.has(key)) fail('Project contains duplicate file paths.'); paths.add(key);
      if (e.encrypted) fail('Encrypted ZIP projects are not supported.');
      if (e.uncompressedSize > LIMITS.entry) fail('A project file exceeds the 100 MB limit.');
      total += e.uncompressedSize;
      if (total > LIMITS.total) fail('Expanded project exceeds the 200 MB limit.');
      if (e.uncompressedSize > MB && e.uncompressedSize / Math.max(1, e.compressedSize) > LIMITS.ratio) fail('Suspicious ZIP compression ratio. Import was stopped.');
    }
    const byName = new Map(entries.filter(e => !e.directory).map(e => [e.filename, e]));
    // Bound actual decompressed output too; central-directory sizes alone are untrusted.
    async function readBlob(entry: FileEntry, max = LIMITS.entry, mime = 'application/octet-stream') {
      let size = 0; const chunks: Blob[] = [];
      await entry.getData(new WritableStream<Uint8Array>({
        write(chunk) {
          size += chunk.byteLength;
          if (size > max || size > entry.uncompressedSize) fail('Expanded file exceeds its declared size or safety limit.');
          chunks.push(new Blob([new Uint8Array(chunk)]));
        }
      }));
      if (size !== entry.uncompressedSize) fail('ZIP entry size does not match its content.');
      return new Blob(chunks, { type: mime });
    }
    async function json(name: string) {
      const e = byName.get(name);
      if (!e || !e.getData) fail(`Project is missing ${name}.`);
      if (e!.uncompressedSize > LIMITS.json) fail(`${name} exceeds the 2 MB metadata limit.`);
      const text = await (await readBlob(e! as FileEntry, LIMITS.json)).text();
      try { return JSON.parse(text); } catch { return fail(`${name} is not valid JSON.`); }
    }
    const manifest = validateManifest(await json('manifest.json'));
    const world = validateWorld(await json('world.json'));
    const history = object(await json('history.json'), 'History');
    const artworkEntry = byName.get(manifest.artwork.path);
    if (!artworkEntry?.getData) fail('Project artwork is missing.');
    const artwork = await readBlob(artworkEntry! as FileEntry, LIMITS.entry, manifest.artwork.mime);
    if (await sha256(artwork) !== manifest.artwork.sha256) fail('Artwork checksum does not match. The project may be damaged.');
    const extras = new Map<string, Blob>();
    for (const [name, e] of byName) {
      if (['manifest.json', 'world.json', 'history.json', manifest.artwork.path].includes(name)) continue;
      extras.set(name, await readBlob(e as FileEntry));
    }
    const project = { manifest, world, history, artwork, extras };
    validateMapping(project);
    await validateFlags(project);
    return project;
  } catch (e) {
    if (e instanceof Error && !/^(File format is not recognized|End of central directory not found)/.test(e.message)) throw e;
    throw new Error('This file is not a readable ZIP project.');
  } finally { await reader.close(); }
}
async function validateFlags(project: Project) {
  const checked = new Set<string>();
  for(const country of getMapping(project).countries) {
    if(!country.flag || checked.has(country.flag)) continue;
    checked.add(country.flag);
    const flag = project.extras.get(country.flag)!;
    if(flag.size > 5 * 1024 * 1024) throw new Error('Country flag exceeds the 5 MB limit.');
    await validateRaster(flag, country.flag);
  }
}
export async function writeProject(project: Project): Promise<Blob> {
  validateMapping(project);
  await validateFlags(project);
  validateManifest(project.manifest); validateWorld(project.world); object(project.history, 'History');
  const files = [...project.extras.values(), project.artwork];
  if (files.length + 3 > LIMITS.entries) fail('Project contains too many entries (maximum 512).');
  if (files.some(b => b.size > LIMITS.entry)) fail('A project file exceeds the 100 MB limit.');
  if (files.reduce((n, b) => n + b.size, 0) > LIMITS.archive - 8 * MB) fail('Project is too large for a portable ZIP in this release.');
  const writer = new ZipWriter(new BlobWriter('application/zip'), { useWebWorkers: false });
  const reserved = new Set(['manifest.json', 'world.json', 'history.json', project.manifest.artwork.path].map(s => s.toLowerCase()));
  for (const [path] of project.extras) { safePath(path); if (reserved.has(path.toLowerCase())) fail('Extra asset conflicts with a required project file.'); reserved.add(path.toLowerCase()); }
  const json = async (name: string, data: unknown) => {
    const text = JSON.stringify(data, null, 2);
    if (new TextEncoder().encode(text).length > LIMITS.json) fail(`${name} exceeds the 2 MB metadata limit.`);
    await writer.add(name, new TextReader(text), { level: 0 });
  };
  // Store already-compressed artwork/assets; avoids needless CPU and extreme compression ratios.
  await json('manifest.json', project.manifest); await json('world.json', project.world); await json('history.json', project.history);
  await writer.add(project.manifest.artwork.path, new BlobReader(project.artwork), { level: 0 });
  for (const [name, blob] of project.extras) await writer.add(name, new BlobReader(blob), { level: 0 });
  return writer.close();
}
