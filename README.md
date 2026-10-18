# WeSchool GCL Campus & Command Centre

The WeSchool **Global Citizen Leaders (GCL)** system has four parts:
- a 3D campus website where companies learn how GCL works and submit a challenge;
- a private tracker for each company's challenge;
- a "My tasks" page for students, faculty and mentors;
- the **Command Centre** admin dashboard, where the GCL team manages challenges, people and tasks.

| | Live |
|---|---|
| GCL Campus | https://tanmay7264.github.io/gcl-campus/ |
| Command Centre (staff sign-in) | https://tanmay7264.github.io/gcl-campus/site/admin/ |

**How it's built:**
- **Frontend:** static HTML, CSS and JavaScript in `site/`, served by GitHub Pages.
- **Backend:** Google Apps Script in `apps-script/`, using a Google Sheet as the database and Gmail for email.

## Docs

- **[working.md](working.md):** how everything works. It covers architecture, data, flows, security, running locally, deploying and troubleshooting. **Start here.**
- **[design.md](design.md):** the full GCL design and UI spec (tokens, components, 3D campus, admin).
- **[design-system.md](design-system.md):** a brand-neutral design system to reuse in other projects.

## Quick start

```bash
node dev/test.js
```

```bash
node dev/server.js
```

The server opens on http://localhost:8766/site/ with demo data. Sign in to the admin as `admin@gcl.test` with password `gcl-demo-2026`.

Deploy the frontend by pushing to the `campus` remote (`tanmay7264/gcl-campus`). For the backend, run `npx @google/clasp push -f`, then update the existing deployment. See [working.md §10](working.md#10-change-and-deploy).

## Legacy: GCL World (`world/`)

`world/`, `world-src/`, `world-public/`, `scripts/build-world.mjs`, `vite.world.config.ts`, `package.json` and `tsconfig.json` are an earlier React + Vite "GCL World" build made for the original site (https://tanmay7264.github.io/weschool-gcl/).
- The live GCL Campus doesn't use them.
- They're kept for reference only.
- They build with `npm ci && npm run build` on Node 22.13 or newer.
- The original `weschool-gcl` repository stays frozen at that version, so don't push this project there.
