(function () {
  if (!window.React || !window.ReactDOM || !window.ReactDOM.createRoot) {
    console.warn('React is not loaded, so the tour is disabled.');
    return;
  }
  const h = React.createElement;
  const useState = React.useState;
  const useEffect = React.useEffect;
  const isTouch = () => !!window.TOUCH;

  const pool = () => {
    const d = document.getElementById('m-drawer');
    return Array.from(document.body.children).concat(d ? Array.from(d.children) : []);
  };
  const findText = (re) => pool().find((el) => el.id !== 'tour-root' && re.test(el.textContent || '') && (el.textContent || '').length < 60) || null;
  const stick = (label) => pool().find((el) => Array.from(el.children || []).some((c) => (c.textContent || '') === label)) || null;
  const setDrawer = (on) => {
    const d = document.getElementById('m-drawer');
    if (d) d.style.display = on ? 'block' : 'none';
  };
  const openMenu = () => { if (isTouch()) setDrawer(true); };
  const closeMenu = () => { if (isTouch()) setDrawer(false); };

  const ALL = [
    {
      title: 'Welcome, Warden!',
      text: () => 'The Long Winter has frozen the kingdom, and Princess Deaneyrs has been taken. This one-minute tour shows you how to play.',
    },
    {
      title: 'Moving around',
      target: () => (isTouch() ? stick('MOVE') : null),
      text: () => (isTouch()
        ? 'Put your left thumb anywhere on the left half of the screen and drag to move. Push all the way to the edge to sprint.'
        : 'Use W A S D or the arrow keys to move. Hold Shift to sprint, press Space to jump, and use Q and E (or hold the right mouse button) to turn the camera.'),
    },
    {
      title: 'Fighting',
      target: () => (isTouch() ? stick('AIM + ATTACK') : null),
      text: () => (isTouch()
        ? 'Your right thumb aims and attacks. Push in a direction to keep attacking that way, or tap quickly for a single swing. JUMP and ROLL are on the right edge.'
        : 'Click the left mouse button or press F to attack. Press C to roll. Guns shoot the way you are facing.'),
    },
    {
      title: 'Dodge for power',
      text: () => 'Roll right as an enemy hits you for a PERFECT DODGE: no damage, a little healing, and 1.5x damage for a few seconds. Watch for monsters winding up before they strike.',
    },
    {
      title: 'Your health',
      target: () => pool().find((el) => (el.textContent || '').indexOf('HP ') === 0 && el.style.position === 'fixed') || null,
      text: () => 'This is your health. At zero it is game over, but you keep your coins and weapons. You heal a little between waves and fully after each boss.',
    },
    {
      title: 'The radar',
      target: () => pool().find((el) => el.tagName === 'CANVAS' && /^(140|92)px$/.test(el.style.width)) || null,
      text: () => 'Red dots are monsters and blue dots are other players. The top of the radar is the way you are facing, so you can spot enemies behind you.',
    },
    {
      title: 'Level and waves',
      target: () => pool().find((el) => /^Level \d+/.test(el.textContent || '') && (el.textContent || '').length < 90 && el.style.position === 'fixed') || null,
      text: () => 'This shows the level, the area and the wave. Clear every wave, then beat the boss to win a Warding Shard and move on.',
    },
    {
      title: 'The menu',
      touchOnly: true,
      target: () => document.getElementById('m-menu'),
      text: () => 'Everything else lives in this menu: the scoreboard, your weapon, sound, style, shop and journal.',
    },
    {
      title: 'Coins and weapons',
      before: openMenu,
      after: closeMenu,
      target: () => findText(/Shop \[B\]/),
      text: () => (isTouch()
        ? 'Monsters drop coins. Tap Shop while you are in the village (or tap Mira) to buy better weapons.'
        : 'Monsters drop coins. Press B in the village (or talk to Mira with T) to buy better weapons. Press 1 to 5 to switch between the weapons you own.'),
    },
    {
      title: 'Your journal',
      before: openMenu,
      after: closeMenu,
      target: () => findText(/Journal/),
      text: () => 'The journal tells the story, shows your Warding Shards and your current goal.',
    },
    {
      title: 'Travel gates',
      text: () => 'Glowing gates travel between Frostwatch Village (safe), the Frost Arena (battles) and the Crystal Meadow (collect crystals for coins). The arena gate is at the south edge of the village.',
    },
    {
      title: 'You are ready!',
      text: () => 'Good luck, Warden. You can replay this tour any time with the Help button.',
    },
  ];

  function TourGuide(props) {
    const steps = props.steps;
    const st = useState(0);
    const i = st[0];
    const setI = st[1];
    const rs = useState(null);
    const rect = rs[0];
    const setRect = rs[1];
    const step = steps[i];
    const last = i === steps.length - 1;

    useEffect(() => {
      if (step.before) step.before();
      const measure = () => {
        const el = step.target ? step.target() : null;
        if (!el) { setRect(null); return; }
        const r = el.getBoundingClientRect();
        if (r.width < 2 && r.height < 2) { setRect(null); return; }
        setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
      };
      const t0 = setTimeout(measure, 80);
      const t = setInterval(measure, 400);
      window.addEventListener('resize', measure);
      return () => {
        clearTimeout(t0);
        clearInterval(t);
        window.removeEventListener('resize', measure);
        if (step.after) step.after();
      };
    }, [i]);

    useEffect(() => {
      const onKey = (e) => {
        if (e.code === 'Escape') props.onClose();
        else if (e.code === 'ArrowRight' || e.code === 'Enter') { if (last) props.onClose(); else setI(i + 1); }
        else if (e.code === 'ArrowLeft' && i > 0) setI(i - 1);
        e.stopPropagation();
      };
      window.addEventListener('keydown', onKey, true);
      return () => window.removeEventListener('keydown', onKey, true);
    }, [i]);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = Math.min(330, vw * 0.92);
    let left = (vw - cw) / 2;
    let top = Math.max(12, vh * 0.28);
    if (rect) {
      left = Math.min(Math.max(rect.x + rect.w / 2 - cw / 2, 8), vw - cw - 8);
      const below = rect.y + rect.h + 14;
      top = below + 200 < vh ? below : Math.max(8, rect.y - 210);
    }
    const btn = (label, onClick, bg, disabled) => h('button', {
      onClick,
      disabled,
      style: { padding: '8px 14px', borderRadius: 8, border: 0, background: disabled ? '#2a3040' : bg, color: '#fff', fontWeight: 'bold', fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 },
    }, label);
    const dots = steps.map((s, k) => h('span', {
      key: k,
      style: { width: 8, height: 8, borderRadius: 4, display: 'inline-block', margin: '0 3px', background: k === i ? '#ffd36b' : '#4a5470' },
    }));

    return h('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }, onClick: (e) => e.stopPropagation() },
      rect
        ? h('div', { style: { position: 'fixed', left: rect.x - 6, top: rect.y - 6, width: rect.w + 12, height: rect.h + 12, borderRadius: 12, border: '2px solid #ffd36b', boxShadow: '0 0 0 9999px rgba(3,6,14,0.78)', pointerEvents: 'none', transition: 'all .25s' } })
        : h('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(3,6,14,0.78)' } }),
      h('div', { style: { position: 'fixed', left, top, width: cw, background: '#12161f', color: '#fff', border: '1px solid #5a6a8a', borderRadius: 12, padding: 14, fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.5, boxSizing: 'border-box' } },
        h('div', { style: { fontWeight: 'bold', fontSize: 17, color: '#ffd36b', marginBottom: 6 } }, step.title),
        h('div', null, step.text()),
        h('div', { style: { margin: '10px 0 8px', textAlign: 'center' } }, dots),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
          btn('Skip', props.onClose, '#3a4258', false),
          h('div', { style: { display: 'flex', gap: 8 } },
            btn('Back', () => setI(i - 1), '#3a5a9a', i === 0),
            btn(last ? 'Finish' : 'Next', () => { if (last) props.onClose(); else setI(i + 1); }, '#2e7d32', false)))));
  }

  function startTour() {
    if (document.getElementById('tour-root')) return;
    const steps = ALL.filter((s) => !s.touchOnly || isTouch());
    const host = document.createElement('div');
    host.id = 'tour-root';
    document.body.appendChild(host);
    window.STORY_BLOCK = true;
    const root = ReactDOM.createRoot(host);
    const done = () => {
      root.unmount();
      host.remove();
      window.STORY_BLOCK = false;
      try { localStorage.setItem('tourDone', '1'); } catch (e) { /* ignore */ }
    };
    root.render(h(TourGuide, { steps, onClose: done }));
  }
  window.startTour = startTour;

  const help = document.createElement('div');
  help.textContent = '\u2753 Help [H]';
  help.style.cssText = 'position:fixed;top:505px;right:10px;background:rgba(0,0,0,.55);color:#9fd8ff;font:bold 13px sans-serif;padding:5px 9px;border-radius:6px;z-index:6;cursor:pointer;user-select:none;';
  document.body.appendChild(help);
  help.addEventListener('click', startTour);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyH' && !e.repeat && !document.getElementById('tour-root')) startTour();
  });

  function overlayOpen() {
    return Array.from(document.body.children).some((el) => {
      const cs = getComputedStyle(el);
      return cs.position === 'fixed' && parseInt(cs.zIndex || '0', 10) >= 20 && cs.display !== 'none' && el.style.top === '0px' && el.style.bottom === '0px';
    });
  }
  let seen = false;
  try { seen = localStorage.getItem('tourDone') === '1'; } catch (e) { seen = false; }
  if (!seen) {
    const t0 = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - t0 < 4500) return;
      if (!window.MY_ZONE || window.STORY_BLOCK || overlayOpen()) return;
      clearInterval(timer);
      setTimeout(startTour, 1200);
    }, 800);
  }
})();
