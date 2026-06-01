"use client";

type Props = {
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

export function Pagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48],
  className = "",
}: Props) {
  const safeTotalPages = Math.max(totalPages, 1);
  const current = Math.min(Math.max(page, 0), Math.max(safeTotalPages - 1, 0));
  const from = totalElements === 0 ? 0 : current * pageSize + 1;
  const to = Math.min((current + 1) * pageSize, totalElements);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-slate-400 ${className}`}
    >
      <p>
        {totalElements === 0 ? (
          "Sin resultados"
        ) : (
          <>
            Mostrando <span className="font-mono text-slate-200">{from}</span>–
            <span className="font-mono text-slate-200">{to}</span> de{" "}
            <span className="font-mono text-slate-200">{totalElements}</span>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Por página</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number.parseInt(e.target.value, 10))}
              className="rounded-md border border-white/15 bg-app px-2 py-1 text-slate-200"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          disabled={current <= 0}
          onClick={() => onPageChange(current - 1)}
          className="rounded-md border border-white/15 px-2.5 py-1.5 text-slate-300 hover:bg-white/5 disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="font-mono text-slate-300">
          {current + 1} / {Math.max(safeTotalPages, 1)}
        </span>
        <button
          type="button"
          disabled={current >= safeTotalPages - 1 || totalElements === 0}
          onClick={() => onPageChange(current + 1)}
          className="rounded-md border border-white/15 px-2.5 py-1.5 text-slate-300 hover:bg-white/5 disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
