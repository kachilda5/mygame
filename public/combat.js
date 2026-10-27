export function initCombat(G) {
  const { THREE, scene, socket } = G;
  const S = 50;

  socket.on('enemyAttack', (d) => {
    const e = window.ENEMIES && window.ENEMIES[d.id];
    if (e && e.atk) e.atk(d.dur / 1000);
    if (window.SFX) window.SFX.play(d.ranged ? 'swing' : 'growl', 0.5);
  });

  const mat = new THREE.MeshStandardMaterial({
    color: 0xbfeaff, emissive: 0x3aa0ff, emissiveIntensity: 1.2,
    roughness: 0.1, transparent: true, opacity: 0.9,
  });
  const geo = new THREE.OctahedronGeometry(1);
  const meshes = {};
  const last = {};

  socket.on('shots', (list) => {
    const seen = {};
    for (const s of list) {
      seen[s.id] = true;
      let m = meshes[s.id];
      if (!m) {
        m = new THREE.Mesh(geo, mat);
        m.scale.set(0.09, 0.09, 0.32);
        scene.add(m);
        meshes[s.id] = m;
        last[s.id] = { x: s.x, y: s.y };
      }
      const l = last[s.id];
      const dx = s.x - l.x, dy = s.y - l.y;
      m.position.set(s.x / S, 0.9, s.y / S);
      if (dx || dy) m.rotation.y = Math.atan2(dx, dy);
      last[s.id] = { x: s.x, y: s.y };
    }
    for (const id in meshes) {
      if (!seen[id]) {
        scene.remove(meshes[id]);
        delete meshes[id];
        delete last[id];
      }
    }
  });
}
