import { describe, expect, it } from "vitest";
import { prisma } from "../src/infra/prismaClient.js";

describe("prisma client", () => {
  it("creates prisma client instance", async () => {
    expect(prisma).toBeTruthy();
    if (typeof prisma.$disconnect === "function") {
      await prisma.$disconnect();
    }
  });
});
