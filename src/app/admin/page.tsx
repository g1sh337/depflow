"use client";

import { useEffect, useState } from "react";
import { useLinks } from "@/lib/useLinks";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/useAuth";
import { useAdminLinkActions } from "@/lib/useAdmin";
import { LinkFormSheet } from "@/components/LinkFormSheet";
import { apiFetch } from "@/lib/api";
import { IS_DEMO } from "@/lib/demo";
import { haptic } from "@/lib/utils";
import type { LinkTodayStats } from "@/lib/types";

interface InviteKey {
  id?: string;
  code: string;
  role: string;
  used_by?: string | null;
}

export default function AdminPage() {
  const { data: links } = useLinks();
  const { isAdmin } = useAuth();
  const linkActions = useAdminLinkActions();
  const toast = useToast();
  const [keys, setKeys] = useState<InviteKey[]>([]);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"links" | "keys" | "audit">("links");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LinkTodayStats | null>(null);

  function openCreate() {
    haptic("light");
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(link: LinkTodayStats) {
    haptic("light");
    setEditing(link);
    setFormOpen(true);
  }
  async function archive(link: LinkTodayStats) {
    if (!confirm(`Архивировать «${link.name}»? История депозитов сохранится, но ссылка исчезнет с дашборда.`)) return;
    try {
      await linkActions.archiveLink(link.link_id);
      haptic("success");
      toast.show({ message: `«${link.name}» в архиве`, kind: "warn" });
    } catch {
      toast.show({ message: "Не удалось архивировать", kind: "error" });
    }
  }

  // Load existing keys from the API (real mode only).
  useEffect(() => {
    if (IS_DEMO || tab !== "keys") return;
    apiFetch<{ keys: InviteKey[] }>("/api/invite-keys")
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => {});
  }, [tab]);

  async function createKey() {
    setCreating(true);
    try {
      if (IS_DEMO) {
        const seg = () => Math.random().toString(36).slice(2, 5).toUpperCase();
        const code = `${seg()}-${seg()}-${seg()}`;
        setKeys((k) => [{ code, role: "user" }, ...k]);
        toast.show({ message: `Ключ создан: ${code}`, kind: "success", duration: 4000 });
      } else {
        const { key } = await apiFetch<{ key: InviteKey }>("/api/invite-keys", {
          method: "POST",
          body: JSON.stringify({ role: "user" }),
        });
        setKeys((k) => [key, ...k]);
        toast.show({ message: `Ключ создан: ${key.code}`, kind: "success", duration: 5000 });
      }
      haptic("success");
    } catch {
      toast.show({ message: "Не удалось создать ключ", kind: "error" });
    } finally {
      setCreating(false);
    }
  }

  if (!isAdmin && !IS_DEMO) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-3xl">🔒</p>
        <p className="mt-3 text-sm text-text-soft">Раздел доступен только администраторам</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 pt-4">
      <h1 className="text-xl font-bold">Управление</h1>
      <p className="text-xs text-text-faint">Доступно роли «Администратор»</p>

      <div className="mt-3 flex rounded-xl bg-white/5 p-1 text-xs font-semibold">
        {([["links", "Ссылки"], ["keys", "Ключи"], ["audit", "Журнал"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg py-2 transition-colors ${tab === k ? "bg-brand-500 text-white" : "text-text-faint"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "links" && (
        <div className="mt-4 space-y-2">
          <button
            onClick={openCreate}
            className="tap-scale w-full rounded-xl border border-dashed border-brand-500/40 bg-brand-500/10 py-3 text-sm font-semibold text-brand-400"
          >
            + Новая ссылка
          </button>
          {(!links || links.length === 0) && (
            <p className="pt-4 text-center text-xs text-text-faint">Ссылок пока нет — создай первую</p>
          )}
          {links?.map((l) => (
            <div key={l.link_id} className="glass flex items-center gap-3 p-3">
              <span className="text-xl">{l.flag_emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{l.name}</p>
                <p className="text-[11px] text-text-faint">
                  План: {l.plan_count} деп · ${l.plan_amount} · {l.geo_code}
                </p>
              </div>
              <button onClick={() => openEdit(l)} className="tap-scale rounded-lg bg-white/10 px-3 py-1.5 text-xs">
                Изм.
              </button>
              <button
                onClick={() => archive(l)}
                className="tap-scale rounded-lg bg-status-danger/15 px-3 py-1.5 text-xs text-status-danger"
              >
                Архив
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "keys" && (
        <div className="mt-4 space-y-3">
          <button
            onClick={createKey}
            disabled={creating}
            className="tap-scale w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-glow disabled:opacity-50"
          >
            {creating ? "Создание…" : "Сгенерировать инвайт-ключ"}
          </button>
          <p className="text-center text-[11px] text-text-faint">
            Передай ключ напарнику — он введёт его при первом входе.
          </p>
          {keys.length === 0 && <p className="pt-4 text-center text-xs text-text-faint">Ключей пока нет</p>}
          {keys.map((k) => (
            <div key={k.code} className="glass flex items-center justify-between p-3">
              <span className="font-mono text-sm tracking-wider">{k.code}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  k.used_by ? "bg-status-success/15 text-status-success" : "bg-white/10 text-text-soft"
                }`}
              >
                {k.used_by ? "активирован" : "свободен"} · {k.role}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <div className="mt-4 space-y-2">
          {DEMO_AUDIT.map((a, i) => (
            <div key={i} className="glass flex items-center gap-3 p-3 text-xs">
              <span className="text-base">{a.icon}</span>
              <div className="flex-1">
                <p className="text-text">{a.text}</p>
                <p className="text-[10px] text-text-faint">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <LinkFormSheet open={formOpen} editing={editing} onClose={() => setFormOpen(false)} />
    </main>
  );
}

const DEMO_AUDIT = [
  { icon: "➕", text: "Игорь добавил депозит $50 · RU1", time: "14:32" },
  { icon: "➖", text: "Анна зафиксировала вывод $200 · EG", time: "14:05" },
  { icon: "✏️", text: "Админ изменил план RU2: 8 → 10", time: "12:20" },
  { icon: "🔑", text: "Создан инвайт-ключ ABC-123-XYZ", time: "11:47" },
  { icon: "🔓", text: "Игорь вошёл в систему", time: "09:10" },
];
