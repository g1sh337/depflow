import crypto from "node:crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface InitDataResult {
  ok: boolean;
  user?: TelegramUser;
  authDate?: number;
  reason?: string;
}

/**
 * Validate Telegram WebApp initData per the official algorithm:
 *   secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)
 *   hash       = HMAC_SHA256(key=secret_key,  msg=data_check_string)
 * See https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @param initData raw query string from window.Telegram.WebApp.initData
 * @param botToken bot token from BotFather
 * @param maxAgeSec reject data older than this (replay protection), default 24h
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86_400,
): InitDataResult {
  if (!initData) return { ok: false, reason: "empty_init_data" };
  if (!botToken) return { ok: false, reason: "missing_bot_token" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no_hash" };
  params.delete("hash");

  // data_check_string: keys sorted alphabetically, joined "key=value" by \n
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // constant-time compare
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) {
    return { ok: false, reason: "expired" };
  }

  let user: TelegramUser | undefined;
  const rawUser = params.get("user");
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as TelegramUser;
    } catch {
      return { ok: false, reason: "bad_user_json" };
    }
  }

  return { ok: true, user, authDate };
}
