import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ_OFFSET_MS = 3 * 3600_000; // Europe/Moscow

function todayStart(): string {
  const local = new Date(Date.now() + TZ_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TZ_OFFSET_MS).toISOString();
}

export interface EntryRow {
  id: string;
  kind: "deposit" | "withdrawal";
  amount: number;
  type: "ftd" | "redep" | null;
  worker_share: number | null;
  created_at: string;
}

/** GET /api/entries?link_id=... — today's deposits + withdrawals for a link (newest first). */
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const linkId = new URL(req.url).searchParams.get("link_id");
    if (!linkId) return NextResponse.json({ ok: false, reason: "no_link" }, { status: 400 });

    const sb = getServiceClient();
    const from = todayStart();
    const [depsRes, wdsRes] = await Promise.all([
      sb.from("deposits").select("id, amount, type, created_at").eq("link_id", linkId).eq("is_deleted", false).gte("created_at", from),
      sb.from("withdrawals").select("id, amount, worker_share, created_at").eq("link_id", linkId).eq("is_deleted", false).gte("created_at", from),
    ]);

    const entries: EntryRow[] = [
      ...(depsRes.data ?? []).map((d) => ({ id: d.id, kind: "deposit" as const, amount: Number(d.amount), type: d.type, worker_share: null, created_at: d.created_at })),
      ...(wdsRes.data ?? []).map((w) => ({ id: w.id, kind: "withdrawal" as const, amount: Number(w.amount), type: null, worker_share: Number(w.worker_share ?? 0), created_at: w.created_at })),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return NextResponse.json({ ok: true, entries });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/entries]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
