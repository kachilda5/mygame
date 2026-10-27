import * as THREE from 'three';
import { buildKnight } from './knight.js';
import { initStages } from './stages.js';
import { initAudio } from './audio.js';
import { initDayNight } from './daynight.js';
import { initLoot } from './loot.js';
import { setupWorld } from './world.js';
import { buildHuman } from './human.js';

import('./foes.js').then((m) => { window.buildMonster = (kind, theme, boss) => m.buildFoe(THREE, kind, theme, boss); }).catch((err) => console.warn('Monster builder not loaded:', err));
const S = 50;
const wx = (x) => x / S;
const wz = (y) => y / S;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.domElement.style.display = 'block';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const FOG = 0x0a0d14;
const scene = new THREE.Scene();
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.FogExp2(FOG, 0.04);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 9, 13);
camera.lookAt(8, 0, 6);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x4a3a2a, 1.2));
const moon = new THREE.DirectionalLight(0xffe2b0, 2.4);
moon.position.set(14, 14, 10);
moon.target.position.set(8, 0, 6);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.bias = -0.0005;
moon.shadow.normalBias = 0.02;
const sc = moon.shadow.camera;
sc.left = -14; sc.right = 14; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 40;
scene.add(moon, moon.target);

const torches = setupWorld(THREE, scene, S);

const rings = [];
const others = {};
const enemyObjs = {};
window.ENEMIES = enemyObjs;
let me = null;
let mx = 400, my = 300;

function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 30px sans-serif';
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
  s.scale.set(2, 0.5, 1);
  s.position.y = 1.95;
  return s;
}

function makeBar() {
  const bar = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1), new THREE.MeshBasicMaterial({ color: 0x2a0808, fog: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1), new THREE.MeshBasicMaterial({ color: 0x39d353, fog: false }));
  fill.position.z = 0.002;
  bar.add(bg, fill);
  return { bar, fill };
}

function buildPlayer(color) {
  const model = new THREE.Group();
  const c = new THREE.Color(color).lerp(new THREE.Color(0x555555), 0.35);
  const bodyMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 12), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd2a98a, roughness: 0.8 }));
  head.position.y = 1.2;
  head.castShadow = true;
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.9 })
  );
  hood.position.y = 1.24;
  const pivot = new THREE.Group();
  pivot.position.set(0.42, 0.85, 0.1);
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.8, roughness: 0.3 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.03), steel);
  blade.position.y = 0.45;
  blade.castShadow = true;
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x6b4a2a }));
  hilt.position.y = 0.03;
  pivot.add(blade, hilt);
  model.add(body, head, hood, pivot);
  return { model, bodyMat, pivot };
}

function buildEnemy() {
  const model = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3b2a45, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), mat);
  body.scale.set(1, 1.15, 0.95);
  body.position.y = 0.6;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), mat);
  head.position.set(0, 1.15, 0.18);
  head.castShadow = true;
  model.add(body, head);
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: 0.5 });
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 8), hornMat);
    horn.position.set(0.16 * s, 1.38, 0.12);
    horn.rotation.z = -0.4 * s;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2222, fog: false }));
    eye.position.set(0.09 * s, 1.18, 0.4);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.6, 8), mat);
    arm.position.set(0.5 * s, 0.65, 0.15);
    arm.rotation.z = 0.5 * s;
    arm.castShadow = true;
    model.add(horn, eye, arm);
  }
  model.scale.setScalar(1.1);
  return { model, bodyMat: mat, pivot: null };
}

function setHp(e, hp, silent) {
  if (!silent && hp < e.hp) e.hit = 0.18;
  e.hp = hp;
  const r = clamp(hp / e.max, 0, 1);
  e.fill.scale.x = Math.max(r, 0.001);
  e.fill.position.x = -(1 - r) / 2;
}

