export function initDayNight(G) {
  const { THREE, scene, camera, renderer, moon } = G;
  const CYCLE = 720;
  const NIGHT_LIGHT = 1.0;

  const KF = [
    { h: 7, fog: 0xcdb89a, fd: 0.034, hs: 0xffd9b0, hg: 0x4a3a2a, hi: 0.8, dc: 0xffd08a, di: 1.3, ex: 1.0, st: 0 },
    { h: 10, fog: 0xb8cbbb, fd: 0.030, hs: 0xd8e8ff, hg: 0x4a3a2a, hi: 1.0, dc: 0xfff0d0, di: 1.8, ex: 1.05, st: 0 },
    { h: 14, fog: 0xb4c8b8, fd: 0.028, hs: 0xcfe3ff, hg: 0x4a3a2a, hi: 1.05, dc: 0xfff4dc, di: 2.0, ex: 1.05, st: 0 },
    { h: 17, fog: 0xc9b79a, fd: 0.030, hs: 0xffd9b0, hg: 0x4a3a2a, hi: 0.9, dc: 0xffc074, di: 1.6, ex: 1.0, st: 0 },
    { h: 18.5, fog: 0x6b4a5a, fd: 0.034, hs: 0xc79a9a, hg: 0x2a2030, hi: 0.75, dc: 0xff8a5a, di: 1.0, ex: 1.05, st: 0.15 },
    { h: 20, fog: 0x1b2842, fd: 0.036, hs: 0x8499d0, hg: 0x1c2233, hi: 0.65, dc: 0x9db4ff, di: 1.05, ex: 1.15, st: 0.8 },
    { h: 23, fog: 0x16223a, fd: 0.037, hs: 0x7f93c8, hg: 0x1a2030, hi: 0.6, dc: 0xa8bdff, di: 1.0, ex: 1.15, st: 1 },
    { h: 27, fog: 0x16223a, fd: 0.037, hs: 0x7f93c8, hg: 0x1a2030, hi: 0.6, dc: 0xa8bdff, di: 1.0, ex: 1.15, st: 1 },
    { h: 29.5, fog: 0x2a3350, fd: 0.036, hs: 0x9aaad0, hg: 0x222838, hi: 0.65, dc: 0xb8c4ff, di: 0.95, ex: 1.1, st: 0.5 },
    { h: 31, fog: 0xcdb89a, fd: 0.034, hs: 0xffd9b0, hg: 0x4a3a2a, hi: 0.8, dc: 0xffd08a, di: 1.3, ex: 1.0, st: 0 },
  ];

  const hemi = scene.children.find((o) => o.isHemisphereLight);
  const flies = scene.children.find((o) => o.isPoints && (Math.abs(o.material.size - 0.07) < 0.001 || Math.abs(o.material.size - 0.12) < 0.001));
  if (flies) flies.material.transparent = true;

  const N = 450;
  const sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const y = 0.1 + Math.random() * 0.9;
    const th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    sp[i * 3] = Math.cos(th) * r * 85;
    sp[i * 3 + 1] = y * 85;
    sp[i * 3 + 2] = Math.sin(th) * r * 85;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.frustumCulled = false;
  scene.add(stars);

  function glowSprite(inner, outer, size) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner);
    gr.addColorStop(0.22, inner);
    gr.addColorStop(0.3, outer);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
    sp2.scale.set(size, size, 1);
    sp2.visible = false;
    scene.add(sp2);
    return sp2;
  }
  const sunS = glowSprite('rgba(255,244,200,1)', 'rgba(255,200,110,0.35)', 26);
  const moonS = glowSprite('rgba(235,240,255,1)', 'rgba(170,190,255,0.3)', 18);

  const tmp = new THREE.Color();
  function setMix(target, a, b, f) {
    tmp.set(b);
    target.set(a).lerp(tmp, f);
  }
  function place(s, d, ok) {
    s.visible = ok && d.y > -0.05;
    if (!s.visible) return;
    s.position.copy(camera.position).addScaledVector(d, 80);
    s.material.opacity = Math.min(Math.max((d.y + 0.05) / 0.25, 0), 1);
  }
  const dirOf = (ang) => new THREE.Vector3(Math.cos(ang), Math.sin(ang), -0.4).normalize();

  function apply(h) {
    let i = 0;
    while (i < KF.length - 2 && h >= KF[i + 1].h) i++;
    const A = KF[i], B = KF[i + 1];
    const f = Math.min(Math.max((h - A.h) / (B.h - A.h), 0), 1);
    const L = (x, y) => x + (y - x) * f;
    const night = L(A.st, B.st);
    window.TOD = h;
    const boost = 1 + (NIGHT_LIGHT - 1) * night;
    if (scene.fog) {
      setMix(scene.fog.color, A.fog, B.fog, f);
      scene.fog.density = L(A.fd, B.fd) * ((window.THEME && window.THEME.fogMul) || 1);
      if (window.THEME) { tmp.set(window.THEME.tint); scene.fog.color.lerp(tmp, window.THEME.k); }
      if (scene.background && scene.background.isColor) scene.background.copy(scene.fog.color);
    }
    if (hemi) {
      setMix(hemi.color, A.hs, B.hs, f);
      setMix(hemi.groundColor, A.hg, B.hg, f);
      hemi.intensity = L(A.hi, B.hi) * boost;
    }
    setMix(moon.color, A.dc, B.dc, f);
    moon.intensity = L(A.di, B.di) * boost;
    renderer.toneMappingExposure = L(A.ex, B.ex);
    stars.material.opacity = night;
    stars.position.copy(camera.position);
    if (flies) flies.material.opacity = Math.min(1, night * 1.5);

    const sd = dirOf(((h - 6) / 12) * Math.PI);
    const md = dirOf(((h - 18) / 12) * Math.PI);
    place(sunS, sd, h <= 18.4);
    place(moonS, md, h >= 17.6 && h <= 30.4);
    const act = h <= 18 ? sd : md;
    window.SUNDIR = { x: act.x * 16, y: Math.max(6, act.y * 16), z: act.z * 16 };
  }

  function hourFromP(p) {
    if (p < 0.2) return 7 + (p / 0.2) * 10;
    if (p < 0.3) return 17 + ((p - 0.2) / 0.1) * 3;
    if (p < 0.9) return 20 + ((p - 0.3) / 0.6) * 9;
    return 29 + ((p - 0.9) / 0.1) * 2;
  }

  let mode = 'auto';
  const manual = { morning: 8.5, night: 22 };
  function hourNow() {
    if (mode !== 'auto') return manual[mode];
    return hourFromP(((Date.now() / 1000) % CYCLE) / CYCLE);
  }
  function phase(h) {
    if (h < 11) return ['\u{1F305}', 'Morning'];
    if (h < 17) return ['\u2600\uFE0F', 'Day'];
    if (h < 20) return ['\u{1F307}', 'Evening'];
    if (h < 29) return ['\u{1F319}', 'Night'];
    return ['\u{1F304}', 'Dawn'];
  }

  const label = document.createElement('div');
  label.style.cssText = 'position:fixed;top:355px;right:10px;background:rgba(0,0,0,.55);color:#fff;font:13px sans-serif;padding:5px 9px;border-radius:6px;z-index:6;cursor:pointer;user-select:none;';
  label.title = 'Click or press N to change the time of day';
  document.body.appendChild(label);
  function cycleMode() {
    mode = mode === 'auto' ? 'morning' : mode === 'morning' ? 'night' : 'auto';
  }
  label.addEventListener('click', cycleMode);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN' && !e.repeat) cycleMode();
  });

  let lastText = '';
  function tick() {
    requestAnimationFrame(tick);
    const h = hourNow();
    apply(h);
    const p = phase(h);
    const text = p[0] + ' ' + p[1] + (mode !== 'auto' ? ' (locked)' : '') + '  [N]';
    if (text !== lastText) {
      label.textContent = text;
      lastText = text;
    }
  }
  tick();
}
