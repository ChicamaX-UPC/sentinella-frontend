"use client";

import { useEffect, useId, useRef, useState } from "react";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"] as const;
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

function parseYmd(value: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) {
    return null;
  }
  const y = Number.parseInt(m[1], 10);
  const mo = Number.parseInt(m[2], 10);
  const d = Number.parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) {
    return null;
  }
  return { y, m: mo, d };
}

function toYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(yyyyMmDd: string): string {
  const p = parseYmd(yyyyMmDd);
  if (!p) {
    return "Seleccionar fecha";
  }
  const date = new Date(p.y, p.m - 1, p.d);
  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Lunes = 0 … Domingo = 6 (ISO week). */
function mondayBasedWeekday(year: number, month: number, day: number): number {
  const js = new Date(year, month - 1, day).getDay();
  return js === 0 ? 6 : js - 1;
}

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (yyyyMmDd: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
};

export function DatePicker({ id, label, value, onChange, required, min, max, disabled }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const parsed = parseYmd(value);
  const today = new Date();
  const initialView = parsed ?? { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() };
  const [viewYear, setViewYear] = useState(initialView.y);
  const [viewMonth, setViewMonth] = useState(initialView.m);

  useEffect(() => {
    const p = parseYmd(value);
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDocPointer(ev: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function isDisabledDay(y: number, m: number, d: number): boolean {
    const cell = toYmd(y, m, d);
    if (min && cell < min) {
      return true;
    }
    if (max && cell > max) {
      return true;
    }
    return false;
  }

  function selectDay(d: number) {
    if (isDisabledDay(viewYear, viewMonth, d)) {
      return;
    }
    onChange(toYmd(viewYear, viewMonth, d));
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const leading = mondayBasedWeekday(viewYear, viewMonth, 1);
  const cells: (number | null)[] = [];
  for (let i = 0; i < leading; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push(d);
  }

  const todayYmd = toYmd(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={fieldId} className="text-xs text-slate-500">
        {label}
      </label>
      <button
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-required={required}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-app px-3 py-2 text-left text-xs text-slate-100 outline-none transition-colors hover:border-white/25 focus:border-accent/50 disabled:opacity-50"
      >
        <span className={value ? "text-slate-100" : "text-slate-500"}>{formatDisplay(value)}</span>
        <CalendarIcon className="shrink-0 text-accent" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-1 w-[min(100%,17.5rem)] rounded-xl border border-white/15 bg-surface-elevated p-3 shadow-xl shadow-black/40"
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <p className="text-center text-xs font-semibold text-slate-200">
              {MONTHS[viewMonth - 1]} {viewYear}
            </p>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="py-1 text-[10px] font-medium uppercase text-slate-500">
                {wd}
              </span>
            ))}
            {cells.map((day, idx) => {
              if (day == null) {
                return <span key={`e-${idx}`} aria-hidden />;
              }
              const ymd = toYmd(viewYear, viewMonth, day);
              const selected = value === ymd;
              const isToday = ymd === todayYmd;
              const off = isDisabledDay(viewYear, viewMonth, day);
              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={off}
                  onClick={() => selectDay(day)}
                  className={`min-h-8 rounded-md text-xs transition-colors ${
                    off
                      ? "cursor-not-allowed text-slate-600"
                      : selected
                        ? "bg-accent font-semibold text-[#1a0f08]"
                        : isToday
                          ? "border border-accent/40 text-accent hover:bg-accent/15"
                          : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(todayYmd);
              setViewYear(today.getFullYear());
              setViewMonth(today.getMonth() + 1);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-lg border border-white/10 py-1.5 text-[11px] text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            Hoy
          </button>
        </div>
      ) : null}

      {required && !value ? (
        <input type="text" required tabIndex={-1} className="sr-only" value="" readOnly aria-hidden />
      ) : null}
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
