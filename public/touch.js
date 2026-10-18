if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  window.touchDir = { x: 0, y: 0 };

  const chat = document.getElementById('chat');
  if (chat) { chat.style.top = '10px'; chat.style.bottom = 'auto'; }

  const base = document.createElement('div');
  base.style.cssText = 'position:fixed;left:30px;bottom:30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.35);touch-action:none;';
  const knob = document.createElement('div');
  knob.style.cssText = 'position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.5);';
  base.appendChild(knob);
  document.body.appendChild(base);

  const R = 35;
  let activeId = null;

  function updateStick(t) {
    const r = base.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2);
    let dy = t.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.left = (35 + dx) + 'px';
    knob.style.top = (35 + dy) + 'px';
    window.touchDir = { x: dx / R, y: dy / R };
  }

  function resetStick() {
    activeId = null;
    knob.style.left = '35px';
    knob.style.top = '35px';
    window.touchDir = { x: 0, y: 0 };
  }

  base.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    activeId = t.identifier;
    updateStick(t);
  }, { passive: false });

  base.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === activeId) updateStick(t);
  }, { passive: false });

  const endTouch = (e) => {
    for (const t of e.changedTouches) if (t.identifier === activeId) resetStick();
  };
  base.addEventListener('touchend', endTouch);
  base.addEventListener('touchcancel', endTouch);

  const btn = document.createElement('div');
  btn.textContent = 'ATTACK';
  btn.style.cssText = 'position:fixed;right:30px;bottom:40px;width:100px;height:100px;border-radius:50%;background:rgba(220,60,60,.6);border:2px solid rgba(255,255,255,.5);color:#fff;font:bold 14px sans-serif;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none;';
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    socket.emit('attack');
  }, { passive: false });
  document.body.appendChild(btn);
}
