let myName = (prompt('Choose your player name (max 12 letters):') || '').trim().slice(0, 12);

const socket = io({ autoConnect: false, auth: { name: myName } });
const others = {};
const enemyObjs = {};

class MainScene extends Phaser.Scene {
  preload() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xffffff);
    g.fillRoundedRect(2, 2, 36, 36, 12);
    g.fillStyle(0x000000);
    g.fillCircle(14, 16, 4);
    g.fillCircle(26, 16, 4);
    g.fillRect(14, 27, 12, 3);
    g.generateTexture('player', 40, 40);
    g.clear();

    g.fillStyle(0xaa2bd6);
    g.fillCircle(22, 26, 16);
    g.fillTriangle(10, 14, 13, 2, 19, 12);
    g.fillTriangle(18, 10, 22, 0, 26, 10);
    g.fillTriangle(25, 12, 31, 2, 34, 14);
    g.fillStyle(0xffffff);
    g.fillCircle(16, 25, 5);
    g.fillCircle(28, 25, 5);
    g.fillStyle(0x000000);
    g.fillCircle(16, 26, 2);
    g.fillCircle(28, 26, 2);
    g.lineStyle(3, 0x000000);
    g.lineBetween(9, 17, 19, 21);
    g.lineBetween(35, 17, 25, 21);
    g.generateTexture('enemy', 44, 44);
    g.clear();

    g.fillStyle(0x2f6b3a);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x3a7d46);
    g.fillRect(6, 8, 10, 6);
    g.fillRect(38, 20, 12, 6);
    g.fillRect(18, 44, 10, 6);
    g.fillRect(50, 52, 8, 5);
    g.generateTexture('grass', 64, 64);
    g.destroy();
  }

  create() {
    this.add.tileSprite(400, 300, 800, 600, 'grass');

    this.me = null;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.space = this.input.keyboard.addKey('SPACE');
    this.bars = this.add.graphics().setDepth(10);

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
          enemyObjs[en.id] = this.add.image(en.x, en.y, 'enemy');
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
    const r = this.add.image(p.x, p.y, 'player').setTint(p.color);
    r.hp = p.hp;
    r.label = this.add.text(p.x, p.y - 50, p.name, {
      fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);
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
