import { addScenery } from './scenery.js';
import { addRealism } from './realism.js';
export function setupWorld(THREE, scene, S) {
  const FOG = 0xb4c8b8;
  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.FogExp2(FOG, 0.028);
  const lights = [];
  const fades = [];

  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4a6b36';
  g.fillRect(0, 0, 256, 256);
  const cols = ['#3f5c2e', '#56803d', '#628c45', '#6b5436', '#52402a'];
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = cols[Math.floor(Math.random() * cols.length)];
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 1 + Math.random() * 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(STAGE.W / S + 8, STAGE.H / S + 8), new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 1.5, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(STAGE.W / S / 2, 0, STAGE.H / S / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.6, 7);
  const coneGeos = [new THREE.ConeGeometry(0.95, 1.5, 8), new THREE.ConeGeometry(0.75, 1.3, 8), new THREE.ConeGeometry(0.55, 1.1, 8)];
  const coneY = [1.7, 2.45, 3.1];
  const sharedTrunk = new THREE.MeshStandardMaterial({ color: 0x5a3f28, roughness: 1 });
  const sharedLeaf = new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 0.9 });

  function makeTree(x, z, scale, solid) {
    const grp = new THREE.Group();
    const trunkMat = solid ? new THREE.MeshStandardMaterial({ color: 0x5a3f28, roughness: 1 }) : sharedTrunk;
    const leafMat = solid
      ? new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.3 + Math.random() * 0.05, 0.5, 0.24 + Math.random() * 0.08), roughness: 0.9 })
      : sharedLeaf;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.8;
    trunk.castShadow = solid;
    grp.add(trunk);
    coneGeos.forEach((geo, i) => {
      const cone = new THREE.Mesh(geo, leafMat);
      cone.position.y = coneY[i];
      cone.castShadow = solid;
      grp.add(cone);
    });
    grp.position.set(x, 0, z);
    grp.scale.setScalar(scale);
    grp.rotation.y = Math.random() * 6;
    scene.add(grp);
    if (solid) fades.push({ x, z, mats: [trunkMat, leafMat], o: 1 });
  }

  for (let x = -1.5; x <= STAGE.W / S + 1.5; x += 3.2) {
    makeTree(x, -0.8 - Math.random() * 1.2, 1 + Math.random() * 0.4, false);
    makeTree(x, STAGE.H / S + 0.8 + Math.random() * 1.2, 1 + Math.random() * 0.4, false);
  }
  for (let z = 0; z <= STAGE.H / S; z += 3.2) {
    makeTree(-0.8 - Math.random() * 1.2, z, 1 + Math.random() * 0.4, false);
    makeTree(STAGE.W / S + 0.8 + Math.random() * 1.2, z, 1 + Math.random() * 0.4, false);
  }

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 1, flatShading: true });
  STAGE.obstacles.forEach((o) => {
    if (o.kind === 'tree') makeTree(o.x / S, o.y / S, 0.9 + Math.random() * 0.3, true);
    if (o.kind === 'rock') {
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry((o.r / S) * 1.25, 0), rockMat);
      r.scale.y = 0.75;
      r.position.set(o.x / S, 0.2, o.y / S);
      r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      r.castShadow = true;
      r.receiveShadow = true;
      scene.add(r);
    }
  });

  const bushGeo = new THREE.SphereGeometry(0.35, 8, 6);
  for (let i = 0; i < 30; i++) {
    const x = 0.5 + Math.random() * (STAGE.W / S - 1), z = 0.5 + Math.random() * (STAGE.H / S - 1);
    if (STAGE.inObstacle(x * S, z * S, 25) || Math.abs(z * S - STAGE.riverY(x * S)) < 50) continue;
    const b = new THREE.Mesh(bushGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.45, 0.2 + Math.random() * 0.08), roughness: 1 }));
    b.scale.set(1 + Math.random() * 0.5, 0.7, 1 + Math.random() * 0.5);
    b.position.set(x, 0.2, z);
    scene.add(b);
  }

  const fire = STAGE.obstacles.find((o) => o.kind === 'fire');
  const fx = fire.x / S, fz = fire.y / S;
  const logMat = new THREE.MeshStandardMaterial({ color: 0x2e1d10, roughness: 1 });
  for (const a of [0.6, -0.6]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 6), logMat);
    log.rotation.set(0, a, Math.PI / 2);
    log.position.set(fx, 0.08, fz);
    scene.add(log);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 7), new THREE.MeshBasicMaterial({ color: 0xff8a2a, fog: false }));
  flame.position.set(fx, 0.4, fz);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 7), new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false }));
  core.position.set(fx, 0.3, fz);
  scene.add(flame, core);
  const fireLight = new THREE.PointLight(0xff8a3a, 2.4, 12, 2);
  fireLight.position.set(fx, 1.0, fz);
  scene.add(fireLight);
  lights.push(fireLight);

  const FF = 50;
  const base = [];
  const arr = new Float32Array(FF * 3);
  for (let i = 0; i < FF; i++) base.push([0.5 + Math.random() * (STAGE.W / S - 1), 0.5 + Math.random() * (STAGE.H / S - 1)]);
  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const ff = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xfff0c8, size: 0.07, fog: false }));
  ff.frustumCulled = false;
  scene.add(ff);

  lights.update = (px, pz, cx, cz) => {
    const t = performance.now() / 1000;
    for (const f of fades) {
      const vx = px - cx, vz = pz - cz;
      const L2 = vx * vx + vz * vz || 1;
      const u = ((f.x - cx) * vx + (f.z - cz) * vz) / L2;
      const hide = u > 0 && u < 1.05 && Math.hypot(cx + vx * u - f.x, cz + vz * u - f.z) < 1.3;
      f.o += ((hide ? 0.2 : 1) - f.o) * 0.15;
      for (const m of f.mats) { m.opacity = f.o; m.transparent = f.o < 0.99; }
    }
    const p = ff.geometry.attributes.position;
    for (let i = 0; i < FF; i++) {
      p.setXYZ(i, base[i][0] + Math.sin(t * 0.4 + i) * 0.6, 0.9 + Math.sin(t * 0.8 + i * 1.7) * 0.4, base[i][1] + Math.cos(t * 0.35 + i * 2.1) * 0.6);
    }
    p.needsUpdate = true;
  };

  addScenery(THREE, scene, S, lights);
  addRealism(THREE, scene, lights);
  return lights;
}
