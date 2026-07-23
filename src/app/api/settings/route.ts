import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/settings — worker share % (any authed user). */
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const sb = getServiceClient();
    const { data } = await sb.from("app_settings").select("worker_share_pct").eq("id", 1).maybeSingle();
    return NextResponse.json({ ok: true, worker_share_pct: Number(data?.worker_share_pct ?? 25) });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}

const Body = z.object({ worker_share_pct: z.number().min(0).max(100) });

/** PATCH /api/settings — admin: change worker share %. */
export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });

    const sb = getServiceClient();
    const { error } = await sb
      .from("app_settings")
      .update({ worker_share_pct: parsed.data.worker_share_pct, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;

    await logAudit(user.id, "update", "settings", null, parsed.data);
    return NextResponse.json({ ok: true, worker_share_pct: parsed.data.worker_share_pct });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
