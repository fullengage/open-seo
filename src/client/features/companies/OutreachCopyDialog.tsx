import { useState } from "react";
import { Copy, Check, Mail, MessageSquare, Sparkles, Building2, UserCheck, X } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { toast } from "sonner";
import type { CompanyDetail } from "@/types/schemas/company";

interface OutreachCopyDialogProps {
  company: CompanyDetail;
  isOpen: boolean;
  onClose: () => void;
}

export function OutreachCopyDialog({ company, isOpen, onClose }: OutreachCopyDialogProps) {
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp">("email");
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const socioName = company.socios?.[0]?.nome
    ? company.socios[0].nome
        .toLowerCase()
        .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
        .split(" ")[0]
    : "Diretor(a)";

  const companyName = company.nomeFantasia || company.razaoSocial;
  const location = company.municipio ? `${company.municipio} - ${company.uf}` : company.uf;
  const cnaeDesc = company.cnaeDescricao || "seu segmento de mercado";

  const emailSubject = `Oportunidade de expansão orgânica em ${location} para ${companyName}`;
  const emailBody = `Olá, ${socioName}. Tudo bem?

Acompanho o posicionamento de empresas do setor de ${cnaeDesc.toLowerCase()} em ${location} e analisei a presença digital da ${companyName}.

Notamos que clientes potenciais na sua região realizam centenas de buscas mensais no Google buscando exatamente os serviços que vocês oferecem, mas grande parte dessa demanda qualificada hoje está sendo capturada pelos seus concorrentes locais diretos.

Realizamos um pré-diagnóstico técnico no nosso sistema (OpenSEO Intelligence) e identificamos 3 gargalos críticos que impedem a ${companyName} de alcançar o Top 3 das buscas:
1. Ausência de páginas com SEO local georreferenciado por bairro e região de atuação.
2. Oportunidades imediatas de palavras-chave (Striking Distance) onde uma simples otimização de snippet dobra os cliques orgânicos.
3. Gargalos de Core Web Vitals (velocidade de carregamento móvel) que derrubam a conversão do site.

Tenho o relatório técnico completo gerado aqui com os termos de maior potencial de faturamento para vocês.

Você teria 10 minutos nesta quinta ou sexta-feira para eu te apresentar esse panorama sem custo algum?

Abraços,
Equipe de Estratégia B2B`;

  const whatsappMessage = `Olá, ${socioName}! Sou especialista em posicionamento orgânico e inteligência comercial B2B.

Fiz uma varredura das buscas de ${cnaeDesc.toLowerCase()} em ${location} e notei que a *${companyName}* tem um grande volume de demanda qualificada na região que está sendo aproveitada por concorrentes no Google.

Gerei um diagnóstico técnico gratuito com o raio de atuação e os termos exatos com potencial de novos clientes para vocês.

Posso te encaminhar o resumo por aqui para você dar uma olhada?`;

  function handleCopy(type: "email" | "whatsapp") {
    const textToCopy =
      type === "email" ? `Assunto: ${emailSubject}\n\n${emailBody}` : whatsappMessage;
    navigator.clipboard.writeText(textToCopy);
    setCopied(type);
    toast.success(`${type === "email" ? "E-mail" : "Mensagem de WhatsApp"} copiada!`);
    setTimeout(() => setCopied(null), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Gerador de Abordagem & Copy Frio (Anti-Clay)</h3>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{companyName}</span> •
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              Decisor QSA: <span className="font-medium text-foreground">{socioName}</span>
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex border-b border-border space-x-4">
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "email"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-4 w-4" />
            E-mail Frio Executivo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "whatsapp"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Pitch WhatsApp / LinkedIn
          </button>
        </div>

        {activeTab === "email" ? (
          <div className="space-y-3">
            <div className="p-3 bg-muted/40 rounded-md border text-xs">
              <span className="font-semibold text-muted-foreground">Assunto: </span>
              <span className="font-medium text-foreground">{emailSubject}</span>
            </div>
            <div className="p-4 bg-muted/20 rounded-md border text-xs leading-relaxed whitespace-pre-wrap font-sans">
              {emailBody}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => handleCopy("email")} className="gap-2">
                {copied === "email" ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Copiado com Sucesso!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar E-mail Completo
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-muted/20 rounded-md border text-xs leading-relaxed whitespace-pre-wrap font-sans">
              {whatsappMessage}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => handleCopy("whatsapp")} className="gap-2">
                {copied === "whatsapp" ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Copiado com Sucesso!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Pitch WhatsApp
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
