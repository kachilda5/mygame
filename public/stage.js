(function (root) {
  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const W = 1600, H = 1200;
  const HUB_X = 6000, MEA_X = 12000;
  const rand = rng(20261019);
  const riverY = (x) => 940 + 50 * Math.sin(x / 240);
  const obstacles = [{ x: 800, y: 600, r: 18, kind: 'fire' }];
  const features = [];

  features.push({ kind: 'cabin', x: 1280, y: 280 });
  for (const dx of [-40, 0, 40]) {
    for (const dy of [-15, 15]) obstacles.push({ x: 1280 + dx, y: 280 + dy, r: 22, kind: 'cabin' });
  }
  [[300, 400, 0.5], [600, 1080, -0.3], [1120, 660, 1.0], [1440, 660, 0.2], [500, 700, 0.8], [1000, 200, -0.5]].forEach(([x, y, ang]) => {
    features.push({ kind: 'log', x, y, ang });
    for (const t of [-28, 0, 28]) {
      obstacles.push({ x: x + Math.cos(ang) * t, y: y - Math.sin(ang) * t, r: 12, kind: 'logpart' });
    }
  });

  function place(kind, r, gap, count, clearing) {
    let tries = 0, placed = 0;
    while (placed < count && tries < 5000) {
      tries++;
      const x = 60 + rand() * (W - 120);
      const y = 60 + rand() * (H - 120);
      if (Math.hypot(x - 800, y - 600) < clearing) continue;
      if (Math.hypot(x - 800, y - 60) < 140) continue;
      if (Math.abs(y - riverY(x)) < 70) continue;
      if (obstacles.some((o) => Math.hypot(x - o.x, y - o.y) < o.r + r + gap)) continue;
      obstacles.push({ x: Math.round(x), y: Math.round(y), r, kind });
      placed++;
    }
  }
  place('tree', 14, 80, 22, 200);
  place('rock', 20, 40, 14, 140);

  const R2 = rng(20261031);
  function add(kind, x, y, r) {
    obstacles.push({ x, y, r, kind });
  }
  add('fountain', HUB_X + 600, 600, 48);
  add('well', HUB_X + 250, 640, 26);
  add('forge', HUB_X + 1000, 420, 34);
  add('board', HUB_X + 450, 760, 20);
  features.push({ kind: 'board', x: HUB_X + 450, y: 760 });
  [[400, 330], [600, 300], [800, 330]].forEach(([x, y]) => {
    features.push({ kind: 'stall', x: HUB_X + x, y });
    add('stall', HUB_X + x, y, 38);
  });
  [[180, 280], [980, 760], [200, 920], [900, 1020]].forEach(([x, y]) => {
    features.push({ kind: 'house', x: HUB_X + x, y });
    for (const dx of [-40, 0, 40]) add('house', HUB_X + x + dx, y, 22);
  });

  const portals = [
    { id: 'arena-hub', x: 800, y: 60, zone: 'arena', to: 'hub', label: 'Frostwatch Village', dx: HUB_X + 600, dy: 1000 },
    { id: 'hub-arena', x: HUB_X + 600, y: 1140, zone: 'hub', to: 'arena', label: 'Frost Arena (battles)', dx: 800, dy: 150 },
    { id: 'hub-meadow', x: HUB_X + 1130, y: 600, zone: 'hub', to: 'meadow', label: 'Crystal Meadow', dx: MEA_X + 160, dy: 500 },
    { id: 'meadow-hub', x: MEA_X + 60, y: 500, zone: 'meadow', to: 'hub', label: 'Frostwatch Village', dx: HUB_X + 1030, dy: 600 },
  ];

  let tries = 0, placed = 0;
  while (placed < 14 && tries < 4000) {
    tries++;
    const x = HUB_X + 60 + R2() * 1080, y = 60 + R2() * 1080;
    if (Math.hypot(x - (HUB_X + 600), y - 600) < 200) continue;
    if (portals.some((p) => Math.hypot(x - p.x, y - p.y) < 140)) continue;
    if (obstacles.some((o) => o.x > 3000 && o.x < 9000 && Math.hypot(x - o.x, y - o.y) < o.r + 14 + 50)) continue;
    add('hubtree', Math.round(x), Math.round(y), 14);
    placed++;
  }
  tries = 0;
  placed = 0;
  while (placed < 16 && tries < 4000) {
    tries++;
    const x = MEA_X + 60 + R2() * 1280, y = 60 + R2() * 880;
    if (portals.some((p) => Math.hypot(x - p.x, y - p.y) < 160)) continue;
    if (Math.hypot(x - (MEA_X + 160), y - 500) < 160) continue;
    if (obstacles.some((o) => o.x > 9000 && Math.hypot(x - o.x, y - o.y) < o.r + 14 + 50)) continue;
    const rock = R2() < 0.2;
    add(rock ? 'mrock' : 'mtree', Math.round(x), Math.round(y), rock ? 20 : 14);
    placed++;
  }

  const zones = {
    arena: { id: 'arena', name: 'Frost Arena', x0: 0, y0: 0, w: W, h: H },
    hub: { id: 'hub', name: 'Frostwatch Village', x0: HUB_X, y0: 0, w: 1200, h: 1200 },
    meadow: { id: 'meadow', name: 'Crystal Meadow', x0: MEA_X, y0: 0, w: 1400, h: 1000 },
  };
  function zoneAt(x) {
    for (const k in zones) {
      const z = zones[k];
      if (x >= z.x0 - 300 && x <= z.x0 + z.w + 300) return z;
    }
    return zones.arena;
  }

  function inObstacle(x, y, margin) {
    return obstacles.some((o) => Math.hypot(x - o.x, y - o.y) < o.r + (margin || 0));
  }

  function pushOut(x, y, r) {
    for (let pass = 0; pass < 3; pass++) {
      for (const o of obstacles) {
        let dx = x - o.x, dy = y - o.y;
        let d = Math.hypot(dx, dy);
        const min = o.r + r;
        if (d >= min) continue;
        if (d < 0.01) { dx = 1; dy = 0; d = 1; }
        x = o.x + (dx / d) * min;
        y = o.y + (dy / d) * min;
      }
    }
    return { x, y };
  }

  const api = { W, H, HUB_X, MEA_X, obstacles, features, portals, zones, zoneAt, inObstacle, pushOut, riverY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.STAGE = api;
})(typeof window !== 'undefined' ? window : globalThis);
