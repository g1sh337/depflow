"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { haptic } from "@/lib/utils";

const REASON_TEXT: Record<string, string> = {
  key_not_found: "Ключ не найден",
  key_used: "Ключ уже активирован",
  key_expired: "Срок действия ключа истёк",
  no_code: "Введите ключ",
  network: "Ошибка сети, попробуйте ещё раз",
};

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, reason, redeem } = useAuth();

  if (status === "authed" || status === "demo") return <>{children}</>;

  if (status === "loading") {
    return (
      <Splash>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="mt-4 text-sm text-text-soft">Загрузка…</p>
      </Splash>
    );
  }

  if (status === "needs_key") return <KeyEntry redeem={redeem} />;

  // error
  return (
    <Splash>
      <p className="text-2xl">🔒</p>
      <p className="mt-3 text-center text-sm text-text-soft">
        {reason === "no_init_data"
          ? "Открой приложение из Telegram — через бота @depflowbot."
          : `Доступ закрыт${reason ? ` (${reason})` : ""}.`}
      </p>
    </Splash>
  );
}

function KeyEntry({ redeem }: { redeem: (code: string) => Promise<{ ok: boolean; reason?: string }> }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!code.trim()) return;
    setBusy(true);
    setErr(undefined);
    const res = await redeem(code.trim());
    setBusy(false);
    if (!res.ok) {
      haptic("error");
      setErr(REASON_TEXT[res.reason ?? "network"] ?? "Не удалось активировать ключ");
    } else {
      haptic("success");
    }
  }

  return (
    <Splash>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong w-full max-w-sm p-6"
      >
        <p className="text-center text-3xl">🔑</p>
        <h1 className="mt-3 text-center text-lg font-bold">Введите инвайт-ключ</h1>
        <p className="mt-1 text-center text-xs text-text-faint">Ключ выдаёт администратор команды</p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC-123-XYZ"
          className="mt-5 w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-center font-mono tracking-widest text-text outline-none focus:border-brand-500"
          autoCapitalize="characters"
        />
        {err && <p className="mt-2 text-center text-xs text-status-danger">{err}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="tap-scale mt-4 w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-glow disabled:opacity-50"
        >
          {busy ? "Проверка…" : "Войти"}
        </button>
      </motion.div>
    </Splash>
  );
}

function Splash({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">{children}</div>
  );
}
