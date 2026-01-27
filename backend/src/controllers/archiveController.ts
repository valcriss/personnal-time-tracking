import { Router } from "express";
import { z } from "zod";
import type { DayRepository } from "../repositories/DayRepository.js";
import { archiveDays } from "../usecases/archiveDays.js";

const archiveSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1)
});

export const createArchiveController = (repo: DayRepository) => {
  const router = Router();

  router.post("/archive", async (req, res, next) => {
    try {
      const body = archiveSchema.parse(req.body);
      await archiveDays(repo, body.dates);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
