# GOTCHAS — Local Pharm

Формат: **Симптом/ловушка** — почему так и как правильно. Файл или место.

## Схема / БД

- **Supabase Free засыпает после 7 дней без активности** — проект останавливается, вернуть можно только вручную из панели. Нужен ежедневный Vercel Cron с запросом к БД.
- **Supabase Free без бэкапов** — нужен экспорт JSON из приложения и регулярная выгрузка.
- **Лимиты Free: 500 MB БД, 1 GB файлов** — фото упаковок сжимать перед загрузкой.
- **«Grant API access to new tables automatically» выключено** — новая таблица отвечает `permission denied` (42501) даже с RLS-политиками, пока в миграции нет явного `GRANT ... TO authenticated`. Каждая новая таблица: `enable row level security` + политика + `GRANT`.
- **RLS не действует на `TRUNCATE`** — ролям API выдавать только `select, insert, update, delete`, никогда `all`. В миграции сначала `revoke all`, потом точечный `grant`. `supabase/migrations/0001_init.sql`.
- **Postgres по умолчанию даёт `EXECUTE` на функции роли `PUBLIC`** — для каждой функции `revoke all ... from public, anon, authenticated`, затем явный `grant execute`.
- **`security definer` функции — только с `set search_path = ''`** и полными именами `public.x`, иначе подмена объектов через search_path.

## Авторизация

- **По умолчанию войти может любой аккаунт Google** — белый список + RLS на уровне БД, а не только проверка в UI.
- **`user_metadata` в JWT редактирует сам пользователь** — в RLS и `is_allowed()` опираться только на `email` и `app_metadata`. Провайдер проверяется через `app_metadata.provider`, иначе при включённом входе по почте можно зарегистрироваться с чужим email.
- **Server Components не могут менять cookies** — `signOut()` там молча не сработает. Выход только в Server Action или Route Handler (`app/(app)/actions.ts`, `app/auth/denied/route.ts`).
- **Next.js 16: `middleware.ts` переименован в `proxy.ts`** — proxy только для быстрой проверки сессии; белый список проверяется в `app/(app)/layout.tsx` и `/auth/callback`.
- **Preview-домены Vercel не входят в Redirect URLs Supabase** — вход на preview-деплое вернёт на Site URL. Проверять вход на production-домене.

## Окружение / деплой

- **`NEXT_PUBLIC_*` зашиваются при сборке** — после изменения нужен Redeploy в Vercel.
- **Vercel Hobby — только некоммерческое использование.**
- **Vercel Cron на Hobby — не чаще раза в сутки, время срабатывания плавает в пределах часа**; расписание в UTC. Vercel сам шлёт `Authorization: Bearer $CRON_SECRET`, если переменная задана.
- **Версия Node на Vercel берётся из `engines.node` / настроек проекта** — в Project Settings → Node.js Version должна стоять 22.x, иначе сборка пойдёт на другой версии.

## PWA / UI

- **Push на iOS работает только для PWA, добавленного на главный экран.**
- **Бирюзовый `#00B5AA` с белым текстом не читается** — на нём только `navy`.

## Next.js / React

- **React 19 сбрасывает форму после Server Action — даже если действие вернуло ошибку.** Неконтролируемые поля вернутся к `defaultValue`. Решение: действие возвращает `values`, форма берёт `defaultValue={state.values?.x ?? initial.x}` (`lib/storage/action-state.ts`, `components/BoxForm.tsx`).
- **Страница, которая читает данные только при наличии env, пререндерится на сборке** и падает без переменных. `cookies()` вызывается первым в `createSupabaseServerClient`, тогда все экраны динамические (`lib/supabase/server.ts`).
- **Server Action нельзя считать защищённым маршрутом.** Proxy его может не покрывать — в каждом действии заново проверяется доступ (`requireClient` в `lib/storage/actions.ts`), плюс RLS.
- **Tailwind: `w-full` и `w-auto` в одной строке классов — побеждает тот, что позже в CSS, а не в строке.** Общие классы кнопок не содержат ширины; в колонке они растягиваются сами (`components/ui.ts`).
- **`useFormStatus` работает только в дочернем компоненте формы**, поэтому кнопка отправки вынесена в `components/SubmitButton.tsx`.

## Хранение

- **`packs` → `compartments` и `packs` → `medications` — `ON DELETE RESTRICT`.** Коробку или отсек с упаковками удалить нельзя (код 23503); в интерфейсе это «В отсеке/коробке есть упаковки». Пока нет удаления и перемещения упаковок (Фаза 3), опустошить отсек из приложения нельзя.
- **Препарат и упаковка создаются одной RPC `add_medication_with_pack`.** Два отдельных запроса с клиента оставляют препарат-сироту при сбое второго.
- **RPC с правами вызывающего (`SECURITY INVOKER`) подчиняется RLS** — чужой аккаунт получает ошибку RLS, а не данные. Не менять на `SECURITY DEFINER` без явной проверки `is_allowed()`.
- **Срок годности на упаковке — «до конца месяца».** `12/2026` сохраняется как `2026-12-31` (`lib/dates.ts`).

## Справочники

- **Бесплатные API штрихкодов почти не знают лекарства** — штрихкод сохраняется в своей базе при первом добавлении.
