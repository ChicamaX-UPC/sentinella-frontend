/**
 * Emisor de telemetría del gemelo: publica las lecturas sintéticas de la simulación
 * al backend (vía BFF /api/twin/ingest → gateway → RabbitMQ), de modo que recorren
 * el pipeline real: persistencia, evaluación de umbrales, alertas y evento WS.
 */
import type { SyntheticReading } from "@/components/DigitalTwin/physics/sensorSimulation";
import { SENSOR_POSITIONS } from "@/components/DigitalTwin/sensorPositions";

type TwinNode = {
  id: string;
  externalId?: string;
  name: string;
};

/** Intervalo mínimo entre lotes (ms reales). */
const SEND_INTERVAL_MS = 2500;
/** Pausa tras un fallo del BFF (ms) para no insistir en caliente. */
const FAILURE_BACKOFF_MS = 30_000;

export type TwinTelemetryEmitter = {
  /** Publica un lote si la simulación corre y pasó el intervalo. Fire-and-forget. */
  maybeSend: (readings: SyntheticReading[], running: boolean) => void;
  /** Sensores del gemelo con nodo backend resuelto. */
  mappedCount: () => number;
};

function resolveNodeUuid(blueprintId: string, nodes: TwinNode[]): string | undefined {
  const wanted = blueprintId.toUpperCase();
  const exact = nodes.find((n) => (n.externalId ?? "").toUpperCase() === wanted);
  if (exact) {
    return exact.id;
  }
  const partial = nodes.find((n) =>
    `${n.externalId ?? ""} ${n.name ?? ""}`.toUpperCase().includes(wanted)
  );
  return partial?.id;
}

export function createTwinTelemetryEmitter(nodes: TwinNode[]): TwinTelemetryEmitter {
  const uuidByBlueprint = new Map<string, string>();
  for (const pos of SENSOR_POSITIONS) {
    const uuid = resolveNodeUuid(pos.nodeId, nodes);
    if (uuid) {
      uuidByBlueprint.set(pos.nodeId, uuid);
    }
  }

  let lastSentAt = 0;
  let disabledUntil = 0;
  let inFlight = false;

  return {
    mappedCount: () => uuidByBlueprint.size,
    maybeSend: (readings, running) => {
      if (!running || readings.length === 0 || uuidByBlueprint.size === 0 || inFlight) {
        return;
      }
      const now = Date.now();
      if (now - lastSentAt < SEND_INTERVAL_MS || now < disabledUntil) {
        return;
      }
      lastSentAt = now;

      const timestamp = new Date().toISOString();
      const batch = readings
        .map((r) => {
          const nodeId = uuidByBlueprint.get(r.blueprintId);
          if (!nodeId) {
            return null;
          }
          return {
            nodeId,
            timestamp,
            sensorType: r.sensorType,
            value: r.value,
            unit: r.unit,
            status: r.status,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (batch.length === 0) {
        return;
      }

      inFlight = true;
      fetch("/api/twin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ readings: batch }),
      })
        .then((res) => {
          if (!res.ok) {
            disabledUntil = Date.now() + FAILURE_BACKOFF_MS;
          }
        })
        .catch(() => {
          disabledUntil = Date.now() + FAILURE_BACKOFF_MS;
        })
        .finally(() => {
          inFlight = false;
        });
    },
  };
}
