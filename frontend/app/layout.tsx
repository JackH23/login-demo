// Global CSS applied to every page
import "./globals.css";
// Global icon set used across the application
import "bootstrap-icons/font/bootstrap-icons.css";
// Context provider that manages authentication state
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

const setInitialThemeScript = `(() => {
  try {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "night" || stored === "brightness" ? stored : prefersDark ? "night" : "brightness";
    const isDark = theme === "night";

    document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");

    const body = document.body;
    if (body) {
      body.classList.toggle("bg-dark", isDark);
      body.classList.toggle("text-white", isDark);
      body.classList.toggle("bg-gray-50", !isDark);
    }
  } catch (error) {
    // Fail silently; ThemeProvider will apply defaults after hydration.
  }
})();`;

// Root layout shared by all routes
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-bs-theme="light" suppressHydrationWarning>
      <head>
        {/* Apply stored theme choice before hydration to avoid flicker */}
        <script
          dangerouslySetInnerHTML={{ __html: setInitialThemeScript }}
          suppressHydrationWarning
        />
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