function makeEntity(built, maxHp, hp, x, y, labelText) {
  const group = new THREE.Group();
  group.add(built.model);
  const { bar, fill } = makeBar();
  bar.position.y = labelText ? 1.65 : 1.45;
  group.add(bar);
  if (labelText) group.add(makeLabel(labelText));
  group.position.set(wx(x), 0, wz(y));
  scene.add(group);
  const e = {
    group, model: built.model, bodyMat: built.bodyMat, pivot: built.pivot, anim: built.anim, lx: wx(x), lz: wz(y),
    bar, fill, max: maxHp, hp, hit: 0, swing: 0,
    target: new THREE.Vector3(wx(x), 0, wz(y)), face: 0, phase: Math.random() * 6,
  };
  setHp(e, hp, true);
  return e;
}

function addPlayer(p) {
  return makeEntity(buildKnight(THREE, p.look), 100, p.hp, p.x, p.y, p.name);
}

function removeEntity(e) {
  scene.remove(e.group);
}

function getEntity(id) {
  return id === socket.id ? me : others[id];
}

function stepEntity(e, dt, t) {
  e.bar.quaternion.copy(camera.quaternion);
  let d = e.face - e.model.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  e.model.rotation.y += d * Math.min(1, dt * 12);
  e.model.position.y = 0.04 * Math.sin(t * 6 + e.phase);
  e.bodyMat.emissive.setHex(e.hit > 0 ? 0xaa1111 : 0x000000);
  e.hit -= dt;
  if (!e.bs) e.bs = e.model.scale.y;
  if (e.roll > 0) {
    e.roll -= dt;
    e.model.rotation.x = 1.05;
    e.model.scale.y = e.bs * 0.7;
  } else {
    e.model.rotation.x = 0;
    e.model.scale.y = e.bs;
  }
  if (e.anim) {
    const sp = Math.hypot(e.group.position.x - e.lx, e.group.position.z - e.lz) / Math.max(dt, 0.001);
    e.lx = e.group.position.x;
    e.lz = e.group.position.z;
    e.anim(dt, sp, e.swing);
    e.swing -= dt / 0.25;
  } else if (e.pivot) {
    e.pivot.rotation.x = 0.2 + Math.sin(clamp(e.swing, 0, 1) * Math.PI) * 1.8;
    e.swing -= dt / 0.25;
  }
}

function follow(e, dt) {
  const k = 1 - Math.exp(-dt * 12);
  const mvx = e.target.x - e.group.position.x;
  const mvz = e.target.z - e.group.position.z;
  if (Math.hypot(mvx, mvz) > 0.02) e.face = Math.atan2(mvx, mvz);
  e.group.position.x += mvx * k;
  e.group.position.z += mvz * k;
  e.group.position.y += (e.target.y - e.group.position.y) * k;
}

socket.on('currentPlayers', (players) => {
  for (const id in players) {
    if (id === socket.id) {
      me = addPlayer(players[id]);
      mx = players[id].x;
      my = players[id].y;
    } else {
      others[id] = addPlayer(players[id]);
    }
  }
});
socket.on('newPlayer', (p) => { others[p.id] = addPlayer(p); });
socket.on('playerMoved', (p) => {
  if (others[p.id]) others[p.id].target.set(wx(p.x), p.j || 0, wz(p.y));
});
socket.on('playerLeft', (id) => {
  if (others[id]) { removeEntity(others[id]); delete others[id]; }
});
socket.on('hpUpdate', (d) => {
  const e = getEntity(d.id);
  if (e) setHp(e, d.hp);
});
socket.on('playerRespawn', (d) => {
  const e = getEntity(d.id);
  if (!e) return;
  e.group.position.set(wx(d.x), 0, wz(d.y));
  e.target.set(wx(d.x), 0, wz(d.y));
  if (d.id === socket.id) { mx = d.x; my = d.y; }
  setHp(e, d.hp, true);
});
socket.on('attackEffect', (d) => {
  const e = getEntity(d.id);
  if (!e) return;
  e.swing = 1;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.7, 1.8, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, fog: false, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(e.group.position.x, 0.05, e.group.position.z);
  scene.add(ring);
  rings.push({ mesh: ring, t: 0 });
});
socket.on('enemies', (list) => {
  const seen = {};
  for (const en of list) {
    seen[en.id] = true;
    if (!enemyObjs[en.id]) {
      enemyObjs[en.id] = makeEntity(buildEnemy(), en.m || 60, en.hp, en.x, en.y, null);
      if (window.styleEnemy) window.styleEnemy(enemyObjs[en.id], en.k, en.v, en.el);
    }
    const e = enemyObjs[en.id];
    e.target.set(wx(en.x), 0, wz(en.y));
    setHp(e, en.hp);
  }
  for (const id in enemyObjs) {
    if (!seen[id]) { removeEntity(enemyObjs[id]); delete enemyObjs[id]; }
  }
});
socket.on('scoreboard', (list) => {
  const box = document.getElementById('scoreboard');
  if (!box) return;
  box.textContent = '';
  const title = document.createElement('div');
  title.style.fontWeight = 'bold';
  title.textContent = 'Scoreboard';
  box.appendChild(title);
  list.forEach((row, i) => {
    const line = document.createElement('div');
    line.textContent = (i + 1) + '. ' + row.name + ' - ' + row.score;
    box.appendChild(line);
  });
});

