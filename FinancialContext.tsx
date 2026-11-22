import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  BankAccount,
  DailyTransaction,
  FinancialState,
  MonthlyExpenseItem,
  SalaryConfig,
  TabId,
} from '../types/finance';
import {
  formatDateKey,
  formatMonthKey,
  formatUtcMsToBangkokDateTimeLocal,
  getBangkokDateKey,
  toBangkokParts,
} from '../utils/bangkokTime';
import { getEffectiveMonthExpenses } from '../utils/financeEngine';

const STORAGE_KEY = 'money_calendar_financial_state_v1';

export function createDefaultExpenseTemplates(): MonthlyExpenseItem[] {
  return [
    { id: 'exp-1', name: 'ค่าอาหาร', plannedAmount: 15000, dueDay: 5, isPaid: false, isRecurring: true },
    { id: 'exp-2', name: 'ค่าใช้จ่ายครอบครัว', plannedAmount: 15000, dueDay: 10, isPaid: false, isRecurring: true },
    { id: 'exp-3', name: 'ค่าเล่าเรียนบุตร', plannedAmount: 12000, dueDay: 15, isPaid: false, isRecurring: true },
    { id: 'exp-4', name: 'ค่าน้ำ ค่าไฟ และอินเทอร์เน็ต', plannedAmount: 4500, dueDay: 18, isPaid: false, isRecurring: true },
    { id: 'exp-5', name: 'ค่าเดินทาง', plannedAmount: 6500, dueDay: 20, isPaid: false, isRecurring: true },
    { id: 'exp-6', name: 'ค่าประกัน', plannedAmount: 8000, dueDay: 22, isPaid: false, isRecurring: true },
    { id: 'exp-7', name: 'ค่ารักษาพยาบาล', plannedAmount: 3000, dueDay: 24, isPaid: false, isRecurring: true },
    { id: 'exp-8', name: 'ค่าบ้านและที่อยู่อาศัย', plannedAmount: 25000, dueDay: 25, isPaid: false, isRecurring: true },
    { id: 'exp-9', name: 'ค่าใช้จ่ายส่วนตัว', plannedAmount: 7000, dueDay: 27, isPaid: false, isRecurring: true },
    { id: 'exp-10', name: 'ค่าใช้จ่ายอื่น ๆ', plannedAmount: 4000, dueDay: 28, isPaid: false, isRecurring: true },
  ];
}

export function createDefaultBankAccounts(): BankAccount[] {
  return [
    { id: 'acc-1', name: 'บัญชีธนาคาร A', balance: 2200000, category: 'bank' },
    { id: 'acc-2', name: 'บัญชีธนาคาร B', balance: 1200000, category: 'bank' },
    { id: 'acc-3', name: 'บัญชีออมทรัพย์อื่น', balance: 500000, category: 'savings' },
    { id: 'acc-4', name: 'เงินสด', balance: 100000, category: 'cash' },
  ];
}

export function createDefaultFinancialState(nowMs = Date.now()): FinancialState {
  const parts = toBangkokParts(nowMs);
  const firstOfMonthKey = formatDateKey(parts.year, parts.month, 1);
  const monthKey = formatMonthKey(parts.year, parts.month);
  const templates = createDefaultExpenseTemplates();

  return {
    version: 1,
    salaryConfig: {
      monthlySalary: 200000,
      startDate: firstOfMonthKey,
      paydayOfMonth: 25,
      extraIncome: 0,
      calculationMode: 'calendar',
      workDaysOfWeek: [1, 2, 3, 4, 5],
      workStartHour: 9,
      workStartMinute: 0,
      workEndHour: 18,
      workEndMinute: 0,
    },
    bankAccounts: createDefaultBankAccounts(),
    useBankTotalAsOpening: true,
    customOpeningBalance: 4000000,
    openingBalanceTimestamp: `${firstOfMonthKey}T00:00:00`,
    recurringExpenseTemplates: templates,
    monthlyExpensesByMonth: {
      [monthKey]: templates.map((t) => ({ ...t })),
    },
    transactions: [],
  };
}

function loadSavedState(): FinancialState {
  const fallback = createDefaultFinancialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<FinancialState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.salaryConfig || !Array.isArray(parsed.bankAccounts)) {
      return fallback;
    }
    return {
      ...fallback,
      ...parsed,
      salaryConfig: {
        ...fallback.salaryConfig,
        ...parsed.salaryConfig,
      },
      recurringExpenseTemplates:
        Array.isArray(parsed.recurringExpenseTemplates) && parsed.recurringExpenseTemplates.length > 0
          ? parsed.recurringExpenseTemplates
          : fallback.recurringExpenseTemplates,
      monthlyExpensesByMonth:
        parsed.monthlyExpensesByMonth && typeof parsed.monthlyExpensesByMonth === 'object'
          ? parsed.monthlyExpensesByMonth
          : fallback.monthlyExpensesByMonth,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    };
  } catch {
    return fallback;
  }
}

