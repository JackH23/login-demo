"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "brightness" | "night";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const applyThemeToDom = (value: Theme) => {
  if (typeof document === "undefined") return;

  const isDark = value === "night";
  document.documentElement.setAttribute(
    "data-bs-theme",
    isDark ? "dark" : "light"
  );

  if (isDark) {
    document.body.classList.add("bg-dark", "text-white");
    document.body.classList.remove("bg-gray-50");
  } else {
    document.body.classList.remove("bg-dark", "text-white");
    document.body.classList.add("bg-gray-50");
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("brightness");

  const setTheme = (value: Theme) => {
    setThemeState(value);
  };

  // Keep DOM attributes and classes in sync whenever the theme changes.
  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
