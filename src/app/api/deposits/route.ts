import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";

const Body = z.object({
  link_id: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
  type: z.enum(["ftd", "redep"]).default("ftd"),
});

/** POST /api/deposits — create a deposit for the current user. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });
    const { link_id, amount, type } = parsed.data;

    const sb = getServiceClient();
    const { data: link } = await sb.from("links").select("geo_id, is_archived").eq("id", link_id).maybeSingle();
    if (!link || link.is_archived) return NextResponse.json({ ok: false, reason: "bad_link" }, { status: 400 });

    const { data, error } = await sb
      .from("deposits")
      .insert({ link_id, geo_id: link.geo_id, amount, type, user_id: user.id })
      .select("id")
      .single();
    if (error) throw error;

    await logAudit(user.id, "create", "deposit", data!.id, { amount, type, link_id });
    return NextResponse.json({ ok: true, id: data!.id });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/deposits]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
