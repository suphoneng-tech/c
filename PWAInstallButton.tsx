import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        aria-label="ติดตั้งแอปลงหน้าจอหลัก"
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#2F80ED] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-600 active:scale-[0.98] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4" />
        <span>ติดตั้งแอป</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="วิธีติดตั้งแอปบน iOS"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4 text-[#2F80ED]" />
          <span>ติดตั้งแอป</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">ติดตั้งลงหน้าจอหลัก</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1. แตะปุ่ม แชร์ (Share) บนแถบเครื่องมือ Safari</li>
                <li>2. เลื่อนลงแล้วเลือก เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</li>
                <li>3. เปิดแอปจากไอคอนเพื่อใช้งานแบบเต็มหน้าจอ</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 h-11 w-full rounded-xl bg-[#2F80ED] text-sm font-medium text-white hover:bg-blue-600"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
