import { describe, expect, it, vi } from "vitest";
import { PrismaDayRepository } from "../src/adapters/PrismaDayRepository.js";
import { PrismaLedgerRepository } from "../src/adapters/PrismaLedgerRepository.js";

vi.mock("../src/infra/prismaClient.js", () => {
  return {
    prisma: {
      day: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn()
      },
      ledgerOperation: {
        findMany: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn()
      },
      $transaction: vi.fn()
    }
  };
});

const prismaMock = (await import("../src/infra/prismaClient.js")).prisma as {
  day: { findMany: any; upsert: any; updateMany: any; deleteMany: any; create: any };
  ledgerOperation: { findMany: any; create: any; deleteMany: any };
  $transaction: any;
};

describe("Prisma repositories", () => {
  prismaMock.$transaction.mockImplementation(async (callback: any) =>
    callback({
      day: prismaMock.day,
      ledgerOperation: prismaMock.ledgerOperation
    })
  );

  it("maps day records", async () => {
    prismaMock.day.findMany.mockResolvedValueOnce([
      {
        date: new Date(Date.UTC(2026, 0, 10)),
        type: "NORMAL",
        telework: true,
        archived: false,
        punches: [{ kind: "IN", timestamp: new Date(Date.UTC(2026, 0, 10, 8, 0)) }]
      }
    ]);

    const repo = new PrismaDayRepository();
    const result = await repo.getDaysInRange("2026-01-10", "2026-01-10");
    expect(result[0].date).toBe("2026-01-10");
    expect(prismaMock.day.findMany).toHaveBeenCalled();
  });

  it("maps days up to date", async () => {
    prismaMock.day.findMany.mockResolvedValueOnce([
      {
        date: new Date(Date.UTC(2026, 0, 9)),
        type: "NORMAL",
        telework: false,
        archived: false,
        punches: [{ kind: "IN", timestamp: new Date(Date.UTC(2026, 0, 9, 9, 0)) }]
      }
    ]);

    const repo = new PrismaDayRepository();
    const result = await repo.getDaysUpTo("2026-01-10");
    expect(result[0].date).toBe("2026-01-09");
    expect(prismaMock.day.findMany).toHaveBeenCalled();
  });

  it("maps all days", async () => {
    prismaMock.day.findMany.mockResolvedValueOnce([
      {
        date: new Date(Date.UTC(2026, 0, 8)),
        type: "NORMAL",
        telework: false,
        archived: true,
        punches: [{ kind: "IN", timestamp: new Date(Date.UTC(2026, 0, 8, 8, 0)) }]
      }
    ]);

    const repo = new PrismaDayRepository();
    const result = await repo.getAllDays();
    expect(result[0].archived).toBe(true);
    expect(prismaMock.day.findMany).toHaveBeenCalled();
  });

  it("upserts day with punches", async () => {
    const repo = new PrismaDayRepository();
    await repo.upsertDay({
      date: "2026-01-12",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      punches: [{ kind: "IN", timestamp: new Date(Date.UTC(2026, 0, 12, 8, 0)) }]
    });
    expect(prismaMock.day.upsert).toHaveBeenCalled();
  });

  it("replaces all days", async () => {
    const repo = new PrismaDayRepository();
    await repo.replaceAllDays([
      {
        date: "2026-01-01",
        dayType: "NORMAL",
        telework: false,
        archived: false,
        punches: [{ kind: "IN", timestamp: new Date(Date.UTC(2026, 0, 1, 8, 0)) }]
      }
    ]);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.day.deleteMany).toHaveBeenCalled();
    expect(prismaMock.day.create).toHaveBeenCalled();
  });

  it("archives days when dates provided", async () => {
    const repo = new PrismaDayRepository();
    await repo.archiveDays(["2026-01-03"]);
    expect(prismaMock.day.updateMany).toHaveBeenCalled();
  });

  it("skips archive when dates list empty", async () => {
    prismaMock.day.updateMany.mockClear();
    const repo = new PrismaDayRepository();
    await repo.archiveDays([]);
    expect(prismaMock.day.updateMany).not.toHaveBeenCalled();
  });

  it("maps ledger operations", async () => {
    prismaMock.ledgerOperation.findMany.mockResolvedValueOnce([
      {
        date: new Date(Date.UTC(2026, 0, 1)),
        minutesDelta: 10,
        reason: "ADJUST",
        dayId: null
      }
    ]);

    const repo = new PrismaLedgerRepository();
    const result = await repo.getOperationsUpTo("2026-01-01");
    expect(result[0].reason).toBe("ADJUST");
    expect(prismaMock.ledgerOperation.findMany).toHaveBeenCalled();
  });

  it("maps all ledger operations", async () => {
    prismaMock.ledgerOperation.findMany.mockResolvedValueOnce([
      {
        date: new Date(Date.UTC(2026, 0, 2)),
        minutesDelta: -10,
        reason: "PURGE",
        dayId: null
      }
    ]);

    const repo = new PrismaLedgerRepository();
    const result = await repo.getAllOperations();
    expect(result[0].minutesDelta).toBe(-10);
  });

  it("replaces all ledger operations", async () => {
    const repo = new PrismaLedgerRepository();
    await repo.replaceAllOperations([
      { date: "2026-01-02", minutesDelta: 5, reason: "ADJUST", dayDate: null }
    ]);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.ledgerOperation.deleteMany).toHaveBeenCalled();
    expect(prismaMock.ledgerOperation.create).toHaveBeenCalled();
  });

  it("creates ledger operation", async () => {
    const repo = new PrismaLedgerRepository();
    await repo.addOperation({
      date: "2026-01-02",
      minutesDelta: -5,
      reason: "PURGE",
      dayDate: null
    });
    expect(prismaMock.ledgerOperation.create).toHaveBeenCalled();
  });
});
