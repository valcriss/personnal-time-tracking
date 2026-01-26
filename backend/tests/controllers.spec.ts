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
      { date: "2026-01-05", dayType: "NORMAL", telework: false, punches: [] }
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

  it("returns summary", async () => {
    const { app, dayRepo } = buildApp();
    dayRepo.seed([
      { date: "2026-01-05", dayType: "SICK", telework: false, punches: [] }
    ]);

    const response = await request(app).get("/api/summary").query({ date: "2026-01-05" });
    expect(response.status).toBe(200);
    expect(response.body.todayBalanceMinutes).toBe(0);
  });
});
