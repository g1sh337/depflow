import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function genCode(): string {
  const seg = () =>
    Array.from({ length: 3 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

/** GET /api/invite-keys — admin: list keys. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const sb = getServiceClient();
    const { data } = await sb.from("invite_keys").select("*").order("created_at", { ascending: false });
    return NextResponse.json({ ok: true, keys: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}

const Body = z.object({ role: z.enum(["admin", "user"]).default("user") });

/** POST /api/invite-keys — admin: create a key. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    const role = parsed.success ? parsed.data.role : "user";

    const sb = getServiceClient();
    const code = genCode();
    const { data, error } = await sb
      .from("invite_keys")
      .insert({ code, role, created_by: user.id })
      .select("*")
      .single();
    if (error) throw error;

    await logAudit(user.id, "create", "invite_key", data!.id, { code, role });
    return NextResponse.json({ ok: true, key: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
