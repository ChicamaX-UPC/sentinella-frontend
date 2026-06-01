"use client";

import { ALL_PERMISSIONS, type PermissionCode } from "@/lib/auth/permissions";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type Props = {
  granted: PermissionCode[];
  editable?: boolean;
  selected?: Set<PermissionCode>;
  onToggle?: (code: PermissionCode) => void;
  disabled?: boolean;
};

export function PermissionList({ granted, editable = false, selected, onToggle, disabled }: Props) {
  const active = selected ?? new Set(granted);

  return (
    <ul className="space-y-1">
      {ALL_PERMISSIONS.map(({ code, label }) => {
        const on = active.has(code);
        if (editable) {
          return (
            <li key={code}>
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition ${
                  disabled ? "opacity-50" : "hover:bg-white/[0.04]"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black/30 text-accent focus:ring-accent/30"
                  checked={on}
                  disabled={disabled}
                  onChange={() => onToggle?.(code)}
                />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            </li>
          );
        }

        if (!on) {
          return null;
        }

        return (
          <li key={code} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300">
            <CheckIcon className="h-4 w-4 shrink-0 text-accent/90" />
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
