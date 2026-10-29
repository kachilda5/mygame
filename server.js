const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { pushOut, inObstacle, obstacles: STAGE_OBS } = require('./public/stage.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use('/phaser', express.static('node_modules/phaser/dist'));
app.use('/three', express.static('node_modules/three/build'));
app.use('/vendor/react', express.static('node_modules/react/umd'));
app.use('/vendor/react-dom', express.static('node_modules/react-dom/umd'));

const players = {};
const enemies = {};
let nextEnemyId = 1;

const MAX_HP = 100;
const ATTACK_RANGE = 90;
const ATTACK_DAMAGE = 20;
const ATTACK_COOLDOWN = 400;

const ENEMY_COUNT = 7;
const ENEMY_HP = 60;
const ENEMY_SPEED = 70;
const ENEMY_DAMAGE = 10;
const ENEMY_COOLDOWN = 1000;
const ENEMY_TOUCH = 35;

const STAGE_W = require('./public/stage.js').W;
const STAGE_H = require('./public/stage.js').H;

function randomSpot() {
  for (let i = 0; i < 50; i++) {
    const x = 100 + Math.random() * (STAGE_W - 200);
    const y = 100 + Math.random() * (STAGE_H - 200);
    if (!inObstacle(x, y, 30)) return { x, y };
  }
  return { x: 60, y: 60 };
}

function cleanName(n, id) {
  const s = typeof n === 'string' ? n.trim().slice(0, 12) : '';
  return s || 'Player ' + id.slice(0, 4);
}

function sendScoreboard() {
  const list = Object.values(players)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((p) => ({ name: p.name, score: p.score }));
  io.emit('scoreboard', list);
}

function spawnEnemy() {
  const id = 'e' + nextEnemyId++;
  enemies[id] = { ...randomSpot(), hp: ENEMY_HP, lastHit: 0 };
}

// enemies now come from stage waves

function damagePlayer(id, amount, attackerId) {
  const t = players[id];
  if (!t || t.dead || t.paused) return;
  if (t.x >= 3000) return;
  if (t.rollUntil && Date.now() < t.rollUntil) {
    if (Date.now() - (t.rollStart || 0) < 260) {
      t.boostUntil = Date.now() + 4000;
      t.hp = Math.min(MAX_HP, t.hp + 6);
      io.to(id).emit('perfect', { hp: t.hp });
      io.emit('hpUpdate', { id, hp: t.hp });
      giveCoins(id, 5);
    }
    return;
  }
  if (t.hurtUntil && Date.now() < t.hurtUntil) return;
  t.hurtUntil = Date.now() + 600;
  t.hp -= amount;
  if (t.hp > 0) {
    io.emit('hpUpdate', { id, hp: t.hp });
    return;
  }
  t.hp = 0;
  t.dead = true;
  io.emit('hpUpdate', { id, hp: 0 });
  if (attackerId && attackerId !== id && players[attackerId]) {
    players[attackerId].score += 5;
    sendScoreboard();
  }
  io.to(id).emit('gameOver', { level: stage.idx + 1, score: t.score || 0, coins: t.coins || 0 });
  io.emit('playerDown', { id });
  checkWipe();
}

const ATTACKS = {
  goblin: { reach: 60, windup: 450 },
  wolf: { reach: 65, windup: 350 },
  skeleton: { reach: 75, windup: 450 },
  yeti: { reach: 100, windup: 750 },
  golem: { reach: 115, windup: 950 },
  wraith: { reach: 0, windup: 500 },
  boss: { reach: 170, windup: 800 },
};
const AGGRO = { goblin: 480, wolf: 560, skeleton: 480, yeti: 450, wraith: 520, golem: 450, boss: 99999 };
const SHOOTERS = { goblin: 2800, wraith: 2600, boss: 7000 };
const SHOT_RANGE = { goblin: 300, wraith: 320, boss: 420 };
const KNOCKS = { boss: 520, golem: 480, yeti: 450 };
const shots = [];
let nextShotId = 1;

function fireShot(e, p, spread, dmg) {
  const a = Math.atan2(p.y - e.y, p.x - e.x) + spread;
  const speed = e.kind === 'boss' ? 340 : 300;
  const life = e.kind === 'boss' ? 1.5 : 1.1;
  shots.push({ id: nextShotId++, x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life, dmg });
}

function attackersOn(pid) {
  let n = 0;
  for (const k in enemies) {
    const o = enemies[k];
    if (o.windupEnd && !o.pendingShot && o.target === pid) n++;
  }
  return n;
}

function anyNear(e, r) {
  return arenaIds().some((id) => Math.hypot(players[id].x - e.x, players[id].y - e.y) < r);
}

setInterval(() => {
  const dt = 0.05;
  const now = Date.now();
  const ids = arenaIds();
  const hunt = (stage.phase === 'wave' || stage.phase === 'boss') && now - (stage.waveStart || now) > 20000;
  const maxAtk = Math.min(4, 2 + Math.floor(stage.idx / 3));

  for (const eid in enemies) {
    const e = enemies[eid];
    if (!ids.length) {
      if (e.windupEnd) e.windupEnd += 50;
      e.lastHit += 50;
      e.lastShot += 50;
      e.slamAt += 50;
      if (e.slamHit) e.slamHit += 50;
      continue;
    }
    const A = ATTACKS[e.kind] || ATTACKS.goblin;

    let nearestId = null;
    let nearestDist = Infinity;
    for (const pid of ids) {
      const d = Math.hypot(players[pid].x - e.x, players[pid].y - e.y);
      if (d < nearestDist) { nearestDist = d; nearestId = pid; }
    }
    const np = players[nearestId];

    if (e.windupEnd) {
      if (now >= e.windupEnd) {
        e.windupEnd = 0;
        e.lastHit = now;
        if (e.pendingShot) {
          e.pendingShot = false;
          if (e.kind === 'boss') {
            [-0.25, 0, 0.25].forEach((sp) => fireShot(e, np, sp, Math.round(e.dmg * 0.8)));
          } else if (e.kind === 'wraith') {
            [-0.12, 0.12].forEach((sp) => fireShot(e, np, sp, Math.round(e.dmg * 0.8)));
          } else {
            fireShot(e, np, 0, e.dmg);
          }
        } else {
          e.target = null;
          for (const pid of ids) {
            const p = players[pid];
            const d = Math.hypot(p.x - e.x, p.y - e.y);
            if (d <= A.reach + 15) {
              const rolling = p.rollUntil && now < p.rollUntil;
              damagePlayer(pid, e.dmg, null);
              if (!rolling) {
                io.emit('knock', { id: pid, dx: (p.x - e.x) / (d || 1), dy: (p.y - e.y) / (d || 1), p: KNOCKS[e.kind] || 300 });
              }
            }
          }
        }
      }
      continue;
    }

    const aggroR = AGGRO[e.kind] || 480;
    if (nearestDist < aggroR) e.aggroUntil = now + 4000;
    const active = hunt || (e.aggroUntil && now < e.aggroUntil);

    if (!active) {
      if (!e.wanderAt || now > e.wanderAt) {
        const wa = Math.random() * Math.PI * 2;
        e.wdx = Math.cos(wa);
        e.wdy = Math.sin(wa);
        e.wanderAt = now + 2500 + Math.random() * 3000;
      }
      e.x += e.wdx * e.speed * 0.3 * dt;
      e.y += e.wdy * e.speed * 0.3 * dt;
      if (e.kind !== 'wraith') {
        const wq = pushOut(e.x, e.y, e.rad || 16);
        e.x = wq.x;
        e.y = wq.y;
      }
      e.x = Math.min(Math.max(e.x, 30), 1570);
      e.y = Math.min(Math.max(e.y, 30), 1170);
      continue;
    }

    if (e.kind === 'wraith') {
      const d = nearestDist || 1;
      const dx = np.x - e.x, dy = np.y - e.y;
      let mx = 0, my = 0;
      if (d > 310) { mx = dx / d; my = dy / d; }
      else if (d < 230) { mx = -dx / d; my = -dy / d; }
      else { mx = (-dy / d) * 0.6; my = (dx / d) * 0.6; }
      e.x += mx * e.speed * dt;
      e.y += my * e.speed * dt;
    } else if (nearestDist > A.reach * 0.75) {
      e.x += ((np.x - e.x) / nearestDist) * e.speed * dt;
      e.y += ((np.y - e.y) / nearestDist) * e.speed * dt;
      const q = pushOut(e.x, e.y, e.rad || 16);
      e.x = q.x;
      e.y = q.y;
    }
    e.x = Math.min(Math.max(e.x, 30), 1570);
    e.y = Math.min(Math.max(e.y, 30), 1170);

    if (now - e.lastHit >= e.cd) {
      if (A.reach > 0 && nearestDist <= A.reach) {
        if (attackersOn(nearestId) < maxAtk) {
          e.windupEnd = now + A.windup;
          e.pendingShot = false;
          e.target = nearestId;
          io.emit('enemyAttack', { id: eid, dur: A.windup, ranged: false });
        } else {
          const d = nearestDist || 1;
          e.x += (-(np.y - e.y) / d) * e.speed * 0.4 * dt;
          e.y += ((np.x - e.x) / d) * e.speed * 0.4 * dt;
        }
      } else if (
        SHOOTERS[e.kind] &&
        nearestDist < (SHOT_RANGE[e.kind] || 300) &&
        nearestDist > (e.kind === 'goblin' ? 120 : 0) &&
        now - (e.lastShot || 0) > SHOOTERS[e.kind]
      ) {
        e.lastShot = now;
        e.windupEnd = now + 450;
        e.pendingShot = true;
        io.emit('enemyAttack', { id: eid, dur: 450, ranged: true });
      }
    }
  }

  for (let i = ids.length ? shots.length - 1 : -1; i >= 0; i--) {
    const s = shots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    let dead = s.life <= 0 || inObstacle(s.x, s.y, 4);
    if (!dead) {
      for (const id of ids) {
        const p = players[id];
        if (Math.hypot(p.x - s.x, p.y - s.y) < 24) {
          damagePlayer(id, s.dmg, null);
          dead = true;
          break;
        }
      }
    }
    if (dead) shots.splice(i, 1);
  }

  io.emit('enemies', Object.entries(enemies).map(([id, e]) => ({
    id, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp, m: e.maxHp, k: e.kind, v: e.v, el: e.elite ? 1 : 0,
  })));
  io.emit('shots', shots.map((s) => ({ id: s.id, x: Math.round(s.x), y: Math.round(s.y) })));
}, 50);


const WEAPONS = {
  sword:  { name: 'Sword', type: 'melee', dmg: 20, range: 90, cd: 400 },
  flame:  { name: 'Flame Blade', type: 'melee', dmg: 35, range: 95, cd: 450 },
  axe:    { name: 'Thunder Axe', type: 'melee', dmg: 55, range: 105, cd: 800 },
  pistol: { name: 'Silver Pistol', type: 'gun', dmg: 25, range: 500, cd: 350 },
  rifle:  { name: 'Hunter Rifle', type: 'gun', dmg: 45, range: 800, cd: 900 },
};

function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const fx = cx - ox, fy = cy - oy;
  const t = fx * dx + fy * dy;
  if (t < 0) return null;
  const px = ox + dx * t - cx, py = oy + dy * t - cy;
  const d2 = px * px + py * py;
  if (d2 > r * r) return null;
  return t - Math.sqrt(r * r - d2);
}

