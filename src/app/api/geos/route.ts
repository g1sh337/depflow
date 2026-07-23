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
  code: z.string().trim().min(1).max(40),
  flag_emoji: z.string().trim().max(12).optional().nullable(),
  country_code: z.string().trim().max(4).optional().nullable(),
  tag: z.string().trim().max(60).optional().nullable(),
});

/** POST /api/geos — admin: add a geo (country + optional tag; duplicates allowed). */
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
      .insert({
        code: parsed.data.code,
        flag_emoji: parsed.data.flag_emoji || "🌐",
        country_code: parsed.data.country_code ?? null,
        tag: parsed.data.tag ?? null,
        sort_order: (count ?? 0) + 1,
      })
      .select("*")
      .single();
    if (error) throw error;

    await logAudit(user.id, "create", "geo", data!.id, parsed.data);
    return NextResponse.json({ ok: true, geo: data });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/geos POST]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
