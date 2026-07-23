"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useAdmins, sendReport } from "@/lib/useTeam";
import { useToast } from "@/components/Toast";
import { haptic } from "@/lib/utils";

export function ReportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: admins } = useAdmins();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function send(telegramId: number, mode: "report" | "ping") {
    setBusy(`${telegramId}:${mode}`);
    try {
      await sendReport(telegramId, mode);
      haptic("success");
      toast.show({ message: mode === "ping" ? "Пинг отправлен 🔔" : "Отчёт отправлен 📊", kind: "success" });
      onClose();
    } catch {
      toast.show({ message: "Не удалось отправить (получатель ещё не открывал бота?)", kind: "error", duration: 5000 });
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl p-5 pb-8"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="mb-1 text-center text-base font-bold">Начальнику</h2>
            <p className="mb-4 text-center text-[11px] text-text-faint">
              Отчёт за сегодня или пинг «зайди посмотри» — придёт в личку боту
            </p>

            {!admins || admins.length === 0 ? (
              <p className="py-4 text-center text-xs text-text-faint">Нет доступных админов</p>
            ) : (
              <div className="space-y-2">
                {admins.map((a) => (
                  <div key={a.id} className="glass flex items-center gap-3 p-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold">
                      {(a.first_name ?? "A").charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{a.first_name ?? "Админ"}</p>
                      {a.username && <p className="text-[11px] text-text-faint">@{a.username}</p>}
                    </div>
                    <button
                      onClick={() => send(a.telegram_id, "ping")}
                      disabled={!!busy}
                      className="tap-scale rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      🔔 Пинг
                    </button>
                    <button
                      onClick={() => send(a.telegram_id, "report")}
                      disabled={!!busy}
                      className="tap-scale rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      📊 Отчёт
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
