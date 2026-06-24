"use client";

type Props = {
  selected: {
    nodeId: string;
    name: string;
    status: string;
    value?: number;
    unit?: string;
  } | null;
};

export function SensorPanel({ selected }: Props) {
  return (
    <div className="dash-panel__section">
      <p className="dash-panel__label text-xs uppercase tracking-wide">Sensor seleccionado</p>
      {selected ? (
        <div className="dash-inset-box mt-2 rounded-md p-3">
          <p className="dash-panel__text font-medium">{selected.name}</p>
          <p className="dash-panel__text-muted">Estado: {selected.status}</p>
          {typeof selected.value === "number" ? (
            <p className="dash-panel__text">
              Lectura: {selected.value} {selected.unit ?? ""}
            </p>
          ) : (
            <p className="dash-panel__text-muted">Sin lectura reciente por WS</p>
          )}
        </div>
      ) : (
        <p className="dash-panel__text-muted mt-2">Haz clic sobre un nodo para ver su estado y lectura.</p>
      )}
    </div>
  );
}
