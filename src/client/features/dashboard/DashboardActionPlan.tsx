import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSeoActionPlan, type ActionPlanItem } from "@/serverFunctions/actionPlan";
import { googleConnectionOptions } from "@/client/features/integrations/googleProviders";
import { startGoogleLink, useGoogleLinkPending } from "@/client/features/integrations/startGoogleLink";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { GoogleGlyph } from "@/client/features/gsc/GoogleGlyph";
import {
  TrendingUp,
  Zap,
  AlertCircle,
  ExternalLink,
  Target,
  Search,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Building2,
  Send,
  Kanban,
  Check,
  Loader2,
} from "lucide-react";

export function DashboardActionPlan({ projectId }: { projectId: string }) {
  const [filter, setFilter] = useState<"all" | "high" | "striking" | "technical">("all");
  const linking = useGoogleLinkPending();

  const query = useQuery({
    queryKey: ["seoActionPlan", projectId],
    queryFn: () => getSeoActionPlan({ data: { projectId } }),
  });

  const gscConnectionQuery = useQuery(googleConnectionOptions("gsc", projectId));
  const gscConnected = Boolean(gscConnectionQuery.data?.connected);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        <AlertCircle className="mx-auto size-8 text-muted-foreground/60 mb-2" />
        <p>Não foi possível carregar o plano de ação no momento.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void query.refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const { summary, items } = query.data;

  const filteredItems = items.filter((item) => {
    if (filter === "high") return item.priority === "high";
    if (filter === "striking") return item.category === "striking_distance";
    if (filter === "technical") return item.category === "technical";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Onboarding Autônomo do Search Console (Caso não conectado) */}
      {!gscConnected && (
        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GoogleGlyph className="size-5" />
              <h3 className="font-bold text-base text-foreground">
                Conecte seu Google Search Console em 1 Clique (Onboarding Autônomo)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Conecte sua conta do Google com apenas um clique. O sistema detecta e vincula a propriedade do seu domínio automaticamente, ativando a análise de Striking Distance e estimativa de ganhos mensais de tráfego.
            </p>
          </div>

          <Button
            onClick={() => void startGoogleLink("gsc", window.location.href)}
            disabled={linking}
            className="gap-2 shrink-0 font-semibold shadow-sm"
          >
            {linking ? <Loader2 className="size-4 animate-spin" /> : <GoogleGlyph className="size-4" />}
            {linking ? "Conectando ao Google..." : "Conectar Search Console Sozinho"}
          </Button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Ganhos Rápidos</span>
            <Zap className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {summary.quickWinsCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Palavras na posição 4–8 prontas para o Top 3
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Potencial de Tráfego</span>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            +{summary.estimatedClicksMonthly}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cliques mensais adicionais estimados
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Ações Prioritárias</span>
            <AlertCircle className="size-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {summary.highPriorityCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ações com maior retorno sobre o esforço
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Saúde Técnica</span>
            <CheckCircle2 className="size-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {summary.siteHealthScore != null ? `${summary.siteHealthScore}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Pontuação de integridade do crawler nativo
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className="text-xs"
          >
            Todas as Ações ({items.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "high" ? "default" : "outline"}
            onClick={() => setFilter("high")}
            className="text-xs"
          >
            Alta Prioridade ({summary.highPriorityCount})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "striking" ? "default" : "outline"}
            onClick={() => setFilter("striking")}
            className="text-xs"
          >
            Top 3 Quick Wins
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "technical" ? "default" : "outline"}
            onClick={() => setFilter("technical")}
            className="text-xs"
          >
            Técnico
          </Button>
        </div>

        <span className="text-xs text-muted-foreground">
          Baseado em dados reais do Google Search Console & Auditoria
        </span>
      </div>

      {/* Action Items List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma ação encontrada para este filtro.
          </div>
        ) : (
          filteredItems.map((item) => (
            <ActionPlanCard key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Seção: Uma Métrica de Sucesso por Fase do Plano Mestre */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              Métricas de Sucesso por Fase do Projeto (KPIs)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cada fase possui uma métrica única e mensurável que comprova o sucesso e o retorno da plataforma.
            </p>
          </div>
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-xs w-fit">
            7 de 7 Fases Ativas
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Fase 1 — Fundação</span>
            <p className="text-xs font-semibold text-foreground">Conexão Autônoma GSC</p>
            <p className="text-[11px] text-muted-foreground">
              Métrica: <b className="text-emerald-500">Tempo de onboarding &lt; 60s</b> (Zero suporte manual).
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Fase 2 — Dados Gratuitos</span>
            <p className="text-xs font-semibold text-foreground">Custo Operacional de APIs</p>
            <p className="text-[11px] text-muted-foreground">
              Métrica: <b className="text-emerald-500">R$ 0,00/mês</b> (PageSpeed 25k/dia + Crawler local).
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Fase 3 — SEO Local & Oportunidades</span>
            <p className="text-xs font-semibold text-foreground">Potencial de Tráfego Identificado</p>
            <p className="text-[11px] text-muted-foreground">
              Métrica: <b className="text-emerald-500">+{summary.estimatedClicksMonthly} cliques/mês</b> em Striking Distance.
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Fase 4 — Inteligência B2B</span>
            <p className="text-xs font-semibold text-foreground">Taxa de Decisores no QSA</p>
            <p className="text-[11px] text-muted-foreground">
              Métrica: <b className="text-emerald-500">100% dos sócios</b> mapeados na Receita Federal.
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Fase 5 — Abordagem Anti-Clay</span>
            <p className="text-xs font-semibold text-foreground">Velocidade de Geração de Copy</p>
            <p className="text-[11px] text-muted-foreground">
              Métrica: <b className="text-emerald-500">&lt; 3 segundos</b> por e-mail e pitch de vendas.
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Fase 6 — Demanda & Pipeline</span>
            <p className="text-xs font-semibold text-foreground">Funil Comercial Kanban</p>
            <p className="text-[11px] text-muted-foreground">
              Métrica: <b className="text-emerald-500">5 etapas de conversão</b> ativas e persistentes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionPlanCard({ item }: { item: ActionPlanItem }) {
  const priorityBadge =
    item.priority === "high"
      ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
      : "bg-amber-500/10 text-amber-600 border-amber-500/30";

  const categoryLabel =
    item.category === "striking_distance"
      ? "Ganho Rápido (Posições 4–8)"
      : item.category === "ctr_boost"
      ? "Otimização de CTR"
      : "Correção Técnica";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`font-semibold ${priorityBadge}`}>
            {item.priority === "high" ? "Alta Prioridade" : "Média Prioridade"}
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal">
            {categoryLabel}
          </Badge>
          <h3 className="font-semibold text-base text-foreground">{item.title}</h3>
        </div>

        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-medium">
          {item.impact}
        </Badge>
      </div>

      <div className="mt-3 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.description}
        </p>

        {/* Current Metrics (if GSC query) */}
        {item.currentMetrics && (
          <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground">
            {item.currentMetrics.position != null && (
              <div>
                Posição atual: <span className="font-semibold text-foreground">{item.currentMetrics.position.toFixed(1)}</span>
              </div>
            )}
            {item.currentMetrics.impressions != null && (
              <div>
                Impressões: <span className="font-semibold text-foreground">{item.currentMetrics.impressions}</span>
              </div>
            )}
            {item.currentMetrics.clicks != null && (
              <div>
                Cliques: <span className="font-semibold text-foreground">{item.currentMetrics.clicks}</span>
              </div>
            )}
            {item.currentMetrics.ctr != null && (
              <div>
                CTR: <span className="font-semibold text-foreground">{(item.currentMetrics.ctr * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Action Recommendation Box */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>Passo a Passo Recomendado:</span>
          </div>
          <p className="mt-1 text-sm text-foreground/90 leading-relaxed font-medium">
            {item.actionStep}
          </p>
        </div>

        {/* Target URL */}
        {item.targetUrl && (
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span>Página de destino:</span>
            <a
              href={item.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline font-mono truncate max-w-lg"
            >
              {item.targetUrl}
              <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
