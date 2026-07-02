import * as THREE from "three";
import { sampleTerrainHeight } from "@/components/DigitalTwin/terrainHeight";
import { getWeirArcCurve, getWeirOutlet } from "./DamGeometry";
import type { SpillFlowShaderBundle } from "./shaders/SpillFlowShader";

export type SpillFlowSystem = {
  update: (
    surfaceY: number,
    spillM: number,
    spillSeverity: number,
    spillFlowM3s: number,
    active: boolean,
    time: number,
    delta: number
  ) => void;
  getImpactPoint: () => THREE.Vector3;
  getChannelPoints: () => THREE.Vector3[];
  dispose: () => void;
};

const GRAVITY = 9.81;
const STEP_M = 2.5;
const MAX_PATH_STEPS = 80;
const INERTIA = 0.72;
/** Exageración visual para que el rebose sea legible desde la cámara aérea (~200 m). */
const SPILL_VIS_WIDTH = 10;
const SPILL_VIS_DROP = 8;

function followTerrainGradient(start: THREE.Vector3, outward: THREE.Vector3): THREE.Vector3[] {
  const points: THREE.Vector3[] = [start.clone()];
  let dir = outward.clone();
  dir.y = 0;
  dir.normalize();

  for (let step = 0; step < MAX_PATH_STEPS; step += 1) {
    const last = points[points.length - 1];
    const hHere = sampleTerrainHeight(last.x, last.z);

    let bestDir = dir.clone();
    let bestDrop = 0;
    const angles = 16;
    for (let a = 0; a < angles; a += 1) {
      const ang = (a / angles) * Math.PI * 2;
      const probe = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      const blend = probe.clone().lerp(dir, INERTIA).normalize();
      const nx = last.x + blend.x * STEP_M;
      const nz = last.z + blend.z * STEP_M;
      const hNext = sampleTerrainHeight(nx, nz);
      const drop = hHere - hNext;
      if (drop > bestDrop) {
        bestDrop = drop;
        bestDir = blend;
      }
    }

    if (bestDrop < 0.02 && step > 4) break;

    const next = last.clone();
    next.x += bestDir.x * STEP_M;
    next.z += bestDir.z * STEP_M;
    next.y = sampleTerrainHeight(next.x, next.z) + 0.22;
    points.push(next);
    dir = bestDir;
  }
  return points;
}

function buildFallbackPath(start: THREE.Vector3, outward: THREE.Vector3, steps = 28): THREE.Vector3[] {
  const points: THREE.Vector3[] = [start.clone()];
  const dir = outward.clone();
  dir.y = 0;
  dir.normalize();
  for (let i = 1; i <= steps; i += 1) {
    const p = start.clone().add(dir.clone().multiplyScalar(i * STEP_M * 1.4));
    p.y = sampleTerrainHeight(p.x, p.z) + 0.22;
    points.push(p);
  }
  return points;
}

function buildBallisticNappe(
  crest: THREE.Vector3,
  outward: THREE.Vector3,
  spillM: number,
  spillSeverity: number
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const v0 = 1.2 + spillM * 1.8 + spillSeverity * 2.5;
  const horiz = outward.clone();
  horiz.y = 0;
  horiz.normalize();
  const steps = 12;
  const dt = 0.08;
  for (let i = 0; i <= steps; i += 1) {
    const t = i * dt;
    const p = crest.clone();
    p.add(horiz.clone().multiplyScalar(v0 * t));
    p.y = crest.y + v0 * 0.15 * t - 0.5 * GRAVITY * t * t;
    if (p.y < sampleTerrainHeight(p.x, p.z) + 0.3) break;
    pts.push(p);
  }
  return pts;
}

