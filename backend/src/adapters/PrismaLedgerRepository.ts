import type { LedgerRepository, LedgerOperationRecord } from "../repositories/LedgerRepository.js";
import { dateToUtc, utcDateToDateString } from "../domain/dateUtils.js";
import { prisma } from "../infra/prismaClient.js";

type LedgerOperationRow = {
  date: Date;
  minutesDelta: number;
  reason: string;
};

export class PrismaLedgerRepository implements LedgerRepository {
  async getOperationsUpTo(date: string): Promise<LedgerOperationRecord[]> {
    const operations = (await prisma.ledgerOperation.findMany({
      where: {
        date: {
          lte: dateToUtc(date)
        }
      },
      orderBy: { date: "asc" }
    })) as LedgerOperationRow[];

    return operations.map((operation: LedgerOperationRow) => ({
      date: utcDateToDateString(operation.date),
      minutesDelta: operation.minutesDelta,
      reason: operation.reason,
      dayDate: null
    }));
  }

  async getAllOperations(): Promise<LedgerOperationRecord[]> {
    const operations = (await prisma.ledgerOperation.findMany({
      orderBy: { date: "asc" }
    })) as LedgerOperationRow[];

    return operations.map((operation: LedgerOperationRow) => ({
      date: utcDateToDateString(operation.date),
      minutesDelta: operation.minutesDelta,
      reason: operation.reason,
      dayDate: null
    }));
  }

  async replaceAllOperations(records: LedgerOperationRecord[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.ledgerOperation.deleteMany();
      for (const record of records) {
        await tx.ledgerOperation.create({
          data: {
            date: dateToUtc(record.date),
            minutesDelta: record.minutesDelta,
            reason: record.reason,
            dayId: null
          }
        });
      }
    });
  }

  async addOperation(record: LedgerOperationRecord): Promise<void> {
    await prisma.ledgerOperation.create({
      data: {
        date: dateToUtc(record.date),
        minutesDelta: record.minutesDelta,
        reason: record.reason,
        dayId: null
      }
    });
  }
}
