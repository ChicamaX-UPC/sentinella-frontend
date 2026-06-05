import type { ReactNode } from "react";

type Props = {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

/** Encabezado de vista: línea inferior, sin caja ni métricas. */
export function PageHeader({ title, eyebrow, actions, className = "" }: Props) {
  return (
    <header className={`mb-6 shrink-0 border-b border-white/10 pb-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent/90">{eyebrow}</p>
          ) : null}
          <h1
            className={`font-semibold tracking-tight text-slate-100 ${eyebrow ? "mt-1 text-xl sm:text-2xl" : "text-xl"}`}
          >
            {title}
          </h1>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
