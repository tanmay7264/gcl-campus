import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';

// Campus layout in grid units (0..24), centred at the origin. [id, x, z, w, d, h, roofColour]
const C = 12;
export const LAYOUT = [
  ['challenge', 0, 0, 2.6, 2.6, 1.2, '#F0973A'],
  ['stakeholders', 7, -0.5, 3, 2.4, 1.6, '#8DBA4E'],
  ['journey', 13, -0.5, 3, 2.4, 1.4, '#8DBA4E'],
  ['insights', 21.8, 6, 2.6, 3.4, 2.2, '#8DBA4E'],
  ['prototype', 21.8, 12.5, 2.6, 3.2, 1.6, '#8DBA4E'],
  ['solution', 14, 21.8, 3.4, 2.4, 2.0, '#7B63A6'],
  ['idfc', 8, 6.5, 2.4, 2.4, 3.2, '#7B63A6'],
  ['deloitte', 12.5, 6, 2, 2, 5.2, '#4F86C6'],
  ['aurapay', 13, 11.5, 3, 2.4, 1.6, '#7B63A6'],
  ['govardhan', 7, 14, 2.2, 1.6, 0.9, '#B98A55'],
  ['kaleidosync', 0, 15, 1.4, 1.4, 0.8, '#B98A55'],
];
const FIELDS = [[-1, 13, 3.5, 7], [6, 13, 4.5, 4.5]];
const TREES = [[-2, 4], [-2, 8], [5.5, 1], [11.5, 1.8], [17.5, 0.5], [24, 2], [25.5, 10], [24, 18], [18, 24.5], [10, 24], [5, 23], [-2, 22], [11, 10.5], [16.5, 9], [9.5, 17.5], [17.5, 16.5], [1.5, 10.5], [-3, 15], [26, 22], [0.5, 25]];

const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 });
const BODY = '#F8F9FC';

