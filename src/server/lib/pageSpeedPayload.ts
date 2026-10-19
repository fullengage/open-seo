import {
  buildStoredLighthouseIssues,
  buildStoredLighthouseMetrics,
  scoreToPercent,
  storedLighthousePayloadSchema,
  type RawLighthouseAudit,
  type RawLighthouseCategory,
  type StoredLighthousePayload,
} from "@/server/lib/lighthouseStoredPayload";

export interface GooglePageSpeedResponse {
  lighthouseResult?: {
    requestedUrl?: string;
    finalDisplayedUrl?: string;
    lighthouseVersion?: string;
    categories?: Record<string, RawLighthouseCategory>;
    audits?: Record<string, RawLighthouseAudit>;
  };
}

export function buildStoredPageSpeedPayload(input: {
  url: string;
  strategy: "mobile" | "desktop";
  response: GooglePageSpeedResponse;
}): StoredLighthousePayload {
  const lh = input.response.lighthouseResult;
  if (!lh) {
    throw new Error("PageSpeed API response missing lighthouseResult");
  }

  const fetchedAt = new Date().toISOString();
  const categories = lh.categories ?? {};
  const audits = lh.audits ?? {};
  const issueReport = buildStoredLighthouseIssues({ audits, categories });
  const metrics = buildStoredLighthouseMetrics({ audits });

  const storedPayload: StoredLighthousePayload = {
    version: 2,
    source: "google-pagespeed",
    hasIssueDetails: issueReport.hasIssueDetails,
    metadata: {
      requestedUrl: lh.requestedUrl ?? input.url,
      finalUrl: lh.finalDisplayedUrl ?? input.url,
      strategy: input.strategy,
      fetchedAt,
      lighthouseVersion: lh.lighthouseVersion ?? null,
      taskId: null,
      cost: 0,
    },
    scores: {
      performance: scoreToPercent(categories.performance?.score),
      accessibility: scoreToPercent(categories.accessibility?.score),
      "best-practices": scoreToPercent(categories["best-practices"]?.score),
      seo: scoreToPercent(categories.seo?.score),
    },
    metrics,
    issues: issueReport.issues,
  };

  return storedLighthousePayloadSchema.parse(storedPayload);
}
