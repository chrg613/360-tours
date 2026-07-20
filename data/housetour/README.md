# HouseTour-quality source video

Professional-style **360° equirectangular** house tour used as the primary
reconstruction dataset (replaces the old casual walkthrough clips).

## Source

| Field | Value |
|-------|--------|
| YouTube | https://www.youtube.com/watch?v=LrcJRLMpYvs |
| Format | 2160s equirect (`3840×2160` VP9, video-only) |
| Local file | `housetour_source.webm` (gitignored — download locally) |
| Download | see commands below |

Related research (trajectory + 3DGS *rendering* of already-reconstructed homes):

- Project: https://house-tour.github.io/
- Code: https://github.com/GradientSpaces/HouseTour
- Paper: arXiv:2510.18054 (`docs/refs/` or local PDF — not committed)

**Note:** HouseTour assumes **known poses + existing 3D reconstruction** and then
plans trajectories / language. Our pipeline still has to *build* the 3DGS from
the 360 video. This clip is a better capture class than the previous short
handheld walk.

## Download (do not commit the binary)

```bash
cd data/housetour
yt-dlp -f "313/bestvideo[height<=2160]" --no-audio \
  -o "housetour_source.%(ext)s" \
  "https://www.youtube.com/watch?v=LrcJRLMpYvs"
```

## Compress vs limiters

| Goal | Recommendation |
|------|----------------|
| **3D reconstruction quality** | **Do not heavily compress.** Keep 2160 equi as-is. |
| **Git / GitHub** | Never commit the video. Use this folder + README only. |
| **Modal / Supabase upload** | 150–400 MB is fine. Prefer **raising upload limits** over crushing bitrate. |
| **Dev convenience only** | Optional proxy at 1920×960 / CRF 23 for UI testing — **not** for final GS train. |

## Pipeline entry

```bash
# backend
python scripts/run_housetour_splat.py   # when available
# or Modal simple recipe against this path
```
