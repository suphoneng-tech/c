import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DailyTransaction } from '../types/finance';

interface TransactionModalProps {
  isOpen: boolean;
  defaultDate: string;
  editingTx: DailyTransaction | null;
  onClose: () => void;
  onSave: (tx: Omit<DailyTransaction, 'id' | 'createdAtUtcMs'>) => void;
}

const INCOME_CATEGORIES = ['โบนัส / รายได้เสริม', 'ค่าคอมมิชชั่น', 'ปันผล / ดอกเบี้ย', 'ขายของ', 'อื่น ๆ'];
const EXPENSE_CATEGORIES = ['ค่าอาหาร', 'ค่าเดินทาง', 'ช้อปปิ้ง', 'ค่ารักษาพยาบาล', 'ค่าใช้จ่ายครอบครัว', 'อื่น ๆ'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  defaultDate,
  editingTx,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<'income' | 'expense'>(editingTx?.type ?? 'expense');
  const [title, setTitle] = useState(editingTx?.title ?? '');
  const [amount, setAmount] = useState(editingTx ? String(editingTx.amount) : '');
  const [date, setDate] = useState(editingTx?.date ?? defaultDate);
  const [category, setCategory] = useState(
    editingTx?.category ?? (editingTx?.type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  );
  const [note, setNote] = useState(editingTx?.note ?? '');

  if (!isOpen) return null;

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Math.max(0, parseFloat(amount) || 0);
    if (!title.trim() || numericAmount <= 0) return;
    onSave({
      type,
      title: title.trim(),
      amount: numericAmount,
      date,
      category,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editingTx ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}
    >
      <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            {editingTx ? 'แก้ไขรายการธุรกรรม' : 'เพิ่มรายการรายรับ / รายจ่าย'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory(EXPENSE_CATEGORIES[0]);
              }}
              className={`min-h-[40px] rounded-lg text-xs font-semibold transition-all ${
                type === 'expense'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              รายจ่าย
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory(INCOME_CATEGORIES[0]);
              }}
              className={`min-h-[40px] rounded-lg text-xs font-semibold transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              รายรับเพิ่ม
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อรายการ</label>
            <input
              type="text"
              required
              placeholder={type === 'expense' ? 'เช่น ค่าอาหารกลางวัน' : 'เช่น โบนัสพิเศษ'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:border-[#2F80ED] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">จำนวนเงิน (บาท)</label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-semibold text-slate-900 tabular-nums focus:border-[#2F80ED] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">วันที่</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:border-[#2F80ED] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">หมวดหมู่</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:border-[#2F80ED] focus:bg-white focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุ (ไม่บังคับ)</label>
            <input
              type="text"
              placeholder="รายละเอียดเพิ่มเติม"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:border-[#2F80ED] focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="mt-2 h-12 w-full rounded-2xl bg-[#2F80ED] text-sm font-semibold text-white hover:bg-blue-600 active:scale-[0.99]"
          >
            {editingTx ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
          </button>
        </form>
      </div>
    </div>
  );
};
