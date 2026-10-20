import { GoogleSearchConsoleLogo } from "@/client/features/integrations/GoogleProductLogos";
import { startAudit } from "@/serverFunctions/audit";
import { QueryError } from "@/client/components/QueryState";
import { LoaderCircle, ScanSearch } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { Progress } from "@/client/components/ui/progress";
import { Button } from "@/client/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { SeverityBadge } from "@/client/features/audit/shared";
import { AUDIT_ISSUE_TYPES } from "@/shared/audit-issues";

import {
  formatCount,
  formatCtr,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { getSearchPerformanceReport } from "@/serverFunctions/searchPerformance";
import {
  formatDay,
  moreDetailsClass,
  MetricsTableSkeleton,
} from "@/client/features/dashboard/cardParts";
import { percentChange } from "@/client/components/MetricsTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import type { DashboardAuditSummary } from "@/server/features/dashboard/services/DashboardService";

// Plain string-keyed view of the registry: issue types from the DB are not
// statically guaranteed to be registry keys.
const issueTitles: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(AUDIT_ISSUE_TYPES).map(([key, value]) => [key, value.title]),
);

export function GscCard({
  projectId,
  connected,
  siteUrl,
}: {
  projectId: string;
  connected: boolean;
  siteUrl: string | null;
}) {
  const reportQuery = useQuery({
    queryKey: ["dashboardGscReport", projectId, siteUrl],
    queryFn: () =>
      getSearchPerformanceReport({
        data: { projectId, dateRange: "last_28_days" },
      }),
    enabled: connected,
    staleTime: 10 * 60_000,
  });
  const report = reportQuery.data;

  // Not connected (or a dead grant discovered by the report call): the
  // connection card sells and runs the whole flow itself.
  if (!connected || (report && !report.connected)) {
    return (
      <div id="connect-gsc">
        <GoogleConnectionCard provider="gsc" projectId={projectId} prominent />
      </div>
    );
  }

  return (
    <CardShell
      title="Desempenho no Google Search Console"
      icon={<GoogleSearchConsoleLogo className="size-5" />}
      action={
        <Link
          to="/p/$projectId/search-performance"
          params={{ projectId }}
          className={moreDetailsClass}
        >
          Ver dados detalhados do GSC →
        </Link>
      }
    >
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Últimos 28 dias
      </p>
      {reportQuery.isError ? (
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os dados do Search Console no momento.
        </p>
      ) : !report ? (
        <MetricsTableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Métrica</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Variação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              {
                label: "Cliques",
                value: formatCount(report.totals.clicks),
                change: percentChange(
                  report.totals.clicks,
                  report.prevTotals.clicks,
                ),
              },
              {
                label: "Impressões",
                value: formatCount(report.totals.impressions),
                change: percentChange(
                  report.totals.impressions,
                  report.prevTotals.impressions,
                ),
              },
              {
                label: "Taxa de Cliques (CTR)",
                value: formatCtr(report.totals.ctr),
                change: null,
              },
              {
                label: "Posição Média",
                value: formatPosition(report.totals.position),
                change: null,
              },
            ].map((metric) => (
              <TableRow key={metric.label}>
                <TableCell>{metric.label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {metric.value}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${metric.change === null || metric.change === 0 ? "text-muted-foreground" : metric.change > 0 ? "text-success" : "text-destructive"}`}
                >
                  {metric.change === null
                    ? "—"
                    : `${metric.change > 0 ? "+" : ""}${metric.change}%`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardShell>
  );

}

export function AuditHealthCard({
  projectId,
  audit,
  domain,
}: {
  projectId: string;
  audit: DashboardAuditSummary | null;
  domain: string | null;
}) {
  const queryClient = useQueryClient();
  const scan = useMutation({
    mutationFn: () =>
      startAudit({
        data: {
          projectId,
          startUrl: `https://${domain}`,
          maxPages: 50,
          renderJavaScript: true,
        },
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["dashboardOverview", projectId],
      }),
    meta: { errorToast: false },
  });
  if (!audit)
    return (
      <CardShell title="Saúde Técnica do Site">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <ScanSearch className="size-7 text-muted-foreground" />
          <h3 className="font-medium">Descubra o que está travando o crescimento do site</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Rastreie até 50 páginas em busca de links quebrados, títulos ausentes e páginas que o Google não indexa.
          </p>
          {domain ? (
            <Button disabled={scan.isPending} onClick={() => scan.mutate()}>
              {scan.isPending ? "Iniciando auditoria…" : "Auditar meu site"}
            </Button>
          ) : (
            <Button
              nativeButton={false}
              render={
                <Link to="/p/$projectId/settings" params={{ projectId }} />
              }
            >
              Adicionar site
            </Button>
          )}
          {scan.isError && (
            <QueryError
              error={scan.error}
              fallback="Não foi possível iniciar a auditoria"
            />
          )}
        </div>
      </CardShell>
    );

  if (audit.status === "running") {
    const isLighthouse = audit.currentPhase === "lighthouse";
    const isFinalizing = audit.currentPhase === "finalizing";
    const checked = isLighthouse
      ? audit.lighthouseCompleted + audit.lighthouseFailed
      : audit.pagesCrawled;
    const total = isLighthouse ? audit.lighthouseTotal : audit.pagesTotal;
    // A running crawl has at most a partial issue list, and an empty one is
    // not the same as a healthy site, so show progress instead.
    return (
      <CardShell
        title="Saúde Técnica do Site"
        action={
          <Link
            to="/p/$projectId/audit"
            params={{ projectId }}
            search={{ auditId: audit.id }}
            className={moreDetailsClass}
          >
            Ver progresso
          </Link>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
          <h3 className="font-medium">
            {isLighthouse
              ? "Executando testes do Google Lighthouse"
              : isFinalizing
                ? "Preparando diagnóstico"
                : audit.currentPhase === "discovery"
                  ? "Mapeando páginas para auditar"
                  : "Rastreando o site"}
          </h3>
          {!isFinalizing && (
            <Progress
              className="w-full max-w-xs"
              value={checked}
              max={total || 1}
              aria-label={isLighthouse ? "Testes do Lighthouse" : "Páginas rastreadas"}
            />
          )}
          <p className="text-sm text-muted-foreground tabular-nums">
            {isLighthouse
              ? `${checked} de ${total} testes${audit.lighthouseFailed > 0 ? ` (${audit.lighthouseFailed} falhas)` : ""}`
              : isFinalizing
                ? `${audit.pagesCrawled} páginas rastreadas. Finalizando relatório.`
                : `${checked} de até ${total} páginas rastreadas`}
          </p>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell
      title="Saúde Técnica do Site"
      action={
        <Link
          to="/p/$projectId/audit"
          params={{ projectId }}
          search={{ auditId: audit.id, tab: "issues" }}
          className={moreDetailsClass}
        >
          Ver problemas detectados
        </Link>
      }
    >
      {audit.status === "failed" && (
        <p className="mb-4 text-sm text-destructive">
          A última auditoria não concluiu. Revise os resultados ou tente novamente.
        </p>
      )}
      {audit.status === "completed" && (
        <p className="mb-4 text-sm text-muted-foreground">
          {audit.pagesCrawled} páginas auditadas · {formatDay(audit.startedAt)}
        </p>
      )}
      {audit.topIssues.length === 0 ? (
        audit.status === "completed" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-success" />
            Nenhum problema encontrado — seu site está saudável.
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Execute a auditoria novamente para ver problemas.
          </p>
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Problema</TableHead>
              <TableHead>Severidade</TableHead>
              <TableHead className="text-right">Páginas afetadas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit.topIssues.map((issue) => (
              <TableRow key={issue.issueType}>
                <TableCell>
                  {issueTitles[issue.issueType] ?? issue.issueType}
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={issue.severity}>
                    {issue.severity === "critical"
                      ? "Crítico"
                      : issue.severity === "warning"
                        ? "Aviso"
                        : "Info"}
                  </SeverityBadge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {issue.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardShell>
  );
}

