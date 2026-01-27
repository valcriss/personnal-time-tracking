import { Router } from "express";
import { z } from "zod";
import type { DayRepository } from "../repositories/DayRepository.js";
import type { LedgerRepository } from "../repositories/LedgerRepository.js";
import { importData } from "../usecases/importData.js";

const dayTypeSchema = z.enum([
  "NORMAL",
  "SICK",
  "TRIP",
  "VACATION",
  "HOLIDAY",
  "RTT",
  "OTHER"
]);

const punchSchema = z.object({
  kind: z.enum(["IN", "OUT"]),
  timestamp: z.string()
});

const daySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayType: dayTypeSchema,
  telework: z.boolean(),
  archived: z.boolean().optional(),
  punches: z.array(punchSchema).default([])
});

const ledgerOperationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutesDelta: z.number().int(),
  reason: z.string(),
  dayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
});

const importSchema = z.object({
  days: z.array(daySchema),
  ledgerOperations: z.array(ledgerOperationSchema).optional()
});

export const createImportController = (
  dayRepo: DayRepository,
  ledgerRepo: LedgerRepository
) => {
  const router = Router();

  router.post("/import", async (req, res, next) => {
    try {
      const payload = importSchema.parse(req.body);
      await importData(dayRepo, ledgerRepo, payload);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
