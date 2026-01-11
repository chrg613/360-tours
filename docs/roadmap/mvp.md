# MVP Specification

This document defines the Minimum Viable Product (MVP) for the 360 Tours Platform.

The MVP is the smallest set of features that delivers production-grade tour creation and public viewing with secure access control.

## MVP scope

### 1) Authentication (MVP)

- Users can register and log in.
- Auth uses access + refresh tokens.

### 2) Tours (MVP)

- Create, edit, delete tours.
- Manage tour `status` (`draft|published|archived`) and `visibility` (`private|unlisted|public`).
- Configure basic viewer settings (see `../00-conventions.md`).

### 3) Scenes (MVP)

- Upload panoramas.
- Create scenes from uploaded files.
- Reorder scenes.

### 4) Hotspots (MVP)

- Create/edit/delete hotspots with canonical types:
  - `navigation`, `info`, `link`, `audio`, `video`
- Place hotspots using yaw/pitch coordinates.

### 5) Public viewer (MVP)

- Public/unlisted tours render in a fast, mobile-friendly viewer.
- Viewer supports hotspots, floor plans, and fullscreen.

### 6) Embed (MVP)

- Iframe embed with URL parameters.
- Basic `postMessage` API for integrations.

### 7) Floor plans (MVP)

- Upload floor plan images and place scene markers.
- Viewer shows a floor plan overlay.

### 8) Branding (MVP)

- Per-tour branding: logo URL, primary color, watermark toggle.

### 9) Analytics (MVP)

- Ingest events from public viewing.
- Provide per-tour analytics summaries.

## Explicitly out of scope (Post‑MVP)

- AI authoring/automation features.
- Domain whitelabel/custom domains.
- Heatmaps, session recording, and real-time dashboards.

## MVP acceptance gates

- **Security**: private tours are never accessible without auth.
- **Performance**: public tour loads quickly on mid-tier mobile networks.
- **Reliability**: upload and publish flows are resilient to retries.

## References

- Schemas and conventions: `../00-conventions.md`
- API contract: `../technical/api-specification.md`
- Feature specs: `../features/README.md`
