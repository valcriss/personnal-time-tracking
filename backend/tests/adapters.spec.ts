import { describe, expect, it, vi } from "vitest";
import { PrismaDayRepository } from "../src/adapters/PrismaDayRepository.js";
import { PrismaLedgerRepository } from "../src/adapters/PrismaLedgerRepository.js";

vi.mock("../src/infra/prismaClient.js", () => {
  return {
    prisma: {
      day: {
        findMany: vi.fn(),
        upsert: vi.fn()
      },
      ledgerOperation: {
        findMany: vi.fn(),
        create: vi.fn()
      }
    }
  };
});

const prismaMock = (await import("../src/infra/prismaClient.js")).prisma as {
  day: { findMany: any; upsert: any };
  ledgerOperation: { findMany: any; create: any };
};

describe("Prisma repositories", () => {
  it("maps day records", async () => {
    prismaMock.day.findMany.mockResolvedValueOnce([
      {
        date: new Date(Date.UTC(2026, 0, 10)),
        type: "NORMAL",
        telework: true,
        punches: [{ kind: "IN", timestamp: new Date(Date.UTC(2026, 0, 10, 8, 0)) }]
      }
    ]);

    const repo = new PrismaDayRepository();
    const result = await repo.getDaysInRange("2026-01-10", "2026-01-10");
    expect(result[0].date).toBe("2026-01-10");
    expect(prismaMock.day.findMany).toHaveBeenCalled();
  });

  it("upserts day with punches", async () => {
    const repo = new PrismaDayRepository();
    await repo.upsertDay({
      date: "2026-01-12",
      dayType: "NORMAL",
      telework: false,
      punches: [{ kind: "IN", timestamp: new Date(Date.UTC(2026, 0, 12, 8, 0)) }]
    });
    expect(prismaMock.day.upsert).toHaveBeenCalled();
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
