# Деплой DepFlow: бот + мини-апп на Railway

Один сервис Railway = Next.js (мини-апп) + бот (webhook на `/api/bot`).

## Шаг 1. Создать бота в @BotFather

1. Открой [@BotFather](https://t.me/BotFather) в Telegram.
2. `/newbot` → задай имя и username (например `depflow_bot`).
3. Скопируй **токен** вида `123456:ABC-DEF...` — это `TELEGRAM_BOT_TOKEN`.
4. (Опц.) `/setdomain` не нужен для WebApp-кнопок — пропусти.

## Шаг 2. Задеплоить на Railway

**Вариант A — через GitHub (рекомендуется):**
1. Залей проект в GitHub-репозиторий.
2. На [railway.app](https://railway.app): **New Project → Deploy from GitHub repo** → выбери репозиторий.
3. Railway сам определит Next.js (Nixpacks), выполнит `npm run build` и `npm start`.

**Вариант B — через CLI:**
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

**Домен:** в настройках сервиса → **Settings → Networking → Generate Domain**.
Получишь URL вида `https://depflow-production.up.railway.app`.

## Шаг 3. Переменные окружения (Railway → Variables)

| Переменная | Значение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен из BotFather |
| `NEXT_PUBLIC_APP_URL` | публичный URL Railway (без слэша в конце) |

> Секрет webhook отдельной переменной не нужен — он вычисляется из токена
> (`deriveWebhookSecret`), поэтому значение на сервере всегда совпадает с тем,
> что регистрируется в Telegram.

> Supabase-переменные пока не нужны — приложение работает в демо-режиме.
> Добавишь их позже, чтобы включить реальную БД (см. README).

После добавления переменных Railway передеплоит сервис.

## Шаг 4. Привязать бота к мини-аппе (webhook + меню)

Локально создай `.env.local` (скопируй из `.env.example`) с теми же
`TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_APP_URL`, `TELEGRAM_WEBHOOK_SECRET`, затем:

```bash
npm run setup:bot
```

Скрипт:
- зарегистрирует webhook `→ {APP_URL}/api/bot`;
- поставит кнопку-меню, открывающую мини-апп;
- задаст команды `/start`, `/help`;
- покажет `getWebhookInfo` для проверки.

## Шаг 5. Проверить

1. Открой бота в Telegram → `/start` → нажми **🚀 Открыть DepFlow**.
2. Слева от поля ввода появится кнопка-меню **DepFlow** — тоже открывает апп.
3. Внутри мини-аппы `initData` валидируется на `/api/auth/telegram`,
   профиль показывает твоё реальное имя из Telegram.

## Обновление после изменений

- Пуш в GitHub (или `railway up`) → авто-редеплой.
- Меняешь домен/URL → снова `npm run setup:bot`.

## Траблшутинг

- **Кнопка не открывает апп** → `NEXT_PUBLIC_APP_URL` должен быть HTTPS и совпадать с доменом Railway. Пересобери после изменения (это build-time переменная).
- **Бот не отвечает** → проверь `getWebhookInfo` (в выводе `setup:bot`): поле `last_error_message`. Часто причина — неверный `TELEGRAM_WEBHOOK_SECRET` (должен совпадать в Railway и в `.env.local`).
- **401 при входе** → на Railway не задан `TELEGRAM_BOT_TOKEN`, либо мини-апп открыта не из Telegram.
