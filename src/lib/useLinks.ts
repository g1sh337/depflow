"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { demoStore, IS_DEMO } from "./demo";
import type { DepositType, LinkTodayStats } from "./types";

async function fetchLinks(): Promise<LinkTodayStats[]> {
  if (IS_DEMO) {
    // simulate a small network latency for skeletons on first load
    return demoStore.getLinks();
  }
  // TODO: Supabase path — select from `link_today_stats` view
  const { getSupabase } = await import("./supabase");
  const sb = getSupabase();
  const { data, error } = await sb.from("link_today_stats").select("*").order("plan_pct", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LinkTodayStats[];
}

export function useLinks() {
  return useQuery({ queryKey: ["links"], queryFn: fetchLinks });
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
      const { getSupabase } = await import("./supabase");
      const sb = getSupabase();
      const { data, error } = await sb
        .from("deposits")
        .insert({ link_id: linkId, amount, type })
        .select("id")
        .single();
      if (error) throw error;
      invalidate();
      return data!.id as string;
    },

    async undoDeposit(depId: string) {
      if (IS_DEMO) {
        demoStore.removeDeposit(depId);
        invalidate();
        return;
      }
      const { getSupabase } = await import("./supabase");
      const sb = getSupabase();
      await sb.from("deposits").update({ is_deleted: true }).eq("id", depId);
      invalidate();
    },

    async addWithdrawal(linkId: string, amount: number) {
      if (IS_DEMO) {
        demoStore.addWithdrawal(linkId, amount);
        invalidate();
        return;
      }
      const { getSupabase } = await import("./supabase");
      const sb = getSupabase();
      await sb.from("withdrawals").insert({ link_id: linkId, amount });
      invalidate();
    },
  };
}
