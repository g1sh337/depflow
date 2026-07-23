import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/users — admin: list team members. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const sb = getServiceClient();
    const { data } = await sb
      .from("users")
      .select("id, telegram_id, first_name, username, role, is_active, created_at")
      .order("created_at", { ascending: true });
    return NextResponse.json({ ok: true, users: data ?? [], me: user.id });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
