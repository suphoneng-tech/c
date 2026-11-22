export const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface BangkokDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  millisecond: number; // 0-999
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
}

export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export const THAI_WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const THAI_WEEKDAYS_FULL = [
  'อาทิตย์',
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
];

export function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

export function toBangkokParts(utcMs: number): BangkokDateParts {
  const shifted = new Date(utcMs + BANGKOK_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

export function bangkokDateToUtcMs(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): number {
  return Date.UTC(year, month - 1, day, hour, minute, second, millisecond) - BANGKOK_OFFSET_MS;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateKey.split('-').map((v) => parseInt(v, 10));
  return {
    year: Number.isFinite(y) ? y : 2026,
    month: Number.isFinite(m) ? m : 1,
    day: Number.isFinite(d) ? d : 1,
  };
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [y, m] = monthKey.split('-').map((v) => parseInt(v, 10));
  return {
    year: Number.isFinite(y) ? y : 2026,
    month: Number.isFinite(m) ? m : 1,
  };
}

export function getBangkokDateKey(utcMs: number): string {
  const p = toBangkokParts(utcMs);
  return formatDateKey(p.year, p.month, p.day);
}

export function getBangkokMonthKey(utcMs: number): string {
  const p = toBangkokParts(utcMs);
  return formatMonthKey(p.year, p.month);
}

export function parseBangkokDateTimeToUtcMs(isoLocal: string): number {
  const [datePart, timePart = '00:00:00'] = isoLocal.split('T');
  const { year, month, day } = parseDateKey(datePart);
  const [hh = 0, mm = 0, ss = 0] = timePart.split(':').map((v) => parseInt(v, 10) || 0);
  return bangkokDateToUtcMs(year, month, day, hh, mm, ss, 0);
}

export function formatUtcMsToBangkokDateTimeLocal(utcMs: number): string {
  const p = toBangkokParts(utcMs);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

export function formatBangkokClockString(utcMs: number): string {
  const p = toBangkokParts(utcMs);
  return `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

export function formatThaiFullDate(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `วัน${THAI_WEEKDAYS_FULL[dow]}ที่ ${day} ${THAI_MONTHS[month - 1]} ${year + 543}`;
}

export function formatDisplayDateTime(isoLocal: string): string {
  const [datePart, timePart = '00:00:00'] = isoLocal.split('T');
  const { year, month, day } = parseDateKey(datePart);
  return `${pad2(day)}/${pad2(month)}/${year} ${timePart.slice(0, 8)}`;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (((total % 12) + 12) % 12) + 1;
  return { year: nextYear, month: nextMonth };
}

export function getFirstDayOfWeekInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

export function getDayOfWeekFromDateKey(dateKey: string): number {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
