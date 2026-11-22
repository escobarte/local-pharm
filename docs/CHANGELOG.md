# CHANGELOG — Local Pharm

Новые записи сверху.

<!--
## [ГГГГ-ММ-ДД] Короткий заголовок
- Сделано:
- Файлы:
- Проверено:
- Открыто:
- Заметки:
-->

## [2026-11-21] Фаза 2: хранение, нижнее меню, ручное добавление
- Сделано: нижнее меню (5 пунктов, «+» по центру) и общий layout; `/storage` (сводка, зоны, плитки коробок), `/storage/new`, `/storage/[boxId]` (схема отсеков, содержимое, «Добавить сюда», создание и удаление отсека), `/storage/[boxId]/edit` (правка и удаление коробки с подтверждением); `/add` в режиме «Вручную» (вкладки «Скан» и «Поиск» неактивны, «скоро»); заглушки `/expiry`, `/shopping`; Server Actions с серверной валидацией и русскими ошибками; миграция `0002_storage.sql` (`boxes.number`, функция `add_medication_with_pack` — препарат и упаковка одной транзакцией, SECURITY INVOKER, EXECUTE только `authenticated`).
- Файлы: `supabase/migrations/0002_storage.sql`; `app/(app)/(tabs)/{layout,page}.tsx`, `app/(app)/(tabs)/{storage,expiry,shopping}/…`; `app/(app)/(form)/{layout.tsx,add/*,storage/new,storage/[boxId]/edit}`; `components/{BottomNav,ScreenHeader,ComingSoon,FormField,SubmitButton,ConfirmDialog,BoxForm,AddCompartmentForm,icons}.tsx`, `components/ui.ts`; `lib/{dates,format}.ts`, `lib/storage/{actions,action-state,box-colors,db-errors,queries,sort,summary,types,validation}.ts`; `lib/supabase/server.ts` (`cookies()` читается первым); `tests/*.test.ts` (+5 файлов); `docs/SETUP-SUPABASE.md`, `docs/GOTCHAS.md`. Домашняя страница перенесена в `app/(app)/(tabs)/page.tsx`.
- Проверено: `tsc`, `lint`, `build` без переменных окружения; 54 юнит-теста (даты, плюрализация, валидация форм, сортировка кодов, агрегация, маппинг ошибок БД); миграция 0002 в Docker `postgres:17-alpine` после 0001: 27 проверок (идемпотентность, права, RLS, откат при ошибке, чужой аккаунт); сквозной прогон в headless Chromium (390 px и 1280 px) на локальном стенде Postgres + PostgREST с заглушкой Auth: 29 сценариев (доступ, создание/правка/удаление коробки и отсека, добавление препарата, ошибки, 404, ширина контента), касаемые элементы ≥ 44 px.
- Проверить владельцу: (1) выполнить миграцию 0002 в SQL Editor до деплоя; (2) на Vercel с телефона пройти сценарий из `docs/SETUP-SUPABASE.md`, шаг 6 — реальный вход через Google, затем коробка → отсек → препарат; (3) убедиться, что поля формы «Добавить» не сбрасываются после ошибки валидации на iOS Safari (проверено только в Chromium); (4) визуально оценить нижнее меню на iPhone (отступ у нижнего края, «+» над панелью). На настоящем Supabase (а не на стенде) не запускалось ничего, кроме Фазы 1.
- Открыто: упаковку пока нельзя ни удалить, ни переложить (карточка препарата — Фаза 3), поэтому коробку/отсек с упаковками удалить нельзя; зоны не редактируются (в PLAN Фазы 2 они упомянуты — решить, нужно ли сейчас); фото упаковки из макета Add не делалось; «Печать QR» — неактивная кнопка (Фаза 5).
- Заметки: цвет коробки хранится ключом (`navy`, `accent`, `muted`, `tint`) и сопоставляется с токенами BRAND; категория коробки не хранится, а выводится из препаратов внутри. Срок «ММ/ГГГГ» сохраняется последним днём месяца. Рамка «пунктир» кнопки «Новая коробка» сделана цветом `muted` вместо `#9DA2C8` из макета (его нет в токенах).

## [2026-11-21] Фаза 1: вход через Google, схема БД с RLS, keep-alive Cron
- Сделано: `@supabase/ssr` 0.12.7 + `@supabase/supabase-js` 2.119.0; миграция `0001_init.sql` (7 таблиц, `is_allowed()`, `ping()`, RLS, явные GRANT, сиды); `/login` по Main-v3, `/auth/callback`, `/auth/denied`, `/no-access`, `/not-configured`, защищённая главная-заглушка с email и «Выйти»; `proxy.ts` (Next 16, бывший middleware); `/api/cron/keepalive` + расписание в `vercel.json`; юнит-тесты на `node --test`; `docs/SETUP-SUPABASE.md`.
- Файлы: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vercel.json`, `.env.example`, `proxy.ts`, `lib/{env,routes,cron-auth}.ts`, `lib/supabase/{server,client}.ts`, `components/AuthScreen.tsx`, `app/(app)/{layout,page,actions}.tsx|ts`, `app/login/{page,GoogleSignInButton}.tsx`, `app/no-access/page.tsx`, `app/not-configured/page.tsx`, `app/error.tsx`, `app/auth/{callback,denied}/route.ts`, `app/api/cron/keepalive/route.ts`, `supabase/migrations/0001_init.sql`, `tests/*.test.ts`, `docs/SETUP-SUPABASE.md`, `docs/GOTCHAS.md`; удалён `app/page.tsx` (главная переехала в `app/(app)/`).
- Проверено: `tsc`, `lint`, `build` без переменных окружения; 11 юнит-тестов; миграция прогнана в Docker `postgres:17-alpine` с эмуляцией ролей Supabase (36 проверок RLS/GRANT/ограничений, повторный запуск идемпотентен); маршруты проверены curl-ом в сборке без env и с фиктивным env.
- Открыто: реальный вход через Google и Cron проверяются только на Vercel (шаги в `docs/SETUP-SUPABASE.md`).
- Заметки: `is_allowed()` дополнительно требует `app_metadata.provider = 'google'`; выход — `scope: "local"` (другие устройства остаются в системе).

## [2026-11-21] Фаза 0: каркас Next.js PWA
- Сделано: Next.js 16.4.6 (App Router) + TypeScript strict + Tailwind v4 + ESLint 9; токены BRAND.md в `@theme`; Inter (latin + cyrillic) через `next/font`; manifest, иконки-заглушки, viewport/theme-color; страница-заглушка по Main-v3; `vercel.json`.
- Файлы: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `vercel.json`, `.gitignore`, `.env.example`, `app/{layout,page,manifest,globals.css}`, `public/icons/*.png`.
- Проверено: `tsc --noEmit`, `pnpm lint`, `pnpm build` без ошибок; `/manifest.webmanifest` отдаёт валидный JSON, иконки отдаются 200, мета-теги на месте.
- Открыто: проверка Vercel-сборки и установки на телефон (приёмка Фазы 0); иконки — заглушки.
- Заметки: TypeScript закреплён на 5.9.3 (7.x вышел, совместимость с Next не проверялась); ESLint 9.39.5 (10.x не берём, плагины Next рассчитаны на 9).

