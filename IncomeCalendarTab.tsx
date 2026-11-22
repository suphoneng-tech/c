import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { DailyTransaction } from '../types/finance';
import {
  addMonths,
  formatBangkokClockString,
  formatDateKey,
  formatThaiFullDate,
  getBangkokDateKey,
  getDaysInMonth,
  getFirstDayOfWeekInMonth,
  pad2,
  THAI_MONTHS,
  THAI_WEEKDAYS_SHORT,
  toBangkokParts,
} from '../utils/bangkokTime';
import {
  computeDaySummary,
  computeMonthForecast,
  computeMonthIncomeToNow,
  computeSalaryRates,
  computeTodayIncome,
  formatTHB,
  getEffectiveMonthExpenses,
  isWeekdayWorkday,
} from '../utils/financeEngine';
import { TransactionModal } from './TransactionModal';

export const IncomeCalendarTab: React.FC = () => {
  const {
    state,
    nowUtcMs,
    selectedYear,
    selectedMonth,
    selectedDateKey,
    setSelectedMonthYear,
    setSelectedDateKey,
    jumpToToday,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateMonthExpenseItem,
  } = useFinancial();

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<DailyTransaction | null>(null);

  const bangkokNow = useMemo(() => toBangkokParts(nowUtcMs), [nowUtcMs]);
  const todayKey = getBangkokDateKey(nowUtcMs);
  const bangkokClock = formatBangkokClockString(nowUtcMs);

  // Real-time counters (always computed from Date.now() vs Bangkok midnight / month start)
  const todayIncomeLive = useMemo(
    () => computeTodayIncome(state, nowUtcMs),
    [state, nowUtcMs]
  );
  const currentMonthIncomeLive = useMemo(
    () => computeMonthIncomeToNow(state, bangkokNow.year, bangkokNow.month, nowUtcMs),
    [state, bangkokNow.year, bangkokNow.month, nowUtcMs]
  );

  const currentMonthForecast = useMemo(
    () => computeMonthForecast(state, bangkokNow.year, bangkokNow.month),
    [state, bangkokNow.year, bangkokNow.month]
  );

  // Rates for the viewed calendar month (so changing month reflects 28/29/30/31 days accurately)
  const viewedRates = useMemo(
    () => computeSalaryRates(state.salaryConfig, selectedYear, selectedMonth),
    [state.salaryConfig, selectedYear, selectedMonth]
  );

  const monthlyTarget = Math.max(1, currentMonthForecast.totalMonthlyIncome || state.salaryConfig.monthlySalary);
  const monthProgressPct = Math.min(100, Math.max(0, (currentMonthIncomeLive / monthlyTarget) * 100));

  // Build calendar grid cells for selectedYear / selectedMonth
  const daysInViewedMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDow = getFirstDayOfWeekInMonth(selectedYear, selectedMonth);

  // Precompute indicator dots per day in viewed month
  const dayMarkers = useMemo(() => {
    const map: Record<string, { hasIncome: boolean; hasExpense: boolean }> = {};
    const monthItems = getEffectiveMonthExpenses(state, selectedYear, selectedMonth);
    const clampedPayday = Math.min(Math.max(1, state.salaryConfig.paydayOfMonth), daysInViewedMonth);

    for (let d = 1; d <= daysInViewedMonth; d++) {
      const k = formatDateKey(selectedYear, selectedMonth, d);
      map[k] = {
        hasIncome: d === clampedPayday && k >= state.salaryConfig.startDate,
        hasExpense: false,
      };
    }

    for (const item of monthItems) {
      const targetKey =
        item.isPaid && item.paidDate
          ? item.paidDate
          : formatDateKey(
              selectedYear,
              selectedMonth,
              Math.min(Math.max(1, item.dueDay), daysInViewedMonth)
            );
      if (map[targetKey]) map[targetKey].hasExpense = true;
    }

    for (const tx of state.transactions) {
      if (map[tx.date]) {
        if (tx.type === 'income') map[tx.date].hasIncome = true;
        else map[tx.date].hasExpense = true;
      }
    }

    return map;
  }, [state, selectedYear, selectedMonth, daysInViewedMonth]);

  const selectedDaySummary = useMemo(
    () => computeDaySummary(state, selectedDateKey, nowUtcMs),
    [state, selectedDateKey, nowUtcMs]
  );

  const handlePrevMonth = () => {
    const prev = addMonths(selectedYear, selectedMonth, -1);
    setSelectedMonthYear(prev.year, prev.month);
  };

  const handleNextMonth = () => {
    const next = addMonths(selectedYear, selectedMonth, 1);
    setSelectedMonthYear(next.year, next.month);
  };

  const isWorkdaysOutsideHours = useMemo(() => {
    if (state.salaryConfig.calculationMode !== 'workdays') return false;
    if (!isWeekdayWorkday(todayKey, state.salaryConfig)) return true;
    const nowMin = bangkokNow.hour * 60 + bangkokNow.minute;
    const startMin = state.salaryConfig.workStartHour * 60 + state.salaryConfig.workStartMinute;
    const endMin = state.salaryConfig.workEndHour * 60 + state.salaryConfig.workEndMinute;
    return nowMin < startMin || nowMin >= endMin;
  }, [state.salaryConfig, todayKey, bangkokNow.hour, bangkokNow.minute]);

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pt-3 pb-24 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:pt-5">
      {/* LEFT COLUMN: FULL-WIDTH GOOGLE-CALENDAR-INSPIRED CALENDAR */}
      <section className="lg:col-span-7">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-2 pb-4">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums whitespace-nowrap">
                {pad2(selectedMonth)} / {selectedYear}
              </h1>
              <span className="truncate text-sm font-medium text-slate-500">
                {THAI_MONTHS[selectedMonth - 1]} {selectedYear + 543}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={jumpToToday}
                className="min-h-[40px] rounded-xl bg-blue-50 px-3 text-xs font-semibold text-[#2F80ED] transition-colors hover:bg-blue-100 active:scale-[0.97] whitespace-nowrap"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="เดือนก่อนหน้า"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 active:scale-[0.95]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="เดือนถัดไป"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 active:scale-[0.95]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 7 Weekday Column Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center">
            {THAI_WEEKDAYS_SHORT.map((label, idx) => {
              const isWeekend = idx === 0 || idx === 6;
              return (
                <div
                  key={label}
                  className={`text-xs font-semibold tracking-wide ${
                    isWeekend ? 'text-[#2F80ED]' : 'text-slate-500'
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Calendar Days Grid */}
          <div className="mt-1.5 grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDow }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-12 sm:h-14" aria-hidden="true" />
            ))}

            {Array.from({ length: daysInViewedMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateKey = formatDateKey(selectedYear, selectedMonth, day);
              const dow = (firstDow + idx) % 7;
              const isWeekend = dow === 0 || dow === 6;
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDateKey;
              const markers = dayMarkers[dateKey];

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                  aria-label={`${day} ${THAI_MONTHS[selectedMonth - 1]} ${selectedYear}`}
                  aria-pressed={isSelected}
                  className={`relative mx-auto flex h-12 w-full max-w-[52px] flex-col items-center justify-center rounded-xl transition-all active:scale-[0.95] sm:h-14 ${
                    isToday
                      ? 'bg-[#2F80ED] text-white shadow-sm'
                      : isSelected
                        ? 'bg-blue-50/80 ring-2 ring-[#2F80ED] text-slate-900'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`text-base font-semibold leading-none tabular-nums sm:text-lg ${
                      isToday
                        ? 'text-white'
                        : isWeekend
                          ? 'text-[#2F80ED]'
                          : 'text-slate-900'
                    }`}
                  >
                    {day}
                  </span>

                  {/* Subtle dot indicators when day has financial items */}
                  <span className="mt-1.5 flex h-1.5 items-center gap-1" aria-hidden="true">
                    {markers?.hasIncome && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isToday ? 'bg-emerald-300' : 'bg-emerald-500'
                        }`}
                      />
                    )}
                    {markers?.hasExpense && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isToday ? 'bg-rose-200' : 'bg-red-500'
                        }`}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Unboxed clean legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                รายรับ / วันเงินเดือนออก
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                มีรายการรายจ่าย
              </span>
            </div>
            <span className="tabular-nums">
              {daysInViewedMonth} วัน · {state.salaryConfig.calculationMode === 'workdays' ? `${viewedRates.activeUnits} วันทำงาน` : 'คิดตามวันปฏิทิน'}
            </span>
          </div>
        </div>

        {/* SELECTED DAY SUMMARY & TRANSACTIONS (shown below calendar on mobile, and below calendar on desktop) */}
        <div className="mt-4 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">รายการประจำวันที่เลือก</p>
              <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                {formatThaiFullDate(selectedDateKey)}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-[#2F80ED] px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-600 active:scale-[0.97] whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มรายการ</span>
            </button>
          </div>

          {/* 3-Column Day KPI Strip */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-emerald-50/70 p-3">
              <p className="text-[11px] font-medium text-emerald-700">รายได้ของวัน</p>
              <p className="mt-1 text-sm font-bold text-emerald-700 tabular-nums sm:text-base">
                {formatTHB(selectedDaySummary.totalIncome)}
              </p>
            </div>
            <div className="rounded-2xl bg-red-50/70 p-3">
              <p className="text-[11px] font-medium text-red-600">รายจ่ายของวัน</p>
              <p className="mt-1 text-sm font-bold text-red-600 tabular-nums sm:text-base">
                {formatTHB(selectedDaySummary.totalExpenses)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100/80 p-3">
              <p className="text-[11px] font-medium text-slate-600">เงินสุทธิของวัน</p>
              <p
                className={`mt-1 text-sm font-bold tabular-nums sm:text-base ${
                  selectedDaySummary.net >= 0 ? 'text-[#2F80ED]' : 'text-red-600'
                }`}
              >
                {selectedDaySummary.net >= 0 ? '+' : ''}
                {formatTHB(selectedDaySummary.net)}
              </p>
            </div>
          </div>

          {/* Day Breakdown List */}
          <div className="mt-4 space-y-2">
            {/* Automatic Salary Row */}
            {selectedDaySummary.salaryIncome > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">รายได้จากเงินเดือนประจำวัน</p>
                  <p className="text-[11px] text-slate-500">
                    {selectedDateKey === todayKey
                      ? 'สะสมตามเวลาจริง ณ ขณะนี้'
                      : selectedDateKey < todayKey
                        ? 'สะสมครบวันแล้ว'
                        : 'ประมาณการรายได้ประจำวัน'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-600 tabular-nums whitespace-nowrap">
                  +{formatTHB(selectedDaySummary.salaryIncome)}
                </span>
              </div>
            )}

            {/* Extra Income on Payday */}
            {selectedDaySummary.isPayday && selectedDaySummary.extraIncome > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-800">รายได้พิเศษประจำเดือน (วันเงินเดือนออก)</p>
                  <p className="text-[11px] text-emerald-600">กำหนดรับทุกวันที่ {state.salaryConfig.paydayOfMonth}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600 tabular-nums whitespace-nowrap">
                  +{formatTHB(selectedDaySummary.extraIncome)}
                </span>
              </div>
            )}

            {/* Scheduled / Paid Monthly Expense Items due on this date */}
            {selectedDaySummary.monthlyExpenseItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5"
              >
                <button
                  type="button"
                  onClick={() =>
                    updateMonthExpenseItem(selectedYear, selectedMonth, item.id, {
                      isPaid: !item.isPaid,
                      paidDate: !item.isPaid ? selectedDateKey : undefined,
                    })
                  }
                  className="flex min-h-[36px] min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  {item.isPaid ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-500">
                      รายจ่ายประจำเดือน · {item.isPaid ? 'ชำระแล้ว' : 'รอชำระ'}
                    </p>
                  </div>
                </button>
                <span className="text-sm font-semibold text-red-600 tabular-nums whitespace-nowrap">
                  -{formatTHB(item.plannedAmount)}
                </span>
              </div>
            ))}

            {/* User Daily Transactions */}
            {selectedDaySummary.dailyTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900">{tx.title}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {tx.category}
                    {tx.note ? ` · ${tx.note}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`mr-1 text-sm font-semibold tabular-nums ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatTHB(tx.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTx(tx);
                      setTxModalOpen(true);
                    }}
                    aria-label={`แก้ไข ${tx.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTransaction(tx.id)}
                    aria-label={`ลบ ${tx.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {selectedDaySummary.dailyTransactions.length === 0 &&
              selectedDaySummary.monthlyExpenseItems.length === 0 &&
              selectedDaySummary.salaryIncome === 0 && (
                <p className="py-3 text-center text-xs text-slate-400">
                  ยังไม่มีรายการรายรับ-รายจ่ายเพิ่มเติมในวันนี้
                </p>
              )}
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: REAL-TIME DIGITAL INCOME CLOCK DASHBOARD */}
      <section className="mt-4 space-y-4 lg:col-span-5 lg:mt-0">
        {/* LED Digital Financial Clock Casing */}
        <div className="rounded-3xl bg-[#0B1220] p-5 text-white shadow-lg">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="font-semibold tracking-wider text-blue-400">REAL-TIME INCOME</span>
            <span className="font-digital tabular-nums text-slate-300">
              {bangkokClock} · BKK
            </span>
          </div>

          {/* COUNTER A — Today's Accumulated Income */}
          <div className="mt-4 border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">รายได้สะสมวันนี้</span>
              {isWorkdaysOutsideHours && (
                <span className="text-[11px] text-amber-400">นอกเวลางาน (พักการสะสม)</span>
              )}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 overflow-hidden">
              <span className="text-lg font-bold text-blue-400">฿</span>
              <span className="font-digital led-blue truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {formatTHB(todayIncomeLive, 4, false)}
              </span>
            </div>
          </div>

          {/* COUNTER B — Current Month's Accumulated Income */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">
                รายได้สะสมเดือนนี้ ({pad2(bangkokNow.month)}/{bangkokNow.year})
              </span>
              <span className="font-digital text-emerald-400 tabular-nums">
                {monthProgressPct.toFixed(2)}%
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 overflow-hidden">
              <span className="text-lg font-bold text-emerald-400">฿</span>
              <span className="font-digital led-emerald truncate text-2xl font-bold tracking-tight text-emerald-300 sm:text-3xl">
                {formatTHB(currentMonthIncomeLive, 4, false)}
              </span>
            </div>

            {/* Progress bar vs monthly income */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2F80ED] to-emerald-400 transition-all duration-150"
                style={{ width: `${monthProgressPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
              <span>เป้าหมายเดือนนี้: {formatTHB(monthlyTarget)}</span>
              <span>คงเหลือ: {formatTHB(Math.max(0, monthlyTarget - currentMonthIncomeLive))}</span>
            </div>
          </div>
        </div>

        {/* REAL-TIME RATE BREAKDOWN CARD */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">อัตราการเกิดรายได้</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              เดือน {pad2(selectedMonth)}/{selectedYear} ({viewedRates.activeUnits}{' '}
              {state.salaryConfig.calculationMode === 'workdays' ? 'วันทำงาน' : 'วัน'})
            </span>
          </div>

          <dl className="mt-3 divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-600">เงินเดือนต่อเดือน</dt>
              <dd className="font-digital font-semibold text-slate-900 tabular-nums">
                {formatTHB(state.salaryConfig.monthlySalary, 2)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-600">รายได้ต่อวัน</dt>
              <dd className="font-digital font-semibold text-[#2F80ED] tabular-nums">
                {formatTHB(viewedRates.dailyRate, 2)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-600">รายได้ต่อชั่วโมง</dt>
              <dd className="font-digital font-semibold text-slate-900 tabular-nums">
                {formatTHB(viewedRates.hourlyRate, 2)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-600">รายได้ต่อนาที</dt>
              <dd className="font-digital font-semibold text-slate-900 tabular-nums">
                {formatTHB(viewedRates.minuteRate, 4)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-600">รายได้ต่อวินาที</dt>
              <dd className="font-digital font-semibold text-emerald-600 tabular-nums">
                {formatTHB(viewedRates.secondRate, 6)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <TransactionModal
        key={`${txModalOpen}-${editingTx?.id ?? 'new'}-${selectedDateKey}`}
        isOpen={txModalOpen}
        defaultDate={selectedDateKey}
        editingTx={editingTx}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={(data) => {
          if (editingTx) {
            updateTransaction(editingTx.id, data);
          } else {
            addTransaction(data);
          }
        }}
      />
    </div>
  );
};
