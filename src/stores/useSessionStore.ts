import { create } from "zustand";
import type { SessionUser } from "@/types/session";

const STORAGE_KEY = "sentinella_session_user";

function readStoredUser(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

interface SessionState {
  user: SessionUser | null;
  hydrated: boolean;
  hydrate: () => void;
  setUser: (user: SessionUser | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  hydrated: false,
  hydrate: () => {
    set({ user: readStoredUser(), hydrated: true });
  },
  setUser: (user) => {
    if (typeof window !== "undefined") {
      if (user) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    set({ user, hydrated: true });
  },
  clear: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    set({ user: null, hydrated: true });
  },
}));
