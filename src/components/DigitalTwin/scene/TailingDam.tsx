import * as THREE from "three";
import { getDamCurve, getDamCrossSection, getOverflowLipShape } from "./DamGeometry";

export type TailingDamVisualState = {
  rainIntensity: number;
  saturation: number;
  safetyFactor: number;
  seepageFlow: number;
  seepageLocation: string;
  freeboard: number;
  showSaturationMap: boolean;
  showFlowVector: boolean;
  time: number;
  /** delta en s (física de caída del derrame). */
  delta?: number;
};

/** Apariencia unificada: agua/relave (no cian vs rojo). */
const SPILL_BASE = 0x5c5954;
const SPILL_EMISS = 0x0f0e0d;

export type TailingDamSystem = {
  update: (state: TailingDamVisualState) => void;
  dispose: () => void;
  basinRadius: number;
};

const seepageTargets: Record<string, THREE.Vector3> = {
  // Alturas calibradas al talud aguas abajo actual (evitan quedar enterrados bajo el terreno).
  "Talud Sur (PI-01)": new THREE.Vector3(-95, 8.2, 122),
  "Base Central (PI-03)": new THREE.Vector3(20, 8.8, 128),
  "Talud Norte (PI-05)": new THREE.Vector3(122, 8.2, 98),
};

function applyDikeIrregularity(geometry: THREE.BufferGeometry, amplitude: number): void {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const mod = Math.sin(angle * 3.2) * amplitude + Math.cos(angle * 5.5) * amplitude * 0.55;
    pos.setXYZ(i, x * (1 + mod), y, z * (1 - mod * 0.6));
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function colorBySafetyFactor(safetyFactor: number): number {
  if (safetyFactor <= 1.0) {
    return 0xef4444;
  }
  if (safetyFactor <= 1.2) {
    return 0xf59e0b;
  }
  return 0x7c6a55;
}

function createDirtTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  
  // Base color
  ctx.fillStyle = "#7c6a55";
  ctx.fillRect(0, 0, 512, 512);
  
  // Noise
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2;
    const c = Math.random() > 0.5 ? "#5a4b3a" : "#8e7d69";
    ctx.fillStyle = c;
    ctx.globalAlpha = Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 1);

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
    const r = Math.random() * 2;
    const v = Math.floor(Math.random() * 255);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.globalAlpha = Math.random() * 0.5;
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }
  
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 1);

  const roughnessMap = new THREE.CanvasTexture(bumpCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(4, 1);

  return { map, bumpMap, roughnessMap };
}

