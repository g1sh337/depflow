import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";

const Patch = z.object({
  code: z.string().trim().min(1).max(40).optional(),
  flag_emoji: z.string().trim().max(12).optional(),
  tag: z.string().trim().max(60).optional().nullable(),
});

/** PATCH /api/geos/[id] — admin: edit a geo (label / flag / tag). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const parsed = Patch.safeParse(await req.json());
    if (!parsed.success || Object.keys(parsed.data).length === 0)
      return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });

    const sb = getServiceClient();
    const { error } = await sb.from("geos").update(parsed.data).eq("id", params.id);
    if (error) throw error;

    await logAudit(user.id, "update", "geo", params.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}

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
