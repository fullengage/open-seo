import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { GscService } from "@/server/features/gsc/services/GscService";
import { resolveDateRange } from "@/server/features/gsc/searchAnalytics";
import { buildStrikingDistanceRows } from "@/server/features/gsc/searchPerformanceReport";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";

const actionPlanInputSchema = z.object({
  projectId: z.string().min(1),
});

export type ActionPlanItem = {
  id: string;
  priority: "high" | "medium" | "low";
  category: "striking_distance" | "ctr_boost" | "technical" | "core_web_vitals";
  title: string;
  description: string;
  impact: string;
  actionStep: string;
  targetQuery?: string;
  targetUrl?: string;
  currentMetrics?: {
    impressions?: number;
    clicks?: number;
    position?: number;
    ctr?: number;
  };
};

export type SeoActionPlanResponse = {
  summary: {
    totalOpportunities: number;
    highPriorityCount: number;
    quickWinsCount: number;
    estimatedClicksMonthly: number;
    siteHealthScore: number | null;
  };
  items: ActionPlanItem[];
};

export const getSeoActionPlan = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(actionPlanInputSchema)
  .handler(async ({ data, context }): Promise<SeoActionPlanResponse> => {
    const projectId = context.projectId;
    const items: ActionPlanItem[] = [];
    let estimatedClicksMonthly = 0;

    // 1. Fetch Search Console Performance data (Last 28 days)
    const { startDate, endDate } = resolveDateRange({ dateRange: "last_28_days" });

    try {
      const gscResult = await GscService.getPerformance({
        projectId,
        startDate,
        endDate,
        dimensions: ["query", "page"],
        filters: [],
        rowLimit: 500,
      });

      const gscRows = gscResult.rows ?? [];

      if (gscRows.length > 0) {
        // Find Striking Distance queries (Position 4.0 to 15.0)
        const striking = buildStrikingDistanceRows(gscRows, 50);

        for (const row of striking) {
          // Expected top 3 CTR is ~15% - 25%.
          // If query gets moved to top 3 from pos 4-15, estimated gain is impressions * 0.12 - current clicks
          const potentialClicks = Math.max(
            0,
            Math.round(row.impressions * 0.12 - row.clicks),
          );
          estimatedClicksMonthly += potentialClicks;

          const isTopStriking = row.position <= 8 && row.impressions >= 50;

          if (isTopStriking) {
            items.push({
              id: `gsc-striking-${row.query}`,
              priority: "high",
              category: "striking_distance",
              title: `Elevar "${row.query}" para o Top 3`,
              description: `A consulta já aparece na posição ${row.position.toFixed(1)} com ${row.impressions} impressões. Subir para os 3 primeiros lugares do Google pode gerar até +${potentialClicks} cliques/mês.`,
              impact: `+${potentialClicks} cliques/mês estimados`,
              actionStep: `Adicione a palavra-chave "${row.query}" no início da Title Tag e no primeiro subtítulo H2 da página. Insira também 2 links internos apontando para ela.`,
              targetQuery: row.query,
              targetUrl: row.page,
              currentMetrics: {
                impressions: row.impressions,
                clicks: row.clicks,
                position: row.position,
                ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
              },
            });
          } else if (row.position <= 15 && row.impressions >= 30) {
            items.push({
              id: `gsc-expand-${row.query}`,
              priority: "medium",
              category: "striking_distance",
              title: `Conquistar 1ª página para "${row.query}"`,
              description: `Atualmente na posição ${row.position.toFixed(1)} com ${row.impressions} impressões. Poucos ajustes de autoridade e conteúdo colocarão a página na primeira página.`,
              impact: `+${potentialClicks} cliques/mês estimados`,
              actionStep: `Crie uma seção dedicada respondendo diretamente à intenção de busca de "${row.query}" com tópicos objetivos e listas com marcadores.`,
              targetQuery: row.query,
              targetUrl: row.page,
              currentMetrics: {
                impressions: row.impressions,
                clicks: row.clicks,
                position: row.position,
                ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
              },
            });
          }
        }

        // 2. Identify Underperforming CTR Queries (High impressions, low CTR)
        const lowCtrRows = gscRows.filter(
          (r) =>
            r.impressions >= 80 &&
            r.position <= 10 &&
            r.ctr < 0.02 &&
            r.keys?.[0] &&
            r.keys?.[1],
        );

        for (const row of lowCtrRows.slice(0, 8)) {
          const query = row.keys![0];
          const page = row.keys![1];
          const potentialGain = Math.round(row.impressions * 0.05);

          items.push({
            id: `gsc-ctr-${query}`,
            priority: "medium",
            category: "ctr_boost",
            title: `Aumentar CTR da consulta "${query}"`,
            description: `A página aparece bem posicionada (posição ${row.position.toFixed(1)}), mas apenas ${(row.ctr * 100).toFixed(1)}% dos usuários clicam. O título e meta descrição atuais não estão atraindo o clique.`,
            impact: `+${potentialGain} cliques/mês com melhoria de snippet`,
            actionStep: `Reescreva a Meta Description com uma chamada clara para ação (CTA) e benefícios diretos para aumentar a taxa de cliques no Google.`,
            targetQuery: query,
            targetUrl: page,
            currentMetrics: {
              impressions: row.impressions,
              clicks: row.clicks,
              position: row.position,
              ctr: row.ctr,
            },
          });
        }
      }
    } catch {
      // GSC might not be connected or has temporary network glitch
    }

    // 3. Technical Issues from Site Audit
    let siteHealthScore: number | null = null;
    try {
      const latestAudit = await AuditRepository.getLatestAuditForProject(projectId);
      if (latestAudit) {
        const auditIssues = await AuditRepository.getIssuesForAudit(latestAudit.id, {});
        const critical = auditIssues.filter((i) => i.severity === "critical").length;
        const warning = auditIssues.filter((i) => i.severity === "warning").length;
        siteHealthScore = Math.max(0, 100 - (critical * 10 + warning * 3));

        for (const issue of auditIssues.slice(0, 10)) {
          const isCritical = issue.severity === "critical";
          items.push({
            id: `tech-issue-${issue.id}`,
            priority: isCritical ? "high" : "medium",
            category: "technical",
            title: `Corrigir: ${issue.issueType.replace(/_/g, " ")}`,
            description: `Identificado pelo crawler com impacto na indexação e visibilidade.`,
            impact: isCritical ? "Evita perda de indexação no Google" : "Melhora rastreabilidade",
            actionStep: `Acesse o arquivo ou painel do site e regularize o problema apontado na auditoria técnica.`,
          });
        }
      }
    } catch {
      // audit repo fallback
    }

    // Sort items: High priority first, then medium, then low
    const priorityWeight = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);

    const highPriorityCount = items.filter((i) => i.priority === "high").length;
    const quickWinsCount = items.filter(
      (i) => i.category === "striking_distance" && i.priority === "high",
    ).length;

    return {
      summary: {
        totalOpportunities: items.length,
        highPriorityCount,
        quickWinsCount,
        estimatedClicksMonthly,
        siteHealthScore,
      },
      items,
    };
  });
