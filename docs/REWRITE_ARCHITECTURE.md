# WicsoX rewrite — hybrid map-art editor

Status: architecture baseline for the `rewrite/hybrid-editor` branch.

## Product definition

WicsoX is a mobile-first 2D map-art editor. It must work like a drawing application: the user imports an image made in Ibis Paint or another editor, then zooms in and edits the map. It is also a map editor: countries, territories, borders, labels, frontlines, roads and railways should be structured objects rather than permanently painted into the source image.

These are not competing modes. They are layers in one workspace.

## Canvas model

Use a pixel-coordinate document space for imported artwork. The image's original dimensions define the document bounds. The viewport handles pan and zoom independently of document content.

Layer stack, bottom to top:

1. **Background / source image** — imported PNG, JPEG or WebP. Keep the original bytes unchanged and available for recovery/export. It can be hidden or locked.
2. **Raster paint layers** — transparent pixel layers for brush, eraser, fill and pixel-level touch-ups. Never modify the source image in place.
3. **Vector map layers** — editable polygons and paths for countries, territories, borders, labels and custom shapes. Keep stable IDs and references to country records.
4. **Operational layers** — frontlines, contested zones, battle/event markers and annotations, each independently visible and editable.
5. **Infrastructure layers** — roads, railways and connected networks with editable nodes/segments.
6. **Optional geographic reference layer** — a real-world basemap that can be enabled when useful. It is a reference/import source, not a requirement for image-based projects and must not force every document into geographic coordinates.

The editor must let users reorder, rename, hide, lock, duplicate and delete supported layers. Selection and editing must target the active layer only. The initial source image is locked by default.

## Coordinate systems

- **Image documents:** all editable geometry is stored in source-image pixel coordinates. The viewport transforms between screen and document coordinates. Resizing the phone or zooming must not alter geometry.
- **Geographic documents/reference:** geographic coordinates are stored separately (latitude/longitude or a defined projected CRS). Do not mix geographic coordinates with image-pixel coordinates in the same geometry field.
- **Imported image on a geographic canvas:** treat it as an image layer with an explicit placement/transform. Do not silently warp or georeference it.

## Drawing and editing tools

### Raster tools
- Brush with adjustable size, opacity and colour.
- Eraser, line, rectangle and ellipse.
- Fill/bucket with a documented tolerance and contiguous/non-contiguous option.
- Undo/redo and non-destructive paint layers.
- Touch-first controls; no hover-only actions.

### Vector/map tools
- Select/move, polygon trace/edit, path/line, text/label and colour tools.
- Country and territory records with stable IDs, flags, names, colours, ownership and notes.
- Black border outlines by default, with independent border colour and thickness controls.
- Country fill and border styling are separate properties.
- Frontlines, roads and railways live on their own layers and remain editable.

## Mobile-first interface

- Canvas takes the majority of the screen.
- A collapsible layer panel and a contextual tool panel; avoid permanently consuming half the viewport.
- A compact bottom tool dock with touch targets around 44–48 CSS px.
- Colour picker and brush settings open as focused sheets/panels.
- Pinch zoom, one-finger canvas navigation when not drawing, and clear mode switching so drawing does not fight panning.
- Portrait and landscape layouts; no desktop-only hover menus.

## Project format and safety

- Keep project files local-first and portable.
- Preserve source image bytes exactly.
- Store raster layers as separate assets and vector/map data as validated JSON.
- Version the schema and provide explicit migrations; never silently discard unknown data.
- Bound image dimensions, decoded memory, archive size, entity counts and geometry complexity.
- Saving/exporting must include all layers, assets, settings and map records.
- Autosave/recovery may be added, but the user-controlled project export remains authoritative.

## Rewrite sequence

1. **Document and layer foundation:** define a versioned layer model, image-coordinate viewport, layer visibility/locking/order and portable persistence.
2. **Raster editor:** add transparent paint layers, brush/eraser, colour picker, basic shapes, undo/redo and touch gestures.
3. **Vector map editor:** polygons, borders, country records, fills and labels; preserve independent black outlines.
4. **Operational mapping:** frontlines, zones, markers and annotations on dedicated layers.
5. **Infrastructure:** editable road/rail networks and node/edge relationships.
6. **Geographic option:** optional real-world basemap/document mode without breaking image-based documents.
7. **Mobile hardening:** physical Android testing, memory/performance checks, recovery and export validation.

## Existing implementation and migration

The current application already imports raster artwork, uses image-pixel coordinates, preserves the original image and stores traced territories as vectors. Reuse proven validation and portable ZIP concepts where they fit, but do not let the current one-image/one-vector-layer structure constrain the new model. The rewrite branch is isolated from `main`; no existing project files should be deleted or migrated in place until a tested compatibility path exists.
