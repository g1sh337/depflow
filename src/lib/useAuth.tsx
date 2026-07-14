"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { TelegramUser } from "./telegram-auth";

interface AuthState {
  user: TelegramUser | null;
  status: "loading" | "authed" | "error" | "demo";
  reason?: string;
}

const AuthCtx = createContext<AuthState>({ user: null, status: "loading" });

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, status: "loading" });

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const initData: string = tg?.initData ?? "";

    // Opened outside Telegram (e.g. plain browser during dev)
    if (!initData) {
      setState({
        user: { id: 0, first_name: "Гость", username: "demo" },
        status: "demo",
      });
      return;
    }

    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setState({ user: data.user ?? null, status: data.demo ? "demo" : "authed" });
        } else {
          setState({ user: null, status: "error", reason: data.reason });
        }
      })
      .catch(() => setState({ user: null, status: "error", reason: "network" }));
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}
