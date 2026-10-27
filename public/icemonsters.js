let THREE = null;
let OCT = null;
let UP = null;
const texCache = {};

const ICE = {
  frost: { ice: 0x9fd8ff, emis: 0x1a6fd0, eye: 0x66ccff, crack: '#5fd4ff' },
  winter: { ice: 0xcdbdff, emis: 0x5a3fd0, eye: 0xb79cff, crack: '#a98cff' },
  blizzard: { ice: 0xe9f6ff, emis: 0x6fb0e0, eye: 0xdff4ff, crack: '#bfe6ff' },
  glacier: { ice: 0x7fb4ff, emis: 0x1050d0, eye: 0x4fa0ff, crack: '#2f8bff' },
};

function V(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

function rockTex(base, accent, speck) {
  const key = 'rock' + base + accent + speck;
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    g.globalAlpha = 0.2 + Math.random() * 0.4;
    const r = Math.random();
    g.fillStyle = r < 0.45 ? accent : r < 0.8 ? '#000000' : speck;
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 6, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  texCache[key] = t;
  return t;
}

function crackTex(color) {
  const key = 'crack' + color;
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000000';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.shadowColor = color;
  g.shadowBlur = 8;
  for (let i = 0; i < 16; i++) {
    let x = Math.random() * 256, y = Math.random() * 256;
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 7; j++) {
      x += (Math.random() - 0.5) * 50;
      y += (Math.random() - 0.5) * 50;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  texCache[key] = t;
  return t;
}

function lump(geo, amt, seed) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 7.1 + seed) * Math.sin(v.y * 8.3 + seed * 2) * Math.sin(v.z * 6.7 + seed * 3);
    v.multiplyScalar(1 + n * amt);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function iceMat(P) {
  return new THREE.MeshStandardMaterial({
    color: P.ice, emissive: P.emis, emissiveIntensity: 0.55,
    roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.82, flatShading: true,
  });
}

function rockMat(base, accent, speck, crack) {
  const t = rockTex(base, accent, speck);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, bumpMap: t, bumpScale: 3, roughness: 0.9 });
  if (crack) {
    m.emissive.setHex(0xffffff);
    m.emissiveMap = crackTex(crack);
    m.emissiveIntensity = 1.3;
  }
  return m;
}

function part(parent, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function sph(r, amt, seed) {
  return lump(new THREE.SphereGeometry(r, 14, 12), amt, seed);
}

function hang(mat, r, len) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), mat);
  m.position.y = -(len / 2 + r);
  m.castShadow = true;
  return m;
}

function pair(fn) {
  fn(1);
  fn(-1);
}

function flashProxy(mat, base) {
  return { emissive: { setHex: (h) => mat.emissive.setHex(h === 0 ? base : h) } };
}

function spike(parent, mat, pos, dir, h, r) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
  const m = new THREE.Mesh(OCT, mat);
  m.scale.set(r, h / 2, r);
  m.position.y = h / 2;
  g.add(m);
  parent.add(g);
  return g;
}

