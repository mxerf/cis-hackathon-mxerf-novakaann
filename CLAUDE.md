# Mirage Shield — контекст для агента

Хакатон-прототип активной банковской защиты от социальной инженерии: двухуровневая детекция
(`Algorithm Level` + `AI Level`), бесшовный форк счёта в песочницу `Mirage` и перехват дроп-реквизитов.

## Стек и отклонения от дефолтной решётки

- Рантайм и PM: **Bun** (однодневный хакатон без Docker/Postgres — осознанное отклонение от pnpm/Drizzle ради скорости старта).
- API: **Hono + tRPC v11 + Zod**, привязка к `Bun.serve` изолирована в `src/api/server.ts`.
- Web: **Vite + React 19 + Tailwind v4 + Motion**, только type-only импорт `AppRouter` из `src/api/router.ts`.
- Качество: `tsc --noEmit`, `oxlint`, `oxfmt`, `bun test`.

## Раскладка и конвенции (`mxerf-claude`)

```
src/
  shared/mirage-types.ts              # общие типы и чистые селекторы без серверного рантайма
  api/
    server.ts                         # единственная точка Bun.serve + /ws
    app.ts                            # Hono + адаптер /trpc/*
    trpc.ts                           # publicProcedure + PublicResolverOptions
    router.ts                         # appRouter + export type AppRouter
    infra/                            # ai-gateway (Timeweb AI), telegram-alert
    modules/mirage/                   # плоский модуль: .router / .handlers / .core / .detector / .schemas / .presets / .types
  web/
    features/mirage/                  # kebab-case компоненты и хук синхронизации
    lib/                              # trpc-client.ts, ui-copy.ts
```

- Все имена файлов и папок — строго **kebab-case** (`PascalCase` у файлов не бывает).
- В `*.router.ts` — только тонкая карта процедур без логики; тела в `*.handlers.ts` типизируются через `PublicResolverOptions`, не голым `Context`.
- Юнит-тесты — рядом с кодом как `*.spec.ts`.
- Секреты в `.env` не читать напрямую и не выводить в консоль/чат.

## Команды

```
bun run dev            # API (3001) + Vite (5173)
bun run check-types    # tsc --noEmit
bun run lint           # oxlint src scripts
bun run format         # oxfmt
bun run format:check   # oxfmt --check
bun run test           # bun test (*.spec.ts)
bun run build          # vite build
```
