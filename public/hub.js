export function initHub(G) {
  const { THREE, scene, camera, socket } = G;
  const S = 50;
  const HX = STAGE.HUB_X, MX = STAGE.MEA_X;
  const hubGroup = new THREE.Group();
  const meaGroup = new THREE.Group();
  const gateGroup = new THREE.Group();
  scene.add(hubGroup, meaGroup, gateGroup);
  hubGroup.visible = false;
  meaGroup.visible = false;
  const rnd = Math.random;

  function cvs(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function groundTex(base, cols, rep, flowers) {
    const t = cvs(256, 256, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) {
        g.globalAlpha = 0.2 + rnd() * 0.3;
        g.fillStyle = cols[Math.floor(rnd() * cols.length)];
        g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 4, 1 + rnd() * 3);
      }
      g.globalAlpha = 1;
      if (flowers) {
        for (let i = 0; i < 90; i++) {
          g.fillStyle = flowers[Math.floor(rnd() * flowers.length)];
          g.beginPath();
          g.arc(rnd() * w, rnd() * h, 2 + rnd() * 2, 0, Math.PI * 2);
          g.fill();
        }
      }
    });
    t.repeat.set(rep, rep);
    return t;
  }
  const cob = cvs(256, 256, (g, w, h) => {
    g.fillStyle = '#8d8f94';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      for (let x = ((y / 32) % 2) * 16; x < w; x += 32) {
        const v = 120 + Math.floor(rnd() * 50);
        g.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 6) + ')';
        g.fillRect(x + 2, y + 2, 28, 28);
      }
    }
  });
  cob.repeat.set(4, 4);

  const std = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9 }, extra || {}));
  const cobM = new THREE.MeshStandardMaterial({ map: cob, roughness: 0.95 });
  const plaster = std(0xd8c8a4), woodM = std(0x6b4a2e), stoneM = std(0x7d838c), darkM = std(0x2a2d33);
  const glowM = new THREE.MeshBasicMaterial({ color: 0xffc864, fog: false });

  function add(parent, geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function grp(parent, wx, wy) {
    const g = new THREE.Group();
    g.position.set(wx / S, 0, wy / S);
    parent.add(g);
    return g;
  }
  function labelSprite(text) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 22px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(0,0,0,0.85)';
    g.strokeText(text, 128, 32);
    g.fillStyle = '#ffffff';
    g.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
    s.scale.set(2.6, 0.65, 1);
    return s;
  }

  const hg = new THREE.Mesh(
    new THREE.PlaneGeometry(1700 / S, 1700 / S),
    new THREE.MeshStandardMaterial({ map: groundTex('#5c8a3e', ['#4e7a33', '#6c9a48', '#7aa852', '#8a7a52', '#4a6b30'], 10, null), roughness: 1 })
  );
  hg.rotation.x = -Math.PI / 2;
  hg.position.set((HX + 600) / S, 0, 600 / S);
  hg.receiveShadow = true;
  hubGroup.add(hg);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(7, 48), cobM);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set((HX + 600) / S, 0.02, 600 / S);
  plaza.receiveShadow = true;
  hubGroup.add(plaza);
  function path(x1, y1, x2, y2, wd) {
    const dx = x2 - x1, dy = y2 - y1;
    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2 / S, 0.015, (y1 + y2) / 2 / S);
    g.rotation.y = Math.atan2(dx, dy);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wd, Math.hypot(dx, dy) / S), cobM);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    g.add(m);
    hubGroup.add(g);
  }
  path(HX + 600, 600, HX + 600, 1130, 3);
  path(HX + 600, 600, HX + 1130, 600, 3);
  path(HX + 600, 600, HX + 600, 340, 2.4);

  function house(wx, wy, roofCol) {
    const g = grp(hubGroup, wx, wy);
    add(g, new THREE.BoxGeometry(2.3, 1.5, 1.5), plaster, 0, 0.75, 0);
    const roof = add(g, new THREE.ConeGeometry(1.7, 1.1, 4), std(roofCol), 0, 2.05, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.25, 1, 0.9);
    add(g, new THREE.BoxGeometry(0.4, 0.85, 0.05), woodM, 0, 0.43, 0.77);
    for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.35, 0.35, 0.04), glowM, 0.7 * s, 0.9, 0.77);
    add(g, new THREE.BoxGeometry(0.3, 0.8, 0.3), stoneM, 0.7, 2.2, -0.3);
  }
  function stall(wx, wy) {
    const g = grp(hubGroup, wx, wy);
    add(g, new THREE.BoxGeometry(1.5, 0.55, 0.7), woodM, 0, 0.28, 0);
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.35, 0.35]) add(g, new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), woodM, sx, 0.9, sz);
    const stripes = cvs(128, 32, (c, w, h) => {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#f4efe4' : '#b3382c';
        c.fillRect(i * 16, 0, 16, h);
      }
    });
    add(g, new THREE.BoxGeometry(1.7, 0.06, 1.0), new THREE.MeshStandardMaterial({ map: stripes, roughness: 1 }), 0, 1.85, 0).rotation.x = -0.15;
    const cols = [0xd04040, 0x40a0d0, 0xd0b040, 0x60c060, 0xb060d0];
    for (let i = 0; i < 5; i++) add(g, new THREE.SphereGeometry(0.08, 8, 6), std(cols[i]), -0.5 + i * 0.25, 0.63, 0.05);
  }
  function fountain(wx, wy) {
    const g = grp(hubGroup, wx, wy);
    add(g, new THREE.CylinderGeometry(1.3, 1.4, 0.4, 24), stoneM, 0, 0.2, 0);
    add(g, new THREE.CylinderGeometry(1.15, 1.15, 0.05, 24), std(0x4fa6d8, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.8 }), 0, 0.4, 0);
    add(g, new THREE.CylinderGeometry(0.2, 0.25, 1.2, 10), stoneM, 0, 0.9, 0);
    add(g, new THREE.CylinderGeometry(0.6, 0.3, 0.2, 16), stoneM, 0, 1.45, 0);
    add(g, new THREE.SphereGeometry(0.16, 10, 8), std(0x9fd8ff, { emissive: 0x2a7fd0, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }), 0, 1.7, 0);
  }
  function well(wx, wy) {
    const g = grp(hubGroup, wx, wy);
    add(g, new THREE.CylinderGeometry(0.55, 0.6, 0.6, 14), stoneM, 0, 0.3, 0);
    add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), darkM, 0, 0.58, 0);
    for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.08, 1.3, 0.08), woodM, 0.5 * s, 1.1, 0);
    add(g, new THREE.BoxGeometry(1.2, 0.08, 0.1), woodM, 0, 1.75, 0);
    const r = add(g, new THREE.ConeGeometry(0.8, 0.5, 4), std(0x8a3b2a), 0, 2.1, 0);
    r.rotation.y = Math.PI / 4;
  }
  let forgeLight = null;
  function forge(wx, wy) {
    const g = grp(hubGroup, wx, wy);
    add(g, new THREE.BoxGeometry(1.5, 0.9, 1.0), stoneM, 0, 0.45, 0);
    add(g, new THREE.BoxGeometry(0.4, 1.8, 0.4), stoneM, 0.4, 1.5, -0.25);
    add(g, new THREE.BoxGeometry(0.8, 0.08, 0.5), new THREE.MeshBasicMaterial({ color: 0xff7a2a, fog: false }), -0.1, 0.92, 0.1);
    add(g, new THREE.BoxGeometry(0.5, 0.25, 0.3), darkM, -1.2, 0.35, 0.4);
    forgeLight = new THREE.PointLight(0xff7a2a, 1.6, 7, 2);
    forgeLight.position.set(0, 1.4, 0.8);
    g.add(forgeLight);
  }
  function board(wx, wy) {
    const g = grp(hubGroup, wx, wy);
    for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.08, 1.4, 0.08), woodM, 0.6 * s, 0.7, 0);
    add(g, new THREE.BoxGeometry(1.4, 0.9, 0.06), woodM, 0, 1.1, 0);
    for (let i = 0; i < 4; i++) add(g, new THREE.BoxGeometry(0.25, 0.32, 0.02), std(0xf2ecd8), -0.45 + i * 0.3, 1.1 + (i % 2) * 0.1, 0.05);
  }
  const lampLights = [];
  function lamp(wx, wy, lit) {
    const g = grp(hubGroup, wx, wy);
    add(g, new THREE.CylinderGeometry(0.05, 0.07, 2.2, 6), darkM, 0, 1.1, 0);
    add(g, new THREE.SphereGeometry(0.14, 8, 6), glowM, 0, 2.3, 0);
    if (lit) {
      const l = new THREE.PointLight(0xffc27a, 1.0, 7, 2);
      l.position.set(0, 2.2, 0);
      g.add(l);
      lampLights.push(l);
    }
  }

  function roundTree(parent, wx, wy, scale, hue) {
    const g = grp(parent, wx, wy);
    g.scale.setScalar(scale);
    add(g, new THREE.CylinderGeometry(0.12, 0.18, 1.3, 7), woodM, 0, 0.65, 0);
    const leaf = std(new THREE.Color().setHSL(hue, 0.5, 0.28 + rnd() * 0.08), { roughness: 1 });
    add(g, new THREE.SphereGeometry(0.8, 10, 8), leaf, 0, 1.8, 0);
    add(g, new THREE.SphereGeometry(0.6, 10, 8), leaf, 0.4, 1.5, 0.2);
    add(g, new THREE.SphereGeometry(0.55, 10, 8), leaf, -0.4, 1.55, -0.2);
  }
  function rockMesh(parent, wx, wy, r) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry((r / S) * 1.3), std(0x7a7e84));
    m.position.set(wx / S, ((r / S) * 1.3) * 0.5, wy / S);
    m.castShadow = true;
    parent.add(m);
  }

  const mg = new THREE.Mesh(
    new THREE.PlaneGeometry(1800 / S, 1400 / S),
    new THREE.MeshStandardMaterial({ map: groundTex('#78b24a', ['#6aa23e', '#8bc25a', '#9bd266', '#5e9236', '#a3b860'], 9, ['#ffffff', '#ffd54a', '#ff8fb8', '#b69bff']), roughness: 1 })
  );
  mg.rotation.x = -Math.PI / 2;
  mg.position.set((MX + 700) / S, 0, 500 / S);
  mg.receiveShadow = true;
  meaGroup.add(mg);

  STAGE.features.forEach((f) => {
    if (f.kind === 'house') house(f.x, f.y, [0x8a3b2a, 0x3a5a8a, 0x6a4a2a, 0x2f6a4a][Math.floor(rnd() * 4)]);
    if (f.kind === 'stall') stall(f.x, f.y);
    if (f.kind === 'board') board(f.x, f.y);
  });
  fountain(HX + 600, 600);
  well(HX + 250, 640);
  forge(HX + 1000, 420);
  [[500, 520], [700, 520], [500, 700], [700, 700], [600, 900], [940, 600]].forEach((p, i) => lamp(HX + p[0], p[1], i < 2));
  STAGE.obstacles.forEach((o) => {
    if (o.kind === 'hubtree') roundTree(hubGroup, o.x, o.y, 0.9 + rnd() * 0.4, 0.28 + rnd() * 0.05);
    if (o.kind === 'mtree') roundTree(meaGroup, o.x, o.y, 0.9 + rnd() * 0.4, 0.22 + rnd() * 0.08);
    if (o.kind === 'mrock') rockMesh(meaGroup, o.x, o.y, o.r);
  });
  const bigCrystals = [0x66e0ff, 0xff7ad9, 0x7dff9a];
  for (let i = 0; i < 9; i++) {
    const x = MX + 150 + rnd() * 1100, y = 100 + rnd() * 800;
    if (STAGE.inObstacle(x, y, 40) || Math.hypot(x - (MX + 160), y - 500) < 200) continue;
    const col = bigCrystals[i % 3];
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(1), std(col, { emissive: col, emissiveIntensity: 0.5, roughness: 0.15, transparent: true, opacity: 0.85, flatShading: true }));
    const h = 1.2 + rnd() * 1.6;
    m.scale.set(0.5, h, 0.5);
    m.position.set(x / S, h * 0.9, y / S);
    meaGroup.add(m);
  }

  const PCOL = { arena: 0x66ccff, hub: 0xffcc66, meadow: 0x88ff99 };
  const portalObjs = [];
  STAGE.portals.forEach((p) => {
    const g = new THREE.Group();
    g.position.set(p.x / S, 0, p.y / S);
    add(g, new THREE.CylinderGeometry(1.4, 1.5, 0.15, 20), stoneM, 0, 0.08, 0);
    for (const s of [-1, 1]) add(g, new THREE.CylinderGeometry(0.18, 0.22, 2.6, 8), stoneM, 1.2 * s, 1.4, 0);
    add(g, new THREE.TorusGeometry(1.25, 0.12, 10, 40), std(0x55606c), 0, 1.45, 0);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 36),
      new THREE.MeshBasicMaterial({ color: PCOL[p.to] || 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false })
    );
    disc.position.set(0, 1.45, 0);
    g.add(disc);
    const lab = labelSprite(p.label);
    lab.position.set(0, 3.3, 0);
    g.add(lab);
    (p.zone === 'hub' ? hubGroup : p.zone === 'meadow' ? meaGroup : gateGroup).add(g);
    portalObjs.push({ p, disc });
  });

  const nodes = {};
  const nodeGeo = new THREE.OctahedronGeometry(1);
  function addNode(n) {
    if (nodes[n.id]) return;
    const col = n.v >= 18 ? 0xff7ad9 : n.v >= 12 ? 0x66e0ff : 0x7dff9a;
    const m = new THREE.Mesh(nodeGeo, std(col, { emissive: col, emissiveIntensity: 0.9, roughness: 0.15, transparent: true, opacity: 0.9, flatShading: true }));
    m.scale.set(0.22, 0.45, 0.22);
    m.position.set(n.x / S, 0.55, n.y / S);
    meaGroup.add(m);
    nodes[n.id] = { m, ph: rnd() * 6 };
  }
  socket.on('nodes', (list) => list.forEach(addNode));
  socket.on('nodeSpawn', addNode);
  socket.on('nodeTaken', (d) => {
    const o = nodes[d.id];
    if (!o) return;
    meaGroup.remove(o.m);
    delete nodes[d.id];
    if (window.SFX) window.SFX.play('chest', 0.35);
  });

  const npcs = [];
  function addNpc(def) {
    const b = window.buildKnight(def.look);
    if (!def.keepSword && b.model.userData.sword) b.model.userData.sword.visible = false;
    const g = new THREE.Group();
    g.add(b.model);
    const lab = labelSprite(def.name);
    lab.position.y = 1.95;
    g.add(lab);
    g.position.set(def.x / S, 0, def.y / S);
    g.rotation.y = def.face || 0;
    hubGroup.add(g);
    const n = Object.assign({}, def, { group: g, anim: b.anim });
    if (def.pts) {
      n.pts = def.pts.map((p) => [HX + p[0], p[1]]);
      n.legs = [];
      let total = 0;
      for (let i = 0; i < n.pts.length; i++) {
        const a = n.pts[i], c = n.pts[(i + 1) % n.pts.length];
        const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
        n.legs.push({ ax: a[0], ay: a[1], bx: c[0], by: c[1], len });
        total += len / def.speed + 3;
      }
      n.cycle = total;
    }
    npcs.push(n);
  }
  try {
    addNpc({ role: 'vendor', name: 'Mira (Weapons)', x: HX + 600, y: 232, face: 0, look: { skin: 2, hair: 2, hairColor: 2, beard: 0, cloak: 1, armor: 4, crest: 1, sword: 0 }, lines: ['Welcome! Swords, axes and guns for every hero.'] });
    addNpc({ role: 'smith', name: 'Torvald (Smith)', x: HX + 1000, y: 500, face: 0, keepSword: true, look: { skin: 1, hair: 3, hairColor: 5, beard: 2, cloak: 5, armor: 3, crest: 4, sword: 2 }, lines: ['A Hunter Rifle costs 900 coins. Earn it in the arena!', 'Every guardian carries a Warding Shard. Take them all, Warden.'] });
    addNpc({ role: 'guard', name: 'Guard', x: HX + 650, y: 1060, face: Math.PI, keepSword: true, look: { skin: 3, hair: 1, hairColor: 0, beard: 1, cloak: 0, armor: 0, crest: 0, sword: 0 }, lines: ['The Princess was taken three nights ago. The Frost Arena is through the south gate. Bring her home.', 'The meadow to the east is peaceful, and the crystals there are worth coins.'] });
    addNpc({ name: 'Elric', look: { skin: 1, hair: 1, hairColor: 2, beard: 2, cloak: 5, armor: 4, crest: 4, sword: 0 }, pts: [[520, 520], [680, 520], [680, 680], [520, 680]], speed: 45, off: 0, x: HX + 520, y: 520, lines: ['The arena gets brutal after level three.', 'Save your coins for a good weapon.'] });
    addNpc({ name: 'Wynn', look: { skin: 0, hair: 2, hairColor: 4, beard: 0, cloak: 2, armor: 1, crest: 4, sword: 0 }, pts: [[480, 430], [720, 430], [720, 470], [480, 470]], speed: 40, off: 20, x: HX + 480, y: 430, lines: ['Lovely day for a walk, is it not?', 'I heard the Frost Colossus lives at the top of the glacier.'] });
    addNpc({ name: 'Dara', look: { skin: 4, hair: 0, hairColor: 0, beard: 0, cloak: 3, armor: 2, crest: 3, sword: 0 }, pts: [[700, 560], [900, 520], [900, 600], [700, 640]], speed: 45, off: 10, x: HX + 700, y: 560, lines: ['Torvald forges the finest blades in the north.', 'Rolling dodges almost everything. Remember that!'] });
    addNpc({ name: 'Joss', look: { skin: 5, hair: 4, hairColor: 1, beard: 1, cloak: 4, armor: 3, crest: 1, sword: 0 }, pts: [[420, 520], [420, 720], [500, 720], [500, 520]], speed: 50, off: 30, x: HX + 420, y: 520, lines: ['I gather crystals in the meadow every morning.', 'Combos make the arena pay better.'] });
    addNpc({ name: 'Pip', look: { skin: 2, hair: 1, hairColor: 3, beard: 0, cloak: 7, armor: 0, crest: 2, sword: 0 }, pts: [[450, 900], [750, 900], [750, 980], [450, 980]], speed: 55, off: 5, x: HX + 450, y: 900, lines: ['The villagers go home when night falls.', 'Have you opened a secret chest yet?'] });
  } catch (err) {
    console.warn('Villagers not created:', err);
  }

  const hint = document.createElement('div');
  hint.style.cssText = 'position:fixed;bottom:110px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;font:bold 15px sans-serif;padding:8px 14px;border-radius:10px;z-index:8;display:none;cursor:pointer;';
  document.body.appendChild(hint);
  const talk = document.createElement('div');
  talk.style.cssText = 'position:fixed;bottom:160px;left:50%;transform:translateX(-50%);max-width:80vw;background:rgba(20,26,40,.85);color:#ffe9a8;font:15px sans-serif;padding:8px 14px;border-radius:10px;z-index:8;display:none;text-align:center;';
  document.body.appendChild(talk);
  let talkTimer = 0;
  function say(t) {
    talk.textContent = t;
    talk.style.display = 'block';
    clearTimeout(talkTimer);
    talkTimer = setTimeout(() => { talk.style.display = 'none'; }, 4000);
  }
  let near = null;
  function interact() {
    if (!near) return;
    if (near.role === 'vendor') {
      if (window.openShop) window.openShop();
    } else {
      say(near.name + ': "' + near.lines[Math.floor(rnd() * near.lines.length)] + '"');
    }
  }
  hint.addEventListener('click', interact);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyT' && !e.repeat) interact(); });

  const zoneBanner = document.createElement('div');
  zoneBanner.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);text-align:center;color:#ffe9a8;text-shadow:0 2px 8px #000;z-index:9;pointer-events:none;opacity:0;transition:opacity .5s;';
  document.body.appendChild(zoneBanner);
  let zoneTimer = 0;
  function banner(t1, t2) {
    zoneBanner.textContent = '';
    const a = document.createElement('div');
    a.textContent = t1;
    a.style.cssText = 'font:bold 34px sans-serif;';
    const b = document.createElement('div');
    b.textContent = t2;
    b.style.cssText = 'font:16px sans-serif;margin-top:4px;';
    zoneBanner.appendChild(a);
    zoneBanner.appendChild(b);
    zoneBanner.style.opacity = '1';
    clearTimeout(zoneTimer);
    zoneTimer = setTimeout(() => { zoneBanner.style.opacity = '0'; }, 2800);
  }
  const fade = document.createElement('div');
  fade.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#000;opacity:0;pointer-events:none;z-index:14;transition:opacity .3s;';
  document.body.appendChild(fade);

  const INFO = {
    hub: ['Frostwatch Village', 'Safe zone: trade, rest and meet the villagers'],
    meadow: ['Crystal Meadow', 'Peaceful: walk over glowing crystals to collect coins'],
    arena: ['Frost Arena', 'Monsters ahead. Stay sharp!'],
  };
  function onZone(z) {
    window.MY_ZONE = z;
    hubGroup.visible = z === 'hub';
    meaGroup.visible = z === 'meadow';
    banner(INFO[z][0], INFO[z][1]);
    if (window.setTheme) window.setTheme(z === 'hub' ? 'village' : z === 'meadow' ? 'grassland' : (window.ARENA_THEME || 'meadow'));
  }
  function teleport(p) {
    fade.style.opacity = '1';
    setTimeout(() => {
      if (window.TELEPORT) window.TELEPORT(p.dx, p.dy);
      if (window.SFX) window.SFX.play('respawn', 0.8);
      setTimeout(() => { fade.style.opacity = '0'; }, 150);
    }, 320);
  }
  const night = () => window.TOD !== undefined && window.TOD >= 19.5 && window.TOD <= 29.5;

  let last = performance.now(), cd = 0;
  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const me = G.getMe();
    if (!me) return;
    const px = me.group.position.x * S, py = me.group.position.z * S;
    const z = STAGE.zoneAt(px).id;
    if (z !== window.MY_ZONE) onZone(z);
    cd -= dt;
    portalObjs.forEach((o) => {
      o.disc.rotation.z += dt * 1.2;
      o.disc.material.opacity = 0.45 + 0.15 * Math.sin(now / 300);
      if (cd <= 0 && z === o.p.zone && Math.hypot(px - o.p.x, py - o.p.y) < 55) {
        cd = 2.5;
        teleport(o.p);
      }
    });

    if (z === 'hub') {
      const t = now / 1000 + (Date.now() % 100000) / 1000 * 0;
      const sec = Date.now() / 1000;
      let best = null, bd = 140;
      for (const n of npcs) {
        if (n.pts) {
          let u = (sec + n.off) % n.cycle, st = null;
          for (const L of n.legs) {
            const mt = L.len / n.speed;
            if (u < mt) { const f = u / mt; st = { x: L.ax + (L.bx - L.ax) * f, y: L.ay + (L.by - L.ay) * f, mv: true, hx: L.bx - L.ax, hy: L.by - L.ay }; break; }
            u -= mt;
            if (u < 3) { st = { x: L.bx, y: L.by, mv: false, hx: L.bx - L.ax, hy: L.by - L.ay }; break; }
            u -= 3;
          }
          if (!st) st = { x: n.pts[0][0], y: n.pts[0][1], mv: false, hx: 0, hy: 1 };
          n.group.visible = !night();
          n.group.position.set(st.x / S, 0, st.y / S);
          let d = Math.atan2(st.hx, st.hy) - n.group.rotation.y;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          n.group.rotation.y += d * Math.min(1, dt * 6);
          n.anim(dt, st.mv ? 3.5 : 0, 0);
        } else {
          n.anim(dt, 0, 0);
        }
        if (n.group.visible) {
          const d = Math.hypot(n.group.position.x * S - px, n.group.position.z * S - py);
          if (d < bd) { bd = d; best = n; }
        }
      }
      near = best;
      if (near) {
        hint.style.display = 'block';
        hint.textContent = near.role === 'vendor' ? (window.TOUCH ? 'Tap to trade with Mira' : 'Press T to trade with Mira') : (window.TOUCH ? 'Tap to talk to ' : 'Press T to talk to ') + near.name;
      } else {
        hint.style.display = 'none';
      }
      if (forgeLight) forgeLight.intensity = 1.5 + Math.sin(now / 90) * 0.25 + Math.sin(now / 37) * 0.1;
    } else {
      near = null;
      hint.style.display = 'none';
    }
    if (z === 'meadow') {
      for (const id in nodes) {
        const o = nodes[id];
        o.m.rotation.y += dt;
        o.m.position.y = 0.55 + Math.sin(now / 500 + o.ph) * 0.08;
      }
    }
  }
  tick();
}
