export function initRun(G) {
  const { socket, getEntity } = G;
  let dead = false, paused = false;
  const block = () => { window.GAME_BLOCK = dead || paused; };
  const rawEmit = socket.emit.bind(socket);
  socket.emit = (ev, ...args) => {
    if (window.GAME_BLOCK && (ev === 'attack' || ev === 'roll')) return socket;
    return rawEmit(ev, ...args);
  };

  const mk = (css) => {
    const el = document.createElement('div');
    el.style.cssText = css;
    document.body.appendChild(el);
    return el;
  };
  const btnCss = 'padding:10px 20px;border-radius:10px;border:0;color:#fff;font:bold 16px sans-serif;cursor:pointer;margin:6px;';

  const hpBox = mk('position:fixed;bottom:44px;left:50%;transform:translateX(-50%);width:min(240px,50vw);height:16px;background:rgba(60,0,0,.8);border:1px solid #ff6a6a;border-radius:8px;overflow:hidden;z-index:6;');
  const hpFill = document.createElement('div');
  hpFill.style.cssText = 'height:100%;width:100%;background:linear-gradient(#ff5a5a,#b01c1c);transition:width .15s;';
  const hpText = document.createElement('div');
  hpText.style.cssText = 'position:absolute;top:0;left:0;right:0;text-align:center;font:bold 11px/16px sans-serif;color:#fff;text-shadow:0 1px 2px #000;';
  hpBox.appendChild(hpFill);
  hpBox.appendChild(hpText);
  function setHp(v) {
    const x = Math.max(0, Math.min(100, v));
    hpFill.style.width = x + '%';
    hpText.textContent = 'HP ' + Math.round(x) + '/100';
  }
  setHp(100);

  const over = mk('position:fixed;top:0;left:0;right:0;bottom:0;background:radial-gradient(rgba(70,0,0,.55),rgba(0,0,0,.93));z-index:30;display:none;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;text-align:center;');
  const overTitle = document.createElement('div');
  overTitle.textContent = 'GAME OVER';
  overTitle.style.cssText = 'font:bold 60px sans-serif;color:#ff5a5a;text-shadow:0 4px 18px #000;';
  const overInfo = document.createElement('div');
  overInfo.style.cssText = 'font:18px/1.7 sans-serif;margin:14px 0;color:#ffe9a8;';
  const row = document.createElement('div');
  const again = document.createElement('button');
  again.textContent = 'Play again';
  again.style.cssText = btnCss + 'background:#2e7d32;';
  const home = document.createElement('button');
  home.textContent = 'Back to village';
  home.style.cssText = btnCss + 'background:#3a5a9a;';
  row.appendChild(again);
  row.appendChild(home);
  over.appendChild(overTitle);
  over.appendChild(overInfo);
  over.appendChild(row);

  const pauseEl = mk('position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(5,8,14,.78);z-index:25;display:none;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;text-align:center;');
  const pTitle = document.createElement('div');
  pTitle.textContent = 'PAUSED';
  pTitle.style.cssText = 'font:bold 48px sans-serif;color:#9fd8ff;';
  const pInfo = document.createElement('div');
  pInfo.textContent = 'Monsters ignore you while you are paused.';
  pInfo.style.cssText = 'font:15px sans-serif;margin:10px 0 16px;color:#b8c4dc;';
  const resume = document.createElement('button');
  resume.textContent = 'Resume';
  resume.style.cssText = btnCss + 'background:#2e7d32;';
  pauseEl.appendChild(pTitle);
  pauseEl.appendChild(pInfo);
  pauseEl.appendChild(resume);

  const pbtn = mk('position:fixed;bottom:8px;left:50%;transform:translateX(-50%);width:36px;height:30px;line-height:30px;text-align:center;background:rgba(0,0,0,.6);color:#fff;border-radius:8px;font:16px sans-serif;z-index:6;cursor:pointer;user-select:none;');
  pbtn.textContent = '\u23F8';

  function setPaused(on) {
    if (dead) return;
    paused = on;
    rawEmit('pause', on);
    pauseEl.style.display = on ? 'flex' : 'none';
    pbtn.textContent = on ? '\u25B6' : '\u23F8';
    block();
  }
  pbtn.addEventListener('click', () => setPaused(!paused));
  resume.addEventListener('click', () => setPaused(false));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' && !e.repeat) setPaused(!paused);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !paused && !dead) setPaused(true);
  });

  again.addEventListener('click', () => rawEmit('restart', 'arena'));
  home.addEventListener('click', () => rawEmit('restart', 'village'));

  socket.on('hpUpdate', (d) => { if (d.id === socket.id) setHp(d.hp); });
  socket.on('gameOver', (d) => {
    dead = true;
    paused = false;
    pauseEl.style.display = 'none';
    let best = 0;
    try { best = Number(localStorage.getItem('bestLevel')) || 0; } catch (e) { best = 0; }
    if (d.level > best) {
      best = d.level;
      try { localStorage.setItem('bestLevel', String(best)); } catch (e) { /* ignore */ }
    }
    overInfo.textContent = '';
    ['You reached Level ' + d.level, 'Score: ' + d.score, 'Coins kept: ' + d.coins, 'Your best: Level ' + best].forEach((t) => {
      const l = document.createElement('div');
      l.textContent = t;
      overInfo.appendChild(l);
    });
    over.style.display = 'flex';
    block();
  });
  socket.on('playerDown', (d) => {
    const e = getEntity(d.id);
    if (e) e.group.visible = false;
  });
  socket.on('playerRespawn', (d) => {
    const e = getEntity(d.id);
    if (e) e.group.visible = true;
    if (d.id === socket.id) {
      dead = false;
      over.style.display = 'none';
      setHp(d.hp);
      block();
    }
  });
}
