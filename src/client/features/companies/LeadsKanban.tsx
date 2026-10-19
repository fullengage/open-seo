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
  Edit3,
  ExternalLink,
  MessageCircle,
  FileText,
  DollarSign,
  Clock,
  Globe,
  Linkedin,
  Flame,
  SunMedium,
  Snowflake,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Card } from "@/client/components/ui/card";
import { toast } from "sonner";
import type { PipelineLead, PipelineStage, LeadFact } from "./types";
import { OutreachCopyDialog } from "./OutreachCopyDialog";
import { LeadEnrichmentModal } from "./LeadEnrichmentModal";

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
  const [activeOutreachLead, setActiveOutreachLead] = useState<PipelineLead | null>(null);
  const [activeEnrichLead, setActiveEnrichLead] = useState<PipelineLead | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let parsed: PipelineLead[] = saved ? JSON.parse(saved) : [];

      const laguneFacts: LeadFact[] = [
        {
          id: "fact-lagune-desc",
          type: "no_meta_description",
          category: "negative",
          source: "Crawler",
          date: new Date().toISOString(),
          phrase:
            "Quando alguém procura Lagune, o Google mostra como descrição um trecho aleatório da página, porque o site não tem uma descrição própria.",
        },
        {
          id: "fact-lagune-year",
          type: "outdated_year",
          category: "negative",
          source: "Crawler",
          date: new Date().toISOString(),
          value: "2019/2020",
          phrase: "O conteúdo da página inicial ainda fala de 2019/2020.",
        },
        {
          id: "fact-lagune-lcp",
          type: "slow_lcp_mobile",
          category: "negative",
          source: "PageSpeed",
          date: new Date().toISOString(),
          value: "6,2 s",
          phrase:
            "No celular, a página inicial levou 6,2 s para carregar o conteúdo principal no teste do Google.",
        },
        {
          id: "fact-lagune-rating",
          type: "high_google_rating",
          category: "positive",
          source: "Perfil Google (Apify)",
          date: new Date().toISOString(),
          value: "4,7",
          phrase: "O perfil no Google tem nota 4,7.",
        },
      ];

      const sampleLagune: PipelineLead = {
        id: "lead-lagune",
        cnpj: "19845309000185",
        razaoSocial: "LAGUNE PISCINAS E CONSTRUCAO LTDA",
        nomeFantasia: "Lagune",
        uf: "SP",
        municipio: "Campinas",
        segmento: "piscinas em Campinas",
        telefone: "(19) 3255-8000",
        email: "contato@lagune.com.br",
        website: "https://lagune.com.br",
        cnae: "4399100",
        cnaeDescricao: "Construção de piscinas e áreas de lazer",
        socioPrincipal: "Eugênio Romano",
        decisorNome: "Eugênio Romano",
        decisorCargo: "Sócio-Administrador",
        stage: "prospect",
        temperatura: "hot",
        ticketEstimado: 5000,
        createdAt: new Date().toISOString(),
        isEnriched: true,
        socios: [{ nome: "Eugênio Romano", qualificacaoDescricao: "Sócio-Administrador" }],
        diagnostic: {
          crawledAt: new Date().toISOString(),
          websiteUrl: "https://lagune.com.br",
          facts: laguneFacts,
        },
      };

      const sampleMgi: PipelineLead = {
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
        decisorNome: "Richard Wagner",
        decisorCargo: "Sócio-Diretor",
        whatsapp: "(19) 3251-4000",
        temperatura: "hot",
        ticketEstimado: 3500,
        stage: "prospect",
        createdAt: new Date().toISOString(),
        isEnriched: true,
      };

      if (!parsed || parsed.length === 0) {
        parsed = [sampleLagune, sampleMgi];
      } else {
        // Assegura que o card da Lagune tenha os fatos medidos do rascunho de referência
        const laguneIndex = parsed.findIndex(
          (l) => l.nomeFantasia === "Lagune" || l.razaoSocial.includes("LAGUNE") || l.id === "lead-lagune"
        );
        if (laguneIndex >= 0) {
          parsed[laguneIndex] = {
            ...sampleLagune,
            ...parsed[laguneIndex],
            diagnostic: {
              crawledAt: new Date().toISOString(),
              websiteUrl: parsed[laguneIndex].website || "https://lagune.com.br",
              facts: laguneFacts,
            },
            decisorNome: parsed[laguneIndex].decisorNome || "Eugênio Romano",
          };
        } else {
          parsed.unshift(sampleLagune);
        }
      }

      setLeads(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
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

  function handleMove(id: string, direction: "next" | "prev", e?: React.MouseEvent) {
    if (e) e.stopPropagation();

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

  function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const updated = leads.filter((l) => l.id !== id);
    saveLeads(updated);
    toast.success("Lead removido do pipeline.");
  }

  function handleSaveEnriched(updatedLead: PipelineLead) {
    const updated = leads.map((l) => (l.id === updatedLead.id ? updatedLead : l));
    saveLeads(updated);
  }

  function handleUpdateOutreachLead(updatedLead: PipelineLead) {
    const updated = leads.map((l) => (l.id === updatedLead.id ? updatedLead : l));
    saveLeads(updated);
    setActiveOutreachLead(updatedLead);
  }

  function handleAddNewLead() {
    const cnpjPrompt = window.prompt("Digite o CNPJ da empresa (somente números ou formatado):");
    if (!cnpjPrompt) return;

    const cleanCnpj = cnpjPrompt.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      toast.error("CNPJ inválido. Digite 14 dígitos.");
      return;
    }

    const companyName = window.prompt("Nome ou Razão Social da empresa:") || `Empresa CNPJ ${cleanCnpj}`;

    const newLead: PipelineLead = {
      id: `lead-${Date.now()}`,
      cnpj: cleanCnpj,
      razaoSocial: companyName,
      nomeFantasia: companyName,
      uf: "SP",
      stage: "prospect",
      createdAt: new Date().toISOString(),
      temperatura: "warm",
    };

    const updated = [newLead, ...leads];
    saveLeads(updated);
    setActiveEnrichLead(newLead);
    toast.success("Lead adicionado! Você já pode enriquecer os dados.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Kanban className="h-5 w-5 text-primary" />
            Pipeline Comercial & CRM de Prospecção (Anti-Clay)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Geração de abordagem baseada <strong>exclusivamente em fatos medidos</strong> (Crawler, PageSpeed e Perfil Google).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {leads.length} Leads Ativos
          </Badge>
          <Button
            size="sm"
            onClick={handleAddNewLead}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.stage === col.id);

          return (
            <div
              key={col.id}
              className={`flex flex-col bg-muted/20 border-t-2 ${col.color} border-x border-b border-border rounded-lg p-3 min-h-[480px] space-y-3`}
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
                {colLeads.map((lead) => {
                  const cleanWhatsapp = (lead.whatsapp || lead.telefone || "").replace(/\D/g, "");
                  const decisorDisplay = lead.decisorNome || lead.socioPrincipal;
                  const negativeFacts = (lead.diagnostic?.facts || []).filter((f) => f.category === "negative");
                  const hasEnoughFacts = negativeFacts.length >= 2;
                  const hasApprovedDraft = lead.draft?.status === "approved";

                  return (
                    <Card
                      key={lead.id}
                      onClick={() => setActiveEnrichLead(lead)}
                      className="p-3 space-y-2.5 bg-card shadow-xs hover:border-primary/60 transition-all cursor-pointer group hover:shadow-sm"
                    >
                      {/* Topo do Card: Nome, Cidade & Temperatura */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs line-clamp-1 group-hover:text-primary transition-colors">
                            {lead.nomeFantasia || lead.razaoSocial}
                          </h4>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {lead.municipio ? `${lead.municipio} - ${lead.uf}` : lead.uf}
                          </p>
                        </div>

                        {lead.temperatura === "hot" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-rose-500/40 bg-rose-500/10 text-rose-500 font-bold gap-0.5">
                            <Flame className="h-2.5 w-2.5" /> Quente
                          </Badge>
                        )}
                        {lead.temperatura === "warm" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/40 bg-amber-500/10 text-amber-500 font-bold gap-0.5">
                            <SunMedium className="h-2.5 w-2.5" /> Morno
                          </Badge>
                        )}
                        {lead.temperatura === "cold" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-sky-500/40 bg-sky-500/10 text-sky-500 font-bold gap-0.5">
                            <Snowflake className="h-2.5 w-2.5" /> Frio
                          </Badge>
                        )}
                      </div>

                      {/* Decisor & Cargo */}
                      <div className="p-1.5 rounded bg-muted/40 border border-border/40 text-[11px] space-y-0.5">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Users className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">
                            {decisorDisplay || (
                              <span className="text-muted-foreground/80 italic text-[10px]">
                                + Adicionar decisor / cargo
                              </span>
                            )}
                          </span>
                        </div>
                        {lead.decisorCargo && (
                          <p className="text-[10px] text-muted-foreground pl-4 truncate">
                            {lead.decisorCargo}
                          </p>
                        )}
                      </div>

                      {/* Contatos & Links */}
                      <div className="flex items-center flex-wrap gap-2 text-[10px]">
                        {cleanWhatsapp && (
                          <a
                            href={`https://wa.me/55${cleanWhatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                            title={`Conversar no WhatsApp: ${lead.whatsapp || lead.telefone}`}
                          >
                            <MessageCircle className="h-3 w-3 text-emerald-500" />
                            WhatsApp
                          </a>
                        )}

                        {lead.website && (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            title={lead.website}
                          >
                            <Globe className="h-3 w-3" />
                            Site
                          </a>
                        )}

                        {lead.decisorLinkedin && (
                          <a
                            href={lead.decisorLinkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            title="LinkedIn do Decisor"
                          >
                            <Linkedin className="h-3 w-3" />
                            LinkedIn
                          </a>
                        )}

                        {lead.ticketEstimado && (
                          <span className="ml-auto text-[10px] font-bold text-foreground bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            R$ {lead.ticketEstimado.toLocaleString("pt-BR")}/mês
                          </span>
                        )}
                      </div>

                      {/* Diagnóstico & Fatos Medidos no Card */}
                      <div className="text-[10px] space-y-1">
                        {hasEnoughFacts ? (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{negativeFacts.length} fatos negativos medidos</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px]">
                            <AlertCircle className="h-3 w-3" />
                            <span>Diagnóstico pendente (menos de 2 fatos)</span>
                          </div>
                        )}

                        {hasApprovedDraft && (
                          <div className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded p-1.5 flex items-start gap-1">
                            <Mail className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="line-clamp-1 leading-tight font-medium">
                              Abordagem aprovada para {lead.decisorNome?.split(" ")[0]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rodapé de Ações do Card */}
                      <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(lead.id, e)}
                            title="Remover lead"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-1.5 gap-1 font-semibold text-foreground border-border hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveEnrichLead(lead);
                            }}
                            title="Enriquecer dados do lead"
                          >
                            <Edit3 className="h-2.5 w-2.5" />
                            Editar
                          </Button>

                          {/* Botão Gerar Abordagem (conforme Spec: Fatos Medidos) */}
                          <Button
                            variant={hasEnoughFacts ? "default" : "outline"}
                            size="sm"
                            className={`h-6 text-[10px] px-2 gap-1 font-bold ${
                              hasApprovedDraft
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : hasEnoughFacts
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "text-amber-600 border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/15"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveOutreachLead(lead);
                            }}
                            title={
                              hasEnoughFacts
                                ? "Gerar Abordagem com fatos medidos"
                                : "Rode o diagnóstico do site primeiro (mínimo 2 fatos negativos)"
                            }
                          >
                            {hasApprovedDraft ? (
                              <>
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Abordagem Aprovada
                              </>
                            ) : hasEnoughFacts ? (
                              <>
                                <Mail className="h-2.5 w-2.5" />
                                Gerar Abordagem
                              </>
                            ) : (
                              <>
                                <Activity className="h-2.5 w-2.5 text-amber-500" />
                                Diagnóstico
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Setas de Etapa isoladas com e.stopPropagation() */}
                        <div
                          className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded border border-border"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={col.id === "prospect"}
                            className="h-5 w-5 p-0"
                            onClick={(e) => handleMove(lead.id, "prev", e)}
                            title="Voltar etapa anterior"
                          >
                            <ArrowLeft className="h-2.5 w-2.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={col.id === "won"}
                            className="h-5 w-5 p-0 text-primary"
                            onClick={(e) => handleMove(lead.id, "next", e)}
                            title="Avançar próxima etapa"
                          >
                            <ArrowRight className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {colLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-28 text-[11px] text-muted-foreground/60 italic border border-dashed border-border/60 rounded-md p-3 text-center">
                    <span>Nenhum lead nesta etapa</span>
                    <button
                      type="button"
                      onClick={handleAddNewLead}
                      className="text-primary not-italic font-semibold text-[10px] mt-1 hover:underline"
                    >
                      + Adicionar lead aqui
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Enriquecimento de Dados */}
      {activeEnrichLead && (
        <LeadEnrichmentModal
          lead={activeEnrichLead}
          isOpen={!!activeEnrichLead}
          onClose={() => setActiveEnrichLead(null)}
          onSave={handleSaveEnriched}
        />
      )}

      {/* Dialog: Gerador de Abordagem só com Fatos Medidos */}
      {activeOutreachLead && (
        <OutreachCopyDialog
          lead={activeOutreachLead}
          isOpen={!!activeOutreachLead}
          onClose={() => setActiveOutreachLead(null)}
          onUpdateLead={handleUpdateOutreachLead}
        />
      )}
    </div>
  );
}
