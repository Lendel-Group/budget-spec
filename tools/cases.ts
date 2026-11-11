/**
 * Тестовые случаи для фикстур. Здесь только ВХОДЫ: ожидаемые значения вычисляет эталонная
 * реализация (PWA) при генерации — см. tools/README.md.
 *
 * Добавляя случай: модуль → функция → имя случая → аргументы (в порядке параметров функции).
 * Аргумент-множество задаётся как { $set: [...] }, отсутствующий необязательный аргумент — просто не передаётся,
 * явный `undefined` в середине списка — { $undefined: true }.
 */

export interface Case {
  fn: string
  name: string
  args: unknown[]
}

const U = { $undefined: true }
const set = (...items: string[]) => ({ $set: items })
/** Бесконечность в аргументах: в JSON её нет (fixtures/README.md). */
const INF = { $number: 'Infinity' }

/* ---------- Сущности ---------- */

type Obj = Record<string, unknown>
const account = (o: Obj = {}): Obj => ({
  id: 'acc-kzt', name: 'Карта', type: 'card', currency: 'KZT',
  initialBalance: 0, currentBalance: 0, isArchived: false, createdAt: '2026-10-15T09:00:00.000Z', ...o,
})
const tx = (o: Obj = {}): Obj => ({
  id: 't1', date: '2026-11-03', timestamp: 1000, type: 'expense', accountId: 'acc-kzt',
  amount: 1000, isExcludedFromNoSpend: false, categoryId: 'cat-food', ...o,
})
const newTx = (o: Obj = {}): Obj => {
  const { id: _id, timestamp: _ts, ...rest } = tx(o)
  return rest
}
const limit = (categoryId: string, plannedAmount: number, year = 2026, month = 11): Obj => ({
  id: `${year}-${month}-${categoryId}`, year, month, categoryId, plannedAmount,
})
const debt = (o: Obj = {}): Obj => ({
  id: 'd1', name: 'Кредит', totalAmount: 100000, remainingAmount: 50000, monthlyPayment: 10000,
  dueDay: 15, createdAt: '2026-10-01T00:00:00.000Z', isClosed: false, ...o,
})
const goal = (o: Obj = {}): Obj => ({
  id: 'g1', title: 'Отпуск', targetAmount: 300000, currentAmount: 100000, targetDate: '2027-05-01',
  icon: 'Target', color: '#22c55e', isAchieved: false, ...o,
})
const category = (o: Obj = {}): Obj => ({
  id: 'cat-food', name: 'Продукты', type: 'expense', icon: 'ShoppingCart', color: '#22c55e', isDefault: true, ...o,
})

const ACCOUNTS = [
  account(),
  account({ id: 'acc-usd', name: 'Доллары', currency: 'USD', currentBalance: 100 }),
  account({ id: 'acc-eur', name: 'Евро', currency: 'EUR', currentBalance: 50 }),
]
const RATES = { USD: 500, EUR: 550.5 }

/** Набор операций за 2026 год для аналитики, бюджета и истории. */
const YEAR_TXS = [
  tx({ id: 'e1', date: '2026-11-03', timestamp: 3, amount: 5000, categoryId: 'cat-food' }),
  tx({ id: 'e2', date: '2026-11-03', timestamp: 5, amount: 2500.5, categoryId: 'cat-cafe' }),
  tx({ id: 'e3', date: '2026-11-04', timestamp: 7, amount: 10, accountId: 'acc-usd', categoryId: 'cat-food' }),
  tx({ id: 'e4', date: '2026-11-04', timestamp: 8, amount: 3, accountId: 'acc-eur', categoryId: 'cat-fun' }),
  tx({ id: 'e5', date: '2026-11-05', timestamp: 9, amount: 700, categoryId: undefined }),
  tx({ id: 'e6', date: '2026-11-05', timestamp: 10, amount: 20000, categoryId: 'cat-credit', debtId: 'd1', isExcludedFromNoSpend: true }),
  tx({ id: 'e7', date: '2026-11-05', timestamp: 11, amount: 15000, categoryId: undefined, goalId: 'g1', isExcludedFromNoSpend: true }),
  tx({ id: 'i1', date: '2026-11-01', timestamp: 1, type: 'income', amount: 400000, categoryId: 'cat-salary' }),
  tx({ id: 'i2', date: '2026-10-10', timestamp: 0, type: 'income', amount: 50, accountId: 'acc-usd', categoryId: 'cat-bonus' }),
  tx({ id: 'tr1', date: '2026-11-02', timestamp: 2, type: 'transfer', amount: 50000, accountId: 'acc-kzt', toAccountId: 'acc-usd', toAmount: 100, categoryId: undefined }),
  tx({ id: 'e8', date: '2026-10-20', timestamp: 0, amount: 12000, categoryId: 'cat-food' }),
  tx({ id: 'e9', date: '2026-01-31', timestamp: 0, amount: 999.99, categoryId: 'cat-transport' }),
  tx({ id: 'old', date: '2025-12-31', timestamp: 0, amount: 100, categoryId: 'cat-food' }),
]

/* ---------- Бэкап ---------- */

const backup = (mutate?: (b: any) => void): string => {
  const b: any = {
    app: 'pwa-budget',
    schemaVersion: 2,
    exportedAt: '2026-11-05T10:00:00.000Z',
    data: {
      accounts: [account({ currentBalance: 5 }), account({ id: 'acc-usd', currency: 'USD' })],
      categories: [category(), category({ id: 'cat-x', name: 'Своя', isDefault: false, isArchived: true, order: 1, isExcludedFromNoSpend: true })],
      budgetLimits: [limit('cat-food', 10)],
      transactions: [
        tx({ comment: 'привет' }),
        tx({ id: 't2', type: 'transfer', toAccountId: 'acc-usd', toAmount: 2, categoryId: undefined, isExcludedFromNoSpend: true }),
      ],
      debts: [debt({ interestRate: 3 })],
      goals: [goal()],
      config: [{ key: 'fx_rates', value: { rates: { USD: 500 }, date: '2026-11-05', source: 'nbk' } }],
    },
  }
  mutate?.(b)
  return JSON.stringify(b)
}

