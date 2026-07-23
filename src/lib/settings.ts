import "server-only";
import { getServiceClient } from "./supabase-server";

/** Read the global worker-share percentage (defaults to 25). */
export async function getWorkerSharePct(): Promise<number> {
  const sb = getServiceClient();
  const { data } = await sb.from("app_settings").select("worker_share_pct").eq("id", 1).maybeSingle();
  const pct = Number(data?.worker_share_pct);
  return Number.isFinite(pct) ? pct : 25;
}
