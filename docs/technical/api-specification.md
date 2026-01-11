# API Specification (v1)

This is the canonical REST API contract for the 360 Tours Platform.

Shared types and conventions are defined in `../00-conventions.md`.

## Base URL and versioning

- Base path: `/api/v1`
- Versioning: changes that break clients require a new major version (`/api/v2`).

Example environment hosts (illustrative):
- Development: `https://dev.api.360-viewer.com`
- Staging: `https://staging.api.360-viewer.com`
- Production: `https://api.360-viewer.com`

## Authentication

- Authenticated endpoints require `Authorization: Bearer <access_token>`.
- Access tokens SHOULD be short-lived (e.g., 15 minutes).
- Refresh tokens SHOULD be long-lived and rotation-enabled.

## Response conventions

- Single-resource endpoints return the resource JSON directly.
- List endpoints return the pagination envelope defined in `../00-conventions.md`.
- Errors MUST use the error envelope defined in `../00-conventions.md`.

## Common headers

- `Content-Type: application/json`
- `X-Request-Id` (optional request; MUST be echoed in response when present)
- `Idempotency-Key` (recommended for POST create operations)

## Authentication endpoints (MVP)

### Register

`POST /api/v1/auth/register`

Request:
```json
{
  "phone": "+91XXXXXXXXXX",
  "password": "string",
  "name": "string"
}
```

Response (201):
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": { "id": "string", "name": "string", "phone": "+91XXXXXXXXXX" }
}
```

### Login

`POST /api/v1/auth/login`

Request:
```json
{ "phone": "+91XXXXXXXXXX", "password": "string" }
```

Response (200):
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": { "id": "string", "name": "string", "phone": "+91XXXXXXXXXX" }
}
```

### Refresh

`POST /api/v1/auth/refresh`

Request:
```json
{ "refresh_token": "string" }
```

Response (200):
```json
{ "access_token": "string", "refresh_token": "string" }
```

### Logout

`POST /api/v1/auth/logout`

Request:
```json
{ "refresh_token": "string" }
```

Response (204): no body

## User endpoints (MVP)

### Get current user

`GET /api/v1/users/me`

Response (200):
```json
{ "id": "string", "name": "string", "phone": "+91XXXXXXXXXX" }
```

## Uploads (MVP)

Uploads support a **presigned** flow (recommended) and MAY support a server-proxy flow.

### Presign an upload

`POST /api/v1/uploads/presign`

Request:
```json
{
  "purpose": "tour_scene" ,
  "filename": "living-room.jpg",
  "mime_type": "image/jpeg",
  "byte_size": 12345678
}
```

Response (200):
```json
{
  "upload_id": "string",
  "upload_url": "https://...",
  "method": "PUT",
  "headers": { "Content-Type": "image/jpeg" },
  "file": {
    "id": "string",
    "file_url": "https://cdn.../objects/...",
    "mime_type": "image/jpeg",
    "byte_size": 12345678
  }
}
```

### Complete an upload

`POST /api/v1/uploads/complete`

Request:
```json
{ "upload_id": "string" }
```

Response (200):
```json
{ "file": { "id": "string", "file_url": "https://..." } }
```

## Tours (MVP)

Tour schema is defined in `../00-conventions.md`.

### List tours

`GET /api/v1/tours?page=1&page_size=20&status=draft|published|archived&visibility=private|unlisted|public&query=...`

Response (200): pagination envelope of `Tour`.

### Create tour

`POST /api/v1/tours`

Request:
```json
{
  "title": "My Tour",
  "description": "Optional",
  "visibility": "private"
}
```

Response (201): `Tour`

### Get tour

`GET /api/v1/tours/{tour_id}`

Response (200): `Tour`

### Update tour

`PATCH /api/v1/tours/{tour_id}`

Request (example):
```json
{ "title": "Updated title", "settings": { "enable_vr": true } }
```

Response (200): `Tour`

### Delete tour

`DELETE /api/v1/tours/{tour_id}`

Response (204): no body

### Publish / unpublish

- `POST /api/v1/tours/{tour_id}/publish` → Response (200): `Tour`
- `POST /api/v1/tours/{tour_id}/unpublish` → Response (200): `Tour`

### Duplicate

`POST /api/v1/tours/{tour_id}/duplicate`

Response (201): `Tour` (new tour)

## Scenes (MVP)

Scene schema is defined in `../00-conventions.md`.

### List scenes for a tour

`GET /api/v1/tours/{tour_id}/scenes?page=1&page_size=100`

Response (200): pagination envelope of `Scene`.

### Create a scene

`POST /api/v1/tours/{tour_id}/scenes`

Request:
```json
{
  "title": "Living Room",
  "image_file_id": "string",
  "order_index": 0
}
```

