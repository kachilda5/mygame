const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use('/phaser', express.static('node_modules/phaser/dist'));

const players = {};
const MAX_HP = 100;
const ATTACK_RANGE = 90;
const ATTACK_DAMAGE = 20;
const ATTACK_COOLDOWN = 400;

function randomSpot() {
  return { x: 100 + Math.random() * 600, y: 100 + Math.random() * 400 };
}

io.on('connection', (socket) => {
  players[socket.id] = {
    ...randomSpot(),
    color: Math.floor(Math.random() * 0xffffff),
    hp: MAX_HP,
    lastAttack: 0,
  };

  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

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
      if (dist <= ATTACK_RANGE) {
        target.hp -= ATTACK_DAMAGE;
        if (target.hp <= 0) {
          Object.assign(target, randomSpot());
          target.hp = MAX_HP;
          io.emit('playerRespawn', { id, x: target.x, y: target.y, hp: target.hp });
        } else {
          io.emit('hpUpdate', { id, hp: target.hp });
        }
      }
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

server.listen(3000, () => console.log('Game running at http://localhost:3000'));
