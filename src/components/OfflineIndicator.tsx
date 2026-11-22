import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-medium text-white shadow-md">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>โหมดออฟไลน์ — ข้อมูลบันทึกในเครื่อง</span>
    </div>
  );
};
