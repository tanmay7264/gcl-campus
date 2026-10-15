# WeSchool GCL World

Live: https://tanmay7264.github.io/weschool-gcl/

The current 3D showcase is in `world/`. It includes seven pre-rendered pages: the program, privacy notice and five student projects. Three.js and GSAP load progressively; readable content and project links are included in the HTML. Motion controls and a standard mobile/reduced-motion view are retained.

## Update

Use Node 22.13 or newer. Run `npm ci`, `npx tsc --noEmit` and `npm run build`. Commit the updated source, `world/` and lockfile to `main`. GitHub Pages is configured to publish the repository root. The build only clears its own `world/` output.

`world-src/` contains the public frontend. `world-public/` contains original project screenshots, branding and the overview PDF. The earlier website and poster remain in `site/`, `poster/` and the existing root files.

## Submissions and private inbox

GitHub Pages runs no server or database. Challenge links open the existing Sites form at https://weschool-gcl-world.vishalband2000.chatgpt.site/submit. Team inbox links open its protected `/admin` page. That service keeps submission data and authorization out of this public repository. Its inbox uses a separately configured, authorised manager account. Do not put credentials, submission records or owner email configuration in this repository.

The legacy Apps Script example is not connected to the current site. There is no email delivery or paid service requirement.

## References

Project images are cropped from the supplied student references. Proposed features and demonstration values are not presented as commercial outcomes, partner endorsements or verified impact.
