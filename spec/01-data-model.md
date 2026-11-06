# 01. Модель данных

Платформонезависимое описание. Эталон — `src/db/schema.ts` в PWA. Имена полей **совпадают с
форматом бэкапа** ([04-backup-format.md](04-backup-format.md)): хранилище на платформе может быть любым
(IndexedDB, Room/SQLite), но экспорт и импорт обязаны выдавать и принимать ровно эти поля.

## Общие соглашения

| Что | Как |
|---|---|
| Идентификаторы | Строки. Новые записи — UUID v4 (у пользовательских категорий — `cat-<uuid>`). Стандартные категории — фиксированные id (см. ниже). |
| Деньги | Число с плавающей точкой (double), всегда **положительная** сумма операции; знак задаёт тип операции. После любой арифметики — округление `round2` ([02](02-business-rules.md#округление)). |
| Валюты | `KZT`, `USD`, `EUR`, `RUB`. Базовая — KZT. |
| Дата операции | Строка `YYYY-MM-DD` в **локальном** часовом поясе устройства. Время суток не хранится. |
| Метка времени | `timestamp` — миллисекунды Unix-эпохи на момент создания; задаёт порядок операций внутри дня. |
| Дата создания | `createdAt` — ISO-8601 в UTC (`2026-10-15T09:00:00.000Z`). |
| Необязательные поля | Отсутствие поля = значение по умолчанию (указано в таблице). В JSON такие поля **опускаются**, а не пишутся как `null`. |

## Account — счёт

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | |
| `name` | string | Непустое (после trim). |
| `type` | `card` \| `cash` \| `deposit` | Подписи: Карта, Наличные, Депозит. |
| `currency` | Currency | Не меняется после создания. |
| `initialBalance` | number | Остаток при создании, может быть отрицательным. |
| `currentBalance` | number | Текущий остаток. Меняется **только** операциями (см. [03](03-operations.md)). |
| `isArchived` | boolean | Архивный счёт скрыт из ввода и из капитала, история сохраняется. |
| `createdAt` | ISO string | |

Инвариант: `currentBalance = initialBalance + Σ влияний всех операций по счёту` (с округлением на каждом шаге).

## Category — категория

| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| `id` | string | | |
| `name` | string | | 1–30 символов, уникально без учёта регистра среди категорий того же типа (включая скрытые). |
| `type` | `expense` \| `income` | | Не меняется после создания. |
| `icon` | string | | Ключ иконки из реестра ([05-screens.md](05-screens.md#иконки)). |
| `color` | string | | `#rrggbb`. |
| `isDefault` | boolean | | `true` — из стандартного набора: её нельзя удалить, только скрыть. |
| `isArchived` | boolean? | `false` | Скрыта: не предлагается при вводе, остаётся в истории, бюджете и аналитике. |
| `order` | number? | `0` | Порядок пользовательских категорий (по возрастанию) после стандартных. |
| `isExcludedFromNoSpend` | boolean? | `false` | Расходы в этой категории по умолчанию не нарушают «дни без трат». Только у `expense`. |

### Стандартный набор (сид)

Порядок списка важен: это порядок «по умолчанию» на всех экранах.

| id | Название | type | icon | color | Не нарушает дни без трат |
|---|---|---|---|---|---|
| `cat-food` | Продукты | expense | ShoppingCart | #22c55e | |
| `cat-cafe` | Кафе и рестораны | expense | Utensils | #f97316 | |
| `cat-transport` | Транспорт | expense | Bus | #3b82f6 | |
| `cat-housing` | Жильё и коммуналка | expense | Home | #a855f7 | ✓ |
| `cat-credit` | Кредиты | expense | Landmark | #ef4444 | ✓ |
| `cat-health` | Здоровье | expense | HeartPulse | #ec4899 | |
| `cat-fun` | Развлечения | expense | Gamepad2 | #eab308 | |
| `cat-clothes` | Одежда | expense | Shirt | #14b8a6 | |
| `cat-comm` | Связь и интернет | expense | Smartphone | #6366f1 | |
| `cat-other` | Прочее | expense | MoreHorizontal | #71717a | |
| `cat-salary` | Зарплата | income | Wallet | #22c55e | |
| `cat-bonus` | Премия | income | Gift | #eab308 | |
| `cat-side` | Подработка | income | Briefcase | #3b82f6 | |
| `cat-in-other` | Прочий доход | income | PlusCircle | #71717a | |

У стандартных категорий поле `isExcludedFromNoSpend` записывается только там, где оно `true`.

## BudgetLimit — плановый лимит категории на месяц

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | `"{year}-{month}-{categoryId}"`, месяц **без** ведущего нуля: `2026-3-cat-food`. |
| `year` | number | |
| `month` | number | 1–12. |
| `categoryId` | string | Только расходные категории. |
| `plannedAmount` | number | > 0. Лимит 0 не хранится: запись удаляется. |

## Transaction — операция

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | |
| `date` | `YYYY-MM-DD` | Не позже сегодняшней (ограничение интерфейса). |
| `timestamp` | number | мс; при редактировании не меняется. |
| `type` | `expense` \| `income` \| `transfer` | |
| `accountId` | string | Счёт списания (`expense`, `transfer`) или зачисления (`income`). |
| `toAccountId` | string? | Только `transfer`: счёт зачисления, ≠ `accountId`. |
| `toAmount` | number? | Только `transfer` между счетами **разных** валют: сумма зачисления в валюте `toAccountId`. Без него зачисляется `amount`. |
| `categoryId` | string? | Обязательна для `expense`/`income`, если нет `debtId`/`goalId`. У переводов нет. (Старые операции без категории допустимы и показываются как «Без категории».) |
| `debtId` | string? | Платёж по долгу (только `expense`). |
| `goalId` | string? | Пополнение цели (только `expense`). |
| `amount` | number | > 0, в валюте `accountId`. |
| `comment` | string? | До 100 символов, без пустых строк (пустой комментарий не хранится). |
| `isExcludedFromNoSpend` | boolean | Расход не нарушает «день без трат». Для доходов и переводов всегда `false`. |

## Debt — долг (кредит)

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `totalAmount` | number | Исходная сумма долга, > 0, ₸. |
| `remainingAmount` | number | Остаток, 0 ≤ остаток ≤ total. |
| `monthlyPayment` | number | Обязательный платёж, > 0. |
| `dueDay` | number | День платежа 1–31 (в коротких месяцах — последний день). |
| `interestRate` | number? | % годовых, ≥ 0, справочно. |
| `createdAt` | ISO string | |
| `isClosed` | boolean | `true` ⇔ `remainingAmount == 0`. |

## FinancialGoal — цель накопления

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | |
| `title` | string | |
| `targetAmount` | number | > 0, ₸. |
| `currentAmount` | number | Накоплено, начинается с 0. |
| `targetDate` | `YYYY-MM-DD` | При создании — не раньше сегодня. |
| `icon` | string | Сейчас всегда `Target`. |
| `color` | string | Один из первых шести цветов палитры. |
| `isAchieved` | boolean | `true` ⇔ `currentAmount ≥ targetAmount`. |

## Config — настройки «ключ → значение»

| Ключ | Значение | В бэкапе | Описание |
|---|---|---|---|
| `seeded` | `true` | нет* | Стартовые данные созданы. |
| `fx_rates` | `{ rates: {USD?, EUR?, RUB?}, date: "YYYY-MM-DD", source: "nbk" \| "manual" }` | **да** | Курсы: тенге за 1 единицу валюты. |
| `last_account_id` | string | нет | Счёт последней добавленной операции. |
| `onboarding` | `"active"` \| `"dismissed"` | нет | Состояние чек-листа первых шагов. |
| `last_backup_date` | ISO string | нет | Когда последний раз сохранялась копия. |
| `storage_persisted` | boolean | нет | Только web: статус защиты хранилища. |
| `auto_backup_handle` | (объект платформы) | нет | Только web: ссылка на файл автобэкапа. |

\* При импорте `seeded = true` выставляется принудительно.

Платформа может хранить свои локальные настройки (например, URI файла автобэкапа на Android) —
они не попадают в бэкап и не должны ломать импорт файлов с других платформ. Так же хранится выбор темы
(`system` | `light` | `dark`, по умолчанию `system`, [05](05-screens.md#общее)) — вне config, чтобы прочитать его до
первого кадра; восстановление и полный сброс его не меняют.
