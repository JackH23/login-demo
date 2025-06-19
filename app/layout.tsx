// Global CSS applied to every page
import "./globals.css";
// Context provider that manages authentication state
import { AuthProvider } from "./context/AuthContext";

// Root layout shared by all routes
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Provide authentication context to the entire app */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
