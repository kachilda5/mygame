export function initPrincess(G) {
  const { THREE, scene, socket, getMe } = G;
  const S = 50;
  const HX = STAGE.HUB_X;
  const NAME = 'Princess Deaneyrs';
  const PX = 1300 / S, PZ = 200 / S;
  const FX = 1180 / S, FZ = 330 / S;
  const VX = (HX + 560) / S, VZ = 740 / S;
  const LINES = [
    'Thank you for saving me, Warden. The wards hold because of you.',
    'I can feel the Whiteout gathering in the north. The Colossus was never the real enemy.',
    'Someone woke the Colossus. I must find out who, and you are the one I trust to help me.',
  ];

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
    g.fillStyle = '#ffe9a8';
    g.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
    s.scale.set(3, 0.75, 1);
    return s;
  }

  const look = { skin: 1, hair: 2, hairColor: 4, beard: 0, cloak: 3, armor: 2, crest: 0, sword: 0 };
  const b = window.buildKnight(look);
  if (b.model.userData.sword) b.model.userData.sword.visible = false;
  const g = new THREE.Group();
  g.add(b.model);
  const lab = labelSprite(NAME);
  lab.position.y = 2.1;
  g.add(lab);
  g.visible = false;
  scene.add(g);

  const iceM = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x1a6fd0, emissiveIntensity: 0.5, roughness: 0.1, transparent: true, opacity: 0.5, flatShading: true });
  const spikeM = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x2a7fe0, emissiveIntensity: 0.7, roughness: 0.15, transparent: true, opacity: 0.85, flatShading: true });
  const prison = new THREE.Group();
  prison.position.set(PX, 0, PZ);
  const block = new THREE.Mesh(new THREE.OctahedronGeometry(1), iceM);
  block.scale.set(0.95, 1.7, 0.95);
  block.position.y = 1.0;
  prison.add(block);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const h = 1.4 + Math.random() * 1.4;
    const sp = new THREE.Mesh(new THREE.OctahedronGeometry(1), spikeM);
    sp.scale.set(0.22, h, 0.22);
    sp.position.set(Math.cos(a) * 1.2, h * 0.9, Math.sin(a) * 1.2);
    sp.rotation.z = -Math.cos(a) * 0.25;
    sp.rotation.x = Math.sin(a) * 0.25;
    prison.add(sp);
  }
  const glow = new THREE.PointLight(0x66ccff, 1.6, 9, 2);
  glow.position.y = 1.6;
  prison.add(glow);
  prison.visible = false;
  scene.add(prison);

  const bits = [];
  function shatter() {
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 + Math.random() * 0.12), spikeM);
      m.position.set(PX + (Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 1.8, PZ + (Math.random() - 0.5) * 0.8);
      m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6);
      m.userData.life = 1.4;
      scene.add(m);
      bits.push(m);
    }
    if (window.SFX) window.SFX.play('monsterDie', 0.7);
  }

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:50%;bottom:230px;transform:translateX(-50%);width:min(520px,92vw);background:rgba(30,16,40,.9);border:1px solid #b78bd8;border-radius:12px;padding:10px 14px;color:#fff;font:15px/1.5 sans-serif;z-index:12;display:none;';
  const boxName = document.createElement('div');
  boxName.textContent = NAME;
  boxName.style.cssText = 'font-weight:bold;color:#ffd36b;margin-bottom:2px;';
  const boxText = document.createElement('div');
  box.appendChild(boxName);
  box.appendChild(boxText);
  document.body.appendChild(box);

  let captive = false, free = false, freedAt = 0, wasNear = false, lineIdx = 0;
  try { free = localStorage.getItem('deaneyrsFree') === '1'; } catch (e) { free = false; }

  let lastKey = '';
  socket.on('stage', (d) => {
    const key = d.idx + '|' + d.phase + '|' + d.msg;
    if (key === lastKey) return;
    lastKey = key;
    captive = d.idx === 5;
    if (d.msg && d.msg.indexOf('ALL LEVELS CLEARED') === 0 && d.idx === 6) {
      captive = false;
      shatter();
      free = true;
      freedAt = performance.now();
      try { localStorage.setItem('deaneyrsFree', '1'); } catch (e) { /* ignore */ }
    }
  });

  let last = performance.now();
  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const zone = window.MY_ZONE;
    const me = getMe();
    let show = false, x = 0, z = 0;
    if (zone === 'arena' && captive) { show = true; x = PX; z = PZ; }
    else if (zone === 'arena' && free && freedAt && now - freedAt < 90000) { show = true; x = FX; z = FZ; }
    else if (zone === 'hub' && free) { show = true; x = VX; z = VZ; }
    g.visible = show;
    prison.visible = zone === 'arena' && captive;
    let near = false;
    if (show) {
      g.position.set(x, 0, z);
      b.anim(dt, 0, 0);
      if (me) {
        const dx = me.group.position.x - x, dz = me.group.position.z - z;
        let d = Math.atan2(dx, dz) - g.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        g.rotation.y += d * Math.min(1, dt * 4);
        near = !captive && Math.hypot(dx, dz) < 3.2;
      }
    }
    if (near && !wasNear) {
      boxText.textContent = LINES[lineIdx % LINES.length];
      lineIdx++;
      box.style.display = 'block';
    }
    if (!near && wasNear) box.style.display = 'none';
    wasNear = near;

    for (let i = bits.length - 1; i >= 0; i--) {
      const m = bits[i];
      m.userData.v.y -= 12 * dt;
      m.position.addScaledVector(m.userData.v, dt);
      m.userData.life -= dt;
      m.scale.setScalar(Math.max(m.userData.life / 1.4, 0.01));
      if (m.userData.life <= 0) {
        scene.remove(m);
        bits.splice(i, 1);
      }
    }
  }
  tick();
}