interface FinancialContextValue {
  state: FinancialState;
  nowUtcMs: number;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  selectedYear: number;
  selectedMonth: number;
  selectedDateKey: string;
  setSelectedMonthYear: (year: number, month: number) => void;
  setSelectedDateKey: (dateKey: string) => void;
  jumpToToday: () => void;
  updateSalaryConfig: (patch: Partial<SalaryConfig>) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, patch: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  setOpeningSettings: (patch: {
    useBankTotalAsOpening?: boolean;
    customOpeningBalance?: number;
    openingBalanceTimestamp?: string;
  }) => void;
  resetOpeningTimestampToNow: () => void;
  updateMonthExpenseItem: (
    year: number,
    month: number,
    itemId: string,
    patch: Partial<MonthlyExpenseItem>
  ) => void;
  addMonthExpenseItem: (year: number, month: number, item: Omit<MonthlyExpenseItem, 'id'>) => void;
  deleteMonthExpenseItem: (year: number, month: number, itemId: string) => void;
  addTransaction: (tx: Omit<DailyTransaction, 'id' | 'createdAtUtcMs'>) => void;
  updateTransaction: (id: string, patch: Partial<DailyTransaction>) => void;
  deleteTransaction: (id: string) => void;
  exportStateJson: () => string;
  importStateJson: (jsonText: string) => { ok: boolean; error?: string };
  resetToExampleScenario: () => void;
}

