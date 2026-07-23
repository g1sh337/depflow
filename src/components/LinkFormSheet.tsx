"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGeos, useAdminLinkActions, createGeo, type LinkInput } from "@/lib/useAdmin";
import { useToast } from "@/components/Toast";
import { haptic } from "@/lib/utils";
import { Portal } from "@/components/Portal";
import type { LinkTodayStats } from "@/lib/types";

interface Props {
  open: boolean;
  /** null = create, otherwise edit this link */
  editing: LinkTodayStats | null;
  onClose: () => void;
}

export function LinkFormSheet({ open, editing, onClose }: Props) {
  const { data: geos } = useGeos();
  const actions = useAdminLinkActions();
  const toast = useToast();
  const qc = useQueryClient();

  const [addingGeo, setAddingGeo] = useState(false);
  const [newGeoCode, setNewGeoCode] = useState("");
  const [newGeoFlag, setNewGeoFlag] = useState("");

  async function addGeo() {
    if (!newGeoCode.trim()) return;
    try {
      const geo = await createGeo(newGeoCode.trim(), newGeoFlag.trim() || "🌐");
      await qc.invalidateQueries({ queryKey: ["geos"] });
      setGeoId(geo.id);
      setNewGeoCode("");
      setNewGeoFlag("");
      setAddingGeo(false);
      haptic("success");
      toast.show({ message: `Гео ${geo.flag_emoji ?? ""} ${geo.code} добавлено`, kind: "success" });
    } catch (e: any) {
      toast.show({ message: e?.body?.reason === "duplicate" ? "Такое гео уже есть" : "Не удалось добавить гео", kind: "error" });
    }
  }

  const [name, setName] = useState("");
  const [geoId, setGeoId] = useState("");
  const [url, setUrl] = useState("");
  const [planCount, setPlanCount] = useState("10");
  const [planAmount, setPlanAmount] = useState("0");
  const [presets, setPresets] = useState("15, 25, 50, 100");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setGeoId(editing.geo_id ?? "");
      setUrl(editing.url ?? "");
      setPlanCount(String(editing.plan_count));
      setPlanAmount(String(editing.plan_amount));
      setPresets((editing.amount_presets ?? []).join(", "));
    } else {
      setName("");
      setGeoId(geos?.[0]?.id ?? "");
      setUrl("");
      setPlanCount("10");
      setPlanAmount("0");
      setPresets("15, 25, 50, 100");
    }
  }, [open, editing, geos]);

  async function submit() {
    const parsedPresets = presets
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => n > 0);
    if (!name.trim() || !geoId) {
      haptic("error");
      toast.show({ message: "Заполни название и гео", kind: "error" });
      return;
    }
    const input: LinkInput = {
      name: name.trim(),
      geo_id: geoId,
      url: url.trim() || null,
      plan_count: parseInt(planCount) || 0,
      plan_amount: parseFloat(planAmount) || 0,
      amount_presets: parsedPresets.length ? parsedPresets : [15, 25, 50, 100],
    };
    setBusy(true);
    try {
      if (editing) {
        await actions.updateLink(editing.link_id, input);
        toast.show({ message: `Ссылка «${input.name}» обновлена`, kind: "success" });
      } else {
        await actions.createLink(input);
        toast.show({ message: `Ссылка «${input.name}» создана`, kind: "success" });
      }
      haptic("success");
      onClose();
    } catch {
      toast.show({ message: "Не удалось сохранить", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong no-scrollbar fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88vh] max-w-lg overflow-y-auto rounded-t-3xl p-5 pb-8"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="mb-4 text-center text-base font-bold">
              {editing ? "Редактировать ссылку" : "Новая ссылка"}
            </h2>

            <div className="space-y-3">
              <Field label="Название">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="RU1" className={inputCls} />
              </Field>

              <Field label="Гео">
                <select value={geoId} onChange={(e) => setGeoId(e.target.value)} className={inputCls}>
                  {(geos ?? []).map((g) => (
                    <option key={g.id} value={g.id} className="bg-bg-soft">
                      {g.flag_emoji} {g.code}
                    </option>
                  ))}
                </select>
                {!addingGeo ? (
                  <button
                    type="button"
                    onClick={() => setAddingGeo(true)}
                    className="mt-1.5 text-[11px] font-semibold text-brand-400"
                  >
                    + Новое гео
                  </button>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={newGeoFlag}
                      onChange={(e) => setNewGeoFlag(e.target.value)}
                      placeholder="🇰🇷"
                      className={`${inputCls} w-14 text-center`}
                    />
                    <input
                      value={newGeoCode}
                      onChange={(e) => setNewGeoCode(e.target.value.toUpperCase())}
                      placeholder="KR"
                      className={`${inputCls} flex-1`}
                      autoCapitalize="characters"
                    />
                    <button type="button" onClick={addGeo} className="tap-scale rounded-lg bg-brand-500 px-3 py-2.5 text-xs font-semibold text-white">
                      ОК
                    </button>
                    <button type="button" onClick={() => setAddingGeo(false)} className="tap-scale rounded-lg bg-white/10 px-3 py-2.5 text-xs">
                      ✕
                    </button>
                  </div>
                )}
              </Field>

              <div className="flex gap-3">
                <Field label="План (деп/день)">
                  <input value={planCount} onChange={(e) => setPlanCount(e.target.value)} inputMode="numeric" className={inputCls} />
                </Field>
                <Field label="План ($/день)">
                  <input value={planAmount} onChange={(e) => setPlanAmount(e.target.value)} inputMode="numeric" className={inputCls} />
                </Field>
              </div>

              <Field label="URL ссылки (оффер)">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://adclickad.com/get/?spot_id=..."
                  className={inputCls}
                  inputMode="url"
                  autoCapitalize="off"
                />
              </Field>

              <Field label="Быстрые суммы (через запятую)">
                <input value={presets} onChange={(e) => setPresets(e.target.value)} placeholder="15, 25, 50, 100" className={inputCls} />
              </Field>
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={onClose} className="tap-scale flex-1 rounded-xl border border-border bg-white/5 py-3 text-sm font-semibold text-text-soft">
                Отмена
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="tap-scale flex-[2] rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-glow disabled:opacity-50"
              >
                {busy ? "Сохранение…" : editing ? "Сохранить" : "Создать"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </Portal>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm text-text outline-none focus:border-brand-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-[11px] text-text-faint">{label}</span>
      {children}
    </label>
  );
}
