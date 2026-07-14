import "server-only";
import { validateInitData, type TelegramUser } from "./telegram-auth";
import { getServiceClient } from "./supabase-server";
import type { AppUser } from "./types";

const HEADER = "x-telegram-init-data";

export type SessionResult =
  | { status: "authed"; user: AppUser }
  | { status: "needs_key"; tgUser: TelegramUser }
  | { status: "unauthorized"; reason: string };

/** Validate the initData header and return the Telegram user (or null). */
export function readTelegramUser(req: Request): { tgUser: TelegramUser | null; reason?: string } {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const initData = req.headers.get(HEADER) ?? "";
  if (!initData) return { tgUser: null, reason: "no_init_data" };
  const res = validateInitData(initData, token);
  if (!res.ok) return { tgUser: null, reason: res.reason };
  return { tgUser: res.user ?? null };
}

/**
 * Resolve the current session:
 *  - existing user  -> authed
 *  - unknown user, users table empty -> bootstrap as admin (first login)
 *  - unknown user, table non-empty -> needs_key (must redeem an invite)
 */
export async function getSession(req: Request): Promise<SessionResult> {
  const { tgUser, reason } = readTelegramUser(req);
  if (!tgUser) return { status: "unauthorized", reason: reason ?? "invalid" };

  const sb = getServiceClient();
  const { data: existing } = await sb
    .from("users")
    .select("*")
    .eq("telegram_id", tgUser.id)
    .maybeSingle();

  if (existing) {
    if (!existing.is_active) return { status: "unauthorized", reason: "deactivated" };
    await sb.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", existing.id);
    return { status: "authed", user: existing as AppUser };
  }

  // Bootstrap: if there are no users yet, the first login becomes admin.
  const { count } = await sb.from("users").select("id", { count: "exact", head: true });
  if ((count ?? 0) === 0) {
    const user = await upsertUser(tgUser, "admin");
    await logAudit(user.id, "login", "user", user.id, { bootstrap: true });
    return { status: "authed", user };
  }

  return { status: "needs_key", tgUser };
}

/** Require an already-registered user; throws a Response on failure. */
export async function requireUser(req: Request): Promise<AppUser> {
  const session = await getSession(req);
  if (session.status === "authed") return session.user;
  throw new Response(JSON.stringify({ ok: false, reason: session.status }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export async function upsertUser(tg: TelegramUser, role: "admin" | "user"): Promise<AppUser> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("users")
    .upsert(
      {
        telegram_id: tg.id,
        username: tg.username ?? null,
        first_name: tg.first_name ?? null,
        photo_url: tg.photo_url ?? null,
        role,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "telegram_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as AppUser;
}

export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  changes?: Record<string, unknown>,
) {
  const sb = getServiceClient();
  await sb.from("audit_logs").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes: changes ?? null,
  });
}
