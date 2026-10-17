# Isometric Explorer — Design System

A reusable design and UI system for **interactive "living world" sites**. The page is a light, low-poly 3D isometric scene, with floating white UI cards around it that explain what is happening. Use it for any product that walks people through a process, a place or a portfolio (onboarding flows, campuses, offices, supply chains, programme journeys, case-study showcases).

It is brand-neutral: everything is driven by semantic tokens. Swap the theme (§2.6) and the components, layout, 3D style and interaction patterns stay the same.

> Reference implementation: GCL Campus (see `design.md`). Its values appear below only as the **example theme**.

---

## 1. Principles

1. **The world is the interface.** The 3D scene is the main content, not decoration. Every object a visitor can see can be clicked and explains itself.
2. **Calm, light, legible.** Light backgrounds, soft shadows, low-poly shapes, one accent at a time. The UI floats; it never boxes the scene in.
3. **Narrate, don't decorate.** Anything that moves must mean something, and a text panel says what it means in one plain sentence.
4. **One thing highlighted at a time.** A single "featured" item is marked consistently everywhere (map, list, tracker, panel) with the same accent.
5. **Show the visitor's role.** Steps or places where the visitor takes part are always flagged with the accent colour and a ★.
6. **Works without 3D.** All content is reachable through the 2D UI; the 3D layer is progressive enhancement.
7. **Respect motion preferences.** Everything animated has a still equivalent.

---

## 2. Design tokens

### 2.1 Colour roles

| Token | Role | Rules |
|---|---|---|
| `--primary` | Brand colour: primary buttons, selected state, active step, pins, rings | Text on it is white |
| `--primary-l` | Primary tint: secondary buttons, soft fills | Pair with `--primary` text |
| `--success` | Done, complete, solution, positive deltas | Never use it for the visitor's role |
| `--success-d` | Text on success tints | |
| `--success-l` | Success tint: done panels and chips | |
| `--accent` | **Attention / live / "you":** featured item, visitor touchpoints, live dot | One accent meaning per screen |
| `--accent-l` | Accent tint: role boxes, featured rows | |
| `--ink` | Primary text, dark bubbles (captions) | |
| `--muted` | Secondary text | |
| `--faint` | Tertiary text, inactive steps, placeholders | |
| `--line` | Borders, dividers, inactive connectors | |
| `--bg` | Page and 3D sky/ground background | Light, slightly cool |
| `--surface` | Cards, panels (`#FFFFFF`) | |
| `--danger` | Validation errors only (`#C0392B`) | |

**Category colours:** a small fixed set (3–6) for entity types (e.g. roles or departments). Use them for legend dots, character clothing, map tiles and list tiles. Each one must stay readable as a white-on-colour tile.

### 2.2 Typography

- **Font:** one neutral grotesk (example: **Inter** 400/500/600/700). **Icons:** one rounded icon font (example: **Material Symbols Rounded**, used as ligatures).

| Style | Size / weight | Use |
|---|---|---|
| Display / drawer title | 22 / 700 | Dialog headers |
| Panel title | 17 / 700 | Inspector heading (15 on phones) |
| Metric | 22 / 700 | KPI values |
| Body | 13–13.5 / 400 | Lead text, narrator sentence |
| Label | 12 / 600 | Rows, list titles, step names |
| Caption / chip | 10.5–11.5 / 600 | Chips, map labels, captions |
| Kicker | 10 / 700, uppercase, accent colour | Context line above titles (`STAGE 3 · PHASE II`) |
| Micro | 9.5–10 / 500–600 | Step sub-labels, phone step names |

Line-height 1.45 for body text and 1.2–1.3 for titles. Use sentence case everywhere except kickers.

### 2.3 Spacing

Base unit **4px**. Common steps: 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24.
- **Screen margins:** 24 (desktop), 10–12 (phone).
- **Gaps:** 12 between floating cards, 8–13 inside cards.
- **Card padding:** 12–20.

### 2.4 Shape & elevation

