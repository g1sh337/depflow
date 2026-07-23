import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";

/** POST /api/withdrawals/[id]/undo — soft-delete a withdrawal (owner or admin). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const sb = getServiceClient();

    const { data: w } = await sb.from("withdrawals").select("user_id").eq("id", params.id).maybeSingle();
    if (!w) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    if (w.user_id !== user.id && user.role !== "admin")
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

    const { error } = await sb.from("withdrawals").update({ is_deleted: true }).eq("id", params.id);
    if (error) throw error;

    await logAudit(user.id, "delete", "withdrawal", params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/withdrawals/undo]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