function buildChannelGeometry(curve: THREE.CatmullRomCurve3, width: number, depth: number): THREE.BufferGeometry {
  const segments = Math.max(24, Math.floor(curve.getLength() / 1.5));
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const halfW = width * (0.7 + (1 - t) * 0.35);
    const left = p.clone().add(side.clone().multiplyScalar(halfW));
    const right = p.clone().add(side.clone().multiplyScalar(-halfW));
    const center = p.clone();
    center.y -= depth * (0.5 + t * 0.3);

    positions.push(left.x, left.y + 0.05, left.z);
    positions.push(center.x, center.y, center.z);
    positions.push(right.x, right.y + 0.05, right.z);

    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    uvs.push(t, 0, t, 0.5, t, 1);

    if (i < segments) {
      const b = i * 3;
      indices.push(b, b + 1, b + 3, b + 1, b + 4, b + 3);
      indices.push(b + 1, b + 2, b + 4, b + 2, b + 5, b + 4);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildNappeRibbon(points: THREE.Vector3[], width: number): THREE.BufferGeometry {
  if (points.length < 2) return new THREE.BufferGeometry();
  const curve = new THREE.CatmullRomCurve3(points);
  const segments = points.length * 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3(-tangent.z, tangent.y, tangent.x).normalize();
    const half = width * (0.5 + t * 0.4);
    const left = p.clone().add(side.clone().multiplyScalar(half));
    const right = p.clone().add(side.clone().multiplyScalar(-half));
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(t, 0, t, 1);
    if (i < segments) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildPoolGeometry(center: THREE.Vector3, radius: number, segments = 32): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const noise = (a: number) => Math.sin(a * 5.3) * 0.12 + Math.cos(a * 3.7) * 0.08;

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const ang = t * Math.PI * 2;
    const r = radius * (1 + noise(ang));
    const x = center.x + Math.cos(ang) * r;
    const z = center.z + Math.sin(ang) * r;
    const y = center.y + 0.06;
    positions.push(center.x, center.y + 0.04, center.z, x, y, z);
    uvs.push(0.5, 0.5, 0.5 + Math.cos(ang) * 0.5, 0.5 + Math.sin(ang) * 0.5);
    if (i < segments) {
      const b = i * 2;
      indices.push(0, b + 2, b + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildWetRibbon(curve: THREE.CatmullRomCurve3, width: number): THREE.BufferGeometry {
  const segments = 28;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const half = width * (0.8 + (1 - t) * 0.5);
    const left = p.clone().add(side.clone().multiplyScalar(half));
    const right = p.clone().add(side.clone().multiplyScalar(-half));
    left.y = sampleTerrainHeight(left.x, left.z) + 0.04;
    right.y = sampleTerrainHeight(right.x, right.z) + 0.04;
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(t, 0, t, 1);
    if (i < segments) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildCrestLipGeometry(
  surfaceY: number,
  spillM: number,
  spillSeverity: number,
  outward: THREE.Vector3
): THREE.BufferGeometry {
  const arc = getWeirArcCurve();
  const crestPts = arc.getPoints(18);
  const lipWidth = (5 + spillM * 6 + spillSeverity * 8) * (SPILL_VIS_WIDTH / 10);
  const drop = 2.5 + spillM * 5 + spillSeverity * SPILL_VIS_DROP;
  const out = outward.clone();
  out.y = 0;
  out.normalize();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < crestPts.length; i += 1) {
    const top = crestPts[i].clone();
    top.y = surfaceY + 0.06;
    const tangent = i < crestPts.length - 1
      ? crestPts[i + 1].clone().sub(crestPts[i]).normalize()
      : crestPts[i].clone().sub(crestPts[i - 1]).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const bottom = top.clone().add(out.clone().multiplyScalar(drop));
    bottom.y = top.y - drop * 0.55;
    const t = i / Math.max(crestPts.length - 1, 1);
    const half = lipWidth * (0.65 + t * 0.35);
    const tl = top.clone().add(side.clone().multiplyScalar(half));
    const tr = top.clone().add(side.clone().multiplyScalar(-half));
    const bl = bottom.clone().add(side.clone().multiplyScalar(half * 0.7));
    const br = bottom.clone().add(side.clone().multiplyScalar(-half * 0.7));
    const base = i * 4;
    positions.push(tl.x, tl.y, tl.z, tr.x, tr.y, tr.z, bl.x, bl.y, bl.z, br.x, br.y, br.z);
    uvs.push(t, 0, t, 0, t, 1, t, 1);
    if (i < crestPts.length - 1) {
      indices.push(base, base + 1, base + 4, base + 1, base + 5, base + 4);
      indices.push(base + 2, base + 3, base + 6, base + 3, base + 7, base + 6);
      indices.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createSpillFlowSystem(
  scene: THREE.Scene,
  shader: SpillFlowShaderBundle
): SpillFlowSystem {
  const group = new THREE.Group();
  const weir = getWeirOutlet();

  const channelMat = shader.createMaterial();
  const nappeMat = shader.createMaterial();
  const poolMat = shader.createMaterial();
  const crestMat = shader.createMaterial();

  const channelMesh = new THREE.Mesh(new THREE.BufferGeometry(), channelMat);
  channelMesh.renderOrder = 9;
  channelMesh.visible = false;
  group.add(channelMesh);

  const nappeMesh = new THREE.Mesh(new THREE.BufferGeometry(), nappeMat);
  nappeMesh.renderOrder = 12;
  nappeMesh.visible = false;
  group.add(nappeMesh);

  const crestMesh = new THREE.Mesh(new THREE.BufferGeometry(), crestMat);
  crestMesh.renderOrder = 13;
  crestMesh.visible = false;
  group.add(crestMesh);

  const poolMesh = new THREE.Mesh(new THREE.BufferGeometry(), poolMat);
  poolMesh.renderOrder = 7;
  poolMesh.visible = false;
  group.add(poolMesh);

  const wetMat = new THREE.MeshStandardMaterial({
    color: 0x2a3538,
    transparent: true,
    opacity: 0,
    roughness: 0.18,
    metalness: 0.06,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const wetMesh = new THREE.Mesh(new THREE.BufferGeometry(), wetMat);
  wetMesh.renderOrder = 3;
  wetMesh.visible = false;
  group.add(wetMesh);

  scene.add(group);

  let accumulatedVolume = 0;
  let lastKey = "";
  let needsRebuild = true;
  let cachedCurve: THREE.CatmullRomCurve3 | null = null;
  const cachedPoolCenter = new THREE.Vector3();
  const nappeImpact = new THREE.Vector3();
  let channelPoints: THREE.Vector3[] = [];

  const rebuild = (surfaceY: number, spillM: number, spillSeverity: number, spillFlowM3s: number) => {
    const crest = weir.position.clone();
    crest.y = surfaceY + 0.08;
    crest.add(weir.outward.clone().multiplyScalar(2.5));

    const nappePts = buildBallisticNappe(crest, weir.outward, spillM, spillSeverity);
    const channelStart =
      nappePts.length > 1
        ? nappePts[nappePts.length - 1].clone()
        : crest.clone().add(weir.outward.clone().multiplyScalar(12));
    channelStart.y = sampleTerrainHeight(channelStart.x, channelStart.z) + 0.25;
    nappeImpact.copy(channelStart);

    let pathPts = followTerrainGradient(channelStart, weir.outward);
    if (pathPts.length < 3) {
      pathPts = buildFallbackPath(channelStart, weir.outward);
    }

    channelPoints = pathPts;
    const curve = new THREE.CatmullRomCurve3(pathPts, false, "catmullrom", 0.35);
    cachedCurve = curve;
    cachedPoolCenter.copy(pathPts[pathPts.length - 1]);

    const width = (2.8 + spillFlowM3s * 1.2 + spillSeverity * 2.5) * SPILL_VIS_WIDTH;
    const depth = 0.25 + spillSeverity * 0.35;

    channelMesh.geometry.dispose();
    channelMesh.geometry = buildChannelGeometry(curve, width, depth);

    nappeMesh.geometry.dispose();
    const nappeRibbon = nappePts.length >= 2 ? nappePts : [crest, channelStart];
    nappeMesh.geometry = buildNappeRibbon(nappeRibbon, (2.5 + spillSeverity * 3.5) * (SPILL_VIS_WIDTH / 6));

    crestMesh.geometry.dispose();
    crestMesh.geometry = buildCrestLipGeometry(surfaceY, spillM, spillSeverity, weir.outward);

    const poolRadius = (3.5 + accumulatedVolume * 0.008 + spillSeverity * 4) * (SPILL_VIS_WIDTH / 4);
    poolMesh.geometry.dispose();
    poolMesh.geometry = buildPoolGeometry(cachedPoolCenter, poolRadius);

    wetMesh.geometry.dispose();
    wetMesh.geometry = buildWetRibbon(curve, width * 1.4);

    lastKey = `${surfaceY.toFixed(1)}_${spillM.toFixed(2)}_${spillSeverity.toFixed(2)}_${spillFlowM3s.toFixed(2)}`;
    needsRebuild = false;
  };

  return {
    update: (surfaceY, spillM, spillSeverity, spillFlowM3s, active, time, delta) => {
      channelMesh.visible = active;
      nappeMesh.visible = active;
      crestMesh.visible = active;
      poolMesh.visible = active;
      wetMesh.visible = active;

      if (!active) {
        accumulatedVolume = 0;
        wetMat.opacity = 0;
        needsRebuild = true;
        return;
      }

      accumulatedVolume += spillFlowM3s * delta;
      const key = `${surfaceY.toFixed(1)}_${spillM.toFixed(2)}_${spillSeverity.toFixed(2)}_${spillFlowM3s.toFixed(2)}`;
      if (needsRebuild || key !== lastKey) {
        rebuild(surfaceY, spillM, spillSeverity, spillFlowM3s);
      } else if (cachedCurve && accumulatedVolume > 0) {
        const poolRadius = (3.5 + accumulatedVolume * 0.008 + spillSeverity * 4) * (SPILL_VIS_WIDTH / 4);
        poolMesh.geometry.dispose();
        poolMesh.geometry = buildPoolGeometry(cachedPoolCenter, poolRadius);
      }

      const flowSpeed = THREE.MathUtils.clamp(spillFlowM3s / 3, 0.1, 2.5);
      shader.update({
        time,
        flowSpeed,
        spillSeverity,
        foamBoost: 0.35 + spillSeverity * 0.45,
      });

      wetMat.opacity = THREE.MathUtils.clamp(0.18 + spillSeverity * 0.45 + accumulatedVolume * 0.002, 0, 0.65);
    },
    getImpactPoint: () => nappeImpact.clone(),
    getChannelPoints: () => channelPoints.map((p) => p.clone()),
    dispose: () => {
      scene.remove(group);
      channelMesh.geometry.dispose();
      nappeMesh.geometry.dispose();
      crestMesh.geometry.dispose();
      poolMesh.geometry.dispose();
      wetMesh.geometry.dispose();
      wetMat.dispose();
    },
  };
}
