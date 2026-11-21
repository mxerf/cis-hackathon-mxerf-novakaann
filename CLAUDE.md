# Mirage Shield — контекст для агента

Хакатон-прототип активной банковской защиты от социальной инженерии (THE CIS SPRINT, трек B2C):
двухуровневая детекция (`Algorithm Level` + `AI Level`), бесшовный перевод приложения в песочницу
`Mirage` и ловушка `Honeytrap` для перехвата реквизитов дропов.

## Принятые продуктовые решения

- **Базовый сценарий атаки:** звонит лже-сотрудник безопасности банка, пугает подозрительной попыткой списания `14,500 AED`, просит включить показ экрана якобы для помощи с отменой операции и под видом «зеркальной отмены» заставляет подтвердить исходящий перевод.
- **Почему Mirage, а не блокировка красным экраном:** жёсткая блокировка на глазах у мошенника (при демонстрации экрана) приводит к тому, что мошенник отправляет жертву снимать наличные в физический банкомат. Иллюзия успешного перевода в песочнице с выдачей референса заставляет мошенника самому завершить звонок.
- **Два уровня антифрод-детекции (обязательны в логике и UI):**
  1. `Algorithm Level` (`< 1 мс`, детерминированный): флаги ОС (`FLAG:UNVERIFIED_INBOUND_CALL`, `FLAG:YOUNG_SIM_CALLER`, `FLAG:SCREEN_CAPTURE_ACTIVE`, `FLAG:EXTERNAL_RECIPIENT_INJECTED`, `FLAG:TRANSFER_UNDER_SCREEN_SHARE`, `FLAG:HIGH_VALUE_DRAIN_RATIO`, `FLAG:VAULT_WITHDRAWAL_ON_CALL`), Unicode-правила (`\p{L}`, межчанковый матчинг через пробел) и синтаксические конструкции (включая `SYNTAX:FAKE_REVERSAL_PARADOX`).
  2. `AI Semantic Level` (`anthropic/claude-haiku-5-5` через Timeweb AI Gateway): оценка вероятности социальной инженерии `0..100%`, тактик давления и краткое объяснение.
  - **2-фазный неблокирующий пайплайн + `Pre-Transfer Gate`:** `ingestCallTranscript` / `advanceCallScript` коммитят `Algorithm Level` за `< 1 мс` и шлют AI в фоне по WS; `executeTransfer` удерживает перевод до ответа in-flight AI (кап `3500 мс`) даже в 3-минутном окне post-call cooldown после `endCall`, сериализуя параллельные тапы мьютексом.
  - Ансамбль обоих уровней при счёте `>= 65` на активном звонке (или в окне post-call cooldown) бесшовно включает `Mirage` (`realAccounts` остаются строго неизменными; повторный клик на уже отклонённый IBAN снова даёт `CB-412` без дубля в `capturedMules`).
- **Уведомление доверенному лицу:** реализуется в первую очередь внутри самого банковского приложения (In-App экран/пуш для члена семьи: попытка обмана перехвачена, деньги под защитой). Внешний Telegram-бот — низкоприоритетный бонус в самом конце, только при запасе времени.
- **Отвергнутые ветки:** SMS-агент в роуминге (разбивается о data-only eSIM без номера и фильтрацию международного SMS-роуминга; LLM для кнопочных команд избыточна) и монтаж демо на Remotion (выбран партнёрский **Cap** для живой записи без затрат времени на код таймлайнов).

## Стек и отклонения от дефолтной решётки

- Рантайм и PM: **Bun** (`1.4.2`) — однодневный хакатон без Docker/Postgres, осознанное отклонение от pnpm/Drizzle ради скорости старта.
- API: **Hono + tRPC v11 (`11.28.1`) + Zod**, привязка к `Bun.serve` и `/ws` изолирована в `src/api/server.ts`.
- AI Gateway: Timeweb OpenAI-совместимый шлюз (`AI_GATEWAY_URL`, `AI_GATEWAY_TOKEN`, `AI_MODEL=anthropic/claude-haiku-5-5`). Грабли шлюза: строгую `json_schema` не принимает — использовать `response_format: { type: "json_object" }`, обязательно включать слово `"json"` в промпт и срезать обёртку ` ```json ` перед `JSON.parse` + Zod. Модель всегда генерит `thinking_blocks` (живая задержка `p50 ~ 1.6–2.9 с`, `max ~ 4.1 с`); **не ставить маленький `max_tokens` (120–256)** — обрывает ответ по `finish_reason: "length"` до выдачи JSON.
- Web: **Vite 8 + React 19 + Tailwind v4 + Motion**, импортирует из `api` только тип `AppRouter` (`src/api/router.ts`).
- Качество: `tsc --noEmit`, `oxlint`, `oxfmt` (`0.78.0`, явный `.oxfmtrc.jsonc`), `bun test`.

## Раскладка и конвенции (`mxerf-claude`)

```
src/
  shared/mirage-types.ts              # общие типы и чистые селекторы без серверного рантайма
  api/
    server.ts                         # единственная точка Bun.serve + /ws
    app.ts                            # Hono + адаптер /trpc/*
    trpc.ts                           # publicProcedure + PublicResolverOptions
    router.ts                         # appRouter + export type AppRouter
    infra/                            # ai-gateway.ts (+.spec.ts), telegram-alert.ts
    modules/mirage/                   # плоский модуль: .router / .handlers / .core / .detector / .schemas / .presets / .types
  web/
    features/mirage/                  # kebab-case компоненты и хук синхронизации
    lib/                              # trpc-client.ts, ui-copy.ts
```

- Все имена файлов и папок — строго **kebab-case** (`PascalCase` у файлов запрещён).
- В `*.router.ts` — только тонкая карта процедур без логики; тела в `*.handlers.ts` типизируются через `PublicResolverOptions`, не голым `Context`.
- Юнит-тесты — рядом с кодом как `*.spec.ts` (не `*.test.ts`).
- Секреты в `.env` никогда не читать напрямую и не выводить в консоль/чат.

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
