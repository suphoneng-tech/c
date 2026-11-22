import {
  DailyTransaction,
  DaySummary,
  FinancialState,
  MonthForecast,
  MonthlyExpenseItem,
  SalaryConfig,
  SalaryRates,
} from '../types/finance';
import {
  addMonths,
  bangkokDateToUtcMs,
  formatDateKey,
  formatMonthKey,
  getBangkokDateKey,
  getDayOfWeekFromDateKey,
  getDaysInMonth,
  pad2,
  parseBangkokDateTimeToUtcMs,
  parseDateKey,
  THAI_MONTHS_SHORT,
  toBangkokParts,
} from './bangkokTime';

export function roundCurrency(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatTHB(value: number, decimals = 2, includeSymbol = true): string {
  const safe = Number.isFinite(value) ? value : 0;
  const isNeg = safe < 0;
  const absVal = Math.abs(safe);
  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const prefix = includeSymbol ? '฿' : '';
  return isNeg ? `-${prefix}${formatted}` : `${prefix}${formatted}`;
}

export function formatCompactTHB(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}฿${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}฿${(abs / 1_000).toFixed(0)}k`;
  return `${sign}฿${abs.toFixed(0)}`;
}

export function countWorkDaysInMonth(year: number, month: number, workDaysOfWeek: number[]): number {
  const days = getDaysInMonth(year, month);
  const allowed = new Set(workDaysOfWeek);
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    if (allowed.has(dow)) count++;
  }
  return Math.max(1, count);
}

export function getWorkMinutesPerDay(config: SalaryConfig): number {
  const startMin = config.workStartHour * 60 + config.workStartMinute;
  const endMin = config.workEndHour * 60 + config.workEndMinute;
  return Math.max(1, endMin - startMin);
}

export function computeSalaryRates(config: SalaryConfig, year: number, month: number): SalaryRates {
  const daysInMonth = getDaysInMonth(year, month);
  const salary = Math.max(0, config.monthlySalary);

  if (config.calculationMode === 'workdays') {
    const workDays = countWorkDaysInMonth(year, month, config.workDaysOfWeek);
    const workMinutesPerDay = getWorkMinutesPerDay(config);
    const workHoursPerDay = workMinutesPerDay / 60;
    const dailyRate = salary / workDays;
    const hourlyRate = dailyRate / workHoursPerDay;
    const minuteRate = hourlyRate / 60;
    const secondRate = minuteRate / 60;
    return {
      daysInMonth,
      activeUnits: workDays,
      dailyRate,
      hourlyRate,
      minuteRate,
      secondRate,
    };
  }

  const dailyRate = salary / daysInMonth;
  const hourlyRate = dailyRate / 24;
  const minuteRate = hourlyRate / 60;
  const secondRate = minuteRate / 60;
  return {
    daysInMonth,
    activeUnits: daysInMonth,
    dailyRate,
    hourlyRate,
    minuteRate,
    secondRate,
  };
}

/**
 * Exact salary accrued within [startUtcMs, endUtcMs], clipped against config.startDate.
 * Uses exact time-interval intersection so timer pauses or app restarts never cause drift.
 */
export function computeAccruedSalaryInInterval(
  config: SalaryConfig,
  startUtcMs: number,
  endUtcMs: number
): number {
  if (config.monthlySalary <= 0) return 0;

  const { year: sy, month: sm, day: sd } = parseDateKey(config.startDate);
  const salaryStartUtcMs = bangkokDateToUtcMs(sy, sm, sd, 0, 0, 0, 0);

  const effectiveStart = Math.max(startUtcMs, salaryStartUtcMs);
  if (endUtcMs <= effectiveStart) return 0;

  const startParts = toBangkokParts(effectiveStart);
  const endParts = toBangkokParts(endUtcMs);

  let cursorYear = startParts.year;
  let cursorMonth = startParts.month;
  let totalEarned = 0;

  while (
    cursorYear < endParts.year ||
    (cursorYear === endParts.year && cursorMonth <= endParts.month)
  ) {
    const daysInMonth = getDaysInMonth(cursorYear, cursorMonth);
    const monthStartMs = bangkokDateToUtcMs(cursorYear, cursorMonth, 1, 0, 0, 0, 0);
    const nextM = addMonths(cursorYear, cursorMonth, 1);
    const monthEndMs = bangkokDateToUtcMs(nextM.year, nextM.month, 1, 0, 0, 0, 0);

    const segStart = Math.max(effectiveStart, monthStartMs);
    const segEnd = Math.min(endUtcMs, monthEndMs);

    if (segEnd > segStart) {
      if (config.calculationMode === 'calendar') {
        const totalMonthMs = daysInMonth * 86_400_000;
        totalEarned += config.monthlySalary * ((segEnd - segStart) / totalMonthMs);
      } else {
        const workDaysInMonth = countWorkDaysInMonth(cursorYear, cursorMonth, config.workDaysOfWeek);
        const workMsPerDay = getWorkMinutesPerDay(config) * 60_000;
        const totalWorkMsInMonth = workDaysInMonth * workMsPerDay;
        const allowed = new Set(config.workDaysOfWeek);

        const segStartDay = toBangkokParts(segStart).day;
        const segEndParts = toBangkokParts(segEnd - 1);
        const segEndDay =
          segEndParts.year === cursorYear && segEndParts.month === cursorMonth
            ? segEndParts.day
            : daysInMonth;

        let activeWorkMs = 0;
        for (let d = segStartDay; d <= segEndDay; d++) {
          const dow = new Date(Date.UTC(cursorYear, cursorMonth - 1, d)).getUTCDay();
          if (!allowed.has(dow)) continue;
          const workDayStartMs = bangkokDateToUtcMs(
            cursorYear,
            cursorMonth,
            d,
            config.workStartHour,
            config.workStartMinute,
            0,
            0
          );
          const workDayEndMs = bangkokDateToUtcMs(
            cursorYear,
            cursorMonth,
            d,
            config.workEndHour,
            config.workEndMinute,
            0,
            0
          );
          if (workDayEndMs > workDayStartMs) {
            const overlapStart = Math.max(segStart, workDayStartMs);
            const overlapEnd = Math.min(segEnd, workDayEndMs);
            if (overlapEnd > overlapStart) {
              activeWorkMs += overlapEnd - overlapStart;
            }
          }
        }
        totalEarned += config.monthlySalary * (activeWorkMs / totalWorkMsInMonth);
      }
    }

    cursorYear = nextM.year;
    cursorMonth = nextM.month;
  }

  return totalEarned;
}

export function getEffectiveMonthExpenses(
  state: FinancialState,
  year: number,
  month: number
): MonthlyExpenseItem[] {
  const key = formatMonthKey(year, month);
  const existing = state.monthlyExpensesByMonth[key];
  if (existing && existing.length > 0) {
    return existing;
  }
  return state.recurringExpenseTemplates
    .filter((item) => item.isRecurring)
    .map((item) => ({
      ...item,
      isPaid: false,
      paidDate: undefined,
      paidAtUtcMs: undefined,
    }));
}

export function getTotalBankSavings(state: FinancialState): number {
  return roundCurrency(
    state.bankAccounts.reduce((sum, acc) => sum + (Number.isFinite(acc.balance) ? acc.balance : 0), 0)
  );
}

export function getOpeningBalance(state: FinancialState): number {
  return state.useBankTotalAsOpening
    ? getTotalBankSavings(state)
    : roundCurrency(state.customOpeningBalance);
}

function getPaydayUtcMsForMonth(config: SalaryConfig, year: number, month: number): number {
  const days = getDaysInMonth(year, month);
  const clampedDay = Math.min(Math.max(1, config.paydayOfMonth), days);
  return bangkokDateToUtcMs(year, month, clampedDay, 0, 0, 0, 0);
}

/**
 * Computes extra monthly income + daily income transactions that occurred within (startUtcMs, endUtcMs].
 */
export function computeExtraAndTxIncomeInInterval(
  state: FinancialState,
  startUtcMs: number,
  endUtcMs: number
): number {
  if (endUtcMs <= startUtcMs) return 0;

  const { salaryConfig, transactions } = state;
  const { year: sy, month: sm, day: sd } = parseDateKey(salaryConfig.startDate);
  const salaryStartUtcMs = bangkokDateToUtcMs(sy, sm, sd, 0, 0, 0, 0);
  const effectiveStart = Math.max(startUtcMs, salaryStartUtcMs);

  let sum = 0;

  // 1. Extra income credited on payday of each month intersecting (effectiveStart, endUtcMs]
  if (salaryConfig.extraIncome > 0 && endUtcMs > effectiveStart) {
    const startParts = toBangkokParts(effectiveStart);
    const endParts = toBangkokParts(endUtcMs);
    let cy = startParts.year;
    let cm = startParts.month;
    while (cy < endParts.year || (cy === endParts.year && cm <= endParts.month)) {
      const paydayMs = getPaydayUtcMsForMonth(salaryConfig, cy, cm);
      if (paydayMs >= effectiveStart && paydayMs <= endUtcMs) {
        sum += salaryConfig.extraIncome;
      }
      const next = addMonths(cy, cm, 1);
      cy = next.year;
      cm = next.month;
    }
  }

  // 2. User-logged income transactions
  for (const tx of transactions) {
    if (tx.type !== 'income') continue;
    const { year, month, day } = parseDateKey(tx.date);
    const txDayStartMs = bangkokDateToUtcMs(year, month, day, 0, 0, 0, 0);
    const txDayEndMs = bangkokDateToUtcMs(year, month, day, 23, 59, 59, 999);
    const effectiveTxMs = tx.createdAtUtcMs ?? txDayEndMs;
    if (txDayStartMs <= endUtcMs && txDayEndMs >= startUtcMs && effectiveTxMs >= startUtcMs) {
      sum += tx.amount;
    }
  }

  return sum;
}

/**
 * Computes incurred expenses after openingTimestamp up to nowUtcMs:
 * - Paid items from the 10 monthly expenses (occurring after startUtcMs)
 * - Ad-hoc daily expense transactions occurring in [startUtcMs, endUtcMs]
 */
export function computeIncurredExpensesInInterval(
  state: FinancialState,
  startUtcMs: number,
  endUtcMs: number
): number {
  if (endUtcMs <= startUtcMs) return 0;

  const startDateKey = getBangkokDateKey(startUtcMs);
  const endDateKey = getBangkokDateKey(endUtcMs);

  let total = 0;

  // 1. Paid monthly expense items across months in range
  const startParts = toBangkokParts(startUtcMs);
  const endParts = toBangkokParts(endUtcMs);
  let cy = startParts.year;
  let cm = startParts.month;

  while (cy < endParts.year || (cy === endParts.year && cm <= endParts.month)) {
    const items = getEffectiveMonthExpenses(state, cy, cm);
    const days = getDaysInMonth(cy, cm);
    for (const item of items) {
      if (!item.isPaid) continue;
      const effectiveDateKey =
        item.paidDate || formatDateKey(cy, cm, Math.min(Math.max(1, item.dueDay), days));
      const { year, month, day } = parseDateKey(effectiveDateKey);
      const itemEndMs = bangkokDateToUtcMs(year, month, day, 23, 59, 59, 999);
      const effectiveItemMs = item.paidAtUtcMs ?? itemEndMs;
      if (effectiveDateKey >= startDateKey && effectiveDateKey <= endDateKey && effectiveItemMs >= startUtcMs) {
        total += item.plannedAmount;
      }
    }
    const next = addMonths(cy, cm, 1);
    cy = next.year;
    cm = next.month;
  }

  // 2. Ad-hoc daily expense transactions
  for (const tx of state.transactions) {
    if (tx.type !== 'expense') continue;
    const { year, month, day } = parseDateKey(tx.date);
    const txDayEndMs = bangkokDateToUtcMs(year, month, day, 23, 59, 59, 999);
    const effectiveTxMs = tx.createdAtUtcMs ?? txDayEndMs;
    if (tx.date >= startDateKey && tx.date <= endDateKey && effectiveTxMs >= startUtcMs) {
      total += tx.amount;
    }
  }

  return roundCurrency(total);
}

export function computeTodayIncome(state: FinancialState, nowUtcMs: number): number {
  const parts = toBangkokParts(nowUtcMs);
  const todayStartMs = bangkokDateToUtcMs(parts.year, parts.month, parts.day, 0, 0, 0, 0);
  const todayKey = formatDateKey(parts.year, parts.month, parts.day);

  const salaryAccrued = computeAccruedSalaryInInterval(state.salaryConfig, todayStartMs, nowUtcMs);

  let extra = 0;
  const days = getDaysInMonth(parts.year, parts.month);
  const clampedPayday = Math.min(Math.max(1, state.salaryConfig.paydayOfMonth), days);
  const { year: sy, month: sm, day: sd } = parseDateKey(state.salaryConfig.startDate);
  const salaryStartKey = formatDateKey(sy, sm, sd);
  if (parts.day === clampedPayday && todayKey >= salaryStartKey) {
    extra += state.salaryConfig.extraIncome;
  }

  const txIncome = state.transactions
    .filter((tx) => tx.type === 'income' && tx.date === todayKey)
    .reduce((sum, tx) => sum + tx.amount, 0);

  return salaryAccrued + extra + txIncome;
}

export function computeMonthIncomeToNow(
  state: FinancialState,
  year: number,
  month: number,
  nowUtcMs: number
): number {
  const monthStartMs = bangkokDateToUtcMs(year, month, 1, 0, 0, 0, 0);
  const next = addMonths(year, month, 1);
  const monthEndMs = bangkokDateToUtcMs(next.year, next.month, 1, 0, 0, 0, 0);

  if (nowUtcMs <= monthStartMs) return 0;
  const effectiveEnd = Math.min(nowUtcMs, monthEndMs);

  const salaryAccrued = computeAccruedSalaryInInterval(state.salaryConfig, monthStartMs, effectiveEnd);

  let extra = 0;
  const paydayMs = getPaydayUtcMsForMonth(state.salaryConfig, year, month);
  const { year: sy, month: sm, day: sd } = parseDateKey(state.salaryConfig.startDate);
  const salaryStartMs = bangkokDateToUtcMs(sy, sm, sd, 0, 0, 0, 0);
  if (paydayMs >= salaryStartMs && paydayMs <= effectiveEnd && state.salaryConfig.extraIncome > 0) {
    extra += state.salaryConfig.extraIncome;
  }

  const monthPrefix = formatMonthKey(year, month);
  const todayKey = getBangkokDateKey(nowUtcMs);
  const txIncome = state.transactions
    .filter((tx) => tx.type === 'income' && tx.date.startsWith(monthPrefix) && tx.date <= todayKey)
    .reduce((sum, tx) => sum + tx.amount, 0);

  return salaryAccrued + extra + txIncome;
}

export function computeRealTimeSavings(
  state: FinancialState,
  nowUtcMs: number
): {
  openingBalance: number;
  incomeSinceOpening: number;
  expensesSinceOpening: number;
  projectedRealTimeSavings: number;
} {
  const openingBalance = getOpeningBalance(state);
  const openingUtcMs = parseBangkokDateTimeToUtcMs(state.openingBalanceTimestamp);

  const salaryIncome = computeAccruedSalaryInInterval(state.salaryConfig, openingUtcMs, nowUtcMs);
  const extraAndTxIncome = computeExtraAndTxIncomeInInterval(state, openingUtcMs, nowUtcMs);
  const incomeSinceOpening = salaryIncome + extraAndTxIncome;
  const expensesSinceOpening = computeIncurredExpensesInInterval(state, openingUtcMs, nowUtcMs);

  return {
    openingBalance,
    incomeSinceOpening,
    expensesSinceOpening,
    projectedRealTimeSavings: openingBalance + incomeSinceOpening - expensesSinceOpening,
  };
}

export function computeDaySummary(
  state: FinancialState,
  dateKey: string,
  nowUtcMs: number
): DaySummary {
  const { year, month, day } = parseDateKey(dateKey);
  const daysInMonth = getDaysInMonth(year, month);
  const dayStartMs = bangkokDateToUtcMs(year, month, day, 0, 0, 0, 0);
  const dayEndMs = bangkokDateToUtcMs(year, month, day, 23, 59, 59, 999) + 1;
  const todayKey = getBangkokDateKey(nowUtcMs);

  // Salary income for this day: real-time if today, full day if past, projected full day if future (but let's compute actual earned vs daily potential cleanly)
  let salaryIncome = 0;
  if (dateKey < todayKey) {
    salaryIncome = computeAccruedSalaryInInterval(state.salaryConfig, dayStartMs, dayEndMs);
  } else if (dateKey === todayKey) {
    salaryIncome = computeAccruedSalaryInInterval(state.salaryConfig, dayStartMs, Math.min(nowUtcMs, dayEndMs));
  } else {
    // Future date: show projected daily salary for planning visibility if >= startDate
    salaryIncome = computeAccruedSalaryInInterval(state.salaryConfig, dayStartMs, dayEndMs);
  }

  const clampedPayday = Math.min(Math.max(1, state.salaryConfig.paydayOfMonth), daysInMonth);
  const isPayday = day === clampedPayday;
  const extraIncome =
    isPayday && dateKey >= state.salaryConfig.startDate ? state.salaryConfig.extraIncome : 0;

  const dailyTransactions = state.transactions.filter((tx) => tx.date === dateKey);
  const transactionIncome = roundCurrency(
    dailyTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  );
  const transactionExpenses = roundCurrency(
    dailyTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );

  const monthItems = getEffectiveMonthExpenses(state, year, month);
  const monthlyExpenseItems = monthItems.filter((item) => {
    const itemDateKey =
      item.isPaid && item.paidDate
        ? item.paidDate
        : formatDateKey(year, month, Math.min(Math.max(1, item.dueDay), daysInMonth));
    return itemDateKey === dateKey;
  });

  const scheduledExpenses = roundCurrency(
    monthlyExpenseItems.reduce((s, item) => s + item.plannedAmount, 0)
  );

  const totalIncome = roundCurrency(salaryIncome + extraIncome + transactionIncome);
  const totalExpenses = roundCurrency(scheduledExpenses + transactionExpenses);
  const net = roundCurrency(totalIncome - totalExpenses);
  const hasItems = dailyTransactions.length > 0 || monthlyExpenseItems.length > 0 || (isPayday && extraIncome > 0);

  return {
    dateKey,
    salaryIncome: roundCurrency(salaryIncome),
    extraIncome: roundCurrency(extraIncome),
    transactionIncome,
    totalIncome,
    scheduledExpenses,
    transactionExpenses,
    totalExpenses,
    net,
    monthlyExpenseItems,
    dailyTransactions,
    isPayday,
    hasItems,
  };
}

export function computeMonthForecast(
  state: FinancialState,
  year: number,
  month: number
): MonthForecast {
  const daysInMonth = getDaysInMonth(year, month);
  const monthStartMs = bangkokDateToUtcMs(year, month, 1, 0, 0, 0, 0);
  const next = addMonths(year, month, 1);
  const monthEndMs = bangkokDateToUtcMs(next.year, next.month, 1, 0, 0, 0, 0);
  const monthKey = formatMonthKey(year, month);

  const openingBalance = getOpeningBalance(state);
  const openingUtcMs = parseBangkokDateTimeToUtcMs(state.openingBalanceTimestamp);

  // Full month income (for reporting total income of the selected month)
  const salaryMonthlyIncome = roundCurrency(
    computeAccruedSalaryInInterval(state.salaryConfig, monthStartMs, monthEndMs)
  );
  const paydayMs = getPaydayUtcMsForMonth(state.salaryConfig, year, month);
  const { year: sy, month: sm, day: sd } = parseDateKey(state.salaryConfig.startDate);
  const salaryStartMs = bangkokDateToUtcMs(sy, sm, sd, 0, 0, 0, 0);
  const extraMonthlyIncome =
    paydayMs >= salaryStartMs && state.salaryConfig.extraIncome > 0
      ? roundCurrency(state.salaryConfig.extraIncome)
      : 0;
  const transactionMonthlyIncome = roundCurrency(
    state.transactions
      .filter((tx) => tx.type === 'income' && tx.date.startsWith(monthKey))
      .reduce((s, t) => s + t.amount, 0)
  );
  const totalMonthlyIncome = roundCurrency(
    salaryMonthlyIncome + extraMonthlyIncome + transactionMonthlyIncome
  );

  // Expenses for the selected month (10 items + ad-hoc daily expenses, no double-counting)
  const items = getEffectiveMonthExpenses(state, year, month);
  const paidMonthlyItems = roundCurrency(
    items.filter((i) => i.isPaid).reduce((s, i) => s + i.plannedAmount, 0)
  );
  const unpaidMonthlyItems = roundCurrency(
    items.filter((i) => !i.isPaid).reduce((s, i) => s + i.plannedAmount, 0)
  );
  const dailyExpenses = roundCurrency(
    state.transactions
      .filter((tx) => tx.type === 'expense' && tx.date.startsWith(monthKey))
      .reduce((s, t) => s + t.amount, 0)
  );

  const paidExpenses = roundCurrency(paidMonthlyItems + dailyExpenses);
  const unpaidExpenses = unpaidMonthlyItems;
  const totalMonthlyExpenses = roundCurrency(paidExpenses + unpaidExpenses);

  const netCashFlow = roundCurrency(totalMonthlyIncome - totalMonthlyExpenses);

  // Projected End-of-Month Cash Balance:
  // If openingTimestamp is inside or before this month, only count incremental income & expenses after openingTimestamp up to monthEndMs!
  let projectedEndBalance = openingBalance;
  if (monthEndMs > openingUtcMs) {
    const futureIncomeFromOpening =
      computeAccruedSalaryInInterval(state.salaryConfig, openingUtcMs, monthEndMs) +
      computeExtraAndTxIncomeInIntervalForEnd(state, openingUtcMs, monthEndMs);

    // Total planned/incurred expenses from openingUtcMs through monthEndMs
    const openingDateKey = getBangkokDateKey(openingUtcMs);
    const monthEndDateKey = formatDateKey(year, month, daysInMonth);

    // Sum remaining expenses across months intersecting [openingUtcMs, monthEndMs]
    let totalExpensesFromOpening = 0;
    const oParts = toBangkokParts(openingUtcMs);
    let cy = oParts.year;
    let cm = oParts.month;
    while (cy < year || (cy === year && cm <= month)) {
      const mKey = formatMonthKey(cy, cm);
      const mItems = getEffectiveMonthExpenses(state, cy, cm);
      const mDays = getDaysInMonth(cy, cm);
      for (const item of mItems) {
        if (item.isPaid) {
          const paidKey =
            item.paidDate || formatDateKey(cy, cm, Math.min(Math.max(1, item.dueDay), mDays));
          const { year: py, month: pm, day: pd } = parseDateKey(paidKey);
          const itemEndMs = bangkokDateToUtcMs(py, pm, pd, 23, 59, 59, 999);
          const effectiveItemMs = item.paidAtUtcMs ?? itemEndMs;
          if (paidKey >= openingDateKey && paidKey <= monthEndDateKey && effectiveItemMs >= openingUtcMs) {
            totalExpensesFromOpening += item.plannedAmount;
          }
        } else {
          // Unpaid planned item in current/future month up to target month: include in end-of-month forecast!
          const dueKey = formatDateKey(cy, cm, Math.min(Math.max(1, item.dueDay), mDays));
          if (dueKey >= openingDateKey || (cy === year && cm === month)) {
            totalExpensesFromOpening += item.plannedAmount;
          }
        }
      }
      for (const tx of state.transactions) {
        if (tx.type !== 'expense' || !tx.date.startsWith(mKey)) continue;
        const { year: ty, month: tm, day: td } = parseDateKey(tx.date);
        const txEndMs = bangkokDateToUtcMs(ty, tm, td, 23, 59, 59, 999);
        const effectiveTxMs = tx.createdAtUtcMs ?? txEndMs;
        if (tx.date >= openingDateKey && tx.date <= monthEndDateKey && effectiveTxMs >= openingUtcMs) {
          totalExpensesFromOpening += tx.amount;
        }
      }
      const nxt = addMonths(cy, cm, 1);
      cy = nxt.year;
      cm = nxt.month;
    }

    projectedEndBalance = roundCurrency(
      openingBalance + futureIncomeFromOpening - totalExpensesFromOpening
    );
  }

  const deltaFromStart = roundCurrency(projectedEndBalance - openingBalance);
  const deltaPercent = openingBalance > 0 ? roundCurrency((deltaFromStart / openingBalance) * 100) : 0;
  const expenseToIncomeRatio =
    totalMonthlyIncome > 0 ? roundCurrency((totalMonthlyExpenses / totalMonthlyIncome) * 100, 1) : 0;
  const averageDailyExpense = roundCurrency(totalMonthlyExpenses / daysInMonth);

  return {
    year,
    month,
    openingBalance,
    totalMonthlyIncome,
    salaryMonthlyIncome,
    extraMonthlyIncome,
    transactionMonthlyIncome,
    totalMonthlyExpenses,
    paidExpenses,
    unpaidExpenses,
    dailyExpenses,
    netCashFlow,
    projectedEndBalance,
    deltaFromStart,
    deltaPercent,
    expenseToIncomeRatio,
    averageDailyExpense,
  };
}

function computeExtraAndTxIncomeInIntervalForEnd(
  state: FinancialState,
  startUtcMs: number,
  endUtcMs: number
): number {
  // Same as computeExtraAndTxIncomeInInterval, including future income transactions up to endUtcMs
  if (endUtcMs <= startUtcMs) return 0;
  const { salaryConfig, transactions } = state;
  const { year: sy, month: sm, day: sd } = parseDateKey(salaryConfig.startDate);
  const salaryStartUtcMs = bangkokDateToUtcMs(sy, sm, sd, 0, 0, 0, 0);
  const effectiveStart = Math.max(startUtcMs, salaryStartUtcMs);

  let sum = 0;
  if (salaryConfig.extraIncome > 0 && endUtcMs > effectiveStart) {
    const startParts = toBangkokParts(effectiveStart);
    const endParts = toBangkokParts(endUtcMs - 1);
    let cy = startParts.year;
    let cm = startParts.month;
    while (cy < endParts.year || (cy === endParts.year && cm <= endParts.month)) {
      const paydayMs = getPaydayUtcMsForMonth(salaryConfig, cy, cm);
      if (paydayMs >= effectiveStart && paydayMs < endUtcMs) {
        sum += salaryConfig.extraIncome;
      }
      const next = addMonths(cy, cm, 1);
      cy = next.year;
      cm = next.month;
    }
  }

  for (const tx of transactions) {
    if (tx.type !== 'income') continue;
    const { year, month, day } = parseDateKey(tx.date);
    const txDayStartMs = bangkokDateToUtcMs(year, month, day, 0, 0, 0, 0);
    const txDayEndMs = bangkokDateToUtcMs(year, month, day, 23, 59, 59, 999);
    const effectiveTxMs = tx.createdAtUtcMs ?? txDayEndMs;
    if (txDayStartMs < endUtcMs && txDayEndMs >= startUtcMs && effectiveTxMs >= startUtcMs) {
      sum += tx.amount;
    }
  }
  return sum;
}

export interface DailyChartPoint {
  day: number;
  dateLabel: string;
  dateKey: string;
  actualIncome: number | null;
  forecastIncome: number | null;
  actualExpense: number | null;
  forecastExpense: number | null;
}

export function buildDailyChartSeries(
  state: FinancialState,
  year: number,
  month: number,
  nowUtcMs: number
): DailyChartPoint[] {
  const daysInMonth = getDaysInMonth(year, month);
  const monthStartMs = bangkokDateToUtcMs(year, month, 1, 0, 0, 0, 0);
  const todayParts = toBangkokParts(nowUtcMs);
  const monthKey = formatMonthKey(year, month);
  const todayMonthKey = formatMonthKey(todayParts.year, todayParts.month);
  const isCurrentMonth = monthKey === todayMonthKey;
  const isPastMonth = monthKey < todayMonthKey;

  const monthItems = getEffectiveMonthExpenses(state, year, month);
  const points: DailyChartPoint[] = [];

  let cumForecastExpense = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(year, month, d);
    const dayEndMs = bangkokDateToUtcMs(year, month, d, 23, 59, 59, 999) + 1;

    const isActualDay = isPastMonth || (isCurrentMonth && d <= todayParts.day);
    const isToday = isCurrentMonth && d === todayParts.day;

    // Cumulative income up to end of day d (or up to nowUtcMs if today)
    const incomeEndMs = isToday ? Math.min(nowUtcMs, dayEndMs) : dayEndMs;
    const cumIncome = roundCurrency(
      computeAccruedSalaryInInterval(state.salaryConfig, monthStartMs, incomeEndMs) +
        computeExtraAndTxIncomeInIntervalForEnd(state, monthStartMs, incomeEndMs)
    );

    // Daily expenses on day d (monthly items due/paid on d + daily expense transactions on d)
    const itemsOnDay = monthItems.filter((item) => {
      const effectiveKey =
        item.isPaid && item.paidDate
          ? item.paidDate
          : formatDateKey(year, month, Math.min(Math.max(1, item.dueDay), daysInMonth));
      return effectiveKey === dateKey;
    });
    const txExpensesOnDay = state.transactions
      .filter((t) => t.type === 'expense' && t.date === dateKey)
      .reduce((s, t) => s + t.amount, 0);
    const dayExpenseTotal =
      itemsOnDay.reduce((s, i) => s + i.plannedAmount, 0) + txExpensesOnDay;
    cumForecastExpense = roundCurrency(cumForecastExpense + dayExpenseTotal);

    const actualIncome = isActualDay ? cumIncome : null;
    const forecastIncome = !isActualDay || isToday ? cumIncome : null;

    const actualExpense = isActualDay ? cumForecastExpense : null;
    const forecastExpense = !isActualDay || isToday ? cumForecastExpense : null;

    points.push({
      day: d,
      dateLabel: `${pad2(d)}/${pad2(month)}`,
      dateKey,
      actualIncome,
      forecastIncome,
      actualExpense,
      forecastExpense,
    });
  }

  return points;
}

export interface MultiMonthPoint {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export function buildMultiMonthSeries(
  state: FinancialState,
  endYear: number,
  endMonth: number,
  count: 3 | 6 | 12
): MultiMonthPoint[] {
  const result: MultiMonthPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const target = addMonths(endYear, endMonth, -i);
    const forecast = computeMonthForecast(state, target.year, target.month);
    const shortYear = String((target.year + 543) % 100);
    result.push({
      monthKey: formatMonthKey(target.year, target.month),
      label: `${THAI_MONTHS_SHORT[target.month - 1]} ${shortYear}`,
      income: forecast.totalMonthlyIncome,
      expense: forecast.totalMonthlyExpenses,
      net: forecast.netCashFlow,
    });
  }
  return result;
}

export function isWeekdayWorkday(dateKey: string, config: SalaryConfig): boolean {
  if (config.calculationMode !== 'workdays') return true;
  const dow = getDayOfWeekFromDateKey(dateKey);
  return config.workDaysOfWeek.includes(dow);
}