/* ---------- Случаи по модулям ---------- */

export const CASES: Record<string, Case[]> = {
  finance: [
    { fn: 'round2', name: 'float drift 0.1+0.2', args: [0.30000000000000004] },
    { fn: 'round2', name: 'half up 1.005', args: [1.005] },
    { fn: 'round2', name: 'negative', args: [-2.345] },
    { fn: 'round2', name: 'integer', args: [5000] },

    { fn: 'calculateDailyAllowance', name: 'splits remaining, floored', args: [100000, 40000, 20] },
    { fn: 'calculateDailyAllowance', name: 'floors fractions', args: [100, 0, 3] },
    { fn: 'calculateDailyAllowance', name: 'no days left', args: [1000, 0, 0] },
    { fn: 'calculateDailyAllowance', name: 'negative days', args: [1000, 0, -2] },
    { fn: 'calculateDailyAllowance', name: 'overspend', args: [1000, 1500, 5] },
    { fn: 'calculateDailyAllowance', name: 'exactly spent', args: [1000, 1000, 5] },
    { fn: 'calculateDailyAllowance', name: 'empty budget', args: [0, 0, 5] },
    { fn: 'calculateDailyAllowance', name: 'fractional spent', args: [150000, 12345.67, 26] },

    { fn: 'getAllowanceStatus', name: 'green above 2000', args: [2001] },
    { fn: 'getAllowanceStatus', name: 'yellow at 2000', args: [2000] },
    { fn: 'getAllowanceStatus', name: 'yellow at 1', args: [1] },
    { fn: 'getAllowanceStatus', name: 'red at 0', args: [0] },

    { fn: 'calculateNoSpendStreak', name: 'empty: capped at 366', args: [set(), '2026-11-04'] },
    { fn: 'calculateNoSpendStreak', name: 'days since last expense', args: [set('2026-11-01'), '2026-11-04'] },
    { fn: 'calculateNoSpendStreak', name: 'expense today', args: [set('2026-11-04'), '2026-11-04'] },
    { fn: 'calculateNoSpendStreak', name: 'crosses month boundary', args: [set('2026-10-28'), '2026-11-02'] },
    { fn: 'calculateNoSpendStreak', name: 'earliestDate bounds both', args: [set(), '2026-11-04', '2026-11-03'] },
    { fn: 'calculateNoSpendStreak', name: 'earliestDate before month start', args: [set('2026-11-02'), '2026-11-05', '2026-09-01'] },
    { fn: 'calculateNoSpendStreak', name: 'earliestDate equals today', args: [set(), '2026-11-04', '2026-11-04'] },
    { fn: 'calculateNoSpendStreak', name: 'first day of month', args: [set('2026-10-31'), '2026-11-01'] },

    { fn: 'breaksNoSpendDay', name: 'expense', args: [{ type: 'expense', isExcludedFromNoSpend: false }] },
    { fn: 'breaksNoSpendDay', name: 'excluded expense', args: [{ type: 'expense', isExcludedFromNoSpend: true }] },
    { fn: 'breaksNoSpendDay', name: 'income', args: [{ type: 'income', isExcludedFromNoSpend: false }] },
    { fn: 'breaksNoSpendDay', name: 'transfer', args: [{ type: 'transfer', isExcludedFromNoSpend: false }] },

    { fn: 'getDatesWithExpenses', name: 'year set', args: [YEAR_TXS] },

    { fn: 'calculateCategoryTotals', name: 'raw amounts by category (no conversion)', args: [YEAR_TXS] },

    { fn: 'calculateNetWorth', name: 'with rates', args: [ACCOUNTS.map((a, i) => ({ ...a, currentBalance: [150000.55, 100, 50][i] })), RATES] },
    { fn: 'calculateNetWorth', name: 'missing rate skipped', args: [ACCOUNTS.map((a, i) => ({ ...a, currentBalance: [1000, 100, 50][i] })), { USD: 500 }] },
    { fn: 'calculateNetWorth', name: 'archived skipped', args: [[account({ currentBalance: 1000 }), account({ id: 'x', currentBalance: 500, isArchived: true })]] },
    { fn: 'calculateNetWorth', name: 'negative balance', args: [[account({ currentBalance: -2500 }), account({ id: 'x', currentBalance: 1000 })]] },

    { fn: 'accountsMissingRates', name: 'EUR missing', args: [ACCOUNTS, { USD: 500 }] },
    { fn: 'accountsMissingRates', name: 'archived ignored', args: [[account({ id: 'u', currency: 'USD', isArchived: true })], {}] },

    { fn: 'validateNewTransaction', name: 'valid expense', args: [newTx()] },
    { fn: 'validateNewTransaction', name: 'zero amount', args: [newTx({ amount: 0 })] },
    { fn: 'validateNewTransaction', name: 'negative amount', args: [newTx({ amount: -5 })] },
    { fn: 'validateNewTransaction', name: 'transfer without target', args: [newTx({ type: 'transfer', categoryId: undefined })] },
    { fn: 'validateNewTransaction', name: 'transfer to same account', args: [newTx({ type: 'transfer', toAccountId: 'acc-kzt', categoryId: undefined })] },
    { fn: 'validateNewTransaction', name: 'transfer bad toAmount', args: [newTx({ type: 'transfer', toAccountId: 'acc-usd', toAmount: 0, categoryId: undefined })] },
    { fn: 'validateNewTransaction', name: 'valid transfer', args: [newTx({ type: 'transfer', toAccountId: 'acc-usd', toAmount: 2, categoryId: undefined })] },
    { fn: 'validateNewTransaction', name: 'debt payment as income', args: [newTx({ type: 'income', debtId: 'd1' })] },
    { fn: 'validateNewTransaction', name: 'expense without category', args: [newTx({ categoryId: undefined })] },
    { fn: 'validateNewTransaction', name: 'goal top-up without category ok', args: [newTx({ categoryId: undefined, goalId: 'g1' })] },
    { fn: 'validateNewTransaction', name: 'income without category', args: [newTx({ type: 'income', categoryId: undefined })] },

    { fn: 'getBalanceDeltas', name: 'expense', args: [tx()] },
    { fn: 'getBalanceDeltas', name: 'expense rollback', args: [tx(), -1] },
    { fn: 'getBalanceDeltas', name: 'income', args: [tx({ type: 'income' })] },
    { fn: 'getBalanceDeltas', name: 'transfer same currency', args: [tx({ type: 'transfer', toAccountId: 'acc-2' })] },
    { fn: 'getBalanceDeltas', name: 'transfer cross currency', args: [tx({ type: 'transfer', toAccountId: 'acc-usd', toAmount: 2 })] },
    { fn: 'getBalanceDeltas', name: 'transfer rollback', args: [tx({ type: 'transfer', toAccountId: 'acc-usd', toAmount: 2 }), -1] },

    { fn: 'applyToDebt', name: 'payment', args: [debt(), 10000] },
    { fn: 'applyToDebt', name: 'closes at zero', args: [debt(), 50000] },
    { fn: 'applyToDebt', name: 'overpayment error', args: [debt(), 50000.01] },
    { fn: 'applyToDebt', name: 'rollback reopens', args: [debt({ remainingAmount: 0, isClosed: true }), -5000] },
    { fn: 'applyToDebt', name: 'float drift', args: [debt({ remainingAmount: 0.3 }), 0.1] },

    { fn: 'applyToGoal', name: 'top-up', args: [goal(), 50000] },
    { fn: 'applyToGoal', name: 'achieves', args: [goal(), 200000] },
    { fn: 'applyToGoal', name: 'over target', args: [goal(), 250000] },
    { fn: 'applyToGoal', name: 'rollback un-achieves', args: [goal({ currentAmount: 300000, isAchieved: true }), -1] },

    { fn: 'convertToKzt', name: 'KZT as is', args: [1234.5, 'KZT', {}] },
    { fn: 'convertToKzt', name: 'USD', args: [10, 'USD', RATES] },
    { fn: 'convertToKzt', name: 'no rate', args: [10, 'RUB', RATES] },

    { fn: 'calculateExpensesKzt', name: 'year txs (goal excluded, debt included)', args: [YEAR_TXS, ACCOUNTS, RATES] },
    { fn: 'calculateExpensesKzt', name: 'missing EUR rate', args: [YEAR_TXS, ACCOUNTS, { USD: 500 }] },
    { fn: 'calculateExpensesKzt', name: 'unknown account skipped', args: [[tx({ accountId: 'nope' })], ACCOUNTS, RATES] },

    { fn: 'sumPlannedLimits', name: 'sum', args: [[limit('a', 0.1), limit('b', 0.2), limit('c', 150000)]] },
    { fn: 'sumPlannedLimits', name: 'empty', args: [[]] },
  ],

  dates: [
    { fn: 'addDays', name: '+1', args: ['2026-11-05', 1] },
    { fn: 'addDays', name: 'month end', args: ['2026-11-30', 1] },
    { fn: 'addDays', name: 'year end', args: ['2026-12-31', 1] },
    { fn: 'addDays', name: 'back over leap day', args: ['2028-03-01', -1] },
    { fn: 'addDays', name: '-29', args: ['2026-11-05', -29] },
    { fn: 'addDays', name: '-90', args: ['2026-01-15', -90] },
    { fn: 'daysInMonth', name: 'february', args: [2026, 2] },
    { fn: 'daysInMonth', name: 'leap february', args: [2028, 2] },
    { fn: 'daysInMonth', name: 'century non-leap', args: [2100, 2] },
    { fn: 'daysInMonth', name: 'november', args: [2026, 11] },
    { fn: 'daysInMonth', name: 'december', args: [2026, 12] },
    { fn: 'daysLeftInMonth', name: 'first day', args: ['2026-11-01'] },
    { fn: 'daysLeftInMonth', name: 'mid', args: ['2026-11-05'] },
    { fn: 'daysLeftInMonth', name: 'last day', args: ['2026-11-30'] },
    { fn: 'clampDueDay', name: '31 in february', args: [2026, 2, 31] },
    { fn: 'clampDueDay', name: '31 in leap february', args: [2028, 2, 31] },
    { fn: 'clampDueDay', name: 'fits', args: [2026, 11, 15] },
    { fn: 'monthStart', name: 'mid', args: ['2026-11-05'] },
    { fn: 'formatDateChip', name: 'today', args: ['2026-11-05', '2026-11-05'] },
    { fn: 'formatDateChip', name: 'yesterday', args: ['2026-11-04', '2026-11-05'] },
    { fn: 'formatDateChip', name: 'older', args: ['2026-11-01', '2026-11-05'] },
    { fn: 'formatDateChip', name: 'may genitive', args: ['2026-05-09', '2026-11-05'] },
    { fn: 'formatDateChip', name: 'yesterday across year', args: ['2025-12-31', '2026-01-01'] },
    { fn: 'formatDayHeading', name: 'today', args: ['2026-11-05', '2026-11-05'] },
    { fn: 'formatDayHeading', name: 'yesterday', args: ['2026-11-04', '2026-11-05'] },
    { fn: 'formatDayHeading', name: 'same year monday', args: ['2026-11-02', '2026-11-05'] },
    { fn: 'formatDayHeading', name: 'sunday', args: ['2026-11-01', '2026-11-05'] },
    { fn: 'formatDayHeading', name: 'previous year', args: ['2025-03-08', '2026-11-05'] },
  ],

  period: [
    { fn: 'addMonths', name: '+1 over year', args: [{ year: 2026, month: 12 }, 1] },
    { fn: 'addMonths', name: '-1 over year', args: [{ year: 2026, month: 1 }, -1] },
    { fn: 'addMonths', name: '+12', args: [{ year: 2026, month: 11 }, 12] },
    { fn: 'addMonths', name: '-25', args: [{ year: 2026, month: 3 }, -25] },
    { fn: 'sameMonth', name: 'same', args: [{ year: 2026, month: 3 }, { year: 2026, month: 3 }] },
    { fn: 'sameMonth', name: 'different year', args: [{ year: 2026, month: 3 }, { year: 2025, month: 3 }] },
    { fn: 'earliestMonth', name: 'mixed with undefined', args: [['2026-11-05', U, '2025-12-31', '2026-01-01']] },
    { fn: 'earliestMonth', name: 'empty', args: [[]] },
    { fn: 'monthBounds', name: 'earliest in past, 12 ahead', args: [{ year: 2026, month: 11 }, { year: 2025, month: 6 }, 12] },
    { fn: 'monthBounds', name: 'no data', args: [{ year: 2026, month: 11 }, null, 0] },
    { fn: 'monthBounds', name: 'earliest in future clamps to current', args: [{ year: 2026, month: 11 }, { year: 2027, month: 2 }, 0] },
    { fn: 'yearBounds', name: 'with data', args: [2026, { year: 2024, month: 5 }] },
    { fn: 'yearBounds', name: 'no data', args: [2026, null] },
    { fn: 'canStepMonth', name: 'back allowed', args: [{ year: 2026, month: 11 }, -1, { min: { year: 2026, month: 1 }, max: { year: 2027, month: 11 } }] },
    { fn: 'canStepMonth', name: 'back at min', args: [{ year: 2026, month: 1 }, -1, { min: { year: 2026, month: 1 }, max: { year: 2027, month: 11 } }] },
    { fn: 'canStepMonth', name: 'forward at max', args: [{ year: 2027, month: 11 }, 1, { min: { year: 2026, month: 1 }, max: { year: 2027, month: 11 } }] },
  ],

  rates: [
    { fn: 'parseRatesFile', name: 'valid', args: [{ date: '2026-11-05', rates: { USD: 503.12, EUR: 560.4, RUB: 6.21, CNY: 70 } }] },
    { fn: 'parseRatesFile', name: 'partial', args: [{ date: '2026-11-05', rates: { USD: 503.12, EUR: 'x', RUB: -1 } }] },
    { fn: 'parseRatesFile', name: 'no supported', args: [{ date: '2026-11-05', rates: { CNY: 70 } }] },
    { fn: 'parseRatesFile', name: 'bad date', args: [{ date: '05.11.2026', rates: { USD: 500 } }] },
    { fn: 'parseRatesFile', name: 'not object', args: ['nope'] },
    { fn: 'parseRatesFile', name: 'null', args: [null] },
    { fn: 'parseRatesFile', name: 'rates null', args: [{ date: '2026-11-05', rates: null }] },
  ],

  budget: [
    { fn: 'monthLabel', name: 'november', args: [2026, 11] },
    { fn: 'monthLabel', name: 'may', args: [2027, 5] },
    { fn: 'limitId', name: 'id format (month not padded)', args: [2026, 3, 'cat-food'] },
    { fn: 'previousMonth', name: 'january', args: [2026, 1] },
    { fn: 'previousMonth', name: 'mid', args: [2026, 11] },
    { fn: 'nextMonth', name: 'december', args: [2026, 12] },
    {
      fn: 'planCopy', name: 'copies missing, skips existing and zero',
      args: [
        [limit('cat-food', 50000, 2026, 10), limit('cat-cafe', 20000, 2026, 10), limit('cat-fun', 0, 2026, 10)],
        [limit('cat-food', 70000)],
        2026, 11,
      ],
    },
    { fn: 'planCopy', name: 'nothing to copy', args: [[], [], 2026, 11] },
    { fn: 'planCopy', name: 'across year', args: [[limit('cat-food', 1, 2025, 12)], [], 2026, 1] },
    { fn: 'parsePlanInput', name: 'empty → 0', args: [''] },
    { fn: 'parsePlanInput', name: 'spaces and comma', args: [' 150 000,555 '] },
    { fn: 'parsePlanInput', name: 'negative', args: ['-5'] },
    { fn: 'parsePlanInput', name: 'garbage', args: ['abc'] },
    { fn: 'parsePlanInput', name: 'zero', args: ['0'] },
    { fn: 'calculateUncategorizedKzt', name: 'year txs', args: [YEAR_TXS, ACCOUNTS, RATES] },
    { fn: 'calculateCategoryTotalsKzt', name: 'year txs', args: [YEAR_TXS, ACCOUNTS, RATES] },
    { fn: 'calculateCategoryTotalsKzt', name: 'no rates', args: [YEAR_TXS, ACCOUNTS, {}] },
    { fn: 'monthBalance', name: 'remaining', args: [100000, 40000.5] },
    { fn: 'monthBalance', name: 'over', args: [100000, 120000] },
    { fn: 'monthBalance', name: 'exact', args: [100000, 100000] },
    { fn: 'monthBalance', name: 'no plan', args: [0, 5000] },
  ],

  planning: [
    { fn: 'daysBetween', name: 'forward', args: ['2026-11-05', '2026-12-05'] },
    { fn: 'daysBetween', name: 'backward', args: ['2026-11-05', '2026-11-01'] },
    { fn: 'daysBetween', name: 'over DST-like boundary', args: ['2026-03-28', '2026-03-30'] },
    { fn: 'nextDueDate', name: 'later this month', args: ['2026-11-05', 15] },
    { fn: 'nextDueDate', name: 'today', args: ['2026-11-15', 15] },
    { fn: 'nextDueDate', name: 'next month', args: ['2026-11-16', 15] },
    { fn: 'nextDueDate', name: 'clamped to february', args: ['2026-02-10', 31] },
    { fn: 'nextDueDate', name: 'clamped next month', args: ['2026-01-31', 30] },
    { fn: 'nextDueDate', name: 'december → january', args: ['2026-12-20', 5] },
    { fn: 'nextDueDate', name: '31 in november → november 30', args: ['2026-11-30', 31] },
    { fn: 'calculateGoalPlan', name: 'regular', args: [goal(), '2026-11-05'] },
    { fn: 'calculateGoalPlan', name: 'target today', args: [goal({ targetDate: '2026-11-05' }), '2026-11-05'] },
    { fn: 'calculateGoalPlan', name: 'overdue', args: [goal({ targetDate: '2026-10-01' }), '2026-11-05'] },
    { fn: 'calculateGoalPlan', name: 'achieved', args: [goal({ currentAmount: 310000, isAchieved: true }), '2026-11-05'] },
    { fn: 'calculateGoalPlan', name: 'fractional remaining', args: [goal({ targetAmount: 1000.5, currentAmount: 0, targetDate: '2027-02-05' }), '2026-11-05'] },
    { fn: 'debtFieldErrors', name: 'valid', args: [{ name: 'Кредит', totalAmount: 100, remainingAmount: 50, monthlyPayment: 10, dueDay: 31 }] },
    { fn: 'debtFieldErrors', name: 'all invalid', args: [{ name: '  ', totalAmount: 0, remainingAmount: 0, monthlyPayment: 0, dueDay: 0, interestRate: -1 }] },
    { fn: 'debtFieldErrors', name: 'remaining above total', args: [{ name: 'A', totalAmount: 100, remainingAmount: 101, monthlyPayment: 10, dueDay: 5 }] },
    { fn: 'debtFieldErrors', name: 'fractional due day', args: [{ name: 'A', totalAmount: 100, remainingAmount: 100, monthlyPayment: 10, dueDay: 5.5, interestRate: 0 }] },
    { fn: 'debtFieldErrors', name: 'NaN amounts', args: [{ name: 'A', totalAmount: null, remainingAmount: null, monthlyPayment: null, dueDay: 32 }] },
    // Infinity не проходит через JSON — передаётся как { $number } (fixtures/README.md)
    { fn: 'debtFieldErrors', name: 'infinite amounts', args: [{ name: 'A', totalAmount: INF, remainingAmount: INF, monthlyPayment: INF, dueDay: 5, interestRate: INF }] },
    { fn: 'debtFieldErrors', name: 'infinite total, finite remaining', args: [{ name: 'A', totalAmount: INF, remainingAmount: 100, monthlyPayment: 10, dueDay: 5 }] },
    { fn: 'validateDebtInput', name: 'first error', args: [{ name: 'A', totalAmount: 0, remainingAmount: 0, monthlyPayment: 0, dueDay: 0 }] },
    { fn: 'validateDebtInput', name: 'ok', args: [{ name: 'A', totalAmount: 1, remainingAmount: 1, monthlyPayment: 1, dueDay: 1 }] },
    { fn: 'goalFieldErrors', name: 'valid', args: [{ title: 'Отпуск', targetAmount: 1, targetDate: '2026-11-05' }, '2026-11-05'] },
    { fn: 'goalFieldErrors', name: 'all invalid', args: [{ title: '', targetAmount: 0, targetDate: '' }, '2026-11-05'] },
    { fn: 'goalFieldErrors', name: 'date in past', args: [{ title: 'A', targetAmount: 1, targetDate: '2026-11-04' }, '2026-11-05'] },
    { fn: 'goalFieldErrors', name: 'infinite target', args: [{ title: 'A', targetAmount: INF, targetDate: '2026-11-05' }, '2026-11-05'] },
    { fn: 'validateGoalInput', name: 'first error', args: [{ title: 'A', targetAmount: -1, targetDate: '2020-01-01' }, '2026-11-05'] },
    { fn: 'amountFieldError', name: 'ok', args: [100] },
    { fn: 'amountFieldError', name: 'zero', args: [0] },
    { fn: 'amountFieldError', name: 'above max', args: [101, 100] },
    { fn: 'amountFieldError', name: 'equals max', args: [100, 100] },
    { fn: 'amountFieldError', name: 'infinite', args: [INF] },
    { fn: 'amountFieldError', name: 'negative infinite', args: [{ $number: '-Infinity' }] },
    {
      fn: 'getFirstTrackedDate', name: 'account created earlier',
      args: [[account({ createdAt: '2026-10-15T23:30:00.000Z' })], [tx({ date: '2026-11-01' })], '2026-11-05'],
    },
    { fn: 'getFirstTrackedDate', name: 'transaction earlier', args: [[account()], [tx({ date: '2026-09-01' })], '2026-11-05'] },
    { fn: 'getFirstTrackedDate', name: 'fallback', args: [[], [], '2026-11-05'] },
    { fn: 'buildCalendar', name: 'november 2026', args: [2026, 11, '2026-11-05', set('2026-11-02', '2026-11-04'), '2026-11-02'] },
    { fn: 'buildCalendar', name: 'february 2027 (starts monday)', args: [2027, 2, '2026-11-05', set(), '2026-01-01'] },
    { fn: 'buildCalendar', name: 'march 2026 (starts sunday)', args: [2026, 3, '2026-03-10', set('2026-03-01'), '2026-03-01'] },
    { fn: 'isCalendarDayInteractive', name: 'clean', args: ['clean'] },
    { fn: 'isCalendarDayInteractive', name: 'spent', args: ['spent'] },
    { fn: 'isCalendarDayInteractive', name: 'future', args: ['future'] },
    { fn: 'isCalendarDayInteractive', name: 'untracked', args: ['untracked'] },
  ],

  analytics: [
    { fn: 'calculateYearSummary', name: '2026', args: [YEAR_TXS, ACCOUNTS, RATES, 2026] },
    { fn: 'calculateYearSummary', name: '2026 without rates', args: [YEAR_TXS, ACCOUNTS, {}, 2026] },
    { fn: 'calculateYearSummary', name: 'empty year', args: [YEAR_TXS, ACCOUNTS, RATES, 2024] },
    { fn: 'calculateCategoryBreakdown', name: 'year 2026', args: [YEAR_TXS, ACCOUNTS, RATES, 2026] },
    { fn: 'calculateCategoryBreakdown', name: 'november 2026', args: [YEAR_TXS, ACCOUNTS, RATES, 2026, 11] },
    { fn: 'calculateCategoryBreakdown', name: 'november without EUR', args: [YEAR_TXS, ACCOUNTS, { USD: 500 }, 2026, 11] },
    { fn: 'calculateCategoryBreakdown', name: 'empty month', args: [YEAR_TXS, ACCOUNTS, RATES, 2026, 2] },
    {
      fn: 'calculateCategoryBreakdown', name: 'ties sorted by id, uncategorized last',
      args: [[tx({ id: 'a', categoryId: 'b' }), tx({ id: 'b', categoryId: 'a' }), tx({ id: 'c', categoryId: undefined })], ACCOUNTS, RATES, 2026],
    },
    { fn: 'sumYear', name: 'totals', args: [[{ month: 1, income: 100.1, expense: 50.05, savings: 50.05 }, { month: 2, income: 0.2, expense: 300, savings: -299.8 }]] },
    { fn: 'barFractions', name: 'regular', args: [[0, 50, 100, 25]] },
    { fn: 'barFractions', name: 'all zero', args: [[0, 0, 0]] },
    { fn: 'barFractions', name: 'negative clamped', args: [[-10, 20]] },
    { fn: 'compactAmount', name: 'small', args: [999.6] },
    { fn: 'compactAmount', name: 'thousands', args: [1500] },
    { fn: 'compactAmount', name: 'round thousands', args: [12000] },
    { fn: 'compactAmount', name: 'millions', args: [2_345_678] },
    { fn: 'compactAmount', name: 'negative', args: [-1500] },
    { fn: 'compactAmount', name: 'rounding 999 960 stays thousands', args: [999_960] },
  ],

  history: [
    { fn: 'isFilterActive', name: 'empty', args: [{ type: 'all', accountId: '', categoryId: '', from: '', to: '' }] },
    { fn: 'isFilterActive', name: 'only date', args: [{ type: 'all', accountId: '', categoryId: '', from: '2026-11-01', to: '' }] },
    { fn: 'filterTransactions', name: 'no filter', args: [YEAR_TXS, { type: 'all', accountId: '', categoryId: '', from: '', to: '' }] },
    { fn: 'filterTransactions', name: 'account includes transfer target', args: [YEAR_TXS, { type: 'all', accountId: 'acc-usd', categoryId: '', from: '', to: '' }] },
    { fn: 'filterTransactions', name: 'expense + category + range', args: [YEAR_TXS, { type: 'expense', accountId: '', categoryId: 'cat-food', from: '2026-10-01', to: '2026-11-03' }] },
    { fn: 'filterTransactions', name: 'transfers only', args: [YEAR_TXS, { type: 'transfer', accountId: '', categoryId: '', from: '', to: '' }] },
    { fn: 'periodRange', name: 'all', args: ['all', '2026-11-05'] },
    { fn: 'periodRange', name: 'month', args: ['month', '2026-11-05'] },
    { fn: 'periodRange', name: 'prev-month', args: ['prev-month', '2026-11-05'] },
    { fn: 'periodRange', name: 'prev-month in january', args: ['prev-month', '2026-01-10'] },
    { fn: 'periodRange', name: '30d', args: ['30d', '2026-11-05'] },
    { fn: 'periodRange', name: 'month february', args: ['month', '2028-02-10'] },
    { fn: 'groupByDay', name: 'year txs with rates', args: [YEAR_TXS, ACCOUNTS, RATES] },
    { fn: 'groupByDay', name: 'only transfer → null total', args: [[tx({ type: 'transfer', toAccountId: 'acc-usd', categoryId: undefined })], ACCOUNTS, RATES] },
    { fn: 'groupByDay', name: 'no rate → null total', args: [[tx({ accountId: 'acc-eur' })], ACCOUNTS, {}] },
    {
      fn: 'takeGroups', name: 'whole days until min reached',
      args: [[
        { date: '2026-11-05', items: [tx({ id: 'a' }), tx({ id: 'b' })], totalKzt: -2000 },
        { date: '2026-11-04', items: [tx({ id: 'c' })], totalKzt: -1000 },
        { date: '2026-11-03', items: [tx({ id: 'd' })], totalKzt: -1000 },
      ], 3],
    },
    { fn: 'takeGroups', name: 'empty', args: [[], 100] },
  ],

  categories: [
    {
      fn: 'sortCategoriesByUsage', name: 'by frequency, stable for ties',
      args: [
        [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
        [
          { categoryId: 'c', date: '2026-11-05' }, { categoryId: 'c', date: '2026-10-01' },
          { categoryId: 'b', date: '2026-11-01' }, { categoryId: 'd', date: '2026-08-01' },
          { categoryId: 'd', date: '2026-08-02' }, { categoryId: 'd', date: '2026-08-03' },
        ],
        '2026-11-05',
      ],
    },
    {
      fn: 'sortCategoriesByUsage', name: 'window boundary is inclusive (today − 90)',
      args: [[{ id: 'a' }, { id: 'b' }], [{ categoryId: 'b', date: '2026-08-07' }], '2026-11-05'],
    },
    {
      fn: 'sortByDefaultOrder', name: 'defaults first, then by order',
      args: [
        [{ id: 'cat-x', order: 2 }, { id: 'cat-cafe' }, { id: 'cat-y', order: 1 }, { id: 'cat-food' }, { id: 'cat-z' }],
        ['cat-food', 'cat-cafe', 'cat-transport'],
      ],
    },
    { fn: 'categoryFieldErrors', name: 'valid', args: [{ name: 'Подарки', type: 'expense', icon: 'Gift', color: '#EAB308' }, [category()]] },
    { fn: 'categoryFieldErrors', name: 'empty everything', args: [{ name: ' ', type: 'expense', icon: '', color: 'red' }, []] },
    { fn: 'categoryFieldErrors', name: 'too long', args: [{ name: 'А'.repeat(31), type: 'expense', icon: 'Gift', color: '#eab308' }, []] },
    { fn: 'categoryFieldErrors', name: '30 chars ok', args: [{ name: 'А'.repeat(30), type: 'expense', icon: 'Gift', color: '#eab308' }, []] },
    { fn: 'categoryFieldErrors', name: 'duplicate case-insensitive', args: [{ name: ' продукты ', type: 'expense', icon: 'Gift', color: '#eab308' }, [category()]] },
    { fn: 'categoryFieldErrors', name: 'duplicate among hidden', args: [{ name: 'Продукты', type: 'expense', icon: 'Gift', color: '#eab308' }, [category({ isArchived: true })]] },
    { fn: 'categoryFieldErrors', name: 'same name other type ok', args: [{ name: 'Продукты', type: 'income', icon: 'Gift', color: '#eab308' }, [category()]] },
    { fn: 'categoryFieldErrors', name: 'editing self ok', args: [{ name: 'Продукты', type: 'expense', icon: 'Gift', color: '#eab308' }, [category()], 'cat-food'] },
    { fn: 'validateCategoryInput', name: 'first error', args: [{ name: '', type: 'expense', icon: '', color: '' }, []] },
    { fn: 'resolveExcludedFromNoSpend', name: 'category flag', args: [{ isExcludedFromNoSpend: true }] },
    { fn: 'resolveExcludedFromNoSpend', name: 'no category', args: [U] },
    { fn: 'resolveExcludedFromNoSpend', name: 'override false wins', args: [{ isExcludedFromNoSpend: true }, false] },
    { fn: 'resolveExcludedFromNoSpend', name: 'override true wins', args: [{}, true] },
  ],

  accounts: [
    { fn: 'accountFieldErrors', name: 'valid', args: [{ name: 'Kaspi', type: 'card', currency: 'KZT', initialBalance: -500 }] },
    { fn: 'accountFieldErrors', name: 'invalid', args: [{ name: '  ', type: 'card', currency: 'KZT', initialBalance: null }] },
    { fn: 'validateAccountInput', name: 'first error', args: [{ name: '', type: 'cash', currency: 'USD', initialBalance: 0 }] },
    {
      fn: 'pickAccount', name: 'selected wins',
      args: [[{ id: 'a', isArchived: false }, { id: 'b', isArchived: false }], 'b', 'a'],
    },
    {
      fn: 'pickAccount', name: 'last used if active',
      args: [[{ id: 'a', isArchived: false }, { id: 'b', isArchived: false }], U, 'b'],
    },
    {
      fn: 'pickAccount', name: 'archived last used skipped',
      args: [[{ id: 'a', isArchived: true }, { id: 'b', isArchived: false }], U, 'a'],
    },
    { fn: 'pickAccount', name: 'all archived → first', args: [[{ id: 'a', isArchived: true }, { id: 'b', isArchived: true }]] },
    { fn: 'pickAccount', name: 'empty', args: [[]] },
  ],

  numpad: [
    { fn: 'applyNumpadKey', name: 'first digit', args: ['', '5'] },
    { fn: 'applyNumpadKey', name: 'leading zero replaced', args: ['0', '7'] },
    { fn: 'applyNumpadKey', name: 'double zero blocked', args: ['0', '0'] },
    { fn: 'applyNumpadKey', name: 'dot on empty', args: ['', '.'] },
    { fn: 'applyNumpadKey', name: 'second dot ignored', args: ['1.5', '.'] },
    { fn: 'applyNumpadKey', name: 'max 2 decimals', args: ['1.25', '9'] },
    { fn: 'applyNumpadKey', name: 'decimal digit', args: ['1.2', '9'] },
    { fn: 'applyNumpadKey', name: 'max 10 int digits', args: ['1234567890', '1'] },
    { fn: 'applyNumpadKey', name: 'backspace', args: ['12.5', 'backspace'] },
    { fn: 'applyNumpadKey', name: 'backspace empty', args: ['', 'backspace'] },
    { fn: 'applyNumpadKey', name: 'zero after dot', args: ['0.', '0'] },
    { fn: 'parseAmount', name: 'empty', args: [''] },
    { fn: 'parseAmount', name: 'trailing dot', args: ['0.'] },
    { fn: 'parseAmount', name: 'decimal', args: ['12.5'] },
    { fn: 'displayAmount', name: 'empty', args: [''] },
    { fn: 'displayAmount', name: 'value', args: ['12.5'] },
  ],

  onboarding: [
    { fn: 'onboardingSteps', name: 'fresh install', args: [{ accounts: [{ initialBalance: 0 }], limitsCount: 0, transactionsCount: 0 }] },
    { fn: 'onboardingSteps', name: 'balance set', args: [{ accounts: [{ initialBalance: 1000 }], limitsCount: 2, transactionsCount: 0 }] },
    { fn: 'onboardingSteps', name: 'second account', args: [{ accounts: [{ initialBalance: 0 }, { initialBalance: 0 }], limitsCount: 0, transactionsCount: 3 }] },
    { fn: 'isOnboardingComplete', name: 'all done', args: [[{ id: 'account', done: true }, { id: 'limits', done: true }, { id: 'transaction', done: true }]] },
    { fn: 'isOnboardingComplete', name: 'not done', args: [[{ id: 'account', done: true }, { id: 'limits', done: false }, { id: 'transaction', done: true }]] },
  ],

  dangerConfirm: [
    { fn: 'isConfirmationWord', name: 'exact', args: ['СБРОС', 'СБРОС'] },
    { fn: 'isConfirmationWord', name: 'lowercase and spaces', args: ['  сброс ', 'СБРОС'] },
    { fn: 'isConfirmationWord', name: 'latin lookalike rejected', args: ['CБPOC', 'СБРОС'] },
    { fn: 'isConfirmationWord', name: 'restore word', args: ['заменить', 'ЗАМЕНИТЬ'] },
  ],

  backupValidation: [
    { fn: 'parseBackup', name: 'valid', args: [backup()] },
    { fn: 'parseBackup', name: 'from android', args: [backup((b) => { b.platform = 'android'; b.appVersion = '0.2.0' })] },
    { fn: 'parseBackup', name: 'from pwa', args: [backup((b) => { b.platform = 'pwa'; b.appVersion = '1.23.0' })] },
    { fn: 'parseBackup', name: 'unknown platform accepted', args: [backup((b) => { b.platform = 'ios' })] },
    { fn: 'parseBackup', name: 'empty tables', args: [backup((b) => { for (const k of Object.keys(b.data)) b.data[k] = [] })] },
    { fn: 'parseBackup', name: 'invalid JSON', args: ['{oops'] },
    { fn: 'parseBackup', name: 'wrong app', args: [backup((b) => { b.app = 'other' })] },
    { fn: 'parseBackup', name: 'array root', args: ['[]'] },
    { fn: 'parseBackup', name: 'unsupported version', args: [backup((b) => { b.schemaVersion = 3 })] },
    { fn: 'parseBackup', name: 'no exportedAt', args: [backup((b) => { delete b.exportedAt })] },
    { fn: 'parseBackup', name: 'no data', args: [backup((b) => { b.data = [] })] },
    { fn: 'parseBackup', name: 'table not array', args: [backup((b) => { b.data.goals = {} })] },
    { fn: 'parseBackup', name: 'row not object', args: [backup((b) => { b.data.debts = [1] })] },
    { fn: 'parseBackup', name: 'bad enum', args: [backup((b) => { b.data.accounts[0].currency = 'GBP' })] },
    { fn: 'parseBackup', name: 'string instead of number', args: [backup((b) => { b.data.transactions[0].amount = '5' })] },
    { fn: 'parseBackup', name: 'missing required string', args: [backup((b) => { delete b.data.categories[0].name })] },
    { fn: 'parseBackup', name: 'optional of wrong type', args: [backup((b) => { b.data.transactions[0].comment = 5 })] },
    { fn: 'parseBackup', name: 'duplicate id', args: [backup((b) => { b.data.goals.push(b.data.goals[0]) })] },
    { fn: 'parseBackup', name: 'config row invalid', args: [backup((b) => { b.data.config = [{ key: 'fx_rates' }] })] },
    { fn: 'parseBackup', name: 'config not array', args: [backup((b) => { delete b.data.config })] },
    { fn: 'parseBackup', name: 'dangling account ref', args: [backup((b) => { b.data.transactions[1].toAccountId = 'ghost' })] },
    { fn: 'parseBackup', name: 'unknown extra fields kept', args: [backup((b) => { b.data.accounts[0].future = 1; b.extra = true })] },
    {
      fn: 'describeBackup', name: 'summary',
      args: [{ accounts: [1, 2, 3], transactions: [1], debts: [], goals: [1, 2], categories: [], budgetLimits: [], config: [] }],
    },
  ],

  format: [
    { fn: 'formatNumber', name: 'integer thousands', args: [5000] },
    { fn: 'formatNumber', name: 'millions', args: [1234567] },
    { fn: 'formatNumber', name: 'fraction', args: [12.5] },
    { fn: 'formatNumber', name: 'fraction 2 digits', args: [1234.56] },
    { fn: 'formatNumber', name: 'negative', args: [-2500] },
    { fn: 'formatNumber', name: 'zero', args: [0] },
    { fn: 'formatNumber', name: 'tiny fraction rounds', args: [10.001] },
    { fn: 'formatMoney', name: 'KZT default', args: [150000] },
    { fn: 'formatMoney', name: 'USD', args: [12.5, 'USD'] },
    { fn: 'formatMoney', name: 'EUR', args: [1000, 'EUR'] },
    { fn: 'formatMoney', name: 'RUB', args: [99.99, 'RUB'] },
    { fn: 'currencySymbol', name: 'KZT', args: ['KZT'] },
    { fn: 'currencySymbol', name: 'USD', args: ['USD'] },
    { fn: 'currencySymbol', name: 'EUR', args: ['EUR'] },
    { fn: 'currencySymbol', name: 'RUB', args: ['RUB'] },
    ...[0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111, 1000].map((n) => ({
      fn: 'pluralRu', name: `${n}`, args: [n, ['день', 'дня', 'дней']],
    })),
    { fn: 'formatShare', name: 'regular', args: [0.374] },
    { fn: 'formatShare', name: 'tiny', args: [0.004] },
    { fn: 'formatShare', name: 'half percent', args: [0.005] },
    { fn: 'formatShare', name: 'zero', args: [0] },
    { fn: 'formatShare', name: 'full', args: [1] },
  ],

  savedMessage: [
    { fn: 'savedMessage', name: 'expense', args: [{ type: 'expense', amount: 5000 }, 'KZT', false] },
    { fn: 'savedMessage', name: 'income USD', args: [{ type: 'income', amount: 12.5 }, 'USD', false] },
    { fn: 'savedMessage', name: 'transfer', args: [{ type: 'transfer', amount: 1000 }, 'KZT', false] },
    { fn: 'savedMessage', name: 'edited', args: [{ type: 'expense', amount: 1 }, 'KZT', true] },
  ],
}
