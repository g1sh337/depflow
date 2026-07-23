"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { IS_DEMO } from "./demo";

export interface Admin {
  id: string;
  telegram_id: number;
  first_name: string | null;
  username: string | null;
}

/** Global worker-share percentage. */
export function useWorkerSharePct() {
  return useQuery({
    queryKey: ["settings", "worker_share_pct"],
    queryFn: async (): Promise<number> => {
      if (IS_DEMO) return 25;
      const { worker_share_pct } = await apiFetch<{ worker_share_pct: number }>("/api/settings");
      return worker_share_pct;
    },
    staleTime: 60_000,
  });
}

export function useAdmins() {
  return useQuery({
    queryKey: ["admins"],
    queryFn: async (): Promise<Admin[]> => {
      if (IS_DEMO)
        return [{ id: "a1", telegram_id: 1, first_name: "Начальник", username: "boss" }];
      const { admins } = await apiFetch<{ admins: Admin[] }>("/api/admins");
      return admins ?? [];
    },
    staleTime: 60_000,
  });
}

export async function sendReport(toTelegramId: number, mode: "report" | "ping") {
  if (IS_DEMO) return { ok: true };
  return apiFetch("/api/report", {
    method: "POST",
    body: JSON.stringify({ to_telegram_id: toTelegramId, mode }),
  });
}

export async function updateWorkerSharePct(pct: number) {
  return apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify({ worker_share_pct: pct }) });
}
