import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinancial } from '../context/FinancialContext';
import { addMonths, formatMonthKey, pad2, THAI_MONTHS, toBangkokParts } from '../utils/bangkokTime';
import {
  buildDailyChartSeries,
  buildMultiMonthSeries,
  computeMonthForecast,
  computeMonthIncomeToNow,
  formatCompactTHB,
  formatTHB,
  getEffectiveMonthExpenses,
} from '../utils/financeEngine';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    dataKey?: string;
    color?: string;
  }>;
  label?: string | number;
}

const DailyAccumulatedTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const actualInc = payload.find((p) => p.dataKey === 'actualIncome')?.value;
  const forecastInc = payload.find((p) => p.dataKey === 'forecastIncome')?.value;
  const actualExp = payload.find((p) => p.dataKey === 'actualExpense')?.value;
  const forecastExp = payload.find((p) => p.dataKey === 'forecastExpense')?.value;

  const incomeVal = actualInc ?? forecastInc ?? 0;
  const expenseVal = actualExp ?? forecastExp ?? 0;
  const isForecast = actualInc == null && forecastInc != null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm text-xs">
      <p className="font-semibold text-slate-900">
        วันที่ {label} {isForecast ? '(คาดการณ์)' : '(ข้อมูลจริง)'}
      </p>
      <div className="mt-1.5 space-y-1 tabular-nums">
        <p className="flex items-center justify-between gap-4 text-[#2F80ED] font-medium">
          <span>รายได้สะสม:</span>
          <span>{formatTHB(incomeVal)}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-red-600 font-medium">
          <span>รายจ่ายสะสม:</span>
          <span>{formatTHB(expenseVal)}</span>
        </p>
        <p className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1 font-semibold text-slate-800">
          <span>สุทธิสะสม:</span>
          <span>{formatTHB(incomeVal - expenseVal)}</span>
        </p>
      </div>
    </div>
  );
};

const MultiMonthTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const inc = payload.find((p) => p.dataKey === 'income')?.value ?? 0;
  const exp = payload.find((p) => p.dataKey === 'expense')?.value ?? 0;
  const net = payload.find((p) => p.dataKey === 'net')?.value ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm text-xs">
      <p className="font-semibold text-slate-900">{label}</p>
      <div className="mt-1.5 space-y-1 tabular-nums">
        <p className="flex items-center justify-between gap-4 text-emerald-600 font-medium">
          <span>รายรับ:</span>
          <span>{formatTHB(inc)}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-red-600 font-medium">
          <span>รายจ่าย:</span>
          <span>{formatTHB(exp)}</span>
        </p>
        <p className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1 font-semibold text-[#2F80ED]">
          <span>สุทธิ:</span>
          <span>{formatTHB(net)}</span>
        </p>
      </div>
    </div>
  );
};

