# Territory tracing and country dossiers — v0.3.0

## Workflow

1. Import artwork or open a project ZIP.
2. Click the flag icon in the left rail (**Countries & regions**), or **Countries & regions** in the territory bar. Add a country: name, political color, optional raster flag, editable dossier fields and custom text fields.
3. Click **Trace territory**. Click/tap vertices inside the artwork, then **Finish trace**. Name the region, assign a country and optional occupying country, set controlled/contested/occupied status, and save.
4. Click a territory on the map to select it and open its record. **Country dossier** opens its assigned country's profile. The records list also selects/fits regions, including territories hidden by the layer toggle.
5. **Edit boundary** displays draggable vertices. Click a numbered vertex to select it for removal, or click a + midpoint to insert a new vertex. Finish saves, Cancel/Escape leaves the previous boundary intact. Tracing supports up to 500 vertices per simple polygon. Zoom/pan to place points precisely; arbitrary geographic projections are not used.
6. **Undo/redo** (territory bar or Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) restores mapping edits, including flag assets, in this session. The most recent 50 mapping revisions are kept. Map pan/zoom and general project notes are not part of mapping undo.
7. **Save ZIP** to retain countries, flags, territory geometry, layer visibility and ownership-change records. Open in a fresh session to restore. Flags and map source files are not recompressed.

Unsaved boundary drafts must be finished or cancelled before exporting/replacing the project. Closing a modified record prompts before discarding its fields. Deletions require confirmation; country deletion is blocked while a territory owns/occupies a reference to it. Orphaned flag assets are retained intentionally (no automatic asset deletion). Ownership transfers append dated records; undo removes the undone transfer from the current editing branch, as expected. This is not yet a full immutable historical timeline.

## Implemented scope

- Manual tracing, click selection, insert/remove/drag vertices, rename/delete regions.
- Country ownership, optional occupying country, contested status, country political colors and unassigned-region colors.
- Territory-to-country relationship serves as an administrative subdivision/parent-country association. No nested subdivision hierarchy yet.
- Country dossiers: government, leadership, capital, population, economy, armed forces, alliances/diplomacy, conflicts, claims, history/notes, custom JSON object of **text values**.
- Imported PNG/JPEG/WebP flags: up to 5 MiB and 4 megapixels, verified and decoded before applying; old flag assets preserved.
- Country UUIDs are independent of names/colors/flags. Renaming cannot break territorial ownership.
- Independent territory layer visibility; clear selection outline; session undo/redo and explicit saves.

**Not implemented:** split/merge, polygon holes/multipolygons, automatic border detection, nested subdivisions, automatic topology/snap-to-border, military/infrastructure editors, full snapshot history, country flag designer. Neighbor boundaries may overlap; this release validates each polygon but does not impose a global topology. Do not interpret this as all remaining roadmap features being complete.

## Additive archive schema

The outer ZIP format stays v1. Supported editor records live in `world.mapping`, version 1:

```
{
  version: 1,
  visible: true,
  countries: [{id, name, color, flag?, profile: {...text}, custom: {...text}}],
  territories: [{id, name, points: [[x,y],...], ownerId, occupierId,
                 status, color, notes}],
  ownershipHistory: [{id, territoryId, from, to, at}]
}
```

Coordinates are image pixels, top-left origin (x right, y down). Bounds include the image edge. No closing duplicate vertex is stored. UUIDs are generated for editor records; imports permit stable alphanumeric/underscore/hyphen IDs. Colors must be six-digit hex. `ownerId` and `occupierId` are null or reference existing countries. `status` is controlled/contested/occupied. Flags refer to `assets/flags/{id}.{png|jpg|jpeg|webp}`. All unknown per-record properties and unedited profile fields are preserved.

Limits: 500 countries; 1,000 territories; 500 vertices per polygon; 10,000 vertices per project; 10,000 ownership events; 100 custom/profile fields; 10,000 characters per text field; existing 2 MiB world.json cap still applies. Polygon checks reject zero-area, duplicate, out-of-image, crossing and self-touching boundaries. Entity validation runs before importing/exporting and before each edit is committed. Missing country/flag references and unknown mapping versions fail without changing the workspace. History may refer to deleted records by stable historical ID.

**Compatibility decision:** v0.2 treated root `world.countries`/`world.territories` and similar collections as opaque placeholders. They remain unchanged and are NOT silently converted or reinterpreted. New `world.mapping` is additive, so older projects open with an empty mapping editor while retaining opaque data. An explicit notice explains that legacy/unknown entities are not rendered. Older v0.2 apps retain this namespace as unknown data and can re-export it without modifying it. The ZIP version did not need to change; mapping has its own version gate.
