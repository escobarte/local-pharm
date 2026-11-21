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

## [2026-11-21] Фаза 0: каркас Next.js PWA
- Сделано: Next.js 16.4.6 (App Router) + TypeScript strict + Tailwind v4 + ESLint 9; токены BRAND.md в `@theme`; Inter (latin + cyrillic) через `next/font`; manifest, иконки-заглушки, viewport/theme-color; страница-заглушка по Main-v3; `vercel.json`.
- Файлы: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `vercel.json`, `.gitignore`, `.env.example`, `app/{layout,page,manifest,globals.css}`, `public/icons/*.png`.
- Проверено: `tsc --noEmit`, `pnpm lint`, `pnpm build` без ошибок; `/manifest.webmanifest` отдаёт валидный JSON, иконки отдаются 200, мета-теги на месте.
- Открыто: проверка Vercel-сборки и установки на телефон (приёмка Фазы 0); иконки — заглушки.
- Заметки: TypeScript закреплён на 5.9.3 (7.x вышел, совместимость с Next не проверялась); ESLint 9.39.5 (10.x не берём, плагины Next рассчитаны на 9).

