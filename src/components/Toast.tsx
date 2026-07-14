"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { haptic } from "@/lib/utils";

type ToastKind = "success" | "warn" | "error";

interface ToastData {
  id: string;
  message: string;
  kind: ToastKind;
  onUndo?: () => void;
  duration: number;
}

interface ToastApi {
  show: (opts: { message: string; kind?: ToastKind; onUndo?: () => void; duration?: number }) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const KIND_STYLE: Record<ToastKind, { bar: string; text: string }> = {
  success: { bar: "#3ddc84", text: "text-status-success" },
  warn: { bar: "#ffb84d", text: "text-status-warn" },
  error: { bar: "#ff5c7a", text: "text-status-danger" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback<ToastApi["show"]>(
    ({ message, kind = "success", onUndo, duration = 5000 }) => {
      clearTimeout(timer.current);
      const t: ToastData = { id: crypto.randomUUID(), message, kind, onUndo, duration };
      setToast(t);
      haptic(kind === "error" ? "error" : "success");
      timer.current = setTimeout(() => setToast(null), duration);
    },
    [],
  );

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="glass-strong fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-2xl p-3 pl-4"
          >
            <span className="absolute left-0 top-0 h-full w-1" style={{ background: KIND_STYLE[toast.kind].bar }} />
            <span className={`text-sm font-semibold ${KIND_STYLE[toast.kind].text}`}>✓</span>
            <span className="flex-1 text-sm text-text">{toast.message}</span>
            {toast.onUndo && (
              <button
                onClick={() => {
                  toast.onUndo?.();
                  haptic("medium");
                  dismiss();
                }}
                className="tap-scale rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Отмена
              </button>
            )}
            {/* countdown line */}
            <motion.span
              className="absolute bottom-0 left-0 h-0.5"
              style={{ background: KIND_STYLE[toast.kind].bar }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: toast.duration / 1000, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  );
}
