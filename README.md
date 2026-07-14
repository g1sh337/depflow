# DepFlow — Telegram Mini App для учёта депозитов и выводов

Премиальный SaaS-трекер конверсий по ссылкам и гео для команды. Real-time дашборд,
сверхбыстрый ввод депозитов, аналитика, роли, инвайт-ключи, аудит-лог.

## Стек

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Tailwind CSS** + **Framer Motion** (glassmorphism, микроанимации)
- **Recharts** — графики
- **TanStack Query** — данные и кэш
- **Supabase** — Postgres + Realtime + Auth + RLS
- **Telegram WebApp SDK** — авторизация, haptics, тема

## Запуск (демо-режим, без бэкенда)

```bash
npm install
npm run dev
```

Открой http://localhost:3000. Без Supabase env-переменных приложение работает в
**демо-режиме**: данные в памяти сессии, ввод депозитов/выводов, undo, аналитика —
всё интерактивно. Идеально для просмотра UI.

## Подключение Supabase (реальная БД)

1. Создай проект на supabase.com.
2. Выполни `supabase/schema.sql`, затем `supabase/policies.sql` в SQL Editor.
3. Скопируй `.env.example` → `.env.local`, заполни URL и ключи.
4. Перезапусти `npm run dev` — приложение переключится на реальную БД + realtime.

## Структура

```
src/
  app/            маршруты (dashboard, analytics, admin, profile)
  components/     UI: LinkCard, NumpadSheet, Toast, TabBar, StatCard, ui/*
  lib/            types, utils, демо-store, supabase-клиент, хуки данных
supabase/
  schema.sql      таблицы, enum, индексы, view link_today_stats
  policies.sql    RLS-политики (роли admin/user)
```

## Ключевые UX-решения

- **Quick Entry** прямо на карточке: 1 тап = +1 депозит на пресетную сумму.
- **Undo-тост (5 сек)** вместо диалогов подтверждения.
- **Optimistic UI** — счётчики обновляются мгновенно.
- **FTD / redep** переключатель для точной аналитики.
- **Haptic feedback** на каждое действие.
- **Цветовая индикация** плана: 🔴 <40% · 🟡 40–80% · 🟢 80–100% · 🔵 >100%.

## Что дальше (не в MVP-демо)

- Серверная валидация Telegram `initData` (HMAC) + выдача Supabase JWT.
- Supabase Realtime подписка + refetch на `visibilitychange`.
- pg_cron + Edge Function для уведомлений в бота.
- Модуль `expenses` для честного ROI, экспорт CSV.
```
