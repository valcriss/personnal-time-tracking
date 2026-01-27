import { Router } from "express";
import type { DayRepository } from "../repositories/DayRepository.js";
import type { LedgerRepository } from "../repositories/LedgerRepository.js";
import { exportData } from "../usecases/exportData.js";

export const createExportController = (
  dayRepo: DayRepository,
  ledgerRepo: LedgerRepository
) => {
  const router = Router();

  router.get("/export", async (_req, res, next) => {
    try {
      const data = await exportData(dayRepo, ledgerRepo);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
