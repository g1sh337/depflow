import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PlanStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Map plan completion % (+ activity) to a semantic status. */
export function planStatus(pct: number, lastActivityAt: string | null): PlanStatus {
  if (isIdle(lastActivityAt) && pct < 40) return "idle";
  if (pct > 100) return "premium";
  if (pct >= 80) return "success";
  if (pct >= 40) return "warn";
  return "danger";
}

/** No deposit in the last 3 hours during the working day. */
export function isIdle(lastActivityAt: string | null, hours = 3): boolean {
  if (!lastActivityAt) return true;
  const diff = Date.now() - new Date(lastActivityAt).getTime();
  return diff > hours * 3_600_000;
}

export const STATUS_COLOR: Record<PlanStatus, string> = {
  danger: "#ff5c7a",
  warn: "#ffb84d",
  success: "#3ddc84",
  premium: "#4dc9ff",
  idle: "#5b6172",
};

export const STATUS_LABEL: Record<PlanStatus, string> = {
  danger: "Отстаёт",
  warn: "В процессе",
  success: "Почти план",
  premium: "Перевыполнен",
  idle: "Нет активности",
};

export function formatMoney(n: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && Math.abs(n) >= 1000) {
    return "$" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Trigger Telegram haptic feedback if available. */
export function haptic(style: "light" | "medium" | "heavy" | "success" | "error" = "light") {
  if (typeof window === "undefined") return;
  const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
  if (!tg) return;
  try {
    if (style === "success" || style === "error") tg.notificationOccurred(style);
    else tg.impactOccurred(style);
  } catch {
    /* noop */
  }
}
