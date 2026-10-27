import * as B from './icemonsters.js';

let THREE = null;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BOSS_SCALE = { yeti: 2.1, wolf: 3.0, skeleton: 2.4, golem: 2.2, wraith: 2.5 };

function makeAnim(cfg) {
  let phase = 0, sm = 0, atkT = 0, atkDur = 0;
  const attack = (dur) => { atkDur = dur; atkT = dur; };
  const anim = (dt, speed) => {
    sm += (speed - sm) * Math.min(1, dt * 8);
    phase += dt * (cfg.f0 + Math.min(sm, cfg.fmax) * cfg.f1);
    const A = Math.min(sm / cfg.ref, 1) * cfg.amp;
    const sn = Math.sin(phase), cs = Math.cos(phase);
    const t = performance.now() / 1000;
    cfg.legs.forEach((l) => {
      const f = l.s > 0 ? 1 : -1;
      l.hip.rotation.x = cfg.legBase + sn * f * A;
      l.knee.rotation.x = cfg.kneeBase + Math.max(0, -cs * f) * A * 0.9;
    });
    cfg.arms.forEach((a) => {
      a.sh.rotation.x = cfg.armBase - sn * (a.s > 0 ? 1 : -1) * A * 0.7;
      a.el.rotation.x = cfg.elbowBase;
    });
    cfg.body.position.y = cfg.bodyY + Math.abs(sn) * 0.04 * A + Math.sin(t * 1.6) * 0.015;
    cfg.body.rotation.x = cfg.lean;
    cfg.head.rotation.y = Math.sin(t * 0.7) * 0.15;
    if (atkT > 0) {
      atkT -= dt;
      const p = 1 - Math.max(atkT, 0) / atkDur;
      const a = p < 0.7 ? p / 0.7 : 1 - ((p - 0.7) / 0.3) * 1.15;
      cfg.arms.forEach((m) => {
        if (cfg.atkSide && m.s !== cfg.atkSide) return;
        m.sh.rotation.x = cfg.armBase - a * cfg.atkRaise;
      });
      cfg.body.rotation.x = cfg.lean - a * 0.3;
    }
  };
  return { anim, attack };
}

