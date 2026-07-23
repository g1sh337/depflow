import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admins — list of admins (recipients for reports/pings). */
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const sb = getServiceClient();
    const { data } = await sb
      .from("users")
      .select("id, telegram_id, first_name, username")
      .eq("role", "admin")
      .eq("is_active", true);
    return NextResponse.json({ ok: true, admins: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
