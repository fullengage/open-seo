import { useState, useEffect } from "react";
import {
  Kanban,
  Building2,
  Phone,
  Mail,
  MapPin,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/client/components/ui/card";
import { toast } from "sonner";
import type { PipelineLead, PipelineStage } from "./types";
import { OutreachCopyDialog } from "./OutreachCopyDialog";
import type { CompanyDetail } from "@/types/schemas/company";

const STORAGE_KEY = "openseo_b2b_pipeline_leads";

const COLUMNS: { id: PipelineStage; label: string; color: string }[] = [
  { id: "prospect", label: "Prospecção", color: "border-sky-500/40" },
  { id: "audit_ready", label: "Diagnóstico Pronto", color: "border-amber-500/40" },
  { id: "outreach_sent", label: "Abordagem Enviada", color: "border-purple-500/40" },
  { id: "negotiation", label: "Em Negociação", color: "border-blue-500/40" },
  { id: "won", label: "Contrato Fechado 🏆", color: "border-emerald-500/40" },
];

export function LeadsKanban() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [activeOutreachCompany, setActiveOutreachCompany] = useState<CompanyDetail | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setLeads(JSON.parse(saved));
      } else {
        // Initial sample B2B lead to delight the user on first load
        const initialSample: PipelineLead[] = [
          {
            id: "lead-1",
            cnpj: "53485309000185",
            razaoSocial: "MGI TECNOLOGIA E SERVICOS LTDA",
            nomeFantasia: "MGI",
            uf: "SP",
            municipio: "Campinas",
            telefone: "(19) 3251-4000",
            email: "contato@mgi.com.br",
            cnae: "6201501",
            cnaeDescricao: "Desenvolvimento de programas de computador",
            socioPrincipal: "Richard Wagner",
            stage: "audit_ready",
            createdAt: new Date().toISOString(),
          },
        ];
        setLeads(initialSample);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSample));
      }
    } catch {
      // ignore
    }
  }, []);

  function saveLeads(updated: PipelineLead[]) {
    setLeads(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function handleMove(id: string, direction: "next" | "prev") {
    const stageOrder: PipelineStage[] = [
      "prospect",
      "audit_ready",
      "outreach_sent",
      "negotiation",
      "won",
    ];

    const updated = leads.map((lead) => {
      if (lead.id !== id) return lead;
      const currentIndex = stageOrder.indexOf(lead.stage);
      const nextIndex =
        direction === "next"
          ? Math.min(currentIndex + 1, stageOrder.length - 1)
          : Math.max(currentIndex - 1, 0);

      return { ...lead, stage: stageOrder[nextIndex] };
    });

    saveLeads(updated);
    toast.success("Status do lead atualizado no Pipeline!");
  }

  function handleDelete(id: string) {
    const updated = leads.filter((l) => l.id !== id);
    saveLeads(updated);
    toast.success("Lead removido do pipeline.");
  }

  function handleOpenOutreach(lead: PipelineLead) {
    const syntheticDetail: CompanyDetail = {
      cnpj: lead.cnpj,
      cnpjBasico: lead.cnpj.slice(0, 8),
      razaoSocial: lead.razaoSocial,
      nomeFantasia: lead.nomeFantasia,
      cnae: lead.cnae || "",
      cnaeDescricao: lead.cnaeDescricao,
      uf: lead.uf,
      municipio: lead.municipio,
      telefone: lead.telefone,
      email: lead.email,
      socios: lead.socioPrincipal ? [{ nome: lead.socioPrincipal }] : [],
    };
    setActiveOutreachCompany(syntheticDetail);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Kanban className="h-5 w-5 text-primary" />
            Pipeline Comercial & Prospecção Ativa (Anti-Clay)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe o funil de prospecção, qualificação, abordagem e fechamento de clientes B2B.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {leads.length} Leads Ativos
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.stage === col.id);

          return (
            <div
              key={col.id}
              className={`flex flex-col bg-muted/20 border-t-2 ${col.color} border-x border-b border-border rounded-lg p-3 min-h-[450px] space-y-3`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full font-mono text-muted-foreground">
                  {colLeads.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {colLeads.map((lead) => (
                  <Card key={lead.id} className="p-3 space-y-2 bg-card shadow-xs hover:border-primary/50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-xs line-clamp-1">
                        {lead.nomeFantasia || lead.razaoSocial}
                      </h4>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {lead.municipio ? `${lead.municipio} - ${lead.uf}` : lead.uf}
                      </p>
                    </div>

                    {lead.socioPrincipal && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3 text-primary" />
                        <span className="text-foreground font-medium">{lead.socioPrincipal}</span>
                      </p>
                    )}

                    <div className="text-[10px] space-y-0.5 text-muted-foreground">
                      {lead.telefone && (
                        <p className="flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" /> {lead.telefone}
                        </p>
                      )}
                      {lead.email && (
                        <p className="flex items-center gap-1 truncate">
                          <Mail className="h-2.5 w-2.5" /> {lead.email}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(lead.id)}
                        title="Remover lead"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-1.5 gap-1 text-primary hover:text-primary font-medium"
                        onClick={() => handleOpenOutreach(lead)}
                        title="Gerar Copy de Vendas"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        Copy
                      </Button>

                      <div className="flex items-center gap-1">
                        {col.id !== "prospect" && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMove(lead.id, "prev")}
                            title="Voltar etapa"
                          >
                            <ArrowLeft className="h-2.5 w-2.5" />
                          </Button>
                        )}
                        {col.id !== "won" && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMove(lead.id, "next")}
                            title="Avançar etapa"
                          >
                            <ArrowRight className="h-2.5 w-2.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {colLeads.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-[11px] text-muted-foreground/60 italic border border-dashed border-border/60 rounded-md">
                    Nenhum lead nesta etapa
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeOutreachCompany && (
        <OutreachCopyDialog
          company={activeOutreachCompany}
          isOpen={!!activeOutreachCompany}
          onClose={() => setActiveOutreachCompany(null)}
        />
      )}
    </div>
  );
}
