import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { getPipelineLeads } from "@/serverFunctions/pipelineLeads";
import type { PipelineLead, PipelineStage } from "@/client/features/companies/types";

export const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "prospect", label: "Prospecção" },
  { id: "audit_ready", label: "Diagnóstico pronto" },
  { id: "outreach_sent", label: "Abordagem enviada" },
  { id: "negotiation", label: "Em negociação" },
  { id: "won", label: "Ganhos" },
  { id: "lost", label: "Perdidos" },
];

export function useLeads() {
  return useQuery({ queryKey: ["pipelineLeads"], queryFn: () => getPipelineLeads() });
}

/** Números do funil a partir dos leads reais do banco. */
export function funnel(leads: PipelineLead[], sinceMs?: number) {
  const inPeriod = sinceMs ? leads.filter((l) => Date.parse(l.createdAt) >= sinceMs) : leads;
  const count = (s: PipelineStage) => leads.filter((l) => l.stage === s).length;
  const approved = leads.filter(
    (l) => l.draft?.status === "approved" && (!sinceMs || (l.draft.approvedAt && Date.parse(l.draft.approvedAt) >= sinceMs)),
  ).length;
  const pendingApproval = leads.filter((l) => l.draft && l.draft.status !== "approved").length;
  const won = count("won"), lost = count("lost");
  return {
    total: leads.length,
    created: inPeriod.length,
    byStage: STAGES.map((s) => ({ ...s, n: count(s.id) })),
    open: leads.filter((l) => !["won", "lost"].includes(l.stage)).length,
    won,
    lost,
    approved,
    pendingApproval,
    // ponytail: taxa sobre negócios encerrados; sem data de mudança de etapa, é a taxa acumulada
    winRate: won + lost >= 3 ? Math.round((won / (won + lost)) * 100) : null,
  };
}

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

export function RelatorioComercial() {
  const [days, setDays] = useState(30);
  const q = useLeads();
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando o funil…</p>;
  if (q.isError) return <Card className="p-4 text-sm">Não foi possível carregar os leads agora.</Card>;
  const leads = q.data ?? [];
  const f = funnel(leads, Date.now() - days * 86400000);

  return (
    <Card className="p-5 space-y-4 print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Relatório de Inteligência Comercial</h2>
          <p className="text-xs text-muted-foreground">Dados reais do funil de Prospecção B2B.</p>
        </div>
        <div className="flex items-center gap-1 print:hidden">
          {PERIODS.map((p) => (
            <Button key={p.days} size="sm" variant={p.days === days ? "default" : "outline"} onClick={() => setDays(p.days)}>
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            Exportar PDF
          </Button>
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm">
          Ainda não há leads no funil. Comece pela Prospecção B2B: busque empresas por CNAE e adicione ao funil.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label={`Leads captados (${days} dias)`} value={f.created} />
            <Kpi label={`Abordagens aprovadas (${days} dias)`} value={f.approved} />
            <Kpi label="Oportunidades em andamento" value={f.open} />
            <Kpi label="Taxa de ganho" value={f.winRate === null ? "—" : `${f.winRate}%`} hint={f.winRate === null ? "Aparece com 3 ou mais negócios encerrados" : "Ganhos sobre ganhos + perdidos"} />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Funil hoje</p>
            <div className="space-y-1.5">
              {f.byStage.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="w-40 shrink-0 text-muted-foreground">{s.label}</span>
                  <div className="h-2 rounded bg-primary/80" style={{ width: `${f.total ? Math.max((s.n / f.total) * 100, s.n ? 2 : 0) : 0}%` }} />
                  <span className="tabular-nums">{s.n}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm">
            <strong>Resumo:</strong> nos últimos {days} dias entraram {f.created} {f.created === 1 ? "lead" : "leads"} e{" "}
            {f.approved} {f.approved === 1 ? "abordagem foi aprovada" : "abordagens foram aprovadas"}. Hoje há {f.open}{" "}
            {f.open === 1 ? "oportunidade aberta" : "oportunidades abertas"}, {f.won} {f.won === 1 ? "ganha" : "ganhas"} e {f.lost}{" "}
            {f.lost === 1 ? "perdida" : "perdidas"}.
            {f.pendingApproval > 0 && ` ${f.pendingApproval} ${f.pendingApproval === 1 ? "abordagem espera" : "abordagens esperam"} sua aprovação.`}
          </p>
          <p className="text-xs text-muted-foreground">
            Ganhos, perdidos e etapas mostram a situação atual do funil; o sistema ainda não registra a data em que cada
            lead mudou de etapa.
          </p>
        </>
      )}
    </Card>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
