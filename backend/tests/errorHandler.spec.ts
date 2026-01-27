import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/controllers/errorHandler.js";

const buildRes = () => {
  const res: any = {};
  res.statusCode = 0;
  res.body = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: unknown) => {
    res.body = payload;
    return res;
  };
  return res;
};

describe("errorHandler", () => {
  it("returns internal error for unknown errors", () => {
    const res = buildRes();
    const next = vi.fn();
    errorHandler(new Error("boom"), {} as any, res, next as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe("INTERNAL_ERROR");
    expect(next).not.toHaveBeenCalled();
  });
});
