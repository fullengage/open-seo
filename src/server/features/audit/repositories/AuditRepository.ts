/**
 * Data access layer for site audit tables.
 * Provider-aware (D1 or Postgres) via the `@/db` handle. Covers audits,
 * audit_pages, audit_issues, and stored Lighthouse results. Link edges live
 * in the per-audit scratchpad Durable Object, not here.
 */
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  audits,
  auditIssues,
  auditLighthouseResults,
  auditPages,
  projects,
} from "@/db/schema";
import { executeInBatches } from "@/db/runBatch";
import { insertIssues } from "./auditIssueWrites";
import { deterministicAuditRowId } from "@/server/lib/audit/ids";
import type { DetectedIssue } from "@/server/lib/audit/issues/page-reporters";
import type {
  AuditConfig,
  CrawledPageResult,
  LighthouseResult,
} from "@/server/lib/audit/types";
import type { PageFetchClass } from "@/shared/audit-fetch-class";

async function createAudit(data: {
  id: string;
  projectId: string;
  startedByUserId: string;
  startUrl: string;
  workflowInstanceId: string;
  config: AuditConfig;
  pagesTotal: number;
  lighthouseTotal: number;
}) {
  await db.insert(audits).values({
    id: data.id,
    projectId: data.projectId,
    startedByUserId: data.startedByUserId,
    startUrl: data.startUrl,
    workflowInstanceId: data.workflowInstanceId,
    config: JSON.stringify(data.config),
    status: "running",
    pagesTotal: data.pagesTotal,
    lighthouseTotal: data.lighthouseTotal,
    currentPhase: "discovery",
  });
}

async function updateAuditProgress(
  auditId: string,
  workflowInstanceId: string,
  data: {
    pagesCrawled?: number;
    pagesTotal?: number;
    lighthouseTotal?: number;
    lighthouseCompleted?: number;
    lighthouseFailed?: number;
    currentPhase?: string;
  },
) {
  await db
    .update(audits)
    .set(data)
    .where(
      and(
        eq(audits.id, auditId),
        eq(audits.workflowInstanceId, workflowInstanceId),
      ),
    );
}

async function completeAudit(
  auditId: string,
  workflowInstanceId: string,
  data: {
    pagesCrawled: number;
    pagesTotal: number;
  },
) {
  await db
    .update(audits)
    .set({
      status: "completed",
      completedAt: new Date().toISOString(),
      currentPhase: "completed",
      ...data,
    })
    .where(
      and(
        eq(audits.id, auditId),
        eq(audits.workflowInstanceId, workflowInstanceId),
      ),
    );
}

async function failAudit(
  auditId: string,
  workflowInstanceId: string,
  errorInfo?: {
    errorCode: string;
    errorDetail: string;
    failedPhase: string | null;
  },
) {
  // Only a running audit can transition to failed: the getStatus reconciler
  // races the workflow's own finalize, and without this guard it could flip
  // a just-completed audit to failed.
  await db
    .update(audits)
    .set({
      status: "failed",
      completedAt: new Date().toISOString(),
      currentPhase: "failed",
      ...(errorInfo && {
        errorCode: errorInfo.errorCode,
        errorDetail: errorInfo.errorDetail,
        failedPhase: errorInfo.failedPhase,
      }),
    })
    .where(
      and(
        eq(audits.id, auditId),
        eq(audits.workflowInstanceId, workflowInstanceId),
        eq(audits.status, "running"),
      ),
    );
}

async function getAuditForWorkflow(
  auditId: string,
  workflowInstanceId: string,
) {
  return db.query.audits.findFirst({
    where: and(
      eq(audits.id, auditId),
      eq(audits.workflowInstanceId, workflowInstanceId),
    ),
  });
}

/**
 * Persist one crawled sub-batch (pages + per-page issues). Called inside the
 * crawl-chunk Workflow step so results land in the app DB incrementally
 * instead of accumulating in memory until finalize. Link edges go to the
 * audit's scratchpad DO, not here.
 *
 * Idempotent on step retry: callers assign deterministic page ids
 * (deterministicAuditRowId) and issue ids are derived from stable content.
 * Page rows upsert (a retried fetch may legitimately differ — last attempt
 * wins); issues are insert-or-ignore.
 */
