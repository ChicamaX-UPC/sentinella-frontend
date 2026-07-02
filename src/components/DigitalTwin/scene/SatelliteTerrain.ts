import * as THREE from "three";
import { BOWL_CX, BOWL_CZ } from "@/components/DigitalTwin/constants";

/** Centro geográfico del depósito (MonitoringDemoDataSeeder). */
export const DAM_CENTER_LAT = -7.9212;
export const DAM_CENTER_LNG = -78.514;

const TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TILE_SIZE = 256;
const TERRAIN_EXTENT_M = 920;

const METERS_PER_DEG_LAT = 111_320;
const metersPerDegLng = (lat: number) => METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

export type SatelliteLoadOptions = {
  zoom?: number;
  grid?: number;
  applyBasinBlend?: boolean;
};

function lngLatToTile(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

function worldToLngLat(x: number, z: number): { lng: number; lat: number } {
  const lng = DAM_CENTER_LNG + (x - BOWL_CX) / metersPerDegLng(DAM_CENTER_LAT);
  const lat = DAM_CENTER_LAT - (z - BOWL_CZ) / METERS_PER_DEG_LAT;
  return { lng, lat };
}

function lngLatToWorld(lng: number, lat: number): { x: number; z: number } {
  const x = BOWL_CX + (lng - DAM_CENTER_LNG) * metersPerDegLng(DAM_CENTER_LAT);
  const z = BOWL_CZ - (lat - DAM_CENTER_LAT) * METERS_PER_DEG_LAT;
  return { x, z };
}

async function fetchTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  const url = TILE_URL.replace("{z}", String(z)).replace("{y}", String(y)).replace("{x}", String(x));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function applyBasinBlend(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const half = TERRAIN_EXTENT_M / 2;
  const cx = ((BOWL_CX + half) / TERRAIN_EXTENT_M) * width;
  const cz = ((BOWL_CZ + half) / TERRAIN_EXTENT_M) * height;
  const rx = (132 / TERRAIN_EXTENT_M) * width;
  const rz = (94 / TERRAIN_EXTENT_M) * height;

  const grd = ctx.createRadialGradient(
    cx,
    cz,
    Math.min(rx, rz) * 0.4,
    cx,
    cz,
    Math.max(rx, rz) * 0.95
  );
  grd.addColorStop(0, "rgba(140, 128, 105, 0.45)");
  grd.addColorStop(0.6, "rgba(130, 120, 100, 0.18)");
  grd.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
}

export type SatelliteTerrainResult = {
  texture: THREE.CanvasTexture | null;
  loaded: boolean;
};

async function stitchTiles(options: SatelliteLoadOptions): Promise<SatelliteTerrainResult> {
  if (typeof document === "undefined") {
    return { texture: null, loaded: false };
  }

  const zoom = options.zoom ?? 17;
  const grid = options.grid ?? 4;
  const applyBlend = options.applyBasinBlend ?? true;

  const center = lngLatToTile(DAM_CENTER_LNG, DAM_CENTER_LAT, zoom);
  const startX = center.x - Math.floor(grid / 2);
  const startY = center.y - Math.floor(grid / 2);
  const canvasW = TILE_SIZE * grid;
  const canvasH = TILE_SIZE * grid;
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { texture: null, loaded: false };
  }

  let anyOk = false;
  const fetches: Promise<void>[] = [];
  for (let dy = 0; dy < grid; dy += 1) {
    for (let dx = 0; dx < grid; dx += 1) {
      const tx = startX + dx;
      const ty = startY + dy;
      fetches.push(
        fetchTile(zoom, tx, ty).then((img) => {
          if (img) {
            ctx.drawImage(img, dx * TILE_SIZE, dy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            anyOk = true;
          }
        })
      );
    }
  }
  await Promise.all(fetches);

  if (!anyOk) {
    return { texture: null, loaded: false };
  }

  if (applyBlend) {
    applyBasinBlend(ctx, canvasW, canvasH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  return { texture, loaded: true };
}

/**
 * Descarga tiles ESRI World Imagery y los cose en una textura para el terreno 920×920 m.
 * Fallback silencioso si no hay red o CORS bloquea.
 */
export async function loadSatelliteTexture(
  options?: SatelliteLoadOptions
): Promise<SatelliteTerrainResult> {
  return stitchTiles({ zoom: 17, grid: 4, applyBasinBlend: true, ...options });
}

/** Falda horizonte: mosaico zoom 14 (~4 km) sin blend del vaso. */
export async function loadSatelliteSkirtTexture(): Promise<SatelliteTerrainResult> {
  return stitchTiles({ zoom: 14, grid: 4, applyBasinBlend: false });
}

/** Mapea posición mundial XZ al UV [0,1] del plano de terreno. */
export function worldToTerrainUv(x: number, z: number): { u: number; v: number } {
  const half = TERRAIN_EXTENT_M / 2;
  return {
    u: THREE.MathUtils.clamp((x + half) / TERRAIN_EXTENT_M, 0, 1),
    v: THREE.MathUtils.clamp((z + half) / TERRAIN_EXTENT_M, 0, 1),
  };
}

export { worldToLngLat, lngLatToWorld };
