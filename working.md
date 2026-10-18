# How the GCL system works

This file explains how the WeSchool **Global Citizen Leaders (GCL)** system works end to end: what each part does, how data moves, where it is stored, who can do what, and how to run, change and deploy it.

For visual design (colours, components, the 3D campus), see `design.md`. For the brand-neutral design system, see `design-system.md`.

---

## 1. The big picture

GCL invites companies to share a real business or social challenge. A team of Post Graduate management students then turns it into a researched, prototyped, commercially feasible solution over two trimesters, guided by WeSchool faculty and the company's own mentor.

The system has four audiences:

| Who | What they use | Sign-in? |
|---|---|---|
| **Companies (prospects)** | The poster (QR code), then the **3D GCL Campus** website. There they learn how GCL works and submit a challenge. | No |
| **Companies (partners)** | A **private challenge tracker** link, received by email, showing where their challenge stands. | No (secret link) |
| **Students, faculty, mentors, other stakeholders** | A **private "My tasks" page**, received by email, where they update the status and progress of their tasks. | No (secret link) |
| **GCL team (staff)** | The **Command Centre** admin dashboard: pipeline, people, tasks, emails, insights. | Yes (email + password) |

```
 Poster (QR) ─▶ GCL Campus (3D site) ──"Submit a challenge"──┐
                                                             ▼
                                         ┌──── Apps Script web app (backend, runs as the owner) ────┐
 Command Centre (admin) ◀── token API ──▶ │  Code.gs · Auth.gs · Crm.gs · People.gs · Emails.gs ·    │
 Company tracker   ◀──── secret link ───▶ │  Demo.gs                                                 │
 My tasks page     ◀──── secret link ───▶ │  Google Sheet = database · Gmail (MailApp) = email ·     │
                                         │  time trigger = weekly digest                            │
                                         └──────────────────────────────────────────────────────────┘
```

- **Frontend:** plain HTML, CSS and JavaScript modules, with no build step. It is served by **GitHub Pages**.
- **Backend:** a **Google Apps Script** web app bound to a Google Sheet. The Sheet is the database, and Gmail sends the email.
- **Cost:** no servers, no hosting fees and no third-party services.

---

## 2. Live addresses

| What | URL |
|---|---|
| GCL Campus (3D site; the poster QR points here) | https://tanmay7264.github.io/gcl-campus/ (redirects to `/site/`) |
| Command Centre (admin) | https://tanmay7264.github.io/gcl-campus/site/admin/ |
| Company tracker | `https://tanmay7264.github.io/gcl-campus/site/track/#<trackToken>` |
| My tasks (stakeholders) | `https://tanmay7264.github.io/gcl-campus/site/tasks/#<accessToken>` |
| Backend API (Apps Script web app) | `https://script.google.com/macros/s/AKfycbweKcjWpQeEY_NZBNFdS3mjXZIZNKd2e99bRk5fGL89_-qAKMldAvrN61NtBALL1aqG/exec` |
| Database (Google Sheet "GCL Challenge Submissions") | https://docs.google.com/spreadsheets/d/1NbKe_Zc7IRJ58F6L13jMAsAbol_quk_T5SVmgZdOLac/edit |
| Source repository (deploys to Pages) | `tanmay7264/gcl-campus` (git remote `campus`) |
| Old site, kept as-is (do not push here) | https://tanmay7264.github.io/weschool-gcl/ (repo `tanmay7264/weschool-gcl`, remote `origin`, frozen at `5e0dcf3`) |

---

## 3. Repository map

