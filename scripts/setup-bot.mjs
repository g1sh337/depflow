// Configure the Telegram bot: webhook, menu button, commands.
// Run once after deploy (or after changing the URL):
//   node scripts/setup-bot.mjs
// Requires env: TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL, TELEGRAM_WEBHOOK_SECRET
// Loads .env.local automatically if present.

import { readFileSync, existsSync } from "node:fs";

// --- tiny .env.local loader ---
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

if (!TOKEN || !APP_URL) {
  console.error("❌ Set TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_APP_URL (in .env.local or env).");
  process.exit(1);
}

const api = (method, body) =>
  fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

const webhookUrl = `${APP_URL.replace(/\/$/, "")}/api/bot`;

console.log("→ setWebhook:", webhookUrl);
console.log(await api("setWebhook", {
  url: webhookUrl,
  secret_token: SECRET || undefined,
  allowed_updates: ["message"],
  drop_pending_updates: true,
}));

console.log("→ setChatMenuButton (opens Mini App)");
console.log(await api("setChatMenuButton", {
  menu_button: { type: "web_app", text: "DepFlow", web_app: { url: APP_URL } },
}));

console.log("→ setMyCommands");
console.log(await api("setMyCommands", {
  commands: [
    { command: "start", description: "Открыть DepFlow" },
    { command: "help", description: "Помощь" },
  ],
}));

console.log("→ getWebhookInfo");
console.log(await api("getWebhookInfo", {}));
console.log("\n✅ Done. Open the bot in Telegram and press /start.");
