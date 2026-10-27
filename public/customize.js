import * as K from './knight.js';

export function initCustomize(G) {
  const { THREE, socket } = G;
  const KEY = 'knightLook';
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }
  const look = Object.assign({}, K.DEFAULT_LOOK, saved || {});
  const firstTime = !saved;

  function send() {
    try { localStorage.setItem(KEY, JSON.stringify(look)); } catch (e) { /* ignore */ }
    socket.emit('look', look);
  }
  socket.on('connect', () => socket.emit('look', look));
  if (socket.connected) socket.emit('look', look);

  const btn = document.createElement('div');
  btn.textContent = '\u2694 Style';
  btn.style.cssText = 'position:fixed;top:415px;right:10px;background:rgba(0,0,0,.55);color:#fff;font:13px sans-serif;padding:5px 9px;border-radius:6px;z-index:6;cursor:pointer;user-select:none;';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(5,8,14,.78);z-index:20;display:none;align-items:center;justify-content:center;';
  const card = document.createElement('div');
  card.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;max-width:94vw;max-height:92vh;overflow:auto;background:#12161f;border:1px solid #3a4258;border-radius:12px;padding:16px;color:#fff;font:14px sans-serif;';
  panel.appendChild(card);
  document.body.appendChild(panel);
  panel.addEventListener('keydown', (e) => e.stopPropagation());

  const left = document.createElement('div');
  left.style.cssText = 'width:240px;';
  const title = document.createElement('div');
  title.textContent = 'Style your knight';
  title.style.cssText = 'font:bold 18px sans-serif;margin-bottom:8px;color:#ffd36b;';
  left.appendChild(title);
  const view = document.createElement('div');
  view.style.cssText = 'width:240px;height:340px;border-radius:10px;overflow:hidden;background:linear-gradient(#f3b565,#6a4a7a 60%,#1b2440);';
  left.appendChild(view);
  const ref = document.createElement('img');
  ref.src = 'knight.png';
  ref.style.cssText = 'width:120px;margin-top:8px;border-radius:8px;';
  ref.onerror = () => { ref.style.display = 'none'; };
  left.appendChild(ref);
  card.appendChild(left);

  const opts = document.createElement('div');
  opts.style.cssText = 'width:300px;max-width:100%;';
  card.appendChild(opts);

  const PW = 240, PH = 340;
  const pr = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  pr.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  pr.setSize(PW, PH);
  pr.toneMapping = THREE.ACESFilmicToneMapping;
  view.appendChild(pr.domElement);
  const ps = new THREE.Scene();
  ps.add(new THREE.HemisphereLight(0xcfe3ff, 0x4a3a2a, 1.1));
  const pl = new THREE.DirectionalLight(0xffe2b0, 2.2);
  pl.position.set(2, 3, 3);
  ps.add(pl);
  const pc = new THREE.PerspectiveCamera(32, PW / PH, 0.1, 50);
  pc.position.set(0, 1.0, 4.4);
  pc.lookAt(0, 0.8, 0);
  let pm = null;
  function rebuild() {
    if (pm) ps.remove(pm.model);
    pm = K.buildKnight(THREE, look);
    ps.add(pm.model);
  }

  const refreshers = [];
  const mark = () => refreshers.forEach((f) => f());
  function row(label) {
    const r = document.createElement('div');
    r.style.margin = '8px 0';
    const l = document.createElement('div');
    l.textContent = label;
    l.style.cssText = 'font-weight:bold;margin-bottom:4px;';
    const b = document.createElement('div');
    b.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    r.appendChild(l);
    r.appendChild(b);
    opts.appendChild(r);
    return b;
  }
  function swatches(label, list, key, colorOf) {
    const box = row(label);
    const els = list.map((item, i) => {
      const d = document.createElement('div');
      d.style.cssText = 'width:26px;height:26px;border-radius:50%;cursor:pointer;border:3px solid transparent;background:' + colorOf(item) + ';';
      d.addEventListener('click', () => { look[key] = i; mark(); rebuild(); });
      box.appendChild(d);
      return d;
    });
    refreshers.push(() => els.forEach((d, i) => { d.style.borderColor = look[key] === i ? '#ffd36b' : 'transparent'; }));
  }
  function choices(label, names, key) {
    const box = row(label);
    const els = names.map((n, i) => {
      const b = document.createElement('button');
      b.textContent = n;
      b.style.cssText = 'padding:5px 10px;border-radius:14px;border:1px solid #556;background:#222a3a;color:#fff;cursor:pointer;font:13px sans-serif;';
      b.addEventListener('click', () => { look[key] = i; mark(); rebuild(); b.blur(); });
      box.appendChild(b);
      return b;
    });
    refreshers.push(() => els.forEach((b, i) => { b.style.background = look[key] === i ? '#7a5c1e' : '#222a3a'; }));
  }
  swatches('Skin', K.SKIN, 'skin', (c) => c);
  choices('Hair style', K.HAIRS, 'hair');
  swatches('Hair color', K.HAIRC, 'hairColor', (c) => c);
  choices('Beard', K.BEARDS, 'beard');
  swatches('Cloak', K.CLOAKC, 'cloak', (c) => c);
  swatches('Armor', K.ARMORS, 'armor', (a) => a.metal);
  choices('Crest', K.CRESTS, 'crest');
  choices('Sword', K.SWORDS, 'sword');

  const lens = { skin: K.SKIN.length, hair: K.HAIRS.length, hairColor: K.HAIRC.length, beard: K.BEARDS.length, cloak: K.CLOAKC.length, armor: K.ARMORS.length, crest: K.CRESTS.length, sword: K.SWORDS.length };
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:8px;margin-top:12px;';
  const mk = (text, bg, fn) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = 'padding:8px 14px;border-radius:8px;border:0;background:' + bg + ';color:#fff;cursor:pointer;font:bold 14px sans-serif;';
    b.addEventListener('click', () => { fn(); b.blur(); });
    buttons.appendChild(b);
  };
  mk('Randomize', '#3a4258', () => {
    for (const k in lens) look[k] = Math.floor(Math.random() * lens[k]);
    mark();
    rebuild();
  });
  mk('Done', '#2e7d32', () => { close(); send(); });
  opts.appendChild(buttons);

  let isOpen = false, last = performance.now();
  function loop() {
    if (!isOpen) return;
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (pm) {
      pm.model.rotation.y += dt * 0.7;
      pm.anim(dt, 0, 0);
    }
    pr.render(ps, pc);
  }
  function open() {
    isOpen = true;
    panel.style.display = 'flex';
    mark();
    rebuild();
    last = performance.now();
    loop();
  }
  function close() {
    isOpen = false;
    panel.style.display = 'none';
  }
  btn.addEventListener('click', () => { if (isOpen) { close(); send(); } else open(); });
  if (firstTime) setTimeout(open, 1500);
}