| Token | Value | Use |
|---|---|---|
| `--r` | 16px | Cards, panels, dialogs |
| radius-md | 10–12px | Buttons, inner panels, inputs |
| radius-sm | 8–9px | Tiles, icon buttons |
| pill | 999px | Chips, labels, pills, dots |
| `--shadow` | `0 8px 24px rgba(59,51,102,.10)` | Every floating card |
| label shadow | `0 4px 12px rgba(52,46,90,.14)` | Map labels |
| drawer shadow | `-20px 0 50px rgba(31,27,45,.15)` | Side drawers |

Cards are white with a 1px `--line` border plus `--shadow`. Never stack two shadows.

### 2.5 Motion

| Name | Spec | Use |
|---|---|---|
| enter | 0.35s `cubic-bezier(.2,.8,.2,1)`, fade + 16px slide | Panels, drawers |
| hover lift | 0.15s, translateY −1px | Buttons |
| grow | 0.8s ease-out | Data bars |
| pulse | 1.6–1.8s, expanding ring | Live dots, "accepting" pills |
| march | 0.6s linear loop | Connector between steps while moving |
| timebar | linear, duration = phase length | Narrator progress |
| camera tween | 0.9s, cubic ease-out | 3D fly-to, zoom, spin |

Under `prefers-reduced-motion`, turn off CSS animations and transitions, finish 3D walks instantly, make camera tweens jump, and stop idle gestures.

### 2.6 Theme template

```css
:root {
  /* Brand */
  --primary: #66518A; --primary-l: #F1EEF7;
  --success: #7AA342; --success-d: #3F5E1C; --success-l: #EAF4DD;
  --accent:  #E8892B; --accent-l:  #FFF3E6;
  /* Neutrals */
  --ink: #1F1B2D; --muted: #7A7590; --faint: #9A95AD;
  --line: #E6E2EF; --bg: #EEF1F8; --surface: #FFFFFF; --danger: #C0392B;
  /* Shape */
  --r: 16px; --shadow: 0 8px 24px rgba(59, 51, 102, .10);
}
```

*Example theme:* GCL (purple / green / orange). To re-theme, change these values plus the category colours and the 3D palette (§5.2). Keep the contrast pairs in §8.

---

## 3. Layout system

The 3D canvas fills the viewport (`position: fixed; inset: 0`). All UI is **fixed floating cards** in the four corners and edges, so the centre stays free for the scene.

### 3.1 Desktop regions (designed at 1440×900)

```
┌──────────────────────────── Top bar (64) ────────────────────────────┐
│ KPI cards (top-left)                     [controls]  ┌─ Inspector ─┐ │
│ Legend (below KPIs)                                  │  (360 wide) │ │
│                                                      │   scrolls   │ │
│                    3D scene (free centre)            └─────────────┘ │
│                                                      ┌─ List ──────┐ │
│ ┌─ Tracker / narrator (bottom-left) ─────────────┐   │ (360 × 256) │ │
│ └────────────────────────────────────────────────┘   └─────────────┘ │
└──────────────────────────── credit (bottom-centre) ──────────────────┘
```

- Right column (inspector + list) is **360px** with 24px margins; the inspector's max-height leaves room for the list.
- Map controls sit just left of the inspector.
- **Camera framing:** when something is selected, frame it about 190px left of centre so it lands in the free area beside the right column.

### 3.2 Breakpoints

| Width | Behaviour |
|---|---|
| > 1280 | Full desktop |
| ≤ 1280 | Drop lowest-priority KPI and secondary top-bar items |
| ≤ 1100 | Hide status pills; tracker wraps and narrator goes full width |
| ≤ 900 | **Phone/tablet layout** |

### 3.3 Phone / small-tablet layout (≤ 900)

Top to bottom:

1. **Top bar** (54): logo · credit · short primary CTA. Search hidden.
2. **Narrator card** (full width, 10px margins): featured pill, compact stepper that fits the width, one status line plus one sentence.
3. **Map:** only primary labels plus the featured/selected one. No legend or zoom buttons; use gestures.
4. **Bottom sheet:** peeks by default (header + status) and expands on tap (≤ 54dvh). Keep it peeked while the visitor is watching something.
5. **Picker strip** (bottom 0): a swipeable row of pill chips for the main collection; the featured chip is highlighted and auto-scrolls into view.