function hurtEnemy(eid, dmg, owner) {
  const e = enemies[eid];
  if (!e) return;
  e.hp -= dmg;
  if (e.kind === 'boss' && !e.enraged && e.hp > 0 && e.hp <= e.maxHp * 0.5) {
    e.enraged = true;
    e.speed *= 1.3;
    e.cd *= 0.75;
    io.emit('bossEnrage', { id: eid });
    const minion = stage.idx % 2 === 0 ? 'goblin' : 'wolf';
    for (let i = 0; i < 3 + Math.min(stage.idx, 3); i++) spawnKind(minion);
  }
  if (e.hp <= 0) {
    delete enemies[eid];
    const cNow = Date.now();
    owner.combo = cNow - (owner.comboAt || 0) < 4000 ? Math.min((owner.combo || 0) + 1, 8) : 1;
    owner.comboAt = cNow;
    owner.score += owner.combo;
    const ownerId = Object.keys(players).find((k) => players[k] === owner);
    if (ownerId) io.emit('combo', { id: ownerId, n: owner.combo });
    const coinBase = ({ boss: 100, wolf: 7, skeleton: 9, yeti: 16, wraith: 12, golem: 25 })[e.kind] || 5;
    if (ownerId) giveCoins(ownerId, Math.round(coinBase * (e.elite ? 3 : 1) * (1 + 0.15 * stage.idx)) + owner.combo, Math.round(e.x), Math.round(e.y));
    sendScoreboard();
    stageCheck();
  }
}

