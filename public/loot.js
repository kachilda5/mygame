export function initLoot(G) {
  const { THREE, scene, socket } = G;
  const S = 50;
  const NAMES = { sword: 'Sword', flame: 'Flame Blade', axe: 'Thunder Axe', pistol: 'Silver Pistol', rifle: 'Hunter Rifle' };
  const chests = {};
  const effects = [];

  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);max-width:70vw;background:rgba(0,0,0,.7);color:#ffd36b;font:bold 16px sans-serif;padding:8px 14px;border-radius:8px;z-index:6;display:none;text-align:center;';
  document.body.appendChild(toast);
  let toastTimer = 0;
  function say(msg) {
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 4000);
  }
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:170px;right:10px;background:rgba(0,0,0,.55);color:#fff;font:14px sans-serif;padding:6px 10px;border-radius:6px;z-index:6;';
  hud.textContent = 'Weapon: Sword';
  document.body.appendChild(hud);

  const gc = document.createElement('canvas');
  gc.width = gc.height = 64;
  const gg = gc.getContext('2d');
  const grad = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,230,120,1)');
  grad.addColorStop(1, 'rgba(255,200,60,0)');
  gg.fillStyle = grad;
  gg.fillRect(0, 0, 64, 64);
  const glintTex = new THREE.CanvasTexture(gc);
  glintTex.colorSpace = THREE.SRGBColorSpace;

  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a62a, metalness: 0.7, roughness: 0.35 });

  function addChest(c) {
    if (chests[c.id]) return;
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.45), wood);
    base.position.y = 0.2;
    const lid = new THREE.Group();
    lid.position.set(0, 0.4, -0.22);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.45), wood);
    top.position.set(0, 0.07, 0.22);
    lid.add(top);
    group.add(base, lid);
    for (const sx of [-0.2, 0.2]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.47), gold);
      band.position.set(sx, 0.2, 0);
      group.add(band);
      const lband = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.47), gold);
      lband.position.set(sx, 0.07, 0.22);
      lid.add(lband);
    }
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), gold);
    latch.position.set(0, 0.38, 0.23);
    group.add(latch);
    group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.position.set(c.x / S, 0, c.y / S);
    group.rotation.y = (Math.random() - 0.5) * 0.6;
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, transparent: true, opacity: 0, depthTest: false, fog: false }));
    glint.scale.set(0.9, 0.9, 1);
    glint.position.y = 0.55;
    glint.renderOrder = 10;
    group.add(glint);
    scene.add(group);
    chests[c.id] = { group, lid, glint, phase: Math.random() * 6, opening: false, life: 0 };
  }

  function tracer(ox, oy, ex, ey) {
    const a = new THREE.Vector3(ox / S, 0.9, oy / S);
    const b = new THREE.Vector3(ex / S, 0.9, ey / S);
    const len = a.distanceTo(b);
    if (len < 0.05) return;
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, len, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, fog: false })
    );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    scene.add(m);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, fog: false }));
    spark.position.copy(b);
    scene.add(spark);
    effects.push({ objs: [m, spark], born: performance.now(), dur: 130 });
  }

  function applyWeapon(id, key) {
    const e = G.getEntity(id);
    if (!e) return;
    const ud = e.model.userData;
    if (!ud.sword) return;
    if (ud.extra && ud.extra.parent) ud.extra.parent.remove(ud.extra);
    ud.extra = null;
    const blade = ud.sword.children[0];
    if (!ud.bladeMat) ud.bladeMat = blade.material;
    blade.material = ud.bladeMat;
    ud.sword.visible = true;
    const steel = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.8, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.6, roughness: 0.4 });
    if (key === 'flame') {
      blade.material = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 1.2, roughness: 0.4 });
    } else if (key === 'axe') {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.05), steel);
      head.position.set(0.16, 0.78, 0);
      ud.sword.add(head);
      ud.extra = head;
    } else if (key === 'pistol' || key === 'rifle') {
      ud.sword.visible = false;
      const L = key === 'rifle' ? 0.75 : 0.32;
      const gun = new THREE.Group();
      gun.position.set(0, -0.29, 0);
      gun.rotation.x = Math.PI / 2;
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, L, 0.05), dark);
      barrel.position.y = L / 2;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.11), dark);
      grip.position.set(0, 0, 0.07);
      gun.add(barrel, grip);
      if (key === 'rifle') {
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.08), new THREE.MeshStandardMaterial({ color: 0x5a3f28, roughness: 0.9 }));
        stock.position.set(0, -0.1, 0.02);
        gun.add(stock);
      }
      gun.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      ud.hand.add(gun);
      ud.extra = gun;
    }
  }

  socket.on('chests', (list) => list.forEach(addChest));
  socket.on('chestSpawn', addChest);
  socket.on('chestOpened', (d) => {
    const c = chests[d.id];
    if (c) { c.opening = true; c.life = 3; c.glint.visible = false; }
    say(d.who === socket.id ? 'You opened a chest and found the ' + d.name + '!' : d.by + ' found the ' + d.name + '!');
  });
  socket.on('weaponUpdate', (d) => {
    applyWeapon(d.id, d.weapon);
    if (d.id === socket.id) hud.textContent = 'Weapon: ' + (NAMES[d.weapon] || d.weapon);
  });
  socket.on('currentPlayers', (players) => {
    for (const id in players) {
      if (players[id].weapon && players[id].weapon !== 'sword') applyWeapon(id, players[id].weapon);
    }
  });
  socket.on('newPlayer', (p) => {
    if (p.weapon && p.weapon !== 'sword') applyWeapon(p.id, p.weapon);
  });
  socket.on('attackEffect', (d) => {
    if (d.gun) tracer(d.ox, d.oy, d.ex, d.ey);
  });

  let last = performance.now();
  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const t = now / 1000;
    const me = G.getMe();
    for (const id in chests) {
      const c = chests[id];
      if (c.opening) {
        c.lid.rotation.x += (-1.2 - c.lid.rotation.x) * 0.2;
        c.life -= dt;
        if (c.life <= 0) { scene.remove(c.group); delete chests[id]; }
        continue;
      }
      if (me) {
        const d = Math.hypot(c.group.position.x - me.group.position.x, c.group.position.z - me.group.position.z);
        c.glint.material.opacity = Math.min(Math.max((4 - d) / 2, 0), 1) * (0.55 + 0.45 * Math.sin(t * 4 + c.phase));
      }
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const f = effects[i];
      const k = (now - f.born) / f.dur;
      f.objs.forEach((o) => { o.material.opacity = Math.max(1 - k, 0); });
      if (k >= 1) {
        f.objs.forEach((o) => { scene.remove(o); o.geometry.dispose(); o.material.dispose(); });
        effects.splice(i, 1);
      }
    }
  }
  tick();
}
