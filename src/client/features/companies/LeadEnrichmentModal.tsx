import { useState } from "react";
import {
  X,
  Sparkles,
  Building2,
  UserCheck,
  Globe,
  Phone,
  Mail,
  Linkedin,
  Instagram,
  DollarSign,
  Calendar,
  MessageCircle,
  Check,
  Loader2,
  FileText,
  Flame,
  SunMedium,
  Snowflake,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { Badge } from "@/client/components/ui/badge";
import { toast } from "sonner";
import { enrichLeadAll, getCompanyByCnpj } from "@/serverFunctions/companies";
import { calcIcpScore } from "./icpScore";
import type { PipelineLead, LeadTemperature } from "./types";

interface LeadEnrichmentModalProps {
  lead: PipelineLead;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: PipelineLead) => void;
}

export function LeadEnrichmentModal({
  lead,
  isOpen,
  onClose,
  onSave,
}: LeadEnrichmentModalProps) {
  const [activeTab, setActiveTab] = useState<"decisor" | "digital" | "comercial" | "cadastral">("decisor");
  const [isAutoEnriching, setIsAutoEnriching] = useState(false);

  // Form states
  const [decisorNome, setDecisorNome] = useState(lead.decisorNome || "");
  const [decisorCargo, setDecisorCargo] = useState(lead.decisorCargo || "Sócio-Administrador");
  const [whatsapp, setWhatsapp] = useState(lead.whatsapp || lead.telefone || "");
  const [decisorEmail, setDecisorEmail] = useState(lead.decisorEmail || lead.email || "");
  const [decisorLinkedin, setDecisorLinkedin] = useState(lead.decisorLinkedin || "");

  const [website, setWebsite] = useState(lead.website || "");
  const [instagram, setInstagram] = useState(lead.instagram || "");
  const [linkedin, setLinkedin] = useState(lead.linkedin || "");

  const [temperatura, setTemperatura] = useState<LeadTemperature>(lead.temperatura || "warm");
  const [ticketEstimado, setTicketEstimado] = useState<string>(
    lead.ticketEstimado ? String(lead.ticketEstimado) : ""
  );
  const [proximoPasso, setProximoPasso] = useState(lead.proximoPasso || "");
  const [dataProximoContato, setDataProximoContato] = useState(lead.dataProximoContato || "");
  const [notes, setNotes] = useState(lead.notes || "");
  const [naoContatar, setNaoContatar] = useState(Boolean(lead.naoContatar));

  const [capitalSocial, setCapitalSocial] = useState<number | null>(lead.capitalSocial || null);
  const [porte, setPorte] = useState<string | null>(lead.porte || null);
  const [bairro, setBairro] = useState<string | null>(lead.bairro || null);
  const [cep, setCep] = useState<string | null>(lead.cep || null);
  const [endereco, setEndereco] = useState<string | null>(lead.endereco || null);
  const [socios, setSocios] = useState(lead.socios || []);

  if (!isOpen) return null;

  const companyTitle = lead.nomeFantasia || lead.razaoSocial;

  const [isEnrichingAll, setIsEnrichingAll] = useState(false);
  const [extra, setExtra] = useState<Partial<PipelineLead>>({});

  async function handleEnrichAll() {
    setIsEnrichingAll(true);
    try {
      const current: PipelineLead = {
        ...lead,
        ...extra,
        website: website.trim() || null,
        instagram: instagram.trim() || null,
        linkedin: linkedin.trim() || null,
        decisorEmail: decisorEmail.trim() || null,
        porte,
        capitalSocial,
        socios,
      };
      const { patch } = await enrichLeadAll({ data: { lead: current } });
      if (patch.website) setWebsite(patch.website);
      if (patch.instagram) setInstagram(patch.instagram);
      if (patch.linkedin) setLinkedin(patch.linkedin);
      if (patch.porte) setPorte(patch.porte);
      if (patch.capitalSocial) setCapitalSocial(patch.capitalSocial);
      if (patch.socios?.length) setSocios(patch.socios);
      setExtra({
        enrichment: patch.enrichment,
        diagnostic: patch.diagnostic,
        municipio: patch.municipio ?? lead.municipio,
        uf: patch.uf || lead.uf,
      });
      toast.success("Enriquecimento concluído. Confira e clique em Salvar.");
    } catch {
      toast.error("Não foi possível concluir o enriquecimento.");
    } finally {
      setIsEnrichingAll(false);
    }
  }

  async function handleAutoEnrich() {
    setIsAutoEnriching(true);
    try {
      const data = await getCompanyByCnpj({ data: { cnpj: lead.cnpj } });
      if (!data) {
        toast.error("Não foram encontrados dados adicionais na Receita para este CNPJ.");
        return;
      }

      // Auto fill empty or missing fields
      if (data.capitalSocial && !capitalSocial) setCapitalSocial(data.capitalSocial);
      if (data.porte && !porte) setPorte(data.porte);
      if (data.bairro && !bairro) setBairro(data.bairro);
      if (data.cep && !cep) setCep(data.cep);
      if (data.telefone && !whatsapp) setWhatsapp(data.telefone);
      if (data.email && !decisorEmail) setDecisorEmail(data.email);

      if (data.socios && data.socios.length > 0) {
        setSocios(data.socios); // o decisor é escolhido pelo Richard, nunca o 1º sócio
      }

      // Suggest website if email has a custom domain
      if (!website && data.email && !data.email.includes("gmail") && !data.email.includes("hotmail")) {
        const domain = data.email.split("@")[1];
        if (domain) {
          setWebsite(`https://${domain}`);
        }
      }

      toast.success("Dados da Receita Federal e QSA enriquecidos com sucesso!");
    } catch {
      toast.error("Falha ao consultar enriquecimento da Receita Federal.");
    } finally {
      setIsAutoEnriching(false);
    }
  }

  function handleSave() {
    const updated: PipelineLead = {
      ...lead,
      ...extra,
      decisorNome: decisorNome.trim() || null,
      decisorCargo: decisorCargo.trim() || null,
      whatsapp: whatsapp.trim() || null,
      decisorEmail: decisorEmail.trim() || null,
      decisorLinkedin: decisorLinkedin.trim() || null,
      website: website.trim() || null,
      instagram: instagram.trim() || null,
      linkedin: linkedin.trim() || null,
      temperatura,
      ticketEstimado: ticketEstimado ? parseFloat(ticketEstimado.replace(",", ".")) : null,
      proximoPasso: proximoPasso.trim() || null,
      dataProximoContato: dataProximoContato.trim() || null,
      notes: notes.trim() || undefined,
      capitalSocial,
      porte,
      bairro,
      cep,
      endereco,
      socios,
      naoContatar,
      isEnriched: true,
    };

    onSave(updated);
    toast.success("Lead enriquecido salvo com sucesso!");
    onClose();
  }

  const cleanWhatsappNumber = whatsapp.replace(/\D/g, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl p-6 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold">Enriquecimento 360° do Lead Comercial</h3>
              <Badge variant="outline" className="text-[11px] font-mono">
                CNPJ: {lead.cnpj}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{companyTitle}</span>
              {lead.municipio && (
                <span>• {lead.municipio} - {lead.uf}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleEnrichAll}
              disabled={isEnrichingAll}
              className="gap-1.5 text-xs font-semibold"
              title="Receita, site, tecnologias, redes, domínio, e-mail, velocidade, diagnóstico, Google Maps e IA"
            >
              {isEnrichingAll ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enriquecendo… (até 2 min)
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Enriquecer tudo
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoEnrich}
              disabled={isAutoEnriching}
              className="gap-1.5 text-xs font-semibold bg-primary/5 hover:bg-primary/15 border-primary/30 text-primary"
            >
              {isAutoEnriching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Consultando Receita...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-Enriquecer via Receita/QSA
                </>
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {(() => {
          const enr = extra.enrichment ?? lead.enrichment;
          if (!enr) return null;
          const merged: PipelineLead = { ...lead, ...extra, website: website || null, porte, capitalSocial, socios, decisorNome: decisorNome || null, decisorEmail: decisorEmail || null };
          const icp = calcIcpScore(merged);
          const pessoa = decisorNome || socios[0]?.nome || "";
          const linkedinSearch = pessoa
            ? `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${pessoa}" "${companyTitle}"`)}`
            : null;
          return (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="font-bold">ICP {icp.score}</Badge>
                {enr.ai ? (
                  <Badge variant="outline">
                    {enr.ai.modelo} · aderência IA {enr.ai.aderenciaIcp}
                  </Badge>
                ) : null}
                <span className="text-muted-foreground">
                  Enriquecido em {new Date(enr.at).toLocaleString("pt-BR")}
                </span>
                {linkedinSearch ? (
                  <a href={linkedinSearch} target="_blank" rel="noreferrer" className="text-primary underline">
                    Procurar {pessoa.split(" ")[0]} no LinkedIn
                  </a>
                ) : null}
              </div>
              {enr.ai ? <p className="text-xs">{enr.ai.resumo}</p> : null}
              <table className="w-full text-[11px]">
                <tbody>
                  {enr.items.map((it, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="py-1 pr-2 font-medium text-foreground/80 whitespace-nowrap">{it.campo}</td>
                      <td className="py-1 pr-2 break-all">{it.valor}</td>
                      <td className="py-1 text-muted-foreground whitespace-nowrap">{it.fonte}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {enr.mapsSkipped ? (
                <p className="text-[11px] text-[#8A6B3A]">Google Maps não consultado: {enr.mapsSkipped}.</p>
              ) : null}
            </div>
          );
        })()}

        {/* Navigation Tabs */}
        <div className="flex border-b border-border gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("decisor")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "decisor"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Tomador de Decisão & Contatos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("digital")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "digital"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-4 w-4" />
            Presença Digital & SEO
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("comercial")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "comercial"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Qualificação Comercial & Deal
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cadastral")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "cadastral"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Dados Cadastrais & QSA
          </button>
        </div>

        {/* Tab 1: Tomador de Decisão & Contatos */}
        {activeTab === "decisor" && (
          <div className="space-y-4 animate-in fade-in-50">
            {socios.length > 0 && (
              <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Sócios identificados na Receita Federal (Clique para selecionar o decisor):
                </p>
                <div className="flex flex-wrap gap-2">
                  {socios.map((s, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 gap-1 ${
                        decisorNome === s.nome ? "border-primary bg-primary/10 text-primary font-bold" : ""
                      }`}
                      onClick={() => {
                        setDecisorNome(s.nome);
                        if (s.qualificacaoDescricao) setDecisorCargo(s.qualificacaoDescricao);
                      }}
                    >
                      <UserCheck className="h-3 w-3" />
                      {s.nome}
                      {s.qualificacaoDescricao && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({s.qualificacaoDescricao})
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nome do Tomador de Decisão / Decisor
                </label>
                <Input
                  value={decisorNome}
                  onChange={(e) => setDecisorNome(e.target.value)}
                  placeholder="Ex: Richard Wagner, Carlos Silva..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Cargo / Posição na Empresa
                </label>
                <Input
                  value={decisorCargo}
                  onChange={(e) => setDecisorCargo(e.target.value)}
                  placeholder="Ex: CEO, Diretor Comercial, Sócio..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-500" />
                    WhatsApp / Telefone Direto
                  </label>
                  {cleanWhatsappNumber && (
                    <a
                      href={`https://wa.me/55${cleanWhatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-500 hover:underline flex items-center gap-0.5"
                    >
                      Testar WhatsApp <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3 text-primary" />
                  E-mail Direto do Decisor
                </label>
                <Input
                  type="email"
                  value={decisorEmail}
                  onChange={(e) => setDecisorEmail(e.target.value)}
                  placeholder="Ex: decisor@empresa.com.br"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Linkedin className="h-3 w-3 text-primary" />
                  Perfil do LinkedIn do Decisor
                </label>
                <Input
                  value={decisorLinkedin}
                  onChange={(e) => setDecisorLinkedin(e.target.value)}
                  placeholder="Ex: https://www.linkedin.com/in/perfil-decisor"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Presença Digital & SEO */}
        {activeTab === "digital" && (
          <div className="space-y-4 animate-in fade-in-50">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  Website Oficial da Empresa
                </label>
                {website && (
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    Acessar Site <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Ex: https://www.empresa.com.br"
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Com o website preenchido, você pode rodar uma auditoria de SEO completa com 1 clique.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Instagram className="h-3 w-3 text-primary" />
                  Instagram da Empresa
                </label>
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Ex: @empresa ou link completo"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Linkedin className="h-3 w-3 text-primary" />
                  LinkedIn Institucional
                </label>
                <Input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="Ex: https://www.linkedin.com/company/empresa"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Qualificação Comercial & Deal */}
        {activeTab === "comercial" && (
          <div className="space-y-4 animate-in fade-in-50">
            {/* Temperatura */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Temperatura / Interesse do Lead
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemperatura("hot")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    temperatura === "hot"
                      ? "border-rose-500 bg-rose-500/10 text-rose-500 shadow-xs"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Flame className="h-4 w-4 text-rose-500" />
                  Quente 🔥 (Alta Chance)
                </button>

                <button
                  type="button"
                  onClick={() => setTemperatura("warm")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    temperatura === "warm"
                      ? "border-[#B08D57] bg-[#B08D57]/10 text-[#B08D57] shadow-xs"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <SunMedium className="h-4 w-4 text-[#B08D57]" />
                  Morno 🌤️ (Em Qualificação)
                </button>

                <button
                  type="button"
                  onClick={() => setTemperatura("cold")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    temperatura === "cold"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Snowflake className="h-4 w-4 text-primary" />
                  Frio ❄️ (Primeiro Contato)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Ticket Pretendido / Estimado (R$/mês)
                </label>
                <Input
                  type="number"
                  step="100"
                  value={ticketEstimado}
                  onChange={(e) => setTicketEstimado(e.target.value)}
                  placeholder="Ex: 2500"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Data do Próximo Contato / Follow-up
                </label>
                <Input
                  type="date"
                  value={dataProximoContato}
                  onChange={(e) => setDataProximoContato(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Próxima Ação Definida (Next Step)
                </label>
                <Input
                  value={proximoPasso}
                  onChange={(e) => setProximoPasso(e.target.value)}
                  placeholder="Ex: Apresentar auditoria de SEO na quinta às 14h via Google Meet..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Notas de Abordagem & Objeções do Lead
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Registre pontos levantados em reuniões, dores com a agência anterior, expectativas..."
                  className="min-h-[90px] text-xs"
                />
              </div>

              <div className="md:col-span-2 p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Solicitou descadastro (Não contatar)
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Bloqueia novos e-mails e abordagens para este lead no sistema.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="naoContatarInput"
                  checked={naoContatar}
                  onChange={(e) => setNaoContatar(e.target.checked)}
                  className="h-4 w-4 accent-rose-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Dados Cadastrais & QSA */}
        {activeTab === "cadastral" && (
          <div className="space-y-4 animate-in fade-in-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Capital Social
                </span>
                <p className="text-sm font-bold text-foreground">
                  {capitalSocial
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        capitalSocial
                      )
                    : "Não informado"}
                </p>
              </div>

              <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Porte da Empresa
                </span>
                <p className="text-sm font-bold text-foreground">{porte || "Não informado"}</p>
              </div>

              <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  CNAE Principal
                </span>
                <p className="text-xs font-semibold text-foreground truncate" title={lead.cnaeDescricao || ""}>
                  {lead.cnae ? `${lead.cnae} - ${lead.cnaeDescricao || ""}` : "Não informado"}
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Endereço Registrado
              </span>
              <p className="text-xs text-foreground">
                {bairro ? `Bairro ${bairro}` : ""}{" "}
                {lead.municipio ? `${lead.municipio} - ${lead.uf}` : lead.uf}{" "}
                {cep ? `• CEP: ${cep}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">
                Quadro de Sócios e Administradores (QSA)
              </h4>
              {socios.length > 0 ? (
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                  {socios.map((s, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-card">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{s.nome}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.qualificacaoDescricao || "Sócio"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Receita Federal
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Nenhum sócio carregado ainda. Clique no botão &quot;Auto-Enriquecer via Receita/QSA&quot; no topo.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>

          <Button onClick={handleSave} className="gap-2">
            <Check className="h-4 w-4" />
            Salvar Dados Enriquecidos
          </Button>
        </div>
      </div>
    </div>
  );
}
