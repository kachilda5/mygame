let THREE = null;
const texCache = {};

function skinTex(base, accent) {
  const key = base + accent;
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    g.globalAlpha = 0.2 + Math.random() * 0.35;
    g.fillStyle = Math.random() < 0.5 ? accent : '#000000';
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 5, 0, Math.PI * 2);
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

function flesh(base, accent, rough) {
  const t = skinTex(base, accent);
  return new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, bumpMap: t, bumpScale: 2, roughness: rough || 0.85 });
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

function cone(parent, mat, r, h, x, y, z, rx, rz) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx || 0, 0, rz || 0);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function pair(fn) {
  fn(1);
  fn(-1);
}

function flashProxy(mat, base) {
  return { emissive: { setHex: (h) => mat.emissive.setHex(h === 0 ? base : h) } };
}

function buildGoblin() {
  const model = new THREE.Group();
  const skin = flesh('#4f6b34', '#2c3d1c');
  const dark = new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x4a3722, roughness: 1 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4b3321, roughness: 0.95 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false });

  const body = new THREE.Group();
  body.position.y = 0.83;
  body.rotation.x = 0.45;
  model.add(body);
  part(body, sph(0.27, 0.12, 1), skin, 0, 0.12, 0).scale.set(1, 1.2, 0.85);
  part(body, sph(0.24, 0.14, 2), skin, 0, -0.1, 0.06).scale.set(1.05, 0.9, 0.95);

  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.12);
  head.rotation.x = -0.35;
  body.add(head);
  part(head, sph(0.19, 0.08, 3), skin, 0, 0, 0).scale.set(1, 0.95, 1.1);
  part(head, new THREE.BoxGeometry(0.22, 0.025, 0.05), dark, 0, -0.1, 0.17);
  for (let i = 0; i < 5; i++) cone(head, bone, 0.016, 0.06, -0.08 + i * 0.04, -0.07, 0.19);
  cone(head, bone, 0.02, 0.07, 0.07, -0.1, 0.19, Math.PI);
  cone(head, bone, 0.02, 0.07, -0.07, -0.1, 0.19, Math.PI);
  cone(head, skin, 0.06, 0.22, 0, -0.02, 0.22, Math.PI / 2 + 0.4);
  pair((s) => {
    cone(head, skin, 0.08, 0.38, 0.2 * s, 0.04, -0.02, -0.3, -1.2 * s);
    part(head, new THREE.SphereGeometry(0.045, 8, 8), eyeM, 0.085 * s, 0.05, 0.17);
    part(head, new THREE.BoxGeometry(0.012, 0.05, 0.01), dark, 0.085 * s, 0.05, 0.215);
    part(head, new THREE.BoxGeometry(0.1, 0.025, 0.04), dark, 0.085 * s, 0.11, 0.18).rotation.z = 0.4 * s;
  });

  const arms = [];
  pair((s) => {
    const sh = new THREE.Group();
    sh.position.set(0.3 * s, 0.28, 0);
    body.add(sh);
    sh.add(hang(skin, 0.05, 0.3));
    const el = new THREE.Group();
    el.position.y = -0.4;
    el.rotation.x = -0.6;
    sh.add(el);
    el.add(hang(skin, 0.042, 0.28));
    part(el, sph(0.06, 0.1, 4), skin, 0, -0.4, 0);
    for (let i = -1; i <= 1; i++) cone(el, bone, 0.012, 0.09, i * 0.03, -0.48, 0.01, 0.1, 0);
    if (s === 1) {
      const club = new THREE.Group();
      club.position.set(0, -0.4, 0.02);
      club.rotation.x = -0.9;
      el.add(club);
      part(club, new THREE.CylinderGeometry(0.035, 0.07, 0.55, 8), wood, 0, -0.2, 0);
      part(club, sph(0.1, 0.15, 5), wood, 0, -0.5, 0);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        cone(club, bone, 0.02, 0.08, Math.cos(a) * 0.1, -0.5, Math.sin(a) * 0.1, Math.sin(a) * 1.4, -Math.cos(a) * 1.4);
      }
    }
    arms.push({ sh, s });
  });

  const legs = [];
  pair((s) => {
    const hip = new THREE.Group();
    hip.position.set(0.13 * s, 0.64, 0);
    model.add(hip);
    hip.add(hang(skin, 0.07, 0.22));
    const knee = new THREE.Group();
    knee.position.y = -0.36;
    hip.add(knee);
    knee.add(hang(skin, 0.055, 0.2));
    part(knee, new THREE.BoxGeometry(0.13, 0.05, 0.22), skin, 0, -0.31, 0.05);
    for (let i = -1; i <= 1; i++) cone(knee, bone, 0.016, 0.07, i * 0.04, -0.31, 0.19, Math.PI / 2);
    legs.push({ hip, knee, s });
  });
  part(model, new THREE.BoxGeometry(0.3, 0.3, 0.03), cloth, 0, 0.58, 0.17);

  let phase = 0, sm = 0;
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
  };
  return { model, bodyMat: flashProxy(skin, 0), anim, barY: 1.65 };
}

