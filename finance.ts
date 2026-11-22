export type CalculationMode = 'calendar' | 'workdays';

export type TabId = 'income' | 'savings' | 'charts';

export interface SalaryConfig {
  monthlySalary: number;
  startDate: string; // YYYY-MM-DD (Asia/Bangkok)
  paydayOfMonth: number; // 1-31
  extraIncome: number; // Monthly extra/bonus income (THB)
  calculationMode: CalculationMode;
  workDaysOfWeek: number[]; // 0=Sun..6=Sat, default [1,2,3,4,5]
  workStartHour: number; // 0-23, default 9
  workStartMinute: number; // 0-59, default 0
  workEndHour: number; // 0-23, default 18
  workEndMinute: number; // 0-59, default 0
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  category: 'bank' | 'cash' | 'savings';
}

export interface MonthlyExpenseItem {
  id: string;
  name: string;
  plannedAmount: number;
  dueDay: number; // 1-31
  isPaid: boolean;
  paidDate?: string; // YYYY-MM-DD
  paidAtUtcMs?: number;
  isRecurring: boolean;
}

export interface DailyTransaction {
  id: string;
  date: string; // YYYY-MM-DD (Asia/Bangkok)
  type: 'income' | 'expense';
  title: string;
  amount: number;
  category: string;
  note?: string;
  createdAtUtcMs: number;
}

export interface FinancialState {
  version: number;
  salaryConfig: SalaryConfig;
  bankAccounts: BankAccount[];
  useBankTotalAsOpening: boolean;
  customOpeningBalance: number;
  openingBalanceTimestamp: string; // YYYY-MM-DDTHH:mm:ss (Asia/Bangkok)
  recurringExpenseTemplates: MonthlyExpenseItem[];
  monthlyExpensesByMonth: Record<string, MonthlyExpenseItem[]>; // keyed by YYYY-MM
  transactions: DailyTransaction[];
}

export interface SalaryRates {
  daysInMonth: number;
  activeUnits: number; // daysInMonth in calendar mode, workdays in workdays mode
  dailyRate: number;
  hourlyRate: number;
  minuteRate: number;
  secondRate: number;
}

export interface DaySummary {
  dateKey: string;
  salaryIncome: number;
  extraIncome: number;
  transactionIncome: number;
  totalIncome: number;
  scheduledExpenses: number;
  transactionExpenses: number;
  totalExpenses: number;
  net: number;
  monthlyExpenseItems: MonthlyExpenseItem[];
  dailyTransactions: DailyTransaction[];
  isPayday: boolean;
  hasItems: boolean;
}

export interface MonthForecast {
  year: number;
  month: number;
  openingBalance: number;
  totalMonthlyIncome: number;
  salaryMonthlyIncome: number;
  extraMonthlyIncome: number;
  transactionMonthlyIncome: number;
  totalMonthlyExpenses: number;
  paidExpenses: number;
  unpaidExpenses: number;
  dailyExpenses: number;
  netCashFlow: number;
  projectedEndBalance: number;
  deltaFromStart: number;
  deltaPercent: number;
  expenseToIncomeRatio: number;
  averageDailyExpense: number;
}
