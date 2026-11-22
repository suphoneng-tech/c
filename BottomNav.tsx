import React from 'react';
import { Calendar, TrendingUp, Wallet } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { TabId } from '../types/finance';

const TABS: { id: TabId; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'income', label: 'รายได้', Icon: Calendar },
  { id: 'savings', label: 'เงินเก็บ', Icon: Wallet },
  { id: 'charts', label: 'กราฟ', Icon: TrendingUp },
];

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useFinancial();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-safe"
    >
      <div className="mx-auto grid h-14 max-w-5xl grid-cols-3 items-center px-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl transition-colors active:scale-[0.97] ${
                isActive ? 'text-[#2F80ED]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-[#2F80ED]"
                />
              )}
              <Icon className="h-5 w-5" />
              <span className={`text-[11px] leading-tight whitespace-nowrap ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
