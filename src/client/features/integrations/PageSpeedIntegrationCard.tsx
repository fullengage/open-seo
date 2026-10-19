import * as React from "react";
import { useState } from "react";
import { CardShell } from "@/client/components/CardShell";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { runOnDemandPageSpeed } from "@/serverFunctions/pagespeed";
import { toast } from "sonner";
import {
  Gauge,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Zap,
} from "lucide-react";

export function PageSpeedIntegrationCard({
  defaultUrl,
}: {
  defaultUrl?: string;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "https://mgi.com.br");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof runOnDemandPageSpeed>
  > | null>(null);

  const handleTest = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || loading) return;

    try {
      setLoading(true);
      const data = await runOnDemandPageSpeed({
        data: {
          url: url.trim(),
          strategy,
        },
      });
      setResult(data);
      toast.success("Análise de velocidade concluída com sucesso!");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao consultar Google PageSpeed Insights.",
      );
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number | null | undefined) => {
    if (score == null) return "bg-muted text-muted-foreground";
    if (score >= 90) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (score >= 50) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  };

  return (
    <CardShell
      title="Google PageSpeed Insights & Core Web Vitals"
      icon={<Gauge className="size-5 text-emerald-600" />}
      action={<Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-medium">Ativo • 25.000 requisições/dia</Badge>}
    >
      <div className="space-y-6 py-2">
        <p className="text-sm text-muted-foreground">
          O Google PageSpeed Insights mede o desempenho real e as métricas essenciais
          (Core Web Vitals — LCP, CLS, INP) usando a infraestrutura do Google.
          As verificações do Lighthouse no Site Audit utilizam esta conexão direta, sem custos adicionais.
        </p>

        <form onSubmit={(e) => void handleTest(e)} className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label htmlFor="test-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                URL para Teste Imediato
              </label>
              <Input
                id="test-url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleTest();
                  }
                }}
                placeholder="https://exemplo.com.br"
                className="mt-1"
              />
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dispositivo
              </span>
              <div className="mt-1 flex items-center gap-1 rounded-lg border border-border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={strategy === "mobile" ? "default" : "ghost"}
                  onClick={() => setStrategy("mobile")}
                  className="h-8 gap-1.5 px-3 text-xs"
                >
                  <Smartphone className="size-3.5" /> Mobile
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={strategy === "desktop" ? "default" : "ghost"}
                  onClick={() => setStrategy("desktop")}
                  className="h-8 gap-1.5 px-3 text-xs"
                >
                  <Monitor className="size-3.5" /> Desktop
                </Button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <Button
                type="button"
                onClick={() => void handleTest()}
                disabled={loading}
                className="mt-1 sm:mt-5 h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Analisando...
                  </>
                ) : (
                  <>
                    <Zap className="size-4" /> Testar Velocidade
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {result && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm animate-in fade-in-50 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="font-medium text-sm">
                  Resultado para <span className="text-foreground font-semibold">{result.metadata.finalUrl}</span> ({result.metadata.strategy})
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Lighthouse v{result.metadata.lighthouseVersion ?? "12"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={`flex flex-col items-center justify-center rounded-lg border p-3 ${scoreColor(result.scores.performance)}`}>
                <span className="text-2xl font-bold">{result.scores.performance ?? "—"}</span>
                <span className="text-xs font-medium">Performance</span>
              </div>
              <div className={`flex flex-col items-center justify-center rounded-lg border p-3 ${scoreColor(result.scores.accessibility)}`}>
                <span className="text-2xl font-bold">{result.scores.accessibility ?? "—"}</span>
                <span className="text-xs font-medium">Acessibilidade</span>
              </div>
              <div className={`flex flex-col items-center justify-center rounded-lg border p-3 ${scoreColor(result.scores["best-practices"])}`}>
                <span className="text-2xl font-bold">{result.scores["best-practices"] ?? "—"}</span>
                <span className="text-xs font-medium">Boas Práticas</span>
              </div>
              <div className={`flex flex-col items-center justify-center rounded-lg border p-3 ${scoreColor(result.scores.seo)}`}>
                <span className="text-2xl font-bold">{result.scores.seo ?? "—"}</span>
                <span className="text-xs font-medium">SEO</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Métricas Core Web Vitals
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <div className="text-xs text-muted-foreground">LCP (Carregamento)</div>
                  <div className="text-base font-semibold text-foreground">
                    {result.metrics.largestContentfulPaint.displayValue ?? "—"}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <div className="text-xs text-muted-foreground">CLS (Estabilidade)</div>
                  <div className="text-base font-semibold text-foreground">
                    {result.metrics.cumulativeLayoutShift.displayValue ?? "—"}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <div className="text-xs text-muted-foreground">INP (Interatividade)</div>
                  <div className="text-base font-semibold text-foreground">
                    {result.metrics.interactionToNextPaint.displayValue ?? "—"}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <div className="text-xs text-muted-foreground">TTFB (Servidor)</div>
                  <div className="text-base font-semibold text-foreground">
                    {result.metrics.serverResponseTime.displayValue ?? "—"}
                  </div>
                </div>
              </div>
            </div>

            {result.issues.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Oportunidades de Otimização ({result.issues.length})
                </span>
                <div className="space-y-2">
                  {result.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm"
                    >
                      <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${
                        issue.severity === "critical"
                          ? "text-rose-500"
                          : issue.severity === "warning"
                            ? "text-amber-500"
                            : "text-blue-500"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{issue.title}</span>
                          {issue.displayValue && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {issue.displayValue}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {issue.description.replace(/\[Learn more\]\(.*?\)\.?/g, "")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CardShell>
  );
}
