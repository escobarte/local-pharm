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

### 1.1. Миграция 0002 (Фаза 2: хранение)

Выполняется **после** 0001 и **до** деплоя Фазы 2.

1. SQL Editor → New query → вставить **целиком** `supabase/migrations/0002_storage.sql` → **Run**.
2. Что она делает: добавляет `boxes.number` (номер коробки) и функцию `public.add_medication_with_pack(...)`, которая создаёт препарат и упаковку одной транзакцией. Права на функцию — только `authenticated`.
3. Проверка:

   ```sql
   select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'boxes' and column_name = 'number';  -- 1 строка
   select has_function_privilege('anon', 'public.add_medication_with_pack(text,text,text,text,uuid,uuid,integer,date)', 'execute');  -- false
   ```

Файл безопасно запускать повторно. Если миграцию не применить, приложение при сохранении покажет: «База данных ещё не обновлена. Владельцу нужно выполнить миграцию 0002».

### 1.2. Миграция 0003 (Фаза 3: действия с упаковкой)

Выполняется **после** 0002 и **до** деплоя Фазы 3.

1. SQL Editor → New query → вставить **целиком** `supabase/migrations/0003_pack_actions.sql` → **Run**.
2. Что она делает: добавляет функцию `public.take_one_from_pack(uuid)` для кнопки «Взял 1 шт.»: количество уменьшается одним запросом (не ниже 0, при 0 ставится «заканчивается»), поэтому два человека, нажавшие одновременно, не затирают друг друга. Новых таблиц и столбцов нет. Права на функцию — только `authenticated`.
3. Проверка:

   ```sql
   select has_function_privilege('anon', 'public.take_one_from_pack(uuid)', 'execute');           -- false
   select has_function_privilege('authenticated', 'public.take_one_from_pack(uuid)', 'execute');  -- true
   ```

Файл безопасно запускать повторно. Если миграцию не применить, «Взял 1 шт.» покажет: «База данных ещё не обновлена. Владельцу нужно выполнить последнюю миграцию».

### 1.3. Миграция 0004 (Фаза 4a: реестр AMDM)

Выполняется **после** 0003 и **до** деплоя Фазы 4a.

1. SQL Editor → New query → вставить **целиком** `supabase/migrations/0004_amdm_registry.sql` → **Run**.
2. Что она делает:
   - включает расширение `pg_trgm` (быстрый поиск по подстроке). Отдельно включать его в Database → Extensions **не нужно**: миграция делает это сама (`create extension if not exists pg_trgm with schema extensions`). Если Supabase всё же ответит ошибкой прав на расширение — включить `pg_trgm` вручную в Database → Extensions (схема `extensions`) и запустить миграцию ещё раз;
   - создаёт таблицу `public.amdm_registry` (пустую): RLS включён, чтение только для `authenticated` из белого списка, **никакой записи через API**;
   - добавляет `medications.registry_code` (из какой строки реестра взят препарат);
   - добавляет функцию `public.add_registry_medication_with_pack(...)` для сохранения препарата из реестра. Функция ручного режима (`add_medication_with_pack`) не меняется.
3. Проверка:

   ```sql
   select extname from pg_extension where extname = 'pg_trgm';                                  -- 1 строка
   select has_table_privilege('anon', 'public.amdm_registry', 'select');                        -- false
   select has_table_privilege('authenticated', 'public.amdm_registry', 'select');               -- true
   select has_table_privilege('authenticated', 'public.amdm_registry', 'insert');               -- false
   select has_function_privilege('anon', 'public.add_registry_medication_with_pack(text,text,text,text,text,uuid,uuid,integer,date)', 'execute');  -- false
   ```

Файл безопасно запускать повторно. Данные реестра загружаются отдельно — шаг 7.

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
2. «Войти через Google» → аккаунт из списка: главная «Что ищем?» с поиском, блоком «Внимание», категориями и кнопкой «Выйти».
3. Второй аккаунт из списка: та же главная.
4. Третий (чужой) аккаунт: страница «Нет доступа», сессия сброшена.
5. Прямой запрос к API без входа данных не отдаёт:

   ```bash
   curl "<SUPABASE_URL>/rest/v1/medications?select=*" \
     -H "apikey: <PUBLISHABLE_KEY>"
   ```

   Ожидается ошибка `permission denied` (код 42501). Таблица `allowed_emails` тоже должна отвечать `permission denied`.
6. Фаза 2: «Хранение» → «Новая коробка» → создать → добавить отсек → «Добавить сюда» → сохранить препарат. Он должен появиться в списке отсека с количеством и сроком.
   Фаза 3: на главной найти препарат через поиск (регистр не важен), открыть карточку, нажать «Взял 1 шт.» (количество уменьшилось), «Заканчивается» (появился бейдж «Мало», счётчик на главной вырос), «Переложить» в другой отсек, «Удалить упаковку».
7. Cron: Vercel → Project → **Settings → Cron Jobs**: виден `/api/cron/keepalive`, расписание `0 6 * * *` (раз в сутки, UTC). Кнопка **Run** → в логах ответ `200 {"ok":true}`.

## 7. Реестр AMDM: загрузка и обновление

Реестр — выгрузка с nomenclator.amdm.gov.md (`.xls`). **Ни выгрузка, ни CSV из неё в репозиторий не попадают**: всё лежит в `data-tmp/`, папка в `.gitignore`.

### 7.1. Собрать CSV из выгрузки

Делает КК (или владелец, если есть `python3`, `node` 22 и `curl`):

