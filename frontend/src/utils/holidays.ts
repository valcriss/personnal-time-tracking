import { addDays, formatDate } from "./date";

const easterSunday = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

export const getFrenchHolidays = (year: number) => {
  const holidays = new Set<string>();

  const addFixed = (month: number, day: number) => {
    holidays.add(formatDate(new Date(year, month - 1, day)));
  };

  addFixed(1, 1); // New Year's Day
  addFixed(5, 1); // Labour Day
  addFixed(5, 8); // Victory 1945
  addFixed(7, 14); // National Day
  addFixed(8, 15); // Assumption
  addFixed(11, 1); // All Saints
  addFixed(11, 11); // Armistice
  addFixed(12, 25); // Christmas

  const easter = easterSunday(year);
  holidays.add(formatDate(addDays(easter, 1))); // Easter Monday
  holidays.add(formatDate(addDays(easter, 39))); // Ascension
  holidays.add(formatDate(addDays(easter, 50))); // Whit Monday

  return holidays;
};
