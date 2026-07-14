import type { LinkTodayStats, Deposit, Withdrawal, DepositType } from "./types";

/**
 * Demo in-memory data layer. Used when Supabase env vars are absent
 * (NEXT_PUBLIC_SUPABASE_URL not set), so the UI is fully playable locally.
 */

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const DEMO_LINKS: LinkTodayStats[] = [
  {
    link_id: "l1", name: "RU1", geo_id: "g1", geo_code: "RU1", flag_emoji: "🇷🇺",
    plan_count: 10, plan_amount: 500, amount_presets: [15, 25, 50, 100],
    is_archived: false, deposits_count: 8, deposits_sum: 340,
    last_deposit_at: minsAgo(12), plan_pct: 80,
  },
  {
    link_id: "l2", name: "RU2", geo_id: "g2", geo_code: "RU2", flag_emoji: "🇷🇺",
    plan_count: 10, plan_amount: 500, amount_presets: [15, 25, 50, 100],
    is_archived: false, deposits_count: 7, deposits_sum: 295,
    last_deposit_at: minsAgo(40), plan_pct: 70,
  },
  {
    link_id: "l3", name: "EG", geo_id: "g3", geo_code: "EG", flag_emoji: "🇪🇬",
    plan_count: 15, plan_amount: 450, amount_presets: [10, 20, 30, 50],
    is_archived: false, deposits_count: 15, deposits_sum: 480,
    last_deposit_at: minsAgo(5), plan_pct: 100,
  },
  {
    link_id: "l4", name: "KZ", geo_id: "g4", geo_code: "KZ", flag_emoji: "🇰🇿",
    plan_count: 12, plan_amount: 400, amount_presets: [15, 30, 60],
    is_archived: false, deposits_count: 3, deposits_sum: 90,
    last_deposit_at: minsAgo(210), plan_pct: 25,
  },
  {
    link_id: "l5", name: "UZ", geo_id: "g5", geo_code: "UZ", flag_emoji: "🇺🇿",
    plan_count: 8, plan_amount: 320, amount_presets: [20, 40, 80],
    is_archived: false, deposits_count: 9, deposits_sum: 410,
    last_deposit_at: minsAgo(20), plan_pct: 113,
  },
  {
    link_id: "l6", name: "IN", geo_id: "g6", geo_code: "IN", flag_emoji: "🇮🇳",
    plan_count: 20, plan_amount: 300, amount_presets: [5, 10, 20, 40],
    is_archived: false, deposits_count: 4, deposits_sum: 70,
    last_deposit_at: minsAgo(75), plan_pct: 20,
  },
];

// Mutable copies for the session
let links: LinkTodayStats[] = DEMO_LINKS.map((l) => ({ ...l }));
const deposits: Deposit[] = [];
const withdrawals: Withdrawal[] = [];

export const demoStore = {
  getLinks(): LinkTodayStats[] {
    return links.map((l) => ({ ...l }));
  },

  addDeposit(linkId: string, amount: number, type: DepositType): Deposit {
    const link = links.find((l) => l.link_id === linkId);
    const dep: Deposit = {
      id: crypto.randomUUID(),
      link_id: linkId,
      geo_id: link?.geo_id ?? null,
      amount,
      type,
      user_id: "me",
      created_at: new Date().toISOString(),
    };
    deposits.push(dep);
    if (link) {
      link.deposits_count += 1;
      link.deposits_sum += amount;
      link.last_deposit_at = dep.created_at;
      link.plan_pct = link.plan_count
        ? Math.round((link.deposits_count / link.plan_count) * 100)
        : 0;
    }
    return dep;
  },

  removeDeposit(depId: string) {
    const idx = deposits.findIndex((d) => d.id === depId);
    if (idx === -1) return;
    const [dep] = deposits.splice(idx, 1);
    const link = links.find((l) => l.link_id === dep.link_id);
    if (link) {
      link.deposits_count = Math.max(0, link.deposits_count - 1);
      link.deposits_sum = Math.max(0, link.deposits_sum - dep.amount);
      link.plan_pct = link.plan_count
        ? Math.round((link.deposits_count / link.plan_count) * 100)
        : 0;
    }
  },

  addWithdrawal(linkId: string, amount: number): Withdrawal {
    const w: Withdrawal = {
      id: crypto.randomUUID(),
      link_id: linkId,
      amount,
      user_id: "me",
      created_at: new Date().toISOString(),
    };
    withdrawals.push(w);
    return w;
  },

  getDeposits: () => [...deposits],
  getWithdrawals: () => [...withdrawals],
};

export const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL;
