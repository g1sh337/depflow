import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";

const PatchBody = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  geo_id: z.string().uuid().optional(),
  plan_count: z.number().int().min(0).max(100000).optional(),
  plan_amount: z.number().min(0).max(10_000_000).optional(),
  amount_presets: z.array(z.number().positive()).max(8).optional(),
});

/** PATCH /api/links/[id] — admin: edit a link (name, geo, plan, presets). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const parsed = PatchBody.safeParse(await req.json());
    if (!parsed.success || Object.keys(parsed.data).length === 0)
      return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });

    const sb = getServiceClient();
    const { error } = await sb.from("links").update(parsed.data).eq("id", params.id);
    if (error) throw error;

    await logAudit(user.id, "update", "link", params.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/links PATCH]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}

/** DELETE /api/links/[id] — admin: archive (soft delete). */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

    const sb = getServiceClient();
    const { error } = await sb.from("links").update({ is_archived: true }).eq("id", params.id);
    if (error) throw error;

    await logAudit(user.id, "archive", "link", params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/links DELETE]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
