// Global CSS applied to every page
import "./globals.css";
// Global icon set used across the application
import "bootstrap-icons/font/bootstrap-icons.css";
// Context provider that manages authentication state
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Root layout shared by all routes
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-bs-theme="light" suppressHydrationWarning>
      <head>
        {/* Theme initialization now handled after hydration by ThemeProvider */}
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
