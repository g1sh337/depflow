"use client";

import { useState } from "react";
import { useLinks } from "@/lib/useLinks";
import { useToast } from "@/components/Toast";
import { haptic } from "@/lib/utils";

function genKey() {
  const seg = () => Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${seg()}-${seg()}-${seg()}`;
}

export default function AdminPage() {
  const { data: links } = useLinks();
  const toast = useToast();
  const [keys, setKeys] = useState<{ code: string; role: string }[]>([]);
  const [tab, setTab] = useState<"links" | "keys" | "audit">("links");

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
          <button className="tap-scale w-full rounded-xl border border-dashed border-brand-500/40 bg-brand-500/10 py-3 text-sm font-semibold text-brand-400">
            + Новая ссылка
          </button>
          {links?.map((l) => (
            <div key={l.link_id} className="glass flex items-center gap-3 p-3">
              <span className="text-xl">{l.flag_emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{l.name}</p>
                <p className="text-[11px] text-text-faint">
                  План: {l.plan_count} деп · {l.geo_code}
                </p>
              </div>
              <button className="rounded-lg bg-white/10 px-3 py-1.5 text-xs">План</button>
              <button className="rounded-lg bg-status-danger/15 px-3 py-1.5 text-xs text-status-danger">Архив</button>
            </div>
          ))}
        </div>
      )}

      {tab === "keys" && (
        <div className="mt-4 space-y-3">
          <button
            onClick={() => {
              haptic("success");
              const code = genKey();
              setKeys((k) => [{ code, role: "user" }, ...k]);
              toast.show({ message: `Ключ создан: ${code}`, kind: "success", duration: 4000 });
            }}
            className="tap-scale w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-glow"
          >
            Сгенерировать инвайт-ключ
          </button>
          {keys.length === 0 && <p className="pt-6 text-center text-xs text-text-faint">Ключей пока нет</p>}
          {keys.map((k) => (
            <div key={k.code} className="glass flex items-center justify-between p-3">
              <span className="font-mono text-sm tracking-wider">{k.code}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-text-soft">не активирован · {k.role}</span>
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