const CHEST_W = require('./public/stage.js').W || 800;
const CHEST_H = require('./public/stage.js').H || 600;
const chests = {};
let nextChestId = 1;

function chestList() {
  return Object.values(chests);
}

function spawnChest() {
  const cand = STAGE_OBS.filter((o) => o.kind === 'tree' || o.kind === 'rock');
  if (!cand.length) return;
  for (let i = 0; i < 60; i++) {
    const o = cand[Math.floor(Math.random() * cand.length)];
    const x = o.x + (Math.random() - 0.5) * 24;
    const y = o.y - o.r - 20;
    if (x < 60 || x > CHEST_W - 60 || y < 60 || y > CHEST_H - 60) continue;
    if (inObstacle(x, y, 14)) continue;
    if (Object.values(chests).some((c) => Math.hypot(c.x - x, c.y - y) < 150)) continue;
    const id = 'c' + nextChestId++;
    chests[id] = { id, x: Math.round(x), y: Math.round(y) };
    io.emit('chestSpawn', chests[id]);
    return;
  }
}
for (let i = 0; i < 6; i++) spawnChest();


const STAGES = [
  { name: 'Snowy Meadow', theme: 'meadow', foe: 'Frost imps', boss: { name: 'Snowdrift Brute', hp: 300, v: 'yeti' },
    waves: [{ goblin: 3 }, { goblin: 4 }, { goblin: 5 }] },
  { name: 'Frostbite Woods', theme: 'frost', foe: 'Frost wolves', boss: { name: 'Frostfang Alpha', hp: 400, v: 'wolf' },
    waves: [{ goblin: 3, wolf: 2 }, { goblin: 3, wolf: 3 }, { goblin: 3, wolf: 5 }] },
  { name: 'Winter Ruins', theme: 'winter', foe: 'Frozen skeletons', boss: { name: 'Ruin Guardian', hp: 550, v: 'skeleton' },
    waves: [{ skeleton: 3 }, { skeleton: 4, goblin: 3 }, { skeleton: 5, wolf: 2 }, { skeleton: 6, goblin: 4 }] },
  { name: 'Frozen Lake', theme: 'lake', foe: 'Yetis', boss: { name: 'Lake Colossus', hp: 750, v: 'golem' },
    waves: [{ wolf: 5, goblin: 3 }, { yeti: 1, wolf: 4 }, { yeti: 2, goblin: 5 }, { yeti: 2, wolf: 6 }] },
  { name: 'Blizzard Plains', theme: 'blizzard', foe: 'Ice wraiths', boss: { name: 'Storm Titan', hp: 1000, v: 'wraith' },
    waves: [{ wraith: 3, skeleton: 3 }, { wraith: 4, yeti: 1 }, { wraith: 4, skeleton: 4, wolf: 3 }, { wraith: 5, yeti: 2 }] },
  { name: 'Glacier Peak', theme: 'glacier', foe: 'Ice golems', boss: { name: 'Frost Colossus', hp: 1400, v: 'colossus' },
    waves: [{ golem: 1, skeleton: 4, wraith: 3 }, { golem: 1, yeti: 2, wolf: 5 }, { golem: 2, wraith: 4, skeleton: 4 }, { golem: 2, yeti: 2, wraith: 5, wolf: 4 }] },
];

