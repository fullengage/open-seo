import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  GscNotConnectedError,
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import { resolveDateRange } from "@/server/features/gsc/searchAnalytics";
import { previousPeriod } from "@/server/features/gsc/searchPerformanceReport";
import { requireProjectContext } from "@/serverFunctions/middleware";

type Row = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

/**
 * Monitor de Posições a partir do Google Search Console (gratuito).
 * É a POSIÇÃO MÉDIA da consulta no período, não a posição exata numa busca específica.
 * Compara os últimos 28 dias com os 28 anteriores.
 */
export const getPositionMonitor = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ context }) => {
    const { startDate, endDate } = resolveDateRange({ dateRange: "last_28_days" });
    const prev = previousPeriod(startDate, endDate);
    try {
      const fetchRows = (s: string, e: string) =>
        GscService.getPerformance({
          projectId: context.projectId,
          startDate: s,
          endDate: e,
          dimensions: ["query", "page"],
          rowLimit: 1000,
        }).then((r) => r.rows as Row[]);
      const [cur, before] = await Promise.all([fetchRows(startDate, endDate), fetchRows(prev.startDate, prev.endDate)]);
      const key = (r: Row) => `${r.keys?.[0] ?? ""}\u0000${r.keys?.[1] ?? ""}`;
      const prevPos = new Map(before.map((r) => [key(r), r.position ?? null]));
      const rows = cur
        .filter((r) => (r.impressions ?? 0) >= 10) // ponytail: abaixo de 10 impressões a média oscila demais
        .map((r) => {
          const p = prevPos.get(key(r)) ?? null;
          const pos = r.position ?? 0;
          return {
            query: r.keys?.[0] ?? "",
            page: r.keys?.[1] ?? "",
            clicks: r.clicks ?? 0,
            impressions: r.impressions ?? 0,
            ctr: r.ctr ?? 0,
            position: pos,
            previousPosition: p,
            // positivo = subiu no Google (posição menor)
            change: p === null ? null : p - pos,
          };
        })
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 200);
      return {
        connected: true as const,
        source: "Google Search Console — posição média",
        range: { startDate, endDate, prevStartDate: prev.startDate, prevEndDate: prev.endDate },
        rows,
      };
    } catch (error) {
      if (error instanceof GscNotConnectedError || isExpectedGrantFailure(error)) {
        return { connected: false as const };
      }
      throw error;
    }
  });
