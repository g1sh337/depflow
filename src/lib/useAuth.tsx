"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch, getInitData } from "./api";

export interface AuthUser {
  id?: string;
  first_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  role?: "admin" | "user";
}

type Status = "loading" | "authed" | "needs_key" | "error" | "demo";

interface AuthState {
  user: AuthUser | null;
  status: Status;
  reason?: string;
  isAdmin: boolean;
  redeem: (code: string) => Promise<{ ok: boolean; reason?: string }>;
  refresh: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reason, setReason] = useState<string>();

  const load = useCallback(async () => {
    const initData = getInitData();
    // Opened outside Telegram (plain browser during dev)
    if (!initData) {
      setUser({ first_name: "Гость", username: "demo", role: "admin" });
      setStatus("demo");
      return;
    }
    try {
      const data = await apiFetch<any>("/api/auth/telegram", { method: "POST", body: JSON.stringify({}) });
      if (data.ok) {
        setUser(data.user ?? null);
        setStatus(data.demo ? "demo" : "authed");
      } else if (data.needsKey) {
        setUser(data.tgUser ?? null);
        setStatus("needs_key");
      } else {
        setStatus("error");
        setReason(data.reason);
      }
    } catch (e: any) {
      setStatus("error");
      setReason(e?.body?.reason ?? "network");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const redeem = useCallback<AuthState["redeem"]>(async (code) => {
    try {
      const data = await apiFetch<any>("/api/auth/redeem", { method: "POST", body: JSON.stringify({ code }) });
      if (data.ok) {
        setUser(data.user);
        setStatus("authed");
        return { ok: true };
      }
      return { ok: false, reason: data.reason };
    } catch (e: any) {
      return { ok: false, reason: e?.body?.reason ?? "network" };
    }
  }, []);

  return (
    <AuthCtx.Provider
      value={{ user, status, reason, isAdmin: user?.role === "admin", redeem, refresh: load }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
