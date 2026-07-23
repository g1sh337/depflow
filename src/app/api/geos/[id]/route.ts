import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";

/** DELETE /api/geos/[id] — admin: remove a geo (only if no links use it). */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

    const sb = getServiceClient();
    const { count } = await sb.from("links").select("id", { count: "exact", head: true }).eq("geo_id", params.id);
    if ((count ?? 0) > 0) return NextResponse.json({ ok: false, reason: "in_use", count }, { status: 409 });

    const { error } = await sb.from("geos").delete().eq("id", params.id);
    if (error) throw error;

    await logAudit(user.id, "delete", "geo", params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
