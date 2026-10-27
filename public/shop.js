export function initShop(G) {
  const { socket } = G;
  const ORDER = ['sword', 'flame', 'axe', 'pistol', 'rifle'];
  const wallet = { coins: 0, owned: ['sword'], weapon: 'sword' };
  let shop = [];
  let isOpen = false;

  const mk = (css) => {
    const el = document.createElement('div');
    el.style.cssText = css;
    document.body.appendChild(el);
    return el;
  };
  const btn = mk('position:fixed;top:445px;right:10px;background:rgba(0,0,0,.55);color:#ffd36b;font:bold 13px sans-serif;padding:5px 9px;border-radius:6px;z-index:6;cursor:pointer;user-select:none;');
  const pop = mk('position:fixed;top:182px;left:50%;transform:translateX(-50%);color:#ffd36b;font:bold 20px sans-serif;text-shadow:0 2px 4px #000;z-index:7;pointer-events:none;opacity:0;transition:opacity .25s;');
  const panel = mk('position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(5,8,14,.78);z-index:20;display:none;align-items:center;justify-content:center;');
  const card = document.createElement('div');
  card.style.cssText = 'width:min(460px,94vw);max-height:90vh;overflow:auto;background:#12161f;border:1px solid #3a4258;border-radius:12px;padding:16px;color:#fff;font:14px sans-serif;';
  panel.appendChild(card);
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
  const title = document.createElement('div');
  title.style.cssText = 'font:bold 18px sans-serif;color:#ffd36b;';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'padding:6px 12px;border-radius:8px;border:0;background:#3a4258;color:#fff;cursor:pointer;font:13px sans-serif;';
  head.appendChild(title);
  head.appendChild(closeBtn);
  const msg = document.createElement('div');
  msg.style.cssText = 'min-height:18px;margin:4px 0 6px;color:#9fd8ff;font-size:13px;';
  const list = document.createElement('div');
  card.appendChild(head);
  card.appendChild(msg);
  card.appendChild(list);

  let popTimer = 0;
  function popup(t) {
    pop.textContent = t;
    pop.style.opacity = '1';
    clearTimeout(popTimer);
    popTimer = setTimeout(() => { pop.style.opacity = '0'; }, 1300);
  }
  function refreshBtn() {
    btn.textContent = '\u{1F4B0} ' + wallet.coins + ' \u00B7 Shop [B]';
  }

  function render() {
    title.textContent = 'Weapon shop \u00B7 \u{1F4B0} ' + wallet.coins;
    list.textContent = '';
    const items = [{ id: 'sword', name: 'Sword', price: 0, desc: 'Your starter weapon. Fast, short range.' }].concat(shop);
    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;justify-content:space-between;padding:8px 0;border-top:1px solid #2a3144;';
      const left = document.createElement('div');
      const nm = document.createElement('div');
      nm.textContent = (i + 1) + '. ' + it.name + (it.price ? '  \u00B7  ' + it.price + ' coins' : '');
      nm.style.fontWeight = 'bold';
      const ds = document.createElement('div');
      ds.textContent = it.desc;
      ds.style.cssText = 'font-size:12px;color:#9aa6c0;';
      left.appendChild(nm);
      left.appendChild(ds);
      const b = document.createElement('button');
      b.style.cssText = 'padding:6px 12px;border-radius:8px;border:0;color:#fff;font:bold 13px sans-serif;min-width:120px;cursor:pointer;';
      const owned = wallet.owned.includes(it.id);
      if (wallet.weapon === it.id) {
        b.textContent = 'Equipped';
        b.style.background = '#2e7d32';
        b.disabled = true;
      } else if (owned) {
        b.textContent = 'Equip';
        b.style.background = '#3a5a9a';
        b.addEventListener('click', () => { socket.emit('equip', it.id); b.blur(); });
      } else if (wallet.coins >= it.price) {
        b.textContent = 'Buy for ' + it.price;
        b.style.background = '#b8860b';
        b.addEventListener('click', () => { socket.emit('buy', it.id); b.blur(); });
      } else {
        b.textContent = 'Need ' + (it.price - wallet.coins) + ' more';
        b.style.background = '#444a58';
        b.disabled = true;
      }
      row.appendChild(left);
      row.appendChild(b);
      list.appendChild(row);
    });
  }

  socket.on('wallet', (d) => {
    if (typeof d.coins === 'number') wallet.coins = d.coins;
    if (d.owned) wallet.owned = d.owned;
    if (d.shop) shop = d.shop;
    if (d.gain) popup('+' + d.gain + ' \u{1F4B0}');
    refreshBtn();
    if (isOpen) render();
  });
  socket.on('shopResult', (d) => { msg.textContent = d.msg || ''; });
  socket.on('weaponUpdate', (d) => {
    if (d.id !== socket.id) return;
    wallet.weapon = d.weapon;
    if (isOpen) render();
  });

  function open() {
    if (window.MY_ZONE && window.MY_ZONE !== 'hub') {
      popup('Visit the village market to trade');
      return;
    }
    isOpen = true;
    panel.style.display = 'flex';
    msg.textContent = 'Earn coins by defeating monsters and bosses.';
    render();
  }
  function close() {
    isOpen = false;
    panel.style.display = 'none';
  }
  btn.addEventListener('click', () => { if (isOpen) close(); else open(); });
  closeBtn.addEventListener('click', close);
  panel.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.code === 'Escape' || e.code === 'KeyB') close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyB') { if (isOpen) close(); else open(); return; }
    if (e.code === 'Escape' && isOpen) { close(); return; }
    const m = /^Digit([1-5])$/.exec(e.code);
    if (m) {
      const id = ORDER[Number(m[1]) - 1];
      if (wallet.owned.includes(id)) socket.emit('equip', id);
    }
  });
  window.openShop = open;
  refreshBtn();
}
