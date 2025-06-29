"use client";

// React hooks for managing context state on the client
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

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
  signup: (
    username: string,
    password: string,
    position: string,
    age: number,
    image: string | null
  ) => Promise<boolean>;
  // Logs an existing user in; resolves to true on success
  signin: (username: string, password: string) => Promise<boolean>;
  // Clears user information from state and storage
  logout: () => void;
  // Socket connection for real-time updates
  socket: Socket | null;
}

// Create the authentication context with a default null value
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Track the currently logged in user in state
  const [user, setUser] = useState<User | null>(null);
  // Indicates whether the provider has finished restoring a session
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io('http://localhost:3001');
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  // On first render, restore user from local storage to persist sessions
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (socket) {
        socket.emit("user-online", parsed.username);
      }
      fetch(`/api/users/${parsed.username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: parsed.username },
        body: JSON.stringify({ online: true }),
      });
    }
    // Loading complete after attempting to read from storage
    setLoading(false);
  }, [socket]);

  // Mark the user offline when the tab is closed or hidden
  useEffect(() => {
    if (!user) return;

    const markOffline = () => {
      fetch(`/api/users/${user.username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: user.username },
        body: JSON.stringify({ online: false }),
      });
      if (socket) socket.emit("user-offline", user.username);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        markOffline();
      } else if (document.visibilityState === "visible" && user) {
        fetch(`/api/users/${user.username}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: user.username,
          },
          body: JSON.stringify({ online: true }),
        });
        if (socket) socket.emit("user-online", user.username);
      }
    };

    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", markOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, socket]);

  const signup = async (
    username: string,
    password: string,
    position: string,
    age: number,
    image: string | null
  ) => {
    // Call the API route to create a new user with extra information
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, position, age, image }),
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
      // Mark user as online after successful sign in
      if (socket) socket.emit("user-online", data.username);
      fetch(`/api/users/${data.username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: data.username },
        body: JSON.stringify({ online: true }),
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    // Remove session information when logging out
    const current = user?.username;
    if (current) {
      // Mark the user as offline before clearing session
      fetch(`/api/users/${current}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: current },
        body: JSON.stringify({ online: false }),
      });
      if (socket) socket.emit("user-offline", current);
    }
    localStorage.removeItem("user");
    setUser(null);
  };

  // Provide authentication utilities and state to child components
  return (
    <AuthContext.Provider
      value={{ user, loading, signup, signin, logout, socket }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook for accessing the authentication context
export const useAuth = () => useContext(AuthContext)!;
