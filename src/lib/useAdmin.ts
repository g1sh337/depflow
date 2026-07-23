"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { demoStore, IS_DEMO } from "./demo";
import type { Geo } from "./types";

export interface LinkInput {
  name: string;
  geo_id: string;
  url?: string | null;
  plan_count: number;
  plan_amount: number;
  amount_presets: number[];
}

const DEMO_GEOS: Geo[] = [
  { id: "g1", code: "RU1", flag_emoji: "🇷🇺", sort_order: 1 },
  { id: "g2", code: "RU2", flag_emoji: "🇷🇺", sort_order: 2 },
  { id: "g3", code: "EG", flag_emoji: "🇪🇬", sort_order: 3 },
  { id: "g4", code: "KZ", flag_emoji: "🇰🇿", sort_order: 4 },
  { id: "g5", code: "UZ", flag_emoji: "🇺🇿", sort_order: 5 },
  { id: "g6", code: "IN", flag_emoji: "🇮🇳", sort_order: 6 },
];

export function useGeos() {
  return useQuery({
    queryKey: ["geos"],
    queryFn: async (): Promise<Geo[]> => {
      if (IS_DEMO) return DEMO_GEOS;
      const { geos } = await apiFetch<{ geos: Geo[] }>("/api/geos");
      return geos ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export async function createGeo(code: string, flag_emoji: string): Promise<Geo> {
  if (IS_DEMO) return { id: crypto.randomUUID(), code, flag_emoji, sort_order: 99 };
  const { geo } = await apiFetch<{ geo: Geo }>("/api/geos", {
    method: "POST",
    body: JSON.stringify({ code, flag_emoji }),
  });
  return geo;
}

export function useAdminLinkActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["links"] });

  return {
    async createLink(input: LinkInput) {
      if (IS_DEMO) {
        demoStore.addLink(input);
        invalidate();
        return;
      }
      await apiFetch("/api/links", { method: "POST", body: JSON.stringify(input) });
      invalidate();
    },

    async updateLink(id: string, patch: Partial<LinkInput>) {
      if (IS_DEMO) {
        demoStore.updateLink(id, patch as any);
        invalidate();
        return;
      }
      await apiFetch(`/api/links/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      invalidate();
    },

    async archiveLink(id: string) {
      if (IS_DEMO) {
        demoStore.archiveLink(id);
        invalidate();
        return;
      }
      await apiFetch(`/api/links/${id}`, { method: "DELETE" });
      invalidate();
    },
  };
}
