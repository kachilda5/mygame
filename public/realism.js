export function addRealism(THREE, scene, lights) {
  const COUNT = 12000;
  const geo = new THREE.ConeGeometry(0.035, 0.38, 3, 1, true);
  geo.translate(0, 0.19, 0);
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3(position);
       transformed.x += sin(uTime * 1.6 + instanceMatrix[3].x * 3.0 + instanceMatrix[3].z * 2.0) * position.y * 0.35;
       transformed.z += cos(uTime * 1.3 + instanceMatrix[3].z * 3.0) * position.y * 0.2;`
    );
  };
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  let n = 0, tries = 0;
  while (n < COUNT && tries < COUNT * 4) {
    tries++;
    const x = -0.5 + Math.random() * (STAGE.W / 50 + 1);
    const z = -0.5 + Math.random() * (STAGE.H / 50 + 1);
    if (STAGE.inObstacle(x * 50, z * 50, 8)) continue;
    if (STAGE.riverY && Math.abs(z * 50 - STAGE.riverY(x * 50)) < 45) continue;
    e.set((Math.random() - 0.5) * 0.3, Math.random() * 6.28, (Math.random() - 0.5) * 0.3);
    q.setFromEuler(e);
    const s = 0.6 + Math.random();
    p.set(x, 0, z);
    sc.set(s, s * (0.8 + Math.random() * 0.8), s);
    m.compose(p, q, sc);
    mesh.setMatrixAt(n, m);
    col.setHSL(0.24 + Math.random() * 0.08, 0.5, 0.22 + Math.random() * 0.14);
    mesh.setColorAt(n, col);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const prev = lights.update;
  lights.update = (px, pz, cx, cz) => {
    if (prev) prev(px, pz, cx, cz);
    uniforms.uTime.value = performance.now() / 1000;
  };
}
