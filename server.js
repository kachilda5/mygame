const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use('/phaser', express.static('node_modules/phaser/dist'));

const players = {};
const enemies = {};
let nextEnemyId = 1;

const MAX_HP = 100;
const ATTACK_RANGE = 90;
const ATTACK_DAMAGE = 20;
const ATTACK_COOLDOWN = 400;

const ENEMY_COUNT = 3;
const ENEMY_HP = 60;
const ENEMY_SPEED = 70;
const ENEMY_DAMAGE = 10;
const ENEMY_COOLDOWN = 1000;
const ENEMY_TOUCH = 35;

function randomSpot() {
  return { x: 100 + Math.random() * 600, y: 100 + Math.random() * 400 };
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

for (let i = 0; i < ENEMY_COUNT; i++) spawnEnemy();

function damagePlayer(id, amount, attackerId) {
  const t = players[id];
  if (!t) return;
  t.hp -= amount;
  if (t.hp <= 0) {
    Object.assign(t, randomSpot());
    t.hp = MAX_HP;
    if (attackerId && attackerId !== id && players[attackerId]) {
      players[attackerId].score += 5;
      sendScoreboard();
    }
    io.emit('playerRespawn', { id, x: t.x, y: t.y, hp: t.hp });
  } else {
    io.emit('hpUpdate', { id, hp: t.hp });
  }
}

setInterval(() => {
  const dt = 0.05;
  const now = Date.now();
  const ids = Object.keys(players);

  for (const eid in enemies) {
    const e = enemies[eid];
    if (!ids.length) continue;

    let nearestId = null;
    let nearestDist = Infinity;
    for (const pid of ids) {
      const d = Math.hypot(players[pid].x - e.x, players[pid].y - e.y);
      if (d < nearestDist) { nearestDist = d; nearestId = pid; }
    }

    if (nearestDist > ENEMY_TOUCH) {
      const p = players[nearestId];
      e.x += ((p.x - e.x) / nearestDist) * ENEMY_SPEED * dt;
      e.y += ((p.y - e.y) / nearestDist) * ENEMY_SPEED * dt;
    } else if (now - e.lastHit >= ENEMY_COOLDOWN) {
      e.lastHit = now;
      damagePlayer(nearestId, ENEMY_DAMAGE, null);
    }
  }

  io.emit('enemies', Object.entries(enemies).map(([id, e]) => ({
    id, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp,
  })));
}, 50);

io.on('connection', (socket) => {
  players[socket.id] = {
    ...randomSpot(),
    color: Math.floor(Math.random() * 0xffffff),
    hp: MAX_HP,
    lastAttack: 0,
    score: 0,
    name: cleanName(socket.handshake.auth && socket.handshake.auth.name, socket.id),
  };

  require('./chat')(io, socket, players);

  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });
  sendScoreboard();

  socket.on('move', (pos) => {
    const p = players[socket.id];
    if (!p) return;
    p.x = pos.x;
    p.y = pos.y;
    socket.broadcast.emit('playerMoved', { id: socket.id, x: p.x, y: p.y });
  });

  socket.on('attack', () => {
    const me = players[socket.id];
    if (!me) return;
    const now = Date.now();
    if (now - me.lastAttack < ATTACK_COOLDOWN) return;
    me.lastAttack = now;

    io.emit('attackEffect', { id: socket.id });

    for (const id in players) {
      if (id === socket.id) continue;
      const target = players[id];
      const dist = Math.hypot(target.x - me.x, target.y - me.y);
      if (dist <= ATTACK_RANGE) damagePlayer(id, ATTACK_DAMAGE, socket.id);
    }

    for (const eid in enemies) {
      const e = enemies[eid];
      const dist = Math.hypot(e.x - me.x, e.y - me.y);
      if (dist <= ATTACK_RANGE) {
        e.hp -= ATTACK_DAMAGE;
        if (e.hp <= 0) {
          delete enemies[eid];
          me.score += 1;
          sendScoreboard();
          setTimeout(spawnEnemy, 3000);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
    sendScoreboard();
  });
});

server.listen(3000, () => console.log('Game running at http://localhost:3000'));
