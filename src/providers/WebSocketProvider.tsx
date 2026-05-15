"use client";

import { useEffect, useRef } from "react";
import { parseWsMessage } from "@/lib/websocket/parse-message";
import { useAlertStore } from "@/stores/useAlertStore";
import { useNodeStore } from "@/stores/useNodeStore";
import { useSensorStore } from "@/stores/useSensorStore";

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_BASE_URL?.replace(/\/$/, "") ?? "ws://localhost:8080";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const tokRes = await fetch("/api/auth/ws-token", { credentials: "include" });
      if (!tokRes.ok || cancelled) {
        return;
      }
      const { token } = (await tokRes.json()) as { token?: string };
      if (!token || cancelled) {
        return;
      }
      const url = `${WS_BASE}/v1/ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        const parsed = parseWsMessage(ev.data as string);
        if (!parsed) {
          return;
        }
        const { event, payload } = parsed;
        if (event === "sensor.reading") {
          const nodeId = typeof payload.nodeId === "string" ? payload.nodeId : undefined;
          const data = ((payload.data as Record<string, unknown>) ?? payload) as Record<string, unknown>;
          const normalized = nodeId ? { ...data, nodeId } : data;
          useSensorStore.getState().applyReading(normalized);
          return;
        }
        if (event === "alert.created" || event === "alert.updated") {
          useAlertStore.getState().applyWsPayload(event, payload);
          return;
        }
        if (event === "node.offline" || event === "node.online") {
          useNodeStore.getState().applyWsPayload(event, payload);
        }
      };
    })();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
