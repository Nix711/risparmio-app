import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  format,
  getMonth,
  getYear,
} from "date-fns";
import { it } from "date-fns/locale";

export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

export function getMonthRange(
  month: number,
  year: number
): { start: Date; end: Date } {
  const date = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function getWeeksOfMonth(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy", { locale: it });
}

export function getCurrentMonth(): number {
  return getMonth(new Date()) + 1;
}

export function getCurrentYear(): number {
  return getYear(new Date());
}

export function getWeekLabel(date: Date): string {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(weekStart, "d", { locale: it })}-${format(weekEnd, "d MMM", { locale: it })}`;
}
