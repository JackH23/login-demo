"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "brightness" | "night";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";

const readStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "brightness";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === "night" || stored === "brightness") {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "night" : "brightness";
};

const readDomTheme = (): Theme => {
  if (typeof document === "undefined") return "brightness";

  const current = document.documentElement.getAttribute("data-bs-theme");
  if (current === "dark") return "night";
  if (current === "light") return "brightness";

  return readStoredTheme();
};

const applyThemeToDom = (value: Theme) => {
  if (typeof document === "undefined") return;

  const isDark = value === "night";
  document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");

  if (isDark) {
    document.body.classList.add("bg-dark", "text-white");
    document.body.classList.remove("bg-gray-50");
  } else {
    document.body.classList.remove("bg-dark", "text-white");
    document.body.classList.add("bg-gray-50");
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to the theme already applied to the DOM (set by the inline script
  // in app/layout) so client and server markup stay in sync after refreshes.
  const [theme, setThemeState] = useState<Theme>(() => readDomTheme());
  const [hasHydrated, setHasHydrated] = useState(() => typeof document !== "undefined");

  const setTheme = (value: Theme) => {
    setThemeState(value);
  };

  // Read the stored theme once we're on the client to avoid SSR/client
  // mismatches during hydration.
  useEffect(() => {
    const storedTheme = readStoredTheme();
    setThemeState(storedTheme);
    setHasHydrated(true);
  }, []);

  // Keep DOM attributes, classes, and storage in sync whenever the theme
  // changes so user selections persist across sessions.
  useEffect(() => {
    if (!hasHydrated) return;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    applyThemeToDom(theme);
  }, [theme, hasHydrated]);

  // Sync theme changes across tabs so the preference stays consistent.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const newValue = event.newValue as Theme | null;
        if (newValue === "night" || newValue === "brightness") {
          setThemeState(newValue);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
