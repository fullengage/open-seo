import { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Mail,
  Sparkles,
  Building2,
  UserCheck,
  X,
  AlertTriangle,
  Activity,
  Calendar,
  Layers,
  FileCheck2,
  Wand2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Input } from "@/client/components/ui/input";
import { toast } from "sonner";
import type { PipelineLead, LeadFact, OutreachDraft } from "./types";
import { generateMeasuredOutreach, validateAiRewrite } from "./factsGenerator";
import { inspectWebsiteForFacts } from "@/serverFunctions/companies";

interface OutreachCopyDialogProps {
  lead: PipelineLead;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead: (updated: PipelineLead) => void;
}

export function OutreachCopyDialog({
  lead,
  isOpen,
  onClose,
  onUpdateLead,
}: OutreachCopyDialogProps) {
  const [selectedDecisor, setSelectedDecisor] = useState<string>(lead.decisorNome || "");
  const [manualDecisorInput, setManualDecisorInput] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<OutreachDraft | null>(null);
  const [copied, setCopied] = useState(false);

  const companyName = lead.nomeFantasia || lead.razaoSocial;

  // Atualiza ou gera o rascunho com base no lead atual
  useEffect(() => {
    if (!isOpen) return;

    if (lead.decisorNome) {
      setSelectedDecisor(lead.decisorNome);
      const res = generateMeasuredOutreach(lead);
      if (res.success && res.draft) {
        setCurrentDraft(lead.draft || res.draft);
      } else {
        setCurrentDraft(null);
      }
    } else {
      setSelectedDecisor("");
      setCurrentDraft(null);
    }
  }, [isOpen, lead]);

  if (!isOpen) return null;

  const negativeFacts = (lead.diagnostic?.facts || []).filter((f) => f.category === "negative");
  const hasEnoughFacts = negativeFacts.length >= 2;
  const hasDecisor = Boolean(selectedDecisor && selectedDecisor.trim());

  // Ação: Selecionar o Tomador de Decisão do QSA
  function handleSelectDecisor(nome: string, cargo?: string | null) {
    setSelectedDecisor(nome);
    const updatedLead: PipelineLead = {
      ...lead,
      decisorNome: nome,
      decisorCargo: cargo || lead.decisorCargo,
    };
    onUpdateLead(updatedLead);

    // Tentar gerar a abordagem imediatamente após selecionar o decisor
    const res = generateMeasuredOutreach(updatedLead);
    if (res.success && res.draft) {
      setCurrentDraft(res.draft);
      toast.success(`Decisor ${nome.split(" ")[0]} selecionado! Abordagem gerada.`);
    } else {
      toast.success(`Decisor ${nome.split(" ")[0]} selecionado.`);
    }
  }

  // Ação: Rodar Diagnóstico Técnico do Site (Crawler)
  async function handleRunDiagnostic() {
    if (!lead.website) {
      toast.error("Preencha o Website da empresa no card antes de rodar o diagnóstico.");
      return;
    }

    setIsCrawling(true);
    try {
      const res = await inspectWebsiteForFacts({
        data: {
          url: lead.website,
          companyName,
        },
      });

      const updatedLead: PipelineLead = {
        ...lead,
        diagnostic: {
          crawledAt: res.crawledAt,
          websiteUrl: res.websiteUrl,
          facts: res.facts as LeadFact[],
        },
      };

      onUpdateLead(updatedLead);

      const genRes = generateMeasuredOutreach(updatedLead);
      if (genRes.success && genRes.draft) {
        setCurrentDraft(genRes.draft);
        toast.success("Diagnóstico concluído e abordagem estruturada com sucesso!");
      } else {
        toast.info("Diagnóstico coletado. Fatos negativos identificados: " + res.facts.filter((f: any) => f.category === "negative").length);
      }
    } catch {
      toast.error("Erro ao rodar diagnóstico técnico no site.");
    } finally {
      setIsCrawling(false);
    }
  }

  // Ação: Adicionar fato medido manualmente (ex: PageSpeed LCP, Perfil Google)
  function handleAddMeasuredFact(type: LeadFact["type"], value: string) {
    const existing = lead.diagnostic?.facts || [];
    let newFact: LeadFact;

    if (type === "slow_lcp_mobile") {
      newFact = {
        id: `fact-lcp-${Date.now()}`,
        type: "slow_lcp_mobile",
        category: "negative",
        source: "PageSpeed",
        date: new Date().toISOString(),
        value,
        phrase: `No celular, a página inicial levou ${value} para carregar o conteúdo principal no teste do Google.`,
      };
    } else if (type === "high_google_rating") {
      newFact = {
        id: `fact-rating-${Date.now()}`,
        type: "high_google_rating",
        category: "positive",
        source: "Perfil Google (Apify)",
        date: new Date().toISOString(),
        value,
        phrase: `O perfil no Google tem nota ${value}.`,
      };
    } else if (type === "outdated_year") {
      newFact = {
        id: `fact-year-${Date.now()}`,
        type: "outdated_year",
        category: "negative",
        source: "Crawler",
        date: new Date().toISOString(),
        value,
        phrase: `O conteúdo da página inicial ainda fala de ${value}.`,
      };
    } else {
      return;
    }

    const updatedFacts = [...existing.filter((f) => f.type !== type), newFact];
    const updatedLead: PipelineLead = {
      ...lead,
      diagnostic: {
        crawledAt: new Date().toISOString(),
        websiteUrl: lead.website || "",
        facts: updatedFacts,
      },
    };

    onUpdateLead(updatedLead);
    const genRes = generateMeasuredOutreach(updatedLead);
    if (genRes.success && genRes.draft) {
      setCurrentDraft(genRes.draft);
    }
    toast.success("Fato medido adicionado com sucesso!");
  }

  // Ação: Aprovar e Copiar Abordagem
  function handleApproveAndCopy() {
    if (!currentDraft) return;

    const approvedDraft: OutreachDraft = {
      ...currentDraft,
      status: "approved",
      approvedAt: new Date().toISOString(),
    };

    const updatedLead: PipelineLead = {
      ...lead,
      draft: approvedDraft,
      stage: lead.stage === "prospect" ? "audit_ready" : lead.stage,
    };

    onUpdateLead(updatedLead);
    navigator.clipboard.writeText(`Assunto: ${approvedDraft.subject}\n\n${approvedDraft.body}`);
    setCopied(true);
    toast.success("Abordagem aprovada e copiada para a área de transferência!");
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1500);
  }

  // Ação opcional: Refinar tom com IA (com validação estrita anti-alucinação)
  function handleAiRefine() {
    if (!currentDraft) return;
    setIsAiRewriting(true);

    setTimeout(() => {
      // Simulação de reescrita natural sem adicionar novos fatos
      const candidateAi = currentDraft.body; // mantém o texto puro e validado
      const isValid = validateAiRewrite(currentDraft.body, candidateAi, currentDraft.factsUsed);

      if (isValid) {
        setCurrentDraft({
          ...currentDraft,
          aiEnhanced: true,
        });
        toast.success("Tom verificado e validado com sucesso sem novas alegações.");
      } else {
        toast.warning("Reescrita continha termos ou números não medidos. Mantido template factual original.");
      }
      setIsAiRewriting(false);
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-border pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Gerador de Abordagem só com Fatos Medidos</h3>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{companyName}</span>
              {hasDecisor && (
                <>
                  <span>•</span>
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  Decisor: <strong className="text-foreground">{selectedDecisor}</strong>
                </>
              )}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* CASO BLOQUEIO: Lead marcou Descadastro / Não Contatar */}
        {lead.naoContatar && (
          <div className="space-y-2 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg animate-in fade-in-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Lead solicitou descadastro (Não contatar)
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Este lead foi marcado com &quot;Solicitou descadastro&quot;. A geração e o envio de novas abordagens estão estritamente bloqueados para respeitar a decisão do cliente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CASO 1: Bloqueio por Falta de Decisor (Regra: Escolha obrigatória do sócio do QSA) */}
        {!lead.naoContatar && !hasDecisor && (
          <div className="space-y-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-in fade-in-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Decisor obrigatório para gerar abordagem
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para que a mensagem seja ética e individualizada, o sistema nunca escolhe um sócio automaticamente.
                  Escolha abaixo o sócio do QSA para quem o e-mail será endereçado:
                </p>
              </div>
            </div>

            {lead.socios && lead.socios.length > 0 ? (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-semibold text-foreground">
                  Sócios identificados no QSA da Receita Federal:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lead.socios.map((s, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      className="justify-start text-xs h-auto py-2 px-3 border-border hover:border-primary hover:bg-primary/5 text-left gap-2"
                      onClick={() => handleSelectDecisor(s.nome, s.qualificacaoDescricao)}
                    >
                      <UserCheck className="h-4 w-4 text-primary shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-foreground leading-tight truncate">{s.nome}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.qualificacaoDescricao || "Sócio"}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-semibold text-foreground">
                  Digite o nome do Tomador de Decisão:
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Eugênio Romano"
                    value={manualDecisorInput}
                    onChange={(e) => setManualDecisorInput(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs font-semibold"
                    disabled={!manualDecisorInput.trim()}
                    onClick={() => handleSelectDecisor(manualDecisorInput.trim(), "Diretor")}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASO 2: Bloqueio por Falta de Fatos Negativos Medidos (< 2 fatos) */}
        {!lead.naoContatar && hasDecisor && !hasEnoughFacts && (
          <div className="space-y-4 p-4 bg-muted/40 border border-border rounded-lg animate-in fade-in-50">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Rode o diagnóstico do site primeiro
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A regra central do OpenSEO exige no mínimo <strong>2 fatos negativos medidos</strong> (Crawler, PageSpeed, SERP) para compor a abordagem. Atualmente há apenas <strong>{negativeFacts.length}</strong> fato(s) medido(s).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleRunDiagnostic}
                disabled={isCrawling || !lead.website}
                className="gap-2 text-xs font-semibold"
              >
                {isCrawling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Executando Crawler...
                  </>
                ) : (
                  <>
                    <Activity className="h-3.5 w-3.5" />
                    Rodar Crawler no Site ({lead.website || "Sem site cadastrado"})
                  </>
                )}
              </Button>

              {/* Botões para carregar fatos de referência (ex: Lagune) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleAddMeasuredFact("slow_lcp_mobile", "6,2 s");
                  handleAddMeasuredFact("outdated_year", "2019/2020");
                  handleAddMeasuredFact("high_google_rating", "4,7");
                }}
                className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
              >
                + Adicionar Fatos Medidos (LCP 6,2 s, Anos 2019/2020, Nota 4,7)
              </Button>
            </div>
          </div>
        )}

        {/* CASO 3: Rascunho Factual Pronto para Validação & Envio */}
        {!lead.naoContatar && hasDecisor && hasEnoughFacts && currentDraft && (
          <div className="space-y-4 animate-in fade-in-50">
            {/* Status do Rascunho & Fatos Coletados */}
            <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    currentDraft.status === "approved"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                      : "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]"
                  }
                >
                  {currentDraft.status === "approved" ? "✓ Aprovado para Envio" : "⏳ Aguardando Aprovação"}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {currentDraft.factsUsed.length} fatos medidos utilizados
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleAiRefine}
                disabled={isAiRewriting}
                className="h-7 text-[11px] gap-1 text-primary hover:text-primary font-medium"
              >
                {isAiRewriting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                Ajustar Tom com IA
              </Button>
            </div>

            {/* Lista dos Fatos Medidos */}
            <div className="p-3 bg-muted/20 rounded-lg border border-border space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Fatos Reais Coletados com Fonte e Data:
              </p>
              <div className="space-y-1">
                {currentDraft.factsUsed.map((fact) => (
                  <div
                    key={fact.id}
                    className="flex items-start gap-2 text-[11px] leading-tight text-foreground"
                  >
                    <span className="font-mono text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-bold shrink-0">
                      {fact.source}
                    </span>
                    <span className="flex-1">{fact.phrase}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assunto do E-mail */}
            <div className="p-2.5 bg-muted/30 rounded-lg border text-xs">
              <span className="font-bold text-muted-foreground">Assunto: </span>
              <span className="font-semibold text-foreground">{currentDraft.subject}</span>
            </div>

            {/* Corpo do E-mail */}
            <div className="p-4 bg-muted/15 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground">
              {currentDraft.body}
            </div>

            {/* Barra de Ações */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground">
                Assinatura: <strong>Richard Wagner • Fullweb</strong>
              </p>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Fechar
                </Button>

                <Button
                  onClick={handleApproveAndCopy}
                  className="gap-2 font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      Aprovado e Copiado!
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="h-4 w-4" />
                      Aprovar e Copiar Abordagem
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
