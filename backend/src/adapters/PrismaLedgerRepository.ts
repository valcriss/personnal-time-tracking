import type { LedgerRepository, LedgerOperationRecord } from "../repositories/LedgerRepository.js";
import { dateToUtc, utcDateToDateString } from "../domain/dateUtils.js";
import { prisma } from "../infra/prismaClient.js";

export class PrismaLedgerRepository implements LedgerRepository {
  async getOperationsUpTo(date: string): Promise<LedgerOperationRecord[]> {
    const operations = await prisma.ledgerOperation.findMany({
      where: {
        date: {
          lte: dateToUtc(date)
        }
      },
      orderBy: { date: "asc" }
    });

    return operations.map((operation) => ({
      date: utcDateToDateString(operation.date),
      minutesDelta: operation.minutesDelta,
      reason: operation.reason,
      dayDate: null
    }));
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
