"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "brightness" | "night";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("brightness");

  // load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "night" || stored === "brightness") {
      setThemeState(stored);
    }
  }, []);

  // apply theme classes and persist changes
  useEffect(() => {
    localStorage.setItem("theme", theme);
    const isDark = theme === "night";
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
  }, [theme]);

  const setTheme = (value: Theme) => {
    setThemeState(value);
  };

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
