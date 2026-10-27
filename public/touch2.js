if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  const makeBtn = (label, right, bottom, size, color, onPress) => {
    const b = document.createElement('div');
    b.textContent = label;
    b.style.cssText = 'position:fixed;right:' + right + 'px;bottom:' + bottom + 'px;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';border:2px solid rgba(255,255,255,.5);color:#fff;font:bold 13px sans-serif;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none;z-index:4;';
    b.addEventListener('touchstart', (e) => { e.preventDefault(); onPress(); }, { passive: false });
    document.body.appendChild(b);
  };
  makeBtn('JUMP', 145, 60, 80, 'rgba(60,140,220,.6)', () => { window.touchJump = true; });
  makeBtn('ROLL', 50, 160, 80, 'rgba(90,190,90,.6)', () => { window.touchRoll = true; });
}