const ENEMY_KINDS = {
  goblin: { hp: 60, speed: 85, dmg: 8, cd: 1000, touch: 35, rad: 16 },
  wolf: { hp: 45, speed: 150, dmg: 10, cd: 800, touch: 35, rad: 16 },
  skeleton: { hp: 90, speed: 95, dmg: 12, cd: 1100, touch: 40, rad: 16 },
  yeti: { hp: 220, speed: 55, dmg: 22, cd: 1800, touch: 50, rad: 24 },
  wraith: { hp: 70, speed: 115, dmg: 10, cd: 600, touch: 30, rad: 14 },
  golem: { hp: 320, speed: 40, dmg: 26, cd: 2200, touch: 60, rad: 30 },
  boss: { hp: 500, speed: 60, dmg: 18, cd: 1400, touch: 60, rad: 30 },
};
const BOSS_V = { yeti: { speed: 55 }, wolf: { speed: 115 }, skeleton: { speed: 70 }, golem: { speed: 45 }, wraith: { speed: 85 }, colossus: { speed: 60 } };

const stage = { idx: 0, wave: 0, phase: 'ready', msg: '', until: 0 };

function curStage() {
  return STAGES[stage.idx % STAGES.length];
}

function stagePayload() {
  const st = curStage();
  const lap = Math.floor(stage.idx / STAGES.length);
  return {
    idx: stage.idx,
    level: stage.idx + 1,
    total: STAGES.length,
    name: st.name + (lap > 0 ? ' (Endless ' + (lap + 1) + ')' : ''),
    theme: st.theme,
    foe: st.foe,
    wave: stage.wave,
    waves: st.waves.length,
    phase: stage.phase,
    msg: stage.msg,
    boss: stage.phase === 'boss' ? st.boss.name : '',
  };
}

