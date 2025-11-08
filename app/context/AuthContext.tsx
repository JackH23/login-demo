"use client";

// React hooks for managing context state on the client
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

// Basic representation of a user stored in the context
interface User {
  username: string;
  email?: string;
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
    age: number,
    image: string | null
  ) => Promise<{ success: true } | { success: false; message: string }>;
  // Logs an existing user in; resolves to true on success
  signin: (email: string, password: string) => Promise<boolean>;
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
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let subscribed = true;
    let socketInstance: Socket | null = null;
    let handleConnectError: ((error: Error) => void) | null = null;

    const connectSocket = async () => {
      const urlFromEnv = process.env.NEXT_PUBLIC_SOCKET_URL;
      const portFromEnv = process.env.NEXT_PUBLIC_SOCKET_PORT || "3001";

    const resolvedUrl =
        urlFromEnv ||
        (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:${portFromEnv}`
          : undefined);

    if (!resolvedUrl) return;

      const { io } = await import("socket.io-client");

      const socket = io(resolvedUrl);
      handleConnectError = (error: Error) => {
        console.error("Socket connection error:", error);
      };
      socket.on("connect_error", handleConnectError);

      if (!subscribed) {
        socket.off("connect_error", handleConnectError);
        socket.disconnect();
        return;
      }

      socketInstance = socket;
      setSocket(socket);
    };
    
    connectSocket().catch((error) => {
      console.error("Unable to establish socket connection:", error);
    });

    return () => {
      subscribed = false;
      if (socketInstance) {
        if (handleConnectError) {
          socketInstance.off("connect_error", handleConnectError);
        }
        socketInstance.disconnect();
      }
    };
  }, []);

  const updateOnlineStatus = useCallback(
    async (username: string, online: boolean) => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: username,
          },
          body: JSON.stringify({ online }),
        });

        if (!res.ok) {
          let message = "Failed to update user";
          try {
            const data = await res.json();
            if (typeof data?.error === "string" && data.error.trim()) {
              message = data.error;
            }
          } catch {
            const fallback = await res.text();
            if (fallback.trim()) message = fallback;
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
    age: number,
    image: string | null
  ) => {
    // Call the API route to create a new user with extra information
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, age, image }),
    });

    if (res.ok) {
      return { success: true } as const;
    }

    let message = "Account creation failed.";
    try {
      const data = await res.json();
      if (typeof data?.error === "string" && data.error.trim()) {
        message = data.error;
      }
    } catch (error) {
      console.error("Unable to parse signup error response", error);
    }

    return { success: false as const, message };
  };

  const signin = async (email: string, password: string) => {
    // Request API route to sign in and store the returned user
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      const normalizedEmail = email.trim().toLowerCase();
      // Persist the username and email in local storage so the session survives reloads
      localStorage.setItem(
        "user",
        JSON.stringify({ username: data.username, email: normalizedEmail })
      );
      setUser({ username: data.username, email: normalizedEmail });
      // Mark user as online after successful sign in
      if (socket) socket.emit("user-online", data.username);
      void updateOnlineStatus(data.username, true);
      return true;
    }
    return false;
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
      if (typeof updates.username === "string" || typeof updates.email === "string") {
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: updates.username ?? next.username,
            email: updates.email ?? next.email,
          })
        );
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
