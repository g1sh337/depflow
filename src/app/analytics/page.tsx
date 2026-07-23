"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { loadAnalytics, PERIODS, type Period } from "@/lib/analytics";
import { StatCard } from "@/components/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney } from "@/lib/utils";

const GEO_COLORS = ["#6d6df0", "#4dc9ff", "#3ddc84", "#ffb84d", "#ff5c7a", "#a78bfa"];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const [data, setData] = useState<Awaited<ReturnType<typeof loadAnalytics>> | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    loadAnalytics(period).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [period]);

  return (
    <main className="flex-1 px-4 pt-4">
      <h1 className="text-xl font-bold">Аналитика</h1>

      {/* period filter */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              period === p.key ? "bg-brand-500 text-white shadow-glow" : "glass text-text-soft"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard index={0} label="Депозитов" value={`${data.kpis.depCount}`} accent="#6d6df0" />
            <StatCard index={1} label="Сумма депозитов" value={formatMoney(data.kpis.depSum, { compact: true })} accent="#4dc9ff" />
            <StatCard index={2} label="Выводов" value={`${data.kpis.wdCount}`} accent="#ffb84d" />
            <StatCard index={3} label="Сумма выводов" value={formatMoney(data.kpis.wdSum, { compact: true })} accent="#ff5c7a" />
            <StatCard index={4} label="Доля работников" value={formatMoney(data.kpis.workerTotal, { compact: true })} sub={`${data.worker_share_pct}% от выводов`} accent="#ffb84d" />
            <StatCard index={5} label="Чистый (начальник)" value={formatMoney(data.kpis.bossNet, { compact: true })} sub="выводы − доля − депы" accent={data.kpis.bossNet >= 0 ? "#3ddc84" : "#ff5c7a"} />
            <StatCard index={6} label="ROI" value={data.kpis.roi === null ? "н/д" : `${data.kpis.roi}%`} sub={data.kpis.roi === null ? "нужны расходы" : undefined} accent="#a78bfa" />
            <StatCard index={7} label="Средний депозит" value={formatMoney(data.kpis.avgDep)} accent="#6d6df0" />
          </div>

          {/* trend chart */}
          <div className="glass mt-4 p-4">
            <p className="mb-3 text-sm font-semibold">Динамика оборота</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.trend} margin={{ left: -20, right: 4 }}>
                <defs>
                  <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6d6df0" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6d6df0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5c7a" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ff5c7a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: "#6b7085", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#101219", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#a9aec0" }}
                />
                <Area type="monotone" dataKey="deposits" name="Депозиты" stroke="#6d6df0" strokeWidth={2} fill="url(#gDep)" />
                <Area type="monotone" dataKey="withdrawals" name="Выводы" stroke="#ff5c7a" strokeWidth={2} fill="url(#gWd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* geo split */}
          <div className="glass mt-4 p-4">
            <p className="mb-2 text-sm font-semibold">Оборот по гео</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={160}>
                <PieChart>
                  <Pie data={data.geo} dataKey="value" nameKey="geo" innerRadius={38} outerRadius={70} paddingAngle={3} stroke="none">
                    {data.geo.map((_, i) => (
                      <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#101219", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {data.geo.map((g, i) => (
                  <div key={g.geo} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: GEO_COLORS[i % GEO_COLORS.length] }} />
                      {g.geo}
                    </span>
                    <span className="tabular-nums text-text-soft">{formatMoney(g.value, { compact: true })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* per-link calc table */}
          <div className="glass mt-4 overflow-hidden p-4">
            <p className="mb-1 text-sm font-semibold">Расчёты по ссылкам</p>
            <p className="mb-3 text-[11px] text-text-faint">
              Чистый = выводы − доля работника ({data.worker_share_pct}%) − депозиты
            </p>
            {data.byLink.length === 0 ? (
              <p className="py-4 text-center text-xs text-text-faint">Нет данных за период</p>
            ) : (
              <div className="no-scrollbar overflow-x-auto">
                <table className="w-full text-right text-[11px] tabular-nums">
                  <thead>
                    <tr className="text-text-faint">
                      <th className="pb-2 text-left font-medium">Ссылка</th>
                      <th className="pb-2 font-medium">Деп</th>
                      <th className="pb-2 font-medium">Σ деп</th>
                      <th className="pb-2 font-medium">Редеп</th>
                      <th className="pb-2 font-medium">Вывод</th>
                      <th className="pb-2 font-medium">Работник</th>
                      <th className="pb-2 font-medium">Чистый</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byLink.map((r) => (
                      <tr key={r.link_id} className="border-t border-border">
                        <td className="py-2 text-left font-semibold text-text">{r.name}</td>
                        <td className="py-2 text-text-soft">{r.dep_count}</td>
                        <td className="py-2 text-text-soft">{formatMoney(r.dep_sum, { compact: true })}</td>
                        <td className="py-2 text-text-soft">{formatMoney(r.redep_sum, { compact: true })}</td>
                        <td className="py-2 text-text-soft">{formatMoney(r.wd_sum, { compact: true })}</td>
                        <td className="py-2 text-status-warn">{formatMoney(r.worker_share, { compact: true })}</td>
                        <td className={`py-2 font-semibold ${r.boss_net >= 0 ? "text-status-success" : "text-status-danger"}`}>
                          {formatMoney(r.boss_net, { compact: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
