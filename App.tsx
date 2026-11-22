import React, { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { FinancialChartTab } from './components/FinancialChartTab';
import { IncomeCalendarTab } from './components/IncomeCalendarTab';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SalarySettingsSheet } from './components/SalarySettingsSheet';
import { SavingsExpensesTab } from './components/SavingsExpensesTab';
import { TopBar } from './components/TopBar';
import { FinancialProvider, useFinancial } from './context/FinancialContext';

const AppShell: React.FC = () => {
  const { activeTab } = useFinancial();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app-shell-height flex flex-col bg-[#F7F9FC] text-slate-900">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />

      <main className="flex-1">
        {activeTab === 'income' && <IncomeCalendarTab />}
        {activeTab === 'savings' && <SavingsExpensesTab />}
        {activeTab === 'charts' && <FinancialChartTab />}
      </main>

      <BottomNav />
      <OfflineIndicator />

      <SalarySettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <FinancialProvider>
      <AppShell />
    </FinancialProvider>
  );
}
