(function () {
  if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) return;
  const R = 62;
  window.touchDir = { x: 0, y: 0 };
  window.touchAim = { x: 0, y: 0, m: 0 };
  window.touchCam = 0;
  document.body.style.touchAction = 'none';
  document.documentElement.style.touchAction = 'none';
  const chat = document.getElementById('chat');
  if (chat) {
    chat.style.top = '10px';
    chat.style.bottom = 'auto';
  }

  const Ls = { id: null, ox: 0, oy: 0 };
  const Rs = { id: null, ox: 0, oy: 0, t0: 0, moved: 0 };

  function makeStick(color, label) {
    const base = document.createElement('div');
    base.style.cssText = 'position:fixed;width:' + R * 2 + 'px;height:' + R * 2 + 'px;border-radius:50%;border:2px solid ' + color + ';background:rgba(255,255,255,.08);z-index:4;pointer-events:none;opacity:.35;';
    const knob = document.createElement('div');
    knob.style.cssText = 'position:absolute;left:' + (R - 28) + 'px;top:' + (R - 28) + 'px;width:56px;height:56px;border-radius:50%;background:' + color + ';opacity:.7;';
    const tag = document.createElement('div');
    tag.textContent = label;
    tag.style.cssText = 'position:absolute;left:0;right:0;top:' + (R * 2 + 4) + 'px;text-align:center;color:#fff;font:bold 11px sans-serif;text-shadow:0 1px 3px #000;';
    base.appendChild(knob);
    base.appendChild(tag);
    document.body.appendChild(base);
    return { base, knob };
  }
  const left = makeStick('rgba(255,255,255,.9)', 'MOVE');
  const right = makeStick('rgba(255,120,100,.95)', 'AIM + ATTACK');
  function place(st, x, y) {
    st.base.style.left = x - R + 'px';
    st.base.style.top = y - R + 'px';
  }
  function setKnob(st, dx, dy) {
    st.knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }
  const idleLeft = () => place(left, R + 34, window.innerHeight - R - 92);
  const idleRight = () => place(right, window.innerWidth - R - 34, window.innerHeight - R - 92);
  idleLeft();
  idleRight();
  window.addEventListener('resize', () => {
    if (Ls.id === null) idleLeft();
    if (Rs.id === null) idleRight();
  });

  function isGameCanvas(el) {
    return !!el && el.tagName === 'CANVAS' && el.parentNode === document.body && getComputedStyle(el).pointerEvents !== 'none';
  }

  document.addEventListener('touchstart', (e) => {
    if (!isGameCanvas(e.target)) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.clientX < window.innerWidth * 0.5) {
        if (Ls.id === null) {
          Ls.id = t.identifier;
          Ls.ox = t.clientX;
          Ls.oy = t.clientY;
          place(left, t.clientX, t.clientY);
          setKnob(left, 0, 0);
          left.base.style.opacity = '0.85';
        }
      } else if (Rs.id === null) {
        Rs.id = t.identifier;
        Rs.ox = t.clientX;
        Rs.oy = t.clientY;
        Rs.t0 = performance.now();
        Rs.moved = 0;
        place(right, t.clientX, t.clientY);
        setKnob(right, 0, 0);
        right.base.style.opacity = '0.85';
      }
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    let used = false;
    for (const t of e.changedTouches) {
      if (t.identifier === Ls.id) {
        used = true;
        const dx = t.clientX - Ls.ox, dy = t.clientY - Ls.oy;
        const len = Math.hypot(dx, dy) || 1;
        const m = Math.min(len / R, 1);
        window.touchDir = { x: (dx / len) * m, y: (dy / len) * m };
        setKnob(left, (dx / len) * m * R, (dy / len) * m * R);
      } else if (t.identifier === Rs.id) {
        used = true;
        const dx = t.clientX - Rs.ox, dy = t.clientY - Rs.oy;
        const len = Math.hypot(dx, dy) || 1;
        const m = Math.min(len / R, 1);
        Rs.moved = Math.max(Rs.moved, len);
        window.touchAim = { x: dx / len, y: dy / len, m };
        setKnob(right, (dx / len) * m * R, (dy / len) * m * R);
      }
    }
    if (used) e.preventDefault();
  }, { passive: false });

  function finish(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === Ls.id) {
        Ls.id = null;
        window.touchDir = { x: 0, y: 0 };
        setKnob(left, 0, 0);
        left.base.style.opacity = '0.35';
        idleLeft();
      } else if (t.identifier === Rs.id) {
        const tap = performance.now() - Rs.t0 < 240 && Rs.moved < 14;
        Rs.id = null;
        window.touchAim = { x: 0, y: 0, m: 0 };
        setKnob(right, 0, 0);
        right.base.style.opacity = '0.35';
        idleRight();
        if (tap && window.socket) window.socket.emit('attack');
      }
    }
  }
  document.addEventListener('touchend', finish);
  document.addEventListener('touchcancel', finish);

  function makeBtn(label, css, onDown, onUp) {
    const b = document.createElement('div');
    b.textContent = label;
    b.style.cssText = 'position:fixed;width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,.5);color:#fff;font:bold 13px sans-serif;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none;z-index:8;' + css;
    b.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onDown();
      b.style.opacity = '0.6';
    }, { passive: false });
    const up = (e) => {
      e.preventDefault();
      if (onUp) onUp();
      b.style.opacity = '1';
    };
    b.addEventListener('touchend', up);
    b.addEventListener('touchcancel', up);
    document.body.appendChild(b);
  }
  makeBtn('JUMP', 'right:22px;bottom:250px;background:rgba(60,140,220,.6);', () => { window.touchJump = true; });
  makeBtn('ROLL', 'right:22px;bottom:330px;background:rgba(90,190,90,.6);', () => { window.touchRoll = true; });
  makeBtn('\u21BA', 'left:calc(50% - 110px);bottom:6px;width:40px;height:40px;font-size:20px;background:rgba(0,0,0,.55);', () => { window.touchCam = 1; }, () => { window.touchCam = 0; });
  makeBtn('\u21BB', 'left:calc(50% + 70px);bottom:6px;width:40px;height:40px;font-size:20px;background:rgba(0,0,0,.55);', () => { window.touchCam = -1; }, () => { window.touchCam = 0; });

  const hint = document.createElement('div');
  hint.textContent = 'Left thumb: move  \u00B7  Right thumb: aim and attack (a quick tap swings)';
  hint.style.cssText = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);max-width:90vw;background:rgba(0,0,0,.7);color:#fff;font:13px sans-serif;padding:6px 12px;border-radius:8px;z-index:9;pointer-events:none;text-align:center;transition:opacity .6s;';
  document.body.appendChild(hint);
  setTimeout(() => { hint.style.opacity = '0'; }, 7000);
})();
