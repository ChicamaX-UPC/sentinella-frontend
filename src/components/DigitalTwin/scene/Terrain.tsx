import * as THREE from "three";

export type TerrainVisualState = {
  showIsolines: boolean;
  rainIntensity: number;
};

export type TerrainSystem = {
  update: (state: TerrainVisualState) => void;
  dispose: () => void;
};

function noise2d(x: number, z: number): number {
  const a = Math.sin(x * 0.022 + z * 0.013) * 0.55;
  const b = Math.cos(x * 0.047 - z * 0.032) * 0.35;
  const c = Math.sin((x + z) * 0.011) * 0.2;
  return a + b + c;
}

/** Estratos / roca erosionada para cerros (no un color plano). */
function createStrataRockTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  const grd = ctx.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#5c4a3a");
  grd.addColorStop(0.15, "#7d6a55");
  grd.addColorStop(0.35, "#6b5847");
  grd.addColorStop(0.55, "#8a735f");
  grd.addColorStop(0.75, "#5d4d3f");
  grd.addColorStop(1, "#4a3c32");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 4) {
    ctx.strokeStyle = `rgba(0,0,0,${0.12 + (y % 16) * 0.01})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x < 512; x += 8) {
      const j = noise2d(x * 0.1, y * 0.1) * 2.4;
      ctx.lineTo(x, y + j);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 9000; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 1 + Math.random() * 2.5;
    ctx.fillStyle = `rgba(30,20,10,${Math.random() * 0.18})`;
    ctx.fillRect(x, y, w, 0.6 + Math.random() * 1.5);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2.2, 2.4);

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const b = bumpCanvas.getContext("2d")!;
  b.fillStyle = "#7a6a5a";
  b.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    for (let x = 0; x < 256; x += 2) {
      const v = 90 + Math.floor(Math.random() * 70);
      b.fillStyle = `rgb(${v},${v - 5},${v - 10})`;
      b.fillRect(x, y, 1.2, 2);
    }
  }
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);
  return { map, bumpMap };
}

function displaceRuggedPeak(geo: THREE.BufferGeometry, originX: number, originZ: number, h: number, r: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const xv = pos.getX(i);
    const yv = pos.getY(i);
    const zv = pos.getZ(i);
    const wx = originX + xv;
    const wz = originZ + zv;
    const n1 = noise2d(wx * 0.08, wz * 0.08);
    const n2 = noise2d(wx * 0.19 + 1.1, wz * 0.16 - 0.4);
    const t = 1 - Math.min(1, Math.max(0, yv / h));
    const wall = t * 1.15;
    const flare = 1 + n1 * 0.055 * wall + n2 * 0.04 * t;
    const hump = t * 0.08 * n2;
    pos.setX(i, xv * flare);
    pos.setY(i, yv + hump * 4);
    pos.setZ(i, zv * (flare * 0.98 + 0.02) + n2 * 0.22 * t);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function bumpRubble(geo: THREE.BufferGeometry, ox: number, oz: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const xv = pos.getX(i);
    const yv = pos.getY(i);
    const zv = pos.getZ(i);
    const n = noise2d(ox * 0.008 + xv * 0.22, oz * 0.008 + zv * 0.22) * 0.7 + noise2d(xv * 0.48 + 1.1, zv * 0.45) * 0.3;
    pos.setXYZ(i, xv * (1 + 0.05 * n), yv * (1 + 0.035 * n), zv * (1 + 0.05 * n));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function createDirtTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Base ocre / arena desértica como en las fotos (minera árida).
  ctx.fillStyle = "#b59a72";
  ctx.fillRect(0, 0, 512, 512);

  // Manchas grandes de tierra.
  for (let i = 0; i < 120; i += 1) {
    ctx.fillStyle = i % 3 === 0 ? "#8e7248" : "#c9a877";
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 22 + Math.random() * 42, 0, Math.PI * 2);
    ctx.fill();
  }

  // Granos pequeños.
  for (let i = 0; i < 55000; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2.2;
    const tint = Math.random();
    const c = tint > 0.66 ? "#6e5636" : tint > 0.33 ? "#d5b784" : "#8a7550";
    ctx.fillStyle = c;
    ctx.globalAlpha = Math.random() * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(16, 16); // Terrain is huge

  // Bump & Roughness
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext("2d")!;
  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, 512, 512);
  
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2.5;
    const v = Math.floor(Math.random() * 255);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.globalAlpha = Math.random() * 0.6;
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }
  
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(16, 16);

  const roughnessMap = new THREE.CanvasTexture(bumpCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(16, 16);

  return { map, bumpMap, roughnessMap };
}

export function createTerrainSystem(scene: THREE.Scene): TerrainSystem {
  const terrainGeometry = new THREE.PlaneGeometry(920, 920, 260, 260);
  terrainGeometry.rotateX(-Math.PI / 2);

  const colors = new Float32Array((terrainGeometry.attributes.position.count ?? 0) * 3);
  const position = terrainGeometry.attributes.position as THREE.BufferAttribute;
  const color = new THREE.Color();

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const dist = Math.sqrt(x * x + z * z);
    
    // Forma del terreno: valle árido con cerros de fondo (más cercano a referencia foto).
    const xDist = Math.abs(x);
    // El valle se abre en el frente y se encajona hacia el fondo.
    const basinWidth = z < 20 ? 170 - z * 0.08 : 152 - (z - 20) * 0.45;
    const wallDist = Math.max(0, xDist - basinWidth);
    
    // Cinturón de cerros traseros.
    const backWallDist = Math.max(0, -300 - z);
    
    const d = Math.sqrt(wallDist * wallDist + backWallDist * backWallDist);
    // Transición suave del piso del valle a las montañas
    const protectedBasin = THREE.MathUtils.clamp(d / 45, 0, 1);
    
    // Descenso suave aguas abajo.
    const dropOff = Math.max(0, z - 120);
    const dropY = dropOff * 0.32;
    
    const ridges = noise2d(x, z) * 20 + noise2d(x * 0.45, z * 0.45) * 30;
    const mountainLift = THREE.MathUtils.smoothstep(dist, 150, 470) * 72;
    
    // Base del vaso interno.
    const floorLift = THREE.MathUtils.smoothstep(protectedBasin, 0.35, 0.0) * (z < 130 ? 1.2 : 0);

    // Tallado elíptico interno para asegurar que el relave nunca cruce con cerros.
    const dx = (x - 6) / 132;
    const dz = (z - 22) / 94;
    const basinQ = dx * dx + dz * dz;
    const basinMask = THREE.MathUtils.smoothstep(basinQ, 1.05, 0.7);
    const basinCarve = basinMask * 28;

    const rawY = (ridges + mountainLift) * protectedBasin - dropY - 2.2 + floorLift - basinCarve;
    const floorTarget = -6.2 + noise2d(x * 0.5, z * 0.5) * 0.4;
    const y = THREE.MathUtils.lerp(rawY, floorTarget, basinMask * 0.86);
    position.setY(i, y);

    // Tonalidad ocre/arena (hue ~0.09–0.11) con más luminosidad en alto para imitar
    // cerros secos iluminados por sol y valle en sombra (fotos 1, 3 y 4 del usuario).
    const hue = THREE.MathUtils.clamp(0.095 + y * 0.00045, 0.075, 0.115);
    const sat = THREE.MathUtils.clamp(0.38 - y * 0.0018, 0.2, 0.45);
    const light = THREE.MathUtils.clamp(0.42 + y * 0.0042, 0.32, 0.74);
    color.setHSL(hue, sat, light);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  terrainGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeometry.computeVertexNormals();

  const textures = typeof document !== "undefined" ? createDirtTexture() : null;

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.05,
    map: textures?.map || null,
    bumpMap: textures?.bumpMap || null,
    bumpScale: 0.8,
    roughnessMap: textures?.roughnessMap || null,
  });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ------------------------------------------------------------------
  // Cancha de fútbol (se ve en la foto de referencia: parche verde cerca
  // de la planta, al fondo del tranque). Se construye con arcos reales y
  // se agrupa para un solo transform / dispose.
  // ------------------------------------------------------------------
  const fieldGroup = new THREE.Group();
  // Frente abierto, lejos del tranque y de la ruta de cámara típica.
  const FIELD_POS = new THREE.Vector3(300, 4.6, 218);
  fieldGroup.position.copy(FIELD_POS);
  fieldGroup.rotation.y = 0.28;

  // Base de pasto.
  const fieldWidth = 90;
  const fieldLength = 140;
  const fieldBase = new THREE.Mesh(
    new THREE.PlaneGeometry(fieldLength, fieldWidth),
    new THREE.MeshStandardMaterial({ color: 0x2b8a3e, roughness: 0.85, metalness: 0.0 })
  );
  fieldBase.rotation.x = -Math.PI / 2;
  fieldBase.position.y = 0;
  fieldBase.receiveShadow = true;
  fieldGroup.add(fieldBase);

  // Franjas de corte (alternadas) para que se vea cancha real.
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x258033, roughness: 0.9 });
  for (let s = 0; s < 8; s += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(fieldLength, fieldWidth / 8 - 0.4),
      stripeMat
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.02, -fieldWidth / 2 + (s + 0.5) * (fieldWidth / 8));
    if (s % 2 === 0) stripe.visible = false;
    fieldGroup.add(stripe);
  }

  // Líneas blancas.
  const lineMat = new THREE.LineBasicMaterial({ color: 0xf8fafc });
  const pts = (arr: [number, number][]) =>
    new THREE.BufferGeometry().setFromPoints(arr.map(([x, z]) => new THREE.Vector3(x, 0.08, z)));

  const halfL = fieldLength / 2;
  const halfW = fieldWidth / 2;

  const outline = new THREE.LineLoop(
    pts([
      [-halfL, -halfW],
      [halfL, -halfW],
      [halfL, halfW],
      [-halfL, halfW],
    ]),
    lineMat
  );
  fieldGroup.add(outline);

  const midLine = new THREE.Line(pts([[0, -halfW], [0, halfW]]), lineMat);
  fieldGroup.add(midLine);

  const centerCircle = new THREE.Mesh(
    new THREE.RingGeometry(8.8, 9.3, 48),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide })
  );
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.y = 0.09;
  fieldGroup.add(centerCircle);

  // Áreas chicas.
  [-1, 1].forEach((dir) => {
    const areaGeo = pts([
      [dir * (halfL - 16), -14],
      [dir * halfL, -14],
      [dir * halfL, 14],
      [dir * (halfL - 16), 14],
      [dir * (halfL - 16), -14],
    ]);
    fieldGroup.add(new THREE.Line(areaGeo, lineMat));
  });

  // Arcos (porterías).
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  [-1, 1].forEach((dir) => {
    const goalWidth = 10;
    const goalHeight = 3.5;
    const goalDepth = 3;

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, goalHeight, 10), postMat);
    leftPost.position.set(dir * halfL, goalHeight / 2, -goalWidth / 2);
    fieldGroup.add(leftPost);

    const rightPost = leftPost.clone();
    rightPost.position.z = goalWidth / 2;
    fieldGroup.add(rightPost);

    const crossbarGeo = new THREE.CylinderGeometry(0.18, 0.18, goalWidth, 10);
    const crossbar = new THREE.Mesh(crossbarGeo, postMat);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(dir * halfL, goalHeight, 0);
    fieldGroup.add(crossbar);

    // Red semitransparente.
    const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
    const netBack = new THREE.Mesh(new THREE.PlaneGeometry(goalWidth, goalHeight), netMat);
    netBack.rotation.y = Math.PI / 2;
    netBack.position.set(dir * (halfL + goalDepth * dir * -1), goalHeight / 2, 0);
    fieldGroup.add(netBack);
  });
  scene.add(fieldGroup);

  // ------------------------------------------------------------------
  // Cerros: mas altas, empujados al horizonte (lejos del eje relave 6,22) y
  // con geometria + textura (no conos suaves con un color).
  // ------------------------------------------------------------------
  const peaksGroup = new THREE.Group();
  const stratum = typeof document !== "undefined" ? createStrataRockTexture() : null;
  const peakMat = new THREE.MeshStandardMaterial({
    color: 0x9a8470,
    map: stratum?.map ?? null,
    bumpMap: stratum?.bumpMap ?? null,
    bumpScale: 0.45,
    roughness: 0.94,
    metalness: 0.04,
    flatShading: false,
  });
  const peakShadow = new THREE.MeshStandardMaterial({
    color: 0x5d4b3a,
    map: stratum?.map ?? null,
    bumpMap: stratum?.bumpMap ?? null,
    bumpScale: 0.5,
    roughness: 0.98,
    metalness: 0.02,
    flatShading: false,
  });
  const peakData: Array<{ x: number; z: number; h: number; r: number; shadow?: boolean }> = [
    { x: -300, z: -300, h: 198, r: 128, shadow: true },
    { x: -145, z: -380, h: 235, r: 150, shadow: true },
    { x: 30, z: -420, h: 260, r: 162 },
    { x: 215, z: -375, h: 218, r: 142, shadow: true },
    { x: 380, z: -265, h: 190, r: 128 },
    { x: -370, z: -120, h: 155, r: 108, shadow: true },
    { x: 430, z: 15, h: 165, r: 104 },
  ];
  for (const p of peakData) {
    const geo = new THREE.ConeGeometry(p.r, p.h, 30, 12, false);
    displaceRuggedPeak(geo, p.x, p.z, p.h, p.r);
    const mat = p.shadow ? peakShadow : peakMat;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, p.h / 2 - 4, p.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    peaksGroup.add(mesh);
    // Masas laterales (crestas), no un solo cono liso.
    for (let k = 0; k < 3; k += 1) {
      const s = 0.21 + k * 0.07;
      const humpG = new THREE.SphereGeometry(p.r * s, 12, 9);
      bumpRubble(humpG, p.x, p.z);
      const hump = new THREE.Mesh(humpG, mat);
      const o = 0.38 + k * 0.1;
      hump.position.set(
        p.x + (k - 1) * p.r * 0.32,
        p.h * 0.36 - 2,
        p.z - p.r * o * 0.55
      );
      hump.scale.set(1.0, 0.7, 0.75);
      hump.castShadow = true;
      hump.receiveShadow = true;
      peaksGroup.add(hump);
    }
  }
  scene.add(peaksGroup);

  // ------------------------------------------------------------------
  // Rocas / bolones dispersos en el primer plano (como en foto 1 y 3).
  // ------------------------------------------------------------------
  const rocksGroup = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9c7e58, roughness: 0.98, flatShading: true });
  const rockMatDark = new THREE.MeshStandardMaterial({ color: 0x7a5f3e, roughness: 0.98, flatShading: true });
  for (let i = 0; i < 60; i += 1) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 190 + Math.random() * 220;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad * 0.7 + 60;
    // Evitar dentro del relave.
    const dx = (x - 6) / 150;
    const dz = (z - 22) / 110;
    if (dx * dx + dz * dz < 1.1) continue;
    const size = 1.2 + Math.random() * 3.2;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      Math.random() > 0.5 ? rockMat : rockMatDark
    );
    rock.position.set(x, 1 + Math.random() * 0.6, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rocksGroup.add(rock);
  }
  scene.add(rocksGroup);

  // ------------------------------------------------------------------
  // Mini planta de procesamiento (foto 2): conjunto de bodegas simples
  // al costado del tranque para dar contexto minero.
  // ------------------------------------------------------------------
  const plantGroup = new THREE.Group();
  plantGroup.position.set(230, 6, -80);
  const buildingMatA = new THREE.MeshStandardMaterial({ color: 0xd6d1c4, roughness: 0.85 });
  const buildingMatB = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.7, metalness: 0.25 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.3 });
  type Bld = { x: number; z: number; w: number; d: number; h: number; mat: THREE.MeshStandardMaterial };
  const buildings: Bld[] = [
    { x: 0, z: 0, w: 28, d: 18, h: 10, mat: buildingMatA },
    { x: 34, z: -6, w: 18, d: 14, h: 7, mat: buildingMatB },
    { x: -24, z: 10, w: 14, d: 12, h: 6, mat: buildingMatA },
    { x: 12, z: 24, w: 24, d: 12, h: 5, mat: buildingMatB },
  ];
  for (const b of buildings) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), b.mat);
    box.position.set(b.x, b.h / 2, b.z);
    box.castShadow = true;
    box.receiveShadow = true;
    plantGroup.add(box);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.5, 0.6, b.d + 0.5), roofMat);
    roof.position.set(b.x, b.h + 0.3, b.z);
    plantGroup.add(roof);
  }
  // Chimenea / tolva.
  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.0, 22, 14),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.55, metalness: 0.4 })
  );
  stack.position.set(8, 11, -4);
  stack.castShadow = true;
  plantGroup.add(stack);
  // Tolva cónica.
  const hopper = new THREE.Mesh(
    new THREE.ConeGeometry(4, 8, 10),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6, metalness: 0.45 })
  );
  hopper.position.set(-12, 10, -2);
  hopper.rotation.x = Math.PI;
  plantGroup.add(hopper);
  scene.add(plantGroup);

  const isolines = new THREE.Group();
  const ringMaterial = new THREE.LineBasicMaterial({ color: 0xcfc3a0, transparent: true, opacity: 0.35 });
  for (let radius = 85; radius <= 290; radius += 14) {
    const ringGeometry = new THREE.RingGeometry(radius, radius + 0.2, 100);
    const ring = new THREE.LineLoop(new THREE.EdgesGeometry(ringGeometry), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.2 + (radius - 85) * 0.01;
    isolines.add(ring);
  }
  isolines.visible = false;
  scene.add(isolines);

  return {
    update: (state) => {
      isolines.visible = state.showIsolines;
      const wetness = THREE.MathUtils.clamp(state.rainIntensity / 100, 0, 0.45);
      terrainMaterial.roughness = 0.92 - wetness * 0.4;
      terrainMaterial.metalness = 0.05 + wetness * 0.1;
      if (terrainMaterial.roughnessMap) {
        // dampen the roughness map effect when wet
        terrainMaterial.roughnessMap.offset.x += 0.001; // tiny animation? not needed for maps
      }
    },
    dispose: () => {
      scene.remove(terrain);
      scene.remove(fieldGroup);
      scene.remove(peaksGroup);
      scene.remove(rocksGroup);
      scene.remove(plantGroup);
      scene.remove(isolines);
      terrainGeometry.dispose();
      terrainMaterial.dispose();
      ringMaterial.dispose();
      const freeBranch = (g: THREE.Object3D) => {
        g.traverse((obj) => {
          const m = obj as THREE.Mesh | THREE.Line | THREE.LineLoop;
          if ("geometry" in m && m.geometry) {
            (m.geometry as THREE.BufferGeometry).dispose();
          }
          const mat = (m as { material?: THREE.Material | THREE.Material[] }).material;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else if (mat) mat.dispose();
        });
      };
      freeBranch(fieldGroup);
      freeBranch(peaksGroup);
      freeBranch(rocksGroup);
      freeBranch(plantGroup);
      isolines.children.forEach((child) => {
        const line = child as THREE.LineLoop;
        line.geometry.dispose();
      });
    },
  };
}
