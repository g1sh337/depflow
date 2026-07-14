import { webhookCallback } from "grammy";
import { getBot } from "@/server/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Handler = (req: Request) => Promise<Response>;
let handler: Handler | null = null;

// Lazily build the webhook callback on first request so `next build`
// doesn't evaluate the bot (which needs TELEGRAM_BOT_TOKEN at runtime).
function getHandler(): Handler {
  if (!handler) {
    handler = webhookCallback(getBot(), "std/http", {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
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
  return new Response("DepFlow bot webhook is alive", { status: 200 });
}
