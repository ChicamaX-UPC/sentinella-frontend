"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapNodeMarker = {
  nodeId: string;
  name: string;
  latitude: number;
  longitude: number;
  status?: string;
};

const DEFAULT_CENTER: [number, number] = [-7.9, -78.5];

type Props = {
  nodes?: MapNodeMarker[];
};

/** Mapa Leaflet — posiciones desde GET /v1/dashboard/nodes-map cuando hay datos. */
export function NodesMap({ nodes = [] }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const map = L.map(ref.current).setView(DEFAULT_CENTER, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = markerLayer;

    return () => {
      map.stop();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markersLayerRef.current;
    if (!map || !markerLayer) {
      return;
    }
    markerLayer.clearLayers();

    const withCoords = nodes.filter((n) => Number.isFinite(n.latitude) && Number.isFinite(n.longitude));
    if (withCoords.length === 0) {
      map.setView(DEFAULT_CENTER, 13, { animate: false });
      return;
    }

    const markers: L.CircleMarker[] = withCoords.map((n) =>
      L.circleMarker([n.latitude, n.longitude], {
        radius: 8,
        color: "#14b8a6",
        fillColor: "#0d9488",
        fillOpacity: 0.85,
      })
        .addTo(markerLayer)
        .bindPopup(`${n.name}${n.status ? ` (${n.status})` : ""}`)
    );

    if (markers.length === 1) {
      map.setView([withCoords[0].latitude, withCoords[0].longitude], 14, { animate: false });
      return;
    }
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.15), { animate: false });
  }, [nodes]);

  return <div ref={ref} className="h-[480px] w-full rounded-lg border border-slate-800" />;
}
