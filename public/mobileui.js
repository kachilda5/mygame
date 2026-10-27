(function () {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch && window.innerWidth > 700) return;
  window.TOUCH = true;

  const css = document.createElement('style');
  css.textContent = [
    '#chat{display:none !important;}',
    'body.chat-open #chat{display:block !important;position:fixed !important;top:54px !important;left:8px !important;bottom:auto !important;width:min(330px,86vw) !important;z-index:20 !important;}',
    '[style*="top: 30%"] > div:first-child{font-size:24px !important;}',
    '[style*="top: 30%"] > div:last-child{font-size:13px !important;}',
    '[style*="top: 22%"]{font-size:22px !important;}',
    '[style*="top: 36%"]{font-size:24px !important;}',
  ].join('\n');
  document.head.appendChild(css);

  function mk(text, cssText) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = cssText;
    el.dataset.m = '1';
    document.body.appendChild(el);
    return el;
  }
  const BASE = 'position:fixed;z-index:16;background:rgba(0,0,0,.65);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:10px;font:20px sans-serif;display:flex;align-items:center;justify-content:center;user-select:none;cursor:pointer;';
  const menuBtn = mk('\u2630', BASE + 'top:8px;right:8px;width:42px;height:42px;');
  const chatBtn = mk('\u{1F4AC}', BASE + 'top:8px;left:8px;width:42px;height:42px;');
  const badge = document.createElement('span');
  badge.style.cssText = 'position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;border-radius:9px;background:#e53935;color:#fff;font:bold 11px/18px sans-serif;text-align:center;display:none;';
  chatBtn.appendChild(badge);
  const drawer = mk('', 'position:fixed;top:56px;right:8px;width:236px;max-height:70vh;overflow:auto;z-index:16;background:rgba(10,14,24,.94);border:1px solid #3a4258;border-radius:12px;padding:8px;display:none;');

  menuBtn.addEventListener('click', () => {
    drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
  });
  drawer.addEventListener('click', () => {
    setTimeout(() => { drawer.style.display = 'none'; }, 150);
  });
  document.addEventListener('click', (e) => {
    if (drawer.style.display !== 'none' && !drawer.contains(e.target) && !menuBtn.contains(e.target)) drawer.style.display = 'none';
  });

  let unread = 0;
  chatBtn.addEventListener('click', () => {
    const open = document.body.classList.toggle('chat-open');
    if (open) {
      unread = 0;
      badge.style.display = 'none';
    }
  });
  if (window.socket) {
    window.socket.on('chat', () => {
      if (!document.body.classList.contains('chat-open')) {
        unread += 1;
        badge.textContent = String(unread);
        badge.style.display = 'block';
      }
    });
  }

  function intoDrawer(el) {
    const s = el.style;
    s.position = 'static';
    s.top = 'auto';
    s.right = 'auto';
    s.left = 'auto';
    s.bottom = 'auto';
    s.transform = 'none';
    s.margin = '6px 0';
    s.width = 'auto';
    s.minWidth = '0';
    s.zIndex = 'auto';
    drawer.appendChild(el);
  }

  const MENU_TOPS = ['170px', '355px', '385px', '415px', '445px', '475px'];
  function sweep() {
    const kids = Array.from(document.body.children);
    for (const el of kids) {
      if (el.dataset.m) continue;
      el.dataset.m = '1';
      const s = el.style;
      if (el.id === 'scoreboard') { intoDrawer(el); continue; }
      if (el.id === 'chat') continue;
      if (el.tagName === 'CANVAS' && s.width === '140px') {
        s.width = '92px';
        s.height = '92px';
        s.top = '6px';
        s.right = '56px';
        continue;
      }
      if (s.position !== 'fixed') continue;
      if (s.right === '10px' && MENU_TOPS.indexOf(s.top) >= 0) { intoDrawer(el); continue; }
      if (s.top === '56px' && s.left === '50%') {
        s.left = '54px';
        s.top = '12px';
        s.transform = 'none';
        s.maxWidth = 'calc(100vw - 210px)';
        s.fontSize = '11px';
        s.padding = '4px 8px';
        s.overflow = 'hidden';
        s.textOverflow = 'ellipsis';
        continue;
      }
      if (s.top === '92px' && s.left === '50%') { s.top = '104px'; continue; }
      if (s.top === '14px' && s.left === '50%') { s.top = '100px'; continue; }
      if (s.bottom === '44px' && s.left === '50%') {
        s.bottom = 'auto';
        s.top = '40px';
        s.left = '54px';
        s.transform = 'none';
        s.width = 'calc(100vw - 210px)';
        continue;
      }
      if (s.bottom === '110px' && s.left === '50%') { s.bottom = '225px'; continue; }
      if ((s.bottom === '150px' || s.bottom === '160px' || s.bottom === '230px') && s.left === '50%') {
        s.bottom = 'auto';
        s.top = '100px';
        continue;
      }
    }
  }
  sweep();
  setInterval(sweep, 800);
})();