Use `dvh` units and `env(safe-area-inset-bottom)` on phones.

---

## 4. Components

### 4.1 Primitives

| Component | Spec |
|---|---|
| **Card** | Fixed, white, 1px line border, `--r`, `--shadow`, z-index 2 |
| **Button / primary** | `--primary` bg, white text, radius 10, padding 10×16, 13/600, optional leading icon |
| **Button / soft** | `--primary-l` bg, `--primary` text |
| **Icon button** | 32×32, radius 8, `--faint` icon; hover uses a soft fill |
| **Tile** | 30×30 (lg 40×40), radius 9 (lg 11), white glyph or initial on a colour, used to identify entities |
| **Chip** | Pill, 11/600, padding 3×8, neutral fill; variants: success, accent, info |
| **Live dot** | 8px circle, accent (or success when done), pulsing |
| **Kicker** | 10/700 uppercase accent text above a title |
| **Progress bar** | 6px pill track `--primary-l`, fill `--primary` |
| **Data bar** | Label + value row, then a 5px track with a coloured fill that grows on enter |

### 4.2 Top bar
Logo · product name and tagline · search (`/` focuses, Enter opens the first hit) · context selector · status pill (pulsing dot) · **one** primary CTA. A credit line can go bottom-centre on desktop or in the top bar on phones.

### 4.3 KPI card
Tile (category colour) · label (11 muted) · value (22/700) + delta (11, success colour) · sub-line (10 faint). Show at most 3; drop from the right as the screen narrows.

### 4.4 Legend
A card with a heading ("Who's here") and up to 4 chips (colour dot + name). Clicking a chip opens that category's card and makes its members glow in the scene.

### 4.5 Map labels (HTML pinned to 3D anchors)

