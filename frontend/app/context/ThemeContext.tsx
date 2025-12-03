"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

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
  // Initialize the theme from storage (or system preference) on the client.
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  // Keep DOM attributes and classes in sync whenever the theme changes.
  useLayoutEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setTheme = (value: Theme) => {
    setThemeState(value);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    }
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
