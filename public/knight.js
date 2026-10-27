let THREE = null;

export const SKIN = ['#f1c7a5', '#d9a07a', '#b07a54', '#8a5a3c', '#6b4429', '#4a2e1e'];
export const HAIRC = ['#0e0b0a', '#2a1a10', '#5a3a1c', '#8a5a2b', '#c9a35a', '#9a9a9a'];
export const CLOAKC = ['#18203f', '#4a1018', '#1c3a2a', '#3a2a52', '#2a2a2e', '#6b5a3a', '#e8e8ec', '#0f4a5a'];
export const ARMORS = [
  { name: 'Dark steel', metal: '#3a3d44', leather: '#3b2a1d', trim: '#b99a4a' },
  { name: 'Silver', metal: '#a9b0ba', leather: '#4a3626', trim: '#d8c27a' },
  { name: 'Gold', metal: '#b8923a', leather: '#2e2218', trim: '#f0d27a' },
  { name: 'Black', metal: '#1c1d21', leather: '#1a1410', trim: '#7a7a86' },
  { name: 'Bronze', metal: '#7a5a3a', leather: '#3a2a1c', trim: '#d09a5a' },
];
export const HAIRS = ['Curly', 'Buzz', 'Long', 'Bald', 'Mohawk'];
export const BEARDS = ['None', 'Goatee', 'Full'];
export const CRESTS = ['Crown', 'Star', 'Cross', 'Sun', 'None'];
export const SWORDS = ['Steel', 'Golden', 'Dark'];
export const DEFAULT_LOOK = { skin: 3, hair: 0, hairColor: 0, beard: 1, cloak: 0, armor: 0, crest: 0, sword: 0 };

const cache = {};

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function canvasTex(key, w, h, draw) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  cache[key] = t;
  return t;
}

function noiseFill(g, w, h, base, cols, n) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.15 + Math.random() * 0.3;
    g.fillStyle = cols[Math.floor(Math.random() * cols.length)];
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1 + Math.random() * 3);
  }
  g.globalAlpha = 1;
}

function scratches(g, w, h, n) {
  g.globalAlpha = 0.3;
  g.strokeStyle = '#000000';
  g.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60);
    g.stroke();
  }
  g.globalAlpha = 1;
}

function drawCrest(g, kind, color) {
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineWidth = 8;
  if (kind === 0) {
    g.beginPath();
    g.moveTo(22, 92);
    g.lineTo(22, 44);
    g.lineTo(46, 68);
    g.lineTo(64, 34);
    g.lineTo(82, 68);
    g.lineTo(106, 44);
    g.lineTo(106, 92);
    g.closePath();
    g.fill();
    g.fillRect(22, 96, 84, 12);
    for (const p of [[22, 40], [64, 30], [106, 40]]) {
      g.beginPath();
      g.arc(p[0], p[1], 7, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 1) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 24 : 52;
      g.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  } else if (kind === 2) {
    g.fillRect(54, 20, 20, 90);
    g.fillRect(24, 50, 80, 20);
  } else if (kind === 3) {
    g.beginPath();
    g.arc(64, 64, 22, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      g.beginPath();
      g.moveTo(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30);
      g.lineTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52);
      g.stroke();
    }
  }
}

function leatherMat(hex, trim) {
  const t = canvasTex('lea' + hex + trim, 256, 256, (g, w, h) => {
    noiseFill(g, w, h, hex, ['#000000', '#ffffff', trim], 1800);
    g.fillStyle = trim;
    g.globalAlpha = 0.7;
    for (let y = 20; y < h; y += 48) {
      for (let x = 20; x < w; x += 48) {
        g.beginPath();
        g.arc(x, y, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    scratches(g, w, h, 12);
  });
  return new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, bumpMap: t, bumpScale: 1.5, roughness: 0.8 });
}

function metalMat(hex) {
  const t = canvasTex('met' + hex, 256, 256, (g, w, h) => {
    noiseFill(g, w, h, hex, ['#000000', '#ffffff'], 2200);
    scratches(g, w, h, 25);
  });
  return new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, bumpMap: t, bumpScale: 1, metalness: 0.65, roughness: 0.45 });
}

function clothMat(hex) {
  const t = canvasTex('clo' + hex, 128, 128, (g, w, h) => {
    noiseFill(g, w, h, hex, ['#000000', '#ffffff'], 900);
  });
  return new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, bumpMap: t, bumpScale: 1, roughness: 1, side: THREE.DoubleSide });
}