| Variant | Look | Use |
|---|---|---|
| Primary | White pill, numbered badge (primary; ★ accent for the visitor's entry point) + name | Places, steps |
| Secondary | Translucent tag, small icon + name, muted text | Entities (teams, items) |
| Selected | Primary fill, white text | Current selection |
| Featured | Accent tint, accent ring, **LIVE** badge | The one featured item |
| Story caption | Dark (`--ink`) bubble with a pointer: bold subject + one-line status; follows the moving group | Narration on the map |

Position labels above the anchor (`translate(-50%, -100%)`). On phones hide secondary labels except featured or selected ones.

### 4.6 Inspector (detail panel)

Structure: **header** (lg tile · kicker · title · sub · [mobile chevron] · close) → **status row** (chip + muted line) → body → **sticky action row** (solid surface, top border).

Content types:

| Type | Body pattern |
|---|---|
| Welcome | Lead paragraph, credibility line, how-to box (legend dots + gestures), primary "Start the tour" + secondary CTA |
| Step / place | Status chip, progress bar, 3–4 detail rows (label left, value right), accent **"Your role"** box if the visitor takes part, evidence (data bars or bullet list), related-item card, primary + "Next →" |
| Item (case study) | Status (live / complete / archived), media thumbnail (opens viewer), stacked rows (uppercase labels), credits, primary + secondary |
| Category (people / group) | Lead sentence, stacked rows, related items, CTA |

Close returns to Welcome. On phones the panel becomes the bottom sheet (§3.3).

### 4.7 Stepper tracker + narrator

**Stepper:** up to 6 steps, each with a dot (30px; 24px on phones), name and sub-label. Connectors run between dots.

| Step state | Dot | Connector before it | Sub-label |
|---|---|---|---|
| done | success fill, ✓ | success | "Done" or phase |
| active · working | primary fill + 4px halo | — | "Happening now" |
| active · moving | accent fill, walking icon | accent dashes, marching | "On the way" |
| todo | neutral fill, faint number | line colour | phase |
| selected (non-live) | primary | — | "You are here" |

**Narrator panel** (beside the stepper; full width on phones):

| Phase | Panel |
|---|---|
| moving | Accent tint and border · live dot + "On the way to *Place*" + step pill · one plain sentence · who's involved (category dots) · ★ visitor role (or "X lead this step") · indeterminate sliding bar |
| working | Heading "Inside the *Place*" + a **3-item sub-step checklist** (done ✓ success · current accent, pulsing · upcoming faint); a bar fills over the phase duration. Phones show only the current sub-step |
| done | Success tint and border · 🎉 "Complete · *Item*" + "n of n ✓" · one sentence · **UP NEXT** row (tile + name · subtitle) · success countdown bar |

The title row carries a **featured pill** (tile + name, accent; success with a ✓ when done).

### 4.8 List / picker
A tabbed card: segmented tabs with counts, a one-line hint, then rows of tile + title + subtitle + chip.

| Row state | Look |
|---|---|
| Default | Neutral chip with category; on hover the chip swaps to "▶ Watch live" (primary) |
| Featured | Accent tint and inset border, subtitle "Live now · *phase*", accent "● Live" chip |
| Up next | Subtitle "Starting next", success "Up next" chip |
| Selected | Soft fill |

On phones this becomes the **picker strip** (pill chips, horizontal scroll, keeps its scroll position across re-renders).

### 4.9 Drawer (forms)
Native `<dialog>` sliding in from the right, 520px (full width on phones). Header with kicker, title and close; sub text; 2-column grid (1 column on phones); labels 12/600 above inputs; inputs radius 10, 1px line, focus ring `0 0 0 3px` primary tint; a checkbox row; a full-width primary submit; and an `aria-live` status line (success / error colours). Add a honeypot field. Show validation only after the first submit attempt.

### 4.10 Media viewer
Native `<dialog>`, centred, max 900px wide by 92vh, radius `--r`, scrollable, sticky close button.

---

## 5. 3D world style guide

### 5.1 Camera & controls
- **Orthographic isometric** camera: offset about `(60, 52, 60)`, tilt locked, spin allowed (90° rotate button), zoom about 0.7–3.6, pan clamped to the world bounds.
- **Controls:** drag to pan, scroll or pinch to zoom, right-drag (two-finger on touch) to rotate. Any drag cancels camera tweens and follow mode.
- **Fly-to on selection:** 0.9s tween to a framed target (§3.1) at a sensible zoom (places 1.5, groups 1.6–2.4).
- **Follow mode** for live content: the camera glides after the moving group (target lerp about `dt × 1.6`) until the visitor grabs the map.

### 5.2 World palette, light & atmosphere
- Matte standard materials (roughness ≈ 0.85–1), no metalness except water; flat shading on foliage.
- **Sky:** transparent WebGL canvas over a CSS vertical gradient (pale blue → mist → soft green). Add a light fog that matches the gradient so far ground fades into the horizon.
- **Tone mapping:** Neutral (exposure about 1.05) for natural light without shifting brand colours.
- **Light:** sky/ground hemisphere (cool blue above, grass green below, about 1.45) plus a **warm** directional sun (about 2.1) with soft 2048 shadows.
- **Ground:** natural grass with vertex-colour variation (`#B7D18C` blended with drier and lusher greens). Maintained lawns get **mowing stripes**. Paving is warm stone `#E6DCC8` with darker edging `#CDBFA6`.
- **Buildings:** warm white `#FBF8F2` with a stone plinth and cornice; white-framed blue glass windows `#8FB3D1`; coloured **roofs** carry meaning; signboards in the roof colour.
- **Nature:** several tree species (rounded shade trees, tall conifer-style trees, a flowering accent tree, palms at entrances), trunks `#8A6E52`, foliage in 4–5 greens via per-instance colour, plus hedges, shrubs and flower beds.
- **Context makes it real:** a boundary wall, roads with markings, slow traffic, parking and a surrounding landscape stop the world from floating in a void.

### 5.3 Modelling rules
- **Low-poly primitives only:** boxes, cylinders, cones, spheres, capsules. No textures except tiny canvas sprites if unavoidable.
- **Buildings:** box body + roof (hip roof = 4-sided cone with rotation baked into the geometry; or a flat cap) + door facing the main path + window grid. Add one detail per style (columns, tower, canopy, flag).
- **Repeated objects** (trees, lamps, benches, windows) use **InstancedMesh**; cache geometries and materials by key.
- Put groups and scenes on the **camera-facing sides** (+x / +z for this camera) so buildings never hide them.

### 5.4 Characters
- **Height** about 1.07 units, local +x = forward.
- **Rig:** hips → thigh → knee → shin + shoe (×2); capsule torso (flattened front-to-back); shoulder → upper arm → elbow → forearm + hand (×2); neck; head (slightly tall sphere) with 2 eye dots and a mouth; hair cap tilted to show the face, plus optional long hair or a bun.
- **Variety:** seeded random skin and hair tones (4 each) and hair style; outfit by **category** (shirt colour = category colour family; props such as backpack, notebook, briefcase or tie identify roles).

| Pose | Description |
|---|---|
| walk | Thigh ±0.5 rad, knee bend on the back swing, arms counter-swing ±0.4, bob 0.02 |
| sit | Thighs +1.45, knees −1.4, body −0.19, forearms on table, occasional gesture |
| talk | Arms low, periodic hand gesture, head turns |
| listen | Hands clasped in front, gentle nods |
| present | Pointing arm (+1.2 rad), the other gestures |
| idle | Arms relaxed, slow head turn |

**Rule:** nobody walks without a purpose. Ambient people sit, talk or listen in place. Only narrated actors move, and people who arrive early **stand still** (idle) while they wait.

### 5.5 Selection & highlight visuals
| Visual | Use |
|---|---|
| Edge outline (primary) | Selected building |
| Bobbing pin (primary) | Selected place |
| Pulsing ground ring (primary) | Selected place or group |
| Accent spotlight ring (+ faint fill) | The featured live group; grows while working |
| Emissive tint | Hover (buildings) / category glow (legend) |
| Floating card above a character | A carried object whose colour shows state (accent = problem, success = solution) |

---

### 5.6 Open-up interiors (signature pattern)
Places where work happens can open up so visitors see inside.

- **Two layers per building:** an outer **shell** (body, windows, door, roof; each building has its own fading materials and an instanced window mesh) and an **interior** (floor, two full back walls on the sides away from the camera, two low front walls with a door gap, props).
- **Open:** lerp `open` from 0 to 1 at about `dt × 2.5`. The roof lifts by about 1.6 units, the shell fades out (stop writing depth after the halfway point), interior walls scale up from the floor, props appear once the walls are about a third up, and the place label rises with the roof. **Close** by reversing the same steps.
- **When:** while the narrated group works inside, or while the place is selected. Close everything else.
- **Show the process, not decoration:** each room has 3–4 big readable props on its back walls or a central table, animated through the **3 sub-steps** with a function `fx(p, t)`, where p goes 0→1. Prefer appear/grow (sticky notes popping in, bars growing, lines drawing) and one **decision moment** (an item turns success-coloured and glows). Selecting a room when no story is inside shows its finished state.
- **Camera:** while following, zoom about 2.8 while the group works inside and about 1.7 while it walks.
- **Size rooms for people:** at least 3.5 × 3 units for 5 characters plus props. Keep standing spots clear of furniture.

## 6. Interaction patterns

### 6.1 Selection
One global `select(id)` drives everything: 3D highlight, camera fly-to, inspector content, tracker state, list highlight, and URL hash. Every way of pointing at something (3D object, label, list row, stepper step, card, legend chip) calls the same function.

### 6.2 Deep links
`#<id>` selects on load and on `hashchange`; selection updates the hash with `history.replaceState`. Invalid ids fall back to Welcome.

### 6.3 Live narrated story (signature pattern)
A scripted, looping story walks a group through the process so visitors *see* it happen.

- **Beats:** each beat has a place, positions for each actor (inside the building), poses, and a dwell time split into **3 equal sub-steps** (about 12s total).
- **Phases** sent to the UI: `walk` → `work (sub 0, 1, 2; duration)` → … → `done (next, duration)`.
- **Routing:** actors leave by the current door, follow the path network and enter by the next door. Never cut through walls.
- **Handover between items:** a celebration phase, then the finished group leaves while a **second pre-staged group** steps out, so the next item starts within seconds (no long walks).
- **Watch:** picking an item restarts the story with it, snaps the crew to its start positions, turns on follow mode, and **rolls on** to the next item when done.
- **Sync:** stepper, narrator, map caption, featured label, list row, spotlight and inspector status all update from the same event.

### 6.4 Tour
"Start the tour" → step 1 → **Next →** … → final CTA.

### 6.5 Keyboard
`/` search · `Enter` open first result · `Esc` close panel or dialog. Native `<dialog>` handles focus.

---

## 7. Content & copy guidelines

- **One plain sentence per step**, about 12–20 words, active voice, no jargon: *"Students build a working prototype. The company tries it and gives feedback."*
- **Role lines** use an imperative verb and at most 4 words: *"Test the prototype"*, *"Pick the best idea"*.
- **Status labels:** "On the way to …", "Happening now · …", "Complete · …", "Up next".
- **Kickers** give context in CAPS: `STAGE 3 · PHASE II`, `PARTNER PROJECT · DOMAIN`.
- **Numbers** only from real sources; never invent metrics. Label units (e.g. "% of respondents").
- **Labels:** a place or step label is a noun (≤ 3 words), and a CTA is a verb phrase (≤ 4 words).

---

## 8. Accessibility

- Semantic landmarks (`header`, `nav`, `aside`, `section`, `dialog`); every clickable element is a `<button>` or `<a>`.
- `aria-live="polite"` on the inspector and form status; `aria-current="step"` on the active step; `aria-label` on icon buttons.
- **Focus ring:** 3px accent outline, 2px offset.
- **Contrast pairs:** ink or muted on surface · success-d on success-l · dark accent (`#9A5413`) on accent-l · white on primary. Do not put `--faint` text on tints.
- Respect `prefers-reduced-motion` (§2.5). Provide a 2D fallback when WebGL or the CDN is unavailable.
- Touch targets ≥ 32px (strip chips ≥ 34px tall).

---

## 9. Implementation conventions

- **Stack:** static HTML + CSS + ES modules; Three.js via CDN import map (`three`, `three/addons/`). No build step.
- **Files:** `index.html` (UI shell) · `style.css` (tokens → primitives → components → breakpoints) · `main.js` (state, rendering, wiring) · `scene.js` (3D world, characters, story, camera, picking, labels) · `data.js` (copy and structure) · `<items>.js` (collection data).
- **Scene API:** `createScene(canvas, labelsEl, { onSelect, onStory, reduceMotion })` returns `{ select, addLabel, watch, zoom, spin, home, storyEl }`. Call `onStory` asynchronously (after the API is returned).
- **Render loop:** cap delta at 0.05s; project label anchors to screen space every frame.
- **Data-driven:** copy, steps and items live in data files; the 3D layout maps ids to positions.
- **Cache busting:** version every asset URL (`?v=N`) and bump N on each deploy.
- **Progressive enhancement:** load the 3D module with a dynamic `import()`; on failure, add `body.no-webgl` and keep the 2D UI working.
- **Performance budget:** ≤ about 60 characters, instanced repeats, a single shadow-casting light, pixel ratio ≤ 2.

---

## 10. New-project checklist

- [ ] Set the theme tokens (§2.6), category colours and 3D roof/role palette.
- [ ] Define the process steps: id, short name, place name, phase, plain sentence, who's involved, visitor role.
- [ ] Define the collection items (title, org, category, media, details).
- [ ] Lay out the world grid: places on a path loop, items in the centre, camera-facing gathering spots.
- [ ] Script the story beats (spots, poses, dwell times) and the handover.
- [ ] Write the Welcome copy, CTA and form fields.
- [ ] Check desktop (1440×900), small laptop (1280), tablet (768×1024), and phones (375×812, 360×640).
- [ ] Check reduced motion, the no-WebGL fallback, keyboard use and deep links.
- [ ] Set `?v=` and deploy.
