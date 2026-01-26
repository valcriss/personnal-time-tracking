import express from "express";
import cors from "cors";
import type { DayRepository } from "./repositories/DayRepository.js";
import type { LedgerRepository } from "./repositories/LedgerRepository.js";
import { createDaysController } from "./controllers/daysController.js";
import { createSummaryController } from "./controllers/summaryController.js";
import { errorHandler } from "./controllers/errorHandler.js";

export const createApp = (dayRepo: DayRepository, ledgerRepo: LedgerRepository) => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api", createDaysController(dayRepo));
  app.use("/api", createSummaryController(dayRepo, ledgerRepo));

  app.use(errorHandler);
  return app;
};