```bash
bash scripts/amdm/build.sh                       # по умолчанию data-tmp/nomenclator-medicamente.xls
bash scripts/amdm/build.sh path/to/other.xls
```

Скрипт ничего не устанавливает: читает `.xls` библиотекой xlrd 2.0.1 (wheel скачивается один раз в `data-tmp/vendor/` и проверяется по SHA-256), чистит данные и пишет:

- `data-tmp/amdm_registry.csv` — UTF-8, заголовок = имена столбцов таблицы, пустое поле = NULL;
- `data-tmp/amdm_sql/amdm_registry_01.sql … _07.sql` — те же строки как `insert … on conflict (code) do update` (по 1000 строк в файле).

В конце скрипт печатает сводку: строк 6331, уникальных кодов 6331, кодов с ведущим нулём 1796, штрихкодов 258.

### 7.2. Первая загрузка (CSV)

1. Миграция 0004 уже выполнена (шаг 1.3).
2. Supabase → **Table Editor** → таблица `amdm_registry` → **Insert** → **Import data from CSV** → выбрать `data-tmp/amdm_registry.csv`.
3. В предпросмотре проверить, что столбцы совпали по именам (их 18, от `code` до `search_text`), и что `code` выглядит как `0908900192` (ведущие нули на месте) → **Import data**.
4. Проверка в SQL Editor:

   ```sql
   select count(*), count(distinct code), count(*) filter (where code like '0%'), count(barcode)
   from public.amdm_registry;                                  -- 6331 | 6331 | 1796 | 258
   select count(*) from public.amdm_registry
   where form = '' or dose = '' or volume = '' or barcode = '' or atc = '' or med_type = '';  -- 0
   ```

   Если второй запрос дал не 0 (импорт записал пустые строки вместо NULL), выполнить:

   ```sql
   update public.amdm_registry set
     form = nullif(form, ''), dose = nullif(dose, ''), volume = nullif(volume, ''),
     pack_size = nullif(pack_size, ''), holder = nullif(holder, ''), country = nullif(country, ''),
     manufacturer = nullif(manufacturer, ''), reg_number = nullif(reg_number, ''),
     atc = nullif(atc, ''), inn = nullif(inn, ''), barcode = nullif(barcode, ''),
     med_type = nullif(med_type, '');
   ```

**Если CSV-импорт не сработал** (ошибка, зависание, столбцы не совпали): SQL Editor → New query → вставить **целиком** `data-tmp/amdm_sql/amdm_registry_01.sql` → Run, затем `_02` … `_07` по очереди. Каждый файл — отдельная транзакция, повторный запуск безопасен.

### 7.3. Проверка в приложении

На Vercel: **Добавить** → вкладка **Поиск** → `нурофен` (кириллицей) → список Nurofen с формой, дозой, фасовкой, веществом и производителем → выбрать строку → поля «Препарат» заполнены, сверху карточка «Реестр AMDM» → выбрать коробку и отсек → **Сохранить**. Открыть препарат через поиск: тег «Источник: Реестр AMDM». В SQL Editor:

```sql
select name, source, registry_code, barcode from public.medications where source = 'amdm';
```

Ещё запросы для проверки: `paracetamol`, `но-шпа`, `цитрамон`, штрихкод `5995327132174` (Alzepil, 2 строки).

### 7.4. Обновление реестра позже

1. Скачать новую выгрузку с nomenclator.amdm.gov.md, положить в `data-tmp/nomenclator-medicamente.xls`.
2. Собрать CSV и SQL (7.1). Если скрипт пишет `Unexpected header` — AMDM поменял формат выгрузки, нужна правка `scripts/amdm/`.
3. **Обновить**: SQL Editor → по очереди все файлы `data-tmp/amdm_sql/amdm_registry_NN.sql` (upsert по `code`: новые строки добавятся, изменённые обновятся). Строки, исчезнувшие из реестра, при этом **останутся**.
4. **Полная замена** (чтобы убрать исчезнувшие строки): `truncate public.amdm_registry;` в SQL Editor, затем импорт CSV (7.2). Это безопасно: препараты дома ссылаются на реестр текстом `registry_code`, без внешнего ключа, и сами не удаляются.

## Если что-то не так

| Симптом | Причина |
|---|---|
| После Google возвращает на «Вход» с «Не удалось войти» | Домен не в Redirect URLs (шаг 3) или открыт preview-домен, которого нет в списке |
| Свой аккаунт получает «Нет доступа» | Email не в `allowed_emails` или опечатка (шаг 2) |
| Страница «Что-то пошло не так» после входа | Миграция не применена: функции `is_allowed` нет (шаг 1) |
| «Хранение» открывается с ошибкой или «База данных ещё не обновлена» | Не применена миграция 0002 (шаг 1.1) |
| «Взял 1 шт.» отвечает «База данных ещё не обновлена» | Не применена миграция 0003 (шаг 1.2) |
| «Добавить» → «Поиск»: «Реестр AMDM ещё не подключён» | Не применена миграция 0004 (шаг 1.3) |
| «Поиск»: «Реестр AMDM ещё не загружен в базу» | Миграция есть, строк нет — загрузить CSV (шаг 7.2) |
| Сохранение препарата из реестра: «База данных ещё не обновлена» | Не применена миграция 0004 (нет функции `add_registry_medication_with_pack`) |
| Cron отвечает 401 | `CRON_SECRET` не задан в Vercel или задан после деплоя без Redeploy |
| Cron отвечает 502 | Supabase недоступен / проект на паузе / миграция не применена (нет `ping`) |