async function insertCrawledBatch(
  auditId: string,
  pages: CrawledPageResult[],
  issues: DetectedIssue[],
) {
  await executeInBatches(pages, (tx, page) => {
    const dataColumns = {
      url: page.url,
      statusCode: page.statusCode,
      redirectUrl: page.redirectUrl,
      title: page.title,
      metaDescription: page.metaDescription,
      canonicalUrl: page.canonicalUrl,
      robotsMeta: page.robotsMeta,
      xRobotsTag: page.xRobotsTag,
      headerCanonicalUrl: page.headerCanonicalUrl,
      ogTitle: page.ogTitle,
      ogDescription: page.ogDescription,
      ogImage: page.ogImage,
      h1Count: page.h1Count,
      h2Count: page.h2Count,
      h3Count: page.h3Count,
      h4Count: page.h4Count,
      h5Count: page.h5Count,
      h6Count: page.h6Count,
      wordCount: page.wordCount,
      contentHash: page.contentHash,
      imagesTotal: page.imagesTotal,
      imagesMissingAlt: page.imagesMissingAlt,
      internalLinkCount: page.links.filter((l) => l.isInternal).length,
      externalLinkCount: page.links.filter((l) => !l.isInternal).length,
      hasStructuredData: page.hasStructuredData,
      isIndexable: page.isIndexable,
      fetchClass: page.fetchClass,
      crawlDepth: page.crawlDepth,
      inSitemap: page.inSitemap,
      responseTimeMs: page.responseTimeMs,
    };
    return tx
      .insert(auditPages)
      .values({ id: page.id, auditId, ...dataColumns })
      .onConflictDoUpdate({ target: auditPages.id, set: dataColumns });
  });

  await insertIssues(auditId, issues);
}

async function insertLighthouseResults(
  auditId: string,
  lighthouseResults: LighthouseResult[],
) {
  const rows = await Promise.all(
    lighthouseResults.map(async (result) => ({
      id: await deterministicAuditRowId(
        auditId,
        result.pageId,
        result.strategy,
      ),
      auditId,
      pageId: result.pageId,
      strategy: result.strategy,
      performanceScore: result.performanceScore,
      accessibilityScore: result.accessibilityScore,
      bestPracticesScore: result.bestPracticesScore,
      seoScore: result.seoScore,
      lcpMs: result.lcpMs,
      cls: result.cls,
      inpMs: result.inpMs,
      ttfbMs: result.ttfbMs,
      errorMessage: result.errorMessage ?? null,
      r2Key: result.r2Key ?? null,
      payloadSizeBytes: result.payloadSizeBytes ?? null,
    })),
  );
  // The persistence step is retryable after its paid provider result has been
  // checkpointed, so repeated writes must stay idempotent.
  await executeInBatches(rows, (tx, row) => {
    const { id: _id, auditId: _auditId, ...dataColumns } = row;
    return tx.insert(auditLighthouseResults).values(row).onConflictDoUpdate({
      target: auditLighthouseResults.id,
      set: dataColumns,
    });
  });
}

async function getAuditForProject(auditId: string, projectId: string) {
  return db.query.audits.findFirst({
    where: and(eq(audits.id, auditId), eq(audits.projectId, projectId)),
  });
}

async function getLatestAuditForProject(projectId: string) {
  return db.query.audits.findFirst({
    where: eq(audits.projectId, projectId),
    orderBy: desc(audits.startedAt),
  });
}

async function getIssuesForAudit(
  auditId: string,
  filters: { severity?: "critical" | "warning" | "info"; issueType?: string },
) {
  return db.query.auditIssues.findMany({
    where: and(
      eq(auditIssues.auditId, auditId),
      filters.severity ? eq(auditIssues.severity, filters.severity) : undefined,
      filters.issueType
        ? eq(auditIssues.issueType, filters.issueType)
        : undefined,
    ),
  });
}

async function getPagesForAudit(auditId: string) {
  return db
    .select({
      id: auditPages.id,
      url: auditPages.url,
      statusCode: auditPages.statusCode,
      fetchClass: auditPages.fetchClass,
      redirectUrl: auditPages.redirectUrl,
      title: auditPages.title,
      metaDescription: auditPages.metaDescription,
      wordCount: auditPages.wordCount,
      isIndexable: auditPages.isIndexable,
      crawlDepth: auditPages.crawlDepth,
      inSitemap: auditPages.inSitemap,
      internalLinkCount: auditPages.internalLinkCount,
      responseTimeMs: auditPages.responseTimeMs,
    })
    .from(auditPages)
    .where(eq(auditPages.auditId, auditId));
}

