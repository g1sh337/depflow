import crypto from "node:crypto";
import { webhookCallback } from "grammy";
import { getBot } from "@/server/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook secret is DERIVED from the bot token rather than read from a
 * separate env var — this guarantees the value the server enforces always
 * matches what we register with Telegram (setWebhook), with no risk of a
 * stale/mismatched TELEGRAM_WEBHOOK_SECRET. Must stay in sync with
 * scripts/setup-bot.mjs and the setWebhook call.
 */
export function deriveWebhookSecret(token: string): string {
  return crypto.createHash("sha256").update("depflow-webhook:" + token).digest("hex").slice(0, 40);
}

type Handler = (req: Request) => Promise<Response>;
let handler: Handler | null = null;

function getHandler(): Handler {
  if (!handler) {
    const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
    handler = webhookCallback(getBot(), "std/http", {
      secretToken: token ? deriveWebhookSecret(token) : undefined,
    });
  }
  return handler;
}

export async function POST(req: Request): Promise<Response> {
  try {
    return await getHandler()(req);
  } catch (e) {
    console.error("[webhook] failed:", e);
    return new Response("error", { status: 500 });
  }
}

export function GET(): Response {
  return new Response("DepFlow bot webhook is alive [build:deploy-check-4]", { status: 200 });
}
