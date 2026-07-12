---
name: build-360-tour
description: Build a connected Matterport-style 360 virtual tour JSON from equirectangular panoramas.
---

# Build 360 Tour Skill

Your goal is to build a complete, navigable `tour.json` for a real estate property using only equirectangular panoramas as input.

## Core Directives

1. **Classify by Pixels, Not Filenames**
   - Rely exclusively on image content (e.g. fridge = kitchen, bed = bedroom).
   - Filenames are often scrambled or untrustworthy. Only use them as a weak tie-breaker.

2. **Detect Traversable Openings**
   - Scan each 360° image for real openings (doors, archways, sliding doors to balconies).
   - Ignore non-traversable windows and mirrors (mirrors reflect the SAME room, openings reveal a DIFFERENT room).
   - For each opening, guess the target room based on what is visible through it.
   - Record the center of the opening in degrees:
     - `yaw`: Horizontal center (-180 to 180, where 0 is image center).
     - `pitch`: Aim for the floor just inside the opening (typically ~-25 to -32).

3. **Build a Bidirectional Graph**
   - Connect the scenes using the detected openings.
   - Every navigation link should be reciprocal (if Living Room -> Kitchen, then Kitchen -> Living Room must exist).
   - Resolve ambiguous doors by layout logic so every room is reachable from the start scene.
   - Ensure at most one navigation hotspot per (scene, target). If two openings reach the same room, keep the nearer/clearer one.

4. **Define the Starting Scene and Ordering**
   - The Entrance or Foyer should be the first scene. If missing, fall back to Living Room.
   - Set the `initial_view` for each scene to face the room's main feature or the most important onward doorway (not a blank wall). `yaw` is the focal point, `pitch: 0`, `zoom: 0`.

5. **JSON Output Schema**
   Output a strictly formatted `tour.json` matching this structure:
   ```json
   {
     "title": "Property Name",
     "initial_scene_id": "entrance",
     "scenes": [
       {
         "id": "living_room",
         "title": "Living Room",
         "image_url": "relative_path_or_url.webp",
         "order_index": 1,
         "metadata": { "initial_view": { "yaw": 0, "pitch": 0, "zoom": 0 } },
         "hotspots": [
           {
             "id": "living_room->kitchen",
             "type": "navigation",
             "target_scene_id": "kitchen",
             "title": "Kitchen",
             "position": { "yaw": -88, "pitch": -28 }
           }
         ]
       }
     ]
   }
   ```
