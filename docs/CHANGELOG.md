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