function add(parent, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const cyl = (r1, r2, h, seg) => new THREE.CylinderGeometry(r1, r2, h, seg || 12);
const sph = (r) => new THREE.SphereGeometry(r, 14, 12);

export function buildKnight(T, look) {
  THREE = T;
  const L = Object.assign({}, DEFAULT_LOOK, look || {});
  const skinHex = SKIN[L.skin % SKIN.length];
  const hairHex = HAIRC[L.hairColor % HAIRC.length];
  const cloakHex = CLOAKC[L.cloak % CLOAKC.length];
  const A = ARMORS[L.armor % ARMORS.length];

  const skin = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.65 });
  const hairM = new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.9 });
  const leather = leatherMat(A.leather, A.trim);
  const boots = leatherMat('#241a14', A.trim);
  const metal = metalMat(A.metal);
  const metalD = metal.clone();
  metalD.side = THREE.DoubleSide;
  const trimM = new THREE.MeshStandardMaterial({ color: A.trim, metalness: 0.8, roughness: 0.35 });
  const cloakM = clothMat(cloakHex);
  const under = new THREE.MeshStandardMaterial({ color: shade(cloakHex, 0.55), roughness: 1 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 1 });
  const flashMats = [skin, leather, metal, metalD, under, cloakM];

  const model = new THREE.Group();

  function leg(x) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.95, 0);
    model.add(hip);
    add(hip, cyl(0.085, 0.07, 0.46, 10), pants, 0, -0.23, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    hip.add(knee);
    add(knee, sph(0.075), metal, 0, 0, 0.055).scale.set(1, 0.9, 0.8);
    add(knee, cyl(0.07, 0.058, 0.45, 10), boots, 0, -0.22, 0);
    add(knee, new THREE.BoxGeometry(0.1, 0.3, 0.03), metal, 0, -0.22, 0.07);
    for (const y of [-0.12, -0.3]) {
      add(knee, new THREE.BoxGeometry(0.15, 0.03, 0.125), leather, 0, y, 0);
      add(knee, new THREE.BoxGeometry(0.03, 0.04, 0.02), trimM, 0, y, 0.07);
    }
    add(knee, new THREE.BoxGeometry(0.115, 0.1, 0.27), boots, 0, -0.45, 0.06);
    add(knee, new THREE.BoxGeometry(0.1, 0.08, 0.1), metal, 0, -0.44, 0.17);
    return { hip, knee };
  }
  const legL = leg(0.11);
  const legR = leg(-0.11);

  add(model, cyl(0.17, 0.16, 0.2, 12), pants, 0, 0.93, 0).scale.z = 0.75;
  add(model, cyl(0.2, 0.16, 0.5, 14), under, 0, 1.28, 0).scale.z = 0.7;
  add(model, cyl(0.205, 0.18, 0.46, 14), leather, 0, 1.3, 0).scale.z = 0.71;
  add(model, new THREE.CylinderGeometry(0.215, 0.175, 0.46, 16, 1, true, -Math.PI / 2, Math.PI), metalD, 0, 1.3, 0).scale.z = 0.72;
  for (const y of [1.04, 1.1]) add(model, cyl(0.19, 0.19, 0.04, 16), leather, 0, y, 0).scale.z = 0.72;
  add(model, new THREE.BoxGeometry(0.06, 0.05, 0.02), trimM, 0, 1.07, 0.15);
  add(model, new THREE.BoxGeometry(0.05, 0.62, 0.015), leather, 0.02, 1.28, 0.16).rotation.z = 0.55;
  add(model, sph(0.018), trimM, -0.07, 1.4, 0.165);

  if (L.crest !== 4) {
    const ct = canvasTex('crest' + L.crest + A.trim, 128, 128, (g) => { drawCrest(g, L.crest, A.trim); });
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.15),
      new THREE.MeshStandardMaterial({ map: ct, transparent: true, metalness: 0.5, roughness: 0.4, depthWrite: false })
    );
    decal.position.set(0, 1.35, 0.158);
    model.add(decal);
  }

  const tabTex = canvasTex('tab' + cloakHex + A.trim + L.crest, 128, 192, (g, w, h) => {
    g.fillStyle = shade(cloakHex, 0.8);
    g.fillRect(0, 0, w, h);
    g.strokeStyle = A.trim;
    g.lineWidth = 6;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.save();
    g.translate(24, 52);
    g.scale(0.62, 0.62);
    drawCrest(g, L.crest, A.trim);
    g.restore();
  });
  const tabard = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5), new THREE.MeshStandardMaterial({ map: tabTex, roughness: 1, side: THREE.DoubleSide }));
  tabard.position.set(0, 0.78, 0.19);
  tabard.castShadow = true;
  model.add(tabard);
  for (const s of [1, -1]) add(model, new THREE.BoxGeometry(0.13, 0.3, 0.04), leather, 0.17 * s, 0.88, 0.12).rotation.z = -0.15 * s;

  for (const s of [1, -1]) add(model, sph(0.12), metal, 0.235 * s, 1.52, 0).scale.set(1.1, 0.7, 1);
  add(model, cyl(0.05, 0.055, 0.1, 10), skin, 0, 1.58, 0);

  function arm(x, sword) {
    const sh = new THREE.Group();
    sh.position.set(x, 1.5, 0);
    model.add(sh);
    add(sh, cyl(0.06, 0.052, 0.3, 10), under, 0, -0.15, 0);
    add(sh, cyl(0.066, 0.06, 0.1, 10), leather, 0, -0.04, 0);
    const el = new THREE.Group();
    el.position.y = -0.3;
    el.rotation.x = sword ? -0.5 : -0.25;
    sh.add(el);
    add(el, cyl(0.052, 0.045, 0.28, 10), under, 0, -0.14, 0);
    add(el, cyl(0.062, 0.055, 0.2, 10), metal, 0, -0.13, 0);
    add(el, cyl(0.066, 0.066, 0.025, 10), trimM, 0, -0.04, 0);
    add(el, sph(0.052), leather, 0, -0.3, 0);
    if (sword) {
      const sw = new THREE.Group();
      sw.position.set(0, -0.29, 0);
      sw.rotation.x = Math.PI / 2;
      const bladeHex = ['#d8dde6', '#d4a62a', '#2c3038'][L.sword % 3];
      const bladeM = new THREE.MeshStandardMaterial({
        color: bladeHex, metalness: 0.9, roughness: 0.22,
        emissive: L.sword === 2 ? 0x0c1a44 : 0x000000,
      });
      add(sw, new THREE.BoxGeometry(0.055, 0.95, 0.016), bladeM, 0, 0.58, 0);
      add(sw, new THREE.BoxGeometry(0.018, 0.85, 0.02), new THREE.MeshStandardMaterial({ color: shade(bladeHex, 0.6), metalness: 0.9, roughness: 0.3 }), 0, 0.55, 0);
      add(sw, new THREE.BoxGeometry(0.27, 0.035, 0.045), trimM, 0, 0.1, 0);
      for (const s of [1, -1]) add(sw, sph(0.02), trimM, 0.135 * s, 0.1, 0);
      add(sw, cyl(0.02, 0.02, 0.16, 8), leather, 0, 0, 0);
      add(sw, sph(0.032), trimM, 0, -0.1, 0);
      add(sw, sph(0.012), new THREE.MeshStandardMaterial({ color: 0xaa1122, emissive: 0x330008 }), 0, -0.1, 0.028);
      el.add(sw);
      model.userData.sword = sw;
      model.userData.hand = el;
    }
    return { sh, el };
  }
  const armL = arm(0.25, false);
  const armR = arm(-0.25, true);

  const cloak = new THREE.Group();
  cloak.position.set(0, 1.58, -0.12);
  model.add(cloak);
  const cg = new THREE.PlaneGeometry(0.62, 1.5, 10, 12);
  cg.translate(0, -0.75, 0);
  const cp = cg.attributes.position;
  const base = Float32Array.from(cp.array);
  const cm = new THREE.Mesh(cg, cloakM);
  cm.castShadow = true;
  cloak.add(cm);
  function updateCloak(tm, amp) {
    for (let i = 0; i < cp.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const f = Math.min(Math.max(-y / 1.5, 0), 1);
      const wave = Math.sin(tm * 3 + y * 5 + x * 3) * 0.04 * f * (0.4 + amp);
      cp.setXYZ(i, x * (1 + f * 0.3), y, -f * (0.1 + amp * 0.28) + wave);
    }
    cp.needsUpdate = true;
    cg.computeVertexNormals();
  }
  updateCloak(0, 0);
  add(model, new THREE.SphereGeometry(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), cloakM, 0, 1.5, 0).scale.set(1.15, 0.7, 0.95);
  add(model, new THREE.TorusGeometry(0.12, 0.05, 8, 16), cloakM, 0, 1.57, -0.02).rotation.x = Math.PI / 2;
  add(model, sph(0.032), trimM, -0.15, 1.5, 0.15);
  add(model, sph(0.014), new THREE.MeshStandardMaterial({ color: 0xaa1122, emissive: 0x330008 }), -0.15, 1.5, 0.18);

  const head = new THREE.Group();
  head.position.set(0, 1.68, 0);
  model.add(head);
  add(head, sph(0.115), skin, 0, 0, 0).scale.set(0.92, 1.12, 1);
  add(head, sph(0.07), skin, 0, -0.08, 0.05).scale.set(1.15, 0.9, 1);
  add(head, new THREE.BoxGeometry(0.022, 0.04, 0.03), skin, 0, -0.012, 0.115);
  add(head, sph(0.016), skin, 0, -0.03, 0.125);
  add(head, new THREE.BoxGeometry(0.05, 0.007, 0.01), new THREE.MeshStandardMaterial({ color: 0x5a2a2a }), 0, -0.06, 0.102);
  for (const s of [1, -1]) {
    add(head, sph(0.02), new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.4 }), 0.042 * s, 0.02, 0.103);
    add(head, sph(0.012), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.3 }), 0.042 * s, 0.02, 0.119);
    add(head, new THREE.BoxGeometry(0.05, 0.01, 0.02), hairM, 0.042 * s, 0.055, 0.105).rotation.z = -0.15 * s;
    add(head, sph(0.025), skin, 0.105 * s, 0, 0).scale.x = 0.5;
  }

  const hs = L.hair % HAIRS.length;
  if (hs === 0 || hs === 2) {
    add(head, new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.34), hairM, 0, 0.01, -0.005).scale.set(0.95, 1.1, 1.02);
  }
  if (hs === 1) {
    add(head, new THREE.SphereGeometry(0.118, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.34), hairM, 0, 0.005, 0).scale.set(0.94, 1.12, 1.02);
  }
  if (hs === 0) {
    for (let i = 0; i < 28; i++) {
      const th = Math.random() * 1.15;
      const ph = Math.random() * Math.PI * 2;
      const r = 0.12;
      const x = r * Math.sin(th) * Math.cos(ph);
      const y = r * Math.cos(th) * 1.1 + 0.01;
      const z = r * Math.sin(th) * Math.sin(ph);
      if (z > 0.035 && th > 0.8) continue;
      add(head, new THREE.SphereGeometry(0.03 + Math.random() * 0.015, 6, 5), hairM, x, y, z);
    }
  }
  if (hs === 2) {
    add(head, new THREE.CapsuleGeometry(0.09, 0.26, 4, 8), hairM, 0, -0.1, -0.085);
    for (const s of [1, -1]) add(head, new THREE.CapsuleGeometry(0.035, 0.22, 4, 8), hairM, 0.1 * s, -0.06, -0.02);
  }
  if (hs === 4) {
    for (let i = 0; i < 7; i++) add(head, new THREE.ConeGeometry(0.03, 0.13, 6), hairM, 0, 0.125 - Math.abs(i - 3) * 0.012, 0.08 - i * 0.028);
  }

  const bs = L.beard % BEARDS.length;
  if (bs > 0) {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.119, 16, 8, 0, Math.PI, Math.PI * 0.52, Math.PI * 0.34),
      new THREE.MeshStandardMaterial({ color: hairHex, roughness: 1, transparent: true, opacity: bs === 1 ? 0.55 : 0.95 })
    );
    shell.scale.set(0.93, 1.13, 1.01);
    head.add(shell);
    if (bs === 1) {
      add(head, new THREE.ConeGeometry(0.03, 0.07, 6), hairM, 0, -0.145, 0.085).rotation.x = Math.PI;
    } else {
      add(head, sph(0.06), hairM, 0, -0.15, 0.07).scale.set(1, 1.5, 1);
      add(head, new THREE.BoxGeometry(0.07, 0.015, 0.02), hairM, 0, -0.045, 0.11);
    }
  }

  model.scale.setScalar(0.88);
  model.traverse((o) => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });

  let phase = 0, sm = 0;
  const anim = (dt, speed, swing) => {
    sm += (speed - sm) * Math.min(1, dt * 10);
    phase += dt * Math.min(sm, 6) * 2.2;
    const amp = Math.min(sm / 5, 1);
    const A2 = 0.85 * amp;
    const s = Math.sin(phase), c = Math.cos(phase);
    legL.hip.rotation.x = s * A2;
    legR.hip.rotation.x = -s * A2;
    legL.knee.rotation.x = Math.max(0, -c) * A2 * 1.3;
    legR.knee.rotation.x = Math.max(0, c) * A2 * 1.3;
    armL.sh.rotation.x = -s * A2 * 0.7;
    if (swing > 0) {
      const u = 1 - Math.min(swing, 1);
      armR.sh.rotation.x = u < 0.35 ? -0.3 - 2.2 * (u / 0.35) : -2.5 + 2.7 * ((u - 0.35) / 0.65);
    } else {
      armR.sh.rotation.x = -0.3 + s * A2 * 0.25;
    }
    const t = performance.now() / 1000;
    head.rotation.y = Math.sin(t * 0.6) * 0.12 * (1 - amp);
    head.rotation.x = Math.sin(t * 0.9) * 0.03;
    updateCloak(t, amp);
  };

  const bodyMat = { emissive: { setHex: (h) => flashMats.forEach((m) => m.emissive.setHex(h)) } };
  return { model, bodyMat, pivot: null, anim, look: L };
}
