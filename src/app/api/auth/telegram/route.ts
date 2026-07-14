import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { validateInitData, type TelegramUser } from "@/lib/telegram-auth";

export const runtime = "nodejs";

const HEADER = "x-telegram-init-data";

export async function POST(req: Request) {
  const initData = req.headers.get(HEADER) ?? (await bodyInitData(req));

  // Demo mode: no Supabase configured — accept an (optionally verified) user.
  if (!hasSupabase()) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    let user: TelegramUser | undefined;
    if (token && initData) {
      const r = validateInitData(initData, token);
      if (r.ok) user = r.user;
    } else {
      user = parseUserUnsafe(initData);
    }
    return NextResponse.json({ ok: true, demo: true, user });
  }

  // Real mode: resolve DB session.
  const proxied = new Request(req.url, { headers: { [HEADER]: initData ?? "" } });
  const session = await getSession(proxied);

  if (session.status === "authed") {
    return NextResponse.json({ ok: true, user: session.user });
  }
  if (session.status === "needs_key") {
    return NextResponse.json({ ok: false, needsKey: true, tgUser: session.tgUser });
  }
  return NextResponse.json({ ok: false, reason: session.reason }, { status: 401 });
}

async function bodyInitData(req: Request): Promise<string> {
  try {
    const body = await req.clone().json();
    return body?.initData ?? "";
  } catch {
    return "";
  }
}

function parseUserUnsafe(initData: string): TelegramUser | undefined {
  try {
    const raw = new URLSearchParams(initData).get("user");
    return raw ? (JSON.parse(raw) as TelegramUser) : undefined;
  } catch {
    return undefined;
  }
}
