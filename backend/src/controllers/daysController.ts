import { Router } from "express";
import { z } from "zod";
import { getDays } from "../usecases/getDays.js";
import { updateDay } from "../usecases/updateDay.js";
import type { DayRepository } from "../repositories/DayRepository.js";

const dayTypeSchema = z.enum(["NORMAL", "SICK", "TRIP", "VACATION"]);

const segmentSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/)
});

const updateSchema = z.object({
  type: dayTypeSchema,
  telework: z.boolean(),
  morningSegments: z.array(segmentSchema),
  afternoonSegments: z.array(segmentSchema)
});

export const createDaysController = (repo: DayRepository) => {
  const router = Router();

  router.get("/days", async (req, res, next) => {
    try {
      const querySchema = z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      });
      const { from, to } = querySchema.parse(req.query);
      const days = await getDays(repo, from, to);
      res.json({ days });
    } catch (error) {
      next(error);
    }
  });

  router.put("/days/:date", async (req, res, next) => {
    try {
      const paramsSchema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      });
      const { date } = paramsSchema.parse(req.params);
      const body = updateSchema.parse(req.body);
      await updateDay(repo, {
        date,
        dayType: body.type,
        telework: body.telework,
        morningSegments: body.morningSegments,
        afternoonSegments: body.afternoonSegments
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