function buildWolf() {
  const model = new THREE.Group();
  const fur = flesh('#4b4845', '#2a2826', 0.95);
  const belly = flesh('#8d877e', '#5e5a53', 0.95);
  const dark = new THREE.MeshStandardMaterial({ color: 0x120e0c, roughness: 1 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffb02e, fog: false });

  const body = new THREE.Group();
  body.position.y = 0.62;
  model.add(body);
  const torso = part(body, lump(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), 0.08, 6), fur, 0, 0, 0);
  torso.rotation.x = Math.PI / 2;
  part(body, sph(0.24, 0.1, 7), fur, 0, 0.04, 0.3).scale.set(1, 1.1, 1);
  part(body, sph(0.17, 0.08, 8), belly, 0, -0.12, 0.02).scale.set(1, 0.6, 1.8);
  part(body, sph(0.15, 0.1, 9), fur, 0, 0.1, 0.5).scale.set(1, 1, 1.2);
  for (let i = 0; i < 9; i++) cone(body, fur, 0.03, 0.14, 0, 0.24, 0.5 - i * 0.11, -0.5);

  const head = new THREE.Group();
  head.position.set(0, 0.2, 0.64);
  body.add(head);
  part(head, sph(0.15, 0.06, 10), fur, 0, 0, 0).scale.set(1, 0.9, 1.1);
  const snout = part(head, new THREE.CapsuleGeometry(0.075, 0.2, 4, 8), fur, 0, -0.04, 0.2);
  snout.rotation.x = Math.PI / 2;
  part(head, new THREE.SphereGeometry(0.04, 8, 8), dark, 0, -0.01, 0.35);
  part(head, new THREE.BoxGeometry(0.1, 0.03, 0.2), dark, 0, -0.11, 0.2).rotation.x = 0.25;
  pair((s) => {
    cone(head, bone, 0.016, 0.06, 0.04 * s, -0.08, 0.3, Math.PI);
    cone(head, bone, 0.014, 0.05, 0.035 * s, -0.1, 0.3);
    cone(head, fur, 0.05, 0.16, 0.08 * s, 0.15, -0.02, -0.1, -0.25 * s);
    part(head, new THREE.SphereGeometry(0.03, 8, 8), eyeM, 0.07 * s, 0.05, 0.135);
  });

  const tail = new THREE.Group();
  tail.position.set(0, 0.12, -0.42);
  tail.rotation.x = -1.0;
  body.add(tail);
  const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.28, 4, 8), fur);
  seg.position.y = 0.19;
  seg.castShadow = true;
  tail.add(seg);
  part(tail, sph(0.07, 0.1, 11), fur, 0, 0.42, 0).scale.set(1, 1.6, 1);

  const legs = [];
  [[1, 0.3, 0], [-1, 0.3, 0.4], [1, -0.28, Math.PI + 0.2], [-1, -0.28, Math.PI + 0.6]].forEach(([s, z, off]) => {
    const hip = new THREE.Group();
    hip.position.set(0.13 * s, -0.05, z);
    body.add(hip);
    hip.add(hang(fur, 0.06, 0.18));
    const knee = new THREE.Group();
    knee.position.y = -0.3;
    hip.add(knee);
    knee.add(hang(fur, 0.045, 0.2));
    part(knee, new THREE.SphereGeometry(0.06, 8, 6), fur, 0, -0.3, 0.03).scale.set(1, 0.7, 1.4);
    for (let i = -1; i <= 1; i++) cone(knee, bone, 0.01, 0.05, i * 0.025, -0.31, 0.1, Math.PI / 2);
    legs.push({ hip, knee, off });
  });

  let phase = 0, sm = 0;
  const anim = (dt, speed) => {
    sm += (speed - sm) * Math.min(1, dt * 8);
    phase += dt * (2 + Math.min(sm, 8) * 2.2);
    const A = Math.min(sm / 3, 1) * 0.9;
    const t = performance.now() / 1000;
    legs.forEach((l) => {
      l.hip.rotation.x = Math.sin(phase + l.off) * A;
      l.knee.rotation.x = 0.35 + Math.max(0, -Math.cos(phase + l.off)) * A * 0.9;
    });
    body.position.y = 0.62 + Math.abs(Math.sin(phase)) * 0.04 * A;
    body.rotation.x = Math.sin(phase) * 0.05 * A;
    tail.rotation.x = -1.0 + Math.sin(phase * 1.5) * 0.15 * A;
    tail.rotation.z = Math.sin(t * 2) * 0.25;
    head.rotation.x = Math.sin(phase + 1) * 0.06 * A + Math.sin(t * 1.5) * 0.03;
  };
  return { model, bodyMat: flashProxy(fur, 0), anim, barY: 1.3 };
}