export function createScene(canvas, labelsEl, { onSelect, reduceMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); // throws without WebGL
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#EEF1F8');

  // Isometric-style orthographic camera
  const FR = 15;
  const camera = new THREE.OrthographicCamera(-FR, FR, FR, -FR, -200, 400);
  const OFFSET = new THREE.Vector3(60, 52, 60);
  camera.position.copy(OFFSET); camera.zoom = 1.05;
  const controls = new MapControls(camera, canvas);
  controls.enableDamping = !reduceMotion; controls.dampingFactor = 0.08;
  controls.minZoom = 0.7; controls.maxZoom = 3.2; controls.zoomToCursor = true;
  const polar = new THREE.Spherical().setFromVector3(OFFSET).phi;
  controls.minPolarAngle = controls.maxPolarAngle = polar; // lock tilt, allow spin
  controls.update();

  scene.add(new THREE.HemisphereLight('#FFFFFF', '#C9D2E6', 1.6));
  const sun = new THREE.DirectionalLight('#FFFFFF', 1.7);
  sun.position.set(18, 30, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const flat = (x, z, w, d, y, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), mat(color));
    m.position.set(x - C + w / 2, y, z - C + d / 2); m.receiveShadow = true; scene.add(m); return m;
  };
  flat(-8, -8, 40, 40, -0.02, '#E3E8F2');
  flat(-1, -1, 26, 26, 0, '#F4F6FB');
  for (const [x, z, w, d] of [[3, 3, 18, 1.6], [3, 19.4, 18, 1.6], [3, 3, 1.6, 18], [19.4, 3, 1.6, 18]]) flat(x, z, w, d, 0.01, '#D3D9E6');
  for (let i = 5; i < 19; i += 2) { flat(i, 3.72, 0.9, 0.16, 0.02, '#FFFFFF'); flat(i, 20.12, 0.9, 0.16, 0.02, '#FFFFFF'); flat(3.72, i, 0.16, 0.9, 0.02, '#FFFFFF'); flat(20.12, i, 0.16, 0.9, 0.02, '#FFFFFF'); }
  for (const [x, z, w, d] of FIELDS) flat(x, z, w, d, 0.015, '#DCEBC7');

  // Trees (instanced: one draw call each for trunks and crowns)
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 0.5, 6), mat('#B9A58A'), TREES.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 0), mat('#9CC46A'), TREES.length);
  crowns.material.flatShading = true; crowns.castShadow = trunks.castShadow = true;
  const m4 = new THREE.Matrix4();
  TREES.forEach(([x, z], i) => {
    trunks.setMatrixAt(i, m4.makeTranslation(x - C, 0.25, z - C));
    crowns.setMatrixAt(i, m4.compose(new THREE.Vector3(x - C, 0.85, z - C), new THREE.Quaternion(), new THREE.Vector3(1, 1.25, 1)));
  });
  scene.add(trunks, crowns);

  // Buildings
  const pickables = [], objects = {};
  for (const [id, x, z, w, d, h, roof] of LAYOUT) {
    const g = new THREE.Group(); g.position.set(x - C + w / 2, 0, z - C + d / 2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(BODY));
    body.position.y = h / 2; body.castShadow = body.receiveShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.16, d + 0.08), mat(roof));
    cap.position.y = h + 0.08; cap.castShadow = true;
    g.add(body, cap);
    const glass = mat('#DCE3F2'); // window bands on all four sides
    for (let y = 0.55; y < h - 0.2; y += 0.6) {
      for (const s of [1, -1]) {
        const a = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.16, 0.02), glass); a.position.set(0, y, s * (d / 2 + 0.01));
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, d * 0.8), glass); b.position.set(s * (w / 2 + 0.01), y, 0);
        g.add(a, b);
      }
    }
    for (const m of [body, cap]) { m.userData.id = id; pickables.push(m); }
    scene.add(g);
    objects[id] = { group: g, body, top: new THREE.Vector3(g.position.x, h + 0.3, g.position.z), size: new THREE.Vector3(w, h, d) };
  }

  // Trucks driving the road loop, each carrying a past project through the stages
  const SIDE = 16.4, perim = 4 * SIDE;
  const loop = [[3.8, 3.8], [20.2, 3.8], [20.2, 20.2], [3.8, 20.2]].map(([x, z]) => new THREE.Vector3(x - C, 0, z - C));
  const pointAt = s => {
    s = ((s % perim) + perim) % perim;
    const i = Math.floor(s / SIDE), a = loop[i], b = loop[(i + 1) % 4];
    return { p: a.clone().lerp(b, (s % SIDE) / SIDE), dir: b.clone().sub(a).normalize() };
  };
  function truck(cab) {
    const g = new THREE.Group();
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.5), mat('#FFFFFF')); trailer.position.set(-0.2, 0.42, 0);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.48), mat(cab)); front.position.set(0.68, 0.37, 0);
    const wheelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10), wheelMat = mat('#3B3650');
    for (const [wx, wz] of [[-0.6, 0.26], [-0.6, -0.26], [0.65, 0.26], [0.65, -0.26]]) {
      const wh = new THREE.Mesh(wheelGeo, wheelMat); wh.rotation.x = Math.PI / 2; wh.position.set(wx, 0.11, wz); g.add(wh);
    }
    g.add(trailer, front);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  const trucks = [['truck:idfc', '#7B63A6', 0], ['truck:deloitte', '#4F86C6', 16], ['truck:govardhan', '#B98A55', 33], ['truck:aurapay', '#7B63A6', 49]].map(([id, cab, s]) => {
    const g = truck(cab); scene.add(g);
    g.traverse(o => { if (o.isMesh) { o.userData.id = id; pickables.push(o); } });
    const tr = { id, g, s, top: new THREE.Vector3() };
    place(tr);
    return tr;
  });
  function place(tr) {
    const { p, dir } = pointAt(tr.s);
    tr.g.position.copy(p).add(new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(0.4)); // keep to one lane
    tr.g.rotation.y = Math.atan2(-dir.z, dir.x);
    tr.top.copy(tr.g.position).setY(1.15);
  }

  // Selection marker: outline + bobbing pin + pulsing ground ring
  const marker = new THREE.Group(); marker.visible = false; scene.add(marker);
  const pin = new THREE.Group();
  const pinMat = new THREE.MeshStandardMaterial({ color: '#66518A', roughness: 0.4 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), pinMat); head.position.y = 0.75;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 20), pinMat); tip.rotation.x = Math.PI; tip.position.y = 0.38;
  pin.add(head, tip); marker.add(pin);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 48), new THREE.MeshBasicMaterial({ color: '#66518A', transparent: true, opacity: 0.6 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.visible = false; scene.add(ring);
  let outline = null, selected = null;

  function clearOutline() { if (outline) { outline.parent.remove(outline); outline.geometry.dispose(); outline = null; } }
  function select(id, { fly = true } = {}) {
    selected = id; clearOutline();
    const tr = trucks.find(t => t.id === id), o = objects[id];
    ring.visible = !!o; marker.visible = !!(o || tr);
    if (tr) { if (fly) flyTo(tr.g.position, Math.max(camera.zoom, 1.4)); return; }
    if (!o) return;
    outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(o.size.x + 0.14, o.size.y + 0.3, o.size.z + 0.14)), new THREE.LineBasicMaterial({ color: '#66518A' }));
    outline.position.y = (o.size.y + 0.3) / 2; o.group.add(outline);
    marker.position.copy(o.top);
    ring.position.set(o.group.position.x, 0.03, o.group.position.z);
    ring.scale.setScalar(Math.max(o.size.x, o.size.z) * 0.85);
    if (fly) flyTo(o.group.position, Math.max(camera.zoom, 1.5));
  }

  // Smooth camera moves; dragging the map cancels them.
  let anim = null;
  const offset = () => camera.position.clone().sub(controls.target);
  function tween(toT, toZ, toOff = null) {
    anim = { t: reduceMotion ? 1 : 0, fromT: controls.target.clone(), toT, fromZ: camera.zoom, toZ, fromOff: offset(), toOff };
  }
  // On desktop, aim right of the point so it lands in the free area left of the inspector panel.
  function framed(point, zoom) {
    const to = new THREE.Vector3(point.x, 0, point.z);
    if (innerWidth > 900) {
      const halfW = (camera.right - camera.left) / 2 / zoom;              // world units from centre to edge
      const shift = halfW * (380 / (canvas.clientWidth / 2)) / 2;          // half the inspector's width
      to.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize(), shift);
    }
    return to;
  }
  const flyTo = (target, zoom) => tween(framed(target, zoom), zoom);
  canvas.addEventListener('pointerdown', () => { anim = null; });

  // Picking (click without drag) and hover highlight
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = e => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(pickables, false)[0]?.object.userData.id ?? null;
  };
  let down = null, hovered = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) { const id = pick(e); if (id) onSelect(id); }
    down = null;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.buttons) return;
    const id = pick(e);
    if (id === hovered) return;
    if (objects[hovered]) objects[hovered].body.material.emissive.set('#000000');
    hovered = id;
    if (objects[id]) objects[id].body.material.emissive.set('#3A2C66').multiplyScalar(0.12);
    canvas.style.cursor = id ? 'pointer' : '';
  });

  // HTML labels pinned to 3D anchors
  const labels = [];
  function addLabel(id, html, cls) {
    const el = document.createElement('button');
    el.className = 'maplabel ' + cls; el.innerHTML = html; el.type = 'button';
    el.addEventListener('click', () => onSelect(id));
    labelsEl.append(el);
    labels.push({ id, el, anchor: objects[id]?.top ?? trucks.find(t => t.id === id)?.top });
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight, a = w / h;
    const fr = a < 1 ? FR / a * 0.75 : FR; // portrait screens: widen the view
    renderer.setSize(w, h, false);
    Object.assign(camera, { left: -fr * a, right: fr * a, top: fr, bottom: -fr });
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  camera.zoom = 0.95; camera.updateMatrixWorld(); // initial framing, matching the home button
  { const t = framed(new THREE.Vector3(0, 0, 1), 0.95); camera.position.add(t.clone().sub(controls.target)); controls.target.copy(t); camera.updateProjectionMatrix(); controls.update(); }

  const v = new THREE.Vector3(), clock = new THREE.Clock(), BOUND = 13;
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
      for (const tr of trucks) { tr.s += dt * 1.1; place(tr); }
      pin.position.y = Math.sin(t * 2.4) * 0.12;
      ring.material.opacity = 0.35 + Math.sin(t * 2.4) * 0.25;
    }
    const tr = trucks.find(x => x.id === selected);
    if (tr) marker.position.copy(tr.top).setY(1.0);

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
    home: () => tween(framed(new THREE.Vector3(0, 0, 1), 0.95), 0.95, OFFSET.clone()),
  };
}
