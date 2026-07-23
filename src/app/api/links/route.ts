import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/links — today's stats per link (from link_today_stats view). */
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const sb = getServiceClient();
    const { data, error } = await sb
      .from("link_today_stats")
      .select("*")
      .order("plan_pct", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, links: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/links]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}

const CreateBody = z.object({
  name: z.string().trim().min(1).max(60),
  geo_id: z.string().uuid(),
  url: z.string().trim().max(500).optional().nullable(),
  plan_count: z.number().int().min(0).max(100000),
  plan_amount: z.number().min(0).max(10_000_000).default(0),
  amount_presets: z.array(z.number().positive()).max(8).default([15, 25, 50, 100]),
});

/** POST /api/links — admin: create a link. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const parsed = CreateBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });

    const sb = getServiceClient();
    const { data, error } = await sb
      .from("links")
      .insert({ ...parsed.data, created_by: user.id })
      .select("id")
      .single();
    if (error) throw error;

    await logAudit(user.id, "create", "link", data!.id, parsed.data);
    return NextResponse.json({ ok: true, id: data!.id });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/links POST]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
