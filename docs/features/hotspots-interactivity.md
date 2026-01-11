# Hotspots & Interactivity

Hotspots are interactive markers placed on a scene to enable navigation and rich content.

Related docs:
- Canonical hotspot schema: `../00-conventions.md`
- API contract: `../technical/api-specification.md`

## MVP scope

- Create/edit/delete hotspots on a scene.
- Place hotspots by clicking in the viewer and adjust by dragging.
- Support hotspot types:
  - `navigation` (scene-to-scene)
  - `info` (text/image/modal)
  - `link` (external URL)
  - `audio` / `video` (media playback)
- Track hotspot interactions via analytics.

## Post‑MVP scope

- Hotspot grouping, conditions, and templates.
- Forms/lead capture.
- A/B testing and heatmaps.

## Hotspot types (canonical)

Types and typed `content` are defined in `../00-conventions.md`.

### Navigation

- Requires `target_scene_id`.
- Viewer switches scenes immediately and emits `scene_view`.

### Info

- Displays a modal/panel containing `content.text` and/or `content.image_url`.
- HTML (if supported) MUST be sanitized or sandboxed.

### Link

- Opens `content.url` with `content.target` (`_blank` recommended).
- Backend SHOULD validate URLs:
  - allowed protocols: `https:` (and `http:` only if explicitly allowed)
  - reject `javascript:` and other unsafe schemes

### Audio / Video

- Opens a media UI using `content.audio_url` or `content.video_url`/`youtube_id`/`vimeo_id`.

## Placement and coordinates

- Hotspot positions use yaw/pitch degrees (see `../00-conventions.md`).
- Editor MUST support:
  - click-to-place (creates hotspot at cursor)
  - drag-to-adjust position

## API usage (MVP)

- List hotspots: `GET /api/v1/scenes/{scene_id}/hotspots`
- Create hotspot: `POST /api/v1/scenes/{scene_id}/hotspots`
- Update hotspot: `PATCH /api/v1/hotspots/{hotspot_id}`
- Update position: `PUT /api/v1/hotspots/{hotspot_id}/position`
- Delete hotspot: `DELETE /api/v1/hotspots/{hotspot_id}`

## Analytics (MVP)

- Viewer emits `hotspot_click` with `hotspot_id` and `type`.

**Document Links**:
- [Tour Creation](tour-creation.md) ← Previous
- [Player & Embed](player-embed.md) → Next
