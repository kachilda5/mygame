export function initStages(G) {
  const { THREE, scene, camera, renderer, socket } = G;
  const S = 50;
  const box = (css) => {
    const el = document.createElement('div');
    el.style.cssText = css;
    document.body.appendChild(el);
    return el;
  };
  const banner = box('position:fixed;top:56px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;font:bold 14px sans-serif;padding:5px 12px;border-radius:6px;z-index:6;white-space:nowrap;');
  const bossBox = box('position:fixed;top:92px;left:50%;transform:translateX(-50%);width:min(340px,70vw);z-index:6;display:none;text-align:center;color:#ffd0d0;font:bold 13px sans-serif;');
  const bossName = document.createElement('div');
  const bossTrack = document.createElement('div');
  bossTrack.style.cssText = 'height:12px;background:rgba(60,0,0,.8);border:1px solid #ff6a6a;border-radius:6px;overflow:hidden;margin-top:3px;';
  const bossFill = document.createElement('div');
  bossFill.style.cssText = 'height:100%;width:100%;background:linear-gradient(#ff5a5a,#b01c1c);';
  bossTrack.appendChild(bossFill);
  bossBox.appendChild(bossName);
  bossBox.appendChild(bossTrack);
  const announceEl = box('position:fixed;top:22%;left:50%;transform:translateX(-50%);color:#ffe9a8;font:bold 34px sans-serif;text-shadow:0 2px 8px #000;z-index:7;pointer-events:none;opacity:0;transition:opacity .4s;text-align:center;max-width:90vw;');
  let annTimer = 0;
  function announce(text) {
    announceEl.textContent = text;
    announceEl.style.opacity = '1';
    clearTimeout(annTimer);
    annTimer = setTimeout(() => { announceEl.style.opacity = '0'; }, 2800);
  }

  const PALETTE = {
    village: { base: '#5c8a3e', cols: ['#4e7a33', '#6c9a48', '#7aa852', '#8a7a52', '#4a6b30'] },
    grassland: { base: '#78b24a', cols: ['#6aa23e', '#8bc25a', '#9bd266', '#5e9236', '#a3b860'] },
    forest: { base: '#4a6b36', cols: ['#3f5c2e', '#56803d', '#628c45', '#6b5436', '#52402a'] },
    meadow: { base: '#dfeaf2', cols: ['#c6d8e6', '#f4f9fc', '#9fb8cc', '#7fa05a', '#b8c9d6'] },
    frost: { base: '#c2d6e8', cols: ['#a9c3dc', '#e3effa', '#7d9bbb', '#5d7590', '#d4e4f2'] },
    winter: { base: '#8d97a3', cols: ['#6e7884', '#aab3bd', '#4d5560', '#5a4a3a', '#c4ccd4'] },
    lake: { base: '#a6dcec', cols: ['#7fc4dc', '#d4f3fb', '#5aa9c8', '#ffffff', '#3d8fb0'] },
    blizzard: { base: '#f0f5f8', cols: ['#dde7ee', '#ffffff', '#c6d4de', '#e8eff4', '#b8c8d4'] },
    glacier: { base: '#7fa8d8', cols: ['#5a86bd', '#b6d6f4', '#3f6aa3', '#e0f0ff', '#2f5a96'] },
  };
  const THEMES = {
    village: { tint: 0xffe6b8, k: 0.18, fogMul: 0.8, leaf: null, snow: 0, size: 0.08, gloss: 0 },
    grassland: { tint: 0xfff2c8, k: 0.15, fogMul: 0.7, leaf: null, snow: 0, size: 0.08, gloss: 0 },
    forest: { tint: 0x000000, k: 0, fogMul: 1, leaf: null, snow: 0, size: 0.08, gloss: 0 },
    meadow: { tint: 0xdbe8f4, k: 0.25, fogMul: 0.9, leaf: 0xdde9f0, snow: 0.35, size: 0.07, gloss: 0 },
    frost: { tint: 0xbcd8f0, k: 0.3, fogMul: 1.0, leaf: 0xbcd8ea, snow: 0.55, size: 0.08, gloss: 0.1 },
    winter: { tint: 0x7e8aa0, k: 0.4, fogMul: 1.25, leaf: 0x46586a, snow: 0.6, size: 0.08, gloss: 0 },
    lake: { tint: 0xa8e0f0, k: 0.3, fogMul: 1.0, leaf: 0x9fc0d6, snow: 0.5, size: 0.08, gloss: 0.7 },
    blizzard: { tint: 0xe8f0f6, k: 0.55, fogMul: 2.0, leaf: 0xf2f6fa, snow: 1.0, size: 0.1, gloss: 0 },
    glacier: { tint: 0x6a96d0, k: 0.35, fogMul: 1.1, leaf: 0x8fb6e6, snow: 0.7, size: 0.09, gloss: 0.5 },
  };

  function makeTex(theme) {
    const P = PALETTE[theme] || PALETTE.forest;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = P.base;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = P.cols[Math.floor(Math.random() * P.cols.length)];
      g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 1 + Math.random() * 3);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 6);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function tintTrees(leaf) {
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry || o.geometry.type !== 'ConeGeometry') return;
      if (!o.geometry.parameters || o.geometry.parameters.radius < 0.5) return;
      const m = o.material;
      if (!m.userData.orig) m.userData.orig = m.color.clone();
      if (leaf === null) m.color.copy(m.userData.orig);
      else m.color.set(leaf);
    });
  }

  const SN = 700;
  const sArr = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    sArr[i * 3] = (Math.random() - 0.5) * 28;
    sArr[i * 3 + 1] = Math.random() * 8;
    sArr[i * 3 + 2] = (Math.random() - 0.5) * 28;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sArr, 3));
  const snow = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
  snow.frustumCulled = false;
  snow.visible = false;
  scene.add(snow);

  const deco = new THREE.Group();
  scene.add(deco);
  let aurora = null;
  let riverMesh;
  const WU = STAGE.W / S, HU = STAGE.H / S;
  const iceM = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x1a6fd0, emissiveIntensity: 0.5, roughness: 0.12, transparent: true, opacity: 0.8, flatShading: true });
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 1 });
  const snowM = new THREE.MeshStandardMaterial({ color: 0xf2f7fb, roughness: 1 });

  function clearDeco() {
    while (deco.children.length) deco.remove(deco.children[0]);
    aurora = null;
  }
  function spots(n, margin, test) {
    const out = [];
    let tries = 0;
    while (out.length < n && tries < n * 30) {
      tries++;
      const x = 2 + Math.random() * (WU - 4), z = 2 + Math.random() * (HU - 4);
      if (STAGE.inObstacle(x * S, z * S, margin)) continue;
      if (test && !test(x, z)) continue;
      out.push([x, z]);
    }
    return out;
  }
  function crystalCluster(x, z, sc) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const h = (0.4 + Math.random() * 0.9) * sc;
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(1), iceM);
      m.scale.set(0.12 * sc, h, 0.12 * sc);
      m.position.set((Math.random() - 0.5) * 0.5 * sc, h * 0.8, (Math.random() - 0.5) * 0.5 * sc);
      m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4);
      g.add(m);
    }
    deco.add(g);
  }
  function spire(x, z) {
    const h = 2 + Math.random() * 3.5, r = 0.4 + Math.random() * 0.6;
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(1), iceM);
    m.scale.set(r, h, r);
    m.position.set(x, h * 0.9, z);
    m.rotation.y = Math.random() * 3;
    deco.add(m);
  }
  function ruin(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI;
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 3.0, 8), stoneM);
      p.position.set(s * 1.0, 1.5, 0);
      p.castShadow = true;
      g.add(p);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), snowM);
      cap.position.set(s * 1.0, 3.06, 0);
      g.add(cap);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.26, 8, 16, Math.PI), stoneM);
    arch.position.set(0, 3.0, 0);
    arch.castShadow = true;
    g.add(arch);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9 + Math.random() * 0.8, 0.5), stoneM);
    wall.position.set(0, 0.5, -0.9);
    wall.castShadow = true;
    g.add(wall);
    deco.add(g);
  }
  function drift(x, z) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), snowM);
    m.scale.set(1 + Math.random(), 0.25, 0.9 + Math.random() * 0.6);
    m.position.set(x, 0.05, z);
    m.rotation.y = Math.random() * 3;
    deco.add(m);
  }
  function crackOverlay() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      let x = Math.random() * 512, y = Math.random() * 512;
      g.beginPath();
      g.moveTo(x, y);
      for (let j = 0; j < 8; j++) {
        x += (Math.random() - 0.5) * 90;
        y += (Math.random() - 0.5) * 90;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 4);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(WU + 8, HU + 8), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(WU / 2, 0.03, HU / 2);
    deco.add(m);
  }
  function auroraPlane() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(120,255,200,0)');
    gr.addColorStop(0.4, 'rgba(120,255,200,0.9)');
    gr.addColorStop(0.7, 'rgba(160,120,255,0.7)');
    gr.addColorStop(1, 'rgba(160,120,255,0)');
    g.fillStyle = gr;
    for (let x = 0; x < 512; x += 8) {
      g.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(x * 0.03) * Math.cos(x * 0.011));
      g.fillRect(x, 0, 8, 128);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 34),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })
    );
    m.position.set(WU / 2, 10, -28);
    deco.add(m);
    aurora = m;
  }
  function buildDeco(name) {
    clearDeco();
    if (name === 'frost') spots(30, 30).forEach((p) => crystalCluster(p[0], p[1], 0.6 + Math.random() * 0.7));
    if (name === 'winter') {
      spots(5, 90, (x, z) => Math.hypot(x - WU / 2, z - HU / 2) > 6).forEach((p) => ruin(p[0], p[1]));
      spots(12, 30).forEach((p) => crystalCluster(p[0], p[1], 0.5));
    }
    if (name === 'lake') {
      crackOverlay();
      spots(20, 30).forEach((p) => crystalCluster(p[0], p[1], 0.7));
    }
    if (name === 'blizzard') spots(25, 20).forEach((p) => drift(p[0], p[1]));
    if (name === 'glacier') {
      spots(22, 60).forEach((p) => spire(p[0], p[1]));
      spots(10, 30).forEach((p) => crystalCluster(p[0], p[1], 0.8));
      auroraPlane();
    }
  }

  const flashEl = box('position:fixed;top:0;left:0;right:0;bottom:0;background:#ffffff;opacity:0;pointer-events:none;z-index:15;');
  function flash() {
    flashEl.style.transition = 'none';
    flashEl.style.opacity = '0.9';
    void flashEl.offsetWidth;
    flashEl.style.transition = 'opacity 1.1s';
    flashEl.style.opacity = '0';
  }

  function applyTheme(name) {
    const th = THEMES[name] || THEMES.forest;
    window.THEME_NAME = name;
    window.THEME = { tint: th.tint, k: th.k, fogMul: th.fogMul };
    const ground = scene.children.find((o) => o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && o.material && o.material.map);
    if (ground) {
      const tex = makeTex(name);
      ground.material.map = tex;
      ground.material.bumpMap = tex;
      ground.material.roughness = 1 - th.gloss * 0.85;
      ground.material.metalness = th.gloss * 0.15;
      ground.material.needsUpdate = true;
    }
    tintTrees(th.leaf);
    snow.visible = th.snow > 0;
    snow.material.opacity = 0.3 + 0.6 * th.snow;
    snow.material.size = th.size;
    if (riverMesh === undefined) {
      riverMesh = scene.children.find((o) => o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x3f7f9a) || null;
    }
    if (riverMesh) {
      riverMesh.visible = name !== 'lake';
      riverMesh.material.color.setHex(name === 'forest' ? 0x3f7f9a : name === 'glacier' ? 0x8fc0f0 : 0xbfe3f2);
    }
    buildDeco(name);
    flash();
  }

  let info = null, lastKey = '', lastTheme = '';
  window.setTheme = applyTheme;
  function bannerText() {
    if (!info) return;
    const w = info.phase === 'boss' ? 'BOSS FIGHT'
      : info.phase === 'wave' ? 'Wave ' + info.wave + '/' + info.waves : 'Get ready...';
    banner.textContent = 'Level ' + info.level + ' \u00B7 ' + info.name + ' \u00B7 ' + w;
  }

  const comboEl = box('position:fixed;top:150px;left:50%;transform:translateX(-50%);color:#ffd36b;font:bold 26px sans-serif;text-shadow:0 2px 6px #000;z-index:7;pointer-events:none;opacity:0;transition:opacity .3s;');
  let comboTimer = 0;
  socket.on('combo', (d) => {
    if (d.id !== socket.id || d.n < 2) return;
    comboEl.textContent = 'x' + d.n + ' COMBO!';
    comboEl.style.opacity = '1';
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { comboEl.style.opacity = '0'; }, 1500);
  });

  socket.on('stage', (d) => {
    info = d;
    bannerText();
    if (d.theme !== lastTheme) {
      lastTheme = d.theme;
      window.ARENA_THEME = d.theme;
      if (!window.MY_ZONE || window.MY_ZONE === 'arena') applyTheme(d.theme);
    }
    const key = d.idx + '|' + d.phase + '|' + d.msg;
    if (d.msg && key !== lastKey) announce(d.msg);
    lastKey = key;
    if (d.phase !== 'boss') bossBox.style.display = 'none';
  });

  socket.on('enemies', (list) => {
    const b = list.find((e) => e.k === 'boss');
    if (b && info) {
      bossBox.style.display = 'block';
      bossName.textContent = info.boss || 'Boss';
      bossFill.style.width = Math.max(0, (b.hp / b.m) * 100) + '%';
    } else {
      bossBox.style.display = 'none';
    }
  });

  const fx = [];
  let shake = 0, shaking = false;
  socket.on('bossWarn', (d) => {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(d.r / S, 40),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.15, fog: false, depthWrite: false })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(d.x / S, 0.07, d.y / S);
    scene.add(disc);
    fx.push({ obj: disc, born: performance.now(), dur: 1000, kind: 'warn' });
    if (window.SFX) window.SFX.play('growl', 1);
  });
  socket.on('bossSlam', (d) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(d.x / S, 0.1, d.y / S);
    ring.userData.r = d.r / S;
    scene.add(ring);
    fx.push({ obj: ring, born: performance.now(), dur: 450, kind: 'slam' });
    shake = 0.35;
    if (window.SFX) window.SFX.play('slam', 1);
  });

  window.styleEnemy = (e, kind, variant, elite) => {
    e.kindName = kind;
    if (elite) {
      e.group.scale.setScalar(1.2);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 32), new THREE.MeshBasicMaterial({ color: 0xff3030, side: THREE.DoubleSide, transparent: true, opacity: 0.85, fog: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      e.group.add(ring);
    }
    if (window.buildMonster) {
      try {
        const b = window.buildMonster(variant || kind, window.THEME_NAME || 'frost', kind === 'boss');
        e.model.clear();
        e.model.scale.set(1, 1, 1);
        e.model.add(b.model);
        e.bodyMat = b.bodyMat;
        e.anim = b.anim;
        e.atk = b.attack;
        e.bs = 1;
        e.bar.position.y = b.barY;
        if (kind === 'boss') e.bar.scale.setScalar(2.5);
        return;
      } catch (err) {
        console.warn('Monster build failed, using the simple one:', err);
      }
    }
    if (kind === 'wolf') {
      e.model.scale.set(0.8, 0.7, 1.25);
      e.bodyMat.color.set(0x6b6b72);
    } else if (kind === 'boss') {
      e.model.scale.setScalar(2.6);
      e.bodyMat.color.set(0x5a1f2a);
      e.bar.position.y = 4.2;
      e.bar.scale.setScalar(2.5);
    } else {
      e.model.scale.setScalar(0.95);
      e.bodyMat.color.set(0x4f7d3c);
    }
  };

  let last = performance.now();
  function tick() {
    requestAnimationFrame(tick);
    const nowMs = performance.now();
    const dt = Math.min((nowMs - last) / 1000, 0.1);
    last = nowMs;
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      const k = Math.min((nowMs - f.born) / f.dur, 1);
      if (f.kind === 'warn') {
        f.obj.material.opacity = 0.12 + 0.3 * k;
      } else {
        f.obj.scale.setScalar(f.obj.userData.r * (0.2 + 0.8 * k));
        f.obj.material.opacity = 0.9 * (1 - k);
      }
      if (k >= 1) {
        scene.remove(f.obj);
        f.obj.geometry.dispose();
        f.obj.material.dispose();
        fx.splice(i, 1);
      }
    }
    if (aurora) aurora.material.map.offset.x += dt * 0.01;
    if (snow.visible) {
      snow.position.set(camera.position.x, 0, camera.position.z);
      const p = sGeo.attributes.position;
      for (let i = 0; i < SN; i++) {
        let y = p.getY(i) - dt * 1.5;
        if (y < 0) y += 8;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(nowMs / 900 + i) * dt * 0.3);
      }
      p.needsUpdate = true;
    }
    if (shake > 0) {
      shake -= dt;
      const a = shake * 14;
      renderer.domElement.style.transform = 'translate(' + (Math.random() - 0.5) * a + 'px,' + (Math.random() - 0.5) * a + 'px)';
      shaking = true;
    } else if (shaking) {
      renderer.domElement.style.transform = '';
      shaking = false;
    }
  }
  tick();
}
