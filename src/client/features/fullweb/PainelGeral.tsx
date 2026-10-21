import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card } from "@/client/components/ui/card";
import { PageHeader } from "@/client/components/PageHeader";
import { getSearchPerformanceReport } from "@/serverFunctions/searchPerformance";
import { getAuditHistory } from "@/serverFunctions/audit";
import { funnel, Kpi, useLeads } from "@/client/features/fullweb/RelatorioComercial";
import { ConecteGoogle } from "@/client/features/fullweb/MonitorPosicoes";

const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);

function Delta({ now, before }: { now: number; before: number }) {
  const p = pct(now, before);
  if (p === null) return null;
  return <span className={p >= 0 ? "text-emerald-600" : "text-rose-600"}>{p >= 0 ? `▲ ${p}%` : `▼ ${-p}%`}</span>;
}

/** Painel Geral da Inteligência Comercial: só dados reais, com orientação quando falta fonte. */
export function PainelGeral({ projectId }: { projectId: string }) {
  const leads = useLeads();
  const gsc = useQuery({
    queryKey: ["painelGsc", projectId],
    queryFn: () => getSearchPerformanceReport({ data: { projectId, dateRange: "last_28_days" } }),
    retry: false,
  });
  const audits = useQuery({
    queryKey: ["painelAudits", projectId],
    queryFn: () => getAuditHistory({ data: { projectId } }),
  });

  const f = funnel(leads.data ?? [], Date.now() - 30 * 86400000);
  const lastAudit = (audits.data ?? []).find((a) => a.status === "completed");
  const alerts: { text: string; to?: string }[] = [];
  if (gsc.data && !gsc.data.connected) alerts.push({ text: "Google Search Console não conectado: Desempenho, Palavras-chave e Monitor de Posições ficam sem dados.", to: "search-performance" });
  if (gsc.isError) alerts.push({ text: "A conexão com o Google falhou. Abra Desempenho no Google para refazer a conexão.", to: "search-performance" });
  if (audits.data && !lastAudit) alerts.push({ text: "Nenhuma auditoria técnica concluída ainda.", to: "audit" });
  if (f.pendingApproval > 0) alerts.push({ text: `${f.pendingApproval} ${f.pendingApproval === 1 ? "abordagem espera" : "abordagens esperam"} sua aprovação na Prospecção B2B.` });

  return (
    <div className="overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader title="Painel Geral" description="O que está acontecendo no comercial e no Google, e o que pede sua atenção." />

        {alerts.length > 0 && (
          <Card className="p-4 border-l-4 border-l-[#B08D57] space-y-1.5">
            <p className="text-sm font-semibold">Pede sua atenção</p>
            {alerts.map((a) => (
              <p key={a.text} className="text-sm">
                • {a.text}{" "}
                {a.to && (
                  <Link to={`/p/$projectId/${a.to}` as "/p/$projectId/audit"} params={{ projectId }} className="text-primary underline">
                    Resolver
                  </Link>
                )}
              </p>
            ))}
          </Card>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Comercial</h2>
          {leads.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando o funil…</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label="Leads captados (30 dias)" value={f.created} />
              <Kpi label="Empresas em prospecção" value={f.byStage.find((s) => s.id === "prospect")?.n ?? 0} />
              <Kpi label="Oportunidades em andamento" value={f.open} />
              <Kpi label="Negócios ganhos" value={f.won} />
              <Kpi label="Negócios perdidos" value={f.lost} />
            </div>
          )}
          <Link to="/companies" search={{ tab: "kanban" } as never} className="text-sm text-primary underline">
            Abrir o funil de Prospecção B2B
          </Link>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Google (últimos 28 dias)</h2>
          {gsc.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando dados do Google…</p>
          ) : gsc.data?.connected ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Cliques" value={gsc.data.totals.clicks} hint="" />
              <Kpi label="Impressões" value={gsc.data.totals.impressions} />
              <Kpi label="CTR" value={`${(gsc.data.totals.ctr * 100).toFixed(1)}%`} />
              <Kpi label="Posição média" value={gsc.data.totals.position.toFixed(1)} />
              <p className="col-span-full text-xs text-muted-foreground">
                Cliques <Delta now={gsc.data.totals.clicks} before={gsc.data.prevTotals.clicks} /> · Impressões{" "}
                <Delta now={gsc.data.totals.impressions} before={gsc.data.prevTotals.impressions} /> em relação aos 28 dias
                anteriores. Fonte: Google Search Console.
              </p>
            </div>
          ) : (
            <ConecteGoogle projectId={projectId} oque="cliques, impressões e posição média do site" />
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Saúde técnica do site</h2>
          {lastAudit ? (
            <Card className="p-4 text-sm flex flex-wrap items-center justify-between gap-2">
              <span>
                Última auditoria em {new Date(lastAudit.completedAt ?? lastAudit.startedAt).toLocaleDateString("pt-BR")}:{" "}
                {lastAudit.pagesCrawled} páginas analisadas de {lastAudit.startUrl}.
              </span>
              <Link to="/p/$projectId/audit" params={{ projectId }} className="text-primary underline">
                Ver problemas identificados
              </Link>
            </Card>
          ) : (
            <Card className="p-4 text-sm">
              Rode a primeira auditoria técnica para saber o que corrigir no site.{" "}
              <Link to="/p/$projectId/audit" params={{ projectId }} className="text-primary underline">
                Iniciar auditoria
              </Link>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
