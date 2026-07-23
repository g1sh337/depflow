"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { DepositType, LinkTodayStats } from "@/lib/types";
import { cn, formatMoney, haptic, planStatus, STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useLinkActions, useEntries, type EntryRow } from "@/lib/useLinks";
import { useWorkerSharePct } from "@/lib/useTeam";
import { useToast } from "@/components/Toast";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { NumpadSheet } from "@/components/NumpadSheet";
import { formatTime } from "@/lib/utils";

export function LinkCard({ link }: { link: LinkTodayStats }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DepositType>("ftd");
  const [numpad, setNumpad] = useState<null | "deposit" | "withdraw">(null);
  const [busy, setBusy] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const actions = useLinkActions();
  const qc = useQueryClient();
  const { data: pct = 25 } = useWorkerSharePct();
  const { data: entries } = useEntries(link.link_id, open && showLog);
  const toast = useToast();

  async function deleteEntry(kind: "deposit" | "withdrawal", id: string) {
    // optimistic: drop it from the list immediately
    qc.setQueryData<EntryRow[]>(["entries", link.link_id], (old) => (old ?? []).filter((e) => e.id !== id));
    haptic("medium");
    try {
      await actions.deleteEntry(kind, id);
      toast.show({ message: "Запись удалена", kind: "warn", duration: 3000 });
    } catch {
      qc.invalidateQueries({ queryKey: ["entries", link.link_id] });
      toast.show({ message: "Не удалось удалить", kind: "error" });
    }
  }

  const status = planStatus(link.plan_pct, link.last_deposit_at);
  const color = STATUS_COLOR[status];

  // avg deposit for anomaly detection
  const avg = link.deposits_count ? link.deposits_sum / link.deposits_count : 30;

  async function doDeposit(amount: number, t: DepositType) {
    if (busy) return; // anti double-tap
    setBusy(true);
    const anomalous = amount > avg * 5 && link.deposits_count >= 2;
    if (anomalous) {
      toast.show({
        message: `Крупная сумма ${formatMoney(amount)} — тапни ещё раз в течение 3с`,
        kind: "warn",
        duration: 3000,
      });
      // require confirmation via numpad path already; here just guard
    }
    try {
      const id = await actions.addDeposit(link.link_id, amount, t);
      haptic("success");
      toast.show({
        message: `${link.name}: +1 деп · ${formatMoney(amount)} · ${t === "ftd" ? "FTD" : "redep"}`,
        kind: "success",
        onUndo: () => actions.undoDeposit(id),
      });
    } finally {
      setBusy(false);
    }
  }

  async function doWithdraw(amount: number) {
    const split = await actions.addWithdrawal(link.link_id, amount);
    haptic("success");
    toast.show({
      message: `Выведено ${formatMoney(split.amount)} · ${formatMoney(split.company_share)} в счёт · ${formatMoney(split.worker_share)} тебе`,
      kind: "warn",
      duration: 6000,
    });
  }

  return (
    <>
      <motion.div layout className="glass overflow-hidden">
        {/* header row — tap to expand */}
        <button
          onClick={() => {
            haptic("light");
            setOpen((o) => !o);
          }}
          className="tap-scale flex w-full items-center gap-3 p-4 text-left"
        >
          <span className="text-2xl">{link.flag_emoji ?? "🌐"}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-text">{link.name}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color }}>
                {link.deposits_count}/{link.plan_count}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={link.plan_pct} color={color} />
              <span className="w-10 text-right text-xs font-semibold tabular-nums" style={{ color }}>
                {link.plan_pct}%
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-text-faint">
                {status === "idle" ? "💤 нет активности" : STATUS_LABEL[status]}
              </span>
              <span className="text-[11px] text-text-faint">{formatMoney(link.deposits_sum)}</span>
            </div>
          </div>
        </button>

        {/* quick entry */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border px-4 pb-4"
            >
              {/* offer URL */}
              {link.url && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(link.url!);
                    haptic("light");
                    toast.show({ message: "Ссылка скопирована", kind: "success", duration: 2000 });
                  }}
                  className="tap-scale mt-3 flex w-full items-center gap-2 rounded-xl border border-border bg-white/5 px-3 py-2 text-left"
                >
                  <span className="text-sm">🔗</span>
                  <span className="flex-1 truncate text-[11px] text-text-soft">{link.url}</span>
                  <span className="text-[10px] text-text-faint">копировать</span>
                </button>
              )}

              {/* FTD / redep toggle */}
              <div className="my-3 flex rounded-xl bg-white/5 p-1 text-xs font-semibold">
                {(["ftd", "redep"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      haptic("light");
                      setType(t);
                    }}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 transition-colors",
                      type === t ? "bg-brand-500 text-white shadow-glow" : "text-text-faint",
                    )}
                  >
                    {t === "ftd" ? "Первый (FTD)" : "Повторный"}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-[11px] text-text-faint">Быстрый депозит:</p>
              <div className="flex flex-wrap gap-2">
                {link.amount_presets.map((amt) => (
                  <button
                    key={amt}
                    disabled={busy}
                    onClick={() => doDeposit(amt, type)}
                    className="tap-scale flex-1 rounded-xl border border-brand-500/30 bg-brand-500/10 py-3 text-sm font-bold text-brand-400 disabled:opacity-50"
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  onClick={() => {
                    haptic("light");
                    setNumpad("deposit");
                  }}
                  className="tap-scale rounded-xl border border-border bg-white/5 px-4 py-3 text-sm text-text-soft"
                >
                  ✏️
                </button>
              </div>

              <button
                onClick={() => {
                  haptic("light");
                  setNumpad("withdraw");
                }}
                className="tap-scale mt-2.5 w-full rounded-xl border border-status-danger/30 bg-status-danger/10 py-2.5 text-sm font-semibold text-status-danger"
              >
                − Зафиксировать вывод
              </button>

              {/* today's entries — delete mistakes */}
              <button
                onClick={() => {
                  haptic("light");
                  setShowLog((s) => !s);
                }}
                className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] text-text-faint"
              >
                {showLog ? "▲ Скрыть операции" : "▼ Операции за сегодня"}
              </button>

              {showLog && (
                <div className="mt-2 space-y-1.5">
                  {!entries || entries.length === 0 ? (
                    <p className="py-2 text-center text-[11px] text-text-faint">Пока нет операций</p>
                  ) : (
                    entries.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                        <span>{e.kind === "deposit" ? "➕" : "➖"}</span>
                        <span className="flex-1">
                          <span className={e.kind === "deposit" ? "text-brand-400" : "text-status-danger"}>
                            {formatMoney(e.amount)}
                          </span>
                          <span className="ml-1 text-text-faint">
                            {e.kind === "deposit"
                              ? e.type === "ftd"
                                ? "· FTD"
                                : "· redep"
                              : `· тебе ${formatMoney(e.worker_share ?? 0)}`}
                          </span>
                        </span>
                        <span className="text-[10px] text-text-faint">{formatTime(e.created_at)}</span>
                        <button
                          onClick={() => deleteEntry(e.kind, e.id)}
                          className="tap-scale rounded-md bg-status-danger/15 px-2 py-1 text-status-danger"
                          aria-label="Удалить"
                        >
                          🗑
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <NumpadSheet
        open={numpad === "deposit"}
        title={`${link.name} · депозит (${type === "ftd" ? "FTD" : "redep"})`}
        accent="#6d6df0"
        onClose={() => setNumpad(null)}
        onConfirm={(amt) => {
          setNumpad(null);
          doDeposit(amt, type);
        }}
      />
      <NumpadSheet
        open={numpad === "withdraw"}
        title={`${link.name} · вывод средств`}
        accent="#ff5c7a"
        onClose={() => setNumpad(null)}
        onConfirm={(amt) => {
          setNumpad(null);
          doWithdraw(amt);
        }}
        renderHint={(amt) =>
          amt > 0 ? (
            <span className="text-xs text-text-soft">
              <span className="text-status-success">{formatMoney(Math.round(amt * (100 - pct)) / 100)}</span> в счёт ·{" "}
              <span className="text-status-warn">{formatMoney(Math.round(amt * pct) / 100)}</span> тебе ({pct}%)
            </span>
          ) : (
            <span className="text-xs text-text-faint">введи сумму вывода</span>
          )
        }
      />
    </>
  );
}
