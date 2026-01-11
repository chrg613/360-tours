# Social Sharing Analytics

This document defines sharing behavior and how shares are tracked.

Related docs:
- Analytics events: `analytics.md`
- Canonical event names: `../00-conventions.md`

## MVP scope

- Provide a share link for published public/unlisted tours.
- Allow users to copy the link and (optionally) use the browser’s native share sheet.
- Record a `tour_share` analytics event.

## Share link requirements

- Public tours MUST have a stable, canonical URL.
- Unlisted tours MUST not be indexable and SHOULD use unguessable IDs.

## Rich previews (MVP)

For public/unlisted tours, the public tour page SHOULD render metadata for link unfurling:

- Open Graph: `og:title`, `og:description`, `og:image`, `og:url`
- Twitter cards: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`

The preview image SHOULD be either:
- `tour.thumbnail_url`, or
- the first scene thumbnail as a fallback.

## Tracking shares

When the user triggers a share action, emit:

- `event_type`: `tour_share`
- `event_data.platform`: `copy_link | native_share | whatsapp | facebook | twitter | linkedin | other`

## Post‑MVP scope

- QR code generation.
- Platform-specific engagement metrics (requires platform APIs and permissions).

**Document Links**:
- [Analytics](analytics.md) ← Previous
- [Features Index](README.md) → Back