function buildSkeleton(theme) {
  const P = B.ICE[theme] || B.ICE.frost;
  const model = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color: 0xcfdde8, roughness: 0.75 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x7e8c99, metalness: 0.7, roughness: 0.4 });
  const ice = B.iceMat(P);
  const glow = new THREE.MeshBasicMaterial({ color: P.eye, fog: false });

  const body = new THREE.Group();
  body.position.y = 0.85;
  model.add(body);
  B.part(body, new THREE.CapsuleGeometry(0.035, 0.5, 4, 6), bone, 0, 0.3, -0.02);
  for (let i = 0; i < 5; i++) {
    const rib = B.part(body, new THREE.TorusGeometry(0.15 - Math.abs(i - 2) * 0.012, 0.014, 6, 14, Math.PI * 1.5), bone, 0, 0.18 + i * 0.085, 0.02);
    rib.rotation.set(Math.PI / 2, 0, Math.PI * 0.75);
  }
  B.part(body, new THREE.BoxGeometry(0.28, 0.1, 0.16), bone, 0, -0.08, 0);

  const head = new THREE.Group();
  head.position.set(0, 0.8, 0.02);
  body.add(head);
  B.part(head, new THREE.SphereGeometry(0.13, 14, 12), bone, 0, 0, 0).scale.set(0.95, 1.05, 1);
  B.part(head, new THREE.BoxGeometry(0.12, 0.04, 0.1), bone, 0, -0.1, 0.06);
  for (let i = -2; i <= 2; i++) B.spike(head, bone, V(i * 0.025, -0.085, 0.115), V(0, -1, 0.1), 0.04, 0.008);
  B.scatter(head, ice, V(0, 0.05, 0), V(0.13, 0.14, 0.13), 4, 0.08, 0.18, (d) => d.y > 0.4);
  B.pair((s) => {
    B.part(head, new THREE.SphereGeometry(0.03, 8, 8), glow, 0.05 * s, 0.02, 0.1);
    B.spike(body, ice, V(0.2 * s, 0.62, 0), V(s, 0.8, 0), 0.22, 0.045);
  });

  const arms = [];
  B.pair((s) => {
    const sh = new THREE.Group();
    sh.position.set(0.2 * s, 0.6, 0);
    body.add(sh);
    sh.add(B.hang(bone, 0.025, 0.26));
    const el = new THREE.Group();
    el.position.y = -0.3;
    sh.add(el);
    el.add(B.hang(bone, 0.022, 0.24));
    B.part(el, new THREE.SphereGeometry(0.035, 8, 6), bone, 0, -0.3, 0);
    for (let i = -1; i <= 1; i++) B.spike(el, bone, V(i * 0.015, -0.33, 0.01), V(0, -1, 0.3), 0.07, 0.008);
    if (s === -1) {
      const sw = new THREE.Group();
      sw.position.set(0, -0.3, 0);
      sw.rotation.x = Math.PI / 2;
      B.part(sw, new THREE.BoxGeometry(0.05, 0.75, 0.012), metal, 0, 0.42, 0);
      B.part(sw, new THREE.BoxGeometry(0.2, 0.03, 0.04), metal, 0, 0.05, 0);
      B.spike(sw, ice, V(0.03, 0.2, 0), V(1, 0.3, 0), 0.12, 0.02);
      B.spike(sw, ice, V(-0.03, 0.45, 0), V(-1, 0.3, 0), 0.12, 0.02);
      el.add(sw);
    } else {
      B.part(el, new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), metal, 0, -0.18, 0.12).rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        B.spike(el, ice, V(Math.cos(a) * 0.2, -0.18 + Math.sin(a) * 0.2, 0.14), V(Math.cos(a), Math.sin(a), 0.4), 0.13, 0.025);
      }
    }
    arms.push({ sh, el, s });
  });

  const legs = [];
  B.pair((s) => {
    const hip = new THREE.Group();
    hip.position.set(0.09 * s, 0.72, 0);
    model.add(hip);
    hip.add(B.hang(bone, 0.03, 0.3));
    const knee = new THREE.Group();
    knee.position.y = -0.36;
    hip.add(knee);
    knee.add(B.hang(bone, 0.026, 0.3));
    B.part(knee, new THREE.BoxGeometry(0.08, 0.04, 0.16), bone, 0, -0.35, 0.04);
    legs.push({ hip, knee, s });
  });

  const A = makeAnim({
    legs, arms, body, head, bodyY: 0.85, lean: 0, legBase: 0, kneeBase: 0.1, armBase: -0.2, elbowBase: -0.3,
    ref: 1.9, amp: 0.8, f0: 3, f1: 1.8, fmax: 6, atkRaise: 2.4, atkSide: -1,
  });
  return { model, bodyMat: B.flashProxy(bone, 0), anim: A.anim, attack: A.attack, barY: 1.95 };
}

