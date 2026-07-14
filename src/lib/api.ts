"use client";

/** initData from the Telegram WebApp runtime (empty outside Telegram). */
export function getInitData(): string {
  if (typeof window === "undefined") return "";
  return (window as any).Telegram?.WebApp?.initData ?? "";
}

/** fetch wrapper that attaches the Telegram initData header for auth. */
export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-telegram-init-data": getInitData(),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    throw Object.assign(new Error(`API ${path} ${res.status}`), { status: res.status, body: json });
  }
  return json;
}
