let myName = (prompt('Choose your player name (max 12 letters):') || '').trim().slice(0, 12);

const socket = io({ autoConnect: false, auth: { name: myName } });
const others = {};
const enemyObjs = {};

class MainScene extends Phaser.Scene {
  create() {
    this.me = null;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.space = this.input.keyboard.addKey('SPACE');
    this.bars = this.add.graphics();

    this.input.on('pointerdown', () => socket.emit('attack'));

    socket.on('currentPlayers', (players) => {
      for (const id in players) {
        if (id === socket.id) this.me = this.addPlayer(players[id]);
        else others[id] = this.addPlayer(players[id]);
      }
    });
    socket.on('newPlayer', (p) => { others[p.id] = this.addPlayer(p); });
    socket.on('playerMoved', (p) => {
      if (others[p.id]) others[p.id].setPosition(p.x, p.y);
    });
    socket.on('playerLeft', (id) => {
      if (others[id]) {
        others[id].label.destroy();
        others[id].destroy();
        delete others[id];
      }
    });
    socket.on('hpUpdate', (d) => {
      const e = this.getEntity(d.id);
      if (e) e.hp = d.hp;
    });
    socket.on('playerRespawn', (d) => {
      const e = this.getEntity(d.id);
      if (e) { e.setPosition(d.x, d.y); e.hp = d.hp; }
    });
    socket.on('attackEffect', (d) => {
      const e = this.getEntity(d.id);
      if (!e) return;
      const ring = this.add.circle(e.x, e.y, 90).setStrokeStyle(3, 0xffffff);
      this.tweens.add({
        targets: ring, alpha: 0, duration: 250,
        onComplete: () => ring.destroy(),
      });
    });
    socket.on('enemies', (list) => {
      const seen = {};
      for (const en of list) {
        seen[en.id] = true;
        if (!enemyObjs[en.id]) {
          enemyObjs[en.id] = this.add.rectangle(en.x, en.y, 36, 36, 0xff4444);
        }
        enemyObjs[en.id].setPosition(en.x, en.y);
        enemyObjs[en.id].hp = en.hp;
      }
      for (const id in enemyObjs) {
        if (!seen[id]) { enemyObjs[id].destroy(); delete enemyObjs[id]; }
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

    socket.connect();
  }

  getEntity(id) {
    return id === socket.id ? this.me : others[id];
  }

  addPlayer(p) {
    const r = this.add.rectangle(p.x, p.y, 40, 40, p.color);
    r.hp = p.hp;
    r.label = this.add.text(p.x, p.y - 50, p.name, {
      fontSize: '13px', color: '#ffffff',
    }).setOrigin(0.5);
    return r;
  }

  drawBar(e, max) {
    this.bars.fillStyle(0x550000);
    this.bars.fillRect(e.x - 20, e.y - 35, 40, 6);
    this.bars.fillStyle(0x33dd33);
    this.bars.fillRect(e.x - 20, e.y - 35, 40 * Math.max(e.hp, 0) / max, 6);
  }

  update(time, delta) {
    if (!this.me) return;

    const speed = 250 * (delta / 1000);
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
    if (window.touchDir) { dx += window.touchDir.x; dy += window.touchDir.y; }

    if (dx || dy) {
      this.me.x = Phaser.Math.Clamp(this.me.x + dx * speed, 20, 780);
      this.me.y = Phaser.Math.Clamp(this.me.y + dy * speed, 20, 580);
      socket.emit('move', { x: this.me.x, y: this.me.y });
    }

    if (Phaser.Input.Keyboard.JustDown(this.space)) socket.emit('attack');

    this.bars.clear();
    this.drawBar(this.me, 100);
    this.me.label.setPosition(this.me.x, this.me.y - 50);
    for (const id in others) {
      this.drawBar(others[id], 100);
      others[id].label.setPosition(others[id].x, others[id].y - 50);
    }
    for (const id in enemyObjs) this.drawBar(enemyObjs[id], 60);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d1f2b',
  scene: MainScene,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
