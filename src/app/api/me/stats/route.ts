import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ_OFFSET_MS = 3 * 3600_000; // Europe/Moscow

function todayStart(): string {
  const local = new Date(Date.now() + TZ_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TZ_OFFSET_MS).toISOString();
}

/** GET /api/me/stats — the current user's personal figures (today + all-time). */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const sb = getServiceClient();
    const from = todayStart();

    const [myDepToday, myWdToday, myWdAll, teamDepToday] = await Promise.all([
      sb.from("deposits").select("amount").eq("user_id", user.id).eq("is_deleted", false).gte("created_at", from),
      sb.from("withdrawals").select("amount, worker_share").eq("user_id", user.id).eq("is_deleted", false).gte("created_at", from),
      sb.from("withdrawals").select("amount, worker_share").eq("user_id", user.id).eq("is_deleted", false),
      sb.from("deposits").select("id", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", from),
    ]);

    const depsT = myDepToday.data ?? [];
    const wdsT = myWdToday.data ?? [];
    const wdsAll = myWdAll.data ?? [];

    const sum = (arr: any[], k: string) => arr.reduce((s, x) => s + Number(x[k] ?? 0), 0);

    return NextResponse.json({
      ok: true,
      today: {
        dep_count: depsT.length,
        dep_sum: sum(depsT, "amount"),
        wd_count: wdsT.length,
        wd_sum: sum(wdsT, "amount"),
        earnings: sum(wdsT, "worker_share"),
        turnover: sum(depsT, "amount") + sum(wdsT, "amount"),
        team_dep_count: teamDepToday.count ?? 0,
      },
      all_time: {
        wd_sum: sum(wdsAll, "amount"),
        earnings: sum(wdsAll, "worker_share"),
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/me/stats]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
