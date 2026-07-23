import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/session";
import { getWorkerSharePct } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ_OFFSET_MS = 3 * 3600_000; // Europe/Moscow (UTC+3), matches the day view

type Period = "today" | "yesterday" | "7d" | "30d";

function rangeFor(period: Period): { from: Date; to: Date; buckets: number } {
  const now = new Date();
  const startOfDay = (d: Date) => {
    const local = new Date(d.getTime() + TZ_OFFSET_MS);
    local.setUTCHours(0, 0, 0, 0);
    return new Date(local.getTime() - TZ_OFFSET_MS);
  };
  const today0 = startOfDay(now);
  switch (period) {
    case "today":
      return { from: today0, to: now, buckets: 1 };
    case "yesterday":
      return { from: new Date(today0.getTime() - 86400_000), to: today0, buckets: 1 };
    case "7d":
      return { from: new Date(today0.getTime() - 6 * 86400_000), to: now, buckets: 7 };
    case "30d":
      return { from: new Date(today0.getTime() - 29 * 86400_000), to: now, buckets: 30 };
  }
}

export async function GET(req: Request) {
  try {
    await requireUser(req);
    const period = (new URL(req.url).searchParams.get("period") as Period) || "7d";
    const { from, to, buckets } = rangeFor(period);
    const sb = getServiceClient();
    const pct = await getWorkerSharePct();

    const [depsRes, wdsRes, geosRes, linksRes] = await Promise.all([
      sb.from("deposits").select("amount, type, link_id, geo_id, created_at").eq("is_deleted", false).gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      sb.from("withdrawals").select("amount, worker_share, link_id, created_at").eq("is_deleted", false).gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      sb.from("geos").select("id, code, flag_emoji"),
      sb.from("links").select("id, name, geo_id"),
    ]);

    const deposits = depsRes.data ?? [];
    const withdrawals = wdsRes.data ?? [];
    const geoMap = new Map((geosRes.data ?? []).map((g) => [g.id, g.code]));
    const flagMap = new Map((geosRes.data ?? []).map((g) => [g.id, g.flag_emoji ?? "🌐"]));
    const links = linksRes.data ?? [];

    const depSum = deposits.reduce((s, d) => s + Number(d.amount), 0);
    const wdSum = withdrawals.reduce((s, w) => s + Number(w.amount), 0);
    const workerTotal = withdrawals.reduce((s, w) => s + Number(w.worker_share ?? 0), 0);
    const depCount = deposits.length;
    const wdCount = withdrawals.length;
    const bossNet = wdSum - workerTotal - depSum;

    // trend buckets by day
    const spanMs = to.getTime() - from.getTime();
    const bucketMs = spanMs / buckets;
    const trend = Array.from({ length: buckets }, (_, i) => ({ label: buckets === 1 ? "Сегодня" : `${buckets - i}д`, deposits: 0, withdrawals: 0 }));
    const idxFor = (iso: string) => Math.min(buckets - 1, Math.max(0, Math.floor((new Date(iso).getTime() - from.getTime()) / bucketMs)));
    for (const d of deposits) trend[idxFor(d.created_at)].deposits += Number(d.amount);
    for (const w of withdrawals) trend[idxFor(w.created_at)].withdrawals += Number(w.amount);

    // deposits by hour-of-day (Moscow tz) — activity timing
    const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, sum: 0 }));
    for (const d of deposits) {
      const localH = new Date(new Date(d.created_at).getTime() + TZ_OFFSET_MS).getUTCHours();
      byHour[localH].count += 1;
      byHour[localH].sum += Number(d.amount);
    }

    // geo split (by deposit amount)
    const geoAgg = new Map<string, { flag: string; value: number }>();
    for (const d of deposits) {
      const code = geoMap.get(d.geo_id ?? "") ?? "?";
      const flag = flagMap.get(d.geo_id ?? "") ?? "🌐";
      const cur = geoAgg.get(code) ?? { flag, value: 0 };
      cur.value += Number(d.amount);
      geoAgg.set(code, cur);
    }
    const geo = [...geoAgg.entries()].map(([g, v]) => ({ geo: g, flag: v.flag, value: v.value })).sort((a, b) => b.value - a.value);

    // per-link financial breakdown
    const byLink = links
      .map((l) => {
        const ld = deposits.filter((d) => d.link_id === l.id);
        const lw = withdrawals.filter((w) => w.link_id === l.id);
        const depCnt = ld.length;
        const dep = ld.reduce((s, d) => s + Number(d.amount), 0);
        const redep = ld.filter((d) => d.type === "redep").reduce((s, d) => s + Number(d.amount), 0);
        const wd = lw.reduce((s, w) => s + Number(w.amount), 0);
        const worker = lw.reduce((s, w) => s + Number(w.worker_share ?? 0), 0);
        return {
          link_id: l.id,
          name: l.name,
          geo_code: geoMap.get(l.geo_id ?? "") ?? "",
          geo_flag: flagMap.get(l.geo_id ?? "") ?? "🌐",
          dep_count: depCnt,
          dep_sum: dep,
          redep_sum: redep,
          wd_sum: wd,
          worker_share: worker,
          boss_net: wd - worker - dep,
        };
      })
      .filter((r) => r.dep_count > 0 || r.wd_sum > 0)
      .sort((a, b) => b.boss_net - a.boss_net);

    return NextResponse.json({
      ok: true,
      worker_share_pct: pct,
      kpis: {
        depCount,
        depSum,
        wdCount,
        wdSum,
        net: depSum - wdSum,
        workerTotal,
        bossNet,
        roi: null,
        avgDep: depCount ? Math.round(depSum / depCount) : 0,
        avgWd: wdCount ? Math.round(wdSum / wdCount) : 0,
      },
      trend,
      geo,
      byHour,
      byLink,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/analytics]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
