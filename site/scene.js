import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';

// Campus in grid units (0..24), centred at the origin.
const C = 12;
const at = (x, z, y = 0) => new THREE.Vector3(x - C, y, z - C);

// Buildings: [id, x, z, w, d, h, roofColour, style]. Stage buildings use stage ids; 'about' is the main block.
const BUILDINGS = [
  ['challenge', -1.6, -1.6, 3.6, 3.2, 1.5, '#F0973A', 'hip'],
  ['stakeholders', 6.4, -1.6, 4.2, 3.4, 1.7, '#8DBA4E', 'hip'],
  ['journey', 12.4, -1.6, 4.2, 3.4, 1.6, '#8DBA4E', 'hip'],
  ['insights', 21.7, 5.6, 3.6, 4.2, 2.0, '#8DBA4E', 'library'],
  ['prototype', 21.7, 12.2, 3.6, 4.0, 1.8, '#8DBA4E', 'flat'],
  ['solution', 11.8, 21.8, 5.6, 3.6, 2.3, '#7B63A6', 'hall'],
  ['about', 4.6, 21.9, 4.4, 2.6, 2.4, '#66518A', 'main'],
];
// Door wall + offset along it (building-local). Stage buildings open up to show their interior.
const DOORS = { challenge: ['z+', 0.4], stakeholders: ['z+', 0], journey: ['z+', 0], insights: ['x-', 0], prototype: ['x-', 0], solution: ['z-', 0], about: ['z-', 0] };
const FLOORS = { challenge: '#E8DCC8', stakeholders: '#E8DCC8', journey: '#E3E8F2', insights: '#E8DCC8', prototype: '#E3E8F2', solution: '#DCD3EA' };
// Student teams (one per partner project) around tables on the quad lawns.
const TEAMS = [['idfc', 7.6, 7.6], ['deloitte', 16.4, 7.6], ['govardhan', 7.6, 16.4], ['aurapay', 16.4, 16.4], ['kaleidosync', 0.4, 14.8]];
const PATHS = [[3, 3, 18, 1.4], [3, 19.6, 18, 1.4], [3, 3, 1.4, 18], [19.6, 3, 1.4, 18], [11.3, 4.4, 1.4, 15.2], [4.4, 11.3, 15.2, 1.4], [-5, 3, 8, 1.4]];
const LAWNS = [[4.4, 4.4, 6.9, 6.9], [12.7, 4.4, 6.9, 6.9], [4.4, 12.7, 6.9, 6.9], [12.7, 12.7, 6.9, 6.9], [-2.5, 13, 4.5, 8]];
const TREES = [[-3, 6], [-3, 9], [5.6, 1.4], [11.2, 1.6], [17, 0.8], [20.5, 1], [24.6, 3], [25.6, 10], [25.2, 17], [21.5, 24.5], [17.8, 24.8], [10.4, 24.6], [2.4, 24.4], [-2.8, 22.5], [5.2, 5.2], [10.4, 5.4], [13.6, 5.2], [18.6, 5.4], [5.4, 18.6], [10.4, 18.8], [13.6, 18.6], [18.8, 18.6], [-3.5, 12], [26, 21], [9.2, 10.4], [14.8, 13.6]];
const LAMPS = [[4.6, 2.6], [10.8, 2.6], [12.4, 2.6], [19.4, 2.6], [21.3, 11], [21.3, 17.4], [19.4, 21.4], [12.6, 21.4], [10.8, 21.4], [2.6, 8], [2.6, 16]];
const BENCHES = [[9.8, 13.4, 0], [14.2, 10.6, 0], [5.2, 13.2, Math.PI / 2], [18.8, 10.8, Math.PI / 2]];

const SKIN = ['#F1C9A5', '#D9A47A', '#B98058', '#8D5A3B'];
const HAIR = ['#2E2633', '#4A3426', '#1F1B2D', '#6B4A2E'];
const STUDENT_SHIRTS = ['#3FA796', '#5BB4D9', '#F2C14E', '#8DBA4E', '#E57A7A', '#5E8DD0'];
const ROLE_COLOUR = { students: '#3FA796', faculty: '#66518A', companies: '#E8892B' };

