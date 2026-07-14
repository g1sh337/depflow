"use client";

import { useLinks } from "@/lib/useLinks";
import { IS_DEMO } from "@/lib/demo";
import { formatMoney } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";

export default function ProfilePage() {
  const { data: links } = useLinks();
  const { user, status } = useAuth();
  const teamCount = links?.reduce((s, l) => s + l.deposits_count, 0) ?? 0;
  const myCount = Math.round(teamCount * 0.42); // demo: personal contribution

  const displayName = user?.first_name || "Гость";
  const handle = user?.username ? `@${user.username}` : status === "demo" ? "демо-режим" : "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <main className="flex-1 px-4 pt-4">
      <div className="glass-strong flex items-center gap-4 p-5">
        {user?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold">
            {initial}
          </div>
        )}
        <div>
          <p className="text-lg font-bold">{displayName}</p>
          <p className="text-xs text-text-soft">{handle}</p>
          <span className="mt-1 inline-block rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-400">
            Пользователь
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="glass p-4">
          <p className="text-[11px] text-text-faint">Твой вклад сегодня</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-400">
            {myCount}
            <span className="text-sm text-text-faint"> / {teamCount}</span>
          </p>
          <p className="text-[10px] text-text-faint">депозитов команды</p>
        </div>
        <div className="glass p-4">
          <p className="text-[11px] text-text-faint">Твой оборот</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-status-premium">
            {formatMoney(myCount * 42, { compact: true })}
          </p>
          <p className="text-[10px] text-text-faint">за сегодня</p>
        </div>
      </div>

      <div className="glass mt-4 divide-y divide-border">
        {[
          ["🌐", "Часовой пояс", "Europe/Moscow"],
          ["🔔", "Уведомления", "Включены"],
          ["🌗", "Тема", "Тёмная"],
        ].map(([icon, label, val]) => (
          <div key={label} className="flex items-center gap-3 p-4">
            <span>{icon}</span>
            <span className="flex-1 text-sm">{label}</span>
            <span className="text-sm text-text-soft">{val}</span>
          </div>
        ))}
      </div>

      {IS_DEMO && (
        <div className="mt-4 rounded-xl border border-status-warn/30 bg-status-warn/10 p-3 text-xs text-status-warn">
          ⚠️ Демо-режим: данные хранятся в памяти сессии. Подключи Supabase (env-переменные), чтобы включить реальную БД, авторизацию и realtime.
        </div>
      )}
    </main>
  );
}
