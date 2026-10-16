import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../services/api";

/**
 * Who is signed in, for the marketplace.
 *
 * Reads the same token the recruitment app writes. Mounted at /freelance on
 * the same origin, localStorage is shared, so a user already signed in on
 * darlemploi.dz arrives here signed in — the "connexion unique" the
 * specification asks for, with no handoff to build.
 *
 * When this moves to freelance.darlemploi.dz the origin changes and the
 * token stops being visible. That is the one thing to solve before the move,
 * and it is isolated here.
 */

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  avatar?: { url: string } | null;
}

interface AuthValue {
  user: AuthUser | null;
  /** Null while the first check is still running. */
  loading: boolean;
  signedIn: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me");
      setUser(data.data.user);
    } catch {
      // An expired or rejected token is the same as none. Removed so the
      // next request does not send a credential the server has refused.
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signedIn: !!user, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