export function createTailingDamSystem(scene: THREE.Scene): TailingDamSystem {
  const group = new THREE.Group();
  const basinRadius = 73;

  const textures = typeof document !== "undefined" ? createDirtTexture() : null;

  const damMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8b7355, 
    roughness: 0.9, 
    metalness: 0.05,
    map: textures?.map || null,
    bumpMap: textures?.bumpMap || null,
    bumpScale: 0.2,
    roughnessMap: textures?.roughnessMap || null,
  });

  const damCurve = getDamCurve();
  const extrudeSettings = { steps: 120, extrudePath: damCurve, bevelEnabled: false };

  const outerDam = new THREE.Mesh(
    new THREE.ExtrudeGeometry(getDamCrossSection(0), extrudeSettings),
    damMaterial
  );
  outerDam.castShadow = true;
  outerDam.receiveShadow = true;
  group.add(outerDam);

  const crown = new THREE.Mesh(
    new THREE.ExtrudeGeometry(getDamCrossSection(0.1), extrudeSettings),
    damMaterial
  );
  crown.position.y = -0.1; // Ajuste para solape
  group.add(crown);

  // Canal vertedero (spillway): pequeña hendidura sobre la corona aguas abajo.
  // Queda dentro del perfil del dique (perfil va de -28 a +28) para no sobresalir.
  const canalShape = new THREE.Shape();
  canalShape.moveTo(-24, 9.8);
  canalShape.lineTo(-18, 9.8);
  canalShape.lineTo(-18, 10.3);
  canalShape.lineTo(-24, 10.3);

  const canalMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0x0f172a,
    emissiveIntensity: 0.2,
    roughness: 0.65,
    metalness: 0.12,
  });
  const canal = new THREE.Mesh(
    new THREE.ExtrudeGeometry(canalShape, extrudeSettings),
    canalMaterial
  );
  canal.visible = false;
  group.add(canal);

  const saturationMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3b2b, // Darker soil
    transparent: true,
    opacity: 0,
    roughness: 0.4, // Wetter is shinier
    metalness: 0.1,
    map: textures?.map || null,
    bumpMap: textures?.bumpMap || null,
    bumpScale: 0.2,
  });
  const saturationOverlay = new THREE.Mesh(
    new THREE.ExtrudeGeometry(getDamCrossSection(0.15), extrudeSettings),
    saturationMaterial
  );
  group.add(saturationOverlay);

  const stressOverlayMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.02,
    emissive: 0x78350f,
    emissiveIntensity: 0.1,
    roughness: 0.4,
    metalness: 0.05,
  });
  const stressOverlay = new THREE.Mesh(
    new THREE.ExtrudeGeometry(getDamCrossSection(0.25), extrudeSettings),
    stressOverlayMaterial
  );
  group.add(stressOverlay);

  const overflowRingMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3532,
    emissive: 0x0a0a0a,
    emissiveIntensity: 0.04,
    transparent: true,
    opacity: 0.02,
    roughness: 0.5,
    metalness: 0.1,
  });
  const overflowRing = new THREE.Mesh(
    new THREE.ExtrudeGeometry(getOverflowLipShape(), extrudeSettings),
    overflowRingMaterial
  );
  group.add(overflowRing);

  const streamCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1.5, -2, 0),
    new THREE.Vector3(3.5, -4.5, 0),
    new THREE.Vector3(5, -6.5, 0),
    new THREE.Vector3(7, -8, 0)
  ]);
  const streamGeo = new THREE.TubeGeometry(streamCurve, 16, 0.4, 8, false);

  const overflowStreams = new THREE.Group();
  const streamMaterial = new THREE.MeshPhysicalMaterial({
    color: SPILL_BASE,
    emissive: SPILL_EMISS,
    emissiveIntensity: 0.14,
    transparent: true,
    opacity: 0.6,
    roughness: 0.22,
    metalness: 0.12,
    transmission: 0.48,
    ior: 1.33,
    thickness: 1.2,
  });
  for (let i = 0; i < 24; i += 1) {
    const mesh = new THREE.Mesh(streamGeo, streamMaterial);
    const t = i / 23;
    const pos = damCurve.getPoint(t);
    const tangent = damCurve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    pos.add(normal.clone().multiplyScalar(-6));
    pos.y = 10.7;
    mesh.position.copy(pos);
    (mesh.userData as { baseY: number }).baseY = pos.y;
    // El streamCurve apunta hacia +x y baja en -y. 
    // Queremos que mire hacia afuera del embalse, que es la dirección normal * -1.
    const lookTarget = pos.clone().add(normal.clone().multiplyScalar(-1));
    mesh.lookAt(lookTarget);
    
    mesh.visible = false;
    overflowStreams.add(mesh);
  }
  // Chorros adicionales, tubo mas grueso: visibles con desborde severo.
  const streamGeoThick = new THREE.TubeGeometry(streamCurve, 20, 0.82, 8, false);
  const overflowStreamsThick = new THREE.Group();
  for (let i = 0; i < 20; i += 1) {
    const mesh = new THREE.Mesh(streamGeoThick, streamMaterial);
    const u = (i + 0.35) / 20;
    const pos = damCurve.getPoint(u);
    const tangent = damCurve.getTangent(u);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const p2 = pos.clone();
    p2.add(normal.clone().multiplyScalar(-6.2));
    p2.y = 10.75;
    mesh.position.copy(p2);
    (mesh.userData as { baseY: number }).baseY = p2.y;
    const lookTarget = p2.clone().add(normal.clone().multiplyScalar(-1));
    mesh.lookAt(lookTarget);
    mesh.visible = false;
    overflowStreamsThick.add(mesh);
  }
  group.add(overflowStreams);
  group.add(overflowStreamsThick);

  // Laminas verticales en talud aguas abajo (cascada literal cuando hay rebose).
  const spillCascades = new THREE.Group();
  const cascadeMat = new THREE.MeshPhysicalMaterial({
    color: SPILL_BASE,
    emissive: SPILL_EMISS,
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.5,
    roughness: 0.2,
    metalness: 0.12,
    transmission: 0.42,
    ior: 1.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (let i = 0; i < 36; i += 1) {
    const t = i / 36;
    const p = damCurve.getPoint(t);
    const tan = damCurve.getTangent(t);
    const normalIn = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const outward = normalIn.clone().multiplyScalar(-1);
    const pOuter = p.clone().add(outward.clone().multiplyScalar(11.5));
    pOuter.y = 8.6;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 15), cascadeMat);
    sheet.position.copy(pOuter);
    (sheet.userData as { baseY: number; baseX: number; baseZ: number }) = {
      baseX: pOuter.x,
      baseY: pOuter.y,
      baseZ: pOuter.z,
    };
    const look = pOuter.clone().add(new THREE.Vector3(0, -7, 0)).add(outward.clone().multiplyScalar(2.5));
    sheet.lookAt(look);
    sheet.visible = false;
    spillCascades.add(sheet);
  }
  group.add(spillCascades);

  const N_SPILL_DROPS = 480;
  const dropPos = new Float32Array(N_SPILL_DROPS * 3);
  const resetSpillDrop = (i: number, tClock: number, rng: number) => {
    const te = (i * 0.127 + tClock * 0.08 + rng) % 1;
    const p0 = damCurve.getPoint(te);
    const tan = damCurve.getTangent(te);
    const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    p0.add(n.clone().multiplyScalar(-(5.0 + (i % 7) * 0.1)));
    p0.y = 10.4 + (i % 5) * 0.04;
    dropPos[i * 3] = p0.x;
    dropPos[i * 3 + 1] = p0.y;
    dropPos[i * 3 + 2] = p0.z;
  };
  for (let i = 0; i < N_SPILL_DROPS; i += 1) {
    resetSpillDrop(i, 0, (i * 0.173) % 1);
  }
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute("position", new THREE.BufferAttribute(dropPos, 3));
  const dropMat = new THREE.PointsMaterial({
    color: SPILL_BASE,
    size: 0.42,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const spillDrops = new THREE.Points(dropGeo, dropMat);
  spillDrops.frustumCulled = false;
  group.add(spillDrops);

  const emergencyBeacon = new THREE.PointLight(0xef4444, 0, 45, 2);
  emergencyBeacon.position.set(0, 14, 0);
  group.add(emergencyBeacon);

  const seepageSource = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshStandardMaterial({ 
      color: 0x60a5fa,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.3,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true, 
      opacity: 0.75,
      depthWrite: false,
    })
  );
  seepageSource.rotation.x = -Math.PI / 2;
  seepageSource.visible = false;
  group.add(seepageSource);

  // A flowing stream that goes downwards
  const seepageCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(2.5, -2.5, 0),
    new THREE.Vector3(4.5, -3.0, 0),
  ]);
  const seepageFlowGeo = new THREE.TubeGeometry(seepageCurve, 16, 0.6, 8, false);
  const seepageFlow = new THREE.Mesh(
    seepageFlowGeo,
    new THREE.MeshStandardMaterial({ 
      color: 0x93c5fd,
      emissive: 0x1e40af,
      emissiveIntensity: 0.4,
      roughness: 0.08, 
      metalness: 0.12, 
      transparent: true, 
      opacity: 0.72 
    })
  );
  seepageFlow.visible = false;
  group.add(seepageFlow);

  const flowVector = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 3.5, 0), 16, 0x93c5fd, 3, 1.5);
  flowVector.visible = false;
  group.add(flowVector);

  const decantPond = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 0.7, 24),
    new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.38, metalness: 0.08 })
  );
  decantPond.position.set(-26, 0.45, 58);
  group.add(decantPond);

  const pipeline = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 58, 16),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.3 })
  );
  pipeline.rotation.z = Math.PI / 8;
  pipeline.position.set(40, 1.2, 50);
  group.add(pipeline);

  // ------------------------------------------------------------------
  // Geomembrana HDPE: lámina plástica negra visible sobre parte del
  // talud del dique (igual que en la foto de referencia). Se pinta
  // como parches desplegados sobre un cuarto del perímetro.
  // ------------------------------------------------------------------
  const linerMat = new THREE.MeshStandardMaterial({
    color: 0x111216,
    roughness: 0.35,
    metalness: 0.18,
    side: THREE.DoubleSide,
  });
  const linerGroup = new THREE.Group();
  const linerSamples = 18;
  const linerStart = 0.58; // ~este del dique
  const linerEnd = 0.88;
  for (let i = 0; i < linerSamples; i += 1) {
    const t = linerStart + ((linerEnd - linerStart) * i) / (linerSamples - 1);
    const p = damCurve.getPoint(t);
    const tangent = damCurve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 11.5), linerMat);
    sheet.position.copy(p);
    // Que caiga sobre el talud interior (hacia el agua).
    sheet.position.add(normal.clone().multiplyScalar(2.2));
    sheet.position.y = 8.6;
    sheet.lookAt(p.x + normal.x * 6, 1.5, p.z + normal.z * 6);
    sheet.rotateZ((Math.random() - 0.5) * 0.05);
    linerGroup.add(sheet);
  }
  group.add(linerGroup);

  // Pila de arena al lado del liner (como en la foto).
  const sandPile = new THREE.Mesh(
    new THREE.ConeGeometry(8, 5, 16),
    new THREE.MeshStandardMaterial({ color: 0xc7a674, roughness: 0.95 })
  );
  const pileT = 0.72;
  const pilePos = damCurve.getPoint(pileT);
  const pileTan = damCurve.getTangent(pileT);
  const pileNormal = new THREE.Vector3(-pileTan.z, 0, pileTan.x).normalize();
  sandPile.position.copy(pilePos);
  sandPile.position.add(pileNormal.clone().multiplyScalar(14));
  sandPile.position.y = 2.5;
  sandPile.castShadow = true;
  group.add(sandPile);

  scene.add(group);

  return {
    basinRadius,
    update: (state) => {
      const d = THREE.MathUtils.clamp(state.delta ?? 0.016, 0.001, 0.12);
      const rain = THREE.MathUtils.clamp(state.rainIntensity, 0, 80);
      const saturation = THREE.MathUtils.clamp(state.saturation, 0, 1);
      const seepageNorm = THREE.MathUtils.clamp(state.seepageFlow / 50, 0, 1);
      // Borde libre (m) = cota corona (786 msnm) - cota espejo. Negativo = agua SOBRE la corona = desborde.
      // -1,5 m implica 1,5 m de rebose: severidad 1,0. Con margen positivo NO debe verse como desborde.
      const spillM = Math.max(0, -state.freeboard);
      const spillSeverity = THREE.MathUtils.clamp(spillM / 1.5, 0, 1);
      const nearCrownStress =
        state.freeboard > 0 && state.freeboard < 1.2
          ? THREE.MathUtils.clamp(1 - state.freeboard / 1.2, 0, 1)
          : 0;
      const overflowDisplay = Math.max(spillSeverity, nearCrownStress * 0.55);

      const hazardColor = colorBySafetyFactor(state.safetyFactor);
      (outerDam.material as THREE.MeshStandardMaterial).color.set(hazardColor);

      canal.visible = rain >= 20;
      canalMaterial.color.set(rain >= 45 ? 0xef4444 : rain >= 30 ? 0xf59e0b : 0x334155);
      canalMaterial.emissive.set(rain >= 45 ? 0x7f1d1d : rain >= 30 ? 0x78350f : 0x0f172a);
      canalMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.2, 1.1, rain / 80);

      saturationOverlay.visible = state.showSaturationMap;
      saturationMaterial.opacity = state.showSaturationMap ? 0.05 + saturation * 0.85 : 0;
      saturationMaterial.color.set(saturation > 0.8 ? 0x1f160e : saturation > 0.6 ? 0x2b1e12 : 0x3d2e1f);

      stressOverlayMaterial.opacity = THREE.MathUtils.clamp((1.4 - state.safetyFactor) * 0.22, 0.01, 0.42);
      stressOverlayMaterial.color.set(state.safetyFactor <= 1 ? 0xef4444 : state.safetyFactor <= 1.2 ? 0xf59e0b : 0x22c55e);
      stressOverlayMaterial.emissive.set(state.safetyFactor <= 1 ? 0x7f1d1d : 0x78350f);
      stressOverlayMaterial.emissiveIntensity = THREE.MathUtils.clamp((1.5 - state.safetyFactor) * 0.9, 0.08, 0.85);

      overflowRingMaterial.opacity = spillSeverity > 0.02 ? 0.14 + spillSeverity * 0.58 : 0.04 + nearCrownStress * 0.32;
      overflowRingMaterial.color.setHex(0x3a3532);
      overflowRingMaterial.emissive.setHex(0x141210);
      overflowRingMaterial.emissiveIntensity = 0.05 + spillSeverity * 0.65 + nearCrownStress * 0.35;
      overflowRing.scale.setScalar(1 + Math.sin(state.time * 2.6) * overflowDisplay * 0.05);

      streamMaterial.emissiveIntensity = 0.1 + spillSeverity * 0.35;
      const pulse = (idx: number) => state.time * 4.0 + idx;
      const setStreams = (children: THREE.Object3D[], mult: number) => {
        children.forEach((child, idx) => {
          const stream = child as THREE.Mesh;
          stream.visible = spillSeverity > 0.03;
          const speed = pulse(idx);
          const baseY = (stream.userData as { baseY?: number }).baseY ?? 10.7;
          stream.position.y = baseY + 0.14 * Math.sin(speed * 1.45);
          const scale = mult * (0.72 + spillSeverity * 2.1 + Math.sin(speed) * 0.14);
          stream.scale.set(scale, scale, scale);
          const mat = stream.material as THREE.MeshPhysicalMaterial;
          mat.opacity = (0.58 + Math.sin(speed * 1.5) * 0.2) * (0.4 + spillSeverity);
        });
      };
      setStreams(overflowStreams.children, 1);
      setStreams(overflowStreamsThick.children, 1.12);

      (cascadeMat as THREE.MeshPhysicalMaterial).opacity = 0.32 + spillSeverity * 0.5;
      (cascadeMat as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.08 + spillSeverity * 0.38;
      spillCascades.children.forEach((child, idx) => {
        const sh = child as THREE.Mesh;
        sh.visible = spillSeverity > 0.06;
        const ud = sh.userData as { baseY?: number; baseX?: number; baseZ?: number };
        if (ud.baseY !== undefined) {
          sh.position.y = ud.baseY + 0.32 * Math.sin(pulse(idx) * 0.55 + state.time * 3.4);
        }
        sh.scale.set(
          0.4 + spillSeverity * 0.95,
          0.35 + spillSeverity * 1.05 + Math.sin(pulse(idx) * 0.6) * 0.04,
          0.5 + spillSeverity * 0.4
        );
      });

      const fallSpeed = (10 + 26 * spillSeverity) * d;
      dropMat.opacity = spillSeverity > 0.04 ? 0.15 + spillSeverity * 0.52 : 0;
      spillDrops.visible = spillSeverity > 0.035;
      for (let di = 0; di < N_SPILL_DROPS; di += 1) {
        const ax = di * 3;
        dropPos[ax + 1] -= fallSpeed;
        dropPos[ax] += Math.sin(state.time * 2.1 + di * 0.31) * 0.08 * d;
        dropPos[ax + 2] += Math.cos(state.time * 1.9 + di * 0.27) * 0.08 * d;
        if (dropPos[ax + 1] < 0.8) {
          resetSpillDrop(di, state.time, Math.random());
        }
      }
      (dropGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      emergencyBeacon.intensity =
        spillSeverity > 0.04 || state.safetyFactor <= 1.1
          ? (1.2 + Math.sin(state.time * 6) * 0.7) * Math.max(spillSeverity, THREE.MathUtils.clamp((1.2 - state.safetyFactor) / 0.3, 0, 1))
          : 0;

      const seepagePosition = seepageTargets[state.seepageLocation] ?? seepageTargets["Base Central (PI-03)"];
      seepageSource.position.copy(seepagePosition);
      // Lo dejamos ligeramente sobre el talud para evitar z-fighting.
      seepageSource.position.y += 0.15;
      
      seepageSource.visible = seepageNorm > 0.005;
      const seepageMaterial = seepageSource.material as THREE.MeshStandardMaterial;
      seepageMaterial.opacity = 0.4 + seepageNorm * 0.45;
      // puddle scales out
      seepageSource.scale.setScalar(0.65 + seepageNorm * 4.2);

      seepageFlow.visible = seepageNorm > 0.005;
      seepageFlow.position.copy(seepagePosition);
      // Let the stream curve down and outwards
      const flowScale = 0.6 + seepageNorm * 1.9;
      seepageFlow.scale.set(flowScale, flowScale, flowScale);
      
      // Face the stream away from the center
      const angleFromCenter = Math.atan2(seepagePosition.z, seepagePosition.x);
      seepageFlow.rotation.y = -angleFromCenter;
      seepageFlow.position.y += 0.12;

      flowVector.visible = state.showFlowVector;
      flowVector.position.set(0, 3.5, 0);
      flowVector.setLength(12 + rain * 0.2, 3, 1.4);
      flowVector.setDirection(new THREE.Vector3(1, -0.2, Math.sin(state.time * 0.2) * 0.3).normalize());
      flowVector.setColor(new THREE.Color(rain >= 45 ? 0xef4444 : 0x93c5fd));
    },
    dispose: () => {
      scene.remove(group);
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if ("geometry" in mesh && mesh.geometry) {
          mesh.geometry.dispose();
        }
        const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else if (material) {
          material.dispose();
        }
      });
    },
  };
}