async function countPagesByFetchClass(
  auditId: string,
  fetchClass: PageFetchClass,
): Promise<number> {
  const rows = await db
    .select({ pages: count() })
    .from(auditPages)
    .where(
      and(
        eq(auditPages.auditId, auditId),
        eq(auditPages.fetchClass, fetchClass),
      ),
    );
  return rows[0]?.pages ?? 0;
}

async function hasPagesForAudit(auditId: string): Promise<boolean> {
  const rows = await db
    .select({ id: auditPages.id })
    .from(auditPages)
    .where(eq(auditPages.auditId, auditId))
    .limit(1);
  return rows.length > 0;
}

async function getAuditsByProject(projectId: string) {
  const rows = await db
    .select({ audit: audits })
    .from(audits)
    .where(eq(audits.projectId, projectId))
    .orderBy(desc(audits.startedAt));

  return rows.map(({ audit }) => audit);
}

// Org-scoped: the free-plan quota belongs to the org (the Autumn customer),
// so usage must aggregate across every member — counting per starting user
// would multiply the free ceiling by the member count.
async function getAuditUsageForOrganization(organizationId: string) {
  const rows = await db
    .select({
      status: audits.status,
      pagesTotal: audits.pagesTotal,
      lighthouseTotal: audits.lighthouseTotal,
    })
    .from(audits)
    .innerJoin(projects, eq(audits.projectId, projects.id))
    .where(eq(projects.organizationId, organizationId));

  return {
    capacityUnits: rows.reduce(
      (total, row) => total + row.pagesTotal + row.lighthouseTotal,
      0,
    ),
    runningCount: rows.filter((row) => row.status === "running").length,
  };
}

export interface IncrementalAuditDelta {
  hasPreviousAudit: boolean;
  previousAuditId: string | null;
  previousDate: string | null;
  pagesAdded: number;
  pagesRemoved: number;
  pagesUnchanged: number;
  pagesModified: number;
  issuesNewCount: number;
  issuesResolvedCount: number;
  resolvedIssues: Array<{
    issueType: string;
    pageUrl: string;
    severity: string;
  }>;
  newIssues: Array<{
    issueType: string;
    pageUrl: string;
    severity: string;
  }>;
}

async function getPreviousCompletedAudit(
  projectId: string,
  beforeStartedAt?: string | null,
  excludeAuditId?: string,
) {
  const conditions = [
    eq(audits.projectId, projectId),
    eq(audits.status, "completed"),
  ];
  if (beforeStartedAt) {
    conditions.push(sql`${audits.startedAt} < ${beforeStartedAt}`);
  }
  if (excludeAuditId) {
    conditions.push(ne(audits.id, excludeAuditId));
  }

  return db.query.audits.findFirst({
    where: and(...conditions),
    orderBy: desc(audits.startedAt),
  });
}

