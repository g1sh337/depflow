import { DEMO_LINKS, demoStore, IS_DEMO } from "./demo";

export interface Kpis {
  depCount: number;
  depSum: number;
  wdCount: number;
  wdSum: number;
  net: number;
  workerTotal: number;
  bossNet: number;
  roi: number | null; // null when no expense data
  avgDep: number;
  avgWd: number;
}

export interface LinkCalcRow {
  link_id: string;
  name: string;
  geo_code: string;
  dep_count: number;
  dep_sum: number;
  redep_sum: number;
  wd_sum: number;
  worker_share: number;
  boss_net: number;
}

export interface TrendPoint {
  label: string;
  deposits: number;
  withdrawals: number;
}

export interface GeoSlice {
  geo: string;
  value: number;
}

export interface HourPoint {
  hour: number;
  count: number;
  sum: number;
}

export type Period = "today" | "yesterday" | "7d" | "30d" | "month";

export const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Сегодня" },
  { key: "yesterday", label: "Вчера" },
  { key: "7d", label: "7 дней" },
  { key: "30d", label: "30 дней" },
  { key: "month", label: "Месяц" },
];

/** Deterministic pseudo-random from a seed, for stable demo data. */
function seeded(n: number) {
  const x = Math.sin(n * 999) * 10000;
  return x - Math.floor(x);
}

export function getDemoAnalytics(period: Period) {
  // base from live "today" links + a synthetic history
  const live = demoStore.getLinks();
  const days = period === "7d" ? 7 : period === "30d" || period === "month" ? 30 : 1;

  const trend: TrendPoint[] = [];
  let depCount = 0,
    depSum = 0,
    wdCount = 0,
    wdSum = 0;

  for (let i = days - 1; i >= 0; i--) {
    const factor = 0.6 + seeded(i + 1) * 0.9;
    const dDep = i === 0 ? live.reduce((s, l) => s + l.deposits_count, 0) : Math.round(50 * factor);
    const dDepSum = i === 0 ? live.reduce((s, l) => s + l.deposits_sum, 0) : Math.round(1800 * factor);
    const dWd = Math.round(dDep * 0.15 * (0.5 + seeded(i + 5)));
    const dWdSum = Math.round(dDepSum * 0.4 * (0.5 + seeded(i + 9)));
    depCount += dDep;
    depSum += dDepSum;
    wdCount += dWd;
    wdSum += dWdSum;
    trend.push({
      label: days === 1 ? "Сегодня" : `${i}д`,
      deposits: dDepSum,
      withdrawals: dWdSum,
    });
  }
  if (days === 1) trend.reverse();

  const geo: GeoSlice[] = DEMO_LINKS.map((l) => ({
    geo: l.geo_code ?? "?",
    value: Math.round(l.deposits_sum * (days === 1 ? 1 : days * 0.7)),
  }));

  const workerTotal = Math.round(wdSum * 0.25);
  const bossNet = wdSum - workerTotal - depSum;

  const kpis: Kpis = {
    depCount,
    depSum,
    wdCount,
    wdSum,
    net: depSum - wdSum,
    workerTotal,
    bossNet,
    roi: null, // no expense data tracked in demo → honest "н/д"
    avgDep: depCount ? Math.round(depSum / depCount) : 0,
    avgWd: wdCount ? Math.round(wdSum / wdCount) : 0,
  };

  const mult = days === 1 ? 1 : days * 0.7;
  const byLink: LinkCalcRow[] = live.map((l) => {
    const dep = Math.round(l.deposits_sum * mult);
    const wd = Math.round(dep * 1.6);
    const worker = Math.round(wd * 0.25);
    return {
      link_id: l.link_id,
      name: l.name,
      geo_code: l.geo_code ?? "",
      dep_count: Math.round(l.deposits_count * mult),
      dep_sum: dep,
      redep_sum: Math.round(dep * 0.3),
      wd_sum: wd,
      worker_share: worker,
      boss_net: wd - worker - dep,
    };
  });

  // synthetic hourly distribution (bell-ish around working hours)
  const byHour: HourPoint[] = Array.from({ length: 24 }, (_, h) => {
    const base = Math.max(0, Math.sin((h - 6) / 24 * Math.PI) * 8);
    const count = Math.round(base * (0.6 + seeded(h + 3)));
    return { hour: h, count, sum: count * 40 };
  });

  return { kpis, trend, geo, byHour, byLink, worker_share_pct: 25 };
}

export async function loadAnalytics(period: Period) {
  if (IS_DEMO) return getDemoAnalytics(period);
  const { apiFetch } = await import("./api");
  const data = await apiFetch<{
    kpis: Kpis;
    trend: TrendPoint[];
    geo: GeoSlice[];
    byHour: HourPoint[];
    byLink: LinkCalcRow[];
    worker_share_pct: number;
  }>(`/api/analytics?period=${period}`);
  return {
    kpis: data.kpis,
    trend: data.trend,
    geo: data.geo,
    byHour: data.byHour ?? [],
    byLink: data.byLink ?? [],
    worker_share_pct: data.worker_share_pct ?? 25,
  };
}
