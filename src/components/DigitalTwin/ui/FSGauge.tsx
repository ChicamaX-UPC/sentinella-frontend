"use client";

import { FS_CRITICAL, FS_OK, FS_WARNING } from "@/components/DigitalTwin/constants";

type Props = {
  value: number;
};

export function FSGauge({ value }: Props) {
  const pct = Math.min(100, Math.max(0, ((value - FS_CRITICAL) / (FS_OK - FS_CRITICAL)) * 100));
  const color = value <= FS_CRITICAL ? "#ef4444" : value <= FS_WARNING ? "#f59e0b" : "#22c55e";
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex items-center gap-3">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" className="dash-gauge-track" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div>
        <p className="dash-panel__label text-xs uppercase tracking-wide">Factor de seguridad</p>
        <p className="text-2xl font-semibold" style={{ color }}>
          {value.toFixed(2)}
        </p>
        <p className="dash-panel__text-muted text-xs">Diseño ≥ {FS_OK.toFixed(1)}</p>
      </div>
    </div>
  );
}
