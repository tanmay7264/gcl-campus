# GCL Campus — Design & UI Specification

**Product:** GCL Campus, an interactive 3D site inviting companies to partner with WeSchool's Global Citizen Leaders (GCL) Program 2026-27.
**Live:** https://tanmay7264.github.io/gcl-campus/ (redirects to `/site/`)
**Repo:** https://github.com/tanmay7264/gcl-campus (git remote `campus`)
**Figma:** https://www.figma.com/design/K6qJrJdGbOvtqQVvJqBK1H. The frame "Desktop · College Campus (v2)" plus the "Design notes" panel; the original v1 frame is kept as history.
**Credit:** Designed and built by [Tanmay](https://www.tanmayportfolio.me/)

---

## 1. Purpose & concept

Companies receive the GCL invitation (letter + A1 poster with a QR code). The site has to show them, in under a minute, **what GCL is, how their problem moves through it, and where they are involved**, and then let them submit a challenge.

**Concept: a living college campus.** Companies bring problems; student teams solve them as live projects, guided by faculty.

- Each **GCL stage is a college building** on a walkable campus.
- Each **past partner project is a student team** working at a table under a glowing idea bulb.
- A **live project** plays continuously: a company mentor arrives with an orange *problem card*, and a faculty mentor and students carry it building by building. At Demo Day the card turns into a green *solution card*.
- A **Live Project Tracker** narrates what is happening in plain language, in sync with the people on the map.
- Visitors can **pick any project to watch its journey live**.

Visual reference: the "WareTrack" isometric strategy-game look (light low-poly world with floating white UI cards), re-themed from a warehouse to a college.

---

## 2. Design tokens

### 2.1 Colour

| Token | Value | Use |
|---|---|---|
| `--purple` | `#66518A` | WeSchool brand purple: primary buttons, active step, faculty, pins/rings |
| `--purple-l` | `#F1EEF7` | Soft purple backgrounds, secondary buttons |
| `--green` | `#7AA342` | WeSchool brand green: done steps, solution, stage roofs |
| `--green-d` | `#3F5E1C` | Green text on light green |
| `--green-l` | `#EAF4DD` | "Completed" chips, done panel |
| `--orange` | `#E8892B` | Companies, "your touchpoint", live/featured highlights |
| `--orange-l` | `#FFF3E6` | Role box, featured backgrounds |
| `--ink` | `#1F1B2D` | Primary text, story caption background |
| `--muted` | `#7A7590` | Secondary text |
| `--faint` | `#9A95AD` | Tertiary text, inactive steps |
| `--line` | `#E6E2EF` | Borders, dividers |
| `--bg` | `#EEF1F8` | Page and 3D scene background |

Supporting colours: live orange `#F0973A`; narrator panel `#FFF8F0` / border `#F6C795`; done panel `#F2F9EA` / border `#BFDDA0`; Deloitte blue `#4F86C6`; earth brown `#B98A55`.

**Role colours** (legend, people glow, "who's involved" dots): Companies `#E8892B` · Students `#3FA796` · Faculty `#66518A`.

**Project tile colours** (`PCOLOR` in `main.js`): Deloitte `#4F86C6`, IDFC FIRST Bank `#7B63A6`, Govardhan `#B98A55`, AuraPay `#7B63A6`, Kaleidosync `#B98A55`.

### 2.2 Typography

- **Font:** Inter (Google Fonts), weights 400 / 500 / 600 / 700.
- **Icons:** Material Symbols Rounded (ligatures, e.g. `directions_walk`, `celebration`, `replay`).

| Role | Size / weight |
|---|---|
| Inspector title (h2) | 17px / 700 (15px in the mobile peek) |
| Drawer title | 22px / 700 |
| KPI value | 22px / 700 |
| Body / narrator sentence | 13–13.5px / 400 |
| Rows, list titles | 12px / 600 |
| Kickers (e.g. `STAGE 3 · TRIMESTER II`) | 10px / 700, orange, uppercase |
| Captions, chips | 10.5–11.5px / 600 |
| Step labels | 12px (9.5px on phones) |

### 2.3 Shape, elevation, motion

- **Radius:** cards `16px` (`--r`), buttons `10px`, tiles `9px` (`11px` large), chips and pills `999px`.
- **Shadow:** `0 8px 24px rgba(59,51,102,.10)` on every floating card; labels `0 4px 12px rgba(52,46,90,.14)`.
- **Card:** white, 1px `--line` border, fixed-position over the 3D canvas.
- **Motion:** the inspector slides in (`.35s`, cubic-bezier(.2,.8,.2,1)), bars grow (`.8s`), the walking connector "marches" (`.6s` loop), and the live dot pulses (`1.6s`). The timebar fills over the stage duration.
- **Reduced motion** (`prefers-reduced-motion`): all CSS animation off; in 3D, walks complete instantly, camera tweens jump, and idle gestures stop.

---

## 3. Layout

The 3D canvas fills the viewport (`position: fixed; inset: 0`). Every UI element is a fixed card floating above it.

### 3.1 Desktop (> 1280px, designed at 1440×900)

| Element | Position / size |
|---|---|
| Top bar | top 0, full width, 64px, white, bottom border |
| KPI cards | top 84, left 24, gap 12 |
| "Who's on campus" legend | top 176, left 24 |
| Map controls (+ − rotate home) | top 84, right 404 (left of the inspector) |
| Inspector | top 84, right 24, width 360, max-height `100vh − 388px`, scrolls |
| Live Project Tracker | bottom 24, left 24, max-width `100vw − 432px` |
| Projects list | bottom 24, right 24, 360 × 256 |
| Credit | bottom 4, horizontally centred |

When something is selected, the camera frames it **190px left of centre**, so it sits in the free area beside the inspector.

### 3.2 Breakpoints

| Width | Changes |
|---|---|
| ≤ 1280px | Hide the 3rd KPI card and the program selector |
| ≤ 1100px | Hide the "Accepting challenges" pill; tracker wraps, narrator panel goes full width |
| ≤ 900px | **Phone/tablet layout** (below) |

### 3.3 Phone / small tablet (≤ 900px)

Top to bottom:

1. **Top bar** (54px): logo, credit text (centred, 10px), "+ Submit" (short label). Search and program selector hidden.
2. **Narrator** (top 62, 10px side margins): featured company pill, 6 steps that fit the width (24px dots, 9.5px labels), and a compact "Happening now" line plus one sentence.
3. **Map:** only stage labels, the featured/selected team label and the story caption. Legend and zoom buttons hidden; drag to pan, pinch to zoom.
4. **Inspector bottom sheet** (bottom 74px, rounded top 20px, max-height `54dvh − 74px`): **peeks** by default (header + status only) and expands when tapped. Picking a project keeps it peeked, so the live feed stays visible.
5. **"▶ Watch a project live" strip** (bottom 0): a swipeable row of pill chips (tile + company name); the featured chip is orange and scrolls into view when the featured company changes.

---

## 4. Components

### 4.1 Top bar
WeSchool logo (`assets/weschool-logo.png`), "GCL Campus / Global Citizen Leaders"; search (`/` shortcut, Enter opens the first result); program selector "GCL 2026-27 · Trimester II · Module I"; green pulsing "Accepting challenges" pill; primary **Submit a Challenge** button, which opens the form drawer.

### 4.2 KPI cards
Tile + label + value + green delta + sub-line:
- **5** Partner projects · *Deloitte · IDFC · +3* · past GCL cohorts
- **4** Industry touchpoints · *online or in person* · after you share a challenge
- **5** Journey stages · *challenge → solution* · design-thinking flow

### 4.3 Legend — "Who's on campus"
Three chips: **Companies** (orange), **Students** (teal), **Faculty** (purple). Clicking one opens that group's card in the inspector and makes everyone in that role glow on the map.

### 4.4 Map labels (HTML pinned to 3D anchors)
- **Stage label:** white pill, numbered badge (purple; ★ orange for Industry Gate) + building name.
- **Team label:** translucent tag with a `groups` icon + company name; `WeSchool Main Block` uses `account_balance`.
- **Featured team label:** orange background and ring, plus a **LIVE** badge.
- **Selected label:** purple fill, white text.
- **Story caption:** dark (`--ink`) bubble with a pointer that follows the live group. It shows the company name plus "Walking to *Building*", "*Stage* · *Building*", or "✓ Solution delivered · Up next: *Company*". Click it to open that stage.

### 4.5 Inspector — content states

| State | Header (tile · kicker · title · sub) | Body |
|---|---|---|
| **Welcome** (nothing selected) | school icon · `WELCOME · GCL 2026-27` · "Welcome to the GCL Campus" | Pitch paragraph, CCL/DI line, a role legend in a how-to box, **Start the tour** / Submit a Challenge |
| **Stage** | stage number (★ orange for Challenge) · `STAGE n · TRIMESTER …` · stage title · building | Touchpoint chip + "Step n of 6", progress bar, 4 detail rows, **Your role** box (if a company touchpoint), evidence (IDFC % bars at Insights, otherwise past-project bullets), project card, **View … project** / **Next stage →** |
| **Project** | company initial · `PARTNER PROJECT · DOMAIN` · title · company | Status chip (**● Live feed playing** / **✓ Project complete · Up next** / **Live project · completed**), poster thumbnail, Challenge / Stakeholders / Insight / Prototype / Solution, team & mentors, **Replay from start** / View poster |
| **People** (Companies / Students / Faculty) | role icon in role colour · role kicker · title | Lead sentence, 4 rows, first 3 project cards, a role-specific CTA, How it works |

The header also has a mobile-only expand/collapse chevron and a close (✕) button, which returns to Welcome. On desktop the action row is sticky at the bottom of the inspector with a solid white background.

### 4.6 Live Project Tracker

The left side holds the title, the featured company pill and a 6-step stepper. The right side holds the narrator panel.

**Steps:** Challenge ★ · Stakeholders 1 · Journey 2 · Insights 3 · Prototype 4 · Solution 5. Step states: `done` (green ✓, green connector), `active` (purple dot with halo), `todo` (grey). Clicking a step opens that stage.

**Narrator states** (shown when nothing is selected, or when the selected project is the one playing):

| Phase | Steps | Panel |
|---|---|---|
| **walk** | Active dot turns orange with a walking icon; the previous connector "marches" | "On the way to *Building*", Step n of 6, the plain sentence, who's involved, ★ Company role, indeterminate sliding bar |
| **work** | Active dot purple, "Happening now" | "Happening now · *Building*", same body, bar fills over the stage time |
| **done** | All 6 ✓ "Done"; company pill turns green with a ✓ | Green panel: 🎉 "Project complete · *Company*", "6 of 6 ✓", the next-company line, **UP NEXT** tile + company · project title, green countdown bar |

When something else is selected, the tracker shows "You are here" on that stage and a project card on the right (*Example for this stage* / *Completed project*).

**Plain-language copy** (`data.js → plain`, `you`):

| Step | Sentence | Company's job |
|---|---|---|
| Challenge | The company explains its real business problem to a WeSchool faculty mentor. | Share your challenge |
| Stakeholders | Students list everyone the problem affects. The company helps sharpen the brief. | Fine-tune the brief |
| Journey | Students step into the customer's shoes to find what frustrates them. | Students lead this step |
| Insights | Students share 3 promising ideas. The company says which one to build. | Pick the best idea |
| Prototype | Students build a working prototype. The company tries it and gives feedback. | Test the prototype |
| Solution | Students present a business-ready solution. The problem card turns into a solution. | Attend Demo Day |

### 4.7 Projects list
- Tabs: **Stages 6 · Projects 5 · Your role 5**, with the hint "Pick a project to watch its journey live on the map".
- Row: tile, name, sub-line, chip.
- Row states: **featured** (orange tint, "Live now · *Stage*", **● Live** chip); **up next** during a handover ("Starting next", green **Up next** chip); others show their domain chip, which swaps to **▶ Watch live** on hover.
- Clicking a project row starts its live feed.

### 4.8 Submit-a-Challenge drawer
Native `<dialog>`, slides in from the right (520px).
- **Fields:** Organisation*, Your name*, Designation, Work email*, Phone, Challenge type* (Industry · Social · Sustainability/SDG · Specific business issue · Survey/research · Process needing intervention), Challenge statement* (min 30 characters), Supporting link, "I'd like to be an Industry Mentor", plus a hidden honeypot field.
- Native validation; invalid fields get a red border after the first submit attempt.
- **Status:** "not connected" until `SCRIPT_URL` is set (see §8).

### 4.9 Poster modal
Native `<dialog>` showing the full student poster image (`assets/poster-*.jpg`), with a sticky close button.

### 4.10 Credit
"Designed and built by **Tanmay**". Only "Tanmay" is linked (https://www.tanmayportfolio.me/, new tab, `rel="noopener"`).

---

## 5. 3D campus (Three.js, `site/scene.js`)

### 5.1 Rendering & camera
- Three.js 0.169 via CDN import map, plus `MapControls`. WebGL with antialiasing, PCF soft shadows, hemisphere light, and a directional "sun" (2048 shadow map).
- **Orthographic isometric camera:** offset `(60, 52, 60)`, frustum half-height 15 (widened on portrait screens), tilt locked, spin allowed.
- **Zoom** 0.7–3.6, default 0.84. Pan is clamped to ±13 units. The default look-at is nudged (`HOME`) so the Industry Gate clears the KPI cards.
- **Camera tweens:** 0.9s cubic ease-out. Dragging cancels a tween and stops the follow mode.
- **Follow mode** (while watching a project): the camera glides after the live group. Grabbing the map hands control back to the visitor.
- No WebGL or no CDN: the page keeps working (lists, tracker, inspector), shows a note, and adds `body.no-webgl`.

### 5.2 Campus layout (grid units 0–24, centred at the origin)

| Building (stage) | Grid x, z | Size w×d×h | Roof | Style |
|---|---|---|---|---|
| Industry Gate (Challenge) | −1, −1 | 2.6×2.4×1.3 | `#F0973A` | hip roof, plus an orange arch over the entry path |
| Stakeholder Studio | 7, −0.6 | 3×2.4×1.6 | `#8DBA4E` | hip |
| Design Lab (Journey) | 13, −0.6 | 3×2.4×1.5 | `#8DBA4E` | hip |
| Research Library (Insights) | 21.9, 6 | 2.6×3.4×2.0 | `#8DBA4E` | flat, with columns |
| Innovation Lab (Prototype) | 21.9, 12.5 | 2.6×3.2×1.7 | `#8DBA4E` | flat |
| Demo Day Auditorium (Solution) | 12.5, 21.9 | 4.2×2.8×2.2 | `#7B63A6` | hall, with a canopy and a presentation screen beside it |
| WeSchool Main Block | 4.6, 21.9 | 4.4×2.6×2.4 | `#66518A` | hip, with clock tower and waving flag |

**Grounds:** a path loop (3→21), cross paths, four quad lawns, a plaza with fountain (pulsing spout), and an entry spur through the gate. Kaleidosync's silk-farm field sits outside the west path. Trees, lamp posts and benches are **instanced**, and building windows are a single instanced mesh. Every building has a door facing the quad.

**Student teams** (one per past project, at a round table with laptops and a glowing bulb): IDFC (7.6, 7.6), Deloitte (16.4, 7.6), Govardhan (7.6, 16.4), AuraPay (16.4, 16.4), Kaleidosync (0.4, 14.8).

**Selection visuals:** purple edge outline, bobbing purple pin, and a pulsing ring (team selection shows the ring only). Hovering a building tints it. The **orange spotlight ring** under the live group grows while the group is working.

### 5.3 People
Jointed low-poly figures, about 1.07 units tall, facing local +x. Each has two-segment legs with shoes, a capsule torso, two-segment arms with hands, a neck, a head with eyes and mouth, and a hair cap. Hair styles: short, long, or bun; skin and hair tones are seeded per figure.

| Role | Outfit |
|---|---|
| Students | t-shirt or hoodie (bare forearms on about half), jeans, white sneakers, backpack (about 55%) |
| Faculty | purple blazer, white collar, notebook in hand, some with grey hair |
| Company mentors | navy suit, white collar, orange tie, briefcase, plus a floating **problem card** (orange) that becomes a **solution card** (green) |

**Poses** (`animate()`): `walk` (leg and arm swing, knee bend, bob) · `sit` (on stools and benches, arms on table, occasional gesture) · `talk` (hand gestures, head turns) · `listen` (hands clasped, nods) · `present` (pointing) · `idle`.

**Static scene:** seated students and a standing faculty mentor at each team table, and students chatting on benches. Nobody wanders; the only walking is the live story.

### 5.4 Live story choreography
Cast: one company mentor, one faculty mentor and three students. Two of each crew alternate, so the next one can get ready while the last one leaves. Walking speed is 1.6 units/s along the paths, taking the shorter way round the loop. Groups gather on the **camera-facing side** of each building.

| Beat | Where | Who / poses | Time at stage |
|---|---|---|---|
| 0 Challenge | Inside the Industry Gate arch | Mentor arrives and talks to the faculty mentor; students wait at the studio | 8s |
| 1 Stakeholders | In front of Stakeholder Studio | Everyone talks and listens | 8s |
| 2 Journey | In front of Design Lab | Students lead; the mentor stands back | 8s |
| 3 Insights | South side of Research Library | Students present to the mentor | 8s |
| 4 Prototype | South side of Innovation Lab | The mentor tries the prototype and talks | 8s |
| 5 Solution | Demo Day screen | Students present; mentor and faculty watch; card turns green with 4s left | 9s |
| Handover | Demo Day → Main Block, Gate → home | Finished team walks to the Main Block, the mentor leaves with the green card, and a fresh team steps out of the Gate and Studio | 7s |

Then the next company (in project order) walks in. A full cycle takes about 80s. Each beat sends `onStory({ stage, project, phase: 'walk' | 'work' | 'done', duration, next })` to the UI.

**Watching a project** (`map.watch(id, restart)`): the story restarts with that company, the crew takes its starting places, the new mentor walks in (first beat about 4s later), and the camera follows. A watched feed **rolls on to the next company automatically** after its handover. The story pauses while the browser tab is hidden.

---

## 6. Interaction model

- **Selectable things:** stages (buildings, labels, tracker steps, list rows), projects (teams, labels, list rows, cards), and people groups (legend chips, or clicking a person).
- **Deep links:** `#<stage>` (e.g. `#insights`), `#<project>` (e.g. `#aurapay`, which starts its live feed), `#students` / `#faculty` / `#companies`. The URL hash updates on selection; invalid hashes fall back to Welcome.
- **Keyboard:** `/` focuses search · `Enter` in search opens the first result · `Esc` closes the panel. Native `<dialog>` focus handling applies to the drawer and the poster.
- **Search** filters stages and projects together across all their text.
- **Tour:** Start the tour → Challenge → Next stage → … → Submit a Challenge.

---

## 7. Data model & files

```
GCL/
├── index.html              # redirects to site/
├── design.md               # this document
├── GCL-Poster-A1.pdf       # A1 print poster (QR → gcl-campus site)
├── poster/poster.html      # poster source (export with headless Chrome --print-to-pdf)
├── assets/                 # weschool-logo.png, poster-{deloitte,idfc,govardhan,aurapay,kaleidosync}.jpg
├── apps-script/Code.gs     # Google Sheet receiver for the challenge form (not yet deployed)
└── site/
    ├── index.html          # UI shell: top bar, KPIs, legend, controls, inspector, tracker, list, drawer, poster modal, credit
    ├── style.css           # tokens, components, breakpoints
    ├── main.js             # state, selection, inspector/tracker/list rendering, form, story wiring
    ├── scene.js            # 3D campus, people, story controller, camera, picking, labels
    ├── data.js             # STAGES (+ plain/who/you/live copy), ROLE, PEOPLE
    └── projects.js         # PROJECTS: id, org, domain, title, image, challenge, stakeholders, insight, prototype, outcome, team, mentor
```

**STAGE fields:** `id, plain, who, you, live, short, num, building, title, term, color, rows[[label, value]], role, eg (project id), evidence[[title, text]] | bars[[label, %, colour]]`.

**Content sources:** the WeSchool outreach letter, the GCL Process poster (trimester flow, 60/40 evaluation), and the five student posters (Deloitte, IDFC FIRST Bank, Govardhan Eco Village, AuraPay, Kaleidosync). The only numbers shown are those printed on the posters (e.g. IDFC's 80% / 77% / 66%).

---

## 8. Build, deploy & maintenance

- **No build step:** static files, Three.js from jsDelivr.
- **Local preview:** `python3 -m http.server 8765 --directory GCL`, then open `/site/` (configured in `.claude/launch.json`).
- **Deploy:** commit, `git push campus main`; GitHub Pages publishes the repo root in about a minute. The local `main` tracks `campus/main`. The old `weschool-gcl` repo (remote `origin`) is the old site and must not be pushed to.
- **Cache busting:** every asset URL carries `?v=N` (currently **13**) in `site/index.html` (CSS and main.js) and `site/main.js` (projects, data, scene imports). **Bump N on every deploy**, or returning visitors may mix old and new files.
- **Connect the form:** deploy `apps-script/Code.gs` as a Google Apps Script Web App (Execute as me, access Anyone) and paste its `/exec` URL into `SCRIPT_URL` at the top of `site/main.js`.
- **Add a partner project:**
  1. Add an entry to `projects.js` and a poster to `assets/`.
  2. Add a colour in `PCOLOR` (`main.js`).
  3. Add a table position to `TEAMS` (`scene.js`); it joins the story rotation automatically.
  4. Update the KPI count.
- **Poster QR:** `SITE_URL` in `poster/poster.html`; re-export the PDF after changing it.

---

## 9. Accessibility & performance notes

- Semantic landmarks (`header`, `nav`, `aside`, `section`); buttons for every clickable element; `aria-live` on the inspector; `aria-current="step"` on the active step; a visible orange focus ring.
- Respects `prefers-reduced-motion`. Text contrast follows the token pairs above (ink and muted on white, dark green on light green, dark orange on light orange).
- **Performance:** instanced trees, lamps, benches and windows; cached geometries and materials; about 40 figures (23 at tables, 8 on benches, 2 crews of 4, 2 company mentors); shadow map 2048. The animation loop delta is capped at 0.05s.
- **Known limits:** the story clock pauses in background tabs; people are hit-testable even when hidden; the 3D view needs WebGL (falls back to the 2D UI).