function stageEmit() {
  io.emit('stage', stagePayload());
}

function farSpot() {
  let best = randomSpot();
  for (let i = 0; i < 20; i++) {
    const c = randomSpot();
    const near = Math.min(...Object.values(players).map((p) => Math.hypot(p.x - c.x, p.y - c.y)), 9999);
    if (near > 450) return c;
    best = c;
  }
  return best;
}

function stageScale() {
  const i = stage.idx;
  return {
    hp: 0.8 + 0.45 * i,
    dmg: 0.7 + 0.2 * i,
    speed: Math.min(1.6, 0.9 + 0.06 * i),
    cd: Math.max(0.55, 1.3 - 0.1 * i),
  };
}

function spawnKind(kind, hp, variant) {
  const k = ENEMY_KINDS[kind];
  const sc = stageScale();
  const id = 'e' + nextEnemyId++;
  let h = Math.round((hp || k.hp) * sc.hp);
  const v = variant || kind;
  const elite = kind !== 'boss' && Math.random() < Math.min(0.35, 0.05 + 0.04 * stage.idx);
  if (elite) h = Math.round(h * 2.2);
  const spd = (kind === 'boss' && BOSS_V[v] ? BOSS_V[v].speed : k.speed) * sc.speed * (elite ? 1.15 : 1);
  enemies[id] = {
    ...farSpot(), hp: h, maxHp: h, kind, v, elite,
    speed: spd, dmg: Math.round(k.dmg * sc.dmg * (elite ? 1.3 : 1)), cd: k.cd * sc.cd,
    touch: k.touch, rad: k.rad,
    lastHit: Date.now() + 800, slamAt: Date.now() + 5000, warned: false,
    windupEnd: 0, pendingShot: false, lastShot: Date.now() + 1500,
  };
}

function tickStages() {
  const ids = arenaIds();
  if (!ids.length) return;
  const now = Date.now();
  const st = curStage();
  const mult = 1 + 0.5 * (ids.length - 1);
  const alive = Object.keys(enemies).length;

  if (stage.phase === 'ready') {
    stage.phase = 'intermission';
    stage.until = now + 4000;
    stage.msg = 'Level ' + (stage.idx + 1) + ': ' + st.name + ' - ' + st.foe;
    stageEmit();
  } else if (stage.phase === 'intermission') {
    if (now < stage.until) return;
    if (stage.wave < st.waves.length) {
      const w = st.waves[stage.wave];
      stage.wave++;
      for (const kind in w) {
        const n = Math.round(w[kind] * mult);
        for (let i = 0; i < n; i++) spawnKind(kind);
      }
      stage.phase = 'wave';
      stage.waveStart = Date.now();
      stage.msg = 'WAVE ' + stage.wave;
    } else {
      spawnKind('boss', Math.round(st.boss.hp * (0.6 + 0.4 * ids.length)), st.boss.v);
      stage.phase = 'boss';
      stage.waveStart = Date.now();
      stage.msg = 'BOSS: ' + st.boss.name;
    }
    stageEmit();
  } else if (stage.phase === 'wave') {
    if (alive === 0) {
      stage.phase = 'intermission';
      stage.until = now + 5000;
      stage.msg = 'Wave cleared!';
      for (const hid of ids) {
        const pl = players[hid];
        pl.hp = Math.min(MAX_HP, pl.hp + 20);
        io.emit('hpUpdate', { id: hid, hp: pl.hp });
      }
      stageEmit();
    }
  } else if (stage.phase === 'boss') {
    if (alive === 0) {
      for (const id of ids) {
        players[id].score += 10;
        giveCoins(id, 50 * (stage.idx + 1));
        if (stage.idx % STAGES.length === STAGES.length - 1) giveCoins(id, 500);
        players[id].hp = MAX_HP;
        io.emit('hpUpdate', { id, hp: MAX_HP });
      }
      sendScoreboard();
      stage.idx++;
      stage.wave = 0;
      stage.phase = 'intermission';
      stage.until = now + 9000;
      const nx = curStage();
      stage.msg = (stage.idx % STAGES.length === 0 ? 'ALL LEVELS CLEARED! Endless mode: ' : 'LEVEL CLEARED! Next: ') + nx.name + ' (new: ' + nx.foe + ')';
      stageEmit();
    }
  }
}

