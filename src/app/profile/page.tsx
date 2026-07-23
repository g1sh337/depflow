"use client";

import { useQuery } from "@tanstack/react-query";
import { IS_DEMO } from "@/lib/demo";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";

interface MeStats {
  today: { dep_count: number; dep_sum: number; wd_count: number; wd_sum: number; earnings: number; turnover: number; team_dep_count: number };
  all_time: { wd_sum: number; earnings: number };
}

const DEMO_STATS: MeStats = {
  today: { dep_count: 1, dep_sum: 100, wd_count: 1, wd_sum: 5888, earnings: 1472, turnover: 5988, team_dep_count: 2 },
  all_time: { wd_sum: 24500, earnings: 6125 },
};

function useMeStats() {
  return useQuery({
    queryKey: ["me-stats"],
    queryFn: async (): Promise<MeStats> => {
      if (IS_DEMO) return DEMO_STATS;
      return apiFetch<MeStats>("/api/me/stats");
    },
    refetchInterval: IS_DEMO ? false : 5000,
  });
}

export default function ProfilePage() {
  const { user, status, isAdmin } = useAuth();
  const { data: stats } = useMeStats();
  const t = stats?.today;

  const displayName = user?.first_name || "Гость";
  const handle = user?.username ? `@${user.username}` : status === "demo" ? "демо-режим" : "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <main className="flex-1 px-4 pt-4">
      {/* identity */}
      <div className="glass-strong flex items-center gap-4 p-5">
        {user?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photo_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-500/40" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold ring-2 ring-brand-500/30">
            {initial}
          </div>
        )}
        <div>
          <p className="text-lg font-bold">{displayName}</p>
          <p className="text-xs text-text-soft">{handle}</p>
          <span className="mt-1 inline-block rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-400">
            {isAdmin ? "👑 Начальник" : "Работник"}
          </span>
        </div>
      </div>

      {/* hero: personal earnings */}
      <div className="glass-strong relative mt-4 overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-status-warn/20 blur-3xl" />
        <p className="text-xs text-text-faint">Твой заработок сегодня</p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-status-warn">
          {formatMoney(t?.earnings ?? 0)}
        </p>
        <p className="mt-1 text-[11px] text-text-faint">
          25% с твоих выводов · всего заработано {formatMoney(stats?.all_time.earnings ?? 0)}
        </p>
      </div>

      {/* personal figures */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Твой оборот сегодня" value={formatMoney(t?.turnover ?? 0, { compact: true })} sub="депозиты + выводы" accent="#4dc9ff" />
        <Stat label="Твой вклад" value={`${t?.dep_count ?? 0} / ${t?.team_dep_count ?? 0}`} sub="депозитов команды" accent="#6d6df0" />
        <Stat label="Твои депозиты" value={formatMoney(t?.dep_sum ?? 0, { compact: true })} sub={`${t?.dep_count ?? 0} шт сегодня`} accent="#6d6df0" />
        <Stat label="Твои выводы" value={formatMoney(t?.wd_sum ?? 0, { compact: true })} sub={`${t?.wd_count ?? 0} шт сегодня`} accent="#ff5c7a" />
      </div>

      {/* settings */}
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
          ⚠️ Демо-режим: показаны примерные данные.
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="glass relative overflow-hidden p-4">
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <p className="text-[11px] text-text-faint">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: accent }}>{value}</p>
      <p className="mt-0.5 text-[10px] text-text-faint">{sub}</p>
    </div>
  );
}
