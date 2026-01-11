# Branding & Whitelabel

Branding controls how tours appear (logo, primary color, watermark).

Related docs:
- Canonical settings: `../00-conventions.md` (`BrandingSettings`)
- Embed options: `player-embed.md`

## MVP scope

- Per-tour branding settings:
  - `branding.logo_url`
  - `branding.primary_color`
  - `branding.show_watermark`
- The public player MUST render branding consistently across share links and embeds.

## Post‑MVP scope

- Account-level themes and multi-brand management.
- Domain whitelabel and custom domains.

## Uploading a logo (MVP)

1. Presign upload: `POST /api/v1/uploads/presign` (purpose: `branding_logo`).
2. Upload bytes to `upload_url`.
3. Complete: `POST /api/v1/uploads/complete`.
4. Update tour: `PATCH /api/v1/tours/{tour_id}` with `settings.branding.logo_url`.

## Watermark behavior

- If `branding.show_watermark=false`, the viewer MUST not render platform watermarks.
- This setting MUST be enforced server-side if it changes access to paid features.

**Document Links**:
- [Video Integration](video-integration.md) ← Previous
- [Analytics](analytics.md) → Next
