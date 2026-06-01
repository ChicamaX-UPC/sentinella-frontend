"use client";

/**
 * Único mapa de la app con [mapcn](https://www.mapcn.dev/) (MapLibre vía @/components/ui/map).
 * No usar este componente en otras vistas; el resto de la UI no depende de mapcn.
 */
import { useEffect } from "react";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from "@/components/ui/map";

export type MapNodeMarker = {
  nodeId: string;
  name: string;
  latitude: number;
  longitude: number;
  status?: string;
};

/** Chicama Norte — [longitud, latitud] (MapLibre / mapcn) */
const DEFAULT_CENTER: [number, number] = [-78.514, -7.921];

const MARKER_BORDER = "#14b8a6";
const MARKER_FILL = "#0d9488";

const POPUP_CLASS =
  "border border-white/10 bg-[#16110e] text-slate-100 shadow-lg [&_.text-muted-foreground]:text-slate-400";

type Props = {
  nodes?: MapNodeMarker[];
};

function MapFitNodes({ nodes }: { nodes: MapNodeMarker[] }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) {
      return;
    }

    const withCoords = nodes.filter(
      (n) => Number.isFinite(n.latitude) && Number.isFinite(n.longitude),
    );

    if (withCoords.length === 0) {
      map.jumpTo({ center: DEFAULT_CENTER, zoom: 13 });
      return;
    }

    if (withCoords.length === 1) {
      const n = withCoords[0];
      map.jumpTo({ center: [n.longitude, n.latitude], zoom: 14 });
      return;
    }

    const lngs = withCoords.map((n) => n.longitude);
    const lats = withCoords.map((n) => n.latitude);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 60, animate: false },
    );
  }, [map, isLoaded, nodes]);

  return null;
}

export function NodesMap({ nodes = [] }: Props) {
  const withCoords = nodes.filter(
    (n) => Number.isFinite(n.latitude) && Number.isFinite(n.longitude),
  );

  return (
    <div className="nodes-map-scope isolate h-[480px] w-full overflow-hidden rounded-lg border border-slate-800">
      <Map center={DEFAULT_CENTER} zoom={13} className="h-full w-full">
        <MapFitNodes nodes={withCoords} />
        <MapControls position="bottom-right" />
        {withCoords.map((n) => (
          <MapMarker key={n.nodeId} longitude={n.longitude} latitude={n.latitude}>
            <MarkerContent>
              <div
                className="rounded-full border-2 shadow-md"
                style={{
                  width: 16,
                  height: 16,
                  borderColor: MARKER_BORDER,
                  backgroundColor: MARKER_FILL,
                }}
              />
            </MarkerContent>
            <MarkerPopup className={POPUP_CLASS}>
              <p className="text-sm font-medium">{n.name}</p>
              {n.status ? <p className="mt-0.5 text-xs text-slate-400">{n.status}</p> : null}
            </MarkerPopup>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
