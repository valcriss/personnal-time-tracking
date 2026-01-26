import type { DayRepository, DayRecord } from "../repositories/DayRepository.js";
import { dateToUtc, utcDateToDateString } from "../domain/dateUtils.js";
import { prisma } from "../infra/prismaClient.js";

export class PrismaDayRepository implements DayRepository {
  async getDaysInRange(from: string, to: string): Promise<DayRecord[]> {
    const days = await prisma.day.findMany({
      where: {
        date: {
          gte: dateToUtc(from),
          lte: dateToUtc(to)
        }
      },
      include: {
        punches: true
      },
      orderBy: { date: "asc" }
    });

    return days.map((day) => ({
      date: utcDateToDateString(day.date),
      dayType: day.type,
      telework: day.telework,
      punches: day.punches.map((punch) => ({
        kind: punch.kind,
        timestamp: punch.timestamp
      }))
    }));
  }

  async getDaysUpTo(date: string): Promise<DayRecord[]> {
    const days = await prisma.day.findMany({
      where: {
        date: {
          lte: dateToUtc(date)
        }
      },
      include: {
        punches: true
      },
      orderBy: { date: "asc" }
    });

    return days.map((day) => ({
      date: utcDateToDateString(day.date),
      dayType: day.type,
      telework: day.telework,
      punches: day.punches.map((punch) => ({
        kind: punch.kind,
        timestamp: punch.timestamp
      }))
    }));
  }

  async upsertDay(record: DayRecord): Promise<void> {
    const date = dateToUtc(record.date);
    await prisma.day.upsert({
      where: { date },
      create: {
        date,
        type: record.dayType,
        telework: record.telework,
        punches: {
          create: record.punches.map((punch) => ({
            kind: punch.kind,
            timestamp: punch.timestamp
          }))
        }
      },
      update: {
        type: record.dayType,
        telework: record.telework,
        punches: {
          deleteMany: {},
          create: record.punches.map((punch) => ({
            kind: punch.kind,
            timestamp: punch.timestamp
          }))
        }
      }
    });
  }
}
