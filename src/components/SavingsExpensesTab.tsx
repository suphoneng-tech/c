import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { BankAccount, MonthlyExpenseItem } from '../types/finance';
import {
  addMonths,
  formatDisplayDateTime,
  getDaysInMonth,
  pad2,
  THAI_MONTHS,
} from '../utils/bangkokTime';
import {
  computeMonthForecast,
  computeRealTimeSavings,
  formatTHB,
  getEffectiveMonthExpenses,
  getTotalBankSavings,
} from '../utils/financeEngine';

export const SavingsExpensesTab: React.FC = () => {
  const {
    state,
    nowUtcMs,
    selectedYear,
    selectedMonth,
    setSelectedMonthYear,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setOpeningSettings,
    resetOpeningTimestampToNow,
    updateMonthExpenseItem,
    addMonthExpenseItem,
    deleteMonthExpenseItem,
  } = useFinancial();

  // Modals / editing states
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accName, setAccName] = useState('');
  const [accBalance, setAccBalance] = useState('');
  const [accCategory, setAccCategory] = useState<BankAccount['category']>('bank');

  const [openingModalOpen, setOpeningModalOpen] = useState(false);
  const [openingDateTimeInput, setOpeningDateTimeInput] = useState(state.openingBalanceTimestamp);
  const [useBankTotal, setUseBankTotal] = useState(state.useBankTotalAsOpening);
  const [customOpeningInput, setCustomOpeningInput] = useState(String(state.customOpeningBalance));

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyExpenseItem | null>(null);
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDueDay, setExpDueDay] = useState('1');
  const [expRecurring, setExpRecurring] = useState(true);
  const [expIsPaid, setExpIsPaid] = useState(false);

  const totalActualDeposits = useMemo(() => getTotalBankSavings(state), [state]);
  const realTimeSavings = useMemo(
    () => computeRealTimeSavings(state, nowUtcMs),
    [state, nowUtcMs]
  );

  const monthExpenses = useMemo(
    () => getEffectiveMonthExpenses(state, selectedYear, selectedMonth),
    [state, selectedYear, selectedMonth]
  );

  const forecast = useMemo(
    () => computeMonthForecast(state, selectedYear, selectedMonth),
    [state, selectedYear, selectedMonth]
  );

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  const openAddAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccBalance('');
    setAccCategory('bank');
    setAccountModalOpen(true);
  };

  const openEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccBalance(String(acc.balance));
    setAccCategory(acc.category);
    setAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = Math.max(0, parseFloat(accBalance) || 0);
    if (!accName.trim()) return;
    if (editingAccount) {
      updateBankAccount(editingAccount.id, { name: accName.trim(), balance: bal, category: accCategory });
    } else {
      addBankAccount({ name: accName.trim(), balance: bal, category: accCategory });
    }
    setAccountModalOpen(false);
  };

  const openOpeningEditor = () => {
    setOpeningDateTimeInput(state.openingBalanceTimestamp);
    setUseBankTotal(state.useBankTotalAsOpening);
    setCustomOpeningInput(String(state.customOpeningBalance));
    setOpeningModalOpen(true);
  };

  const handleSaveOpening = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized =
      openingDateTimeInput.length === 16 ? `${openingDateTimeInput}:00` : openingDateTimeInput;
    setOpeningSettings({
      openingBalanceTimestamp: normalized,
      useBankTotalAsOpening: useBankTotal,
      customOpeningBalance: Math.max(0, parseFloat(customOpeningInput) || 0),
    });
    setOpeningModalOpen(false);
  };

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpName('');
    setExpAmount('');
    setExpDueDay('25');
    setExpRecurring(true);
    setExpIsPaid(false);
    setExpenseModalOpen(true);
  };

  const openEditExpense = (item: MonthlyExpenseItem) => {
    setEditingExpense(item);
    setExpName(item.name);
    setExpAmount(String(item.plannedAmount));
    setExpDueDay(String(item.dueDay));
    setExpRecurring(item.isRecurring);
    setExpIsPaid(item.isPaid);
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.max(0, parseFloat(expAmount) || 0);
    const day = Math.min(31, Math.max(1, parseInt(expDueDay, 10) || 1));
    if (!expName.trim()) return;
    if (editingExpense) {
      updateMonthExpenseItem(selectedYear, selectedMonth, editingExpense.id, {
        name: expName.trim(),
        plannedAmount: amt,
        dueDay: day,
        isRecurring: expRecurring,
        isPaid: expIsPaid,
      });
    } else {
      addMonthExpenseItem(selectedYear, selectedMonth, {
        name: expName.trim(),
        plannedAmount: amt,
        dueDay: day,
        isRecurring: expRecurring,
        isPaid: expIsPaid,
      });
    }
    setExpenseModalOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-3 pt-3 pb-24 sm:px-6 lg:pt-5">
      {/* TOP GRID: TOTAL ACTUAL SAVINGS + REAL-TIME PROJECTED SAVINGS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 2.1 TOTAL SAVINGS DASHBOARD (Confirmed Actual Bank Accounts) */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#2F80ED]">TOTAL SAVINGS</p>
              <h1 className="text-sm font-medium text-slate-500">ยอดเงินฝากจริงรวมทั้งหมด</h1>
            </div>
            <button
              type="button"
              onClick={openAddAccount}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-blue-50 px-3 text-xs font-semibold text-[#2F80ED] hover:bg-blue-100 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มบัญชี</span>
            </button>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5 overflow-hidden">
            <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-4xl">
              {formatTHB(totalActualDeposits, 2)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            เงินฝากจริงในบัญชีและเงินสดที่ยืนยันแล้ว (ไม่รวมรายได้ที่ยังไม่รับจริง)
          </p>

          {/* Bank Accounts List */}
          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
            {state.bankAccounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between gap-2 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    {acc.category === 'cash' ? (
                      <Wallet className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Landmark className="h-4 w-4 text-[#2F80ED]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{acc.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {acc.category === 'bank'
                        ? 'บัญชีธนาคาร'
                        : acc.category === 'cash'
                          ? 'เงินสด'
                          : 'ออมทรัพย์'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="mr-1 text-sm font-semibold text-slate-900 tabular-nums">
                    {formatTHB(acc.balance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditAccount(acc)}
                    aria-label={`แก้ไข ${acc.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {state.bankAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteBankAccount(acc.id)}
                      aria-label={`ลบ ${acc.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2.2 REAL-TIME SAVINGS COUNTER */}
        <section className="flex flex-col justify-between rounded-3xl bg-[#0B1220] p-5 text-white shadow-lg lg:col-span-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-emerald-400">
                REAL-TIME SAVINGS
              </span>
              <button
                type="button"
                onClick={openOpeningEditor}
                className="text-[11px] font-medium text-blue-400 underline-offset-2 hover:underline"
              >
                แก้ไขวันเวลาตั้งต้น
              </button>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              เงินเก็บคาดการณ์แบบเรียลไทม์ (จำลองรวมรายได้สะสมหลังตั้งต้น)
            </p>

            <div className="mt-3 flex items-baseline gap-1.5 overflow-hidden">
              <span className="text-xl font-bold text-emerald-400">฿</span>
              <span className="font-digital led-emerald truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {formatTHB(realTimeSavings.projectedRealTimeSavings, 4, false)}
              </span>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl bg-slate-900/90 p-3.5 text-xs border border-slate-800">
              <div className="flex items-center justify-between text-slate-300">
                <span>เงินเก็บตั้งต้น ({formatDisplayDateTime(state.openingBalanceTimestamp)})</span>
                <span className="font-digital tabular-nums">{formatTHB(realTimeSavings.openingBalance)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>+ รายได้สะสมหลังเวลาตั้งต้น</span>
                <span className="font-digital tabular-nums">
                  +{formatTHB(realTimeSavings.incomeSinceOpening, 4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-red-400">
                <span>− รายจ่ายที่เกิดขึ้นแล้วหลังเวลาตั้งต้น</span>
                <span className="font-digital tabular-nums">
                  -{formatTHB(realTimeSavings.expensesSinceOpening)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
            <span className="text-[11px] text-slate-400">
              อัปเดตเมื่อโอนเงินเดือนเข้าบัญชีจริงเพื่อไม่ให้นับซ้ำ
            </span>
            <button
              type="button"
              onClick={resetOpeningTimestampToNow}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-xs font-medium text-blue-300 transition-colors hover:bg-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>ซิงค์เวลาตั้งต้นเป็นตอนนี้</span>
            </button>
          </div>
        </section>
      </div>

      {/* 2.3 MONTHLY EXPENSE — รายจ่าย 10 รายการ */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              รายจ่ายประจำเดือน ({monthExpenses.length} รายการ)
            </h2>
            <p className="text-xs text-slate-500">
              แตะที่สถานะเพื่อสลับชำระแล้ว/รอชำระ หรือแก้ไขยอดและวันที่ชำระ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => {
                  const prev = addMonths(selectedYear, selectedMonth, -1);
                  setSelectedMonthYear(prev.year, prev.month);
                }}
                aria-label="เดือนก่อนหน้า"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                {pad2(selectedMonth)}/{selectedYear}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = addMonths(selectedYear, selectedMonth, 1);
                  setSelectedMonthYear(next.year, next.month);
                }}
                aria-label="เดือนถัดไป"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={openAddExpense}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-[#2F80ED] px-3 text-xs font-semibold text-white hover:bg-blue-600 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มรายการ</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">รายจ่ายรวมตามแผน</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">
              {formatTHB(forecast.totalMonthlyExpenses)}
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50/70 p-3">
            <p className="text-[11px] text-emerald-700">ชำระแล้ว</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-700 tabular-nums">
              {formatTHB(forecast.paidExpenses)}
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50/80 p-3">
            <p className="text-[11px] text-amber-700">ยังไม่ชำระ</p>
            <p className="mt-0.5 text-sm font-bold text-amber-700 tabular-nums">
              {formatTHB(forecast.unpaidExpenses)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">เฉลี่ยต่อวัน</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">
              {formatTHB(forecast.averageDailyExpense)}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl bg-blue-50/70 p-3 sm:col-span-1">
            <p className="text-[11px] text-[#2F80ED]">สัดส่วนต่อรายได้</p>
            <p className="mt-0.5 text-sm font-bold text-[#2F80ED] tabular-nums">
              {forecast.expenseToIncomeRatio.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Expense Items Table / Rows */}
        <div className="mt-4 divide-y divide-slate-100">
          {monthExpenses.map((item, index) => {
            const clampedDay = Math.min(Math.max(1, item.dueDay), daysInMonth);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 py-3"
              >
                <button
                  type="button"
                  onClick={() =>
                    updateMonthExpenseItem(selectedYear, selectedMonth, item.id, {
                      isPaid: !item.isPaid,
                    })
                  }
                  className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      item.isPaid
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {item.isPaid ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {index + 1}. {item.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      <span className={item.isPaid ? 'font-medium text-emerald-600' : 'font-medium text-amber-600'}>
                        {item.isPaid ? 'ชำระแล้ว' : 'รอชำระ'}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>วันที่ {clampedDay}</span>
                      {item.isRecurring && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>ประจำทุกเดือน</span>
                        </>
                      )}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="mr-1 text-sm font-semibold text-red-600 tabular-nums">
                    {formatTHB(item.plannedAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditExpense(item)}
                    aria-label={`แก้ไข ${item.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMonthExpenseItem(selectedYear, selectedMonth, item.id)}
                    aria-label={`ลบ ${item.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2.4 END-OF-MONTH CASH FORECAST */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#2F80ED]">
              FORECAST — CASH AT MONTH END
            </p>
            <h2 className="text-sm font-medium text-slate-500">
              ประมาณการเงินสดคงเหลือสิ้นเดือน {THAI_MONTHS[selectedMonth - 1]} {selectedYear + 543}
            </h2>
          </div>
          <span
            className={`text-sm font-bold tabular-nums ${
              forecast.deltaFromStart >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {forecast.deltaFromStart >= 0 ? '+' : ''}
            {formatTHB(forecast.deltaFromStart)} ({forecast.deltaPercent >= 0 ? '+' : ''}
            {forecast.deltaPercent.toFixed(2)}%)
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
          <div>
            <p className="text-xs font-medium text-slate-500">เงินสดคงเหลือคาดการณ์สิ้นเดือน</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-4xl">
              {formatTHB(forecast.projectedEndBalance)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              กระแสเงินสดสุทธิเดือนนี้:{' '}
              <span
                className={`font-semibold tabular-nums ${
                  forecast.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {forecast.netCashFlow >= 0 ? '+' : ''}
                {formatTHB(forecast.netCashFlow)}
              </span>
            </p>
          </div>

          <dl className="space-y-2 rounded-2xl bg-slate-50 p-4 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">เงินเก็บตั้งต้น</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">
                {formatTHB(forecast.openingBalance)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">รายได้รวมทั้งเดือน</dt>
              <dd className="font-semibold text-emerald-600 tabular-nums">
                +{formatTHB(forecast.totalMonthlyIncome)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">รายจ่ายรวมทั้งเดือน (ไม่หักซ้ำ)</dt>
              <dd className="font-semibold text-red-600 tabular-nums">
                -{formatTHB(forecast.totalMonthlyExpenses)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <dt className="font-medium text-slate-700">กระแสเงินสดสุทธิ (รายรับ − รายจ่าย)</dt>
              <dd
                className={`font-bold tabular-nums ${
                  forecast.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {forecast.netCashFlow >= 0 ? '+' : ''}
                {formatTHB(forecast.netCashFlow)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ACCOUNT MODAL */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                {editingAccount ? 'แก้ไขบัญชีเงินฝาก' : 'เพิ่มบัญชีเงินฝาก / เงินสด'}
              </h3>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อบัญชี</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น บัญชีธนาคารกสิกรไทย"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ยอดเงินคงเหลือจริง (บาท)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  required
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ประเภทบัญชี</label>
                <select
                  value={accCategory}
                  onChange={(e) => setAccCategory(e.target.value as BankAccount['category'])}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
                >
                  <option value="bank">บัญชีธนาคาร</option>
                  <option value="savings">บัญชีออมทรัพย์อื่น</option>
                  <option value="cash">เงินสด</option>
                </select>
              </div>
              <button
                type="submit"
                className="h-12 w-full rounded-2xl bg-[#2F80ED] text-sm font-semibold text-white hover:bg-blue-600"
              >
                บันทึกบัญชี
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OPENING BALANCE TIMESTAMP MODAL */}
      {openingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">ตั้งค่ายอดและวันเวลาตั้งต้น</h3>
              <button
                type="button"
                onClick={() => setOpeningModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpening} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  วันและเวลาตั้งต้น (Asia/Bangkok)
                </label>
                <input
                  type="datetime-local"
                  step="1"
                  required
                  value={openingDateTimeInput.slice(0, 19)}
                  onChange={(e) => setOpeningDateTimeInput(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  ระบบจะนับเฉพาะรายได้และรายจ่ายที่เกิดขึ้นหลังจากเวลานี้ เพื่อป้องกันการนับเงินเดือนซ้ำ
                </p>
              </div>

              <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={useBankTotal}
                  onChange={(e) => setUseBankTotal(e.target.checked)}
                  className="h-4 w-4 accent-[#2F80ED]"
                />
                <span>ใช้ผลรวมบัญชีเงินฝากจริง ({formatTHB(totalActualDeposits)}) เป็นยอดตั้งต้น</span>
              </label>

              {!useBankTotal && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    กำหนดยอดเงินเก็บตั้งต้นเอง (บาท)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    required
                    value={customOpeningInput}
                    onChange={(e) => setCustomOpeningInput(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums"
                  />
                </div>
              )}

              <button
                type="submit"
                className="h-12 w-full rounded-2xl bg-[#2F80ED] text-sm font-semibold text-white hover:bg-blue-600"
              >
                บันทึกเวลาตั้งต้น
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MONTHLY EXPENSE ITEM MODAL */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                {editingExpense ? 'แก้ไขรายจ่ายประจำเดือน' : 'เพิ่มรายจ่ายประจำเดือน'}
              </h3>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อรายการ</label>
                <input
                  type="text"
                  required
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">วันที่ชำระ (1–31)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    required
                    value={expDueDay}
                    onChange={(e) => setExpDueDay(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={expIsPaid}
                  onChange={(e) => setExpIsPaid(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span>ชำระแล้ว</span>
              </label>

              <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={expRecurring}
                  onChange={(e) => setExpRecurring(e.target.checked)}
                  className="h-4 w-4 accent-[#2F80ED]"
                />
                <span>เกิดซ้ำทุกเดือนอัตโนมัติ</span>
              </label>

              <button
                type="submit"
                className="h-12 w-full rounded-2xl bg-[#2F80ED] text-sm font-semibold text-white hover:bg-blue-600"
              >
                บันทึกรายการ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