```
GCL/
├── index.html              redirect → site/
├── site/                   everything served to browsers
│   ├── index.html, main.js, style.css   3D GCL Campus page + UI (inspector, tracker, lists, challenge form)
│   ├── scene.js            Three.js campus: buildings, people, story animation, auto-camera
│   ├── data.js             GCL stages, roles, people cards, "Why partner" copy
│   ├── projects.js         the 5 past partner projects
│   ├── api.js              the one client for the backend (fetch → Apps Script) + esc()
│   ├── crm-stages.js       shared lists: challenge STAGES, PERSON_TYPES, TASK_STATUSES
│   ├── admin/              Command Centre (index.html, admin.js, admin.css)
│   ├── track/              company challenge tracker (index.html, track.js)
│   └── tasks/              stakeholder "My tasks" page (index.html, tasks.js)
├── apps-script/            the backend, pushed to Google with clasp
│   ├── Code.gs             API dispatcher (doPost), Sheet storage helpers, Sheet menu
│   ├── Auth.gs             staff accounts, password hashing, sessions, invites
│   ├── Crm.gs              challenges: submit, tracker, dashboard data, stage moves, notes, emails
│   ├── People.gs           stakeholders, tasks, My-tasks page API, task emails
│   ├── Emails.gs           email templates, HTML email shell, weekly digest
│   ├── Demo.gs             load / remove demo data
│   └── appsscript.json     runtime + web app settings (execute as owner, anyone can call)
├── dev/                    local tooling (never deployed)
│   ├── gas.js              mock of Apps Script (Sheets, Cache, Properties, Mail…) running the real .gs files in Node
│   ├── server.js           local preview of the whole site + API on http://localhost:8766, seeded with demo data
│   └── test.js             automated tests (node dev/test.js)
├── poster/poster.html      A1 poster source → GCL-Poster-A1.pdf (QR → the campus site)
├── assets/                 WeSchool logo, project posters, sign-in backdrop
├── .clasp.json             links apps-script/ to the Apps Script project
├── design.md               full GCL design & UI spec
└── design-system.md        brand-neutral design system
```

**Legacy in the repo, not used by the live site:**
- `world/`, `world-src/`, `world-public/`, `scripts/build-world.mjs`, `vite.world.config.ts`, `package.json`, `tsconfig.json` and `README.md` belong to an earlier "GCL World" React build made for the old `weschool-gcl` site.
- `README.md` describes that build, not this system.

---

## 4. The public website (GCL Campus)

`site/index.html` loads `main.js`, which lazy-loads `scene.js` (Three.js from a CDN).

- **3D campus:** an isometric college campus on a presentation plinth.
  - It has six stage buildings (Industry Gate → Stakeholder Studio → Design Lab → Research Library → Innovation Lab → Demo Day Auditorium), the WeSchool monument, student teams, faculty and company mentors.
  - **Live story:** a scripted crew walks a project through the stages. Buildings open up to show what happens inside at each step, and the **Live Project Tracker** narrates it in plain language.
  - **Auto-camera** follows the crew. It can be paused or resumed, and dragging or scrolling pauses it.
- **Panels:**
  - The inspector shows stages, projects, people and "Why partner".
  - The list has Stages / Projects / Your role. Picking a project starts its live feed.
- **Deep links:** `#insights`, `#aurapay`, `#why`, `#companies`, and similar.
- **Submit a Challenge** (drawer form) → `api('submitChallenge', formFields)`. On success the page shows the new ID (e.g. `GCL-26-004`) and a "Track your challenge" link. The same link is emailed to the company.
- **Without WebGL**, the lists and panels still work.

---

## 5. The backend (Apps Script)

### 5.1 How a request reaches it
Every browser call goes through `site/api.js`:

```js
fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ fn, args }) })
```

- **Why `text/plain`:** it keeps the request a "simple" CORS request, which Apps Script accepts without a preflight. Google answers with a redirect, which the browser follows to read the JSON reply `{ ok, value | error }`.
- **Allowlist:** `doPost` in `Code.gs` looks up `fn` in an **allowlist** (`API_FUNCTIONS`). Nothing else is callable.
- **Older pages:** form-encoded posts from older cached copies of the site are still accepted and treated as submissions.
- **Local preview:** on port 8766 the same client talks to `/api` on the dev server instead.

### 5.2 The web app identity
- **Runs as the owner:** the web app is deployed with **Execute as: me** and **Who has access: anyone**. It always runs as the Sheet owner (kt19051999@gmail.com), so it can read and write the Sheet and send Gmail.
- **Security in the code:** visitors cannot touch the Sheet directly. All checks (validation, sign-in, roles, which fields a stranger may see) happen in the `.gs` code.

### 5.3 Storage: the Google Sheet
Each tab is a table: row 1 holds the headers, and each further row is one record.
- **Reading:** `readAll_` reads a tab into objects keyed by header.
- **Writing:** `append_` / `appendMany_` add rows, and `write_` rewrites one row.
- **Locking:** all writes run inside `withLock_` (LockService), so simultaneous requests cannot clash.
- **Spreadsheet safety:** every text value passes through `clean_`, which trims it, limits its length and prefixes `'` when it starts with `= + - @`, so it can never run as a formula.

