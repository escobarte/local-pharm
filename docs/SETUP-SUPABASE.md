# SETUP — Supabase, Vercel, вход через Google

Ручные шаги владельца для Фазы 1. В репозитории нет и не должно быть ключей, email и project ref: всё ниже вводится только в панелях Supabase и Vercel.

Плейсхолдеры:
- `<PROJECT>.vercel.app` — домен проекта в Vercel;
- `<SUPABASE_URL>` — Project URL из Supabase;
- `<PUBLISHABLE_KEY>` — publishable key из Supabase;
- `<EMAIL>` — адрес Google-аккаунта из белого списка.

## 0. Что уже должно быть

- Проект Supabase создан, провайдер **Google** включён (Authentication → Sign In / Providers).
- В Google Cloud Console у OAuth-клиента в Authorized redirect URIs указан callback Supabase (его показывает Supabase на странице провайдера Google).
- Настройки проекта: Data API включён, «Enable RLS on new tables automatically» включено, «Grant API access to new tables automatically» выключено.

## 1. Миграция схемы

1. Supabase → **SQL Editor** → New query.
2. Вставить **целиком** файл `supabase/migrations/0001_init.sql` → **Run**.
3. Проверка: в Table Editor есть таблицы `allowed_emails`, `categories` (9 строк), `locations` (3 строки), `boxes`, `compartments`, `medications`, `packs`; у каждой стоит значок RLS.

Файл можно запускать повторно: дублей не будет, политики пересоздаются.

## 2. Белый список

В SQL Editor выполнить для **каждого** из двух аккаунтов:

```sql
insert into public.allowed_emails (email) values (lower('<EMAIL>'));
```

Проверка:

```sql
select count(*) from public.allowed_emails;  -- ожидается 2
```

Удалить доступ: `delete from public.allowed_emails where email = lower('<EMAIL>');`. Активная сессия перестанет видеть данные сразу (RLS), а интерфейс выкинет на «Нет доступа» при следующем переходе.

Таблица `allowed_emails` через API недоступна никому, включая вошедших пользователей. Менять её можно только в SQL Editor / Table Editor.

## 3. URL Configuration (Supabase)

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://<PROJECT>.vercel.app`
- **Redirect URLs** (добавить обе):
  - `https://<PROJECT>.vercel.app/**`
  - `http://localhost:3000/**`

## 4. Рекомендуемые настройки Auth

- **Email** provider выключить (Authentication → Sign In / Providers → Email), если вход по почте не нужен. Даже если оставить его включённым, `is_allowed()` пускает только аккаунты, вошедшие через Google. Но лишние пользователи в Auth не нужны.
- **Anonymous sign-ins** оставить выключенными.

## 5. Переменные окружения (Vercel)

Vercel → Project → **Settings → Environment Variables** (окружение Production; Preview по желанию):

| Имя | Откуда взять |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API / API: Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys: Publishable key (`sb_publishable_...`) |
| `CRON_SECRET` | Случайная строка от 16 символов (генератор паролей, только буквы и цифры) |

**Secret key / service_role key никуда не вносить**: приложение его не использует.

После добавления: Deployments → последний деплой → **Redeploy**. `NEXT_PUBLIC_*` зашиваются при сборке, простой Restart не поможет.

Без этих переменных сайт показывает страницу «Не настроено», а не падает.

## 6. Проверка после деплоя

1. Открыть `https://<PROJECT>.vercel.app`: редирект на «Вход».
2. «Войти через Google» → аккаунт из списка: главная с email и кнопкой «Выйти».
3. Второй аккаунт из списка: та же главная.
4. Третий (чужой) аккаунт: страница «Нет доступа», сессия сброшена.
5. Прямой запрос к API без входа данных не отдаёт:

   ```bash
   curl "<SUPABASE_URL>/rest/v1/medications?select=*" \
     -H "apikey: <PUBLISHABLE_KEY>"
   ```

   Ожидается ошибка `permission denied` (код 42501). Таблица `allowed_emails` тоже должна отвечать `permission denied`.
6. Cron: Vercel → Project → **Settings → Cron Jobs**: виден `/api/cron/keepalive`, расписание `0 6 * * *` (раз в сутки, UTC). Кнопка **Run** → в логах ответ `200 {"ok":true}`.

## Если что-то не так

| Симптом | Причина |
|---|---|
| После Google возвращает на «Вход» с «Не удалось войти» | Домен не в Redirect URLs (шаг 3) или открыт preview-домен, которого нет в списке |
| Свой аккаунт получает «Нет доступа» | Email не в `allowed_emails` или опечатка (шаг 2) |
| Страница «Что-то пошло не так» после входа | Миграция не применена: функции `is_allowed` нет (шаг 1) |
| Cron отвечает 401 | `CRON_SECRET` не задан в Vercel или задан после деплоя без Redeploy |
| Cron отвечает 502 | Supabase недоступен / проект на паузе / миграция не применена (нет `ping`) |
