"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLinks } from "@/lib/useLinks";
import { LinkCard } from "@/components/LinkCard";
import { LinkCardSkeleton } from "@/components/ui/Skeleton";
import { RingProgress } from "@/components/ui/RingProgress";
import { formatMoney } from "@/lib/utils";
import type { LinkTodayStats } from "@/lib/types";

type Sort = "best" | "worst" | "plan" | "az";
const SORTS: { key: Sort; label: string }[] = [
  { key: "best", label: "Лучшие" },
  { key: "worst", label: "Худшие" },
  { key: "plan", label: "По плану" },
  { key: "az", label: "A–Z" },
];

export default function DashboardPage() {
  const { data: links, isLoading } = useLinks();
  const [sort, setSort] = useState<Sort>("best");

  const sorted = useMemo(() => {
    if (!links) return [];
    const arr = [...links];
    switch (sort) {
      case "best": return arr.sort((a, b) => b.plan_pct - a.plan_pct);
      case "worst": return arr.sort((a, b) => a.plan_pct - b.plan_pct);
      case "plan": return arr.sort((a, b) => b.plan_count - a.plan_count);
      case "az": return arr.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [links, sort]);

  const totals = useMemo(() => summarize(links ?? []), [links]);

  return (
    <main className="flex-1 px-4 pt-4">
      <Header />

      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong relative mt-4 flex items-center gap-5 overflow-hidden p-5"
      >
        <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-brand-500/20 blur-3xl" />
        <RingProgress value={totals.pct} size={104} color="#6d6df0">
          <span className="text-2xl font-bold tabular-nums">{totals.pct}%</span>
          <span className="text-[10px] text-text-faint">плана</span>
        </RingProgress>
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs text-text-faint">Депозитов сегодня</p>
            <p className="text-2xl font-bold tabular-nums">
              {totals.count}
              <span className="text-base font-medium text-text-faint"> / {totals.plan}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <Kpi label="Оборот" value={formatMoney(totals.sum, { compact: true })} />
            <Kpi label="Ссылок" value={`${totals.links}`} />
          </div>
        </div>
      </motion.section>

      {/* SORT */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              sort === s.key ? "bg-brand-500 text-white shadow-glow" : "glass text-text-soft"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="mt-3 space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <LinkCardSkeleton key={i} />)
          : sorted.map((l) => <LinkCard key={l.link_id} link={l} />)}
      </div>
    </main>
  );
}

function Header() {
  const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-text-faint">Сегодня · {date}</p>
        <h1 className="text-xl font-bold">Дашборд</h1>
      </div>
      <div className="glass grid h-10 w-10 place-items-center rounded-full text-sm font-bold">DF</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-faint">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function summarize(links: LinkTodayStats[]) {
  const count = links.reduce((s, l) => s + l.deposits_count, 0);
  const plan = links.reduce((s, l) => s + l.plan_count, 0);
  const sum = links.reduce((s, l) => s + l.deposits_sum, 0);
  return {
    count,
    plan,
    sum,
    links: links.length,
    pct: plan ? Math.round((count / plan) * 100) : 0,
  };
}
