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

  // Demo Day screen beside the auditorium (front faces the audience on its +z side)
  const screen = new THREE.Group(); screen.position.copy(at(18.1, 22.3));
  screen.add(mesh(cube(1.7, 1.0, 0.06), mat('#66518A'), 0, 1.0, 0), mesh(cube(1.5, 0.82, 0.02), mat('#FFFFFF'), 0, 1.0, 0.04, false));
  screen.add(mesh(cube(0.06, 0.5, 0.06), mat('#5B5770'), -0.6, 0.25, 0), mesh(cube(0.06, 0.5, 0.06), mat('#5B5770'), 0.6, 0.25, 0));
  screen.add(mesh(cube(0.9, 0.08, 0.02), mat('#7AA342', 'slide1'), -0.1, 1.2, 0.06, false), mesh(cube(0.6, 0.06, 0.02), mat('#E8892B', 'slide2'), -0.25, 1.02, 0.06, false), mesh(cube(1.0, 0.06, 0.02), mat('#CFDAEE', 'slide3'), -0.05, 0.86, 0.06, false));
  screen.traverse(o => { if (o.isMesh) { o.userData.id = 'solution'; pickables.push(o); } });
  scene.add(screen);

  /* ---------- The live project: one group walks the GCL process, stage by stage ---------- */
  // Each stage: where the group gathers (`spot` cells per actor) and what they look at.
  // Actors: [company mentor, faculty mentor, student, student, student]
  const STAGE_IDS = ['challenge', 'stakeholders', 'journey', 'insights', 'prototype', 'solution'];
  const BEATS = [
    // Stage 1: mentor + faculty meet at the gate; students wait at the studio (their own door). `focus` = who the caption follows.
    { door: [3.7, 3.7], look: [0.3, 0.2], spots: [[2.0, 3.95], [2.75, 3.3], [8.0, 2.35], [8.6, 2.15], [9.15, 2.45]], doors: [null, null, [8.5, 3.7], [8.5, 3.7], [8.5, 3.7]], focus: [0, 1], poses: ['talk', 'listen', 'talk', 'listen', 'talk'] },
    { door: [8.5, 3.7], look: [8.5, 0.6], spots: [[7.5, 2.85], [9.6, 2.85], [8.0, 2.35], [8.6, 2.15], [9.15, 2.45]], poses: ['talk', 'listen', 'talk', 'listen', 'talk'] },
    { door: [14.5, 3.7], look: [14.5, 0.6], spots: [[12.9, 3.0], [15.6, 2.85], [14.0, 2.35], [14.6, 2.15], [15.1, 2.45]], poses: ['listen', 'listen', 'talk', 'talk', 'listen'] },
    // East buildings: gather on their south side, which faces the camera
    { door: [20.3, 10.2], look: [23.2, 7.7], spots: [[23.95, 10.65], [21.3, 10.5], [22.2, 10.2], [22.75, 10.05], [23.3, 10.1]], poses: ['listen', 'listen', 'present', 'talk', 'talk'] },
    { door: [20.3, 16.7], look: [23.2, 14.1], spots: [[23.95, 17.05], [21.3, 16.9], [22.2, 16.6], [22.75, 16.45], [23.3, 16.5]], poses: ['talk', 'listen', 'present', 'talk', 'listen'] },
    { door: [18.4, 20.3], look: [18.1, 22.3], spots: [[17.7, 24.0], [18.5, 24.1], [16.9, 22.75], [19.3, 22.75], [19.95, 22.9]], poses: ['listen', 'listen', 'present', 'present', 'listen'] },
  ];
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
  const actor = (role, id, shirt) => { const r = person(role, id, shirt); return { r, path: null, s: 0, total: 0, door: null }; };
  const mentors = [actor('companies', 'companies'), actor('companies', 'companies')];
  for (const m of mentors) { m.card = new THREE.Mesh(cardGeo, cardMat.problem); m.card.castShadow = true; m.card.userData.id = 'companies'; pickables.push(m.card); scene.add(m.card); }
  const crew = [actor('faculty', 'faculty'), actor('students', 'students', '#3FA796'), actor('students', 'students', '#F2C14E'), actor('students', 'students', '#5E8DD0')];
  const place = (a, cell, door) => { a.r.g.position.copy(at(...cell)); a.door = door; a.path = null; a.r.pose = 'idle'; };
  place(crew[0], BEATS[0].spots[1], BEATS[0].door);
  crew.slice(1).forEach((a, i) => place(a, BEATS[1].spots[i + 2], BEATS[1].door));
  mentors.forEach(m => { place(m, SPAWN, 'spawn'); m.r.g.visible = m.card.visible = false; });

  function walkTo(a, cell, door) {
    const from = a.r.g.position.clone(), pts = [from];
    if (a.door === 'spawn' && door !== 'spawn' && sOf(door) === 0) door = 'gate'; // arriving guest stops inside the arch
    const enter = a.door === 'spawn' ? [[SPAWN[0] + 1, SPAWN[1]], LOOPC[0]] : [a.door];
    if (door === 'gate') { pts.push(at(...cell)); door = BEATS[0].door; }
    else {
      const leave = door === 'spawn' ? [LOOPC[0], SPAWN] : [door];
      for (const c of [...enter.slice(0, -1), ...arc(enter[enter.length - 1], leave[0]), ...leave.slice(1)]) pts.push(at(...c));
      if (door !== 'spawn') pts.push(at(...cell));
    }
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    Object.assign(a, { path: pts, L, s: 0, total: L[L.length - 1], door, target: cell });
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
    if (a.s >= a.total) { a.path = null; return true; }
    return false;
  }

  let beat = 0, loopN = 0, phase = 'walk', dwell = 0, mentor = mentors[0];
  const project = () => TEAMS[loopN % TEAMS.length][0];
  function startBeat(i) {
    beat = i; phase = 'walk';
    const b = BEATS[i];
    if (i === 0) { // a new company arrives; the previous one heads home with its solution
      const prev = mentor; mentor = mentors[loopN % 2];
      if (prev !== mentor && prev.r.g.visible) walkTo(prev, null, 'spawn');
      place(mentor, SPAWN, 'spawn'); mentor.r.g.visible = mentor.card.visible = true; mentor.card.material = cardMat.problem;
    }
    const cast = [mentor, ...crew];
    cast.forEach((a, k) => { if (b.spots[k]) walkTo(a, b.spots[k], b.doors?.[k] || b.door); });
    onStory?.({ stage: STAGE_IDS[i], project: project(), phase: 'walk' });
  }
  function updateStory(dt) {
    let arrived = true;
    for (const m of mentors) if (m !== mentor && m.path) { if (stepActor(m, dt)) m.r.g.visible = m.card.visible = false; }
    [mentor, ...crew].forEach(a => { if (!stepActor(a, dt)) arrived = false; });
    if (phase === 'walk' && arrived) {
      phase = 'dwell'; dwell = beat === 5 ? 9 : 8;
      onStory?.({ stage: STAGE_IDS[beat], project: project(), phase: 'work', duration: dwell });
      const b = BEATS[beat], look = at(...b.look);
      [mentor, ...crew].forEach((a, k) => { if (!b.spots[k]) return; a.r.pose = b.poses[k] || 'listen'; face(a.r.g, k > 1 && beat > 2 ? at(...b.spots[0]) : k > 1 && beat === 0 ? at(...BEATS[1].look) : look); });
      if (beat === 0) face(mentor.r.g, crew[0].r.g.position), face(crew[0].r.g, mentor.r.g.position);
      if (beat === 5) [crew[1], crew[2]].forEach(a => face(a.r.g, at(18.1, 24.1)));
    } else if (phase === 'dwell') {
      dwell -= dt;
      if (beat === 5 && dwell < 4) mentor.card.material = cardMat.solution; // the problem card becomes a solution
      if (dwell <= 0) { if (beat === 5) { loopN++; startBeat(0); } else startBeat(beat + 1); }
    }
  }
  // Orange spotlight that follows the featured company's group
  const spot = new THREE.Mesh(new THREE.RingGeometry(1, 1.16, 56), new THREE.MeshBasicMaterial({ color: '#F0973A', transparent: true, opacity: 0.7, depthWrite: false }));
  spot.rotation.x = -Math.PI / 2; scene.add(spot);
  const spotFill = new THREE.Mesh(new THREE.CircleGeometry(1, 56), new THREE.MeshBasicMaterial({ color: '#F0973A', transparent: true, opacity: 0.1, depthWrite: false }));
  spotFill.rotation.x = -Math.PI / 2; scene.add(spotFill);
  const storyAnchor = new THREE.Vector3();
  function groupCentre() {
    const b = BEATS[beat]; storyAnchor.set(0, 0, 0); let n = 0;
    [mentor, ...crew].forEach((a, k) => { if (b.spots[k] && (!b.focus || b.focus.includes(k))) { storyAnchor.add(a.r.g.position); n++; } });
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
    selected = id; clearOutline();
    glowRole = roleMats[id] ? id : null;
    for (const set of Object.values(roleMats)) for (const m of set) m.emissive.set('#000000');
    const o = objects[id], tm = teams[id];
    ring.visible = !!(o || tm); marker.visible = !!(o || tm);
    if (o) {
      outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(o.size.x + 0.14, o.size.y, o.size.z + 0.14)), new THREE.LineBasicMaterial({ color: '#66518A' }));
      outline.position.y = o.size.y / 2; o.group.add(outline);
      marker.position.copy(o.top); ring.position.set(o.group.position.x, 0.04, o.group.position.z); ring.scale.setScalar(o.r);
      if (fly) flyTo(o.group.position, Math.max(camera.zoom, 1.5));
    } else if (tm) {
      marker.position.copy(tm.top); ring.position.set(tm.c.x, 0.04, tm.c.z); ring.scale.setScalar(tm.r);
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
    zoom: f => tween(controls.target.clone(), THREE.MathUtils.clamp(camera.zoom * f, controls.minZoom, controls.maxZoom)),
    spin: deg => tween(controls.target.clone(), camera.zoom, offset().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg))),
    home: () => tween(framed(HOME, 0.84), 0.84, OFFSET.clone()),
  };
}
