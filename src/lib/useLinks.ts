"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { demoStore, IS_DEMO } from "./demo";
import { apiFetch } from "./api";
import type { DepositType, LinkTodayStats } from "./types";

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

    async addWithdrawal(linkId: string, amount: number) {
      if (IS_DEMO) {
        demoStore.addWithdrawal(linkId, amount);
        invalidate();
        return;
      }
      await apiFetch("/api/withdrawals", {
        method: "POST",
        body: JSON.stringify({ link_id: linkId, amount }),
      });
      invalidate();
    },
  };
}
