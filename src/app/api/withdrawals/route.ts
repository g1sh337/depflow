import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";
import { getWorkerSharePct } from "@/lib/settings";

export const runtime = "nodejs";

const Body = z.object({
  link_id: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
});

/** POST /api/withdrawals — record a withdrawal + compute the worker/company split. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });
    const { link_id, amount } = parsed.data;

    const pct = await getWorkerSharePct();
    const workerShare = Math.round(amount * pct) / 100;
    const companyShare = Math.round((amount - workerShare) * 100) / 100;

    const sb = getServiceClient();
    const { data, error } = await sb
      .from("withdrawals")
      .insert({ link_id, amount, worker_share: workerShare, user_id: user.id })
      .select("id")
      .single();
    if (error) throw error;

    await logAudit(user.id, "create", "withdrawal", data!.id, { amount, link_id, worker_share: workerShare });
    return NextResponse.json({
      ok: true,
      id: data!.id,
      split: { amount, worker_share: workerShare, company_share: companyShare, pct },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/withdrawals]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