| Tab | One row per | Key columns |
|---|---|---|
| **Challenges** | challenge | `id` (GCL-26-001), organisation, contact name/email/phone, type, statement, mentor opt-in, **stage**, `stageAt`, priority, **owner** (staff email), facultyMentor, industryMentor, studentTeam, touchpoint date/label, **trackToken**, tags |
| **People** | stakeholder | `id` (P-001), **type**, name, email, organisation, role, **team**, challengeIds, active, **accessToken** |
| **Tasks** | task | `id` (T-001), challengeId, title, details, **assignees** (`P-001,team:Team A`), **due**, priority, **status**, **progress** (0–100), createdBy, completedAt |
| **Activity** | event (append-only audit log) | at, challengeId, user, kind (stage/note/email/assign/touchpoint/task), detail, **shared** |
| **Users** | staff account | email, name, role (Admin/Coordinator), active, salt, hash, invite code + expiry |
| Legacy form (migrated) | — | the original one-tab form data, already copied into Challenges |

- **ID numbers:** IDs come from counters in Script Properties (`SEQ`, `PSEQ`, `TSEQ`).
- **Secret links:** tracking and task links use random 32-character tokens.

### 5.4 Challenge lifecycle
`New → Under review → Accepted → Team formed → Stakeholder mapping → Customer journey → Insights → Prototype → Final presentation → Completed`, with **On hold** and **Declined** off the main path. This mirrors the campus story. The list lives in `Crm.gs` (`STAGES`) and `site/crm-stages.js`, and a test checks the two match.

### 5.5 Main flows

**A company submits a challenge** (`submitChallenge`)
1. The hidden honeypot field is checked; if it was filled in by a bot, the submission is silently dropped.
2. The fields are validated: organisation, name, valid email, a statement of at least 30 characters, and an `http(s)` link if one is given.
3. A row is written to Challenges with stage `new`, a new ID and a random `trackToken`. A shared "Challenge received" entry goes into Activity.
4. Emails go out: an **acknowledgement to the company** with its tracking link, and an **alert to every active Admin** with a link to the challenge.
5. The site receives `{ id, trackUrl }` back and shows them.

**The team moves a challenge** (`setStage`, from the Pipeline drag or the drawer buttons)
1. The server checks the session and that the user may edit this challenge.
2. It updates the stage and `stageAt`, then logs "Moved from X to Y" (shared, so it appears on the company tracker; On hold is not shared).
3. If "Email the company" was ticked, it sends that stage's template email, plus an optional personal note, and logs it.

**Other challenge actions**
- `updateChallenge`: owner, mentors, team, priority, tags and next touchpoint. A touchpoint is shared; ownership changes are internal.
- `addNote`: a note, either private or shared with the company.
- `previewEmail` / `sendEmail`: the email composer.

**The company checks progress** (`getTracking(trackToken)`)
- **Shown:** the organisation, type, the first 400 characters of the statement, the stage with its dates, the next touchpoint, the student team, the industry mentor, and Activity entries marked **shared**.
- **Never shown:** contact details, private notes, owners, or internal edits.

**Tasks and stakeholders** (`People.gs`)
- **People:** `savePerson` adds or edits one person. `importPeople` bulk-adds pasted lines (`Name, email, team/organisation`) and skips duplicates and invalid lines. Each person gets a secret `accessToken`.
- **Tasks:** `saveTask` creates or edits a task. Assignees can be people (`P-…`) and/or whole teams (`team:<name>`); a team means every active person whose `team` matches. Setting **Done** forces progress to 100% and stamps `completedAt`. With "notify" ticked, newly assigned people are emailed their task page link.
- **Other actions:** `remindTask` re-emails the assignees, and `deleteTask` removes a task.
- **Stakeholder updates:** `getMyTasks(accessToken)` / `updateMyTask` power the "My tasks" page. A person sees only tasks assigned to them or their team, and may change only those tasks' status, progress and note. Each update is logged as "Name (Type)" in the challenge timeline.

