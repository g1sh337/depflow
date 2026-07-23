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
  period: z.enum(["today", "yesterday", "7d", "30d", "custom"]).default("today"),
  days: z.number().int().min(1).max(365).optional(),
});

function startOfDay(d: Date): Date {
  const local = new Date(d.getTime() + TZ_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TZ_OFFSET_MS);
}
const fmtDay = (d: Date) => new Date(d.getTime() + TZ_OFFSET_MS).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
const dayKey = (iso: string) => new Date(new Date(iso).getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
/** Escape user-provided text for Telegram HTML parse mode. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function rangeFor(period: string, days?: number): { from: Date; to: Date; label: string; multiDay: boolean } {
  const now = new Date();
  const today0 = startOfDay(now);
  switch (period) {
    case "yesterday": {
      const y = new Date(today0.getTime() - 86400_000);
      return { from: y, to: today0, label: fmtDay(y), multiDay: false };
    }
    case "7d":
      return { from: new Date(today0.getTime() - 6 * 86400_000), to: now, label: `${fmtDay(new Date(today0.getTime() - 6 * 86400_000))} – ${fmtDay(now)} · 7 дней`, multiDay: true };
    case "30d":
      return { from: new Date(today0.getTime() - 29 * 86400_000), to: now, label: `${fmtDay(new Date(today0.getTime() - 29 * 86400_000))} – ${fmtDay(now)} · 30 дней`, multiDay: true };
    case "custom": {
      const n = days ?? 2;
      const from = new Date(today0.getTime() - (n - 1) * 86400_000);
      return { from, to: now, label: `${fmtDay(from)} – ${fmtDay(now)} · ${n} дн.`, multiDay: n > 1 };
    }
    default:
      return { from: today0, to: now, label: fmtDay(now), multiDay: false };
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });
    const { to_telegram_id, mode, period, days } = parsed.data;

    const sb = getServiceClient();
    const who = user.first_name || user.username || "Работник";

    const { data: boss } = await sb.from("users").select("first_name, username").eq("telegram_id", to_telegram_id).maybeSingle();
    const bossNick = boss?.username ? `@${boss.username}` : boss?.first_name || "начальник";

    let text: string;
    if (mode === "ping") {
      text = `🔔 <b>${esc(who)}</b> просит зайти в DepFlow и посмотреть 👀`;
    } else {
      text = await buildReport(sb, bossNick, rangeFor(period, days));
    }

    await getBot().api.sendMessage(to_telegram_id, text, { parse_mode: "HTML" });
    await logAudit(user.id, "create", "report", null, { to: to_telegram_id, mode, period });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api/report]", e);
    return NextResponse.json({ ok: false, reason: "send_failed" }, { status: 500 });
  }
}

async function buildReport(
  sb: ReturnType<typeof getServiceClient>,
  bossNick: string,
  range: { from: Date; to: Date; label: string; multiDay: boolean },
): Promise<string> {
  const fromISO = range.from.toISOString();
  const toISO = range.to.toISOString();

  const [depsRes, wdsRes, geosRes, usersRes] = await Promise.all([
    sb.from("deposits").select("amount, type, geo_id, user_id, created_at").eq("is_deleted", false).gte("created_at", fromISO).lte("created_at", toISO),
    sb.from("withdrawals").select("amount, worker_share").eq("is_deleted", false).gte("created_at", fromISO).lte("created_at", toISO),
    sb.from("geos").select("id, code, flag_emoji"),
    sb.from("users").select("id, first_name, username"),
  ]);

  const deposits = depsRes.data ?? [];
  const withdrawals = wdsRes.data ?? [];
  const geo = new Map((geosRes.data ?? []).map((g) => [g.id, g]));
  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.first_name || (u.username ? `@${u.username}` : "?")]));

  const geoLabel = (id: string | null) => {
    const g = geo.get(id ?? "");
    return `${g?.flag_emoji ?? "🌐"} ${esc(g?.code ?? "?")}`;
  };

  // aggregate: worker -> geo -> {ftd, redep, sum}
  type Agg = { ftd: number; redep: number; sum: number };
  const byUser = new Map<string, Map<string, Agg>>();
  const byGeo = new Map<string, Agg>();
  let ftdCount = 0, ftdSum = 0, redepCount = 0, redepSum = 0;

  for (const d of deposits) {
    const amt = Number(d.amount);
    const isRedep = d.type === "redep";
    if (isRedep) { redepCount++; redepSum += amt; } else { ftdCount++; ftdSum += amt; }

    const uid = d.user_id ?? "?";
    const gl = geoLabel(d.geo_id);
    if (!byUser.has(uid)) byUser.set(uid, new Map());
    const um = byUser.get(uid)!;
    const a = um.get(gl) ?? { ftd: 0, redep: 0, sum: 0 };
    if (isRedep) a.redep++; else a.ftd++;
    a.sum += amt;
    um.set(gl, a);

    const ga = byGeo.get(gl) ?? { ftd: 0, redep: 0, sum: 0 };
    if (isRedep) ga.redep++; else ga.ftd++;
    ga.sum += amt;
    byGeo.set(gl, ga);
  }

  const wdSum = withdrawals.reduce((s, w) => s + Number(w.amount), 0);
  const workerSum = withdrawals.reduce((s, w) => s + Number(w.worker_share ?? 0), 0);
  const net = wdSum - workerSum - (ftdSum + redepSum);

  const geoLine = (a: Agg) => `${a.ftd} деп${a.redep ? ` · ${a.redep} редеп` : ""} · ${money(a.sum)}`;

  // --- per worker ---
  let body = "";
  if (byUser.size === 0) {
    body = "\nЗа период депов нет.\n";
  } else {
    for (const [uid, gm] of byUser) {
      let uf = 0, ur = 0, us = 0;
      body += `\n👤 <b>${esc(userName.get(uid) ?? "?")}</b>\n`;
      for (const [gl, a] of [...gm.entries()].sort((x, y) => y[1].sum - x[1].sum)) {
        body += `${gl} — ${geoLine(a)}\n`;
        uf += a.ftd; ur += a.redep; us += a.sum;
      }
      body += `└ Итого: ${uf} деп${ur ? ` · ${ur} редеп` : ""} · ${money(us)}\n`;
    }
  }

  // --- team totals by geo ---
  let geoBlock = "";
  if (byGeo.size > 0) {
    geoBlock = `\n🌍 <b>По гео (вся команда)</b>\n`;
    for (const [gl, a] of [...byGeo.entries()].sort((x, y) => y[1].sum - x[1].sum)) {
      geoBlock += `${gl} — ${a.ftd} деп${a.redep ? ` · ${a.redep} редеп` : ""}\n`;
    }
  }

  // --- per-day progression (multi-day only) ---
  let dayBlock = "";
  if (range.multiDay && deposits.length) {
    const perDay = new Map<string, { ops: number; sum: number }>();
    for (const d of deposits) {
      const k = dayKey(d.created_at);
      const cur = perDay.get(k) ?? { ops: 0, sum: 0 };
      cur.ops++; cur.sum += Number(d.amount);
      perDay.set(k, cur);
    }
    dayBlock = `\n📅 <b>По дням</b>\n`;
    for (const [k, v] of [...perDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
      const dd = k.slice(8, 10) + "." + k.slice(5, 7);
      dayBlock += `${dd} — ${v.ops} оп · ${money(v.sum)}\n`;
    }
  }

  return (
    `📊 <b>DepFlow · Отчёт</b>\n🗓 ${esc(range.label)}\n` +
    body +
    geoBlock +
    dayBlock +
    `\n━━━━━━━━━━\n` +
    `💰 <b>Депозиты:</b> ${ftdCount} · ${money(ftdSum)}\n` +
    `🔄 <b>Редепы:</b> ${redepCount} · ${money(redepSum)}\n` +
    `📤 <b>Выводы:</b> ${money(wdSum)}\n` +
    `👥 <b>Доля работников:</b> ${money(workerSum)}\n` +
    `✅ <b>Чистый (${esc(bossNick)}):</b> ${money(net)}`
  );
}