function stageCheck() {
  tickStages();
}

setInterval(tickStages, 500);

setInterval(() => {
  const now = Date.now();
  for (const eid in enemies) {
    const e = enemies[eid];
    if (e.kind !== 'boss') continue;
    if (!arenaIds().length) {
      e.slamAt += 100;
      if (e.slamHit) e.slamHit += 100;
      continue;
    }
    if (!e.warned && now >= e.slamAt && anyNear(e, 320)) {
      e.warned = true;
      e.slamHit = now + 1000;
      e.sx = e.x;
      e.sy = e.y;
      io.emit('bossWarn', { x: Math.round(e.sx), y: Math.round(e.sy), r: 170 });
    } else if (e.warned && now >= e.slamHit) {
      e.warned = false;
      e.slamAt = now + 5000;
      io.emit('bossSlam', { x: Math.round(e.sx), y: Math.round(e.sy), r: 170 });
      for (const id in players) {
        const p = players[id];
        if (Math.hypot(p.x - e.sx, p.y - e.sy) <= 170) damagePlayer(id, Math.round(25 * (1 + 0.25 * stage.idx)), null);
      }
    }
  }
}, 100);


const SHOP = [
  { id: 'flame', price: 150, desc: 'Burning blade. 35 damage with a little more reach.' },
  { id: 'axe', price: 300, desc: 'Slow but crushing. 55 damage.' },
  { id: 'pistol', price: 400, desc: 'Shoots from a distance. 25 damage, fast.' },
  { id: 'rifle', price: 900, desc: 'Long-range power shot. 45 damage.' },
].map((it) => Object.assign({}, it, { name: WEAPONS[it.id].name }));

function walletPayload(p, extra) {
  return Object.assign({ coins: p.coins || 0, owned: p.owned || ['sword'] }, extra || {});
}

function giveCoins(id, amount, x, y) {
  const p = players[id];
  if (!p) return;
  p.coins = (p.coins || 0) + amount;
  io.to(id).emit('wallet', walletPayload(p, { gain: amount, x, y }));
}


function arenaIds() {
  return Object.keys(players).filter((id) => players[id].x < 3000 && !players[id].dead && !players[id].paused);
}

const NODES = {};
let nextNodeId = 1;
const MEA = { x0: 12000, w: 1400, h: 1000 };
function spawnNode() {
  const id = 'n' + nextNodeId++;
  NODES[id] = {
    id,
    x: Math.round(MEA.x0 + 140 + Math.random() * (MEA.w - 280)),
    y: Math.round(120 + Math.random() * (MEA.h - 240)),
    v: 8 + Math.floor(Math.random() * 15),
  };
  io.emit('nodeSpawn', NODES[id]);
}
for (let i = 0; i < 24; i++) spawnNode();

setInterval(() => {
  for (const nid in NODES) {
    const n = NODES[nid];
    for (const pid in players) {
      const p = players[pid];
      if (p.x < 11000) continue;
      if (Math.hypot(p.x - n.x, p.y - n.y) < 45) {
        delete NODES[nid];
        io.emit('nodeTaken', { id: nid, by: pid });
        if (typeof giveCoins === 'function') giveCoins(pid, n.v, n.x, n.y);
        else p.score += n.v;
        setTimeout(spawnNode, 20000);
        break;
      }
    }
  }
}, 150);