async function getIncrementalDelta(
  auditId: string,
  projectId: string,
  currentPages: Array<{ url: string; contentHash?: string | null; statusCode?: number | null }>,
  currentIssues: Array<{ issueType: string; pageUrl: string; severity: string }>,
  currentStartedAt?: string | null,
): Promise<IncrementalAuditDelta> {
  const previousAudit = await getPreviousCompletedAudit(
    projectId,
    currentStartedAt,
    auditId,
  );

  if (!previousAudit) {
    return {
      hasPreviousAudit: false,
      previousAuditId: null,
      previousDate: null,
      pagesAdded: currentPages.length,
      pagesRemoved: 0,
      pagesUnchanged: 0,
      pagesModified: 0,
      issuesNewCount: currentIssues.length,
      issuesResolvedCount: 0,
      resolvedIssues: [],
      newIssues: currentIssues.map((i) => ({
        issueType: i.issueType,
        pageUrl: i.pageUrl,
        severity: i.severity,
      })),
    };
  }

  const [prevPages, prevIssues] = await Promise.all([
    db.query.auditPages.findMany({
      where: eq(auditPages.auditId, previousAudit.id),
      columns: { url: true, contentHash: true, statusCode: true },
    }),
    db.query.auditIssues.findMany({
      where: eq(auditIssues.auditId, previousAudit.id),
      columns: { issueType: true, pageUrl: true, severity: true },
    }),
  ]);

  const prevPagesMap = new Map(prevPages.map((p) => [p.url, p]));
  const currPagesMap = new Map(currentPages.map((p) => [p.url, p]));

  let pagesAdded = 0;
  let pagesUnchanged = 0;
  let pagesModified = 0;

  for (const curr of currentPages) {
    const prev = prevPagesMap.get(curr.url);
    if (!prev) {
      pagesAdded += 1;
    } else if (
      curr.contentHash &&
      prev.contentHash &&
      curr.contentHash === prev.contentHash &&
      curr.statusCode === prev.statusCode
    ) {
      pagesUnchanged += 1;
    } else {
      pagesModified += 1;
    }
  }

  let pagesRemoved = 0;
  for (const prev of prevPages) {
    if (!currPagesMap.has(prev.url)) {
      pagesRemoved += 1;
    }
  }

  const issueKey = (i: { issueType: string; pageUrl: string }) =>
    `${i.issueType}:::${i.pageUrl}`;

  const prevIssueMap = new Map(prevIssues.map((i) => [issueKey(i), i]));
  const currIssueMap = new Map(currentIssues.map((i) => [issueKey(i), i]));

  const resolvedIssues: Array<{
    issueType: string;
    pageUrl: string;
    severity: string;
  }> = [];

  for (const [key, prev] of prevIssueMap.entries()) {
    if (!currIssueMap.has(key)) {
      resolvedIssues.push({
        issueType: prev.issueType,
        pageUrl: prev.pageUrl,
        severity: prev.severity,
      });
    }
  }

  const newIssues: Array<{
    issueType: string;
    pageUrl: string;
    severity: string;
  }> = [];

  for (const [key, curr] of currIssueMap.entries()) {
    if (!prevIssueMap.has(key)) {
      newIssues.push({
        issueType: curr.issueType,
        pageUrl: curr.pageUrl,
        severity: curr.severity,
      });
    }
  }

  return {
    hasPreviousAudit: true,
    previousAuditId: previousAudit.id,
    previousDate: previousAudit.startedAt,
    pagesAdded,
    pagesRemoved,
    pagesUnchanged,
    pagesModified,
    issuesNewCount: newIssues.length,
    issuesResolvedCount: resolvedIssues.length,
    resolvedIssues,
    newIssues,
  };
}

async function getAuditResultsForProject(auditId: string, projectId: string) {
  const audit = await getAuditForProject(auditId, projectId);
  if (!audit) {
    return { audit: null, pages: [], lighthouse: [], issues: [], delta: null };
  }

  const [pages, lighthouse, issues] = await Promise.all([
    db.query.auditPages.findMany({
      where: eq(auditPages.auditId, auditId),
    }),
    db.query.auditLighthouseResults.findMany({
      where: eq(auditLighthouseResults.auditId, auditId),
    }),
    db.query.auditIssues.findMany({
      where: eq(auditIssues.auditId, auditId),
    }),
  ]);

  const delta = await getIncrementalDelta(
    auditId,
    projectId,
    pages,
    issues,
    audit.startedAt,
  );

  return { audit, pages, lighthouse, issues, delta };
}

async function getLighthouseResultById(input: {
  lighthouseResultId: string;
  projectId: string;
}) {
  const lighthouse = await db.query.auditLighthouseResults.findFirst({
    where: eq(auditLighthouseResults.id, input.lighthouseResultId),
  });

  if (!lighthouse) {
    return null;
  }

  const [parentAudit, page] = await Promise.all([
    db.query.audits.findFirst({
      where: and(
        eq(audits.id, lighthouse.auditId),
        eq(audits.projectId, input.projectId),
      ),
    }),
    db.query.auditPages.findFirst({
      where: eq(auditPages.id, lighthouse.pageId),
    }),
  ]);

  if (!parentAudit) {
    return null;
  }

  return {
    lighthouse,
    page,
    audit: parentAudit,
  };
}

async function deleteAuditForProject(auditId: string, projectId: string) {
  await db
    .delete(audits)
    .where(and(eq(audits.id, auditId), eq(audits.projectId, projectId)));
}

export const AuditRepository = {
  createAudit,
  updateAuditProgress,
  completeAudit,
  failAudit,
  getAuditForWorkflow,
  insertCrawledBatch,
  insertIssues,
  insertLighthouseResults,
  getAuditForProject,
  getLatestAuditForProject,
  getIssuesForAudit,
  getPagesForAudit,
  countPagesByFetchClass,
  hasPagesForAudit,
  getAuditsByProject,
  getAuditUsageForOrganization,
  getAuditResultsForProject,
  getLighthouseResultById,
  deleteAuditForProject,
} as const;
