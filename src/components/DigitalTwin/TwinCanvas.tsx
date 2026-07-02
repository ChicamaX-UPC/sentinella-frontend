"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createTwinEngine } from "@/components/DigitalTwin/scene/TwinEngine";
import type { TwinMetrics } from "@/components/DigitalTwin/scene/SimulationEffects";

type TwinNode = {
  id: string;
  externalId?: string;
  name: string;
  sensorType?: string;
  status?: string;
};

type Props = {
  nodes: TwinNode[];
  onSelectSensor?: (sensor: { nodeId: string; name: string; status: string; value?: number; unit?: string }) => void;
  onMetricsChange?: (metrics: TwinMetrics) => void;
};

export default function TwinCanvas({ nodes, onSelectSensor, onMetricsChange }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const width = mount.clientWidth || 800;
    const isMobile = window.devicePixelRatio > 1 && width < 768;

    const engine = createTwinEngine({ mount, nodes, isMobile, onMetricsChange });
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (ev: MouseEvent) => {
      const rect = engine.renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      const selected = engine.handleClick(raycaster, mouse);
      if (selected) {
        onSelectSensor?.(selected);
      }
    };
    engine.renderer.domElement.addEventListener("click", onClick);

    const onResize = () => {
      const w = mount.clientWidth || 800;
      const h = mount.clientHeight || 520;
      engine.resize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.renderer.domElement.removeEventListener("click", onClick);
      engine.dispose();
    };
  }, [nodes, onSelectSensor, onMetricsChange]);

  return (
    <div
      ref={mountRef}
      className="relative h-[min(70vh,560px)] w-full min-h-[400px] rounded-lg border border-accent/30 overflow-hidden"
    >
      <p className="pointer-events-none absolute bottom-1.5 right-2 z-10 text-[10px] text-muted-foreground/70">
        Imágenes © Esri, Maxar
      </p>
    </div>
  );
}