export function createScene(canvas, labelsEl, { onSelect, onStory, reduceMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); // throws without WebGL
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#EEF1F8');

  const mats = new Map();
  const mat = (c, key = c) => { if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })); return mats.get(key); };
  const mesh = (geo, m, x = 0, y = 0, z = 0, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; return o; };

  // Camera + controls (isometric-style orthographic, tilt locked, spin allowed)
  const FR = 15, OFFSET = new THREE.Vector3(60, 52, 60);
  const HOME = new THREE.Vector3(-2.2, 0, -1.4); // default look-at, nudged so the Industry Gate clears the KPI cards
  const camera = new THREE.OrthographicCamera(-FR, FR, FR, -FR, -200, 400);
  camera.position.copy(OFFSET);
  const controls = new MapControls(camera, canvas);
  controls.enableDamping = !reduceMotion; controls.dampingFactor = 0.08;
  controls.minZoom = 0.7; controls.maxZoom = 3.6; controls.zoomToCursor = true;
  controls.minPolarAngle = controls.maxPolarAngle = new THREE.Spherical().setFromVector3(OFFSET).phi;

  scene.add(new THREE.HemisphereLight('#FFFFFF', '#C9D2E6', 1.6));
  const sun = new THREE.DirectionalLight('#FFFFFF', 1.7);
  sun.position.set(18, 30, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 80 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(sun);

  /* ---------- Ground: lot, lawns, paths, plaza + fountain ---------- */
  const flat = (x, z, w, d, y, c) => { const m = mesh(new THREE.BoxGeometry(w, 0.02, d), mat(c), x - C + w / 2, y, z - C + d / 2, false); scene.add(m); };
  flat(-8, -8, 40, 40, -0.02, '#E3E8F2');
  flat(-1.5, -1.5, 27, 27, 0, '#F4F6FB');
  for (const [x, z, w, d] of LAWNS) flat(x, z, w, d, 0.008, '#D8EBC2');
  for (const [x, z, w, d] of PATHS) flat(x, z, w, d, 0.014, '#E9E2D3');
  const plaza = mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.03, 40), mat('#E9E2D3'), 0, 0.016, 0, false); scene.add(plaza);
  scene.add(mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.28, 32), mat('#D9D3C6'), 0, 0.14, 0));
  scene.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.04, 32), mat('#BFE3F2'), 0, 0.27, 0, false));
  scene.add(mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.7, 12), mat('#D9D3C6'), 0, 0.5, 0));
  const spout = mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: '#CDEBF7', transparent: true, opacity: 0.8 }), 0, 0.92, 0, false); scene.add(spout);

  // Industry Gate arch over the entry path (companies arrive here)
  const archMat = mat('#F0973A');
  for (const z of [2.75, 4.65]) scene.add(mesh(new THREE.BoxGeometry(0.3, 1.7, 0.3), mat('#F7F3EC'), at(1.2, z).x, 0.85, at(1.2, z).z));
  scene.add(mesh(new THREE.BoxGeometry(0.42, 0.34, 2.3), archMat, at(1.2, 3.7).x, 1.85, at(1.2, 3.7).z));

  /* ---------- Trees, lamps, benches (instanced where repeated) ---------- */
  const inst = (geo, m, list, fn) => { const im = new THREE.InstancedMesh(geo, m, list.length); im.castShadow = true; const o = new THREE.Object3D(); list.forEach((v, i) => { fn(o, v); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); scene.add(im); return im; };
  inst(new THREE.CylinderGeometry(0.07, 0.09, 0.5, 6), mat('#B9A58A'), TREES, (o, [x, z]) => o.position.copy(at(x, z, 0.25)));
  const crownMat = new THREE.MeshStandardMaterial({ color: '#9CC46A', roughness: 0.9, flatShading: true });
  inst(new THREE.IcosahedronGeometry(0.45, 0), crownMat, TREES, (o, [x, z]) => { o.position.copy(at(x, z, 0.9)); o.scale.set(1, 1.25, 1); });
  inst(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 6), mat('#5B5770'), LAMPS, (o, [x, z]) => o.position.copy(at(x, z, 0.55)));
  inst(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: '#FFF4CC', emissive: '#FFE7A0', emissiveIntensity: 0.6 }), LAMPS, (o, [x, z]) => o.position.copy(at(x, z, 1.12)));
  inst(new THREE.BoxGeometry(1.0, 0.08, 0.34), mat('#B98A55'), BENCHES, (o, [x, z, r]) => { o.position.copy(at(x, z, 0.26)); o.rotation.y = r; });

  /* ---------- Buildings: an outer shell that can open up, and a furnished interior ---------- */
  const pickables = [], objects = {};
  let flagMesh = null;
  const hipRoof = (w, d, h) => { const g = new THREE.ConeGeometry(1, h, 4); g.rotateY(Math.PI / 4); return [g, w / 1.414 * 1.12, d / 1.414 * 1.12]; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const pop = (o, v) => { o.visible = v > 0.01; o.scale.setScalar(Math.max(0.001, v)); };
  // Interior: floor, two full back walls (away from the camera), two low front walls, door gap, then stage props.
  function room(id, g, w, d, h, trimColour) {
    const inside = new THREE.Group(), walls = new THREE.Group(), props = new THREE.Group();
    inside.visible = false; g.add(inside); inside.add(walls, props);
    const wallMat = mat('#F6F1E8', 'wall'), trim = mat(trimColour);
    inside.add(mesh(box(w - 0.06, 0.04, d - 0.06), mat(FLOORS[id]), 0, 0.02, 0, false));
    const H = h * 0.85, [side, off] = DOORS[id];
    const wall = (axis, pos, len, hh, gap) => {
      const segs = gap == null ? [[-len / 2, len / 2]] : [[-len / 2, gap - 0.42], [gap + 0.42, len / 2]];
      for (const [a, b] of segs) {
        if (b - a < 0.05) continue;
        const L = b - a, c = (a + b) / 2;
        walls.add(axis === 'x' ? mesh(box(L, hh, 0.08), wallMat, c, hh / 2, pos) : mesh(box(0.08, hh, L), wallMat, pos, hh / 2, c));
        if (hh > 0.5) walls.add(axis === 'x' ? mesh(box(L, 0.06, 0.1), trim, c, hh, pos) : mesh(box(0.1, 0.06, L), trim, pos, hh, c));
      }
    };
    wall('x', -d / 2 + 0.04, w, H, side === 'z-' ? off : null);
    wall('z', -w / 2 + 0.04, d, H, side === 'x-' ? off : null);
    wall('x', d / 2 - 0.04, w, 0.3, side === 'z+' ? off : null);
    wall('z', w / 2 - 0.04, d, 0.3, null);
    const fx = INTERIORS[id](props, w, d, h);
    inside.traverse(m => { if (m.isMesh) { m.userData.id = id; pickables.push(m); } });
    return { inside, walls, props, fx };
  }

  /* ---------- Stage interiors: props + what happens in each of the 3 sub-steps ---------- */
  // fx(p, t): p = 0..1 through the stage (3 equal sub-steps).
  const sub = p => Math.min(2, Math.floor(p * 3)), within = (p, i) => p * 3 - i;
  const board = (props, wd, ht, x, y, z, axis = 'z', frame = '#66518A') => { // whiteboard on a back wall
    const b = new THREE.Group(); b.position.set(x, y, z); if (axis === 'x') b.rotation.y = Math.PI / 2; props.add(b);
    b.add(mesh(box(wd + 0.1, ht + 0.1, 0.03), mat(frame), 0, 0, 0), mesh(box(wd, ht, 0.02), mat('#FFFFFF'), 0, 0, 0.02, false));
    return b;
  };
  const note = (parent, c, x, y, s = 1) => { const n = mesh(box(0.2 * s, 0.16 * s, 0.02), mat(c), x, y, 0.04, false); parent.add(n); return n; };
  const bar = (parent, len, x, y, ang, c = '#5B5770', th = 0.025) => { // a thin line from (x,y) at angle ang, grows with scale.x
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0.035); pivot.rotation.z = ang; parent.add(pivot);
    pivot.add(mesh(box(len, th, 0.01), mat(c), len / 2, 0, 0, false)); return pivot;
  };
  const table = (props, w2, d2, x, z, top = '#B98A55') => { props.add(mesh(box(w2 - 0.1, 0.4, d2 - 0.1), mat('#D9D3C6'), x, 0.2, z), mesh(box(w2, 0.05, d2), mat(top), x, 0.43, z)); };
  const glow = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0, roughness: 0.6 });
  const STICKY = ['#F2C14E', '#5BB4D9', '#E57A7A', '#8DBA4E', '#B79AE0', '#F2C14E', '#5BB4D9', '#E57A7A'];

  const INTERIORS = {
    // Industry Gate: reception + challenge board. Explain → scope → brief pinned.
    challenge(props, w, d) {
      table(props, 1.3, 0.5, -0.95, -0.95, '#F0973A');
      props.add(mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.28, 10), mat('#B98A55'), 1.4, 0.14, -1.25), mesh(new THREE.IcosahedronGeometry(0.22, 0), crownMat, 1.4, 0.45, -1.25));
      const b = board(props, 1.5, 0.85, 0.45, 1.0, -d / 2 + 0.12, 'z', '#F0973A');
      const lines = [0.95, 0.8, 0.65].map((ww, i) => { const l = bar(b, ww, -0.65, 0.25 - i * 0.16, 0, '#CFDAEE', 0.06); return l; });
      const cardM = glow('#F0973A'), card = mesh(box(0.42, 0.3, 0.03), cardM, 0.45, -0.15, 0.05, false); b.add(card);
      return (p, t) => {
        lines.forEach((l, i) => l.scale.x = Math.max(0.001, ease(within(p, 1) * 1.6 - i * 0.3)));
        pop(card, ease(within(p, 2) * 2)); cardM.emissiveIntensity = sub(p) === 2 ? 0.25 + Math.sin(t * 4) * 0.15 : 0;
      };
    },
    // Stakeholder Studio: whiteboard. Stickies appear → connections draw → three get prioritised.
    stakeholders(props, w, d) {
      props.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 22), mat('#B98A55'), 0, 0.43, 0.9), mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.4, 8), mat('#B9B3C8'), 0, 0.2, 0.9));
      for (const a of [0.6, 2.4]) props.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 12), mat('#8DBA4E'), Math.cos(a) * 0.62, 0.13, 0.9 + Math.sin(a) * 0.42)); // meeting table
      const b = board(props, 3.0, 1.15, 0, 1.0, -d / 2 + 0.12, 'z', '#8DBA4E');
      const centreM = glow('#F0973A'), centre = mesh(box(0.42, 0.28, 0.03), centreM, 0, 0, 0.05, false); b.add(centre);
      const notes = STICKY.map((c, i) => { const a = i / 8 * Math.PI * 2; return note(b, c, Math.cos(a) * 1.15, Math.sin(a) * 0.4); });
      const links = notes.map(n => { const dx = n.position.x, dy = n.position.y, L = Math.hypot(dx, dy) - 0.18; return bar(b, L, 0, 0, Math.atan2(dy, dx), '#9A95AD'); });
      return (p, t) => {
        notes.forEach((n, i) => { const v = ease(within(p, 0) * 2.2 - i * 0.14); pop(n, [0, 3, 5].includes(i) && sub(p) === 2 ? 1.35 + Math.sin(t * 5 + i) * 0.08 : v); });
        links.forEach((l, i) => l.scale.x = Math.max(0.001, ease(within(p, 1) * 2 - i * 0.12)));
        centreM.emissiveIntensity = sub(p) === 2 ? 0.3 + Math.sin(t * 4) * 0.2 : 0;
      };
    },
    // Design Lab: persona board + journey wall. Persona → journey steps + emotion curve → pain points.
    journey(props, w, d) {
      const persona = board(props, 0.8, 0.9, -w / 2 + 0.12, 1.0, 0.7, 'x', '#5BB4D9');
      persona.add(mesh(new THREE.SphereGeometry(0.13, 14, 10), mat('#D9A47A'), 0, 0.15, 0.06, false), mesh(box(0.34, 0.2, 0.03), mat('#5BB4D9'), 0, -0.13, 0.05, false));
      persona.add(...[0.3, 0.22].map((ww, i) => mesh(box(ww, 0.04, 0.02), mat('#CFDAEE'), 0, -0.32 - i * 0.07, 0.05, false)));
      const b = board(props, 3.2, 1.0, 0.25, 1.0, -d / 2 + 0.12, 'z', '#5BB4D9');
      const ys = [0.28, 0.08, -0.12, 0.12, 0.3], xs = ys.map((_, i) => -1.2 + i * 0.6);
      const steps = xs.map(x => note(b, '#F2C14E', x, -0.3));
      const dots = xs.map((x, i) => { const dd = mesh(new THREE.SphereGeometry(0.045, 10, 8), mat('#66518A'), x, ys[i], 0.05, false); b.add(dd); return dd; });
      const curve = xs.slice(1).map((x, i) => bar(b, Math.hypot(0.6, ys[i + 1] - ys[i]), xs[i], ys[i], Math.atan2(ys[i + 1] - ys[i], 0.6), '#66518A', 0.03));
      const painM = glow('#E57A7A');
      return (p, t) => {
        pop(persona, ease(within(p, 0) * 2.5));
        steps.forEach((n, i) => { pop(n, ease(within(p, 1) * 2.2 - i * 0.22)); n.material = sub(p) === 2 && (i === 1 || i === 2) ? painM : mat('#F2C14E'); });
        dots.forEach((n, i) => pop(n, ease(within(p, 1) * 2.2 - i * 0.22)));
        curve.forEach((l, i) => l.scale.x = Math.max(0.001, ease(within(p, 1) * 2.2 - i * 0.22 - 0.2)));
        painM.emissiveIntensity = 0.25 + Math.sin(t * 5) * 0.2;
        if (sub(p) === 2) [1, 2].forEach(i => steps[i].scale.setScalar(1.3 + Math.sin(t * 6) * 0.1));
      };
    },
    // Research Library: shelves, survey chart, idea table. Survey bars → 3 idea cards → company picks one.
    insights(props, w, d) {
      for (const zz of [-1.35, 1.35]) {
        const sh = new THREE.Group(); sh.position.set(-w / 2 + 0.25, 0, zz); props.add(sh);
        sh.add(mesh(box(0.3, 1.3, 0.9), mat('#B98A55'), 0, 0.65, 0));
        for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) sh.add(mesh(box(0.2, 0.24, 0.13), mat(STICKY[(r * 5 + c) % 8]), 0.06, 0.32 + r * 0.38, -0.32 + c * 0.16, false));
      }
      const b = board(props, 1.6, 1.0, 0.35, 1.05, -d / 2 + 0.12, 'z', '#66518A');
      const bars = [['#66518A', 0.6], ['#7AA342', 0.56], ['#F0973A', 0.46]].map(([c, hh], i) => {
        const pv = new THREE.Group(); pv.position.set(-0.45 + i * 0.45, -0.4, 0.04); b.add(pv);
        pv.add(mesh(box(0.26, hh, 0.02), mat(c), 0, hh / 2, 0, false)); return pv;
      });
      table(props, 1.1, 0.65, 0.15, 0.3);
      const cards = [-0.32, 0, 0.32].map(x => { const m = glow('#FFFFFF'); const c = mesh(box(0.22, 0.3, 0.02), m, 0.15 + x, 0.62, 0.3, false); props.add(c); return c; });
      return (p, t) => {
        bars.forEach((pv, i) => pv.scale.y = Math.max(0.001, ease(within(p, 0) * 2 - i * 0.25)));
        cards.forEach((c, i) => {
          pop(c, ease(within(p, 1) * 2.4 - i * 0.3));
          const chosen = sub(p) === 2 && i === 1;
          c.position.y = 0.62 + (chosen ? 0.25 + Math.sin(t * 3) * 0.04 : 0);
          c.material.color.set(sub(p) < 2 ? '#FFFFFF' : chosen ? '#7AA342' : '#D9D3C6');
          c.material.emissive.set(chosen ? '#7AA342' : '#000000'); c.material.emissiveIntensity = chosen ? 0.35 : 0;
        });
      };
    },
    // Innovation Lab: workbench + laptops, big screen, prototype stand. Sketch → build → company tests it.
    prototype(props, w, d) {
      const scr = new THREE.Group(); scr.position.set(0.2, 1.05, -d / 2 + 0.12); props.add(scr);
      scr.add(mesh(box(1.95, 1.1, 0.04), mat('#2B2530'), 0, 0, 0), mesh(box(1.8, 0.95, 0.02), mat('#FFFFFF'), 0, 0, 0.025, false));
      const wire = [[-0.45, 0.25, 0.8, 0.22], [-0.55, -0.12, 0.6, 0.38], [0.15, -0.12, 0.6, 0.38], [0.6, 0.25, 0.4, 0.22]].map(([x, y, ww, hh]) => { const m = mesh(box(ww, hh, 0.01), mat('#E6E2EF'), x, y, 0.04, false); scr.add(m); return m; });
      const ui = [['#66518A', -0.45, 0.25, 0.8, 0.22], ['#7AA342', -0.55, -0.12, 0.6, 0.38], ['#F0973A', 0.15, -0.12, 0.6, 0.38], ['#5BB4D9', 0.6, 0.25, 0.4, 0.22]].map(([c, x, y, ww, hh]) => { const m = mesh(box(ww, hh, 0.012), mat(c), x, y, 0.045, false); scr.add(m); return m; });
      table(props, 2.0, 0.5, 0, -0.75);
      const screens = [-0.6, 0, 0.6].map(x => { props.add(mesh(box(0.3, 0.02, 0.22), mat('#3B3650'), x, 0.47, -0.72, false)); const m = glow('#5BB4D9'); const s2 = mesh(box(0.3, 0.2, 0.015), m, x, 0.58, -0.84, false); s2.rotation.x = -0.25; props.add(s2); return m; });
      const stand = new THREE.Group(); stand.position.set(0.55, 0, 1.25); props.add(stand);
      stand.add(mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.55, 12), mat('#D9D3C6'), 0, 0.275, 0));
      const phoneM = glow('#66518A'), phone = mesh(box(0.2, 0.36, 0.03), phoneM, 0, 0.82, 0, false); stand.add(phone);
      const stars = [-0.18, 0, 0.18].map(x => { const st = mesh(new THREE.OctahedronGeometry(0.07), glow('#F2C14E'), x, 1.15, 0, false); st.material.emissiveIntensity = 0.5; stand.add(st); return st; });
      props.add(mesh(box(0.5, 0.5, 0.5), mat('#9A95AD'), -w / 2 + 0.4, 0.25, -d / 2 + 0.45), mesh(box(0.18, 0.12, 0.18), mat('#F0973A'), -w / 2 + 0.4, 0.56, -d / 2 + 0.45));
      return (p, t) => {
        wire.forEach((m, i) => pop(m, ease(within(p, 0) * 2.4 - i * 0.25)));
        ui.forEach((m, i) => pop(m, ease(within(p, 1) * 2.4 - i * 0.25)));
        screens.forEach((m, i) => m.emissiveIntensity = sub(p) >= 1 ? 0.35 + Math.sin(t * 3 + i) * 0.15 : 0);
        pop(phone, ease(within(p, 1) * 2)); phone.rotation.y = Math.sin(t * 1.2) * 0.5; phoneM.emissiveIntensity = sub(p) === 2 ? 0.4 : 0.1;
        stars.forEach((st, i) => { pop(st, ease(within(p, 2) * 2.5 - i * 0.3)); st.rotation.y = t * 2; st.position.y = 1.15 + Math.sin(t * 3 + i) * 0.05; });
      };
    },
    // Demo Day Auditorium: stage, big screen, seats. Pitch slides → business case → solution + confetti.
    solution(props, w, d) {
      props.add(mesh(box(1.4, 0.16, 3.0), mat('#B98A55'), -w / 2 + 0.85, 0.08, 0));
      const scr = new THREE.Group(); scr.position.set(-w / 2 + 0.12, 1.3, 0); scr.rotation.y = Math.PI / 2; props.add(scr);
      scr.add(mesh(box(2.2, 1.2, 0.04), mat('#2B2530'), 0, 0, 0), mesh(box(2.05, 1.05, 0.02), mat('#FFFFFF'), 0, 0, 0.025, false));
      const title = [mesh(box(1.7, 0.18, 0.012), mat('#66518A'), 0, 0.33, 0.04, false), ...[0, 1, 2].map(i => mesh(box(1.2 - i * 0.2, 0.06, 0.012), mat('#CFDAEE'), -0.2 + i * 0.1, 0.1 - i * 0.14, 0.04, false))];
      scr.add(...title);
      const bars = [0.25, 0.4, 0.55, 0.75].map((hh, i) => { const pv = new THREE.Group(); pv.position.set(-0.6 + i * 0.4, -0.45, 0.045); scr.add(pv); pv.add(mesh(box(0.25, hh, 0.01), mat('#7AA342'), 0, hh / 2, 0, false)); return pv; });
      const tick = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 28), glow('#7AA342'), 0, 0, 0.05, false); tick.rotation.x = Math.PI / 2; scr.add(tick);
      const seats = [];
      for (const sx of [0.1, 0.8, 1.5]) for (const sz of [-1.05, -0.35, 0.35, 1.05]) {
        props.add(mesh(box(0.3, 0.06, 0.3), mat('#7B63A6'), sx, 0.26, sz), mesh(box(0.05, 0.32, 0.3), mat('#7B63A6'), sx + 0.15, 0.42, sz), mesh(box(0.04, 0.24, 0.04), mat('#5B5770'), sx, 0.12, sz));
        seats.push([sx, sz]);
      }
      const confM = STICKY.map(c => glow(c)), conf = [];
      for (let i = 0; i < 36; i++) { const c = mesh(box(0.06, 0.06, 0.015), confM[i % confM.length], (Math.random() - 0.5) * (w - 0.6), 0, (Math.random() - 0.5) * (d - 0.6), false); c.userData.v = 0.6 + Math.random() * 0.6; c.userData.ph = Math.random() * 3; props.add(c); conf.push(c); }
      return Object.assign((p, t) => {
        const s = sub(p);
        title.forEach(m => m.visible = s === 0);
        bars.forEach((pv, i) => { pv.visible = s === 1; pv.scale.y = Math.max(0.001, ease(within(p, 1) * 2 - i * 0.2)); });
        pop(tick, s === 2 ? ease(within(p, 2) * 3) : 0); tick.material.emissiveIntensity = 0.3;
        conf.forEach(c => { c.visible = s === 2; if (s === 2) { c.position.y = 2.2 - ((t * c.userData.v + c.userData.ph) % 2.2); c.rotation.set(t * 3, t * 2, 0); } });
      }, { seats });
    },
  };

  // Build every building now that the interior designs exist
  for (const [id, x, z, w, d, h, roof, style] of BUILDINGS) {
    const g = new THREE.Group(); g.position.copy(at(x + w / 2, z + d / 2));
    const ext = new THREE.Group(), roofG = new THREE.Group(); g.add(ext); ext.add(roofG);
    const shellMats = [];
    const sm = c => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, transparent: true }); shellMats.push(m); return m; };
    const body = mesh(box(w, h, d), sm('#FBF8F2'), 0, h / 2, 0); ext.add(body);
    const parts = [body];
    let top = h;
    if (style === 'hip' || style === 'main') {
      const [geo, sx, sz] = hipRoof(w, d, 0.9);
      const r = mesh(geo, sm(roof), 0, h + 0.45, 0); r.scale.set(sx, 1, sz); roofG.add(r); parts.push(r); top = h + 0.9;
    } else {
      const cap = mesh(box(w + 0.12, 0.18, d + 0.12), sm(roof), 0, h + 0.09, 0); roofG.add(cap); parts.push(cap); top = h + 0.18;
    }
    if (style === 'main') { // clock tower + flag
      const tower = mesh(box(0.9, 1.6, 0.9), sm('#FBF8F2'), 0, h + 0.8, 0); roofG.add(tower); parts.push(tower);
      const [tg, tx, tz] = hipRoof(0.9, 0.9, 0.6); const tr = mesh(tg, sm(roof), 0, h + 1.9, 0); tr.scale.set(tx, 1, tz); roofG.add(tr); parts.push(tr);
      const clock = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 20), sm('#FFFFFF'), 0, h + 1.2, 0.47); clock.rotation.x = Math.PI / 2; roofG.add(clock);
      roofG.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), sm('#5B5770'), 0, h + 2.7, 0));
      const flag = mesh(box(0.5, 0.3, 0.02), sm('#7AA342'), 0.26, h + 3.05, 0); roofG.add(flag); flagMesh = flag;
      top = h + 2.4;
    }
    if (style === 'library') for (let i = 0; i < 4; i++) ext.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, h, 10), sm('#FFFFFF'), w / 2 + 0.25, h / 2, -d / 2 + 0.5 + i * (d - 1) / 3));
    if (style === 'hall') ext.add(mesh(box(w * 0.5, 0.12, 0.7), sm(roof), 0, h * 0.62, -d / 2 - 0.35)); // canopy over the door
    // door
    const [side, off] = DOORS[id];
    const doorMat = sm('#7B6A58');
    ext.add(side[0] === 'z'
      ? mesh(box(0.5, 0.65, 0.03), doorMat, off, 0.325, (side[1] === '+' ? 1 : -1) * (d / 2 + 0.01))
      : mesh(box(0.03, 0.65, 0.5), doorMat, (side[1] === '+' ? 1 : -1) * (w / 2 + 0.01), 0.325, off));
    // windows (one instanced mesh per building so the whole shell can fade)
    const win = [];
    for (let y = 0.95; y < h - 0.25; y += 0.65) {
      for (let k = -w / 2 + 0.45; k <= w / 2 - 0.4; k += 0.55) win.push([k, y, d / 2 + 0.012, 0], [k, y, -d / 2 - 0.012, 0]);
      for (let k = -d / 2 + 0.45; k <= d / 2 - 0.4; k += 0.55) win.push([w / 2 + 0.012, y, k, 1], [-w / 2 - 0.012, y, k, 1]);
    }
    if (win.length) {
      const im = new THREE.InstancedMesh(box(0.3, 0.32, 0.02), sm('#CFDAEE'), win.length), o3 = new THREE.Object3D();
      win.forEach(([wx, wy, wz, r], i) => { o3.position.set(wx, wy, wz); o3.rotation.y = r ? Math.PI / 2 : 0; o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); });
      ext.add(im);
    }
    for (const m of parts) { m.userData.id = id; pickables.push(m); }
    scene.add(g);
    const o = objects[id] = { group: g, body, ext, roofG, shellMats, top: new THREE.Vector3(g.position.x, top + 0.25, g.position.z), baseTop: top + 0.25, size: new THREE.Vector3(w, top, d), r: Math.max(w, d) * 0.85, open: 0, p: 0 };
    if (INTERIORS[id]) Object.assign(o, room(id, g, w, d, h, roof));
  }


  /* ---------- People: jointed figures (local +x = forward) ---------- */
  const roleMats = { students: new Set(), faculty: new Set(), companies: new Set() };
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rand() * a.length)];
  const geoCache = new Map();
  const G = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
  const capsule = (r, l) => G('c' + r + l, () => new THREE.CapsuleGeometry(r, l, 3, 8));
  const ball = r => G('s' + r, () => new THREE.SphereGeometry(r, 14, 10));
  const cube = (x, y, z) => G('b' + x + y + z, () => new THREE.BoxGeometry(x, y, z));
  const rigs = [];

  function person(role, id, shirt) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const skin = mat(pick(SKIN));
    const top = shirt || (role === 'students' ? pick(STUDENT_SHIRTS) : role === 'faculty' ? '#66518A' : '#2F4B7C');
    const topMat = mat(top, role + top); roleMats[role].add(topMat);
    const pants = mat(role === 'students' ? pick(['#3E5679', '#2F3B52', '#7A6A58', '#4A5A78']) : role === 'faculty' ? '#3B3650' : '#26324A');
    const shoe = mat(role === 'students' ? '#F4F4F6' : '#2B2530');
    const legs = [], arms = [];
    for (const side of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(0, 0.46, side * 0.055);
      hip.add(mesh(capsule(0.043, 0.15), pants, 0, -0.11, 0));
      const knee = new THREE.Group(); knee.position.y = -0.22; hip.add(knee);
      knee.add(mesh(capsule(0.037, 0.14), pants, 0, -0.1, 0), mesh(cube(0.11, 0.045, 0.066), shoe, 0.026, -0.215, 0));
      body.add(hip); legs.push({ hip, knee });
    }
    const torso = mesh(capsule(0.1, 0.17), topMat, 0, 0.66, 0); torso.scale.set(0.7, 1, 1); body.add(torso);
    body.add(mesh(G('neck', () => new THREE.CylinderGeometry(0.034, 0.04, 0.07, 8)), skin, 0, 0.88, 0));
    const head = new THREE.Group(); head.position.y = 0.97; body.add(head);
    const skull = mesh(ball(0.085), skin, 0, 0, 0); skull.scale.set(0.95, 1.08, 0.92); head.add(skull);
    for (const s of [-1, 1]) head.add(mesh(ball(0.011), mat('#1F1B2D'), 0.079, 0.012, s * 0.03, false));
    head.add(mesh(cube(0.012, 0.008, 0.035), mat('#B5655A'), 0.08, -0.04, 0, false)); // mouth
    const hairMat = mat(role === 'faculty' && rand() < 0.45 ? '#A8A3B5' : pick(HAIR));
    const cap = mesh(G('hcap', () => new THREE.SphereGeometry(0.092, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)), hairMat, -0.01, 0.01, 0);
    cap.rotation.z = 0.45; head.add(cap); // hairline lifted at the front so the face shows
    const style = rand();
    if (style < 0.45) { const back = mesh(ball(0.08), hairMat, -0.045, -0.07, 0); back.scale.set(0.55, 1.35, 1.05); head.add(back); } // long hair
    else if (style < 0.6) head.add(mesh(ball(0.04), hairMat, -0.075, 0.07, 0)); // bun
    for (const side of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(0, 0.82, side * 0.13); sh.rotation.x = -side * 0.09;
      const sleeve = role === 'students' && rand() < 0.5 ? skin : topMat; // t-shirts show forearms
      sh.add(mesh(capsule(0.032, 0.13), topMat, 0, -0.09, 0));
      const el = new THREE.Group(); el.position.y = -0.19; sh.add(el);
      el.add(mesh(capsule(0.028, 0.12), sleeve, 0, -0.08, 0), mesh(ball(0.03), skin, 0, -0.17, 0));
      body.add(sh); arms.push({ sh, el });
    }
    if (role === 'companies') {
      body.add(mesh(cube(0.012, 0.06, 0.08), mat('#FFFFFF'), 0.066, 0.8, 0, false), mesh(cube(0.012, 0.17, 0.03), mat('#E8892B', 'tie'), 0.072, 0.69, 0, false));
      arms[1].el.add(mesh(cube(0.05, 0.13, 0.17), mat('#6B4A2E'), 0, -0.27, 0)); // briefcase
    }
    if (role === 'faculty') {
      body.add(mesh(cube(0.012, 0.06, 0.08), mat('#FFFFFF'), 0.066, 0.8, 0, false));
      arms[0].el.add(mesh(cube(0.1, 0.13, 0.015), mat('#FFFFFF', 'notebook'), 0.04, -0.2, 0.03)); // notebook
    }
    if (role === 'students' && rand() < 0.55) body.add(mesh(cube(0.08, 0.2, 0.17), mat(pick(['#5B5770', '#C0504D', '#3B6E8F', '#E0A83A'])), -0.1, 0.68, 0)); // backpack
    g.traverse(o => { if (o.isMesh) { o.userData.id = id; pickables.push(o); } });
    scene.add(g);
    const rig = { g, body, head, legs, arms, role, pose: 'idle', phase: rand() * 20 };
    rigs.push(rig);
    return rig;
  }

  // Poses: limbs hang along -y, so +z rotation swings them forward and -z bends a knee back.
  function animate(r, t) {
    const k = t + r.phase;
    const gest = Math.pow(Math.max(0, Math.sin(k * 0.8)), 3); // an occasional hand gesture
    let hip = [0, 0], knee = [0, 0], sh = [0.04, 0.04], el = [0.15, 0.15], y = 0, hy = Math.sin(k * 0.4) * 0.12, hz = 0;
    switch (r.pose) {
      case 'walk': { const s = Math.sin(k * 7.5); hip = [0.5 * s, -0.5 * s]; knee = [-Math.max(0, -s) * 0.8, -Math.max(0, s) * 0.8]; sh = [-0.4 * s, 0.4 * s]; el = [0.35, 0.35]; y = Math.abs(Math.cos(k * 7.5)) * 0.02; hy = 0; break; }
      case 'sit': hip = [1.45, 1.45]; knee = [-1.4, -1.4]; y = -0.19; sh = [0.5, 0.5 + gest * 0.7]; el = [0.95, 0.95 - gest * 0.5]; hy = Math.sin(k * 0.5) * 0.45; break;
      case 'talk': sh = [0.1, 0.15 + gest * 0.9]; el = [0.25, 0.3 + gest * 0.9]; hy = Math.sin(k * 0.6) * 0.3; break;
      case 'listen': sh = [0.25, 0.25]; el = [0.9, 0.9]; hz = -Math.max(0, Math.sin(k * 1.4)) * 0.1; break;
      case 'present': sh = [0.1 + gest * 0.5, 1.2]; el = [0.3 + gest * 0.6, 0.15]; hy = Math.sin(k * 0.7) * 0.45; break;
    }
    r.legs[0].hip.rotation.z = hip[0]; r.legs[1].hip.rotation.z = hip[1];
    r.legs[0].knee.rotation.z = knee[0]; r.legs[1].knee.rotation.z = knee[1];
    r.arms[0].sh.rotation.z = sh[0]; r.arms[1].sh.rotation.z = sh[1];
    r.arms[0].el.rotation.z = el[0]; r.arms[1].el.rotation.z = el[1];
    r.body.position.y = y; r.head.rotation.y = hy; r.head.rotation.z = hz;
  }
  const face = (g, to) => { g.rotation.y = Math.atan2(-(to.z - g.position.z), to.x - g.position.x); };

  // Past teams: students seated on stools around a table, faculty mentor standing with them
  const teams = {};
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#FFE08A', emissive: '#FFC94A', emissiveIntensity: 0.9 });
  for (const [id, x, z] of TEAMS) {
    const c = at(x, z);
    scene.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), mat('#FFFFFF'), c.x, 0.44, c.z));
    scene.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.42, 8), mat('#B9B3C8'), c.x, 0.21, c.z));
    for (const a of [0.6, 2.6, 4.4]) {
      const lap = new THREE.Group(); lap.position.set(c.x + Math.cos(a) * 0.25, 0.47, c.z + Math.sin(a) * 0.25); lap.rotation.y = -a;
      lap.add(mesh(cube(0.16, 0.012, 0.12), mat('#3B3650'), 0, 0, 0, false), mesh(cube(0.012, 0.1, 0.12), mat('#7AA342', 'screen'), -0.08, 0.05, 0, false));
      scene.add(lap);
    }
    const n = id === 'kaleidosync' ? 3 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      scene.add(mesh(G('stool', () => new THREE.CylinderGeometry(0.1, 0.1, 0.26, 12)), mat('#B98A55'), c.x + Math.cos(a) * 0.95, 0.13, c.z + Math.sin(a) * 0.95));
      const r = person('students', id); r.g.position.set(c.x + Math.cos(a) * 0.95, 0, c.z + Math.sin(a) * 0.95); face(r.g, c); r.pose = 'sit';
    }
    if (id !== 'kaleidosync') { const f = person('faculty', id); const a = 0.4 + Math.PI / n; f.g.position.set(c.x + Math.cos(a) * 1.15, 0, c.z + Math.sin(a) * 1.15); face(f.g, c); f.pose = 'listen'; }
    const bulb = new THREE.Group(); bulb.position.set(c.x, 1.65, c.z);
    bulb.add(mesh(new THREE.SphereGeometry(0.17, 16, 12), bulbMat, 0, 0, 0, false), mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), mat('#B9B3C8'), 0, -0.17, 0, false));
    bulb.traverse(o => { if (o.isMesh) { o.userData.id = id; pickables.push(o); } });
    scene.add(bulb);
    teams[id] = { c, bulb, top: new THREE.Vector3(c.x, 2.1, c.z), r: 1.45 };
  }
  // Students chatting on benches
  for (const [x, z, rot] of BENCHES) for (const s of [-0.25, 0.25]) {
    const r = person('students', 'students'); r.g.position.copy(at(x + (rot ? 0 : s), z + (rot ? s : 0))); r.g.rotation.y = rot ? Math.PI : -Math.PI / 2; r.pose = 'sit';
  }

  // Demo Day audience: seated in the auditorium (visible when it opens up)
  for (const [role, sx, sz] of [['faculty', 0.8, -0.35], ['companies', 0.8, 0.35], ['faculty', 1.5, -1.05], ['students', 1.5, 0.35], ['companies', 1.5, 1.05]]) {
    const r = person(role, 'solution'); objects.solution.inside.add(r.g); // lives inside the auditorium, facing the stage
    r.g.position.set(sx, 0, sz); r.g.rotation.y = Math.PI; r.pose = 'sit';
  }

  /* ---------- The live project: one group walks the GCL process, stage by stage ---------- */
  // Each stage: where the group gathers (`spot` cells per actor) and what they look at.
  // Actors: [company mentor, faculty mentor, student, student, student]
  const STAGE_IDS = ['challenge', 'stakeholders', 'journey', 'insights', 'prototype', 'solution'];
  // Where each place meets the path loop (`door`) and the walk from there in through its door (`entry`).
  const LOC = {
    spawn: { door: [3.7, 3.7], entry: [[-5, 3.7]] },
    challenge: { door: [3.7, 3.7], entry: [[0.6, 3.7], [0.6, 1.6]] },
    stakeholders: { door: [8.5, 3.7], entry: [[8.5, 1.8]] },
    journey: { door: [14.5, 3.7], entry: [[14.5, 1.8]] },
    insights: { door: [20.3, 7.7], entry: [[21.7, 7.7]] },
    prototype: { door: [20.3, 14.2], entry: [[21.7, 14.2]] },
    solution: { door: [14.6, 20.3], entry: [[14.6, 21.8]] },
    mainblock: { door: [6.8, 20.3], entry: [[6.8, 21.7]] },
  };
  const CENTRE = { challenge: [0.2, 0], stakeholders: [8.5, 0.1], journey: [14.5, 0.1], insights: [23.5, 7.7], prototype: [23.5, 14.2], solution: [14.6, 23.6] };
  const In = (id, lx, lz, ly = 0) => [CENTRE[id][0] + lx, CENTRE[id][1] + lz, ly]; // a spot inside a building (local offsets)
  // Actors: [company mentor, faculty mentor, student, student, student]. Everyone works *inside* the building.
  const BEATS = [
    { // Stage 1: mentor + faculty meet inside the Industry Gate; students wait in the studio. `focus` = who the caption follows.
      spots: [In('challenge', 0.75, 0.55), In('challenge', -0.35, 0.35), In('stakeholders', -0.6, -0.5), In('stakeholders', 0, -0.65), In('stakeholders', 0.6, -0.5)],
      locs: [null, null, 'stakeholders', 'stakeholders', 'stakeholders'], focus: [0, 1],
      poses: ['talk', 'listen', 'talk', 'listen', 'talk'], looks: [In('challenge', -0.35, 0.35), In('challenge', 0.75, 0.55), In('stakeholders', 0, -1.6), In('stakeholders', 0, -1.6), In('stakeholders', 0, -1.6)] },
    { spots: [In('stakeholders', 1.4, 0.85), In('stakeholders', -1.4, 0.85), In('stakeholders', -0.6, -0.5), In('stakeholders', 0, -0.65), In('stakeholders', 0.6, -0.5)],
      poses: ['listen', 'listen', 'talk', 'listen', 'talk'], looks: Array(5).fill(In('stakeholders', 0, -1.6)) },
    { spots: [In('journey', 1.55, 1.1), In('journey', -1.4, 1.0), In('journey', -0.6, -0.45), In('journey', 0, -0.6), In('journey', 0.6, -0.45)],
      poses: ['listen', 'listen', 'talk', 'talk', 'listen'], looks: [In('journey', 0, -1.6), In('journey', -2, 0.7), In('journey', 0.2, -1.6), In('journey', 0.2, -1.6), In('journey', 0.2, -1.6)] },
    { spots: [In('insights', 1.0, 1.0), In('insights', 1.0, -0.8), In('insights', -0.75, -0.45), In('insights', -0.85, 0.45), In('insights', -0.6, 1.25)],
      poses: ['listen', 'listen', 'present', 'talk', 'talk'], looks: [In('insights', 0.15, 0.3), In('insights', 0.15, 0.3), In('insights', 1.0, 1.0), In('insights', 1.0, 1.0), In('insights', 1.0, 1.0)] },
    { spots: [In('prototype', 1.25, 1.15), In('prototype', -1.2, 1.1), In('prototype', -0.6, -0.2), In('prototype', 0, -0.1), In('prototype', 0.6, -0.2)],
      poses: ['talk', 'listen', 'present', 'talk', 'listen'], looks: [In('prototype', 0.55, 1.25), In('prototype', 0, -0.75), In('prototype', 0.2, -2), In('prototype', 0.2, -2), In('prototype', 0.2, -2)] },
    { spots: [In('solution', 0.1, -0.35), In('solution', 0.1, 0.35), In('solution', -1.85, -0.75, 0.16), In('solution', -1.85, 0.75, 0.16), In('solution', -2.15, 0, 0.16)],
      poses: ['sit', 'sit', 'present', 'present', 'listen'], looks: [In('solution', -3, -0.35), In('solution', -3, 0.35), In('solution', 1, -0.75), In('solution', 1, 0.75), In('solution', 1, 0)] },
  ];
  const STAGE_TIME = 12; // three 4-second sub-steps inside each building
  const SPAWN = [-5, 3.7];
  const LOOPC = [[3.7, 3.7], [20.3, 3.7], [20.3, 20.3], [3.7, 20.3]], SIDE = 16.6, PER = SIDE * 4;
  const sOf = ([x, z]) => z <= 3.71 ? x - 3.7 : x >= 20.29 ? SIDE + z - 3.7 : z >= 20.29 ? 2 * SIDE + 20.3 - x : 3 * SIDE + 20.3 - z;
  // Walk along the path loop from one building's door to another's, taking the shorter way round.
  function arc(a, b) {
    const sa = sOf(a), sb = sOf(b); let d = ((sb - sa) % PER + PER) % PER; const fwd = d <= PER / 2; if (!fwd) d = PER - d;
    const rel = cs => fwd ? ((cs - sa) % PER + PER) % PER : ((sa - cs) % PER + PER) % PER;
    const corners = LOOPC.map((p, i) => [rel(i * SIDE), p]).filter(([r]) => r > 0.01 && r < d - 0.01).sort((x, y) => x[0] - y[0]).map(([, p]) => p);
    return [a, ...corners, b];
  }
  const cardGeo = new THREE.BoxGeometry(0.42, 0.3, 0.02), cardMat = { problem: mat('#F0973A', 'card-go'), solution: mat('#7AA342', 'card-back') };
  const actor = (role, id, shirt) => { const r = person(role, id, shirt); return { r, path: null, s: 0, total: 0, loc: null }; };
  const mentors = [actor('companies', 'companies'), actor('companies', 'companies')];
  for (const m of mentors) { m.card = new THREE.Mesh(cardGeo, cardMat.problem); m.card.castShadow = true; m.card.userData.id = 'companies'; pickables.push(m.card); scene.add(m.card); }
  // Two teams take turns: while one leaves Demo Day, the next steps out of the buildings.
  const team = shirts => [actor('faculty', 'faculty'), ...shirts.map(c => actor('students', 'students', c))];
  const crews = [team(['#3FA796', '#F2C14E', '#5E8DD0']), team(['#E57A7A', '#5BB4D9', '#8DBA4E'])];
  let crew = crews[0], nextCrew = null;
  const place = (a, cell, loc) => { a.r.g.position.copy(at(...cell)); a.loc = loc; a.path = null; a.r.pose = 'idle'; };
  const startingPlaces = t => t.forEach((a, k) => place(a, BEATS[0].spots[k + 1], BEATS[0].locs[k + 1] || 'challenge')); // faculty at the gate, students in the studio
  startingPlaces(crew);
  startingPlaces(crews[1]); crews[1].forEach(a => { a.r.g.visible = false; });
  mentors.forEach(m => { place(m, SPAWN, 'spawn'); m.r.g.visible = m.card.visible = false; });

  // Route: out through the current building's door → along the path loop → in through the next door → to the spot.
  const sameDoor = (p, q) => p[0] === q[0] && p[1] === q[1];
  function walkTo(a, cell, to) {
    if (cell && a.loc === to && a.r.g.position.distanceTo(at(...cell)) < 0.05) { a.path = null; return; } // already there
    const F = LOC[a.loc], T = LOC[to], wp = [];
    if (a.loc !== to) {
      wp.push(...[...F.entry].reverse());
      if (!sameDoor(F.door, T.door)) wp.push(...arc(F.door, T.door));
      wp.push(...T.entry);
    }
    const pts = [a.r.g.position.clone(), ...wp.map(c => at(...c))];
    if (cell) pts.push(at(...cell));
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    Object.assign(a, { path: pts, L, s: 0, total: L[L.length - 1], loc: to });
    if (reduceMotion) a.s = a.total;
    a.r.pose = 'walk';
  }
  const tmpV = new THREE.Vector3();
  function stepActor(a, dt) {
    if (!a.path) return true;
    a.s = Math.min(a.total, a.s + 1.6 * dt);
    let i = 0; while (i < a.L.length - 2 && a.L[i + 1] < a.s) i++;
    const seg = a.L[i + 1] - a.L[i] || 1;
    tmpV.lerpVectors(a.path[i], a.path[i + 1], (a.s - a.L[i]) / seg);
    const d = a.path[i + 1].clone().sub(a.path[i]);
    a.r.g.position.copy(tmpV);
    if (d.lengthSq() > 1e-6) a.r.g.rotation.y = Math.atan2(-d.z, d.x);
    if (a.s >= a.total) { a.path = null; a.r.pose = 'idle'; return true; } // wait calmly for the others
    return false;
  }

  let beat = 0, loopN = 0, phase = 'walk', dwell = 0, subStep = -1, mentor = mentors[0], follow = false;
  const leaving = []; // people walking off stage; hidden when they get there
  const HANDOVER = 7;  // seconds between one project's Demo Day and the next company's arrival
  let handoverAge = 0;
  const project = () => TEAMS[loopN % TEAMS.length][0];
  function startBeat(i) {
    beat = i; phase = 'walk'; subStep = -1;
    const b = BEATS[i];
    if (i === 0) { // a new company arrives; the previous one heads home with its solution
      const prev = mentor; mentor = mentors[mentors[0] === prev ? 1 : 0];
      if (prev !== mentor && prev.r.g.visible && !leaving.includes(prev)) { walkTo(prev, null, 'spawn'); leaving.push(prev); }
      if (leaving.includes(mentor)) leaving.splice(leaving.indexOf(mentor), 1);
      place(mentor, SPAWN, 'spawn'); mentor.r.g.visible = mentor.card.visible = true; mentor.card.material = cardMat.problem;
    }
    [mentor, ...crew].forEach((a, k) => walkTo(a, b.spots[k], b.locs?.[k] || STAGE_IDS[i]));
    onStory?.({ stage: STAGE_IDS[i], project: project(), phase: 'walk' });
  }
  const nextProject = () => TEAMS[(loopN + 1) % TEAMS.length][0];
  function startHandover() {
    phase = 'handover'; handoverAge = 0;
    crew.forEach((a, k) => { walkTo(a, [5.9 + k * 0.5, 21.75], 'mainblock'); leaving.push(a); }); // back to class at the Main Block
    walkTo(mentor, null, 'spawn'); leaving.push(mentor);                                         // the company heads home with its solution
    nextCrew = crews[crews[0] === crew ? 1 : 0];
    nextCrew.forEach(a => { const i = leaving.indexOf(a); if (i >= 0) leaving.splice(i, 1); a.r.g.visible = true; });
    startingPlaces(nextCrew); // the next team is already waiting inside the Gate and the Studio
    onStory?.({ stage: 'solution', project: project(), phase: 'done', next: nextProject(), duration: HANDOVER });
  }
  function updateStory(dt) {
    for (let i = leaving.length - 1; i >= 0; i--) {
      const a = leaving[i];
      if (stepActor(a, dt)) { a.r.g.visible = false; if (a.card) a.card.visible = false; leaving.splice(i, 1); }
    }
    if (phase === 'handover') {
      handoverAge += dt;
      if (handoverAge >= HANDOVER) { crew = nextCrew; nextCrew = null; loopN++; startBeat(0); }
      return;
    }
    let arrived = true;
    [mentor, ...crew].forEach(a => { if (!stepActor(a, dt)) arrived = false; });
    if (phase === 'walk' && arrived) {
      phase = 'dwell'; dwell = STAGE_TIME;
      const b = BEATS[beat];
      [mentor, ...crew].forEach((a, k) => { a.r.pose = b.poses[k]; face(a.r.g, at(...b.looks[k])); });
    }
    if (phase === 'dwell') {
      dwell -= dt;
      const s = Math.min(2, Math.floor((STAGE_TIME - dwell) / (STAGE_TIME / 3)));
      if (s !== subStep) {
        subStep = s;
        if (s === 2 && [1, 3, 4].includes(beat)) mentor.r.pose = 'talk';          // the company's say at its touchpoints
        if (beat === 0 && s === 1) { mentor.r.pose = 'listen'; crew[0].r.pose = 'talk'; } // faculty scopes the problem
        if (beat === 5 && s === 2) mentor.card.material = cardMat.solution;        // the problem card becomes a solution
        onStory?.({ stage: STAGE_IDS[beat], project: project(), phase: 'work', sub: s, duration: STAGE_TIME });
      }
      if (dwell <= 0) { if (beat === 5) startHandover(); else startBeat(beat + 1); }
    }
  }
  // Orange spotlight that follows the featured company's group
  const spot = new THREE.Mesh(new THREE.RingGeometry(1, 1.16, 56), new THREE.MeshBasicMaterial({ color: '#F0973A', transparent: true, opacity: 0.7, depthWrite: false }));
  spot.rotation.x = -Math.PI / 2; scene.add(spot);
  const spotFill = new THREE.Mesh(new THREE.CircleGeometry(1, 56), new THREE.MeshBasicMaterial({ color: '#F0973A', transparent: true, opacity: 0.1, depthWrite: false }));
  spotFill.rotation.x = -Math.PI / 2; scene.add(spotFill);
  const storyAnchor = new THREE.Vector3();
  function groupCentre() {
    if (phase === 'handover') return storyAnchor.copy(handoverAge < 2.5 ? at(14.6, 23.6) : at(0.6, 1.8)).setY(1.75);
    const b = BEATS[beat]; storyAnchor.set(0, 0, 0); let n = 0;
    [mentor, ...crew].forEach((a, k) => { if (!b.focus || b.focus.includes(k)) { storyAnchor.add(a.r.g.position); n++; } });
    return storyAnchor.divideScalar(n).setY(1.75);
  }



  /* ---------- Selection ---------- */
  const marker = new THREE.Group(); marker.visible = false; scene.add(marker);
  const pin = new THREE.Group(), pinMat = new THREE.MeshStandardMaterial({ color: '#66518A', roughness: 0.4 });
  const ph = mesh(new THREE.SphereGeometry(0.28, 20, 14), pinMat, 0, 0.72, 0), pt = mesh(new THREE.ConeGeometry(0.22, 0.55, 20), pinMat, 0, 0.36, 0);
  pt.rotation.x = Math.PI; pin.add(ph, pt); marker.add(pin);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.1, 56), new THREE.MeshBasicMaterial({ color: '#66518A', transparent: true, opacity: 0.6 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.visible = false; scene.add(ring);
  let outline = null, selected = null, glowRole = null;
  const clearOutline = () => { if (outline) { outline.parent.remove(outline); outline.geometry.dispose(); outline = null; } };

  function select(id, { fly = true } = {}) {
    selected = id; clearOutline(); follow = false;
    glowRole = roleMats[id] ? id : null;
    for (const set of Object.values(roleMats)) for (const m of set) m.emissive.set('#000000');
    const o = objects[id], tm = teams[id];
    ring.visible = !!(o || tm); marker.visible = !!(o || tm);
    if (o) {
      outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(o.size.x + 0.14, o.size.y, o.size.z + 0.14)), new THREE.LineBasicMaterial({ color: '#66518A' }));
      outline.position.y = o.size.y / 2; o.group.add(outline);
      marker.position.copy(o.top); ring.position.set(o.group.position.x, 0.04, o.group.position.z); ring.scale.setScalar(o.r);
      if (fly) flyTo(o.group.position, Math.max(camera.zoom, o.inside ? 2.3 : 1.5));
    } else if (tm) {
      marker.visible = false; ring.position.set(tm.c.x, 0.04, tm.c.z); ring.scale.setScalar(tm.r);
      if (fly) flyTo(tm.c, Math.max(camera.zoom, 2.4));
    } else if (glowRole && fly) tween(framed(HOME, 0.84), 0.84);
  }

  // Smooth camera moves; dragging cancels them.
  let anim = null;
  const offset = () => camera.position.clone().sub(controls.target);
  const tween = (toT, toZ, toOff = null) => { anim = { t: reduceMotion ? 1 : 0, fromT: controls.target.clone(), toT, fromZ: camera.zoom, toZ, fromOff: offset(), toOff }; };
  // On desktop aim right of the point so it lands in the free area left of the inspector panel.
  function framed(point, zoom) {
    const to = new THREE.Vector3(point.x, 0, point.z);
    if (innerWidth > 900) {
      const halfW = (camera.right - camera.left) / 2 / zoom;
      to.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize(), halfW * 190 / (canvas.clientWidth / 2));
    }
    return to;
  }
  const flyTo = (target, zoom) => tween(framed(target, zoom), zoom);
  canvas.addEventListener('pointerdown', () => { anim = null; follow = false; }); // the visitor takes the camera

  // Picking + hover
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickAt = e => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(pickables, false)[0]?.object.userData.id ?? null;
  };
  let down = null, hovered = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) { const id = pickAt(e); if (id) onSelect(id); }
    down = null;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.buttons) return;
    const id = pickAt(e);
    if (id === hovered) return;
    if (objects[hovered]) objects[hovered].body.material.emissive.set('#000000');
    hovered = id;
    if (objects[id]) objects[id].body.material.emissive.set('#3A2C66').multiplyScalar(0.1);
    canvas.style.cursor = id ? 'pointer' : '';
  });

  // HTML labels pinned to 3D anchors; the story label follows the live-project group
  const labels = [];
  const storyEl = document.createElement('button');
  storyEl.className = 'maplabel story'; storyEl.type = 'button';
  storyEl.addEventListener('click', () => onSelect(STAGE_IDS[beat]));
  labelsEl.append(storyEl);
  function addLabel(id, html, cls) {
    const el = document.createElement('button');
    el.className = 'maplabel ' + cls; el.innerHTML = html; el.type = 'button'; el.dataset.id = id;
    el.addEventListener('click', () => onSelect(id));
    labelsEl.append(el);
    labels.push({ id, el, anchor: objects[id]?.top ?? teams[id]?.top });
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight, a = w / h;
    const fr = a < 1 ? FR / a * 0.75 : FR; // portrait: widen the view
    renderer.setSize(w, h, false);
    Object.assign(camera, { left: -fr * a, right: fr * a, top: fr, bottom: -fr });
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  camera.zoom = 0.84; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  { const t = framed(HOME, 0.84); camera.position.add(t.clone().sub(controls.target)); controls.target.copy(t); controls.update(); }

  const v = new THREE.Vector3(), clock = new THREE.Clock(), BOUND = 13;
  queueMicrotask(() => startBeat(0)); // after createScene returns, so the caller can use the returned API in onStory
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (anim) {
      anim.t = Math.min(1, anim.t + dt / 0.9);
      const k = 1 - Math.pow(1 - anim.t, 3);
      controls.target.lerpVectors(anim.fromT, anim.toT, k);
      const off = anim.toOff ? anim.fromOff.clone().lerp(anim.toOff, k).setLength(anim.fromOff.length()) : anim.fromOff;
      camera.position.copy(controls.target).add(off);
      camera.zoom = THREE.MathUtils.lerp(anim.fromZ, anim.toZ, k); camera.updateProjectionMatrix();
      if (anim.t >= 1) anim = null;
    }
    if (follow && !anim) { // live feed: glide after the group; dive into the building while they work inside
      const zWant = phase === 'dwell' ? 2.8 : 1.7;
      camera.zoom += (zWant - camera.zoom) * Math.min(1, dt * (reduceMotion ? 60 : 1.2)); camera.updateProjectionMatrix();
      const d = framed(groupCentre(), camera.zoom).sub(controls.target).setY(0).multiplyScalar(Math.min(1, dt * 1.6));
      controls.target.add(d); camera.position.add(d);
    }
    const before = controls.target.clone(); // keep the campus on screen
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -BOUND, BOUND);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -BOUND, BOUND);
    camera.position.add(controls.target.clone().sub(before));
    controls.update();

    if (!reduceMotion) {
      for (const tm of Object.values(teams)) tm.bulb.position.y = 1.65 + Math.sin(t * 2 + tm.c.x) * 0.07;
      bulbMat.emissiveIntensity = 0.7 + Math.sin(t * 3) * 0.25;
      spout.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
      if (flagMesh) flagMesh.rotation.y = Math.sin(t * 2.5) * 0.25;
      pin.position.y = Math.sin(t * 2.4) * 0.12;
      ring.material.opacity = 0.35 + Math.sin(t * 2.4) * 0.25;
      if (glowRole) for (const m of roleMats[glowRole]) m.emissive.set(ROLE_COLOUR[glowRole]).multiplyScalar(0.25 + Math.sin(t * 4) * 0.2);
    }
    updateStory(dt);
    const here = phase === 'dwell' ? STAGE_IDS[beat] : phase === 'handover' && handoverAge < 3 ? 'solution' : null;
    for (const [id, o] of Object.entries(objects)) {
      if (!o.inside) continue;
      const want = id === here || id === selected ? 1 : 0;
      o.open += (want - o.open) * (reduceMotion ? 1 : Math.min(1, dt * 2.5));
      const k = o.open;
      o.ext.visible = k < 0.99;
      for (const m of o.shellMats) { m.opacity = 1 - k; m.depthWrite = k < 0.5; }
      o.roofG.position.y = k * 1.6; o.body.castShadow = k < 0.5;
      o.top.y = o.baseTop + k * 1.6;                       // keep the label above the lifted roof
      o.inside.visible = k > 0.01;
      o.walls.scale.y = Math.max(0.001, k); o.props.visible = k > 0.35;
      if (o.inside.visible) {
        if (id === here && phase === 'dwell') o.p = 1 - dwell / STAGE_TIME;
        else if (id === here) o.p = 1;                     // Demo Day stays finished during the handover
        else if (!want) o.p = 0;                           // reset once it has closed
        else if (id !== STAGE_IDS[beat]) o.p = 1;          // opened by a click: show the finished state
        o.fx(o.p, reduceMotion ? 0 : t);
      }
    }
    for (const r of rigs) if (r.g.visible) animate(r, reduceMotion ? 0 : t);
    for (const m of mentors) if (m.card.visible) { m.card.position.copy(m.r.g.position).setY(1.38 + Math.sin(t * 3) * 0.03); m.card.quaternion.copy(camera.quaternion); }

    renderer.render(scene, camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const l of labels) {
      v.copy(l.anchor).project(camera);
      l.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
      l.el.classList.toggle('on', l.id === selected);
    }
    const gc = groupCentre();
    const sr = phase === 'walk' ? 1.1 : 1.7;
    spot.scale.setScalar(THREE.MathUtils.lerp(spot.scale.x, sr, 0.08)); spotFill.scale.copy(spot.scale);
    spot.position.set(gc.x, 0.05, gc.z); spotFill.position.set(gc.x, 0.045, gc.z);
    if (!reduceMotion) spot.material.opacity = 0.55 + Math.sin(t * 3) * 0.25;
    v.copy(gc).project(camera);
    storyEl.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
  });

  return {
    select, addLabel, storyEl,
    // Feature a project in the live story and follow its group. restart=false keeps a story already playing.
    watch(id, restart = false) {
      const i = TEAMS.findIndex(t => t[0] === id);
      if (i < 0) return;
      if (restart || project() !== id) { if (nextCrew) { crew = nextCrew; nextCrew = null; } loopN = i; startBeat(0); crew.forEach(a => stepActor(a, 1e3)); } // fresh start: crew takes its places, the new company walks in
      follow = true;
      tween(framed(groupCentre(), Math.max(camera.zoom, 1.6)), Math.max(camera.zoom, 1.6));
    },
    zoom: f => tween(controls.target.clone(), THREE.MathUtils.clamp(camera.zoom * f, controls.minZoom, controls.maxZoom)),
    spin: deg => tween(controls.target.clone(), camera.zoom, offset().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg))),
    home: () => tween(framed(HOME, 0.84), 0.84, OFFSET.clone()),
  };
}