function buildBoss(theme) {
  const PAL = {
    forest: { base: '#3b2a1c', accent: '#1f1610', crack: '#7cff5a' },
    swamp: { base: '#3d4a2a', accent: '#222b16', crack: '#d7ff3a' },
    mountain: { base: '#8fa6bd', accent: '#566a80', crack: '#7fe8ff' },
  };
  const P = PAL[theme] || PAL.forest;
  const model = new THREE.Group();
  const skin = flesh(P.base, P.accent, 0.9);
  skin.emissive.setHex(0xffffff);
  skin.emissiveMap = crackTex(P.crack);
  skin.emissiveIntensity = 1.5;
  const bone = new THREE.MeshStandardMaterial({ color: 0xd9d2bd, roughness: 0.6 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.crack), fog: false });

  const body = new THREE.Group();
  body.position.y = 1.75;
  body.rotation.x = 0.12;
  model.add(body);
  part(body, sph(0.85, 0.1, 21), skin, 0, 0.85, 0).scale.set(1.15, 1, 0.9);
  part(body, sph(0.7, 0.1, 22), skin, 0, 0.1, 0.05).scale.set(1, 0.95, 0.9);
  part(body, sph(0.55, 0.1, 23), skin, 0, -0.5, 0).scale.set(1.1, 0.8, 0.9);
  for (let i = 0; i < 6; i++) cone(body, bone, 0.1, 0.45, 0, 1.3 - i * 0.3, -0.62 + (i % 2) * 0.05, -0.9);
  pair((s) => {
    part(body, sph(0.42, 0.12, 24), skin, 1.0 * s, 1.35, 0);
    for (let i = 0; i < 3; i++) cone(body, bone, 0.09, 0.5, 1.0 * s + (i - 1) * 0.2 * s, 1.75, (i - 1) * 0.15, 0, -0.3 * s * (i - 1));
  });

  const head = new THREE.Group();
  head.position.set(0, 1.75, 0.35);
  body.add(head);
  part(head, sph(0.42, 0.08, 25), skin, 0, 0, 0).scale.set(1, 0.9, 1);
  part(head, new THREE.BoxGeometry(0.55, 0.2, 0.4), skin, 0, -0.3, 0.18);
  part(head, new THREE.BoxGeometry(0.34, 0.05, 0.1), glow, 0, -0.18, 0.32);
  part(head, new THREE.BoxGeometry(0.62, 0.1, 0.2), skin, 0, 0.18, 0.28);
  pair((s) => {
    cone(head, bone, 0.06, 0.3, 0.2 * s, -0.2, 0.36);
    part(head, new THREE.SphereGeometry(0.07, 10, 8), glow, 0.17 * s, 0.06, 0.36);
    cone(head, bone, 0.12, 0.55, 0.3 * s, 0.4, 0, 0, -0.9 * s);
    cone(head, bone, 0.08, 0.5, 0.62 * s, 0.72, 0, 0, -0.25 * s);
  });

  const arms = [];
  pair((s) => {
    const sh = new THREE.Group();
    sh.position.set(1.0 * s, 1.3, 0);
    body.add(sh);
    sh.add(hang(skin, 0.26, 0.7));
    const el = new THREE.Group();
    el.position.y = -1.22;
    el.rotation.x = -0.5;
    sh.add(el);
    el.add(hang(skin, 0.22, 0.6));
    part(el, sph(0.32, 0.12, 26 + (s > 0 ? 0 : 1)), skin, 0, -1.0, 0);
    for (let i = -1; i <= 1; i++) cone(el, bone, 0.05, 0.28, i * 0.12, -1.28, 0.1, 0.2);
    arms.push({ sh, s });
  });

  const legs = [];
  pair((s) => {
    const hip = new THREE.Group();
    hip.position.set(0.5 * s, 1.3, 0);
    model.add(hip);
    hip.add(hang(skin, 0.25, 0.2));
    const knee = new THREE.Group();
    knee.position.y = -0.7;
    hip.add(knee);
    knee.add(hang(skin, 0.21, 0.2));
    part(knee, new THREE.BoxGeometry(0.42, 0.16, 0.6), skin, 0, -0.62, 0.1);
    for (let i = -1; i <= 1; i++) cone(knee, bone, 0.05, 0.2, i * 0.13, -0.62, 0.42, Math.PI / 2);
    legs.push({ hip, knee, s });
  });

  model.scale.setScalar(0.85);

  let phase = 0, sm = 0;
  const anim = (dt, speed) => {
    sm += (speed - sm) * Math.min(1, dt * 6);
    phase += dt * (2 + Math.min(sm, 3) * 1.8);
    const A = Math.min(sm / 1.2, 1) * 0.55;
    const sn = Math.sin(phase), cs = Math.cos(phase);
    const t = performance.now() / 1000;
    legs.forEach((l) => {
      const f = l.s > 0 ? 1 : -1;
      l.hip.rotation.x = sn * f * A;
      l.knee.rotation.x = 0.1 + Math.max(0, -cs * f) * A * 0.9;
    });
    arms.forEach((a) => { a.sh.rotation.x = -0.15 - sn * (a.s > 0 ? 1 : -1) * A * 0.8 + Math.sin(t * 1.2) * 0.04; });
    body.rotation.z = sn * 0.05 * A;
    body.position.y = 1.75 + Math.abs(sn) * 0.05 * A;
    head.rotation.y = Math.sin(t * 0.7) * 0.15;
  };
  return { model, bodyMat: flashProxy(skin, 0xffffff), anim, barY: 4.2 };
}

export function buildMonster(T, kind, theme) {
  THREE = T;
  if (kind === 'wolf') return buildWolf();
  if (kind === 'boss') return buildBoss(theme);
  return buildGoblin();
}
