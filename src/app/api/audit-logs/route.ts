import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/audit-logs — admin: recent activity (newest first). */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const sb = getServiceClient();

    const { data: logs } = await sb
      .from("audit_logs")
      .select("id, action, entity_type, changes, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(50);

    // resolve user names
    const ids = [...new Set((logs ?? []).map((l) => l.user_id).filter(Boolean))];
    const nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: users } = await sb.from("users").select("id, first_name, username").in("id", ids as string[]);
      for (const u of users ?? []) nameMap.set(u.id, u.first_name || (u.username ? `@${u.username}` : "?"));
    }

    const items = (logs ?? []).map((l) => ({
      id: l.id,
      action: l.action,
      entity_type: l.entity_type,
      changes: l.changes,
      created_at: l.created_at,
      user_name: l.user_id ? nameMap.get(l.user_id) ?? "?" : "система",
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
