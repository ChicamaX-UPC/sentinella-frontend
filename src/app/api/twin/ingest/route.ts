import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server/cookie-names";
import { getSentinellaGatewayRestPrefix } from "@/lib/server/api-origin";

/**
 * BFF de ingesta del gemelo digital: recibe lotes de lecturas simuladas del navegador,
 * añade la clave interna (server-side, nunca expuesta al cliente) y las reenvía una a una
 * al gateway `POST /api/v1/monitoring/readings/ingest`, que las republica a RabbitMQ.
 * Requiere sesión activa (cookie de acceso) para evitar abuso del endpoint.
 */

type IngestReading = {
  nodeId: string;
  timestamp: string;
  sensorType: string;
  value: number;
  unit: string;
  status: string;
};

const MAX_BATCH = 20;

function getInternalServiceKey(): string {
  return process.env.SENTINELLA_INTERNAL_SERVICE_KEY?.trim() || "sentinella-internal-dev";
}

function isValidReading(r: unknown): r is IngestReading {
  if (typeof r !== "object" || r === null) {
    return false;
  }
  const o = r as Record<string, unknown>;
  return (
    typeof o.nodeId === "string" &&
    /^[0-9a-f-]{36}$/i.test(o.nodeId) &&
    typeof o.timestamp === "string" &&
    typeof o.sensorType === "string" &&
    typeof o.value === "number" &&
    Number.isFinite(o.value) &&
    typeof o.unit === "string" &&
    typeof o.status === "string"
  );
}

export async function POST(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido" }, { status: 400 });
  }

  const rawReadings = (body as { readings?: unknown })?.readings;
  if (!Array.isArray(rawReadings) || rawReadings.length === 0) {
    return NextResponse.json({ message: "Se requiere readings[]" }, { status: 400 });
  }
  const readings = rawReadings.filter(isValidReading).slice(0, MAX_BATCH);
  if (readings.length === 0) {
    return NextResponse.json({ message: "Ninguna lectura válida" }, { status: 400 });
  }

  const target = `${getSentinellaGatewayRestPrefix()}/monitoring/readings/ingest`;
  const headers = {
    "Content-Type": "application/json",
    "X-Internal-Service-Key": getInternalServiceKey(),
  };

  let accepted = 0;
  try {
    for (const reading of readings) {
      const res = await fetch(target, {
        method: "POST",
        headers,
        body: JSON.stringify({
          nodeId: reading.nodeId,
          timestamp: reading.timestamp,
          sensorType: reading.sensorType,
          value: reading.value,
          unit: reading.unit,
          status: reading.status,
          rawPayload: JSON.stringify({ source: "digital-twin-simulation" }),
        }),
      });
      if (res.status === 202 || res.ok) {
        accepted += 1;
      }
    }
  } catch {
    return NextResponse.json({ message: "No se pudo conectar con el API" }, { status: 502 });
  }

  if (accepted === 0) {
    return NextResponse.json({ message: "El gateway rechazó las lecturas" }, { status: 502 });
  }
  return NextResponse.json({ accepted }, { status: 202 });
}
