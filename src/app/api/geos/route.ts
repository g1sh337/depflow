import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/geos — list geos for pickers. */
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const sb = getServiceClient();
    const { data, error } = await sb.from("geos").select("*").order("sort_order");
    if (error) throw error;
    return NextResponse.json({ ok: true, geos: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
