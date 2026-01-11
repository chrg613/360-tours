# 360 Tours Platform — PRD Suite

> Product and technical requirements for a Kuula-style 360° virtual tour platform, with optional AI-assisted tour creation and integrations with the 360Ghar ecosystem.

## What these docs define

This folder is the **source of truth** for the platform’s intended behavior and contracts.

The platform is expected to be implemented as:
- A **web frontend** (tour editor, public player, embed player)
- A **backend API service** (auth, tours/scenes/hotspots, uploads/media, analytics)
- **Storage + processing** (object storage, CDN, async jobs for thumbnails/optimizations)

The canonical backend contract is specified in:
- `technical/api-specification.md`

## Start here (recommended reading order)

1. `00-conventions.md` (terminology, schemas, API and analytics conventions)
2. `01-executive-summary.md`
3. `02-product-overview.md`
4. `technical/api-specification.md`
5. `roadmap/mvp.md`

## Status labels used throughout

- **MVP**: Required for v1 launch
- **Post‑MVP**: Planned, not required for v1
- **Optional**: May ship behind a flag or as an add‑on

## Documentation map

### Conventions
- `00-conventions.md`

### Core PRDs
- `01-executive-summary.md`
- `02-product-overview.md`
- `03-market-analysis.md`
- `04-business-model.md`
- `05-key-differentiators.md`

### Technical PRDs
- `technical/README.md`
- `technical/architecture.md`
- `technical/api-specification.md`
- `technical/database-schema.md`
- `technical/storage-strategy.md`
- `technical/360-viewer-implementation.md`
- `technical/deployment-options.md`

### Feature PRDs
- `features/README.md`
- `features/tour-creation.md`
- `features/hotspots-interactivity.md`
- `features/player-embed.md`
- `features/floor-plan-integration.md`
- `features/vr-webxr-support.md`
- `features/video-integration.md`
- `features/social-sharing-analytics.md`
- `features/branding-whitelabel.md`
- `features/analytics.md`

### AI PRDs
- `ai-features/README.md`
- `ai-features/automatic-tour-creation.md`
- `ai-features/scene-detection.md`
- `ai-features/auto-hotspot-placement.md`
- `ai-features/tech-stack.md`

### UX PRDs
- `ux/README.md`
- `ux/user-flows.md`
- `ux/ui-components.md`

### Roadmap
- `roadmap/README.md`
- `roadmap/mvp.md`
- `roadmap/ai-roadmap.md`

### Integration
- `integration/README.md`
- `integration/api-contracts.md`

## Maintenance rules (to keep this suite “perfect”)

1. When you change a domain concept (Tour/Scene/Hotspot/etc.), update:
   - `00-conventions.md`
   - `technical/api-specification.md`
   - `technical/database-schema.md`
   - Any affected feature PRDs
2. When you add a new doc, wire it into the nearest `README.md` index.
3. Avoid “implementation drift”: treat these docs as the contract, and update the code to match.

---

**Documentation Status**: Maintained
**Last Updated**: 2026-01-07
**Version**: 3.0