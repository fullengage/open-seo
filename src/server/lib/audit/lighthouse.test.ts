import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/r2", () => ({
  putTextToR2: vi.fn(),
}));

import { fetchLighthouseResult, selectLighthouseSample } from "./lighthouse";

const okPage = (url: string) => ({
  url,
  statusCode: 200,
  fetchClass: "ok" as const,
});

describe("selectLighthouseSample", () => {
  it("does not spend checks on a bot challenge that answered 200", () => {
    const selected = selectLighthouseSample(
      [
        { ...okPage("https://example.com/"), fetchClass: "blocked" },
        okPage("https://example.com/about"),
      ],
      "https://example.com/",
      "auto",
    );

    expect(selected).toEqual(["https://example.com/about"]);
  });

  it("includes a start page reached through a trailing-slash redirect", () => {
    const pages = [
      ...Array.from({ length: 10 }, (_, index) =>
        okPage(`https://example.com/section${index}`),
      ),
      okPage("https://example.com/services/"),
    ];

    const selected = selectLighthouseSample(
      pages,
      "https://example.com/services",
      "auto",
    );

    expect(selected).toHaveLength(10);
    expect(selected[0]).toBe("https://example.com/services/");
  });

  it("prefers an exact start page when both slash forms return 2xx", () => {
    const selected = selectLighthouseSample(
      [
        okPage("https://example.com/services/"),
        okPage("https://example.com/services"),
      ],
      "https://example.com/services",
      "auto",
    );

    expect(selected[0]).toBe("https://example.com/services");
  });

  it("does not sample another page from the start page's template", () => {
    const selected = selectLighthouseSample(
      [
        okPage("https://example.com/products/123"),
        okPage("https://example.com/products/456"),
        okPage("https://example.com/about"),
      ],
      "https://example.com/products/123",
      "auto",
    );

    expect(selected).toEqual([
      "https://example.com/products/123",
      "https://example.com/about",
    ]);
  });
});

describe("fetchLighthouseResult", () => {
  const billingCustomer = {
    userId: "user-1",
    userEmail: "test@example.com",
    organizationId: "org-1",
  };

  it("handles fetch failure gracefully", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("network error"));

    const fetched = await fetchLighthouseResult(
      "https://example.com/",
      "page-1",
      "desktop",
      billingCustomer,
    );

    expect(fetched.result.errorMessage).toBe("Lighthouse requires PAGESPEED_API_KEY.");
    globalThis.fetch = originalFetch;
  });

  it("successfully parses PageSpeed API response", async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GOOGLE_PAGESPEED_API_KEY;
    process.env.GOOGLE_PAGESPEED_API_KEY = "test-key";

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lighthouseResult: {
          requestedUrl: "https://example.com/",
          finalDisplayedUrl: "https://example.com/",
          categories: {
            performance: { score: 0.95 },
            accessibility: { score: 0.9 },
            "best-practices": { score: 0.88 },
            seo: { score: 1 },
          },
          audits: {
            "largest-contentful-paint": { numericValue: 1200 },
            "cumulative-layout-shift": { numericValue: 0.02 },
            "interaction-to-next-paint": { numericValue: 80 },
            "server-response-time": { numericValue: 150 },
          },
        },
      }),
    });

    const fetched = await fetchLighthouseResult(
      "https://example.com/",
      "page-1",
      "desktop",
      billingCustomer,
    );

    expect(fetched.result.performanceScore).toBe(95);
    expect(fetched.result.accessibilityScore).toBe(90);
    expect(fetched.result.bestPracticesScore).toBe(88);
    expect(fetched.result.seoScore).toBe(100);
    expect(fetched.result.lcpMs).toBe(1200);
    expect(fetched.result.cls).toBe(0.02);
    expect(fetched.payloadJson).toBeDefined();

    globalThis.fetch = originalFetch;
    process.env.GOOGLE_PAGESPEED_API_KEY = originalKey;
  });
});

