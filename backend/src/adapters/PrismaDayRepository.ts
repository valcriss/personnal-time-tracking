import type { DayType, PunchKind } from "../domain/types.js";
import type { Prisma } from "@prisma/client";
import type { DayRepository, DayRecord } from "../repositories/DayRepository.js";
import { dateToUtc, utcDateToDateString } from "../domain/dateUtils.js";
import { prisma } from "../infra/prismaClient.js";

type DayWithPunches = {
  date: Date;
  type: DayType;
  telework: boolean;
  archived: boolean;
  punches: Array<{
    kind: PunchKind;
    timestamp: Date;
  }>;
};

export class PrismaDayRepository implements DayRepository {
  async getDaysInRange(from: string, to: string): Promise<DayRecord[]> {
    const days = (await prisma.day.findMany({
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
    })) as DayWithPunches[];

    return days.map((day) => ({
      date: utcDateToDateString(day.date),
      dayType: day.type,
      telework: day.telework,
      archived: day.archived,
      punches: day.punches.map((punch: DayWithPunches["punches"][number]) => ({
        kind: punch.kind,
        timestamp: punch.timestamp
      }))
    }));
  }

  async getDaysUpTo(date: string): Promise<DayRecord[]> {
    const days = (await prisma.day.findMany({
      where: {
        date: {
          lte: dateToUtc(date)
        }
      },
      include: {
        punches: true
      },
      orderBy: { date: "asc" }
    })) as DayWithPunches[];

    return days.map((day) => ({
      date: utcDateToDateString(day.date),
      dayType: day.type,
      telework: day.telework,
      archived: day.archived,
      punches: day.punches.map((punch: DayWithPunches["punches"][number]) => ({
        kind: punch.kind,
        timestamp: punch.timestamp
      }))
    }));
  }

  async getAllDays(): Promise<DayRecord[]> {
    const days = (await prisma.day.findMany({
      include: {
        punches: true
      },
      orderBy: { date: "asc" }
    })) as DayWithPunches[];

    return days.map((day) => ({
      date: utcDateToDateString(day.date),
      dayType: day.type,
      telework: day.telework,
      archived: day.archived,
      punches: day.punches.map((punch: DayWithPunches["punches"][number]) => ({
        kind: punch.kind,
        timestamp: punch.timestamp
      }))
    }));
  }

  async replaceAllDays(records: DayRecord[]): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.day.deleteMany();
      for (const record of records) {
        await tx.day.create({
          data: {
            date: dateToUtc(record.date),
            type: record.dayType,
            telework: record.telework,
            archived: record.archived,
            punches: {
              create: record.punches.map((punch) => ({
                kind: punch.kind,
                timestamp: punch.timestamp
              }))
            }
          }
        });
      }
    });
  }

  async archiveDays(dates: string[]): Promise<void> {
    if (!dates.length) return;
    await prisma.day.updateMany({
      where: {
        date: { in: dates.map((date) => dateToUtc(date)) }
      },
      data: { archived: true }
    });
  }

  async upsertDay(record: DayRecord): Promise<void> {
    const date = dateToUtc(record.date);
    await prisma.day.upsert({
      where: { date },
      create: {
        date,
        type: record.dayType,
        telework: record.telework,
        archived: record.archived,
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
        archived: record.archived,
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
