import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';

// Campus in grid units (0..24), centred at the origin.
const C = 12;
const at = (x, z, y = 0) => new THREE.Vector3(x - C, y, z - C);

// Buildings: [id, x, z, w, d, h, roofColour, style]. Stage buildings use stage ids; 'about' is the main block.
const BUILDINGS = [
  ['challenge', -1, -1, 2.6, 2.4, 1.3, '#F0973A', 'hip'],
  ['stakeholders', 7, -0.6, 3, 2.4, 1.6, '#8DBA4E', 'hip'],
  ['journey', 13, -0.6, 3, 2.4, 1.5, '#8DBA4E', 'hip'],
  ['insights', 21.9, 6, 2.6, 3.4, 2.0, '#8DBA4E', 'library'],
  ['prototype', 21.9, 12.5, 2.6, 3.2, 1.7, '#8DBA4E', 'flat'],
  ['solution', 12.5, 21.9, 4.2, 2.8, 2.2, '#7B63A6', 'hall'],
  ['about', 4.6, 21.9, 4.4, 2.6, 2.4, '#66518A', 'main'],
];
// Student teams (one per partner project) around tables on the quad lawns.
const TEAMS = [['idfc', 7.6, 7.6], ['deloitte', 16.4, 7.6], ['govardhan', 7.6, 16.4], ['aurapay', 16.4, 16.4], ['kaleidosync', 0.4, 14.8]];
const PATHS = [[3, 3, 18, 1.4], [3, 19.6, 18, 1.4], [3, 3, 1.4, 18], [19.6, 3, 1.4, 18], [11.3, 4.4, 1.4, 15.2], [4.4, 11.3, 15.2, 1.4], [-5, 3, 8, 1.4]];
const LAWNS = [[4.4, 4.4, 6.9, 6.9], [12.7, 4.4, 6.9, 6.9], [4.4, 12.7, 6.9, 6.9], [12.7, 12.7, 6.9, 6.9], [-2.5, 13, 4.5, 8]];
const TREES = [[-3, 6], [-3, 9], [5.6, 1.4], [11.2, 1.6], [17, 0.8], [20.5, 1], [24.6, 3], [25.6, 10], [25.2, 17], [21.5, 24.5], [17.8, 24.8], [10.4, 24.6], [2.4, 24.4], [-2.8, 22.5], [5.2, 5.2], [10.4, 5.4], [13.6, 5.2], [18.6, 5.4], [5.4, 18.6], [10.4, 18.8], [13.6, 18.6], [18.8, 18.6], [-3.5, 12], [26, 21], [9.2, 10.4], [14.8, 13.6]];
const LAMPS = [[4.6, 2.6], [10.8, 2.6], [13.2, 2.6], [19.4, 2.6], [21.4, 8], [21.4, 16], [19.4, 21.4], [13.2, 21.4], [10.8, 21.4], [2.6, 8], [2.6, 16]];
const BENCHES = [[9.8, 13.4, 0], [14.2, 10.6, 0], [5.2, 13.2, Math.PI / 2], [18.8, 10.8, Math.PI / 2]];

const SKIN = ['#F1C9A5', '#D9A47A', '#B98058', '#8D5A3B'];
const HAIR = ['#2E2633', '#4A3426', '#1F1B2D', '#6B4A2E'];
const STUDENT_SHIRTS = ['#3FA796', '#5BB4D9', '#F2C14E', '#8DBA4E', '#E57A7A', '#5E8DD0'];
const ROLE_COLOUR = { students: '#3FA796', faculty: '#66518A', companies: '#E8892B' };

