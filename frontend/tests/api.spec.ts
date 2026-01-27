import { describe, expect, it, vi } from "vitest";
import { apiGet, apiGetBlob, apiPost, apiPut } from "../src/api";

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

  it("throws on failed apiGet", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    globalThis.fetch = fetchMock as any;

    await expect(apiGet("/api/test")).rejects.toThrow("API error 404");
  });

  it("throws on failed apiGetBlob", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    globalThis.fetch = fetchMock as any;

    await expect(apiGetBlob("/api/blob")).rejects.toThrow("API error 401");
  });

  it("gets blob response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["ok"])
    });
    globalThis.fetch = fetchMock as any;

    const data = await apiGetBlob("/api/blob");
    expect(data).toBeInstanceOf(Blob);
  });

  it("posts JSON payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as any;

    await apiPost("/api/test", { ok: true });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("throws on failed apiPost", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    globalThis.fetch = fetchMock as any;

    await expect(apiPost("/api/test", { ok: true })).rejects.toThrow("API error 400");
  });

  it("prefixes base url when configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://example.com");
    vi.resetModules();
    const { apiGet: apiGetWithBase } = await import("../src/api");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    globalThis.fetch = fetchMock as any;

    await apiGetWithBase("/api/test");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.com/api/test",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });
});
