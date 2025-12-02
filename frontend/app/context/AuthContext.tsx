"use client";

// React hooks for managing context state on the client
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { apiUrl } from "@/app/lib/api";
import socketClient from "@/frontend/lib/socketClient";

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
    email: string,
    password: string,
    image: string | null
  ) => Promise<{ success: true } | { success: false; message: string }>;
  // Logs an existing user in; resolves to true on success
  signin: (
    email: string,
    password: string
  ) => Promise<{ success: true } | { success: false; message: string }>;
  // Clears user information from state and storage
  logout: () => void;
  // Socket connection for real-time updates
  socket: Socket | null;
  // Updates fields on the active session user
  updateUser: (updates: Partial<User>) => void;
}

// Create the authentication context with a default null value
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Track the currently logged in user in state
  const [user, setUser] = useState<User | null>(null);
  // Indicates whether the provider has finished restoring a session
  const [loading, setLoading] = useState(true);
  const socket: Socket | null = socketClient;

  const updateOnlineStatus = useCallback(
    async (username: string, online: boolean) => {
      try {
        const res = await fetch(apiUrl(`/api/users/${encodeURIComponent(username)}`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: username,
          },
          body: JSON.stringify({ online }),
        });

        if (!res.ok) {
          let message = "Failed to update user";
          const bodyText = await res.text();
          try {
            const data = JSON.parse(bodyText);
            if (typeof data?.error === "string" && data.error.trim()) {
              message = data.error;
            }
          } catch {
            if (bodyText.trim()) message = bodyText;
          }

          if (res.status === 404) {
            console.warn(
              `Unable to update status for missing user "${username}". Clearing local session.`
            );
            localStorage.removeItem("user");
            setUser(null);
            return;
          }

          throw new Error(message);
        }
      } catch (error) {
        console.error("Unable to update user status", error);
      }
    },
    [setUser]
  );

  // On first render, restore user from local storage to persist sessions
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (socket) {
        socket.emit("user-online", parsed.username);
      }
      void updateOnlineStatus(parsed.username, true);
    }
    // Loading complete after attempting to read from storage
    setLoading(false);
  }, [socket, updateOnlineStatus]);

  // Mark the user offline when the tab is closed or hidden
  useEffect(() => {
    if (!user) return;

    const markOffline = () => {
      void updateOnlineStatus(user.username, false);
      if (socket) socket.emit("user-offline", user.username);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        markOffline();
      } else if (document.visibilityState === "visible" && user) {
        void updateOnlineStatus(user.username, true);
        if (socket) socket.emit("user-online", user.username);
      }
    };

    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", markOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, socket, updateOnlineStatus]);

  const signup = async (
    username: string,
    email: string,
    password: string,
    image: string | null
  ) => {
    const sanitizedUsername = username.trim();
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password;

    if (!sanitizedUsername || !sanitizedEmail || !sanitizedPassword) {
      return {
        success: false as const,
        message: "Username, email, and password are required.",
      };
    }

    // Call the API route to create a new user with extra information
    try {
      const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: sanitizedUsername,
          email: sanitizedEmail,
          password: sanitizedPassword,
          image,
        }),
      });

      if (res.ok) {
        return { success: true } as const;
      }

      let message = "Account creation failed.";
      try {
        const bodyText = await res.text();
        try {
          const data = JSON.parse(bodyText);
          if (typeof data?.error === "string" && data.error.trim()) {
            message = data.error;
          }
        } catch {
          if (bodyText.trim()) message = bodyText;
        }
      } catch (error) {
        console.error("Unable to read signup error response", error);
      }

      return { success: false as const, message };
    } catch (error) {
      console.error("Signup request failed", error);
      return {
        success: false as const,
        message: "Unable to reach the server. Please try again shortly.",
      };
    }
  };

  const signin = async (email: string, password: string) => {
    // Request API route to sign in and store the returned user
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password;

    if (!sanitizedEmail || !sanitizedPassword) {
      return {
        success: false as const,
        message: "Email and password are required.",
      };
    }

    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sanitizedEmail, password: sanitizedPassword }),
      });
      if (res.ok) {
        const data = await res.json();
        const username = data?.user?.username ?? data?.username;
        if (!username || typeof username !== "string") {
          return {
            success: false as const,
            message: "Unexpected response from the server.",
          };
        }
        // Persist the username in local storage so the session survives reloads
        localStorage.setItem("user", JSON.stringify({ username }));
        setUser({ username });
        // Mark user as online after successful sign in
        if (socket) socket.emit("user-online", username);
        void updateOnlineStatus(username, true);
        return { success: true } as const;
      }

      let message = "Invalid email or password.";
      try {
        const bodyText = await res.text();
        try {
          const data = JSON.parse(bodyText);
          if (typeof data?.error === "string" && data.error.trim()) {
            message = data.error;
          }
        } catch {
          if (bodyText.trim()) message = bodyText;
        }
      } catch (error) {
        console.error("Unable to read signin error response", error);
      }

      return { success: false as const, message };
    } catch (error) {
      console.error("Signin request failed", error);
      return {
        success: false as const,
        message: "Unable to reach the server. Please try again shortly.",
      };
    }
  };

  const logout = () => {
    // Remove session information when logging out
    const current = user?.username;
    if (current) {
      // Mark the user as offline before clearing session
      void updateOnlineStatus(current, false);
      if (socket) socket.emit("user-offline", current);
    }
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      if (typeof updates.username === "string") {
        localStorage.setItem("user", JSON.stringify({ username: updates.username }));
      }
      return next;
    });
  }, []);

  // Provide authentication utilities and state to child components
  return (
    <AuthContext.Provider
      value={{ user, loading, signup, signin, logout, socket, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook for accessing the authentication context
export const useAuth = () => useContext(AuthContext)!;