export function createScene(canvas, labelsEl, { onSelect, reduceMotion }) {
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

  /* ---------- Buildings ---------- */
  const pickables = [], objects = {}, windows = [];
  let flagMesh = null;
  const hipRoof = (w, d, h) => { const g = new THREE.ConeGeometry(1, h, 4); g.rotateY(Math.PI / 4); return [g, w / 1.414 * 1.12, d / 1.414 * 1.12]; };
  for (const [id, x, z, w, d, h, roof, style] of BUILDINGS) {
    const g = new THREE.Group(); g.position.copy(at(x + w / 2, z + d / 2));
    const body = mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: '#FBF8F2', roughness: 0.85 }), 0, h / 2, 0);
    g.add(body);
    const parts = [body];
    let top = h;
    if (style === 'hip' || style === 'main') {
      const [geo, sx, sz] = hipRoof(w, d, 0.9);
      const r = mesh(geo, mat(roof), 0, h + 0.45, 0); r.scale.set(sx, 1, sz); g.add(r); parts.push(r); top = h + 0.9;
    } else {
      const cap = mesh(new THREE.BoxGeometry(w + 0.12, 0.18, d + 0.12), mat(roof), 0, h + 0.09, 0); g.add(cap); parts.push(cap); top = h + 0.18;
    }
    if (style === 'main') { // clock tower + flag
      const tower = mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), mat('#FBF8F2', 'tower'), 0, h + 0.8, 0); g.add(tower); parts.push(tower);
      const [tg, tx, tz] = hipRoof(0.9, 0.9, 0.6); const tr = mesh(tg, mat(roof), 0, h + 1.9, 0); tr.scale.set(tx, 1, tz); g.add(tr); parts.push(tr);
      const clock = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 20), mat('#FFFFFF'), 0, h + 1.2, 0.47); clock.rotation.x = Math.PI / 2; g.add(clock);
      const pole = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), mat('#5B5770'), 0, h + 2.7, 0); g.add(pole);
      const flag = mesh(new THREE.BoxGeometry(0.5, 0.3, 0.02), mat('#7AA342'), 0.26, h + 3.05, 0); g.add(flag); flagMesh = flag;
      top = h + 2.4;
    }
    if (style === 'library') for (let i = 0; i < 4; i++) { const col = mesh(new THREE.CylinderGeometry(0.09, 0.09, h, 10), mat('#FFFFFF'), -w / 2 - 0.25, h / 2, -d / 2 + 0.5 + i * (d - 1) / 3); g.add(col); }
    if (style === 'hall') { const canopy = mesh(new THREE.BoxGeometry(w * 0.6, 0.12, 0.7), mat(roof), 0, h * 0.62, -d / 2 - 0.35); g.add(canopy); }
    // door facing the quad path
    const toward = new THREE.Vector3(-g.position.x, 0, -g.position.z);
    const door = Math.abs(toward.x) > Math.abs(toward.z)
      ? mesh(new THREE.BoxGeometry(0.03, 0.6, 0.45), mat('#7B6A58'), Math.sign(toward.x) * (w / 2 + 0.01), 0.3, 0)
      : mesh(new THREE.BoxGeometry(0.45, 0.6, 0.03), mat('#7B6A58'), 0, 0.3, Math.sign(toward.z) * (d / 2 + 0.01));
    g.add(door);
    // windows on all sides (collected into one instanced mesh)
    for (let y = 0.95; y < h - 0.25; y += 0.65) {
      for (let k = -w / 2 + 0.45; k <= w / 2 - 0.4; k += 0.55) { windows.push([g.position.x + k, y, g.position.z + d / 2 + 0.012, 0]); windows.push([g.position.x + k, y, g.position.z - d / 2 - 0.012, 0]); }
      for (let k = -d / 2 + 0.45; k <= d / 2 - 0.4; k += 0.55) { windows.push([g.position.x + w / 2 + 0.012, y, g.position.z + k, 1]); windows.push([g.position.x - w / 2 - 0.012, y, g.position.z + k, 1]); }
    }
    for (const m of parts) { m.userData.id = id; pickables.push(m); }
    scene.add(g);
    objects[id] = { group: g, body, top: new THREE.Vector3(g.position.x, top + 0.25, g.position.z), size: new THREE.Vector3(w, top, d), r: Math.max(w, d) * 0.85 };
  }
  inst(new THREE.BoxGeometry(0.3, 0.32, 0.02), mat('#CFDAEE'), windows, (o, [x, y, z, side]) => { o.position.set(x, y, z); o.rotation.y = side ? Math.PI / 2 : 0; });

  /* ---------- People ---------- */
  const geo = {
    legs: new THREE.BoxGeometry(0.2, 0.24, 0.13), body: new THREE.CylinderGeometry(0.1, 0.14, 0.36, 8),
    head: new THREE.SphereGeometry(0.1, 12, 10), hair: new THREE.SphereGeometry(0.106, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    pack: new THREE.BoxGeometry(0.1, 0.2, 0.18), case: new THREE.BoxGeometry(0.06, 0.12, 0.18),
  };
  const roleMats = { students: new Set(), faculty: new Set(), companies: new Set() };
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rand() * a.length)];
  function person(role, id) {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const shirt = role === 'students' ? pick(STUDENT_SHIRTS) : role === 'faculty' ? '#66518A' : '#2F4B7C';
    const shirtMat = mat(shirt, role + shirt); roleMats[role].add(shirtMat);
    inner.add(mesh(geo.legs, mat(role === 'students' ? '#4A5A78' : '#3B3650'), 0, 0.12, 0));
    inner.add(mesh(geo.body, shirtMat, 0, 0.42, 0));
    inner.add(mesh(geo.head, mat(pick(SKIN)), 0, 0.7, 0));
    inner.add(mesh(geo.hair, mat(role === 'faculty' && rand() < 0.4 ? '#9A95AD' : pick(HAIR)), 0, 0.71, 0));
    if (role === 'students') inner.add(mesh(geo.pack, mat('#5B5770'), -0.15, 0.45, 0));
    if (role === 'companies') inner.add(mesh(geo.case, mat('#6B4A2E'), 0.02, 0.2, 0.19));
    if (role === 'faculty') inner.add(mesh(new THREE.BoxGeometry(0.02, 0.16, 0.12), mat('#FFFFFF'), 0.13, 0.45, 0.1)); // notebook
    g.traverse(o => { if (o.isMesh) { o.userData.id = id; pickables.push(o); } });
    g.userData.inner = inner;
    g.scale.setScalar(1.3);
    scene.add(g);
    return g;
  }
  const facing = (g, from, to) => { g.rotation.y = Math.atan2(-(to.z - from.z), to.x - from.x); };

  // Teams at tables: students discussing, an idea bulb above, laptops on the table
  const teams = {}, discussing = [];
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#FFE08A', emissive: '#FFC94A', emissiveIntensity: 0.9 });
  for (const [id, x, z] of TEAMS) {
    const c = at(x, z);
    scene.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), mat('#FFFFFF'), c.x, 0.42, c.z));
    scene.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.4, 8), mat('#B9B3C8'), c.x, 0.2, c.z));
    for (const a of [0.6, 2.6, 4.4]) {
      const lap = new THREE.Group(); lap.position.set(c.x + Math.cos(a) * 0.25, 0.45, c.z + Math.sin(a) * 0.25); lap.rotation.y = -a;
      lap.add(mesh(new THREE.BoxGeometry(0.16, 0.012, 0.12), mat('#3B3650'), 0, 0, 0, false));
      const scr = mesh(new THREE.BoxGeometry(0.012, 0.1, 0.12), mat('#7AA342', 'screen'), -0.08, 0.05, 0, false); lap.add(scr);
      scene.add(lap);
    }
    const members = [];
    const n = id === 'kaleidosync' ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4, role = i === n - 1 && id !== 'kaleidosync' ? 'faculty' : 'students';
      const p = person(role, id); p.position.set(c.x + Math.cos(a) * 0.9, 0, c.z + Math.sin(a) * 0.9);
      facing(p, p.position, c); p.userData.base = p.rotation.y; p.userData.phase = rand() * 6;
      members.push(p); discussing.push(p);
    }
    const bulb = new THREE.Group(); bulb.position.set(c.x, 1.55, c.z);
    bulb.add(mesh(new THREE.SphereGeometry(0.17, 16, 12), bulbMat, 0, 0, 0, false), mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), mat('#B9B3C8'), 0, -0.17, 0, false));
    bulb.traverse(o => { if (o.isMesh) { o.userData.id = id; pickables.push(o); } });
    scene.add(bulb);
    teams[id] = { c, bulb, top: new THREE.Vector3(c.x, 2.0, c.z), r: 1.35 };
  }

  // Demo Day: a presenter, screen and an audience of faculty + company mentors beside the auditorium
  const screen = new THREE.Group(); screen.position.copy(at(18.4, 23.6));
  screen.add(mesh(new THREE.BoxGeometry(1.7, 1.0, 0.06), mat('#66518A'), 0, 1.0, 0), mesh(new THREE.BoxGeometry(1.5, 0.82, 0.02), mat('#FFFFFF'), 0, 1.0, 0.04, false));
  screen.add(mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mat('#5B5770'), -0.6, 0.25, 0), mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mat('#5B5770'), 0.6, 0.25, 0));
  screen.add(mesh(new THREE.BoxGeometry(0.9, 0.08, 0.02), mat('#7AA342', 'slide1'), -0.1, 1.2, 0.06, false), mesh(new THREE.BoxGeometry(0.6, 0.06, 0.02), mat('#E8892B', 'slide2'), -0.25, 1.02, 0.06, false), mesh(new THREE.BoxGeometry(1.0, 0.06, 0.02), mat('#CFDAEE', 'slide3'), -0.05, 0.86, 0.06, false));
  screen.traverse(o => { if (o.isMesh) { o.userData.id = 'solution'; pickables.push(o); } });
  scene.add(screen);
  const presenter = person('students', 'solution'); presenter.position.copy(at(19.5, 23.9)); facing(presenter, presenter.position, at(19.5, 21.5));
  [[17.6, 21.4, 'companies'], [18.4, 21.2, 'faculty'], [19.2, 21.3, 'companies'], [18.0, 20.6, 'students'], [18.9, 20.6, 'students']].forEach(([x, z, role]) => {
    const p = person(role, role); p.position.copy(at(x, z)); facing(p, p.position, at(18.4, 23.6)); discussing.push(p); p.userData.base = p.rotation.y; p.userData.phase = rand() * 6;
  });
  // students relaxing on benches
  for (const [x, z, r] of BENCHES) for (const s of [-0.25, 0.25]) {
    const p = person('students', 'students'); p.position.copy(at(x + (r ? 0 : s), z + (r ? s : 0), 0.05)); p.scale.y *= 0.85; p.rotation.y = r ? Math.PI : -Math.PI / 2;
    p.userData.base = p.rotation.y; p.userData.phase = rand() * 6; discussing.push(p);
  }

  /* ---------- Walkers ---------- */
  const route = (pts, loop = false) => {
    const P = pts.map(([x, z]) => at(x, z)); if (loop) P.push(P[0].clone());
    const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
    return { P, L, total: L[L.length - 1], loop };
  };
  const sample = (r, s, out) => {
    let i = 0; while (i < r.L.length - 2 && r.L[i + 1] < s) i++;
    const k = (s - r.L[i]) / (r.L[i + 1] - r.L[i] || 1);
    out.lerpVectors(r.P[i], r.P[i + 1], k);
    return r.P[i + 1].clone().sub(r.P[i]);
  };
  const walkers = [];
  const cardGeo = new THREE.BoxGeometry(0.42, 0.3, 0.02), cardMat = { go: mat('#F0973A', 'card-go'), back: mat('#7AA342', 'card-back') };
  function walker(role, id, r, speed, s0 = 0, pause = 0) {
    const g = person(role, id);
    const w = { g, r, speed, s: s0 * r.total, dir: 1, wait: 0, pause, phase: rand() * 6 };
    if (role === 'companies') { // problem card (orange) going in, solution card (green) coming back
      w.card = new THREE.Mesh(cardGeo, cardMat.go); w.card.castShadow = true; w.card.userData.id = id; pickables.push(w.card); scene.add(w.card);
    }
    walkers.push(w); return w;
  }
  const GATE = [-4.5, 3.7], IN = [3.7, 3.7];
  walker('companies', 'rep:idfc', route([GATE, IN, [6.6, 6.6]]), 1.1, 0.0, 2.5);
  walker('companies', 'rep:deloitte', route([GATE, IN, [12, 3.7], [12, 6.9], [15.4, 6.9]]), 1.1, 0.35, 2.5);
  walker('companies', 'rep:govardhan', route([GATE, IN, [3.7, 15.6], [6.6, 15.6]]), 1.0, 0.7, 2.5);
  walker('companies', 'rep:aurapay', route([GATE, IN, [12, 3.7], [12, 12], [15.4, 15.4]]), 1.1, 0.5, 2.5);
  walker('companies', 'rep:kaleidosync', route([GATE, IN, [3.7, 12.5], [1.6, 13.6]]), 1.0, 0.15, 2.5);
  const LOOP = [[3.7, 3.7], [20.3, 3.7], [20.3, 20.3], [3.7, 20.3]];
  walker('faculty', 'faculty', route(LOOP, true), 0.8, 0.1);
  walker('faculty', 'faculty', route([[8.5, 2.1], [12, 3.7], [12, 12], [20.3, 12], [21.6, 9.5]]), 0.8, 0.4, 2);
  walker('faculty', 'faculty', route([[6.8, 21.3], [6.8, 20.3], [12, 20.3], [12, 12], [7.6, 9]]), 0.75, 0.2, 2);
  for (let i = 0; i < 6; i++) walker('students', 'students', route(i % 2 ? LOOP : [...LOOP].reverse(), true), 0.9 + rand() * 0.4, i / 6);
  walker('students', 'students', route([[12, 4.4], [12, 19.6]]), 1.0, 0.3, 1.5);
  walker('students', 'students', route([[4.4, 12], [19.6, 12]]), 0.9, 0.6, 1.5);
  walker('students', 'students', route([[20.3, 12], [21.6, 14.1]]), 0.7, 0, 3);

  const tmp = new THREE.Vector3();
  function stepWalker(w, dt, t) {
    if (w.wait > 0) { w.wait -= dt; w.g.userData.inner.position.y = 0; }
    else {
      w.s += w.dir * w.speed * dt;
      if (w.r.loop) w.s = ((w.s % w.r.total) + w.r.total) % w.r.total;
      else if (w.s >= w.r.total) { w.s = w.r.total; w.dir = -1; w.wait = w.pause; if (w.card) w.card.material = cardMat.back; }
      else if (w.s <= 0) { w.s = 0; w.dir = 1; w.wait = w.pause; if (w.card) w.card.material = cardMat.go; }
      w.g.userData.inner.position.y = Math.abs(Math.sin(t * 9 + w.phase)) * 0.05;
    }
    const d = sample(w.r, w.s, tmp).multiplyScalar(w.dir);
    w.g.position.copy(tmp);
    if (d.lengthSq() > 0) w.g.rotation.y = Math.atan2(-d.z, d.x);
    if (w.card) { w.card.position.copy(w.g.position).setY(1.35 + Math.sin(t * 3 + w.phase) * 0.04); w.card.quaternion.copy(camera.quaternion); }
  }

  /* ---------- Selection ---------- */
  const marker = new THREE.Group(); marker.visible = false; scene.add(marker);
  const pin = new THREE.Group(), pinMat = new THREE.MeshStandardMaterial({ color: '#66518A', roughness: 0.4 });
  const ph = mesh(new THREE.SphereGeometry(0.28, 20, 14), pinMat, 0, 0.72, 0), pt = mesh(new THREE.ConeGeometry(0.22, 0.55, 20), pinMat, 0, 0.36, 0);
  pt.rotation.x = Math.PI; pin.add(ph, pt); marker.add(pin);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.1, 56), new THREE.MeshBasicMaterial({ color: '#66518A', transparent: true, opacity: 0.6 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.visible = false; scene.add(ring);
  let outline = null, selected = null, followed = null, glowRole = null; // followed: the walker a rep:* selection tracks
  const clearOutline = () => { if (outline) { outline.parent.remove(outline); outline.geometry.dispose(); outline = null; } };

  function select(id, { fly = true } = {}) {
    selected = id; clearOutline();
    glowRole = roleMats[id] ? id : null;
    for (const set of Object.values(roleMats)) for (const m of set) m.emissive.set('#000000');
    const o = objects[id], tm = teams[id];
    followed = walkers.find(w => w.card && w.card.userData.id === id) || null;
    ring.visible = !!(o || tm); marker.visible = !!(o || tm || followed);
    if (o) {
      outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(o.size.x + 0.14, o.size.y, o.size.z + 0.14)), new THREE.LineBasicMaterial({ color: '#66518A' }));
      outline.position.y = o.size.y / 2; o.group.add(outline);
      marker.position.copy(o.top); ring.position.set(o.group.position.x, 0.04, o.group.position.z); ring.scale.setScalar(o.r);
      if (fly) flyTo(o.group.position, Math.max(camera.zoom, 1.5));
    } else if (tm) {
      marker.position.copy(tm.top); ring.position.set(tm.c.x, 0.04, tm.c.z); ring.scale.setScalar(tm.r);
      if (fly) flyTo(tm.c, Math.max(camera.zoom, 2.4));
    } else if (followed) {
      if (fly) flyTo(followed.g.position, Math.max(camera.zoom, 2.2));
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
  canvas.addEventListener('pointerdown', () => { anim = null; });

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

  // HTML labels pinned to 3D anchors
  const labels = [];
  function addLabel(id, html, cls) {
    const el = document.createElement('button');
    el.className = 'maplabel ' + cls; el.innerHTML = html; el.type = 'button';
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
  for (const w of walkers) stepWalker(w, 0, 0);
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
    const before = controls.target.clone(); // keep the campus on screen
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -BOUND, BOUND);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -BOUND, BOUND);
    camera.position.add(controls.target.clone().sub(before));
    controls.update();

    if (!reduceMotion) {
      for (const w of walkers) stepWalker(w, dt, t);
      for (const p of discussing) { p.rotation.y = p.userData.base + Math.sin(t * 1.3 + p.userData.phase) * 0.35; p.userData.inner.position.y = Math.max(0, Math.sin(t * 2.2 + p.userData.phase)) * 0.025; }
      for (const tm of Object.values(teams)) tm.bulb.position.y = 1.55 + Math.sin(t * 2 + tm.c.x) * 0.07;
      bulbMat.emissiveIntensity = 0.7 + Math.sin(t * 3) * 0.25;
      spout.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
      if (flagMesh) flagMesh.rotation.y = Math.sin(t * 2.5) * 0.25;
      pin.position.y = Math.sin(t * 2.4) * 0.12;
      ring.material.opacity = 0.35 + Math.sin(t * 2.4) * 0.25;
      if (glowRole) for (const m of roleMats[glowRole]) m.emissive.set(ROLE_COLOUR[glowRole]).multiplyScalar(0.25 + Math.sin(t * 4) * 0.2);
    }
    if (followed) marker.position.copy(followed.g.position).setY(1.7);

    renderer.render(scene, camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const l of labels) {
      v.copy(l.anchor).project(camera);
      l.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
      l.el.classList.toggle('on', l.id === selected);
    }
  });

  return {
    select, addLabel,
    zoom: f => tween(controls.target.clone(), THREE.MathUtils.clamp(camera.zoom * f, controls.minZoom, controls.maxZoom)),
    spin: deg => tween(controls.target.clone(), camera.zoom, offset().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg))),
    home: () => tween(framed(HOME, 0.84), 0.84, OFFSET.clone()),
  };
}
