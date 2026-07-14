import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/links — today's stats per link (from link_today_stats view). */
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const sb = getServiceClient();
    const { data, error } = await sb
      .from("link_today_stats")
      .select("*")
      .order("plan_pct", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, links: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/links]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
