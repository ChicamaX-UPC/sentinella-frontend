import type { ReactNode } from "react";

type Variant = "default" | "accent" | "critical" | "blue";

const ring: Record<Variant, string> = {
  default: "border-l-slate-500",
  accent: "border-l-accent",
  critical: "border-l-red-500",
  blue: "border-l-accent-blue",
};

export function KpiStatCard({
  label,
  value,
  hint,
  icon,
  variant = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  variant?: Variant;
}) {
  return (
    <article
      className={`dash-kpi-card relative overflow-hidden rounded-xl ${ring[variant]} border-l-[3px] pl-4 pr-3 py-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="dash-kpi-card__label text-[11px] font-medium uppercase tracking-wider">{label}</p>
          <p className="dash-kpi-card__value mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="dash-kpi-card__hint mt-1 text-xs">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="dash-kpi-card__icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">{icon}</div>
        ) : null}
      </div>
    </article>
  );
}
