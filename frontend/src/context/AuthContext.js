// context/AuthContext.js — v5: Google OAuth + standard auth
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-hydrate from localStorage
  useEffect(() => {
    const token = localStorage.getItem("fasalnet_token");
    const saved  = localStorage.getItem("fasalnet_user");
    if (token && saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  // ── Standard login ─────────────────────────────────────────────
  const login = useCallback(async (phone, password) => {
    const { data } = await authAPI.login({ phone, password });
    localStorage.setItem("fasalnet_token", data.token);
    localStorage.setItem("fasalnet_user",  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // ── Standard signup ────────────────────────────────────────────
  const signup = useCallback(async (payload) => {
    const { data } = await authAPI.signup(payload);
    localStorage.setItem("fasalnet_token", data.token);
    localStorage.setItem("fasalnet_user",  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // ── Google OAuth login ─────────────────────────────────────────
  // Call this with the Google ID-token string returned by the Google
  // Sign-In SDK (google.accounts.id.initialize callback).
  const loginWithGoogle = useCallback(async (idToken, role = "customer") => {
    const { data } = await authAPI.googleLogin({ id_token: idToken, role });
    localStorage.setItem("fasalnet_token", data.token);
    localStorage.setItem("fasalnet_user",  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // ── Update cached user (after profile/settings change) ─────────
  const refreshUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("fasalnet_user", JSON.stringify(updatedUser));
  }, []);

  // ── Logout ──────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("fasalnet_token");
    localStorage.removeItem("fasalnet_user");
    // Revoke Google session if present
    if (window.google?.accounts?.id) {
      try { window.google.accounts.id.disableAutoSelect(); } catch { /* ok */ }
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