function checkWipe() {
  const inArena = Object.keys(players).filter((id) => players[id].x < 3000);
  if (inArena.length && inArena.every((id) => players[id].dead)) resetArena();
}

function resetArena() {
  for (const id in enemies) delete enemies[id];
  shots.length = 0;
  stage.idx = 0;
  stage.wave = 0;
  stage.phase = 'ready';
  stage.msg = '';
  stageEmit();
}

io.on('connection', (socket) => {
  players[socket.id] = {
    x: 6560 + Math.random() * 80,
    y: 880 + Math.random() * 80,
    color: Math.floor(Math.random() * 0xffffff),
    hp: MAX_HP,
    lastAttack: 0,
    weapon: 'sword',
    coins: 50,
    owned: ['sword'],
    look: { skin: 3, hair: 0, hairColor: 0, beard: 1, cloak: 0, armor: 0, crest: 0, sword: 0 },
    fx: 0,
    fy: 1,
    score: 0,
    name: cleanName(socket.handshake.auth && socket.handshake.auth.name, socket.id),
  };

  require('./chat')(io, socket, players);

  socket.emit('currentPlayers', players);
  socket.emit('stage', stagePayload());
  socket.emit('chests', chestList());
  socket.emit('nodes', Object.values(NODES));
  socket.emit('wallet', walletPayload(players[socket.id], { shop: SHOP }));
  socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });
  sendScoreboard();

  socket.on('move', (pos) => {
    const p = players[socket.id];
    if (!p || p.dead || !pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;
    const mdx = pos.x - p.x, mdy = pos.y - p.y;
    const len = Math.hypot(mdx, mdy);
    if (len > 0.5) { p.fx = mdx / len; p.fy = mdy / len; }
    p.x = pos.x;
    p.y = pos.y;
    socket.broadcast.emit('playerMoved', { id: socket.id, x: p.x, y: p.y, j: typeof pos.j === 'number' ? Math.min(Math.max(pos.j, 0), 3) : 0 });

    for (const cid in chests) {
      const c = chests[cid];
      if (Math.hypot(c.x - p.x, c.y - p.y) < 40) {
        delete chests[cid];
        const keys = ['flame', 'axe', 'pistol', 'rifle'];
        const key = keys[Math.floor(Math.random() * keys.length)];
        p.weapon = key;
        if (p.owned && !p.owned.includes(key)) p.owned.push(key);
        io.to(socket.id).emit('wallet', walletPayload(p));
        io.emit('chestOpened', { id: cid, by: p.name, weapon: key, name: WEAPONS[key].name, who: socket.id });
        io.emit('weaponUpdate', { id: socket.id, weapon: key });
        setTimeout(spawnChest, 45000);
      }
    }
  });

  socket.on('attack', (aim) => {
    const me = players[socket.id];
    if (me && aim && typeof aim.dx === 'number' && typeof aim.dy === 'number') {
      const al = Math.hypot(aim.dx, aim.dy);
      if (al > 0.1) {
        me.fx = aim.dx / al;
        me.fy = aim.dy / al;
      }
    }
    if (!me || me.dead) return;
    const w0 = WEAPONS[me.weapon] || WEAPONS.sword;
    const w = me.boostUntil && Date.now() < me.boostUntil ? Object.assign({}, w0, { dmg: Math.round(w0.dmg * 1.5) }) : w0;
    const now = Date.now();
    if (now - me.lastAttack < w.cd) return;
    me.lastAttack = now;

    if (w.type === 'gun') {
      const dx = me.fx, dy = me.fy;
      let tObs = w.range;
      for (const o of STAGE_OBS) {
        const t = rayCircle(me.x, me.y, dx, dy, o.x, o.y, o.r);
        if (t !== null && t < tObs) tObs = Math.max(t, 0);
      }
      let best = null;
      let bestT = tObs;
      for (const id in players) {
        if (id === socket.id) continue;
        const t = rayCircle(me.x, me.y, dx, dy, players[id].x, players[id].y, 22);
        if (t !== null && t < bestT) { best = { kind: 'p', id }; bestT = t; }
      }
      for (const eid in enemies) {
        const t = rayCircle(me.x, me.y, dx, dy, enemies[eid].x, enemies[eid].y, 22);
        if (t !== null && t < bestT) { best = { kind: 'e', id: eid }; bestT = t; }
      }
      io.emit('attackEffect', { id: socket.id, weapon: me.weapon, gun: true, ox: me.x, oy: me.y, ex: me.x + dx * bestT, ey: me.y + dy * bestT });
      if (best && best.kind === 'p') damagePlayer(best.id, w.dmg, socket.id);
      if (best && best.kind === 'e') hurtEnemy(best.id, w.dmg, me);
      return;
    }

    io.emit('attackEffect', { id: socket.id, weapon: me.weapon });
    for (const id in players) {
      if (id === socket.id) continue;
      const target = players[id];
      if (Math.hypot(target.x - me.x, target.y - me.y) <= w.range) damagePlayer(id, w.dmg, socket.id);
    }
    for (const eid in enemies) {
      const e = enemies[eid];
      if (Math.hypot(e.x - me.x, e.y - me.y) <= w.range) hurtEnemy(eid, w.dmg, me);
    }
  });

  socket.on('roll', () => {
    const p = players[socket.id];
    if (!p) return;
    const now = Date.now();
    if (now < (p.rollCool || 0)) return;
    p.rollCool = now + 900;
    p.rollUntil = now + 450;
    p.rollStart = now;
    io.emit('roll', { id: socket.id });
  });

  socket.on('look', (l) => {
    const p = players[socket.id];
    if (!p || !l || typeof l !== 'object') return;
    const lim = { skin: 6, hair: 5, hairColor: 6, beard: 3, cloak: 8, armor: 5, crest: 5, sword: 3 };
    const out = {};
    for (const k in lim) out[k] = Math.min(Math.max(parseInt(l[k], 10) || 0, 0), lim[k] - 1);
    p.look = out;
    io.emit('lookUpdate', { id: socket.id, look: out });
    if (p.weapon && p.weapon !== 'sword') io.emit('weaponUpdate', { id: socket.id, weapon: p.weapon });
  });

  socket.on('buy', (itemId) => {
    const p = players[socket.id];
    const item = SHOP.find((it) => it.id === itemId);
    if (!p || !item) return;
    p.owned = p.owned || ['sword'];
    if (p.owned.includes(item.id)) {
      socket.emit('shopResult', { ok: false, msg: 'You already own the ' + item.name + '.' });
      return;
    }
    if ((p.coins || 0) < item.price) {
      socket.emit('shopResult', { ok: false, msg: 'Not enough coins for the ' + item.name + '.' });
      return;
    }
    p.coins -= item.price;
    p.owned.push(item.id);
    p.weapon = item.id;
    socket.emit('wallet', walletPayload(p));
    socket.emit('shopResult', { ok: true, msg: 'You bought the ' + item.name + '!' });
    io.emit('weaponUpdate', { id: socket.id, weapon: item.id });
  });

  socket.on('equip', (itemId) => {
    const p = players[socket.id];
    if (!p || typeof itemId !== 'string') return;
    if (!(p.owned || ['sword']).includes(itemId)) return;
    p.weapon = itemId;
    io.emit('weaponUpdate', { id: socket.id, weapon: itemId });
  });

  socket.on('pause', (on) => {
    const p = players[socket.id];
    if (!p) return;
    p.paused = !!on;
  });

  socket.on('restart', (where) => {
    const p = players[socket.id];
    if (!p || !p.dead) return;
    if (where === 'village') {
      p.x = 6560 + Math.random() * 80;
      p.y = 880 + Math.random() * 80;
    } else {
      const others = Object.keys(players).filter((id) => id !== socket.id && players[id].x < 3000 && !players[id].dead);
      if (!others.length) resetArena();
      p.x = 800 + (Math.random() - 0.5) * 120;
      p.y = 230;
    }
    p.dead = false;
    p.paused = false;
    p.hp = MAX_HP;
    p.score = 0;
    p.combo = 0;
    io.emit('playerRespawn', { id: socket.id, x: p.x, y: p.y, hp: p.hp });
    sendScoreboard();
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
    sendScoreboard();
  });
});

server.listen(process.env.PORT || 3000, () => console.log('Game running at http://localhost:3000'));
