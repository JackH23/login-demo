"use client";

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const signup = (username: string, password: string) => {
    localStorage.setItem("account", JSON.stringify({ username, password }));
    return true;
  };

  const signin = (username: string, password: string) => {
    const account = JSON.parse(localStorage.getItem("account") || "{}");
    if (account.username === username && account.password === password) {
      localStorage.setItem("user", JSON.stringify({ username }));
      setUser({ username });
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

    return (
        <AuthContext.Provider value={{ user, signup, signin, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);