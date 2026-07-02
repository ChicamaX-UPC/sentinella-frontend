import * as THREE from "three";

/**
 * Curva de dique perimetral tipo "pista" (ovalado alargado, estilo F1).
 * Se usa cerrada para envolver todo el embalse.
 */
export const DAM_ABUTMENT_LEFT = { x: -220, z: 24 };
export const DAM_ABUTMENT_RIGHT = { x: 220, z: 24 };

export function getDamCurve(): THREE.CatmullRomCurve3 {
  // Geometría de tranque más cercana a fotos reales:
  // alargada, irregular y no perfectamente circular.
  const rx = 138;
  const rz = 96;
  const cx = 6;
  const cz = 22;
  const points: THREE.Vector3[] = [];
  const segments = 56;
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    const wavex = Math.sin(a * 3.1) * 7 + Math.cos(a * 1.7) * 4;
    const wavez = Math.cos(a * 2.5) * 6 + Math.sin(a * 1.9) * 3;
    points.push(
      new THREE.Vector3(
        cx + Math.cos(a) * (rx + wavex),
        0,
        cz + Math.sin(a) * (rz + wavez)
      )
    );
  }
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.5);
}

/**
 * Forma interna del agua: "pista" más pequeña dentro del dique.
 */
export function getLakeShape(): THREE.Shape {
  const shape = new THREE.Shape();
  // Derivamos el agua del mismo contorno del dique (inset hacia el centro del vaso).
  // El Shape vive en XY; en WaterPlane se hace `rotateX(-PI/2)`, así que un vértice
  // local (sx, sy, 0) pasa a (sx, 0, -sy) en mundo. La geometría del dique vive en XZ
  // con y=0, así que el segundo eje del Shape debe ser **-Z mundial** para que el
  // agua quede alineada con el anillo (antes sy=z y quedaba el espejo, “salida” del vaso).
  const damPoints = getDamCurve().getPoints(180);
  let cx = 0;
  let cz = 0;
  for (const p of damPoints) {
    cx += p.x;
    cz += p.z;
  }
  cx /= damPoints.length;
  cz /= damPoints.length;

  const insetFactor = 0.91;
  const insetX = (px: number) => cx + (px - cx) * insetFactor;
  const insetZ = (pz: number) => cz + (pz - cz) * insetFactor;
  const shapeY = (pz: number) => -insetZ(pz);

  const p0 = damPoints[0];
  shape.moveTo(insetX(p0.x), shapeY(p0.z));
  for (let i = 1; i < damPoints.length; i += 1) {
    const p = damPoints[i];
    shape.lineTo(insetX(p.x), shapeY(p.z));
  }

  return shape;
}

/**
 * Perfil trapezoidal del dique (visto desde un extremo del valle).
 * x: transversal al valle (- = aguas abajo, + = aguas arriba hacia el relave)
 * y: altura desde el pie hasta la corona
 */
export function getDamCrossSection(offset: number = 0): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-28 - offset, -12);           // pie exterior (enterrado)
  shape.lineTo(-5 - offset, 10.5 + offset);  // corona exterior
  shape.lineTo(5 + offset, 10.5 + offset);   // corona interior
  shape.lineTo(28 + offset, -12);            // pie interior
  return shape;
}

/**
 * Pequeño labio en corona **exterior** (aguas abajo) donde rebalsa el relave.
 */
export function getOverflowLipShape(offset: number = 0): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-6 - offset, 10.35);
  shape.lineTo(-6 - offset, 10.7 + offset);
  shape.lineTo(-4 - offset, 10.7 + offset);
  shape.lineTo(-4 - offset, 10.35);
  return shape;
}

/**
 * Solo talud exterior del dique — evita el aspecto de "anillos concéntricos".
 */
export function getDamOuterShellSection(offset: number = 0): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-28 - offset, -12);
  shape.lineTo(-4.2 - offset, 10.58 + offset * 0.12);
  shape.lineTo(-6.5 - offset, 9.6);
  shape.lineTo(-28 - offset, -12);
  return shape;
}

/** Cara exterior del talud (sin corona) — overlay estructural FS. */
export function getDamSlopeShellSection(offset: number = 0): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-28 - offset, -12);
  shape.lineTo(-5 - offset, 9.75 + offset * 0.2);
  shape.lineTo(-6.2 - offset, 8.5);
  shape.lineTo(-28 - offset, -12);
  return shape;
}

/** Banda superior de corona (gris claro, blueprint §9.2). */
export function getCrownBandSection(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-6, 9.85);
  shape.lineTo(-6, 10.55);
  shape.lineTo(6, 10.55);
  shape.lineTo(6, 9.85);
  return shape;
}

/** Arco del vertedero en el punto más aguas abajo del dique (Z máximo). */
export function findWeirParameter(): number {
  const full = getDamCurve();
  let bestT = 0.25;
  let bestZ = -Infinity;
  for (let i = 0; i <= 80; i += 1) {
    const t = i / 80;
    const p = full.getPoint(t);
    if (p.z > bestZ) {
      bestZ = p.z;
      bestT = t;
    }
  }
  return bestT;
}

export function getWeirArcCurve(): THREE.CatmullRomCurve3 {
  const full = getDamCurve();
  const center = findWeirParameter();
  const span = 0.07;
  const points: THREE.Vector3[] = [];
  const segments = 20;
  for (let i = 0; i <= segments; i += 1) {
    const t = THREE.MathUtils.clamp(center + (i / segments - 0.5) * span * 2, 0, 1);
    points.push(full.getPoint(t));
  }
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
}

export function getWeirOutlet(): { position: THREE.Vector3; outward: THREE.Vector3; tangent: THREE.Vector3 } {
  const full = getDamCurve();
  const t = findWeirParameter();
  const position = full.getPoint(t);
  const tangent = full.getTangent(t).normalize();
  // Aguas abajo: desde el centro del vaso hacia el vertedero (no la normal del arco, que puede apuntar al interior).
  const basinCenter = new THREE.Vector3(6, 0, 22);
  const outward = position.clone().sub(basinCenter);
  outward.y = 0;
  if (outward.lengthSq() < 0.01) {
    outward.set(0, 0, 1);
  } else {
    outward.normalize();
  }
  return { position: position.clone(), outward, tangent };
}

/** Extensión del lago hacia el vertedero cuando hay rebose. */
export function getOverflowSpillShape(spreadM: number): THREE.Shape {
  const base = getLakeShape();
  if (spreadM <= 0.01) {
    return base;
  }
  const { position, outward } = getWeirOutlet();
  const spill = new THREE.Shape();
  const pts = base.getPoints(120);
  spill.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    spill.lineTo(pts[i].x, pts[i].y);
  }
  const wx = position.x;
  const wz = -position.z;
  const visualSpread = spreadM * 14;
  const ox = outward.x * visualSpread;
  const oz = -outward.z * visualSpread;
  spill.lineTo(wx + ox * 0.6, wz + oz * 0.6);
  spill.lineTo(wx + ox, wz + oz);
  spill.lineTo(wx + ox * 0.35, wz + oz * 0.2);
  spill.closePath();
  return spill;
}
