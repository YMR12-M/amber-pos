import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, setSessionExpiredHandler } from "../api";
import type { Role, User } from "../types";

export type { Role };

interface AuthContextValue {
  user: User | null;
  /** True until the initial session check finishes — avoids a login-screen flash. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // The token is an httpOnly cookie we cannot read, so the server is the only
  // source of truth for "am I logged in".
  useEffect(() => {
    let cancelled = false;

    api
      .me()
      .then(({ user: u }) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from any request drops the session instead of leaving a dead UI.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    return () => setSessionExpiredHandler(() => {});
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u } = await api.login(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
