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

  const insetFactor = 0.84;
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
 * Pequeño labio sobre la corona para marcar el nivel de rebalse.
 */
export function getOverflowLipShape(offset: number = 0): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(4 - offset, 10.4);
  shape.lineTo(4 - offset, 10.6 + offset);
  shape.lineTo(6 + offset, 10.6 + offset);
  shape.lineTo(6 + offset, 10.4);
  return shape;
}
