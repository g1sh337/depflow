import { webhookCallback } from "grammy";
import { getBot } from "@/server/bot";
import { deriveWebhookSecret } from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  return new Response("DepFlow bot webhook is alive [build:deploy-check-5]", { status: 200 });
}
