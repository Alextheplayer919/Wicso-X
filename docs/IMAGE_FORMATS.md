# WicsoX image and map-file format policy

Research baseline: 31 October 2026. This document separates ordinary raster images, layered art documents, vector graphics and geographic data. They are not interchangeable.

## Product rule

WicsoX is an image-first map-art editor with optional geographic features. Every project has a document coordinate system and an independent layer stack. Importing a picture must not flatten the working project or convert image pixels into latitude/longitude.

The original imported file is retained unchanged as a source asset. Editing happens in separate layers. The native WicsoX project archive is the lossless working format for WicsoX documents; an exported PNG or JPEG is a flattened image, not a substitute for the editable project.

## Import/export priority

| Format | Type and useful properties | Initial policy | Longer-term policy |
|---|---|---|---|
| PNG (.png) | Lossless raster; transparency; excellent for borders, text, flags and crisp map lines | First-class import | First-class flattened export; keep alpha |
| JPEG (.jpg, .jpeg) | Lossy photographic raster; no alpha channel | First-class import | First-class flattened export; require a chosen matte/background for transparent areas |
| JPEG aliases (.jfif, .pjpeg, .pjp) | JPEG data under less common extensions | Accept as JPEG when signature matches | Store with canonical .jpg asset path in WicsoX archives while retaining the user's original filename |
| WebP (.webp) | Lossy or lossless; supports transparency and animation | Import supported by existing decoder path | Optional flattened export after checking encoder support |
| AVIF (.avif) | Modern, efficient raster; supports alpha, high bit depth and animation | Deferred; runtime decoder support varies by browser/device | Add only with tested mobile-browser compatibility and explicit frame handling |
| GIF (.gif) / APNG (.apng) | Indexed/animated images; GIF has limited palette/transparency | Not accepted as native map art yet | Optional static-frame import; never silently promise animation editing |
| BMP (.bmp) | Simple bitmap raster; often very large | Deferred; use a decoder and memory checks if demand justifies it | Static raster import |
| TIFF (.tif, .tiff) | May be multi-page, tiled, high bit-depth, and metadata-rich | Deferred; not consistent across browsers | Dedicated decoder; select page and preserve relevant metadata |
| HEIF/HEIC (.heic, .heif) | Common phone-camera container; codec/profile dependent | Deferred | Dedicated decoder or explicit conversion path |
| JPEG XL (.jxl) | Modern lossy/lossless, alpha and HDR capable | Deferred due browser compatibility variability | Optional after decoder/encoder coverage is proven |
| SVG (.svg) | XML-based vector artwork, not a pixel image | Not accepted as ordinary raster import | Sanitized vector import with scripting, external resources and active content disallowed |
| OpenRaster (.ora) | Open layered interchange archive with XML layer stack and PNG layer assets | Not implemented | High-priority layered-art import/export |
| PSD/PSB | Photoshop layered working format; PSB for large documents | Not implemented | Layered import via a maintained parser; explicitly report unsupported effects/features |
| KRA | Krita's native layered project format | Not implemented | Consider later; inspect compatibility by version and preserve unsupported data |
| XCF | GIMP's native layered project format | Not implemented | Lower priority than ORA; the format evolves with GIMP |
| PDF | Page/document format; can contain vector and raster content | Not accepted as image | Optional import by rendering a selected page at a chosen resolution |
| GeoTIFF | Raster plus geographic reference information | Not accepted as an ordinary image | Geographic-reference import through a dedicated geospatial decoder |
| World files (.pgw/.jgw/.jgwx/.tfw/.wld) | Sidecar affine placement for a raster dataset | Not implemented | Pair with matching raster only in geographic mode |
| GeoJSON | Geographic vector features, not a raster image | Not implemented | Import country/region/line/point data into geographic vector layers |
| Shapefile (.shp plus sidecars) | Common GIS vector dataset, often distributed as a group of files | Not implemented | Optional geographic import with a multi-file picker / ZIP workflow |

## Why PNG and JPEG are both mandatory

