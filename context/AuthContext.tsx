"use client";
import { createContext, useContext, useEffect, useState } from "react";
const AuthContext = createContext(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState(null);
  
    useEffect(() => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    }, []);
  
    const login = (username: string) => {
      localStorage.setItem("user", JSON.stringify({ username }));
      setUser({ username });
    };
  
    const logout = () => {
      localStorage.removeItem("user");
      setUser(null);
    };
  
    return (
      <AuthContext.Provider value={{ user, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  export const useAuth = () => useContext(AuthContext);