function buildYeti(theme) {
  const P = B.ICE[theme] || B.ICE.frost;
  const model = new THREE.Group();
  const fur = B.rockMat('#dce8f2', '#b4c6d8', '#ffffff', null);
  const furTip = new THREE.MeshStandardMaterial({ color: 0xf3f9ff, roughness: 1, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 1 });
  const ice = B.iceMat(P);
  const glow = new THREE.MeshBasicMaterial({ color: P.eye, fog: false });

  const body = new THREE.Group();
  body.position.y = 1.25;
  body.rotation.x = 0.3;
  model.add(body);
  B.part(body, B.sph(0.6, 0.1, 41), fur, 0, 0.15, 0).scale.set(1.2, 1.1, 0.95);
  B.part(body, B.sph(0.5, 0.1, 42), fur, 0, -0.4, 0.05).scale.set(1.1, 0.9, 0.95);
  B.scatter(body, furTip, V(0, 0.1, 0), V(0.72, 0.68, 0.6), 44, 0.12, 0.26, null);
  B.scatter(body, ice, V(0, 0.2, -0.1), V(0.75, 0.7, 0.6), 9, 0.25, 0.55, (d) => d.y > 0.2 && d.z < 0.2);

  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.6);
  head.rotation.x = -0.25;
  body.add(head);
  B.part(head, B.sph(0.32, 0.08, 43), fur, 0, 0, 0).scale.set(1, 0.95, 1);
  B.scatter(head, furTip, V(0, 0.05, -0.03), V(0.34, 0.32, 0.3), 14, 0.08, 0.18, (d) => d.z < 0.2);
  B.part(head, B.sph(0.22, 0.05, 44), dark, 0, -0.03, 0.2).scale.set(1, 0.9, 0.8);
  B.part(head, new THREE.BoxGeometry(0.22, 0.04, 0.08), dark, 0, -0.14, 0.3);
  for (let i = -3; i <= 3; i++) B.spike(head, ice, V(i * 0.05, -0.13, 0.32), V(0, -1, 0.1), 0.16, 0.025);
  B.pair((s) => {
    B.part(head, new THREE.SphereGeometry(0.05, 8, 8), glow, 0.1 * s, 0.06, 0.28);
    B.spike(head, ice, V(0.22 * s, 0.2, 0), V(s, 1, -0.2), 0.35, 0.06);
  });

  const arms = [];
  B.pair((s) => {
    B.part(body, B.sph(0.3, 0.1, 45 + (s > 0 ? 0 : 1)), fur, 0.7 * s, 0.4, 0.05);
    B.scatter(body, ice, V(0.7 * s, 0.5, 0.05), V(0.3, 0.3, 0.3), 3, 0.2, 0.4, (d) => d.y > 0.2);
    const sh = new THREE.Group();
    sh.position.set(0.7 * s, 0.3, 0.05);
    sh.rotation.x = -0.3;
    body.add(sh);
    sh.add(B.hang(fur, 0.2, 0.5));
    const el = new THREE.Group();
    el.position.y = -0.9;
    el.rotation.x = 0.3;
    sh.add(el);
    el.add(B.hang(fur, 0.18, 0.45));
    B.part(el, B.sph(0.26, 0.1, 47 + (s > 0 ? 0 : 1)), fur, 0, -0.85, 0.03);
    for (let i = -1; i <= 1; i++) B.spike(el, ice, V(i * 0.1, -1.0, 0.1), V(i * 0.05, -1, 0.6), 0.4, 0.05);
    arms.push({ sh, el, s });
  });

  const legs = [];
  B.pair((s) => {
    const hip = new THREE.Group();
    hip.position.set(0.35 * s, 0.95, 0);
    model.add(hip);
    hip.add(B.hang(fur, 0.22, 0.15));
    const knee = new THREE.Group();
    knee.position.y = -0.55;
    hip.add(knee);
    knee.add(B.hang(fur, 0.19, 0.1));
    B.part(knee, new THREE.BoxGeometry(0.4, 0.15, 0.55), fur, 0, -0.4, 0.1);
    legs.push({ hip, knee, s });
  });

  const A = makeAnim({
    legs, arms, body, head, bodyY: 1.25, lean: 0.3, legBase: 0, kneeBase: 0.1, armBase: -0.3, elbowBase: 0.3,
    ref: 1.1, amp: 0.55, f0: 2, f1: 1.8, fmax: 3, atkRaise: 2.2,
  });
  return { model, bodyMat: B.flashProxy(fur, 0), anim: A.anim, attack: A.attack, barY: 2.7 };
}

