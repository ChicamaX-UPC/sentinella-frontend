"use client";

type Point = {
  timestamp: string;
  value: number;
  projected: boolean;
};

type Props = {
  points: Point[];
  threshold?: number | null;
  height?: number;
};

function toNum(v: number | string): number {
  return typeof v === "number" ? v : parseFloat(String(v));
}

export function ForecastChart({ points, threshold, height = 160 }: Props) {
  if (!points.length) {
    return <p className="text-xs text-slate-500">Sin datos para graficar.</p>;
  }

  const values = points.map((p) => toNum(p.value));
  const min = Math.min(...values, threshold ?? values[0]);
  const max = Math.max(...values, threshold ?? values[0]);
  const pad = (max - min) * 0.08 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const width = 480;
  const innerH = height - 24;
  const innerW = width - 32;

  const coords = points.map((p, i) => {
    const x = 16 + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = 12 + innerH - ((toNum(p.value) - yMin) / (yMax - yMin)) * innerH;
    return { x, y, projected: p.projected };
  });

  const hist = coords.filter((c) => !c.projected);
  const proj = coords.filter((c) => c.projected);
  const histPath = hist.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const projPath =
    hist.length && proj.length
      ? `M${hist[hist.length - 1].x.toFixed(1)},${hist[hist.length - 1].y.toFixed(1)} ` +
        proj.map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")
      : "";

  const thresholdY =
    threshold != null
      ? 12 + innerH - ((threshold - yMin) / (yMax - yMin)) * innerH
      : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full text-slate-300" role="img" aria-label="Gráfico de pronóstico">
      {thresholdY != null ? (
        <line x1={16} y1={thresholdY} x2={width - 16} y2={thresholdY} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} />
      ) : null}
      {histPath ? <path d={histPath} fill="none" stroke="#38bdf8" strokeWidth={2} /> : null}
      {projPath ? <path d={projPath} fill="none" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 4" /> : null}
      <text x={16} y={height - 4} className="fill-slate-500 text-[9px]">
        Histórico (azul) · Proyección (violeta punteada)
      </text>
    </svg>
  );
}
