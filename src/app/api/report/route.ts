import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase-server";
import { requireUser, logAudit } from "@/lib/session";
import { getBot } from "@/server/bot";

export const runtime = "nodejs";

const TZ_OFFSET_MS = 3 * 3600_000; // Europe/Moscow

const Body = z.object({
  to_telegram_id: z.number().int(),
  mode: z.enum(["report", "ping"]).default("report"),
});

function todayStart(): Date {
  const local = new Date(Date.now() + TZ_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TZ_OFFSET_MS);
}

/** POST /api/report — send today's report (or a ping) to an admin via the bot. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });
    const { to_telegram_id, mode } = parsed.data;

    const sb = getServiceClient();
    const who = user.first_name || user.username || "Работник";

    // recipient (the chosen boss) — for labelling the report
    const { data: boss } = await sb
      .from("users")
      .select("first_name, username")
      .eq("telegram_id", to_telegram_id)
      .maybeSingle();
    const bossNick = boss?.username ? `@${boss.username}` : boss?.first_name || "начальник";

    let text: string;
    if (mode === "ping") {
      text = `🔔 *${who}* просит зайти в DepFlow и посмотреть 👀`;
    } else {
      text = await buildReport(sb, who, bossNick);
    }

    const bot = getBot();
    await bot.api.sendMessage(to_telegram_id, text, { parse_mode: "Markdown" });

    await logAudit(user.id, "create", "report", null, { to: to_telegram_id, mode });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/report]", e);
    return NextResponse.json({ ok: false, reason: "send_failed" }, { status: 500 });
  }
}

async function buildReport(sb: ReturnType<typeof getServiceClient>, who: string, bossNick: string): Promise<string> {
  const from = todayStart().toISOString();

  const [depsRes, wdsRes, geosRes, linksRes] = await Promise.all([
    sb.from("deposits").select("amount, link_id, geo_id").eq("is_deleted", false).gte("created_at", from),
    sb.from("withdrawals").select("amount, worker_share").eq("is_deleted", false).gte("created_at", from),
    sb.from("geos").select("id, code"),
    sb.from("links").select("id, name"),
  ]);

  const deposits = depsRes.data ?? [];
  const withdrawals = wdsRes.data ?? [];
  const linkName = new Map((linksRes.data ?? []).map((l) => [l.id, l.name]));

  // deposits count per link
  const perLink = new Map<string, number>();
  for (const d of deposits) {
    const name = linkName.get(d.link_id ?? "") ?? "?";
    perLink.set(name, (perLink.get(name) ?? 0) + 1);
  }

  const depSum = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const wdSum = withdrawals.reduce((s, w) => s + Number(w.amount), 0);
  const workerSum = withdrawals.reduce((s, w) => s + Number(w.worker_share ?? 0), 0);
  const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  const lines = [...perLink.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} — ${c}`);

  return (
    `📊 *Отчёт за ${date}* (от ${who})\n\n` +
    `*Кол-во депов:*\n${lines.length ? lines.join("\n") : "—"}\n\n` +
    `*Сумма депов:* $${depSum.toLocaleString("en-US")}\n` +
    `*Сумма выводов:* $${wdSum.toLocaleString("en-US")}\n` +
    `*Доля работников:* $${workerSum.toLocaleString("en-US")}\n` +
    `*Чистый (${bossNick}):* $${(wdSum - workerSum - depSum).toLocaleString("en-US")}`
  );
}