const keys = {};
let wantJump = false, wantRoll = false, camYaw = 0, jy = 0, jv = 0, rollT = 0, rollCool = 0, rdx = 0, rdy = 1, camInit = false;
const camPos = new THREE.Vector3();
window.TELEPORT = (x, y) => { mx = x; my = y; pending = true; camInit = false; };
let lastAimAtk = 0;
const knock = { x: 0, y: 0, t: 0 };
socket.on('knock', (d) => { if (d.id === socket.id) { knock.x = d.dx * d.p; knock.y = d.dy * d.p; knock.t = 0.25; } });
let camDist = 11;
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  camDist = Math.min(Math.max(camDist + e.deltaY * 0.01, 6), 18);
}, { passive: false });
socket.on('roll', (d) => {
  const e = getEntity(d.id);
  if (e) e.roll = 0.45;
});
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyF' && !e.repeat) socket.emit('attack');
  if (e.code === 'Space' && !e.repeat) wantJump = true;
  if (e.code === 'KeyC' && !e.repeat) wantRoll = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let dragId = null, lastDragX = 0;
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (e.pointerType === 'mouse' && e.button === 0) socket.emit('attack');
  dragId = e.pointerId;
  lastDragX = e.clientX;
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerId !== dragId) return;
  const moved = e.clientX - lastDragX;
  lastDragX = e.clientX;
  if (e.buttons & 2) camYaw -= moved * 0.006;
});
window.addEventListener('pointerup', (e) => { if (e.pointerId === dragId) dragId = null; });

const radar = document.createElement('canvas');
radar.width = radar.height = 140;
radar.style.cssText = 'position:fixed;top:205px;right:10px;width:140px;height:140px;border-radius:50%;background:rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.35);z-index:5;pointer-events:none;';
document.body.appendChild(radar);
const rctx = radar.getContext('2d');

function drawRadar() {
  rctx.clearRect(0, 0, 140, 140);
  if (!me) return;
  const R = 700, rad = 62;
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  const rx = -fz, rz = fx;
  rctx.strokeStyle = 'rgba(255,255,255,0.18)';
  rctx.beginPath();
  rctx.arc(70, 70, rad / 2, 0, Math.PI * 2);
  rctx.stroke();
  rctx.beginPath();
  rctx.moveTo(70, 70);
  rctx.lineTo(70, 8);
  rctx.stroke();
  const dot = (g, color, size) => {
    const dx = g.position.x * S - mx, dz = g.position.z * S - my;
    if (Math.hypot(dx, dz) > 2200) return;
    let sx = ((dx * rx + dz * rz) / R) * rad;
    let sy = -((dx * fx + dz * fz) / R) * rad;
    const d = Math.hypot(sx, sy);
    let sz = size;
    if (d > rad) { sx = (sx / d) * rad; sy = (sy / d) * rad; sz = size * 0.7; }
    rctx.fillStyle = color;
    rctx.beginPath();
    rctx.arc(70 + sx, 70 + sy, sz, 0, Math.PI * 2);
    rctx.fill();
  };
  for (const id in enemyObjs) dot(enemyObjs[id].group, '#ff4a4a', 3.5);
  for (const id in others) dot(others[id].group, '#4ad0ff', 3.5);
  rctx.fillStyle = '#ffffff';
  rctx.beginPath();
  rctx.moveTo(70, 63);
  rctx.lineTo(75, 75);
  rctx.lineTo(65, 75);
  rctx.closePath();
  rctx.fill();
}

