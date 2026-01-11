# Tour Creation

Tour creation is the authoring workflow for building a tour from uploaded panoramas.

Related docs:
- Conventions and schemas: `../00-conventions.md`
- API contract: `../technical/api-specification.md`

## MVP scope

- Create a tour (`draft` status).
- Upload panorama images and create scenes.
- Reorder scenes.
- Configure basic tour settings (initial scene, auto-rotate, viewer options).
- Publish/unpublish.
- Generate a share link and embed code (see `player-embed.md`).

## Post‑MVP scope

- AI auto-ordering or auto-grouping of scenes.
- Offline export packages.
- Templates and multi-version history.

## User flow (MVP)

1. User clicks **Create Tour**.
2. User enters title/visibility and creates the tour.
3. User uploads panoramas and creates scenes.
4. User reorders scenes and sets the initial scene.
5. User previews the tour.
6. User publishes and shares/embeds.

## Upload and scene creation

### Supported inputs (MVP)

- Equirectangular 2:1 panoramas.
- MIME types: `image/jpeg`, `image/png`, `image/webp`.

### Validation (MVP)

- Reject files that exceed backend-configured size limits.
- Reject files with invalid MIME types.
- Warn (not hard fail) if the aspect ratio is not close to 2:1.

### API usage (MVP)

1. Presign upload: `POST /api/v1/uploads/presign` (purpose: `tour_scene`).
2. Upload bytes to `upload_url`.
3. Complete upload: `POST /api/v1/uploads/complete` → returns `MediaFile`.
4. Create scene: `POST /api/v1/tours/{tour_id}/scenes` with `image_file_id`.

## Scene ordering (MVP)

- Scenes have an `order_index`.
- The editor MUST support drag-and-drop ordering.
- Backend MUST support a reorder endpoint: `POST /api/v1/tours/{tour_id}/scenes/reorder`.

## Tour settings (MVP)

### Status vs visibility

- `status`: `draft | published | archived`
- `visibility`: `private | unlisted | public`

### Settings fields

See `TourSettings` in `../00-conventions.md`.

## Preview (MVP)

- Editor must provide an in-app preview that uses the same viewer behavior as public viewing.

## Publish/unpublish (MVP)

- Publish: `POST /api/v1/tours/{tour_id}/publish`.
- Unpublish: `POST /api/v1/tours/{tour_id}/unpublish`.

## Analytics (MVP)

Viewer emits:
- `tour_view`
- `scene_view`

**Document Links**:
- [Features Index](README.md) ← Back
- [Hotspots & Interactivity](hotspots-interactivity.md) → Next