function buildGolem(theme) {
  const P = B.ICE[theme] || B.ICE.frost;
  const model = new THREE.Group();
  const rock = B.rockMat('#2a3a50', '#142030', '#6a8ab8', P.crack);
  const ice = B.iceMat(P);
  const glow = new THREE.MeshBasicMaterial({ color: P.eye, fog: false });

  const body = new THREE.Group();
  body.position.y = 1.5;
  model.add(body);
  B.part(body, B.lump(new THREE.BoxGeometry(1.0, 1.0, 0.65, 5, 5, 5), 0.08, 51), rock, 0, 0.1, 0);
  B.part(body, B.lump(new THREE.BoxGeometry(0.8, 0.5, 0.55, 4, 4, 4), 0.08, 52), rock, 0, -0.6, 0);
  B.part(body, new THREE.SphereGeometry(0.17, 12, 10), glow, 0, 0.15, 0.34);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    B.spike(body, ice, V(Math.cos(a) * 0.25, 0.15 + Math.sin(a) * 0.25, 0.33), V(Math.cos(a), Math.sin(a), 0.7), 0.22, 0.04);
  }
  B.scatter(body, ice, V(0, 0.2, -0.1), V(0.55, 0.55, 0.38), 12, 0.3, 0.7, (d) => d.z < 0.1 && d.y > -0.2);

  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.08);
  body.add(head);
  B.part(head, B.lump(new THREE.BoxGeometry(0.5, 0.42, 0.45, 3, 3, 3), 0.08, 53), rock, 0, 0, 0);
  B.pair((s) => B.part(head, new THREE.BoxGeometry(0.12, 0.05, 0.05), glow, 0.12 * s, 0.02, 0.23));
  B.scatter(head, ice, V(0, 0.1, 0), V(0.26, 0.22, 0.22), 5, 0.2, 0.5, (d) => d.y > 0.4);

  const arms = [];
  B.pair((s) => {
    B.part(body, B.lump(new THREE.BoxGeometry(0.5, 0.45, 0.5, 3, 3, 3), 0.08, 54 + (s > 0 ? 0 : 1)), rock, 0.85 * s, 0.45, 0);
    B.scatter(body, ice, V(0.85 * s, 0.6, 0), V(0.25, 0.25, 0.25), 3, 0.25, 0.5, (d) => d.y > 0.3);
    const sh = new THREE.Group();
    sh.position.set(0.85 * s, 0.35, 0);
    body.add(sh);
    sh.add(B.hang(rock, 0.24, 0.45));
    const el = new THREE.Group();
    el.position.y = -0.95;
    sh.add(el);
    el.add(B.hang(rock, 0.22, 0.4));
    B.part(el, B.lump(new THREE.BoxGeometry(0.55, 0.5, 0.55, 3, 3, 3), 0.08, 56 + (s > 0 ? 0 : 1)), rock, 0, -0.85, 0.02);
    arms.push({ sh, el, s });
  });

  const legs = [];
  B.pair((s) => {
    const hip = new THREE.Group();
    hip.position.set(0.38 * s, 1.25, 0);
    model.add(hip);
    hip.add(B.hang(rock, 0.28, 0.2));
    const knee = new THREE.Group();
    knee.position.y = -0.7;
    hip.add(knee);
    knee.add(B.hang(rock, 0.25, 0.1));
    B.part(knee, new THREE.BoxGeometry(0.6, 0.2, 0.7), rock, 0, -0.55, 0.1);
    legs.push({ hip, knee, s });
  });

  const A = makeAnim({
    legs, arms, body, head, bodyY: 1.5, lean: 0.05, legBase: 0, kneeBase: 0.05, armBase: -0.15, elbowBase: 0.2,
    ref: 0.8, amp: 0.4, f0: 1.6, f1: 1.6, fmax: 2.5, atkRaise: 2.2,
  });
  return { model, bodyMat: B.flashProxy(rock, 0xffffff), anim: A.anim, attack: A.attack, barY: 3.0 };
}

