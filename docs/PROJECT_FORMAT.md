# WicsoX portable project format — v1

Implemented in the v0.2.0 portability release. A self-contained ZIP, with no server dependencies or application credentials.

```
manifest.json
world.json
history.json
artwork/original.png       # or .jpg/.jpeg/.webp, exact source bytes; JPEG aliases use canonical .jpg
assets/...                 # optional retained assets
extensions/...             # optional retained opaque data
```

## Required JSON files

`manifest.json`:

```json
{
  "format": "wicso-project",
  "version": 1,
  "id": "a-stable-project-uuid",
  "name": "My world",
  "createdAt": "2026-10-17T12:00:00.000Z",
  "updatedAt": "2026-10-17T12:00:00.000Z",
  "artwork": {
    "path": "artwork/original.png",
    "name": "my-map.png",
    "mime": "image/png",
    "width": 1200,
    "height": 600,
    "sha256": "64-lowercase-hexadecimal-characters"
  }
}
```

`world.json` is an object. Editable/supported fields in this release:
- `notes`: text up to 100,000 characters.
- `layers.artwork`: boolean visibility (background is always locked).
- `view.center`: Leaflet CRS.Simple `[y, x]`, bottom-left origin, finite numeric coordinates.
- `view.zoom`: number from -8 to 4; 0 is one image pixel per CSS pixel.

New projects also initialize `countries`, `territories`, `military`, `labels` to empty arrays and `infrastructure` to `{nodes: [], edges: []}`. These are placeholders, NOT finalized entity schemas. Nonempty entity collections are retained unchanged but not rendered or editable. Future editing milestones must define and validate stable IDs, foreign keys and top-left image-pixel geometry without assuming real-world geography. Do not use view coordinates as an entity geometry convention.

`history.json` is an object initialized with `events: []` and `snapshots: []`. No full history editor or snapshot restore exists yet. Dated ownership transfers are stored in world.mapping.ownershipHistory. Unknown properties in all three objects are retained. JSON whitespace and key formatting may change, but structured values are preserved. Unknown non-required file entries are retained as Blob data and re-exported byte-for-byte. Empty directory entries are not retained, because no directory extraction is performed.

## Validation and limits

- Version must be numeric 1. Other versions are rejected before altering the workspace. This is the first published schema, so no older schema migration exists yet. Future versions must introduce explicit tested copy-on-import migrations and preserve backups; do not reinterpret version 0 as version 1.
- Manifest format, strings, timestamps, dimensions, media type and SHA-256 are checked. Imported `.jfif`, `.pjpeg` and `.pjp` JPEG filenames retain their original display name but use `artwork/original.jpg` as the canonical archive path.
- All three JSON roots must be objects; implemented view/visibility/notes fields are validated. Root legacy entity fields remain opaque. Supported editor entities are now validated under `world.mapping`; see MAPPING.md.
- CRC and strict ZIP structural checks; original artwork SHA-256 checked. Browser import checks raster magic bytes and decoded dimensions before committing the project.
- Reject encrypted archives, duplicate/case-fold-colliding paths, absolute paths, control characters, backslashes, colon, empty/dot/traversal path components.
- No filesystem extraction; filenames are not executed or interpolated into HTML.
- Maximum ZIP: 150 MiB. Maximum declared expanded total: 200 MiB. Maximum entry: 100 MiB. JSON metadata file: 2 MiB. Maximum entries: 512.
- Reject compression ratio >250:1 for entries larger than 1 MiB. Stream output is counted to enforce actual decompressed size and detect false declared sizes.
- Exports use STORE for metadata, original artwork and extra assets (predictable CPU and no recompression). Export rejects overly large projects so the app can reopen its own output; extra binary data is capped at 142 MiB combined, leaving room for metadata and ZIP overhead.
- Image limits: 64 megapixels and 16,384 pixels/edge. Asynchronous decoding can still exhaust constrained mobile hardware; no unlimited-large-map guarantee.

## Replace, save and recovery semantics

Save ZIP requests a browser download; it cannot verify that the user actually retained the download. Check your downloads. The interface explains this and browser storage is never treated as authoritative. Unsaved changes trigger a close warning, subject to browser support.

Opening a ZIP validates and decodes before replacing anything. Replacing any loaded project requires confirmation, then requests a backup ZIP download before changing the workspace. A browser may block downloads: keep the previous source ZIP and check the backup. Cancellation or invalid input keeps the loaded project intact. Backups contain the current project state, not a byte-identical copy of ZIP container metadata. No app-private recovery, cloud storage, autosave or nested backup chain is added.

The original artwork bytes and SHA-256 remain unchanged across saves. Project ID and creation timestamp remain stable; export updates the modification timestamp. No credentials, signing keys, filesystem paths or user identity are added to exports.

## v0.3.0 mapping extension

See [MAPPING.md](MAPPING.md) for the additive `world.mapping` namespace, stable-ID/reference validation, geometry convention and compatibility rules. Statements above about opaque root arrays still apply to the old placeholders, not the new mapping editor.
