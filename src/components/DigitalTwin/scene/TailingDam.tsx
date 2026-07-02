import * as THREE from "three";
import { SATURATION_CRITICAL, SEEPAGE_CRITICAL_L_MIN } from "@/components/DigitalTwin/constants";
import { getCrownBandSection, getDamCurve, getDamCrossSection, getDamOuterShellSection, getDamSlopeShellSection } from "./DamGeometry";
import { computeStructuralAlert, structuralStressOpacity } from "./AlertSemantics";

export type TailingDamVisualState = {
  rainIntensity: number;
  saturation: number;
  safetyFactor: number;
  seepageFlow: number;
  seepageLocation: string;
  freeboard: number;
  spillSeverity: number;
  surfaceY: number;
  piezometricPressure: number;
  showSaturationMap: boolean;
  showFlowVector: boolean;
  time: number;
  delta?: number;
};

export type TailingDamSystem = {
  update: (state: TailingDamVisualState) => void;
  dispose: () => void;
  basinRadius: number;
};

const DAM_BASE = 0x8b7355;
const CROWN_GREY = 0xa8a8a8;

const seepageTargets: Record<string, THREE.Vector3> = {
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

function createDirtTexture(): { bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; map: THREE.CanvasTexture } {
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = 256;
  colorCanvas.height = 256;
  const cCtx = colorCanvas.getContext("2d")!;
  cCtx.fillStyle = "#9a7f5a";
  cCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8000; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    cCtx.fillStyle = Math.random() > 0.5 ? "#7a6345" : "#b89a72";
    cCtx.globalAlpha = Math.random() * 0.35;
    cCtx.fillRect(x, y, 2 + Math.random() * 3, 1 + Math.random() * 2);
  }
  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 2);

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext("2d")!;
  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12000; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = Math.floor(Math.random() * 255);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.globalAlpha = Math.random() * 0.4;
    bCtx.beginPath();
    bCtx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
    bCtx.fill();
  }
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);
  const roughnessMap = bumpMap.clone();
  return { bumpMap, roughnessMap, map };
}

