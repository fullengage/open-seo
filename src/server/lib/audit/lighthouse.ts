import { detectUrlTemplate, canonicalUrlKey } from "./url-utils";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import type { LighthouseResult, LighthouseStrategy } from "./types";
import type { PageFetchClass } from "@/shared/audit-fetch-class";
import { putTextToR2 } from "@/server/lib/r2";

interface LighthouseSamplePage {
  url: string;
  statusCode: number;
  fetchClass: PageFetchClass;
}

function canonicalUrlKeyWithoutTrailingSlash(url: string): string {
  const parsed = new URL(canonicalUrlKey(url));
  if (parsed.pathname !== "/") {
    parsed.pathname = parsed.pathname.replace(/\/$/, "");
  }
  return parsed.toString();
}

type LighthouseFetchResult = {
  result: LighthouseResult;
  payloadJson: string | null;
};

/** A check that produced no payload — provider error, or a failed fetch step. */
export function failedLighthouseFetch(
  url: string,
  pageId: string,
  strategy: "mobile" | "desktop",
  errorMessage: string,
): LighthouseFetchResult {
  return {
    result: {
      url,
      pageId,
      strategy,
      performanceScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      seoScore: null,
      lcpMs: null,
      cls: null,
      inpMs: null,
      ttfbMs: null,
      errorMessage,
    },
    payloadJson: null,
  };
}

export async function fetchLighthouseResult(
  url: string,
  pageId: string,
  strategy: "mobile" | "desktop",
  billingCustomer: BillingCustomerContext,
): Promise<LighthouseFetchResult> {
  const apiKey =
    process.env.GOOGLE_PAGESPEED_API_KEY ||
    process.env.PAGESPEED_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (apiKey) {
    try {
      const apiUrl = new URL(
        "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
      );
      apiUrl.searchParams.set("url", url);
      apiUrl.searchParams.set("strategy", strategy.toUpperCase());
      apiUrl.searchParams.append("category", "PERFORMANCE");
      apiUrl.searchParams.append("category", "SEO");
      apiUrl.searchParams.append("category", "ACCESSIBILITY");
      apiUrl.searchParams.append("category", "BEST_PRACTICES");
      apiUrl.searchParams.set("key", apiKey);

      const response = await fetch(apiUrl.toString(), {
        signal: AbortSignal.timeout(60_000),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          lighthouseResult?: {
            categories?: {
              performance?: { score: number | null };
              accessibility?: { score: number | null };
              "best-practices"?: { score: number | null };
              seo?: { score: number | null };
            };
            audits?: Record<string, { numericValue?: number | null }>;
          };
        };

        const lh = data.lighthouseResult;
        if (lh?.categories) {
          const perf =
            lh.categories.performance?.score != null
              ? Math.round(lh.categories.performance.score * 100)
              : null;
          const a11y =
            lh.categories.accessibility?.score != null
              ? Math.round(lh.categories.accessibility.score * 100)
              : null;
          const bp =
            lh.categories["best-practices"]?.score != null
              ? Math.round(lh.categories["best-practices"].score * 100)
              : null;
          const seo =
            lh.categories.seo?.score != null
              ? Math.round(lh.categories.seo.score * 100)
              : null;

          const lcp =
            lh.audits?.["largest-contentful-paint"]?.numericValue ?? null;
          const cls =
            lh.audits?.["cumulative-layout-shift"]?.numericValue ?? null;
          const inp =
            lh.audits?.["interaction-to-next-paint"]?.numericValue ?? null;
          const ttfb =
            lh.audits?.["server-response-time"]?.numericValue ?? null;

          return {
            result: {
              url,
              pageId,
              strategy,
              performanceScore: perf,
              accessibilityScore: a11y,
              bestPracticesScore: bp,
              seoScore: seo,
              lcpMs: lcp,
              cls,
              inpMs: inp,
              ttfbMs: ttfb,
            },
            payloadJson: JSON.stringify(data),
          };
        }
      }
    } catch (err) {
      console.warn(
        `[PageSpeed API] Failed for ${url} (${strategy}):`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return failedLighthouseFetch(
    url,
    pageId,
    strategy,
    "Lighthouse requires PAGESPEED_API_KEY.",
  );
}

export async function storeLighthouseResult(input: {
  projectId: string;
  auditId: string;
  fetched: LighthouseFetchResult;
}): Promise<LighthouseResult> {
  if (!input.fetched.payloadJson) {
    return input.fetched.result;
  }

  const { pageId, strategy } = input.fetched.result;
  const key = `site-audit/${input.projectId}/${input.auditId}/${pageId}-${strategy}.json`;
  const uploaded = await putTextToR2(key, input.fetched.payloadJson);

  return {
    ...input.fetched.result,
    r2Key: uploaded.key,
    payloadSizeBytes: uploaded.sizeBytes,
  };
}

/**
 * Select which pages to run Lighthouse on, based on the chosen strategy.
 */
export function selectLighthouseSample(
  pages: LighthouseSamplePage[],
  startUrl: string,
  strategy: LighthouseStrategy,
): string[] {
  if (strategy === "none") return [];

  // Only consider pages that loaded successfully. A bot challenge can answer
  // 200, and a paid Lighthouse check of it measures the challenge.
  const validPages = pages.filter(
    (p) => p.statusCode >= 200 && p.statusCode < 300 && p.fetchClass === "ok",
  );

  // strategy === "auto": homepage + 1 per URL pattern, capped at 10
  const selected = new Set<string>();

  // Always include the start URL / homepage. Prefer an exact canonical match
  // so distinct 2xx `/path` and `/path/` pages stay distinct, then tolerate a
  // trailing-slash redirect when the exact start URL was not crawled as 2xx.
  const startKey = canonicalUrlKey(startUrl);
  const startPage =
    validPages.find((p) => canonicalUrlKey(p.url) === startKey) ??
    validPages.find(
      (p) =>
        canonicalUrlKeyWithoutTrailingSlash(p.url) ===
        canonicalUrlKeyWithoutTrailingSlash(startUrl),
    );
  if (startPage) selected.add(startPage.url);

  // Group by URL template pattern
  const templateGroups = new Map<string, LighthouseSamplePage>();
  if (startPage) {
    templateGroups.set(
      detectUrlTemplate(new URL(startPage.url).pathname),
      startPage,
    );
  }
  for (const page of validPages) {
    if (selected.has(page.url)) continue;
    const template = detectUrlTemplate(new URL(page.url).pathname);
    if (!templateGroups.has(template)) {
      templateGroups.set(template, page);
    }
  }

  // Add one page per template group
  for (const [, page] of templateGroups) {
    if (selected.size >= 10) break;
    selected.add(page.url);
  }

  return Array.from(selected);
}