**Email** (`Emails.gs`, `MailApp`)
- **Sender:** messages go from the owner's Gmail with the display name "WeSchool GCL", and replies go to the staff member who acted.
- **Templates:** stage templates are plain text, so staff can edit them before sending. They are wrapped in a branded HTML shell with a button.
- **Weekly digest:** `weeklyDigest` emails all Admins on Mondays around 9am (once installed from the menu). It lists new challenges, touchpoints in the next 14 days, challenges stuck for more than 7 days, challenges with no owner, and **overdue tasks**.
- **Demo addresses:** anything at a `.example` address (demo data) is **never sent**; the system logs "not sent" instead.
- **Quota:** a personal Gmail can send to about 100 recipients a day.

---

## 6. Staff accounts, roles and security

- **Passwords:**
  - Each staff member (row in **Users**) has a random salt and a password hash (SHA-256, iterated 300 times).
  - Plain passwords are never stored or sent anywhere except at sign-in.
- **Sign-in and sessions:**
  - `login(email, password)` returns a random session token. It is kept in CacheService for **6 hours** and in the browser's sessionStorage, so it is forgotten when the tab closes.
  - **5 failed attempts** lock that email for 10 minutes.
  - Every protected API call starts with `requireUser_(token, role?)`.
- **Adding people:**
  - **The first Admin:** Sheet menu → **2. Add or reset a user**. You type the password in the Sheet prompt.
  - **Teammates:** Command Centre → **Team** → Add. They receive an **invite link** (valid 7 days) to choose their own password. "Resend invite" doubles as a password reset.
- **Roles:**
  - **Admin:** everything, including team management, demo data and deactivating people.
  - **Coordinator:** can see everything. Can act on challenges they **own** or **faculty-mentor**, and can **claim** unassigned ones. Can add people and create tasks. Can edit tasks they created or that belong to their challenges.
  - **Enforcement:** the **server** enforces all of this. The UI only hides or locks controls to match.
- **Secret links:**
  - Tracker and task links are unguessable tokens in the URL **hash** (`#…`). Browsers never send the hash to servers, so it stays out of logs and Referer headers.
  - Anyone holding a link can use it, so links are only emailed to their owner.
- **Escaping:** everything shown in the browser goes through `esc()`, and every email through `esc_()`. Exported CSV cells are guarded against spreadsheet formulas.

---

## 7. The Command Centre (admin) — what each screen does

| Screen | Purpose |
|---|---|
| **Command Centre** | KPI cards (new this week, live, awaiting review, touchpoints, mentor opt-ins, completed); click one to filter. **Needs attention** is a ranked to-do list with one-click fixes: unreviewed for 3+ days, touchpoint overdue, no owner, stuck 7+ days, touchpoint soon. Also upcoming touchpoints, **task deadlines**, charts (pipeline, types, 12-week submissions, workload per owner) and recent activity. |
| **Pipeline** | Kanban by stage. Drag a card → confirm → optional email to the company with a preview. Cards you can't edit are locked. |
| **Challenges** | Searchable, sortable table with filters (stage / type / owner / priority) and **CSV export**. |
| **People** | Every stakeholder, filtered by type. Add, **Import a list**, or open a person to see their tasks, linked challenges and private task link. |
| **Tasks** | KPIs (open, overdue, due in 7 days, blocked, done, average progress), filters, and a **Board** (drag between statuses) or **List**. A task form handles assignees (people/teams), deadline, status, progress, notify, reminder and delete. |
| **Partners** | Companies grouped by organisation; repeat partners flagged. |
| **Team** | Staff accounts: roles, deactivate, resend invite (Admin), and **demo data** load/remove. |
| **Challenge drawer** | Stage stepper and actions; the challenge; contact; owner, mentors, team and priority; next touchpoint; **tasks with overall progress**; **people on it**; email composer; tracking link and "See what they see"; notes (private or shared); full timeline. |

**Refreshing:** data loads once at sign-in with `getDashboard`, which returns challenges, people, tasks, users and the latest 600 activity entries. Each action re-fetches it. The ↻ button refreshes by hand.

---

## 8. Demo data

`Demo.gs` creates a realistic data set for demos:
- 38 challenges (`DEMO-01…38`) across every stage, with history and touchpoints;
- 3 demo staff, who have no password and cannot sign in;
- about 115 people: students in each team, faculty, company contacts and mentors, alumni;
- about 60 tasks (`DEMO-T…`) with deadlines and progress.

It is safe on the live system:
- **Labelled:** demo items show a "Demo" tag in the UI.
- **No emails:** every demo email address ends in `.example`, so nothing is ever sent to them.
- **Easy to undo:** **Remove demo data** deletes only `DEMO-…` records and demo staff, in one quick rewrite of each tab.
- **Where:** load and remove from the Sheet menu **GCL CRM**, or from **Team** in the Command Centre (Admin only). The local dev server seeds the same data.