const clock = new THREE.Clock();
let lastSend = 0;
let pending = false;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  const now = performance.now();

  if (me) {
    if (knock.t > 0) {
      knock.t -= dt;
      mx += knock.x * dt;
      my += knock.y * dt;
      const kq = STAGE.pushOut(mx, my, 16);
      mx = kq.x;
      my = kq.y;
      pending = true;
    }
    const sprint = !!(keys.ShiftLeft || keys.ShiftRight);
    let a = 0, b = 0, touchSprint = false;
    if (keys.ArrowLeft || keys.KeyA) a -= 1;
    if (keys.ArrowRight || keys.KeyD) a += 1;
    if (keys.ArrowUp || keys.KeyW) b += 1;
    if (keys.ArrowDown || keys.KeyS) b -= 1;
    if (window.touchDir) {
      a += window.touchDir.x;
      b -= window.touchDir.y;
      touchSprint = Math.hypot(window.touchDir.x, window.touchDir.y) > 0.92;
    }
    if (window.GAME_BLOCK || window.STORY_BLOCK) { a = 0; b = 0; wantJump = false; wantRoll = false; window.touchJump = false; window.touchRoll = false; }
    if (keys.KeyQ) camYaw += 1.8 * dt;
    if (keys.KeyE) camYaw -= 1.8 * dt;
    if (window.touchCam) camYaw += window.touchCam * 1.8 * dt;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    const rx = -fz, rz = fx;
    let dx = rx * a + fx * b, dy = rz * a + fz * b;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }

    if ((wantRoll || window.touchRoll) && rollT <= 0 && rollCool <= 0) {
      rollT = 0.45;
      rollCool = 1.0;
      rdx = len > 0.05 ? dx / Math.max(len, 1) : Math.sin(me.face);
      rdy = len > 0.05 ? dy / Math.max(len, 1) : Math.cos(me.face);
      const rl = Math.hypot(rdx, rdy) || 1;
      rdx /= rl;
      rdy /= rl;
      me.roll = 0.45;
      socket.emit('roll');
    }
    wantRoll = false;
    window.touchRoll = false;

    if ((wantJump || window.touchJump) && jy <= 0.001) { jv = 5.2; if (window.SFX) window.SFX.play('jump', 0.8); }
    wantJump = false;
    window.touchJump = false;
    jv -= 14 * dt;
    jy += jv * dt;
    if (jy < 0) { jy = 0; jv = 0; }
    rollCool -= dt;

    let speed = 320;
    if (sprint || touchSprint) speed = 520;
    let vx = dx * speed, vy = dy * speed;
    if (rollT > 0) { vx = rdx * 720; vy = rdy * 720; rollT -= dt; }
    const moving = rollT > 0 || len > 0.05;
    if (moving) {
      const zz = STAGE.zoneAt(mx, my);
      mx = clamp(mx + vx * dt, zz.x0 + 20, zz.x0 + zz.w - 20);
      my = clamp(my + vy * dt, zz.y0 + 20, zz.y0 + zz.h - 20);
      const q = STAGE.pushOut(mx, my, 16);
      mx = q.x;
      my = q.y;
      me.face = Math.atan2(vx, vy);
      pending = true;
    }
    if (jy > 0) pending = true;
    if (window.touchAim && window.touchAim.m > 0.25 && !window.STORY_BLOCK) {
      const ta = window.touchAim;
      const afx = -Math.sin(camYaw), afz = -Math.cos(camYaw);
      let ax = -afz * ta.x + afx * -ta.y;
      let az = afx * ta.x + afz * -ta.y;
      const al = Math.hypot(ax, az) || 1;
      ax /= al;
      az /= al;
      me.face = Math.atan2(ax, az);
      if (now - lastAimAtk > 280) {
        lastAimAtk = now;
        socket.emit('attack', { dx: ax, dy: az });
      }
    }
    if (pending && now - lastSend > 33) {
      socket.emit('move', { x: mx, y: my, j: jy });
      lastSend = now;
      pending = false;
    }
    me.group.position.set(wx(mx), jy, wz(my));
    stepEntity(me, dt, t);
  }

  for (const id in others) { follow(others[id], dt); stepEntity(others[id], dt, t); }
  for (const id in enemyObjs) { follow(enemyObjs[id], dt); stepEntity(enemyObjs[id], dt, t); }

  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.t += dt;
    const k = r.t / 0.25;
    r.mesh.scale.setScalar(0.4 + 0.6 * Math.min(k, 1));
    r.mesh.material.opacity = 0.7 * (1 - Math.min(k, 1));
    if (k >= 1) {
      scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
      rings.splice(i, 1);
    }
  }

  torches.forEach((l, i) => {
    l.intensity = 1.6 + Math.sin(t * 9 + i) * 0.25 + Math.sin(t * 23 + i * 2) * 0.1;
  });

  if (me) {
    const dist = camDist;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    const tx = me.group.position.x, tz = me.group.position.z;
    const gx = tx - fx * dist, gz = tz - fz * dist;
    if (!camInit) { camPos.set(gx, 0, gz); camInit = true; }
    if (keys.KeyZ) camDist = Math.max(6, camDist - 6 * dt);
    if (keys.KeyX) camDist = Math.min(18, camDist + 6 * dt);
    const k = Math.min(1, dt * 8);
    camPos.x += (gx - camPos.x) * k;
    camPos.z += (gz - camPos.z) * k;
    camera.position.set(camPos.x, 0.45 * camDist + 1.6 + jy * 0.4, camPos.z);
    camera.lookAt(tx + fx * 4, 1.0 + jy * 0.4, tz + fz * 4);
  }

  if (me && torches.update) torches.update(me.group.position.x, me.group.position.z, camera.position.x, camera.position.z);
  if (me) {
    moon.target.position.set(me.group.position.x, 0, me.group.position.z);
    const sd = window.SUNDIR || { x: 6, y: 14, z: 4 };
    moon.position.set(me.group.position.x + sd.x, sd.y, me.group.position.z + sd.z);
  }
  drawRadar();
  renderer.render(scene, camera);
}

