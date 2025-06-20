"use client";

// React hooks for managing context state on the client
import { createContext, useContext, useEffect, useState } from "react";

// Basic representation of a user stored in the context
interface User {
  username: string;
}

// Shape of the authentication context value shared with components
interface AuthContextValue {
  // Currently logged in user or null if not authenticated
  user: User | null;
  // Indicates whether the provider is restoring a persisted session
  loading: boolean;
  // Creates a new account; resolves to true on success
  signup: (username: string, password: string) => Promise<boolean>;
  // Logs an existing user in; resolves to true on success
  signin: (username: string, password: string) => Promise<boolean>;
  // Clears user information from state and storage
  logout: () => void;
}

// Create the authentication context with a default null value
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Track the currently logged in user in state
  const [user, setUser] = useState<User | null>(null);
  // Indicates whether the provider has finished restoring a session
  const [loading, setLoading] = useState(true);

  // On first render, restore user from local storage to persist sessions
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // Loading complete after attempting to read from storage
    setLoading(false);
  }, []);

  const signup = async (username: string, password: string) => {
    // Call the API route to create a new user
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return res.ok;
  };

  const signin = async (username: string, password: string) => {
    // Request API route to sign in and store the returned user
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      // Persist the username in local storage so the session survives reloads
      localStorage.setItem("user", JSON.stringify({ username: data.username }));
      setUser({ username: data.username });
      return true;
    }
    return false;
  };

  const logout = () => {
    // Remove session information when logging out
    localStorage.removeItem("user");
    setUser(null);
  };

  // Provide authentication utilities and state to child components
  return (
    <AuthContext.Provider value={{ user, loading, signup, signin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook for accessing the authentication context
export const useAuth = () => useContext(AuthContext)!;
