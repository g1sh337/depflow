import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";

const Body = z.object({
  role: z.enum(["admin", "user"]).optional(),
  is_active: z.boolean().optional(),
});

/** PATCH /api/users/[id] — admin: change a member's role or active state. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success || Object.keys(parsed.data).length === 0)
      return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });

    const sb = getServiceClient();

    // Guard: don't allow removing the last admin (avoid lockout).
    if (parsed.data.role === "user" || parsed.data.is_active === false) {
      const { data: target } = await sb.from("users").select("role").eq("id", params.id).maybeSingle();
      if (target?.role === "admin") {
        const { count } = await sb.from("users").select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true);
        if ((count ?? 0) <= 1) return NextResponse.json({ ok: false, reason: "last_admin" }, { status: 409 });
      }
    }

    const { error } = await sb.from("users").update(parsed.data).eq("id", params.id);
    if (error) throw error;

    await logAudit(user.id, "update", "user", params.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/users PATCH]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
