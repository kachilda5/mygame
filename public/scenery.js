export function addScenery(THREE, scene, S, lights) {
  const pos = [], idx = [];
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const x = -1 + ((STAGE.W / S + 2) * i) / N;
    const z = STAGE.riverY(x * S) / S;
    pos.push(x, 0.04, z - 0.75, x, 0.04, z + 0.75);
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setIndex(idx);
  rg.computeVertexNormals();
  const river = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({
    color: 0x3f7f9a, roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.88, side: THREE.DoubleSide,
  }));
  river.receiveShadow = true;
  scene.add(river);

  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.9 });
  const bz = STAGE.riverY(STAGE.W / 2) / S;
  const bridge = new THREE.Group();
  bridge.position.set(STAGE.W / S / 2, 0, bz);
  for (let i = 0; i < 10; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.21), wood);
    plank.position.set(0, 0.1, -1.1 + i * 0.245);
    plank.castShadow = true;
    plank.receiveShadow = true;
    bridge.add(plank);
  }
  for (const sx of [-0.78, 0.78]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.5), wood);
    rail.position.set(sx, 0.55, 0);
    rail.castShadow = true;
    bridge.add(rail);
    for (const pz of [-1.15, 0, 1.15]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), wood);
      post.position.set(sx, 0.3, pz);
      post.castShadow = true;
      bridge.add(post);
    }
  }
  scene.add(bridge);

  const cab = STAGE.features.find((f) => f.kind === 'cabin');
  const cx = cab.x / S, cz = cab.y / S;
  const cabin = new THREE.Group();
  cabin.position.set(cx, 0, cz);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x7a5535, roughness: 0.95 }));
  walls.position.y = 0.7;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0x3e2a1c, roughness: 0.95 }));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.3, 1, 1);
  roof.position.y = 1.85;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.04), new THREE.MeshStandardMaterial({ color: 0x2a1a10 }));
  door.position.set(0, 0.4, 0.82);
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), new THREE.MeshStandardMaterial({ color: 0x5a5a5e, roughness: 1 }));
  chim.position.set(0.8, 1.9, -0.2);
  cabin.add(walls, roof, door, chim);
  for (const sx of [-0.7, 0.7]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.04), new THREE.MeshBasicMaterial({ color: 0xffc864, fog: false }));
    win.position.set(sx, 0.8, 0.82);
    cabin.add(win);
  }
  cabin.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(cabin);
  const glow = new THREE.PointLight(0xffb060, 1.6, 7, 2);
  glow.position.set(cx, 1.0, cz + 1.3);
  scene.add(glow);
  lights.push(glow);

  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5a3f28, roughness: 1 });
  STAGE.features.filter((f) => f.kind === 'log').forEach((f) => {
    const grp = new THREE.Group();
    grp.position.set(f.x / S, 0.18, f.y / S);
    grp.rotation.y = f.ang;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.7, 8), barkMat);
    log.rotation.z = Math.PI / 2;
    log.castShadow = true;
    log.receiveShadow = true;
    grp.add(log);
    scene.add(grp);
  });
}
