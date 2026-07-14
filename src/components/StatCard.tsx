"use client";

import { motion } from "framer-motion";

export function StatCard({
  label,
  value,
  accent = "#6d6df0",
  sub,
  index = 0,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass relative overflow-hidden p-4"
    >
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <p className="text-[11px] text-text-faint">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-text-faint">{sub}</p>}
    </motion.div>
  );
}
