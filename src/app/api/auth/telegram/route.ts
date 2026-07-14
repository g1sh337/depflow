import { NextResponse } from "next/server";
import { validateInitData, type TelegramUser } from "@/lib/telegram-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let initData = "";
  try {
    const body = await req.json();
    initData = body?.initData ?? "";
  } catch {
    /* ignore */
  }

  // Dev / demo fallback: no bot token configured — accept an unverified user
  // so the app is usable outside Telegram. NEVER trust this in production.
  if (!token) {
    const user = parseUserUnsafe(initData);
    return NextResponse.json({ ok: true, demo: true, user });
  }

  const result = validateInitData(initData, token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 401 });
  }

  // TODO (Supabase step): upsert user, enforce invite-key gating, issue JWT.
  const res = NextResponse.json({ ok: true, user: result.user });
  if (result.user) {
    res.cookies.set("df_uid", String(result.user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return res;
}

function parseUserUnsafe(initData: string): TelegramUser | undefined {
  try {
    const raw = new URLSearchParams(initData).get("user");
    return raw ? (JSON.parse(raw) as TelegramUser) : undefined;
  } catch {
    return undefined;
  }
}
