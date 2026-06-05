/**
 * Blueprint §9.2 — posiciones calibradas a la geometría del dique.
 *
 * Referencia de geometría actual:
 *   - Curva del dique (crown) pasa por: (-130, y, 82) → (-70, y, 92) → (0, y, 96) → (70, y, 92) → (130, y, 82)
 *   - Corona a Y ≈ 10.5
 *   - Pie aguas abajo ~ 20 unidades hacia +Z desde la corona
 *   - Pie aguas arriba ~ 20 unidades hacia -Z desde la corona
 *   - Vaso del agua ocupa Z ∈ [-120, ~85] (aguas arriba del dique)
 *   - Superficie del agua en nivel nominal ~ Y 5
 */

export type SensorNodePosition = {
  nodeId: string;
  x: number;
  y: number;
  z: number;
  type: string;
  label: string;
};

export const SENSOR_POSITIONS: SensorNodePosition[] = [
  // Piezómetros — presión de poros en cuerpo y taludes aguas abajo del dique
  // Al pie aguas abajo (Z > crown_z) → Y bajo, cerca del terreno
  { nodeId: "PI-01", x: -80, y: 0.5, z: 112, type: "pressure", label: "Piezómetro 1 — Pie Aguas Abajo Izq" },
  { nodeId: "PI-02", x: -40, y: 5, z: 100, type: "pressure", label: "Piezómetro 2 — Interior Muro Izq" },
  { nodeId: "PI-03", x: 0, y: 0.5, z: 118, type: "pressure", label: "Piezómetro 3 — Pie Aguas Abajo Central" },
  { nodeId: "PI-04", x: 40, y: 5, z: 100, type: "pressure", label: "Piezómetro 4 — Interior Muro Der" },
  { nodeId: "PI-05", x: 80, y: 0.5, z: 112, type: "pressure", label: "Piezómetro 5 — Pie Aguas Abajo Der" },

  // Nivel de Relave — barcaza flotante en el centro del vaso
  { nodeId: "NW-01", x: 0, y: 6.5, z: -30, type: "water_level", label: "Nivel Relave — Barcaza" },

  // Inclinómetros — sobre la corona del dique (siguen la curva del muro)
  { nodeId: "IN-01", x: -80, y: 11.5, z: 91, type: "inclination", label: "Inclinómetro — Corona Izquierda" },
  { nodeId: "IN-02", x: 0, y: 11.5, z: 96, type: "inclination", label: "Inclinómetro — Corona Central" },
  { nodeId: "IN-03", x: 80, y: 11.5, z: 91, type: "inclination", label: "Inclinómetro — Corona Derecha" },

  // pH / Turbidez — poza de decantación (coincide con decantPond en TailingDam.tsx: (-26, 0.45, 58))
  { nodeId: "PH-01", x: -26, y: 1.5, z: 58, type: "ph", label: "pH/Turbidez — Poza Decant." },

  // Pluviómetro — ladera externa del valle, fuera del vaso
  { nodeId: "PV-01", x: -180, y: 26, z: -60, type: "pluviometer", label: "Pluviómetro — Ladera Oeste" },
];