export function createTailingDamSystem(scene: THREE.Scene): TailingDamSystem {
  const group = new THREE.Group();
  const basinRadius = 73;
  const textures = typeof document !== "undefined" ? createDirtTexture() : null;

  const damMaterial = new THREE.MeshStandardMaterial({
    color: DAM_BASE,
    map: textures?.map ?? null,
    roughness: 0.94,
    metalness: 0.02,
    bumpMap: textures?.bumpMap ?? null,
    bumpScale: 0.22,
    roughnessMap: textures?.roughnessMap ?? null,
  });

  const crownMaterial = new THREE.MeshStandardMaterial({
    color: CROWN_GREY,
    roughness: 0.82,
    metalness: 0.06,
  });

  const damCurve = getDamCurve();
  const extrudeSettings = { steps: 120, extrudePath: damCurve, bevelEnabled: false };

  const outerGeo = new THREE.ExtrudeGeometry(getDamOuterShellSection(0), extrudeSettings);
  applyDikeIrregularity(outerGeo, 0.012);
  const outerDam = new THREE.Mesh(outerGeo, damMaterial);
  outerDam.castShadow = true;
  outerDam.receiveShadow = true;
  group.add(outerDam);

  const crownBand = new THREE.Mesh(
    new THREE.ExtrudeGeometry(getCrownBandSection(), extrudeSettings),
    crownMaterial
  );
  crownBand.castShadow = true;
  group.add(crownBand);

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
  const canal = new THREE.Mesh(new THREE.ExtrudeGeometry(canalShape, extrudeSettings), canalMaterial);
  canal.visible = false;
  group.add(canal);

  const saturationMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3b2b,
    transparent: true,
    opacity: 0,
    roughness: 0.4,
    metalness: 0.1,
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
    depthWrite: false,
  });
  const stressOverlay = new THREE.Mesh(
    new THREE.ExtrudeGeometry(getDamSlopeShellSection(0.15), extrudeSettings),
    stressOverlayMaterial
  );
  group.add(stressOverlay);

  const seepageSource = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 24),
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

  const seepageCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(2.5, -2.5, 0),
    new THREE.Vector3(4.5, -3.0, 0),
  ]);
  const seepageFlow = new THREE.Mesh(
    new THREE.TubeGeometry(seepageCurve, 16, 0.5, 8, false),
    new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x1e40af,
      emissiveIntensity: 0.4,
      roughness: 0.08,
      metalness: 0.12,
      transparent: true,
      opacity: 0.72,
    })
  );
  seepageFlow.visible = false;
  group.add(seepageFlow);

  const flowVector = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 3.5, 0), 16, 0x93c5fd, 3, 1.5);
  flowVector.visible = false;
  group.add(flowVector);

  const linerMat = new THREE.MeshStandardMaterial({
    color: 0x2a2520,
    roughness: 0.92,
    metalness: 0.02,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
  });
  const linerGroup = new THREE.Group();
  linerGroup.visible = false;
  for (let i = 0; i < 18; i += 1) {
    const t = 0.58 + ((0.88 - 0.58) * i) / 17;
    const p = damCurve.getPoint(t);
    const tangent = damCurve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 11.5), linerMat);
    sheet.position.copy(p).add(normal.clone().multiplyScalar(2.2));
    sheet.position.y = 8.6;
    sheet.lookAt(p.x + normal.x * 6, 1.5, p.z + normal.z * 6);
    linerGroup.add(sheet);
  }
  group.add(linerGroup);

  scene.add(group);

  return {
    basinRadius,
    update: (state) => {
      const rain = THREE.MathUtils.clamp(state.rainIntensity, 0, 80);
      const saturation = THREE.MathUtils.clamp(state.saturation, 0, 1);
      const seepageNorm = THREE.MathUtils.clamp(state.seepageFlow / 50, 0, 1);
      const structural = computeStructuralAlert(state.safetyFactor);

      damMaterial.color.setHex(DAM_BASE);
      crownMaterial.color.setHex(CROWN_GREY);

      canal.visible = rain >= 20;
      canalMaterial.color.set(rain >= 45 ? 0x64748b : rain >= 30 ? 0x52525b : 0x475569);
      canalMaterial.emissive.set(rain >= 45 ? 0x1e293b : 0x1e293b);
      canalMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.12, 0.45, rain / 80);

      saturationOverlay.visible = state.showSaturationMap;
      const satCritical = state.piezometricPressure >= SATURATION_CRITICAL || saturation >= SATURATION_CRITICAL;
      saturationMaterial.opacity = state.showSaturationMap ? 0.05 + saturation * 0.85 : 0;
      saturationMaterial.emissiveIntensity = satCritical ? 0.55 + Math.sin(state.time * 4) * 0.2 : 0.1;
      saturationMaterial.color.set(satCritical ? 0x1a0f08 : saturation > 0.6 ? 0x2b1e12 : 0x3d2e1f);

      stressOverlayMaterial.opacity =
        state.safetyFactor <= 1.25 ? structuralStressOpacity(state.safetyFactor) : 0;
      stressOverlayMaterial.color.set(
        structural.fsCritical ? 0xef4444 : structural.fsWarning ? 0xf59e0b : 0x22c55e
      );
      stressOverlayMaterial.emissive.set(structural.fsCritical ? 0x7f1d1d : 0x78350f);
      stressOverlayMaterial.emissiveIntensity = THREE.MathUtils.clamp(
        (1.5 - state.safetyFactor) * 0.9,
        0.08,
        structural.fsCritical ? 0.85 : 0.45
      );

      const seepagePosition = seepageTargets[state.seepageLocation] ?? seepageTargets["Base Central (PI-03)"];
      seepageSource.position.copy(seepagePosition);
      seepageSource.position.y += 0.15;

      const seepageCritical = state.seepageFlow >= SEEPAGE_CRITICAL_L_MIN;
      seepageSource.visible = seepageNorm > 0.005;
      const seepageMaterial = seepageSource.material as THREE.MeshStandardMaterial;
      seepageMaterial.color.set(seepageCritical ? 0x38bdf8 : 0x60a5fa);
      seepageMaterial.emissive.set(seepageCritical ? 0x0c4a6e : 0x1d4ed8);
      seepageMaterial.emissiveIntensity = seepageCritical ? 0.9 + Math.sin(state.time * 5) * 0.3 : 0.3;
      seepageMaterial.opacity = 0.4 + seepageNorm * 0.45;
      seepageSource.scale.setScalar(0.65 + seepageNorm * 4.2);

      seepageFlow.visible = seepageNorm > 0.005;
      seepageFlow.position.copy(seepagePosition);
      const flowScale = 0.6 + seepageNorm * 1.9;
      seepageFlow.scale.set(flowScale, flowScale, flowScale);
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
        if (mesh.geometry) mesh.geometry.dispose();
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
