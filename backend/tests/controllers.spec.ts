import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { InMemoryDayRepository, InMemoryLedgerRepository } from "./inMemoryRepos.js";

const buildApp = () => {
  const dayRepo = new InMemoryDayRepository();
  const ledgerRepo = new InMemoryLedgerRepository();
  return { app: createApp(dayRepo, ledgerRepo), dayRepo, ledgerRepo };
};

describe("controllers", () => {
  it("gets days", async () => {
    const { app, dayRepo } = buildApp();
    dayRepo.seed([
      { date: "2026-01-05", dayType: "NORMAL", telework: false, archived: false, punches: [] }
    ]);

    const response = await request(app).get("/api/days").query({
      from: "2026-01-01",
      to: "2026-01-31"
    });

    expect(response.status).toBe(200);
    expect(response.body.days[0].date).toBe("2026-01-05");
  });

  it("updates day", async () => {
    const { app, dayRepo } = buildApp();
    const response = await request(app)
      .put("/api/days/2026-01-06")
      .send({
        type: "NORMAL",
        telework: true,
        archived: false,
        morningSegments: [{ start: "08:00", end: "09:00" }],
        afternoonSegments: [{ start: "14:00", end: "15:00" }]
      });

    expect(response.status).toBe(204);
    const days = await dayRepo.getDaysInRange("2026-01-06", "2026-01-06");
    expect(days[0].telework).toBe(true);
  });

  it("returns validation error", async () => {
    const { app } = buildApp();
    const response = await request(app).get("/api/days").query({
      from: "bad",
      to: "2026-01-31"
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation error for invalid day param", async () => {
    const { app } = buildApp();
    const response = await request(app)
      .put("/api/days/bad")
      .send({
        type: "NORMAL",
        telework: false,
        morningSegments: [],
        afternoonSegments: []
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("defaults archived to false when omitted", async () => {
    const { app, dayRepo } = buildApp();
    await request(app)
      .put("/api/days/2026-01-07")
      .send({
        type: "NORMAL",
        telework: false,
        morningSegments: [],
        afternoonSegments: []
      });

    const days = await dayRepo.getDaysInRange("2026-01-07", "2026-01-07");
    expect(days[0].archived).toBe(false);
  });

  it("returns summary", async () => {
    const { app, dayRepo } = buildApp();
    dayRepo.seed([
      { date: "2026-01-05", dayType: "SICK", telework: false, archived: false, punches: [] }
    ]);

    const response = await request(app).get("/api/summary").query({ date: "2026-01-05" });
    expect(response.status).toBe(200);
    expect(response.body.todayBalanceMinutes).toBe(0);
  });

  it("returns validation error for summary date", async () => {
    const { app } = buildApp();
    const response = await request(app).get("/api/summary").query({ date: "bad" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("exports data", async () => {
    const { app, dayRepo, ledgerRepo } = buildApp();
    dayRepo.seed([
      {
        date: "2026-01-08",
        dayType: "NORMAL",
        telework: false,
        archived: true,
        punches: []
      }
    ]);
    ledgerRepo.seed([
      { date: "2026-01-08", minutesDelta: 10, reason: "ADJUST", dayDate: null }
    ]);

    const response = await request(app).get("/api/export");
    expect(response.status).toBe(200);
    expect(response.body.days[0].archived).toBe(true);
    expect(response.body.ledgerOperations[0].reason).toBe("ADJUST");
  });

  it("handles export failures", async () => {
    const app = createApp(
      {
        getDaysInRange: async () => [],
        getDaysUpTo: async () => [],
        getAllDays: async () => {
          throw new Error("boom");
        },
        replaceAllDays: async () => {},
        archiveDays: async () => {},
        upsertDay: async () => {}
      } as any,
      {
        getOperationsUpTo: async () => [],
        getAllOperations: async () => [],
        replaceAllOperations: async () => {},
        addOperation: async () => {}
      } as any
    );

    const response = await request(app).get("/api/export");
    expect(response.status).toBe(500);
  });

  it("imports data", async () => {
    const { app, dayRepo, ledgerRepo } = buildApp();
    const response = await request(app)
      .post("/api/import")
      .send({
        days: [
          {
            date: "2026-01-09",
            dayType: "NORMAL",
            telework: false,
            archived: true,
            punches: [
              { kind: "IN", timestamp: "2026-01-09T08:00:00.000Z" },
              { kind: "OUT", timestamp: "2026-01-09T12:00:00.000Z" }
            ]
          }
        ],
        ledgerOperations: [
          { date: "2026-01-09", minutesDelta: -5, reason: "PURGE", dayDate: null }
        ]
      });

    expect(response.status).toBe(204);
    expect((await dayRepo.getAllDays())[0].archived).toBe(true);
    expect((await ledgerRepo.getAllOperations())[0].reason).toBe("PURGE");
  });

  it("returns validation error for import", async () => {
    const { app } = buildApp();
    const response = await request(app).post("/api/import").send({ days: [{ date: "bad" }] });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("archives selected days", async () => {
    const { app, dayRepo } = buildApp();
    dayRepo.seed([
      { date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, punches: [] }
    ]);

    const response = await request(app).post("/api/archive").send({ dates: ["2026-01-10"] });
    expect(response.status).toBe(204);
    expect((await dayRepo.getAllDays())[0].archived).toBe(true);
  });

  it("returns validation error for archive", async () => {
    const { app } = buildApp();
    const response = await request(app).post("/api/archive").send({ dates: [] });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });
});