function scatter(parent, mat, c, rad, n, hMin, hMax, accept) {
  let made = 0, tries = 0;
  while (made < n && tries < n * 8) {
    tries++;
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const d = V(s * Math.cos(th), u, s * Math.sin(th));
    if (accept && !accept(d)) continue;
    const pos = V(c.x + d.x * rad.x, c.y + d.y * rad.y, c.z + d.z * rad.z);
    const dir = d.clone().add(V((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.5));
    const h = hMin + Math.random() * (hMax - hMin);
    spike(parent, mat, pos, dir, h, h * 0.2);
    made++;
  }
}

function buildImp(theme) {
  const P = ICE[theme] || ICE.frost;
  const model = new THREE.Group();
  const rock = rockMat('#243349', '#121b2b', '#6f8fb8', P.crack);
  const ice = iceMat(P);
  const eyeM = new THREE.MeshBasicMaterial({ color: P.eye, fog: false });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 1 });

  const body = new THREE.Group();
  body.position.y = 0.83;
  body.rotation.x = 0.45;
  model.add(body);
  part(body, sph(0.27, 0.14, 1), rock, 0, 0.12, 0).scale.set(1, 1.2, 0.85);
  part(body, sph(0.24, 0.16, 2), rock, 0, -0.1, 0.06).scale.set(1.05, 0.9, 0.95);
  scatter(body, ice, V(0, 0.15, -0.02), V(0.3, 0.38, 0.25), 9, 0.14, 0.34, (d) => d.z < 0.15 && d.y > -0.2);

  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.12);
  head.rotation.x = -0.35;
  body.add(head);
  part(head, sph(0.18, 0.1, 3), rock, 0, 0, 0).scale.set(1, 0.95, 1.1);
  scatter(head, ice, V(0, 0.02, -0.02), V(0.17, 0.18, 0.17), 6, 0.1, 0.24, (d) => d.y > 0.3);
  part(head, new THREE.BoxGeometry(0.2, 0.02, 0.05), dark, 0, -0.1, 0.16);
  for (let i = -2; i <= 2; i++) spike(head, ice, V(i * 0.035, -0.09, 0.18), V(0, -1, 0.1), 0.07, 0.014);
  pair((s) => {
    part(head, new THREE.SphereGeometry(0.04, 8, 8), eyeM, 0.08 * s, 0.05, 0.16);
    spike(head, ice, V(0.18 * s, 0.04, 0), V(s, 0.5, -0.2), 0.22, 0.04);
  });

  const arms = [];
  pair((s) => {
    const sh = new THREE.Group();
    sh.position.set(0.3 * s, 0.28, 0);
    body.add(sh);
    sh.add(hang(rock, 0.05, 0.3));
    const el = new THREE.Group();
    el.position.y = -0.4;
    el.rotation.x = -0.6;
    sh.add(el);
    el.add(hang(rock, 0.042, 0.28));
    part(el, sph(0.06, 0.1, 4), rock, 0, -0.4, 0);
    for (let i = -1; i <= 1; i++) spike(el, ice, V(i * 0.03, -0.44, 0.01), V(0, -1, 0.3), 0.17, 0.022);
    arms.push({ sh, el, s });
  });

  const legs = [];
  pair((s) => {
    const hip = new THREE.Group();
    hip.position.set(0.13 * s, 0.64, 0);
    model.add(hip);
    hip.add(hang(rock, 0.07, 0.22));
    const knee = new THREE.Group();
    knee.position.y = -0.36;
    hip.add(knee);
    knee.add(hang(rock, 0.055, 0.2));
    part(knee, new THREE.BoxGeometry(0.13, 0.05, 0.22), rock, 0, -0.31, 0.05);
    for (let i = -1; i <= 1; i++) spike(knee, ice, V(i * 0.04, -0.31, 0.15), V(0, -0.1, 1), 0.09, 0.018);
    legs.push({ hip, knee, s });
  });

  let phase = 0, sm = 0, atkT = 0, atkDur = 0;
  const attack = (dur) => { atkDur = dur; atkT = dur; };
  const anim = (dt, speed) => {
    sm += (speed - sm) * Math.min(1, dt * 8);
    phase += dt * (3 + Math.min(sm, 6) * 1.8);
    const A = Math.min(sm / 1.7, 1) * 0.75;
    const sn = Math.sin(phase), cs = Math.cos(phase);
    legs.forEach((l) => {
      const f = l.s > 0 ? 1 : -1;
      l.hip.rotation.x = -0.35 + sn * f * A * 0.8;
      l.knee.rotation.x = 0.7 + Math.max(0, -cs * f) * A * 0.9;
    });
    arms.forEach((a) => { a.sh.rotation.x = -0.4 - sn * (a.s > 0 ? 1 : -1) * A * 0.6; });
    body.rotation.x = 0.45 + Math.sin(phase * 2) * 0.04 * A;
    const t = performance.now() / 1000;
    body.scale.y = 1 + Math.sin(t * 2.2) * 0.02;
    head.rotation.z = Math.sin(t * 1.3) * 0.05;
    if (atkT > 0) {
      atkT -= dt;
      const p = 1 - Math.max(atkT, 0) / atkDur;
      const a = p < 0.7 ? p / 0.7 : 1 - ((p - 0.7) / 0.3) * 1.2;
      arms.forEach((m) => { m.sh.rotation.x = -0.4 - a * 2.2; });
      body.rotation.x = 0.45 - a * 0.35;
    }
  };
  return { model, bodyMat: flashProxy(rock, 0xffffff), anim, attack, barY: 1.55 };
}

export function setup(T) {
  THREE = T;
  if (!OCT) OCT = new THREE.OctahedronGeometry(1);
  UP = new THREE.Vector3(0, 1, 0);
}
export { ICE, V, lump, iceMat, rockMat, part, sph, hang, pair, flashProxy, spike, scatter };
