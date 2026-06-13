"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "sentinella-theme";

function applyThemeClass(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(mode);
  root.style.colorScheme = mode === "light" ? "light" : "dark";
}

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  hydrate: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "dark",
      setMode: (mode) => {
        applyThemeClass(mode);
        set({ mode });
      },
      toggle: () => {
        const next = get().mode === "dark" ? "light" : "dark";
        get().setMode(next);
      },
      hydrate: () => {
        applyThemeClass(get().mode);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeClass(state.mode);
        }
      },
    }
  )
);

/** Para el script inline del layout (evita flash de tema). */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${STORAGE_KEY}";var raw=localStorage.getItem(k);var mode="dark";if(raw){var p=JSON.parse(raw);if(p&&p.state&&p.state.mode==="light")mode="light";}var r=document.documentElement;r.classList.remove("dark","light");r.classList.add(mode);r.style.colorScheme=mode==="light"?"light":"dark";}catch(e){document.documentElement.classList.add("dark");}})();`;
