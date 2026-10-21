import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { getSearchPerformanceReport, getSearchPerformanceTable } from "@/serverFunctions/searchPerformance";
import { getAuditHistory, getAuditResults } from "@/serverFunctions/audit";
import { getIssueDescriptor, ISSUE_SEVERITY_ORDER, SEVERITY_LABEL, type IssueSeverity } from "@/shared/audit-issues";
import { Kpi } from "@/client/features/fullweb/RelatorioComercial";
import { ConecteGoogle } from "@/client/features/fullweb/MonitorPosicoes";

const RANGES = [
  { id: "last_7_days", label: "7 dias" },
  { id: "last_28_days", label: "28 dias" },
  { id: "last_3_months", label: "3 meses" },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const br = (d: string) => d.split("-").reverse().join("/");
const fmt = (n: number) => n.toLocaleString("pt-BR");

function Variacao({ now, before, inverse }: { now: number; before: number; inverse?: boolean }) {
  if (!before) return <span className="text-muted-foreground">sem base de comparação</span>;
  const p = Math.round(((now - before) / before) * 100);
  const good = inverse ? p < 0 : p > 0;
  return <span className={p === 0 ? "" : good ? "text-emerald-600" : "text-rose-600"}>{p > 0 ? `+${p}%` : `${p}%`}</span>;
}

/** Relatório de SEO: dados do Google Search Console no período escolhido. */
export function RelatorioSeo({ projectId }: { projectId: string }) {
  const [range, setRange] = useState<RangeId>("last_28_days");
  const report = useQuery({
    queryKey: ["relSeo", projectId, range],
    queryFn: () => getSearchPerformanceReport({ data: { projectId, dateRange: range } }),
    retry: false,
  });
  const table = (dimension: "query" | "page") =>
    getSearchPerformanceTable({ data: { projectId, dateRange: range, dimension, page: 1, pageSize: 25 } });
  const queries = useQuery({ queryKey: ["relSeoQ", projectId, range], queryFn: () => table("query"), enabled: !!report.data?.connected });
  const pages = useQuery({ queryKey: ["relSeoP", projectId, range], queryFn: () => table("page"), enabled: !!report.data?.connected });

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold">Relatório de SEO</h2>
        <p className="text-xs text-muted-foreground">Fonte: Google Search Console (dados gratuitos da sua conta Google).</p>
      </div>
      <div className="flex items-center gap-1 print:hidden">
        {RANGES.map((r) => (
          <Button key={r.id} size="sm" variant={r.id === range ? "default" : "outline"} onClick={() => setRange(r.id)}>
            {r.label}
          </Button>
        ))}
      </div>
    </div>
  );

  if (report.isLoading) return <Card className="p-5 space-y-3">{header}<p className="text-sm text-muted-foreground">Carregando dados do Google…</p></Card>;
  if (report.isError)
    return <Card className="p-5 space-y-3">{header}<p className="text-sm">Não foi possível buscar os dados do Google agora. Tente de novo em alguns minutos.</p></Card>;
  const d = report.data;
  if (!d || !d.connected)
    return (
      <Card className="p-5 space-y-3">
        {header}
        <ConecteGoogle projectId={projectId} oque="o Relatório de SEO" />
      </Card>
    );

  const t = d.totals, pt = d.prevTotals;
  return (
    <Card className="p-5 space-y-4">
      {header}
      <p className="text-xs text-muted-foreground">
        {br(d.range.startDate)} a {br(d.range.endDate)}, comparado com {br(d.range.prevStartDate)} a {br(d.range.prevEndDate)}.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Cliques" value={fmt(t.clicks)} hint={undefined} />
        <Kpi label="Impressões" value={fmt(t.impressions)} />
        <Kpi label="CTR" value={`${(t.ctr * 100).toFixed(1)}%`} />
        <Kpi label="Posição média" value={t.position.toFixed(1)} hint="Média de todas as buscas; menor é melhor" />
      </div>
      <p className="text-sm">
        <strong>Resumo:</strong> o site recebeu {fmt(t.clicks)} cliques do Google (<Variacao now={t.clicks} before={pt.clicks} />) e apareceu{" "}
        {fmt(t.impressions)} vezes nos resultados (<Variacao now={t.impressions} before={pt.impressions} />). A posição média foi{" "}
        {t.position.toFixed(1)} (antes {pt.position ? pt.position.toFixed(1) : "—"}).
        {(d.strikingDistance?.length ?? 0) > 0 &&
          ` Há ${d.strikingDistance.length} buscas entre a 5ª e a 20ª posição: são as oportunidades mais próximas de virar cliques.`}
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <TopTable title="Principais palavras-chave" rows={queries.data?.connected ? queries.data.rows : []} loading={queries.isLoading} />
        <TopTable title="Principais páginas" rows={pages.data?.connected ? pages.data.rows : []} loading={pages.isLoading} path />
      </div>
    </Card>
  );
}

