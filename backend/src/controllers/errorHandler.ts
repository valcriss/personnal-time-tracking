import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Invalid request",
      details: error.flatten()
    });
    return;
  }

  console.error("Unexpected error:", error);
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Unexpected error"
  });
};
