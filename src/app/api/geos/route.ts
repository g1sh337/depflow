import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

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

const Body = z.object({
  code: z.string().trim().min(1).max(12),
  flag_emoji: z.string().trim().max(8).optional().nullable(),
});

/** POST /api/geos — admin: add a new geo (country). */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });

    const sb = getServiceClient();
    const { count } = await sb.from("geos").select("id", { count: "exact", head: true });
    const { data, error } = await sb
      .from("geos")
      .insert({ code: parsed.data.code, flag_emoji: parsed.data.flag_emoji ?? "🌐", sort_order: (count ?? 0) + 1 })
      .select("*")
      .single();
    if (error) {
      if ((error as any).code === "23505") return NextResponse.json({ ok: false, reason: "duplicate" }, { status: 409 });
      throw error;
    }

    await logAudit(user.id, "create", "geo", data!.id, parsed.data);
    return NextResponse.json({ ok: true, geo: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
