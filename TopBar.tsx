import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSettings }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md pt-safe">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-4">
        <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          Money Calendar
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 active:scale-[0.98] whitespace-nowrap shrink-0"
            aria-label="ตั้งค่าเงินเดือนและสำรองข้อมูล"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#2F80ED]" />
            <span>ตั้งค่าเงินเดือน</span>
          </button>
        </div>
      </div>
    </header>
  );
};