Response (201): `Scene`

### Update scene

`PATCH /api/v1/scenes/{scene_id}`

Request (example):
```json
{ "title": "Bedroom", "metadata": { "initial_view": { "yaw": 10, "pitch": 0 } } }
```

Response (200): `Scene`

### Delete scene

`DELETE /api/v1/scenes/{scene_id}` → Response (204)

### Reorder scenes

`POST /api/v1/tours/{tour_id}/scenes/reorder`

Request:
```json
{ "scene_ids": ["scene1", "scene2", "scene3"] }
```

Response (204)

## Hotspots (MVP)

Hotspot schema (including typed content) is defined in `../00-conventions.md`.

### List hotspots for a scene

`GET /api/v1/scenes/{scene_id}/hotspots`

Response (200):
```json
{ "items": [], "total": 0, "page": 1, "page_size": 100, "total_pages": 1 }
```

### Create hotspot

`POST /api/v1/scenes/{scene_id}/hotspots`

Request:
```json
{
  "type": "navigation",
  "position": { "yaw": 42, "pitch": 0 },
  "target_scene_id": "string",
  "title": "Next",
  "content": { "kind": "navigation", "label": "Go" }
}
```

Response (201): `Hotspot`

### Update hotspot

`PATCH /api/v1/hotspots/{hotspot_id}` → Response (200): `Hotspot`

### Update hotspot position

`PUT /api/v1/hotspots/{hotspot_id}/position`

Request:
```json
{ "yaw": 10, "pitch": -5 }
```

Response (200): `Hotspot`

### Delete hotspot

`DELETE /api/v1/hotspots/{hotspot_id}` → Response (204)

## Floor plans (MVP)

Floor plan schema is defined in `../00-conventions.md`.

### List floor plans

`GET /api/v1/tours/{tour_id}/floor-plans`

Response (200):
```json
{ "items": [], "total": 0, "page": 1, "page_size": 50, "total_pages": 1 }
```

### Create floor plan

`POST /api/v1/tours/{tour_id}/floor-plans`

Request:
```json
{ "name": "Ground", "floor_number": 0, "image_file_id": "string" }
```

Response (201): `FloorPlan`

### Replace markers (bulk)

`PUT /api/v1/tours/{tour_id}/floor-plans/{floor_plan_id}/markers`

Request:
```json
{ "markers": [{ "scene_id": "string", "x": 50, "y": 20 }] }
```

Response (200): `FloorPlan`

### Delete floor plan

`DELETE /api/v1/tours/{tour_id}/floor-plans/{floor_plan_id}` → Response (204)

## Public viewing (MVP)

### Get public tour

`GET /api/v1/public/tours/{tour_id}`

Response (200):
```json
{
  "tour": {},
  "scenes": [],
  "hotspots": [],
  "floor_plans": []
}
```

The payload MUST only include data for `visibility=public|unlisted` tours.

## Analytics (MVP)

Analytics event naming is defined in `../00-conventions.md`.

### Ingest an analytics event

`POST /api/v1/public/events`

Request:
```json
{
  "tour_id": "string",
  "session_id": "string",
  "event_type": "scene_view",
  "scene_id": "string",
  "occurred_at": "2026-01-07T12:34:56Z",
  "referrer": "https://example.com"
}
```

Response (204)

### Tour analytics summary

`GET /api/v1/tours/{tour_id}/analytics/summary?from=2026-01-01&to=2026-01-07`

Response (200):
```json
{
  "views": 123,
  "unique_sessions": 100,
  "top_scenes": [{ "scene_id": "string", "views": 50 }],
  "top_hotspots": [{ "hotspot_id": "string", "clicks": 20 }]
}
```

## AI jobs (Post‑MVP by default)

AI job schema is defined in `../00-conventions.md`.

### Create a job

`POST /api/v1/ai/jobs`

Request:
```json
{ "job_type": "hotspot_suggestions", "tour_id": "string", "input": {} }
```

Response (201): `AIJob`

### Get job

`GET /api/v1/ai/jobs/{job_id}` → Response (200): `AIJob`

### List jobs

`GET /api/v1/ai/jobs?page=1&page_size=20&status=queued|processing|completed|failed`

Response (200): pagination envelope of `AIJob`.

### Cancel job

`POST /api/v1/ai/jobs/{job_id}/cancel` → Response (204)

## Error codes (canonical)

The backend SHOULD use stable `error.code` values. Recommended codes:
- `unauthorized`
- `forbidden`
- `not_found`
- `validation_failed`
- `rate_limited`
- `conflict`
- `internal`

**Document Links**:
- [Architecture](architecture.md) ← Previous: System architecture
- [Database Schema](database-schema.md) → Next: Database design