---

## 9. Run it locally (no Google account needed)

```bash
node dev/test.js
```

This runs the real `apps-script/*.gs` files inside the Node mock. It covers submission and validation, formula-injection cleaning, sign-in throttling, roles, privacy of the tracker and task pages, emails, invites, the digest, people and tasks, and demo load/remove.

```bash
node dev/server.js
```

This serves the whole repo on http://localhost:8766, with the API at `/api` and seeded demo data:
- Campus: `/site/`
- Admin: `/site/admin/` (sign in with `admin@gcl.test` or `coord@gcl.test`, password `gcl-demo-2026`)
- Outbox of "sent" emails: `/dev/mail`

Data lives in memory and resets on restart. In Claude Code's browser pane this server is the `gcl-crm-dev` launch configuration.

---

## 10. Change and deploy

**Frontend (anything in `site/`)**
1. Edit, then check locally with `node dev/server.js`.
2. **Bump the cache version** `?v=N` on the files you changed, so returning visitors don't mix old and new files:
   - campus: `site/index.html` and the imports in `site/main.js`;
   - admin: `site/admin/index.html` and its imports;
   - tracker and task pages: their `index.html` and imports.
3. Commit and `git push campus main`. GitHub Pages rebuilds in about a minute.

**Backend (anything in `apps-script/`)**
1. Run `node dev/test.js`, which must pass.
2. Run `npx @google/clasp push -f` to upload the code. clasp is already signed in on this Mac (`~/.clasprc.json`).
3. Run `npx @google/clasp deploy -i AKfycbweKcjWpQeEY_NZBNFdS3mjXZIZNKd2e99bRk5fGL89_-qAKMldAvrN61NtBALL1aqG -d "what changed"`. This updates the **same** deployment, so the URL in `site/api.js` never changes. **Never create a new deployment**, because that changes the URL and disconnects the site.
4. If the code starts using a new Google service (e.g. Calendar), the owner must approve the new permission once. Open the Apps Script editor, run any function, and click **Review permissions** → Allow.

**Sheet menu "GCL CRM"** (appears when the Sheet is opened)
- **1. Set up GCL CRM:** creates or updates the tabs and migrates the old form data.
- **2. Add or reset a user:** adds a staff account with a password typed in the Sheet.
- **Install weekly digest:** adds the Monday trigger.
- **Show links:** shows the admin and site addresses.
- **Remove test challenges:** deletes challenges whose organisation starts with "TEST".
- **Load demo data / Remove demo data.**

---

## 11. Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| Form or admin says "Could not reach the server" | Offline, or the deployment URL changed. Check that `site/api.js` matches the deployment in §2. |
| An error mentioning `MailApp.sendEmail` permission | The owner hasn't approved email sending for this version. Do the step 4 permission approval in §10. |
| "Your session expired" | Sessions last 6 hours; sign in again. |
| "Too many failed attempts" | Wait 10 minutes, or reset the password (menu **Add or reset a user**, or an Admin's **Resend invite**). |
| A teammate never got the invite | Check their spam folder; then use **Resend invite**. Invites expire after 7 days. |
| Site shows old behaviour after a deploy | Bump `?v=N` (§10) and hard-refresh. Pages can take about a minute. |
| Tracker or task link says "not found" | The link was cut short, the person was deactivated, or the record was removed (e.g. demo data). |
| No emails to a contact | Their address ends in `.example` (demo), or the daily Gmail quota is used up. |
| Something looks wrong in the data | Open the Sheet: every change is in the **Activity** tab, with who and when. |

---

## 12. Design decisions in one place

- **Google Sheets as the database:** free, visible and editable by the team, and auditable. It is fine for hundreds of challenges and thousands of tasks. If it grows far beyond that, move to a real database behind the same `api()` contract.
- **One API entry point** (`doPost` plus an allowlist) and **one client** (`site/api.js`). The local mock runs the same code, so tests exercise the real backend logic.
- **Transparency by design:** an append-only Activity log with a per-entry `shared` flag drives the company tracker. Stakeholders update their own tasks through private links. The weekly digest surfaces anything slipping.
- **No accounts for outsiders:** companies and students use secret links. Only GCL staff have passwords.
