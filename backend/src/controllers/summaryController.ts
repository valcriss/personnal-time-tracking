import { Router } from "express";
import { z } from "zod";
import type { DayRepository } from "../repositories/DayRepository.js";
import type { LedgerRepository } from "../repositories/LedgerRepository.js";
import { getSummary } from "../usecases/getSummary.js";

export const createSummaryController = (
  dayRepo: DayRepository,
  ledgerRepo: LedgerRepository
) => {
  const router = Router();

  router.get("/summary", async (req, res, next) => {
    try {
      const querySchema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      });
      const { date } = querySchema.parse(req.query);
      const summary = await getSummary(dayRepo, ledgerRepo, date);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
