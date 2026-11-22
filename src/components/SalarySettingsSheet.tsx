import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Upload, X } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { CalculationMode } from '../types/finance';
import { getBangkokDateKey, pad2, THAI_WEEKDAYS_SHORT } from '../utils/bangkokTime';

interface SalarySettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalarySettingsSheet: React.FC<SalarySettingsSheetProps> = ({ isOpen, onClose }) => {
  const {
    state,
    nowUtcMs,
    updateSalaryConfig,
    exportStateJson,
    importStateJson,
    resetToExampleScenario,
  } = useFinancial();

  const cfg = state.salaryConfig;
  const [monthlySalary, setMonthlySalary] = useState<string>(String(cfg.monthlySalary));
  const [startDate, setStartDate] = useState<string>(cfg.startDate);
  const [paydayOfMonth, setPaydayOfMonth] = useState<string>(String(cfg.paydayOfMonth));
  const [extraIncome, setExtraIncome] = useState<string>(String(cfg.extraIncome));
  const [calculationMode, setCalculationMode] = useState<CalculationMode>(cfg.calculationMode);
  const [workDaysOfWeek, setWorkDaysOfWeek] = useState<number[]>(cfg.workDaysOfWeek);
  const [workStartTime, setWorkStartTime] = useState<string>(
    `${pad2(cfg.workStartHour)}:${pad2(cfg.workStartMinute)}`
  );
  const [workEndTime, setWorkEndTime] = useState<string>(
    `${pad2(cfg.workEndHour)}:${pad2(cfg.workEndMinute)}`
  );
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const toggleWorkDay = (dow: number) => {
    setWorkDaysOfWeek((prev) => {
      if (prev.includes(dow)) {
        return prev.length > 1 ? prev.filter((d) => d !== dow) : prev;
      }
      return [...prev, dow].sort((a, b) => a - b);
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSalary = Math.max(0, parseFloat(monthlySalary) || 0);
    const parsedExtra = Math.max(0, parseFloat(extraIncome) || 0);
    const parsedPayday = Math.min(31, Math.max(1, parseInt(paydayOfMonth, 10) || 25));
    const [sh = 9, sm = 0] = workStartTime.split(':').map((n) => parseInt(n, 10) || 0);
    const [eh = 18, em = 0] = workEndTime.split(':').map((n) => parseInt(n, 10) || 0);

    updateSalaryConfig({
      monthlySalary: parsedSalary,
      startDate: startDate || getBangkokDateKey(nowUtcMs),
      paydayOfMonth: parsedPayday,
      extraIncome: parsedExtra,
      calculationMode,
      workDaysOfWeek,
      workStartHour: sh,
      workStartMinute: sm,
      workEndHour: eh,
      workEndMinute: em,
    });
    onClose();
  };

  const handleExport = () => {
    const json = exportStateJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money-calendar-backup-${getBangkokDateKey(nowUtcMs)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg({ type: 'ok', text: 'ส่งออกไฟล์สำรองข้อมูลเรียบร้อยแล้ว' });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = importStateJson(text);
      if (res.ok) {
        setStatusMsg({ type: 'ok', text: 'นำเข้าข้อมูลสำเร็จ ข้อมูลทุกหน้าได้รับการอัปเดตแล้ว' });
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setStatusMsg({ type: 'err', text: res.error || 'นำเข้าข้อมูลไม่สำเร็จ' });
      }
    } catch {
      setStatusMsg({ type: 'err', text: 'ไม่สามารถอ่านไฟล์ได้' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetConfirm = () => {
    resetToExampleScenario();
    setConfirmReset(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ตั้งค่าเงินเดือน"
    >
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex flex-col border-b border-slate-100 bg-white px-5 pt-3 pb-3">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">ตั้งค่าเงินเดือนและระบบ</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 p-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              เงินเดือนสุทธิต่อเดือน (บาท)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-base font-semibold text-slate-900 tabular-nums focus:border-[#2F80ED] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                วันเริ่มต้นคำนวณรายได้
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:border-[#2F80ED] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                วันที่รับเงินเดือน (1–31)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                required
                value={paydayOfMonth}
                onChange={(e) => setPaydayOfMonth(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-medium text-slate-900 tabular-nums focus:border-[#2F80ED] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              รายได้พิเศษต่อเดือน (บาท — ถ้ามี)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={extraIncome}
              onChange={(e) => setExtraIncome(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm font-medium text-slate-900 tabular-nums focus:border-[#2F80ED] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-600 mb-1.5">
              วิธีคำนวณรายได้แบบเรียลไทม์
            </span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setCalculationMode('calendar')}
                className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  calculationMode === 'calendar'
                    ? 'bg-white text-[#2F80ED] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ตามวันปฏิทิน (24 ชม.)
              </button>
              <button
                type="button"
                onClick={() => setCalculationMode('workdays')}
                className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  calculationMode === 'workdays'
                    ? 'bg-white text-[#2F80ED] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เฉพาะวันและเวลาทำงาน
              </button>
            </div>
          </div>

          {calculationMode === 'workdays' && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div>
                <span className="block text-xs font-medium text-slate-600 mb-2">วันทำงาน</span>
                <div className="grid grid-cols-7 gap-1.5">
                  {THAI_WEEKDAYS_SHORT.map((label, idx) => {
                    const active = workDaysOfWeek.includes(idx);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleWorkDay(idx)}
                        className={`flex h-10 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-[#2F80ED] text-white'
                            : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    เวลาเริ่มงาน
                  </label>
                  <input
                    type="time"
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    เวลาเลิกงาน
                  </label>
                  <input
                    type="time"
                    value={workEndTime}
                    onChange={(e) => setWorkEndTime(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="h-12 w-full rounded-2xl bg-[#2F80ED] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 active:scale-[0.99]"
          >
            บันทึกการตั้งค่า
          </button>
        </form>

        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-700">สำรองข้อมูลและกู้คืน (JSON)</h3>

          {statusMsg && (
            <p
              className={`rounded-xl px-3 py-2 text-xs font-medium ${
                statusMsg.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {statusMsg.text}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-[#2F80ED]" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4 text-emerald-600" />
              <span>Import JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>คืนค่าตัวอย่างเริ่มต้น (เงินเดือน 200,000 / เงินเก็บ 4,000,000)</span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5">
              <span className="text-xs font-medium text-red-800">ยืนยันล้างข้อมูลและใช้ค่าตัวอย่าง?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleResetConfirm}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
