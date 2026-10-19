import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSeoActionPlan, type ActionPlanItem } from "@/serverFunctions/actionPlan";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  TrendingUp,
  Zap,
  AlertCircle,
  ExternalLink,
  Target,
  Search,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export function DashboardActionPlan({ projectId }: { projectId: string }) {
  const [filter, setFilter] = useState<"all" | "high" | "striking" | "technical">("all");

  const query = useQuery({
    queryKey: ["seoActionPlan", projectId],
    queryFn: () => getSeoActionPlan({ data: { projectId } }),
  });

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
    <div className="space-y-6">
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
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {summary.highPriorityCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Tarefas de impacto imediato
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Saúde Técnica</span>
            <CheckCircle2 className="size-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {summary.siteHealthScore != null ? `${summary.siteHealthScore}%` : "100%"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Score técnico do último crawl
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5">
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
    </div>
  );
}

function ActionPlanCard({ item }: { item: ActionPlanItem }) {
  const priorityBadge = {
    high: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  }[item.priority];

  const categoryLabel = {
    striking_distance: "Ganhos Rápidos",
    ctr_boost: "Otimização de CTR",
    technical: "Técnico",
    core_web_vitals: "Velocidade",
  }[item.category];

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
