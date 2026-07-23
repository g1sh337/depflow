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

  const [depsRes, wdsRes, geosRes, usersRes] = await Promise.all([
    sb.from("deposits").select("amount, type, geo_id, user_id, created_at").eq("is_deleted", false).gte("created_at", from).order("created_at", { ascending: true }),
    sb.from("withdrawals").select("amount, worker_share").eq("is_deleted", false).gte("created_at", from),
    sb.from("geos").select("id, code, flag_emoji"),
    sb.from("users").select("id, first_name, username"),
  ]);

  const deposits = depsRes.data ?? [];
  const withdrawals = wdsRes.data ?? [];
  const geo = new Map((geosRes.data ?? []).map((g) => [g.id, g]));
  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.first_name || (u.username ? `@${u.username}` : "?")]));

  const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const depSum = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const wdSum = withdrawals.reduce((s, w) => s + Number(w.amount), 0);
  const workerSum = withdrawals.reduce((s, w) => s + Number(w.worker_share ?? 0), 0);

  // group deposits by worker, keep insertion order
  const byUser = new Map<string, typeof deposits>();
  for (const d of deposits) {
    const uid = d.user_id ?? "?";
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(d);
  }

  let body = "";
  if (byUser.size === 0) {
    body = "Депов за сегодня нет.\n";
  } else {
    for (const [uid, deps] of byUser) {
      let sum = 0;
      body += `\n👤 *${userName.get(uid) ?? "?"}*\n`;
      for (const d of deps) {
        const g = geo.get(d.geo_id ?? "");
        const flag = g?.flag_emoji ?? "🌐";
        const code = g?.code ?? "";
        const redep = d.type === "redep" ? " 🔄" : "";
        body += `${flag} ${code} — ${Number(d.amount)}$${redep}\n`;
        sum += Number(d.amount);
      }
      body += `└ ${deps.length} деп · $${sum.toLocaleString("en-US")}\n`;
    }
  }

  return (
    `📊 *Дэпы отчёт · ${date}*\n` +
    body +
    `\n━━━━━━━━━━\n` +
    `*Всего депов:* ${deposits.length} · $${depSum.toLocaleString("en-US")}\n` +
    `*Выводы:* $${wdSum.toLocaleString("en-US")}\n` +
    `*Доля работников:* $${workerSum.toLocaleString("en-US")}\n` +
    `*Чистый (${bossNick}):* $${(wdSum - workerSum - depSum).toLocaleString("en-US")}`
  );
}