const FinancialContext = createContext<FinancialContextValue | null>(null);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FinancialState>(() => loadSavedState());
  const [nowUtcMs, setNowUtcMs] = useState<number>(() => Date.now());
  const [activeTab, setActiveTab] = useState<TabId>('income');

  const initialParts = toBangkokParts(Date.now());
  const [selectedYear, setSelectedYear] = useState<number>(initialParts.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialParts.month);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    getBangkokDateKey(Date.now())
  );

  // High-precision real-time clock: always recomputed from Date.now() every 125ms
  useEffect(() => {
    const tick = () => setNowUtcMs(Date.now());
    const id = window.setInterval(tick, 125);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Persist to LocalStorage on every state update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  const setSelectedMonthYear = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  }, []);

  const jumpToToday = useCallback(() => {
    const now = Date.now();
    const parts = toBangkokParts(now);
    setSelectedYear(parts.year);
    setSelectedMonth(parts.month);
    setSelectedDateKey(formatDateKey(parts.year, parts.month, parts.day));
  }, []);

  const updateSalaryConfig = useCallback((patch: Partial<SalaryConfig>) => {
    setState((prev) => ({
      ...prev,
      salaryConfig: {
        ...prev.salaryConfig,
        ...patch,
      },
    }));
  }, []);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'>) => {
    const id = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setState((prev) => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, { ...account, id }],
    }));
  }, []);

  const updateBankAccount = useCallback((id: string, patch: Partial<BankAccount>) => {
    setState((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map((acc) => (acc.id === id ? { ...acc, ...patch } : acc)),
    }));
  }, []);

  const deleteBankAccount = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((acc) => acc.id !== id),
    }));
  }, []);

  const setOpeningSettings = useCallback(
    (patch: {
      useBankTotalAsOpening?: boolean;
      customOpeningBalance?: number;
      openingBalanceTimestamp?: string;
    }) => {
      setState((prev) => ({
        ...prev,
        ...patch,
      }));
    },
    []
  );

  const resetOpeningTimestampToNow = useCallback(() => {
    const now = Date.now();
    const iso = formatUtcMsToBangkokDateTimeLocal(now);
    setState((prev) => ({
      ...prev,
      useBankTotalAsOpening: true,
      openingBalanceTimestamp: iso,
    }));
  }, []);

  const updateMonthExpenseItem = useCallback(
    (year: number, month: number, itemId: string, patch: Partial<MonthlyExpenseItem>) => {
      setState((prev) => {
        const monthKey = formatMonthKey(year, month);
        const currentList = getEffectiveMonthExpenses(prev, year, month);
        const updatedList = currentList.map((item) => {
          if (item.id !== itemId) return item;
          const nextItem: MonthlyExpenseItem = { ...item, ...patch };
          if (patch.isPaid === true && !item.isPaid) {
            nextItem.paidDate = patch.paidDate || getBangkokDateKey(Date.now());
            nextItem.paidAtUtcMs = Date.now();
          } else if (patch.isPaid === false) {
            nextItem.paidDate = undefined;
            nextItem.paidAtUtcMs = undefined;
          }
          return nextItem;
        });

        // Also sync structural changes (name, plannedAmount, dueDay, isRecurring) to recurring templates if recurring
        const targetAfter = updatedList.find((i) => i.id === itemId);
        let nextTemplates = prev.recurringExpenseTemplates;
        if (targetAfter) {
          const existsInTemplates = nextTemplates.some((t) => t.id === itemId);
          if (existsInTemplates) {
            nextTemplates = nextTemplates.map((t) =>
              t.id === itemId
                ? {
                    ...t,
                    name: targetAfter.name,
                    plannedAmount: targetAfter.plannedAmount,
                    dueDay: targetAfter.dueDay,
                    isRecurring: targetAfter.isRecurring,
                  }
                : t
            );
          } else if (targetAfter.isRecurring) {
            nextTemplates = [
              ...nextTemplates,
              {
                id: targetAfter.id,
                name: targetAfter.name,
                plannedAmount: targetAfter.plannedAmount,
                dueDay: targetAfter.dueDay,
                isPaid: false,
                isRecurring: true,
              },
            ];
          }
        }

        return {
          ...prev,
          recurringExpenseTemplates: nextTemplates,
          monthlyExpensesByMonth: {
            ...prev.monthlyExpensesByMonth,
            [monthKey]: updatedList,
          },
        };
      });
    },
    []
  );

  const addMonthExpenseItem = useCallback(
    (year: number, month: number, item: Omit<MonthlyExpenseItem, 'id'>) => {
      const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setState((prev) => {
        const monthKey = formatMonthKey(year, month);
        const currentList = getEffectiveMonthExpenses(prev, year, month);
        const newItem: MonthlyExpenseItem = { ...item, id };
        const nextTemplates = newItem.isRecurring
          ? [...prev.recurringExpenseTemplates, { ...newItem, isPaid: false, paidDate: undefined, paidAtUtcMs: undefined }]
          : prev.recurringExpenseTemplates;
        return {
          ...prev,
          recurringExpenseTemplates: nextTemplates,
          monthlyExpensesByMonth: {
            ...prev.monthlyExpensesByMonth,
            [monthKey]: [...currentList, newItem],
          },
        };
      });
    },
    []
  );

  const deleteMonthExpenseItem = useCallback((year: number, month: number, itemId: string) => {
    setState((prev) => {
      const monthKey = formatMonthKey(year, month);
      const currentList = getEffectiveMonthExpenses(prev, year, month);
      return {
        ...prev,
        recurringExpenseTemplates: prev.recurringExpenseTemplates.filter((t) => t.id !== itemId),
        monthlyExpensesByMonth: {
          ...prev.monthlyExpensesByMonth,
          [monthKey]: currentList.filter((i) => i.id !== itemId),
        },
      };
    });
  }, []);

  const addTransaction = useCallback((tx: Omit<DailyTransaction, 'id' | 'createdAtUtcMs'>) => {
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setState((prev) => ({
      ...prev,
      transactions: [...prev.transactions, { ...tx, id, createdAtUtcMs: Date.now() }],
    }));
  }, []);

  const updateTransaction = useCallback((id: string, patch: Partial<DailyTransaction>) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  }, []);

  const exportStateJson = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importStateJson = useCallback((jsonText: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<FinancialState>;
      if (!parsed || typeof parsed !== 'object' || !parsed.salaryConfig || !Array.isArray(parsed.bankAccounts)) {
        return { ok: false, error: 'โครงสร้างไฟล์ JSON ไม่ถูกต้อง' };
      }
      const fallback = createDefaultFinancialState();
      const restored: FinancialState = {
        ...fallback,
        ...parsed,
        salaryConfig: { ...fallback.salaryConfig, ...parsed.salaryConfig },
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        recurringExpenseTemplates:
          Array.isArray(parsed.recurringExpenseTemplates) && parsed.recurringExpenseTemplates.length > 0
            ? parsed.recurringExpenseTemplates
            : fallback.recurringExpenseTemplates,
        monthlyExpensesByMonth:
          parsed.monthlyExpensesByMonth && typeof parsed.monthlyExpensesByMonth === 'object'
            ? parsed.monthlyExpensesByMonth
            : fallback.monthlyExpensesByMonth,
      };
      setState(restored);
      return { ok: true };
    } catch {
      return { ok: false, error: 'ไม่สามารถอ่านไฟล์ JSON ได้' };
    }
  }, []);

  const resetToExampleScenario = useCallback(() => {
    const fresh = createDefaultFinancialState(Date.now());
    setState(fresh);
    jumpToToday();
  }, [jumpToToday]);

  return (
    <FinancialContext.Provider
      value={{
        state,
        nowUtcMs,
        activeTab,
        setActiveTab,
        selectedYear,
        selectedMonth,
        selectedDateKey,
        setSelectedMonthYear,
        setSelectedDateKey,
        jumpToToday,
        updateSalaryConfig,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        setOpeningSettings,
        resetOpeningTimestampToNow,
        updateMonthExpenseItem,
        addMonthExpenseItem,
        deleteMonthExpenseItem,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        exportStateJson,
        importStateJson,
        resetToExampleScenario,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export function useFinancial(): FinancialContextValue {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancial must be used inside FinancialProvider');
  return ctx;
}
