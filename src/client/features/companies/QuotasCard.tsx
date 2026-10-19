import { CheckCircle2, ShieldCheck, Zap, Server, Database, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";

export function QuotasCard() {
  const quotas = [
    {
      name: "Google PageSpeed Insights v5",
      quota: "25.000 requisições / dia",
      cost: "R$ 0,00 (Gratuito Oficial)",
      status: "Ativo & Conectado",
      icon: Zap,
      detail: "Análise completa de Core Web Vitals e Lighthouse sob demanda via API do projeto A4IA SaaS.",
    },
    {
      name: "Crawler Nativo & Incremental",
      quota: "Ilimitado",
      cost: "R$ 0,00 (Sem DataForSEO)",
      status: "Operacional",
      icon: Server,
      detail: "Streaming HTML parser próprio com detecção de HTTP 304 e cálculo de deltas entre auditorias.",
    },
    {
      name: "Base de Dados Cadastrais & QSA",
      quota: "Ilimitado (Nacional)",
      cost: "R$ 0,00 (Público)",
      status: "Conectado",
      icon: Database,
      detail: "Consulta a 55M+ CNPJs com sócios e administradores via Daemon Local + BrasilAPI.",
    },
    {
      name: "Google Search Console OAuth",
      quota: "Conforme cota Google",
      cost: "R$ 0,00",
      status: "Conectado",
      icon: Globe,
      detail: "Extração nativa de posições, cliques, impressões e oportunidades Striking Distance.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Arquitetura de Custo Zero & Monitor de Cotas
            </CardTitle>
            <CardDescription>
              Operação 100% autônoma e escalável com custos previsíveis e sem surpresas de faturamento por requisição.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-xs w-fit">
            Custo Fixo de APIs: R$ 0,00/mês
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {quotas.map((q, idx) => {
            const Icon = q.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-border bg-muted/20 flex flex-col justify-between space-y-2 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold text-xs text-foreground">{q.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">
                    {q.cost}
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground">{q.detail}</p>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Cota: <b className="text-foreground">{q.quota}</b></span>
                  <span className="text-emerald-500 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {q.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