function buildWraith(theme) {
  const P = B.ICE[theme] || B.ICE.frost;
  const model = new THREE.Group();
  const robeM = new THREE.MeshStandardMaterial({
    color: 0xbcd4ee, emissive: P.emis, emissiveIntensity: 0.35, roughness: 0.6,
    transparent: true, opacity: 0.82, side: THREE.DoubleSide,
  });
  const ice = B.iceMat(P);
  const dark = new THREE.MeshStandardMaterial({ color: 0x050a12, roughness: 1 });
  const glow = new THREE.MeshBasicMaterial({ color: P.eye, fog: false });

  const hover = new THREE.Group();
  hover.position.y = 0.5;
  model.add(hover);
  const rg = new THREE.CylinderGeometry(0.14, 0.4, 1.1, 14, 6, true);
  const rp = rg.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const y = rp.getY(i);
    if (y < -0.2) rp.setY(i, y - Math.random() * 0.12);
  }
  rg.computeVertexNormals();
  const robe = new THREE.Mesh(rg, robeM);
  robe.position.y = 0.85;
  hover.add(robe);

  const strips = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * 0.34, 0.3, Math.sin(a) * 0.34);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.5), robeM);
    m.position.y = -0.25;
    g.add(m);
    hover.add(g);
    strips.push({ g, a });
  }

  const head = new THREE.Group();
  head.position.set(0, 1.5, 0.02);
  hover.add(head);
  B.part(head, new THREE.SphereGeometry(0.17, 14, 12), robeM, 0, 0.01, 0).scale.set(1, 1.1, 1.1);
  B.part(head, new THREE.SphereGeometry(0.12, 12, 10), dark, 0, -0.01, 0.09).scale.set(1, 1.05, 0.8);
  B.pair((s) => B.part(head, new THREE.SphereGeometry(0.03, 8, 8), glow, 0.05 * s, 0.01, 0.17));
  B.scatter(head, ice, V(0, 0.08, 0), V(0.17, 0.18, 0.17), 7, 0.12, 0.3, (d) => d.y > 0.35);

  const arms = [];
  B.pair((s) => {
    const sh = new THREE.Group();
    sh.position.set(0.2 * s, 1.35, 0.05);
    sh.rotation.x = -1.0;
    hover.add(sh);
    sh.add(B.hang(robeM, 0.035, 0.3));
    const el = new THREE.Group();
    el.position.y = -0.4;
    el.rotation.x = -0.3;
    sh.add(el);
    el.add(B.hang(robeM, 0.03, 0.25));
    B.part(el, new THREE.SphereGeometry(0.045, 8, 6), dark, 0, -0.32, 0);
    for (let i = -1; i <= 1; i++) B.spike(el, ice, V(i * 0.02, -0.36, 0.01), V(0, -1, 0.3), 0.14, 0.015);
    arms.push({ sh, el, s });
  });

  const orbit = new THREE.Group();
  orbit.position.y = 1.1;
  hover.add(orbit);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    B.spike(orbit, ice, V(Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65), V(Math.cos(a), 0.6, Math.sin(a)), 0.28, 0.05);
  }

  let sm = 0, atkT = 0, atkDur = 0;
  const attack = (dur) => { atkDur = dur; atkT = dur; };
  const anim = (dt, speed) => {
    sm += (speed - sm) * Math.min(1, dt * 6);
    const t = performance.now() / 1000;
    hover.position.y = 0.5 + Math.sin(t * 2) * 0.1;
    hover.rotation.x = Math.min(sm / 3, 1) * 0.25;
    strips.forEach((s, i) => {
      s.g.rotation.x = Math.sin(t * 3 + i) * 0.35 + 0.2;
      s.g.rotation.z = Math.cos(t * 2.4 + i) * 0.2;
    });
    orbit.rotation.y += dt * (atkT > 0 ? 6 : 1.2);
    arms.forEach((a) => { a.sh.rotation.x = -1.0 + Math.sin(t * 2 + a.s) * 0.08; });
    head.rotation.y = Math.sin(t * 0.8) * 0.2;
    if (atkT > 0) {
      atkT -= dt;
      const p = 1 - Math.max(atkT, 0) / atkDur;
      const a = p < 0.7 ? p / 0.7 : 1 - ((p - 0.7) / 0.3) * 1.1;
      arms.forEach((m) => { m.sh.rotation.x = -1.0 - a * 1.5; });
    }
  };
  return { model, bodyMat: B.flashProxy(robeM, P.emis), anim, attack, barY: 2.3 };
}

export function buildFoe(T, kind, theme, boss) {
  THREE = T;
  B.setup(T);
  let r;
  if (kind === 'colossus') return B.buildMonster(T, 'boss', theme);
  if (kind === 'skeleton') r = buildSkeleton(theme);
  else if (kind === 'yeti') r = buildYeti(theme);
  else if (kind === 'wraith') r = buildWraith(theme);
  else if (kind === 'golem') r = buildGolem(theme);
  else if (kind === 'wolf') r = B.buildMonster(T, 'wolf', theme);
  else r = B.buildMonster(T, 'goblin', theme);
  if (boss) {
    const k = BOSS_SCALE[kind] || 2;
    r.model.scale.multiplyScalar(k);
    r.barY *= k;
  }
  return r;
}