export const FinancialChartTab: React.FC = () => {
  const { state, nowUtcMs, selectedYear, selectedMonth, setSelectedMonthYear } = useFinancial();
  const [rangeMonths, setRangeMonths] = useState<3 | 6 | 12>(6);

  const bangkokNow = useMemo(() => toBangkokParts(nowUtcMs), [nowUtcMs]);
  const viewedMonthKey = formatMonthKey(selectedYear, selectedMonth);
  const currentMonthKey = formatMonthKey(bangkokNow.year, bangkokNow.month);
  const isCurrentMonth = viewedMonthKey === currentMonthKey;

  // Daily series updates accurately (throttled logically to state + second boundary if current month)
  const dailySeries = useMemo(
    () => buildDailyChartSeries(state, selectedYear, selectedMonth, nowUtcMs),
    [state, selectedYear, selectedMonth, nowUtcMs]
  );

  const forecast = useMemo(
    () => computeMonthForecast(state, selectedYear, selectedMonth),
    [state, selectedYear, selectedMonth]
  );

  // KPI 1: Accumulated Income This Month (live if current month, full if past, 0 if future)
  const accumulatedMonthIncome = useMemo(() => {
    if (isCurrentMonth) {
      return computeMonthIncomeToNow(state, selectedYear, selectedMonth, nowUtcMs);
    }
    if (viewedMonthKey < currentMonthKey) {
      return forecast.totalMonthlyIncome;
    }
    return 0;
  }, [isCurrentMonth, viewedMonthKey, currentMonthKey, state, selectedYear, selectedMonth, nowUtcMs, forecast.totalMonthlyIncome]);

  // KPI 2: Accumulated Expense This Month (paid items + daily tx up to today if current month)
  const accumulatedMonthExpense = useMemo(() => {
    if (viewedMonthKey < currentMonthKey) {
      return forecast.totalMonthlyExpenses;
    }
    if (viewedMonthKey > currentMonthKey) {
      return 0;
    }
    const items = getEffectiveMonthExpenses(state, selectedYear, selectedMonth);
    const paidItems = items.filter((i) => i.isPaid).reduce((s, i) => s + i.plannedAmount, 0);
    const txUpToToday = state.transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.date.startsWith(viewedMonthKey) &&
          parseInt(t.date.slice(8, 10), 10) <= bangkokNow.day
      )
      .reduce((s, t) => s + t.amount, 0);
    return paidItems + txUpToToday;
  }, [viewedMonthKey, currentMonthKey, forecast.totalMonthlyExpenses, state, selectedYear, selectedMonth, bangkokNow.day]);

  const accumulatedMonthNet = accumulatedMonthIncome - accumulatedMonthExpense;

  const multiMonthSeries = useMemo(
    () => buildMultiMonthSeries(state, selectedYear, selectedMonth, rangeMonths),
    [state, selectedYear, selectedMonth, rangeMonths]
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-3 pt-3 pb-24 sm:px-6 lg:pt-5">
      {/* MONTH / YEAR SELECTOR HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-sm">
        <div>
          <h1 className="text-base font-semibold text-slate-900">กราฟวิเคราะห์การเงิน</h1>
          <p className="text-xs text-slate-500">
            {THAI_MONTHS[selectedMonth - 1]} {selectedYear + 543} ({pad2(selectedMonth)}/{selectedYear})
          </p>
        </div>
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => {
              const prev = addMonths(selectedYear, selectedMonth, -1);
              setSelectedMonthYear(prev.year, prev.month);
            }}
            aria-label="เดือนก่อนหน้า"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2.5 text-xs font-semibold text-slate-800 tabular-nums">
            {pad2(selectedMonth)} / {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = addMonths(selectedYear, selectedMonth, 1);
              setSelectedMonthYear(next.year, next.month);
            }}
            aria-label="เดือนถัดไป"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3.1 ACCUMULATED INCOME VS EXPENSE LINE CHART */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              รายได้สะสม vs รายจ่ายสะสมรายวัน
            </h2>
            <p className="text-xs text-slate-500">
              เส้นทึบ = ข้อมูลจริงถึงปัจจุบัน · เส้นประ = คาดการณ์ถึงสิ้นเดือน
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2F80ED]" />
              รายได้สะสม
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              รายจ่ายสะสม
            </span>
          </div>
        </div>

        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatCompactTHB}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                width={58}
              />
              <Tooltip content={<DailyAccumulatedTooltip />} />

              {/* Actual Cumulative Income */}
              <Line
                type="monotone"
                dataKey="actualIncome"
                stroke="#2F80ED"
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#2F80ED' }}
                activeDot={{ r: 5, fill: '#2F80ED' }}
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* Forecast Cumulative Income (dashed) */}
              <Line
                type="monotone"
                dataKey="forecastIncome"
                stroke="#2F80ED"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: '#2F80ED' }}
                connectNulls={false}
                isAnimationActive={false}
              />

              {/* Actual Cumulative Expense */}
              <Line
                type="monotone"
                dataKey="actualExpense"
                stroke="#EF4444"
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#EF4444' }}
                activeDot={{ r: 5, fill: '#EF4444' }}
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* Forecast Cumulative Expense (dashed) */}
              <Line
                type="monotone"
                dataKey="forecastExpense"
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: '#EF4444' }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3.2 4 FINANCIAL KPI CARDS */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">รายได้สะสมเดือนนี้</p>
          <p className="mt-1.5 text-lg font-bold text-[#2F80ED] tabular-nums sm:text-xl">
            {formatTHB(accumulatedMonthIncome)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            ทั้งเดือน {formatTHB(forecast.totalMonthlyIncome)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">รายจ่ายสะสมเดือนนี้</p>
          <p className="mt-1.5 text-lg font-bold text-red-600 tabular-nums sm:text-xl">
            {formatTHB(accumulatedMonthExpense)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            ตามแผนทั้งเดือน {formatTHB(forecast.totalMonthlyExpenses)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">เงินสุทธิสะสมเดือนนี้</p>
          <p
            className={`mt-1.5 text-lg font-bold tabular-nums sm:text-xl ${
              accumulatedMonthNet >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {accumulatedMonthNet >= 0 ? '+' : ''}
            {formatTHB(accumulatedMonthNet)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            สุทธิสิ้นเดือน {forecast.netCashFlow >= 0 ? '+' : ''}
            {formatTHB(forecast.netCashFlow)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">เงินสดคงเหลือคาดการณ์สิ้นเดือน</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900 tabular-nums sm:text-xl">
            {formatTHB(forecast.projectedEndBalance)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium tabular-nums">
            {forecast.deltaFromStart >= 0 ? '+' : ''}
            {formatTHB(forecast.deltaFromStart)} จากต้นเดือน
          </p>
        </div>
      </section>

      {/* MULTI-MONTH COMPARISON CHART (3M / 6M / 12M) */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              เปรียบเทียบรายได้ รายจ่าย และเงินสุทธิรายเดือน
            </h2>
            <p className="text-xs text-slate-500">
              แสดงข้อมูลย้อนหลังสิ้นสุดเดือน {pad2(selectedMonth)}/{selectedYear}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {([3, 6, 12] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setRangeMonths(m)}
                className={`min-h-[34px] rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  rangeMonths === m
                    ? 'bg-white text-[#2F80ED] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m} เดือน
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={multiMonthSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                tickFormatter={formatCompactTHB}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                width={58}
              />
              <Tooltip content={<MultiMonthTooltip />} />
              <Bar dataKey="income" name="รายรับ" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={24} />
              <Bar dataKey="expense" name="รายจ่าย" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={24} />
              <Line
                type="monotone"
                dataKey="net"
                name="สุทธิ"
                stroke="#2F80ED"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#2F80ED' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            รายรับรวม
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            รายจ่ายรวม
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2F80ED]" />
            กระแสเงินสดสุทธิ
          </span>
        </div>
      </section>
    </div>
  );
};
