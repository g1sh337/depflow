"use client";

import { useMemo, useState } from "react";
import { searchCountries, flagFromCode, type Country } from "@/lib/countries";
import { createGeo } from "@/lib/useAdmin";
import { useToast } from "@/components/Toast";
import { haptic } from "@/lib/utils";
import type { Geo } from "@/lib/types";

/**
 * Add a geo = country (flag auto from ISO code) + optional source tag.
 * Search the built-in country list, or type a 2-letter code for anything missing.
 */
export function GeoPicker({ onCreated }: { onCreated?: (geo: Geo) => void }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Country | null>(null);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);

  const results = useMemo(() => searchCountries(query, 40), [query]);

  // allow a raw 2-letter code that isn't in the list
  const rawCode = query.trim().toUpperCase();
  const manualPossible = !picked && /^[A-Z]{2}$/.test(rawCode) && !results.some((c) => c.code === rawCode);

  async function add() {
    const code = picked?.code ?? (manualPossible ? rawCode : "");
    if (!code) {
      toast.show({ message: "Выбери страну или введи 2-буквенный код", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      const geo = await createGeo({
        code,
        flag_emoji: flagFromCode(code),
        country_code: code,
        tag: tag.trim() || null,
      });
      haptic("success");
      toast.show({ message: `Гео ${flagFromCode(code)} ${code}${tag ? " · " + tag.trim() : ""} добавлено`, kind: "success" });
      setPicked(null);
      setQuery("");
      setTag("");
      onCreated?.(geo);
    } catch {
      toast.show({ message: "Не удалось добавить гео", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass p-3">
      {/* selected country chip */}
      {picked ? (
        <div className="mb-2 flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-lg bg-brand-500/15 px-3 py-2 text-sm font-semibold text-brand-400">
            {flagFromCode(picked.code)} {picked.ru} ({picked.code})
          </span>
          <button onClick={() => setPicked(null)} className="tap-scale rounded-lg bg-white/10 px-3 py-2 text-xs">
            ✕
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Страна: Корея, Egypt, KR…"
            className="w-full rounded-lg border border-border bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            autoCapitalize="off"
          />
          {(query.length > 0 || results.length > 0) && (
            <div className="no-scrollbar mt-2 max-h-52 space-y-1 overflow-y-auto">
              {manualPossible && (
                <button
                  onClick={() => setPicked({ code: rawCode, ru: rawCode, en: rawCode })}
                  className="tap-scale flex w-full items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-left text-sm"
                >
                  {flagFromCode(rawCode)} <span className="text-text-soft">Использовать код</span> {rawCode}
                </button>
              )}
              {results.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    haptic("light");
                    setPicked(c);
                  }}
                  className="tap-scale flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  <span className="text-base">{flagFromCode(c.code)}</span>
                  <span className="flex-1">{c.ru}</span>
                  <span className="text-[11px] text-text-faint">{c.code}</span>
                </button>
              ))}
              {results.length === 0 && !manualPossible && (
                <p className="px-3 py-2 text-xs text-text-faint">Ничего не найдено. Введи 2-буквенный код (напр. KR).</p>
              )}
            </div>
          )}
        </>
      )}

      {/* source / advertiser tag */}
      <input
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        placeholder="Источник (необязательно): 1xbet LUDMILLA"
        className="mt-2 w-full rounded-lg border border-border bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
      />

      <button
        onClick={add}
        disabled={busy || (!picked && !manualPossible)}
        className="tap-scale mt-2 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-40"
      >
        {busy ? "Добавление…" : "Добавить гео"}
      </button>
    </div>
  );
}
