"use client";

import { useEffect, useState } from "react";
import { useLinks } from "@/lib/useLinks";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/useAuth";
import { useAdminLinkActions } from "@/lib/useAdmin";
import { useWorkerSharePct, updateWorkerSharePct } from "@/lib/useTeam";
import { LinkFormSheet } from "@/components/LinkFormSheet";
import { apiFetch } from "@/lib/api";
import { IS_DEMO } from "@/lib/demo";
import { haptic } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { LinkTodayStats } from "@/lib/types";

interface InviteKey {
  id?: string;
  code: string;
  role: string;
  used_by?: string | null;
}

interface TeamUser {
  id: string;
  telegram_id: number;
  first_name: string | null;
  username: string | null;
  role: "admin" | "user";
  is_active: boolean;
}

interface AuditItem {
  id: string;
  action: string;
  entity_type: string | null;
  changes: any;
  created_at: string;
  user_name: string;
}

const ACTION_ICON: Record<string, string> = {
  create: "➕",
  update: "✏️",
  delete: "🗑",
  archive: "📦",
  login: "🔓",
};
const ENTITY_LABEL: Record<string, string> = {
  deposit: "депозит",
  withdrawal: "вывод",
  link: "ссылку",
  invite_key: "инвайт-ключ",
  user: "пользователя",
  settings: "настройки",
  report: "отчёт",
};

function auditText(a: AuditItem): string {
  const verb =
    a.action === "create" ? "создал" : a.action === "update" ? "изменил" : a.action === "delete" ? "удалил" : a.action === "archive" ? "архивировал" : "вошёл";
  const ent = a.entity_type ? ENTITY_LABEL[a.entity_type] ?? a.entity_type : "";
  const amt = a.changes?.amount ? ` $${a.changes.amount}` : "";
  return a.action === "login" ? `${a.user_name} вошёл в систему` : `${a.user_name} ${verb} ${ent}${amt}`.trim();
}

export default function AdminPage() {
  const { data: links } = useLinks();
  const { isAdmin } = useAuth();
  const linkActions = useAdminLinkActions();
  const toast = useToast();
  const [keys, setKeys] = useState<InviteKey[]>([]);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"links" | "keys" | "people" | "audit">("links");
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [audit, setAudit] = useState<AuditItem[] | null>(null);

  useEffect(() => {
    if (IS_DEMO || tab !== "people") return;
    apiFetch<{ users: TeamUser[] }>("/api/users")
      .then((d) => setTeam(d.users ?? []))
      .catch(() => {});
  }, [tab]);

  useEffect(() => {
    if (IS_DEMO || tab !== "audit") return;
    apiFetch<{ items: AuditItem[] }>("/api/audit-logs")
      .then((d) => setAudit(d.items ?? []))
      .catch(() => setAudit([]));
  }, [tab]);

  async function toggleRole(u: TeamUser) {
    const nextRole = u.role === "admin" ? "user" : "admin";
    try {
      if (!IS_DEMO) await apiFetch(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) });
      setTeam((t) => t.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
      qc.invalidateQueries({ queryKey: ["admins"] });
      haptic("success");
      toast.show({ message: nextRole === "admin" ? `${u.first_name ?? "Пользователь"} — теперь начальник` : `${u.first_name ?? "Пользователь"} — теперь работник`, kind: "success" });
    } catch (e: any) {
      const reason = e?.body?.reason;
      toast.show({ message: reason === "last_admin" ? "Нельзя убрать последнего админа" : "Не удалось изменить роль", kind: "error" });
    }
  }
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LinkTodayStats | null>(null);

  const { data: pct } = useWorkerSharePct();
  const qc = useQueryClient();
  const [pctInput, setPctInput] = useState<string>("");
  useEffect(() => {
    if (pct != null && pctInput === "") setPctInput(String(pct));
  }, [pct]);

  async function saveSharePct() {
    const v = parseFloat(pctInput);
    if (isNaN(v) || v < 0 || v > 100) {
      toast.show({ message: "Введите число 0–100", kind: "error" });
      return;
    }
    try {
      if (!IS_DEMO) await updateWorkerSharePct(v);
      qc.invalidateQueries({ queryKey: ["settings", "worker_share_pct"] });
      haptic("success");
      toast.show({ message: `Доля работника: ${v}%`, kind: "success" });
    } catch {
      toast.show({ message: "Не удалось сохранить", kind: "error" });
    }
  }

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

      {/* worker share setting */}
      <div className="glass mt-3 flex items-center gap-3 p-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">Доля работника</p>
          <p className="text-[11px] text-text-faint">% от каждого вывода в пользу работника</p>
        </div>
        <input
          value={pctInput}
          onChange={(e) => setPctInput(e.target.value)}
          inputMode="decimal"
          className="w-16 rounded-lg border border-border bg-white/5 px-2 py-1.5 text-center text-sm tabular-nums outline-none focus:border-brand-500"
        />
        <span className="text-sm text-text-soft">%</span>
        <button onClick={saveSharePct} className="tap-scale rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white">
          ОК
        </button>
      </div>

      <div className="mt-3 flex rounded-xl bg-white/5 p-1 text-xs font-semibold">
        {([["links", "Ссылки"], ["keys", "Ключи"], ["people", "Люди"], ["audit", "Журнал"]] as const).map(([k, label]) => (
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

      {tab === "people" && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] text-text-faint">
            «Начальник» (админ) получает отчёты и может управлять. Нажми роль, чтобы поменять.
          </p>
          {IS_DEMO && <p className="pt-4 text-center text-xs text-text-faint">В демо-режиме список команды пуст</p>}
          {team.map((u) => (
            <div key={u.id} className="glass flex items-center gap-3 p-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold">
                {(u.first_name ?? "U").charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{u.first_name ?? "Без имени"}</p>
                {u.username && <p className="text-[11px] text-text-faint">@{u.username}</p>}
              </div>
              <button
                onClick={() => toggleRole(u)}
                className={`tap-scale rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  u.role === "admin" ? "bg-brand-500/20 text-brand-400" : "bg-white/10 text-text-soft"
                }`}
              >
                {u.role === "admin" ? "👑 Начальник" : "Работник"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <div className="mt-4 space-y-2">
          {IS_DEMO ? (
            <p className="pt-4 text-center text-xs text-text-faint">Журнал доступен в реальном режиме</p>
          ) : audit === null ? (
            <p className="pt-4 text-center text-xs text-text-faint">Загрузка…</p>
          ) : audit.length === 0 ? (
            <p className="pt-4 text-center text-xs text-text-faint">Пока нет действий</p>
          ) : (
            audit.map((a) => (
              <div key={a.id} className="glass flex items-center gap-3 p-3 text-xs">
                <span className="text-base">{ACTION_ICON[a.action] ?? "•"}</span>
                <div className="flex-1">
                  <p className="text-text">{auditText(a)}</p>
                  <p className="text-[10px] text-text-faint">
                    {new Date(a.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <LinkFormSheet open={formOpen} editing={editing} onClose={() => setFormOpen(false)} />
    </main>
  );
}
