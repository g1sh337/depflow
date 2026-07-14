import "server-only";
import { Bot, InlineKeyboard } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL; // e.g. https://depflow.up.railway.app

let bot: Bot | null = null;

/** Singleton bot instance (webhook mode — no polling started here). */
export function getBot(): Bot {
  if (bot) return bot;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  bot = new Bot(token);
  registerHandlers(bot);
  return bot;
}

function registerHandlers(b: Bot) {
  b.command("start", async (ctx) => {
    const name = ctx.from?.first_name ?? "трейдер";
    const kb = appUrl
      ? new InlineKeyboard().webApp("🚀 Открыть DepFlow", appUrl)
      : undefined;
    await ctx.reply(
      `Привет, ${name}! 👋\n\n` +
        `Это *DepFlow* — учёт депозитов и выводов команды.\n` +
        `Нажми кнопку ниже, чтобы открыть приложение.`,
      { parse_mode: "Markdown", reply_markup: kb },
    );
  });

  b.command("help", async (ctx) => {
    await ctx.reply(
      "DepFlow — трекер депозитов/выводов.\n\n" +
        "• Кнопка меню (◉ слева от поля ввода) открывает приложение.\n" +
        "• /start — приветствие и кнопка запуска.\n" +
        "Доступ выдаёт администратор по инвайт-ключу.",
    );
  });

  // Fallback for any text
  b.on("message:text", async (ctx) => {
    const kb = appUrl ? new InlineKeyboard().webApp("🚀 Открыть DepFlow", appUrl) : undefined;
    await ctx.reply("Открой приложение кнопкой ниже 👇", { reply_markup: kb });
  });

  b.catch((err) => {
    console.error("[bot] error:", err.error);
  });
}
