import { DateTime } from "luxon";

export const DATE_FORMAT = "yyyy-LL-dd";
const ZONE = "Europe/Paris";

export const parseDate = (date: string) => DateTime.fromFormat(date, DATE_FORMAT, { zone: ZONE });

export const formatDate = (date: DateTime) => date.toFormat(DATE_FORMAT);

export const dateToUtc = (date: string) => parseDate(date).startOf("day").toUTC().toJSDate();

export const minutesToUtcDate = (date: string, minutes: number) => {
  const local = parseDate(date).startOf("day").plus({ minutes });
  return local.toUTC().toJSDate();
};

export const utcToMinutes = (date: Date) => {
  const local = DateTime.fromJSDate(date, { zone: "utc" }).setZone(ZONE);
  return local.hour * 60 + local.minute;
};

export const utcDateToDateString = (date: Date) =>
  DateTime.fromJSDate(date, { zone: "utc" }).setZone(ZONE).toFormat(DATE_FORMAT);

export const addDays = (date: string, days: number) => formatDate(parseDate(date).plus({ days }));

export const isSameOrBefore = (date: string, target: string) =>
  parseDate(date) <= parseDate(target);

export const isSameOrAfter = (date: string, target: string) =>
  parseDate(date) >= parseDate(target);

export const listPurgeDates = (from: string, to: string) => {
  const dates: string[] = [];
  let cursor = parseDate(from).startOf("day");
  const end = parseDate(to).startOf("day");
  while (cursor <= end) {
    if ((cursor.month === 1 && cursor.day === 1) || (cursor.month === 7 && cursor.day === 1)) {
      dates.push(formatDate(cursor));
    }
    cursor = cursor.plus({ days: 1 });
  }
  return dates;
};