function TopTable({ title, rows, loading, path }: { title: string; rows: { key: string; clicks: number; impressions: number; position: number }[]; loading: boolean; path?: boolean }) {
  return (
    <div>
      <p className="text-sm font-medium mb-1">{title}</p>
      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem dados no período.</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-left py-1">{path ? "Página" : "Busca"}</th>
              <th className="text-right">Cliques</th>
              <th className="text-right">Impr.</th>
              <th className="text-right">Posição</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((r) => (
              <tr key={r.key} className="border-t border-border">
                <td className="py-1 max-w-[220px] truncate" title={r.key}>{path ? r.key.replace(/^https?:\/\/[^/]+/, "") || "/" : r.key}</td>
                <td className="text-right tabular-nums">{fmt(r.clicks)}</td>
                <td className="text-right tabular-nums">{fmt(r.impressions)}</td>
                <td className="text-right tabular-nums">{r.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Relatório de Auditoria Técnica: última auditoria concluída, com o que foi resolvido e o que falta. */
export function RelatorioAuditoria({ projectId }: { projectId: string }) {
  const history = useQuery({ queryKey: ["relAudHist", projectId], queryFn: () => getAuditHistory({ data: { projectId } }) });
  const last = (history.data ?? []).find((a) => a.status === "completed");
  const results = useQuery({
    queryKey: ["relAud", projectId, last?.id],
    queryFn: () => getAuditResults({ data: { projectId, auditId: last!.id } }),
    enabled: !!last,
  });

  const title = (
    <div>
      <h2 className="text-lg font-semibold">Relatório de Auditoria Técnica</h2>
      <p className="text-xs text-muted-foreground">Problemas do site encontrados na última auditoria concluída.</p>
    </div>
  );
  if (history.isLoading || results.isLoading) return <Card className="p-5 space-y-3">{title}<p className="text-sm text-muted-foreground">Carregando auditoria…</p></Card>;
  if (!last)
    return (
      <Card className="p-5 space-y-3">
        {title}
        <p className="text-sm">
          Nenhuma auditoria concluída ainda.{" "}
          <Link to="/p/$projectId/audit" params={{ projectId }} className="text-primary underline">Iniciar auditoria</Link>
        </p>
      </Card>
    );
  if (results.isError || !results.data)
    return <Card className="p-5 space-y-3">{title}<p className="text-sm">Não foi possível carregar o resultado da auditoria.</p></Card>;

  const { issues, delta, audit } = results.data;
  const sev = (i: { issueType: string; severity: string }): IssueSeverity =>
    getIssueDescriptor(i.issueType)?.severity ?? (i.severity === "critical" || i.severity === "warning" ? i.severity : "info");
  const bySev = (s: IssueSeverity) => issues.filter((i) => sev(i) === s).length;
  const pagesAffected = new Set(issues.map((i) => i.pageUrl)).size;
  const groups = new Map<string, { n: number; s: IssueSeverity }>();
  for (const i of issues) {
    const g = groups.get(i.issueType) ?? { n: 0, s: sev(i) };
    g.n++;
    groups.set(i.issueType, g);
  }
  const top = [...groups.entries()]
    .sort((a, b) => ISSUE_SEVERITY_ORDER[a[1].s] - ISSUE_SEVERITY_ORDER[b[1].s] || b[1].n - a[1].n)
    .slice(0, 5);
  const resolved = delta?.resolvedIssues?.length ?? null;
  const novos = delta?.newIssues?.length ?? null;

  return (
    <Card className="p-5 space-y-4">
      {title}
      <p className="text-xs text-muted-foreground">
        {audit.startUrl} · {new Date(audit.completedAt ?? audit.startedAt).toLocaleDateString("pt-BR")} · {audit.pagesCrawled} páginas analisadas
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Problemas identificados" value={issues.length} />
        <Kpi label="Páginas afetadas" value={pagesAffected} />
        <Kpi label="Prioridade alta" value={bySev("critical")} />
        <Kpi label="Resolvidos desde a anterior" value={resolved ?? "—"} hint={resolved === null ? "Aparece a partir da 2ª auditoria" : undefined} />
        <Kpi label="Novos desde a anterior" value={novos ?? "—"} />
      </div>
      <div>
        <p className="text-sm font-medium mb-1">O que corrigir primeiro</p>
        {top.length === 0 ? (
          <p className="text-sm">Nenhum problema encontrado nesta auditoria.</p>
        ) : (
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {top.map(([type, g]) => (
              <li key={type}>
                <strong>{getIssueDescriptor(type)?.title ?? type}</strong> — {g.n} {g.n === 1 ? "ocorrência" : "ocorrências"} ·{" "}
                {SEVERITY_LABEL[g.s].label.toLowerCase()}
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="text-sm">
        <strong>Resumo:</strong> {issues.length === 0 ? "a última auditoria não encontrou problemas." : `${bySev("critical")} problemas de prioridade alta, ${bySev("warning")} de média e ${bySev("info")} de baixa, em ${pagesAffected} páginas.`}{" "}
        <Link to="/p/$projectId/audit" params={{ projectId }} className="text-primary underline print:hidden">Ver detalhes e como corrigir</Link>
      </p>
    </Card>
  );
}
