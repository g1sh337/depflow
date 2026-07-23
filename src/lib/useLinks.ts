"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { demoStore, IS_DEMO } from "./demo";
import { apiFetch } from "./api";
import type { DepositType, LinkTodayStats } from "./types";

export interface WithdrawalSplit {
  amount: number;
  worker_share: number;
  company_share: number;
  pct: number;
}

async function fetchLinks(): Promise<LinkTodayStats[]> {
  if (IS_DEMO) return demoStore.getLinks();
  const { links } = await apiFetch<{ links: LinkTodayStats[] }>("/api/links");
  return links ?? [];
}

export function useLinks() {
  return useQuery({
    queryKey: ["links"],
    queryFn: fetchLinks,
    // near-real-time without page reload
    refetchInterval: IS_DEMO ? false : 4000,
  });
}

export function useLinkActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["links"] });

  return {
    /** Returns the created deposit id (for undo). */
    async addDeposit(linkId: string, amount: number, type: DepositType): Promise<string> {
      if (IS_DEMO) {
        const dep = demoStore.addDeposit(linkId, amount, type);
        invalidate();
        return dep.id;
      }
      const { id } = await apiFetch<{ id: string }>("/api/deposits", {
        method: "POST",
        body: JSON.stringify({ link_id: linkId, amount, type }),
      });
      invalidate();
      return id;
    },

    async undoDeposit(depId: string) {
      if (IS_DEMO) {
        demoStore.removeDeposit(depId);
        invalidate();
        return;
      }
      await apiFetch(`/api/deposits/${depId}/undo`, { method: "POST" });
      invalidate();
    },

    async addWithdrawal(linkId: string, amount: number): Promise<WithdrawalSplit> {
      if (IS_DEMO) {
        demoStore.addWithdrawal(linkId, amount);
        invalidate();
        const worker = Math.round(amount * 25) / 100;
        return { amount, worker_share: worker, company_share: amount - worker, pct: 25 };
      }
      const { split } = await apiFetch<{ split: WithdrawalSplit }>("/api/withdrawals", {
        method: "POST",
        body: JSON.stringify({ link_id: linkId, amount }),
      });
      invalidate();
      return split;
    },
  };
}