initDayNight({ THREE, scene, camera, renderer, moon });
initLoot({ THREE, scene, camera, socket, getMe: () => me, getEntity });
initAudio({ socket, getMe: () => me, getEntity });
initStages({ THREE, scene, camera, renderer, socket });
window.buildKnight = (look) => buildKnight(THREE, look);
socket.on('lookUpdate', (d) => {
  const e = getEntity(d.id);
  if (!e) return;
  const b = buildKnight(THREE, d.look);
  e.group.remove(e.model);
  e.model = b.model;
  e.group.add(b.model);
  e.bodyMat = b.bodyMat;
  e.anim = b.anim;
  e.bs = 0;
});
import('./customize.js').then((m) => m.initCustomize({ THREE, socket })).catch((err) => console.warn('Style screen not loaded:', err));
import('./combat.js').then((m) => m.initCombat({ THREE, scene, socket })).catch((err) => console.warn('Combat effects not loaded:', err));
import('./shop.js').then((m) => m.initShop({ socket })).catch((err) => console.warn('Shop not loaded:', err));
import('./hub.js').then((m) => m.initHub({ THREE, scene, camera, socket, getMe: () => me })).catch((err) => console.warn('Village not loaded:', err));
import('./run.js').then((m) => m.initRun({ socket, getEntity })).catch((err) => console.warn('Game over screen not loaded:', err));
import('./story.js').then((m) => m.initStory({ socket })).catch((err) => console.warn('Story not loaded:', err));
import('./princess.js').then((m) => m.initPrincess({ THREE, scene, socket, getMe: () => me })).catch((err) => console.warn('Princess not loaded:', err));
frame();
socket.connect();