- PNG is the safe default for map drawings with hard borders, small labels, flags, transparent overlays and line art. It stores pixels losslessly and supports alpha transparency.
- JPEG is useful when the source map is a photo, scan, or an already-compressed image. It is lossy and does not have an alpha channel, so WicsoX must not use JPEG as the default export for transparent layers or fine-edged map diagrams.
- JPEG's standard MIME type is `image/jpeg`; both `.jpg` and `.jpeg` are common. Some tools also emit `.jfif`, `.pjpeg` and `.pjp`. The file's byte signature must still be checked rather than trusting its extension.
- The browser canvas API guarantees PNG output. JPEG and WebP encoders are available in many modern browsers but are not guaranteed by the API; an export must verify the returned MIME type and must never save PNG bytes with a `.jpg` name.
- JPEG export from a transparent canvas requires an explicit flattening background. Defaulting to white is acceptable only if the UI makes the background choice visible.

## Layered artwork

OpenRaster (.ora) is the first interchange format to target. It is a ZIP archive with a required `mimetype`, `stack.xml`, layer image assets, a thumbnail and a merged preview. Its layer-stack specification defines ordering, visibility, opacity, offsets and groups. This is a much more suitable bridge between drawing applications than expecting a flattened PNG to contain editability.

PSD/PSB, KRA and XCF are application-native project formats. They can encode application-specific layer modes, masks, effects, metadata, groups, colour profiles, high bit depth or other features. A future importer must show a conversion report and must not claim perfect fidelity when unsupported content is flattened or skipped. GIMP's own XCF documentation describes the format as evolving with GIMP and identifies OpenRaster as the generic interchange route.

## Geographic data is a separate subsystem

A GeoTIFF or a raster accompanied by a world file is not just an ordinary picture: it has a transform from image pixel coordinates to real-world coordinates. A normal Ibis Paint map has no such transform. WicsoX must keep image coordinates and geographic coordinates in different document modes and never silently georeference a hand-drawn image.

GeoJSON and Shapefile are vector-data inputs, not image formats. They belong in a future geographic mode. Geographic import must also preserve coordinate reference system details and make reprojection explicit.

## Import validation and safety requirements

1. Check the file extension for user feedback, but also inspect the byte signature. A renamed SVG/HTML/ZIP must not pass as PNG/JPEG.
2. Decode before replacing the current workspace; invalid or unsupported files leave the old project untouched.
3. Apply compressed file-size, decoded width/height, total pixel and memory-aware limits. File size alone does not predict decoded memory use.
4. Preserve the exact original source bytes. Any normalized/converted preview is a separate asset and must never replace the original silently.
5. Treat archive formats such as ORA, PSD, KRA and XCF as untrusted inputs. Bound entry counts, sizes and decompressed output; reject traversal paths, encrypted archives and malformed metadata.
6. Parse XML with DTD/external entities disabled. SVG must be treated as active XML content and sanitized before it is imported into the editing scene.
7. For animated formats, require a deliberate frame-selection policy. Do not quietly create a timeline from a still-map import.
8. Record which properties were preserved, approximated, flattened or discarded during any layered-document conversion.

## Current implementation

As of the rewrite branch baseline:
- Direct raster import accepts PNG, JPEG/JPG and WebP and checks signatures before decoding.
- PNG, JPEG and WebP source bytes are preserved in the portable ZIP project.
- A project ZIP is the editable WicsoX format; it is not the same as an exported flattened image.
- Native layered-file import, raster painting, flattened canvas export, geographic raster import and animation are not implemented.
- Existing dimension limits are 64 megapixels and 16,384 pixels per edge. Mobile memory use still needs testing on physical devices.

## References

- MDN, image file types and browser compatibility: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
- MDN, canvas export via `toBlob()`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
- OpenRaster file layout: https://www.openraster.org/baseline/file-layout-spec.html
- OpenRaster layer stack: https://www.openraster.org/baseline/layer-stack-spec.html
- Adobe Photoshop file format overview: https://helpx.adobe.com/photoshop/desktop/save-and-export/export-files-to-different-formats/photoshop-file-formats-overview.html
- Adobe PSD/PSB file format specification: https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/
- GIMP XCF format documentation: https://developer.gimp.org/core/standards/xcf/
- GDAL GeoTIFF driver and georeferencing: https://gdal.org/en/stable/drivers/raster/gtiff.html
- Esri raster world files: https://doc.esri.com/en/arcgis-pro/latest/help/data/imagery/world-files-for-raster-datasets.html
- OWASP, XML injection and SVG upload risks: https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/07-Injection/07-XML_Injection/
