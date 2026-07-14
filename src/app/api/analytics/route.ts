import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ_OFFSET_MS = 3 * 3600_000; // Europe/Moscow (UTC+3), matches the day view

type Period = "today" | "yesterday" | "7d" | "30d" | "month";

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
    case "month":
      return { from: new Date(today0.getTime() - 29 * 86400_000), to: now, buckets: 30 };
  }
}

export async function GET(req: Request) {
  try {
    await requireUser(req);
    const period = (new URL(req.url).searchParams.get("period") as Period) || "7d";
    const { from, to, buckets } = rangeFor(period);
    const sb = getServiceClient();

    const [depsRes, wdsRes, geosRes] = await Promise.all([
      sb.from("deposits").select("amount, geo_id, created_at").eq("is_deleted", false).gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      sb.from("withdrawals").select("amount, created_at").eq("is_deleted", false).gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      sb.from("geos").select("id, code"),
    ]);

    const deposits = depsRes.data ?? [];
    const withdrawals = wdsRes.data ?? [];
    const geoMap = new Map((geosRes.data ?? []).map((g) => [g.id, g.code]));

    const depSum = deposits.reduce((s, d) => s + Number(d.amount), 0);
    const wdSum = withdrawals.reduce((s, w) => s + Number(w.amount), 0);
    const depCount = deposits.length;
    const wdCount = withdrawals.length;

    // trend buckets by day
    const spanMs = to.getTime() - from.getTime();
    const bucketMs = spanMs / buckets;
    const trend = Array.from({ length: buckets }, (_, i) => ({ label: buckets === 1 ? "Сегодня" : `${buckets - i}д`, deposits: 0, withdrawals: 0 }));
    const idxFor = (iso: string) => Math.min(buckets - 1, Math.floor((new Date(iso).getTime() - from.getTime()) / bucketMs));
    for (const d of deposits) trend[idxFor(d.created_at)].deposits += Number(d.amount);
    for (const w of withdrawals) trend[idxFor(w.created_at)].withdrawals += Number(w.amount);

    // geo split
    const geoAgg = new Map<string, number>();
    for (const d of deposits) {
      const code = geoMap.get(d.geo_id ?? "") ?? "?";
      geoAgg.set(code, (geoAgg.get(code) ?? 0) + Number(d.amount));
    }
    const geo = [...geoAgg.entries()].map(([g, value]) => ({ geo: g, value })).sort((a, b) => b.value - a.value);

    return NextResponse.json({
      ok: true,
      kpis: {
        depCount,
        depSum,
        wdCount,
        wdSum,
        net: depSum - wdSum,
        roi: null, // needs expense data
        avgDep: depCount ? Math.round(depSum / depCount) : 0,
        avgWd: wdCount ? Math.round(wdSum / wdCount) : 0,
      },
      trend,
      geo,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/analytics]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
