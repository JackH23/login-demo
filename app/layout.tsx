// Global CSS applied to every page
import "./globals.css";
// Context provider that manages authentication state
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ConfirmDialogProvider } from "./context/ConfirmDialogContext";

// Root layout shared by all routes
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-bs-theme="light">
      <body className="min-h-screen">
        {/* Provide authentication and theme context to the entire app */}
        <AuthProvider>
          <ThemeProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
