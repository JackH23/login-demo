// Global CSS applied to every page
import "./globals.css";
// Global icon set used across the application
import "bootstrap-icons/font/bootstrap-icons.css";
// Context provider that manages authentication state
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Script from "next/script";

// Root layout shared by all routes
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-bs-theme="light" suppressHydrationWarning>
      <head>
        <Script id="bootstrap-theme-init" strategy="beforeInteractive">
          {`
            (() => {
              const stored = window.localStorage.getItem("theme");
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const theme = stored === "night" || stored === "brightness"
                ? stored
                : prefersDark
                  ? "night"
                  : "brightness";

              const isDark = theme === "night";
              const root = document.documentElement;
              const body = document.body;

              root.setAttribute("data-bs-theme", isDark ? "dark" : "light");

              if (!body) return;
              if (isDark) {
                body.classList.add("bg-dark", "text-white");
                body.classList.remove("bg-gray-50");
              } else {
                body.classList.remove("bg-dark", "text-white");
                body.classList.add("bg-gray-50");
              }
            })();
          `}
        </Script>
      </head>
      <body className="min-h-screen">
        {/* Provide authentication and theme context to the entire app */}
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
