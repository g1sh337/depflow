import { NextResponse } from "next/server";
import { getServiceClient, hasSupabase } from "@/lib/supabase-server";
import { readTelegramUser, upsertUser, logAudit } from "@/lib/session";

export const runtime = "nodejs";

/** Redeem an invite key: binds the key to the caller's Telegram ID and creates the user. */
export async function POST(req: Request) {
  if (!hasSupabase()) return NextResponse.json({ ok: false, reason: "no_db" }, { status: 400 });

  const { tgUser, reason } = readTelegramUser(req);
  if (!tgUser) return NextResponse.json({ ok: false, reason: reason ?? "invalid" }, { status: 401 });

  let code = "";
  try {
    code = ((await req.json())?.code ?? "").trim().toUpperCase();
  } catch {
    /* ignore */
  }
  if (!code) return NextResponse.json({ ok: false, reason: "no_code" }, { status: 400 });

  const sb = getServiceClient();

  // Already registered? Just return the user.
  const { data: existing } = await sb.from("users").select("*").eq("telegram_id", tgUser.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, user: existing });

  const { data: key } = await sb
    .from("invite_keys")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!key) return NextResponse.json({ ok: false, reason: "key_not_found" }, { status: 404 });
  if (key.used_by) return NextResponse.json({ ok: false, reason: "key_used" }, { status: 409 });
  if (key.expires_at && new Date(key.expires_at) < new Date())
    return NextResponse.json({ ok: false, reason: "key_expired" }, { status: 410 });

  const user = await upsertUser(tgUser, key.role ?? "user");
  await sb.from("invite_keys").update({ used_by: user.id, used_at: new Date().toISOString() }).eq("id", key.id);
  await logAudit(user.id, "login", "user", user.id, { redeemed_key: code });

  return NextResponse.json({ ok: true, user });
}
