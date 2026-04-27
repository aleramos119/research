import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    api
      .get("/api/auth/me/")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const register = async (data) => {
    const res = await api.post("/api/auth/register/", data);
    setUser(res.data);
    return res.data;
  };

  const login = async (username, password) => {
    const res = await api.post("/api/auth/login/", { username, password });
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await api.post("/api/auth/logout/");
    setUser(null);
  };

  const deleteAccount = async () => {
    await api.delete("/api/auth/me/");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, register, login, logout, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
