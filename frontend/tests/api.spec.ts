import { describe, expect, it, vi } from "vitest";
import { apiGet, apiPut } from "../src/api";

describe("api", () => {
  it("gets JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    globalThis.fetch = fetchMock as any;

    const data = await apiGet<{ ok: boolean }>("/api/test");
    expect(data.ok).toBe(true);
  });

  it("throws on failed response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    globalThis.fetch = fetchMock as any;

    await expect(apiPut("/api/test", {})).rejects.toThrow("API error 500");
  });
});
