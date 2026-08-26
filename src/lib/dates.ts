import { format, parseISO, startOfMonth } from "date-fns";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: string): boolean {
  return DATE_RE.test(value);
}

export function todayKey(now = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

export function addDaysKey(dateKey: string, amount: number): string {
  const date = parseISO(dateKey);
  date.setDate(date.getDate() + amount);
  return format(date, "yyyy-MM-dd");
}

export function monthKey(dateKey: string): string {
  return format(startOfMonth(parseISO(dateKey)), "yyyy-MM");
}

export function startOfIsoWeek(dateKey: string): string {
  const date = parseISO(dateKey);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return format(date, "yyyy-MM-dd");
}

export function startOfCalendarMonth(dateKey: string): string {
  return format(startOfMonth(parseISO(dateKey)), "yyyy-MM-dd");
}

export function localDateFromRequest(request: Request): string {
  const header = request.headers.get("x-local-date");
  if (header && isDateKey(header)) return header;
  return todayKey();
}
