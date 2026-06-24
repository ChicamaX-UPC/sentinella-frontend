import * as THREE from "three";

function noise2d(x: number, z: number): number {
  const a = Math.sin(x * 0.022 + z * 0.013) * 0.55;
  const b = Math.cos(x * 0.047 - z * 0.032) * 0.35;
  const c = Math.sin((x + z) * 0.011) * 0.2;
  return a + b + c;
}

/** Altura del terreno en (x, z) — misma lógica que Terrain.tsx. */
export function sampleTerrainHeight(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);
  const xDist = Math.abs(x);
  const basinWidth = z < 20 ? 170 - z * 0.08 : 152 - (z - 20) * 0.45;
  const wallDist = Math.max(0, xDist - basinWidth);
  const backWallDist = Math.max(0, -300 - z);
  const d = Math.sqrt(wallDist * wallDist + backWallDist * backWallDist);
  const protectedBasin = THREE.MathUtils.clamp(d / 45, 0, 1);
  const dropOff = Math.max(0, z - 120);
  const dropY = dropOff * 0.32;
  const ridges = noise2d(x, z) * 20 + noise2d(x * 0.45, z * 0.45) * 30;
  const mountainLift = THREE.MathUtils.smoothstep(dist, 150, 470) * 88;
  const floorLift = THREE.MathUtils.smoothstep(protectedBasin, 0.35, 0.0) * (z < 130 ? 1.2 : 0);
  const dx = (x - 6) / 132;
  const dz = (z - 22) / 94;
  const basinQ = dx * dx + dz * dz;
  const basinMask = THREE.MathUtils.smoothstep(basinQ, 1.05, 0.7);
  const basinCarve = basinMask * 28;
  const rawY = (ridges + mountainLift) * protectedBasin - dropY - 2.2 + floorLift - basinCarve;
  const floorTarget = -6.2 + noise2d(x * 0.5, z * 0.5) * 0.4;
  return THREE.MathUtils.lerp(rawY, floorTarget, basinMask * 0.86);
}
