export function buildHuman(THREE, color) {
  const M = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra });
  const skins = [0xf1c7a5, 0xd9a07a, 0xb07a54, 0x8a5a3c, 0x5c3b28];
  const hairs = [0x1a1210, 0x3a2414, 0x6b4423, 0xc9a35a];
  const n = color >>> 0;
  const skinMat = M(skins[n % 5]);
  const hairMat = M(hairs[(n >> 3) % 4]);
  const bodyMat = M(new THREE.Color(color).lerp(new THREE.Color(0x555555), 0.45));
  const pantsMat = M(0x2b2d36);
  const leatherMat = M(0x3a2818);
  const steelMat = M(0xb8c0cc, { metalness: 0.8, roughness: 0.3 });
  const darkSteel = M(0x4a4f59, { metalness: 0.7, roughness: 0.4 });
  const bootMat = M(0x1a1512);

  const model = new THREE.Group();
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const cyl = (r1, r2, h, seg = 10) => new THREE.CylinderGeometry(r1, r2, h, seg);
  const sph = (r, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h);

  function leg(x) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.95, 0);
    add(hip, cyl(0.08, 0.065, 0.46), pantsMat, 0, -0.23, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    add(knee, cyl(0.062, 0.05, 0.44), pantsMat, 0, -0.22, 0);
    add(knee, new THREE.BoxGeometry(0.11, 0.09, 0.26), bootMat, 0, -0.455, 0.05);
    hip.add(knee);
    model.add(hip);
    return { hip, knee };
  }

  function arm(x, sword) {
    const sh = new THREE.Group();
    sh.position.set(x, 1.5, 0);
    add(sh, cyl(0.058, 0.05, 0.3), bodyMat, 0, -0.15, 0);
    const el = new THREE.Group();
    el.position.y = -0.3;
    add(el, cyl(0.048, 0.04, 0.28), skinMat, 0, -0.14, 0);
    add(el, sph(0.05), skinMat, 0, -0.3, 0);
    el.rotation.x = sword ? -0.5 : -0.25;
    sh.add(el);
    if (sword) {
      const sw = new THREE.Group();
      sw.position.set(0, -0.29, 0);
      sw.rotation.x = Math.PI / 2;
      add(sw, new THREE.BoxGeometry(0.05, 0.85, 0.02), steelMat, 0, 0.5, 0);
      add(sw, new THREE.BoxGeometry(0.2, 0.035, 0.045), darkSteel, 0, 0.09, 0);
      add(sw, cyl(0.02, 0.02, 0.14), leatherMat, 0, 0, 0);
      add(sw, sph(0.03), darkSteel, 0, -0.08, 0);
      el.add(sw);
      model.userData.sword = sw;
      model.userData.hand = el;
    }
    model.add(sh);
    return { sh, el };
  }

  const legL = leg(0.11);
  const legR = leg(-0.11);
  const armL = arm(0.25, false);
  const armR = arm(-0.25, true);

  add(model, cyl(0.17, 0.16, 0.2, 12), pantsMat, 0, 0.93, 0).scale.z = 0.75;
  add(model, cyl(0.175, 0.175, 0.06, 12), leatherMat, 0, 1.03, 0).scale.z = 0.75;
  add(model, cyl(0.2, 0.16, 0.5, 12), bodyMat, 0, 1.28, 0).scale.z = 0.7;
  add(model, cyl(0.21, 0.185, 0.3, 12), leatherMat, 0, 1.38, 0).scale.z = 0.72;
  for (const s of [-1, 1]) {
    add(model, sph(0.095), darkSteel, 0.235 * s, 1.52, 0).scale.y = 0.8;
    add(model, sph(0.026, 8, 6), skinMat, 0.105 * s, 1.68, 0).scale.x = 0.6;
    add(model, sph(0.014, 8, 6), M(0x111111), 0.04 * s, 1.69, 0.108);
  }
  add(model, cyl(0.05, 0.055, 0.1, 8), skinMat, 0, 1.58, 0);
  add(model, sph(0.115), skinMat, 0, 1.68, 0).scale.set(0.9, 1.1, 1);
  add(model, new THREE.BoxGeometry(0.022, 0.04, 0.035), skinMat, 0, 1.665, 0.112);
  add(model, new THREE.BoxGeometry(0.05, 0.008, 0.01), M(0x7a3b3b), 0, 1.63, 0.106);
  add(model, new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), hairMat, 0, 1.7, -0.01).scale.set(0.95, 1.1, 1.05);
  add(model, sph(0.11), hairMat, 0, 1.67, -0.045).scale.set(0.95, 1, 0.8);

  model.scale.setScalar(0.85);
  model.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  let phase = 0, sm = 0;
  const anim = (dt, speed, swing) => {
    sm += (speed - sm) * Math.min(1, dt * 10);
    phase += dt * Math.min(sm, 6) * 2.2;
    const A = 0.85 * Math.min(sm / 5, 1);
    const s = Math.sin(phase), c = Math.cos(phase);
    legL.hip.rotation.x = s * A;
    legR.hip.rotation.x = -s * A;
    legL.knee.rotation.x = Math.max(0, -c) * A * 1.3;
    legR.knee.rotation.x = Math.max(0, c) * A * 1.3;
    armL.sh.rotation.x = -s * A * 0.7;
    if (swing > 0) {
      const u = 1 - Math.min(swing, 1);
      armR.sh.rotation.x = u < 0.35 ? -0.3 - 2.2 * (u / 0.35) : -2.5 + 2.7 * ((u - 0.35) / 0.65);
    } else {
      armR.sh.rotation.x = -0.3 + s * A * 0.25;
    }
  };

  return { model, bodyMat, pivot: null, anim };
}
