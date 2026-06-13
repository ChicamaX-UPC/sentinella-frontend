"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";

type Props = {
  className?: string;
  iconClassName?: string;
};

export function ThemeToggle({ className, iconClassName = "h-5 w-5" }: Props) {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const isLight = mode === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      title={isLight ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
      aria-label={isLight ? "Activar tema oscuro" : "Activar tema claro"}
      className={
        className ??
        "theme-toggle-btn"
      }
    >
      {isLight ? <Moon className={iconClassName} aria-hidden /> : <Sun className={iconClassName} aria-hidden />}
    </button>
  );
}
