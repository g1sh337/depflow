"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { haptic } from "@/lib/utils";
import { Portal } from "@/components/Portal";

interface Props {
  open: boolean;
  title: string;
  accent?: string;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  /** Optional live hint under the amount (e.g. the withdrawal split). */
  renderHint?: (amount: number) => React.ReactNode;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function NumpadSheet({ open, title, accent = "#6d6df0", onClose, onConfirm, renderHint }: Props) {
  const [value, setValue] = useState("");

  function press(k: string) {
    haptic("light");
    if (k === "⌫") return setValue((v) => v.slice(0, -1));
    if (k === "." && value.includes(".")) return;
    if (k === "." && value === "") return setValue("0.");
    setValue((v) => (v.length < 8 ? v + k : v));
  }

  function confirm() {
    const n = parseFloat(value);
    if (!n || n <= 0) return haptic("error");
    onConfirm(n);
    setValue("");
  }

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setValue("");
              onClose();
            }}
          />
          <motion.div
            className="glass-strong fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl p-5 pb-8"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <p className="mb-1 text-center text-sm text-text-soft">{title}</p>
            <div className="mb-2 text-center text-4xl font-bold tabular-nums" style={{ color: accent }}>
              ${value || "0"}
            </div>
            {renderHint && <div className="mb-4 min-h-[20px] text-center">{renderHint(parseFloat(value) || 0)}</div>}
            {!renderHint && <div className="mb-4" />}
            <div className="grid grid-cols-3 gap-2.5">
              {KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className="tap-scale glass rounded-xl py-4 text-xl font-semibold text-text active:bg-white/10"
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              onClick={confirm}
              className="tap-scale mt-4 w-full rounded-2xl py-4 text-base font-bold text-white"
              style={{ background: `linear-gradient(90deg, ${accent}, ${accent}dd)`, boxShadow: `0 8px 24px ${accent}55` }}
            >
              Подтвердить
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </Portal>
  );
}
