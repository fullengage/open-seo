import { useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { sort } from "remeda";
import {
  getIssueDescriptor,
  ISSUE_SEVERITY_ORDER,
  type IssueSeverity,
} from "@/shared/audit-issues";
import type { AuditResultsData } from "@/client/features/audit/results/types";
import { SeverityBadge } from "@/client/features/audit/shared";
import { EmptyState } from "@/client/components/EmptyState";
import { Badge } from "@/client/components/ui/badge";

type AuditIssueRow = AuditResultsData["issues"][number];

const MAX_RENDERED_URLS = 100;

const SEVERITY_RULE: Record<IssueSeverity, string> = {
  critical: "border-l-destructive/60",
  warning: "border-l-warning/60",
  info: "border-l-info/60",
};

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

interface IssueGroup {
  issueType: string;
  severity: IssueSeverity;
  title: string;
  explanation: string;
  howToFix: string;
  issues: AuditIssueRow[];
}

export function resolveIssueSeverity(issue: {
  issueType: string;
  severity: string;
}): IssueSeverity {
  const descriptor = getIssueDescriptor(issue.issueType);
  if (descriptor) return descriptor.severity;
  return issue.severity === "critical" || issue.severity === "warning"
    ? issue.severity
    : "info";
}

function groupIssues(issues: AuditIssueRow[]): IssueGroup[] {
  const groups = new Map<string, IssueGroup>();
  for (const issue of issues) {
    let group = groups.get(issue.issueType);
    if (!group) {
      const descriptor = getIssueDescriptor(issue.issueType);
      group = {
        issueType: issue.issueType,
        severity: resolveIssueSeverity(issue),
        title: descriptor?.title ?? issue.issueType,
        explanation: descriptor?.explanation ?? "",
        howToFix: descriptor?.howToFix ?? "",
        issues: [],
      };
      groups.set(issue.issueType, group);
    }
    group.issues.push(issue);
  }

  return sort(
    Array.from(groups.values()),
    (a, b) =>
      ISSUE_SEVERITY_ORDER[a.severity] - ISSUE_SEVERITY_ORDER[b.severity] ||
      b.issues.length - a.issues.length,
  );
}

export function IssuesView({
  issues,
  tabs,
  delta,
}: {
  issues: AuditIssueRow[];
  tabs: ReactNode;
  delta?: AuditResultsData["delta"];
}) {
  const groups = useMemo(() => groupIssues(issues), [issues]);

  const newIssueKeys = useMemo(
    () =>
      new Set(
        (delta?.newIssues ?? []).map(
          (i) => `${i.issueType}:::${i.pageUrl}`,
        ),
      ),
    [delta],
  );

  const sections = useMemo(
    () =>
      (["critical", "warning", "info"] as const)
        .map((severity) => ({
          severity,
          groups: groups.filter((group) => group.severity === severity),
        }))
        .filter((section) => section.groups.length > 0),
    [groups],
  );

  const resolvedIssues = delta?.resolvedIssues ?? [];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {tabs}
      {issues.length === 0 && resolvedIssues.length === 0 ? (
        <EmptyState
          variant="plain"
          title="No issues recorded for this audit."
          description="Either the site is in great shape, or this audit ran before issue checks existed — run a new audit to get the full report."
        />
      ) : (
        <div>
          {resolvedIssues.length > 0 && (
            <ResolvedIssuesSection resolvedIssues={resolvedIssues} />
          )}
          {sections.map((section) => (
            <IssueSection
              key={section.severity}
              section={section}
              newIssueKeys={newIssueKeys}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResolvedIssuesSection({
  resolvedIssues,
}: {
  resolvedIssues: Array<{
    issueType: string;
    pageUrl: string;
    severity: string;
  }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border bg-emerald-500/5">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-emerald-500/10 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-medium flex-1 min-w-0 text-emerald-800 dark:text-emerald-300">
          Problemas Resolvidos desde o último crawl
        </span>
        <Badge variant="success" className="tabular-nums">
          ✓ {resolvedIssues.length} {resolvedIssues.length === 1 ? "corrigido" : "corrigidos"}
        </Badge>
        <ChevronRight
          className={`size-4 shrink-0 text-emerald-600/70 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open && (
        <div className="p-4 border-t border-emerald-500/20 space-y-2 max-h-64 overflow-y-auto">
          {resolvedIssues.map((issue, idx) => {
            const descriptor = getIssueDescriptor(issue.issueType);
            return (
              <div
                key={`${issue.issueType}-${issue.pageUrl}-${idx}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs py-1 px-2 rounded bg-background/50 border border-emerald-500/15"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {descriptor?.title ?? issue.issueType}
                  </span>
                  <a
                    href={issue.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-muted-foreground hover:underline"
                    title={issue.pageUrl}
                  >
                    {issue.pageUrl}
                  </a>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                  Resolvido
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IssueSection({
  section,
  newIssueKeys,
}: {
  section: { severity: IssueSeverity; groups: IssueGroup[] };
  newIssueKeys: Set<string>;
}) {
  const issueCount = section.groups.reduce(
    (sum, group) => sum + group.issues.length,
    0,
  );

  return (
    <div className="border-t border-border first:border-t-0">
      <div className="flex items-center gap-2 bg-muted/50 px-4 py-1.5 border-b border-border">
        <SeverityBadge severity={section.severity}>
          {SEVERITY_LABEL[section.severity]}
          <span className="tabular-nums">{issueCount}</span>
        </SeverityBadge>
      </div>
      <div className="divide-y divide-border">
        {section.groups.map((group) => (
          <IssueRow
            key={group.issueType}
            group={group}
            newIssueKeys={newIssueKeys}
          />
        ))}
      </div>
    </div>
  );
}

function IssueRow({
  group,
  newIssueKeys,
}: {
  group: IssueGroup;
  newIssueKeys: Set<string>;
}) {
  const [open, setOpen] = useState(false);

  const newCount = group.issues.filter((i) =>
    newIssueKeys.has(`${i.issueType}:::${i.pageUrl}`),
  ).length;

  return (
    <div
      className={
        open
          ? `border-l-2 ${SEVERITY_RULE[group.severity]} bg-muted/30`
          : "border-l-2 border-l-transparent"
      }
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium flex-1 min-w-0 truncate flex items-center gap-2">
          {group.title}
          {newCount > 0 && (
            <Badge variant="warning" size="sm" className="font-normal text-[10px]">
              +{newCount} novo
            </Badge>
          )}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
          {group.issues.length} {group.issues.length === 1 ? "page" : "pages"}
        </span>
        <ChevronRight
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open && (
        <div className="pl-4 pr-4 pb-4 pt-0.5 space-y-3">
          {group.explanation && (
            <p className="text-sm text-muted-foreground max-w-prose">
              {group.explanation}
            </p>
          )}
          {group.howToFix && (
            <p className="text-sm max-w-prose">
              <span className="font-medium">How to fix: </span>
              <span className="text-foreground/80">{group.howToFix}</span>
            </p>
          )}
          <AffectedUrlList issues={group.issues} newIssueKeys={newIssueKeys} />
        </div>
      )}
    </div>
  );
}

function AffectedUrlList({
  issues,
  newIssueKeys,
}: {
  issues: AuditIssueRow[];
  newIssueKeys: Set<string>;
}) {
  const rendered = issues.slice(0, MAX_RENDERED_URLS);
  const remaining = issues.length - rendered.length;

  return (
    <div className="max-h-[320px] overflow-y-auto rounded border border-border bg-card">
      {rendered.map((issue) => {
        const isNew = newIssueKeys.has(
          `${issue.issueType}:::${issue.pageUrl}`,
        );
        return (
          <div
            key={issue.id}
            className="px-3 py-1.5 text-sm flex flex-col gap-0.5 border-b border-border last:border-b-0"
          >
            <div className="flex items-center justify-between gap-2">
              <a
                className="text-foreground/80 truncate hover:underline"
                href={issue.pageUrl}
                target="_blank"
                rel="noreferrer"
                title={issue.pageUrl}
              >
                {issue.pageUrl}
              </a>
              {isNew && (
                <Badge variant="warning" size="sm" className="shrink-0 text-[10px]">
                  Novo
                </Badge>
              )}
            </div>
            <IssueDetails detailsJson={issue.detailsJson} />
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          …and {remaining} more — export the issues CSV for the full list.
        </div>
      )}
    </div>
  );
}

// AuditRepository is the only writer and always stores JSON.stringify of a
// details object, so the parse cannot throw.
function parseDetails(detailsJson: string): Array<[string, unknown]> | null {
  const parsed: unknown = JSON.parse(detailsJson);
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    return Object.entries(parsed);
  }
  return null;
}

function IssueDetails({ detailsJson }: { detailsJson: string | null }) {
  const details = useMemo(
    () => (detailsJson ? parseDetails(detailsJson) : null),
    [detailsJson],
  );

  if (!details) return null;

  const entries = details.filter(
    ([, value]) => value !== null && value !== undefined,
  );
  if (entries.length === 0) return null;

  return (
    <span className="text-xs text-muted-foreground truncate">
      {entries
        .map(([key, value]) => {
          const rendered = Array.isArray(value)
            ? value.join(" → ")
            : String(value);
          return `${key}: ${rendered}`;
        })
        .join(" · ")}
    </span>
  );
}
