import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import {
  Building2,
  Search,
  Users,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Loader2,
  Sparkles,
  PlusCircle,
  Kanban,
  Compass,
  Filter,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Network,
} from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { toast } from "sonner";
import { getCompanyByCnpj, searchCompaniesBySegment } from "@/serverFunctions/companies";
import { savePipelineLead } from "@/serverFunctions/pipelineLeads";
import type { CompanyDetail } from "@/types/schemas/company";
import type { PipelineLead } from "@/client/features/companies/types";
import { isRecuperacaoJudicialOuFalencia, checkEmailWarning } from "@/client/features/companies/types";
import { OutreachCopyDialog } from "@/client/features/companies/OutreachCopyDialog";
import { LocalSeoProgrammatic } from "@/client/features/companies/LocalSeoProgrammatic";
import { LeadsKanban } from "@/client/features/companies/LeadsKanban";

export const Route = createFileRoute("/_app/companies")({
  component: CompaniesPage,
});

function formatCnpj(val: string) {
  const d = val.replace(/\D/g, "");
  if (d.length <= 14) {
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  return val;
}

function formatCurrency(val: number | null | undefined) {
  if (!val) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

export function CompaniesPage() {
  const [cnpjInput, setCnpjInput] = useState("");
  const [cnaeInput, setCnaeInput] = useState("");
  const [ufInput, setUfInput] = useState("SP");

  // Filtros avançados da busca por CNAE (Itens 6, 7, 8)
  const [municipioInput, setMunicipioInput] = useState("");
  const [porteFilter, setPorteFilter] = useState("");
  const [soMatriz, setSoMatriz] = useState(true);
  const [totalFound, setTotalFound] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [segmentResults, setSegmentResults] = useState<CompanyDetail[]>([]);
  const [activeTab, setActiveTab] = useState<"cnpj" | "segment" | "local_seo" | "kanban">("cnpj");
  const [outreachCompany, setOutreachCompany] = useState<CompanyDetail | null>(null);

  const cnpjMutation = useMutation({
    mutationFn: (cnpj: string) => getCompanyByCnpj({ data: { cnpj } }),
    onSuccess: (data) => {
      setCompany(data);
      if (!data) {
        toast.error("Empresa não encontrada para este CNPJ.");
      }
    },
    onError: () => {
      toast.error("Erro ao consultar base de CNPJ.");
    },
  });

  const segmentMutation = useMutation({
    mutationFn: ({
      cnae,
      uf,
      municipio,
      porte,
      matriz,
      limit = 50,
      offset = 0,
    }: {
      cnae: string;
      uf: string;
      municipio?: string;
      porte?: string;
      matriz?: boolean;
      limit?: number;
      offset?: number;
    }) =>
      searchCompaniesBySegment({
        data: {
          cnae,
          uf,
          municipio: municipio || undefined,
          porte: porte || undefined,
          matriz,
          limit,
          offset,
        },
      }),
    onSuccess: (data) => {
      setSegmentResults(data.items);
      setTotalFound(data.total);
      if (data.items.length === 0) {
        toast.info("Nenhuma empresa encontrada com estes filtros.");
      }
    },
    onError: () => {
      toast.error("Erro ao filtrar empresas.");
    },
  });

  function handleSearchCnpj(e: React.FormEvent) {
    e.preventDefault();
    if (!cnpjInput.trim()) return;
    cnpjMutation.mutate(cnpjInput);
  }

  function handleSearchSegment(e: React.FormEvent) {
    e.preventDefault();
    if (!cnaeInput.trim() || !ufInput.trim()) return;
    segmentMutation.mutate({
      cnae: cnaeInput.trim(),
      uf: ufInput.trim(),
      municipio: municipioInput.trim() || undefined,
      porte: porteFilter || undefined,
      matriz: soMatriz,
      limit: 50,
      offset: 0,
    });
  }

  async function handleLoadMore() {
    if (!cnaeInput.trim() || !ufInput.trim()) return;
    setIsLoadingMore(true);
    try {
      const data = await searchCompaniesBySegment({
        data: {
          cnae: cnaeInput.trim(),
          uf: ufInput.trim(),
          municipio: municipioInput.trim() || undefined,
          porte: porteFilter || undefined,
          matriz: soMatriz,
          limit: 50,
          offset: segmentResults.length,
        },
      });
      if (data.items.length > 0) {
        setSegmentResults((prev) => [...prev, ...data.items]);
      }
    } catch {
      toast.error("Erro ao carregar mais empresas.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleAddToPipeline(targetCompany: CompanyDetail) {
    // Alerta de Recuperação Judicial (Item 9)
    if (isRecuperacaoJudicialOuFalencia(targetCompany.razaoSocial)) {
      const confirmAdd = window.confirm(
        `Atenção: A empresa ${targetCompany.razaoSocial} consta em RECUPERAÇÃO JUDICIAL / FALÊNCIA.\n\nDeseja realmente incluí-la no funil comercial?`
      );
      if (!confirmAdd) return;
    }

    const storageKey = "openseo_b2b_pipeline_leads";
    try {
      const saved = localStorage.getItem(storageKey);
      const localLeads: PipelineLead[] = saved ? JSON.parse(saved) : [];

      if (localLeads.some((l) => l.cnpj === targetCompany.cnpj)) {
        toast.info("Esta empresa já está no Pipeline Comercial!");
        return;
      }

      const newLead: PipelineLead = {
        id: `lead-${Date.now()}`,
        cnpj: targetCompany.cnpj,
        razaoSocial: targetCompany.razaoSocial,
        nomeFantasia: targetCompany.nomeFantasia,
        uf: targetCompany.uf,
        municipio: targetCompany.municipio,
        telefone: targetCompany.telefone,
        email: targetCompany.email,
        cnae: targetCompany.cnae,
        cnaeDescricao: targetCompany.cnaeDescricao,
        socioPrincipal: targetCompany.socios?.[0]?.nome || null,
        stage: "prospect",
        createdAt: new Date().toISOString(),
      };

      // Salva no banco de dados central PostgreSQL (Item 2)
      try {
        await savePipelineLead({ data: { lead: newLead } });
      } catch (err) {
        console.error("Erro ao salvar lead no PostgreSQL:", err);
      }

      // Atualiza também localmente para sincronia imediata
      const updated = [newLead, ...localLeads];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      toast.success(
        `${targetCompany.nomeFantasia || targetCompany.razaoSocial} adicionada ao Pipeline Comercial!`
      );
    } catch {
      toast.error("Erro ao salvar lead.");
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Inteligência B2B, SEO Local & Prospecção (Anti-Clay)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mapeamento de empresas na Receita Federal (QSA), landing pages programáticas locais,
            pipeline de leads e gerador de copy de abordagem de vendas.
          </p>
        </div>
      </div>

      <div className="flex border-b border-border space-x-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("cnpj")}
          className={`pb-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "cnpj"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="h-4 w-4" />
          Busca por CNPJ & QSA
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("segment")}
          className={`pb-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "segment"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Prospecção por CNAE
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("local_seo")}
          className={`pb-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "local_seo"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="h-4 w-4" />
          SEO Local & LPs Programáticas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("kanban")}
          className={`pb-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "kanban"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Kanban className="h-4 w-4" />
          Pipeline Comercial (Kanban)
        </button>
      </div>

      {activeTab === "cnpj" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Digite o CNPJ da Empresa</CardTitle>
              <CardDescription>
                Exemplo: 53.485.309/0001-85 ou apenas números
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearchCnpj} className="flex gap-3 max-w-md">
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cnpjInput}
                  onChange={(e) => setCnpjInput(e.target.value)}
                  className="font-mono"
                />
                <Button type="submit" disabled={cnpjMutation.isPending || !cnpjInput.trim()}>
                  {cnpjMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Consultar
                </Button>
              </form>
            </CardContent>
          </Card>

          {cnpjMutation.isPending && (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Buscando na base nacional de empresas...
            </div>
          )}

          {company && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      {/* Alerta de Recuperação Judicial (Item 9) */}
                      {isRecuperacaoJudicialOuFalencia(company.razaoSocial) && (
                        <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30">
                          <AlertTriangle className="h-4 w-4" />
                          EMPRESA EM RECUPERAÇÃO JUDICIAL / FALÊNCIA
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl">{company.razaoSocial}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {company.porte === "01"
                            ? "Microempresa (ME)"
                            : company.porte === "03"
                            ? "Empresa de Pequeno Porte (EPP)"
                            : "Demais portes"}
                        </Badge>
                        <Badge
                          variant={company.matriz ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {company.matriz ? "Matriz" : "Filial"}
                        </Badge>
                        {/* Situação Cadastral (Item 10) */}
                        {company.situacaoCadastral && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              company.situacaoCadastral.toLowerCase().includes("ativa")
                                ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                                : "border-rose-500 text-rose-600 bg-rose-500/10"
                            }`}
                          >
                            {company.situacaoCadastral}
                          </Badge>
                        )}
                      </div>
                      {company.nomeFantasia && (
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">
                          Nome Fantasia: {company.nomeFantasia}
                        </p>
                      )}
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        CNPJ: {formatCnpj(company.cnpj)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setOutreachCompany(company)}
                        className="gap-1.5"
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                        Gerar Abordagem (Anti-Clay)
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => handleAddToPipeline(company)}
                        className="gap-1.5"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Adicionar ao Pipeline
                      </Button>

                      <Button
                        onClick={() => {
                          window.location.href = `/projects?create=true&name=${encodeURIComponent(
                            company.nomeFantasia || company.razaoSocial
                          )}`;
                        }}
                        className="gap-2"
                      >
                        Criar Projeto SEO
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                        Atividade Econômica (CNAE)
                      </h4>
                      <p className="text-sm font-medium mt-1">
                        <span className="font-mono text-primary font-bold mr-2">
                          {company.cnae}
                        </span>
                        {company.cnaeDescricao || "Atividade principal"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                        Capital Social
                      </h4>
                      <p className="text-sm font-medium mt-1">
                        {formatCurrency(company.capitalSocial)}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Endereço & Localização
                      </h4>
                      <p className="text-sm mt-1 text-muted-foreground">
                        {company.bairro ? `${company.bairro}, ` : ""}
                        {company.municipio || ""}
                        {company.uf ? ` - ${company.uf}` : ""}
                        {company.cep ? ` (CEP: ${company.cep})` : ""}
                      </p>
                    </div>

                    {/* Lista de Filiais vinculadas (Item 8) */}
                    {company.filiais && company.filiais.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                          <Network className="h-3.5 w-3.5 text-primary" /> Filiais desta Matriz ({company.filiais.length})
                        </h4>
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                          {company.filiais.map((f) => (
                            <div
                              key={f.cnpj}
                              className="text-xs p-1.5 bg-muted/40 rounded border border-border/40 font-mono"
                            >
                              <span className="font-semibold text-foreground">
                                {formatCnpj(f.cnpj)}
                              </span>{" "}
                              • {f.municipio || "Cidade não informada"} - {f.uf}
                              {f.nomeFantasia ? ` (${f.nomeFantasia})` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Contato
                      </h4>
                      <div className="text-sm mt-1 space-y-1">
                        {company.telefone ? (
                          <p className="text-muted-foreground">
                            Tel: <span className="text-foreground">{company.telefone}</span>
                          </p>
                        ) : null}
                        {company.email ? (
                          <div>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />{" "}
                              <span className="text-foreground">{company.email}</span>
                            </p>
                            {/* Alerta de e-mail suspeito (Item 11) */}
                            {checkEmailWarning(company.email).isSuspicious && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                ⚠️ {checkEmailWarning(company.email).reason}
                              </p>
                            )}
                          </div>
                        ) : null}
                        {!company.telefone && !company.email && (
                          <p className="text-xs text-muted-foreground italic">
                            Nenhum telefone/e-mail cadastrado na base.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Sócios e Administradores (QSA)
                      </h4>
                      {company.socios.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {company.socios.map((s, i) => (
                            <div
                              key={i}
                              className="text-sm border-l-2 border-primary/40 pl-2 py-0.5"
                            >
                              <p className="font-medium text-foreground">{s.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {s.qualificacaoDescricao || "Sócio"}
                                {s.entrada ? ` • Desde ${s.entrada.slice(0, 4)}` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Empresa individual ou sem sócios adicionais no QSA.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === "segment" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filtrar Empresas por Segmento, Região e Porte
              </CardTitle>
              <CardDescription>
                Filtre na base oficial de empresas por CNAE, município (com atalho para Alto Tietê),
                porte e matriz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearchSegment} className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-48">
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      CNAE Fiscal
                    </label>
                    <Input
                      placeholder="Ex: 2063100 ou 7732201"
                      value={cnaeInput}
                      onChange={(e) => setCnaeInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="w-20">
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      UF
                    </label>
                    <Input
                      placeholder="SP"
                      value={ufInput}
                      maxLength={2}
                      onChange={(e) => setUfInput(e.target.value.toUpperCase())}
                      className="uppercase font-mono text-xs"
                    />
                  </div>

                  <div className="w-56">
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Município / Região
                    </label>
                    <select
                      value={municipioInput}
                      onChange={(e) => setMunicipioInput(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Todos os municípios de {ufInput}</option>
                      <option value="ALTO_TIETE">Região Alto Tietê (SP) ⭐</option>
                      <option value="MOGI DAS CRUZES">Mogi das Cruzes</option>
                      <option value="SUZANO">Suzano</option>
                      <option value="ITAQUAQUECETUBA">Itaquaquecetuba</option>
                      <option value="POA">Poá</option>
                      <option value="FERRAZ DE VASCONCELOS">Ferraz de Vasconcelos</option>
                      <option value="ARUJA">Arujá</option>
                      <option value="CAMPINAS">Campinas</option>
                      <option value="SAO PAULO">São Paulo</option>
                    </select>
                  </div>

                  <div className="w-44">
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Porte da Empresa
                    </label>
                    <select
                      value={porteFilter}
                      onChange={(e) => setPorteFilter(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Todos os portes</option>
                      <option value="01">Microempresa (ME - 01)</option>
                      <option value="03">Pequeno Porte (EPP - 03)</option>
                      <option value="05">Demais portes (Médias/Grandes - 05)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={soMatriz}
                        onChange={(e) => setSoMatriz(e.target.checked)}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Só Matriz</span>
                    </label>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={segmentMutation.isPending || !cnaeInput.trim()}
                      className="h-9 gap-1.5 text-xs font-semibold"
                    >
                      {segmentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Buscar Empresas
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {segmentMutation.isPending && (
            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>
                Filtrando empresas pelo CNAE {cnaeInput} em {ufInput}...
              </span>
            </div>
          )}

          {!segmentMutation.isPending &&
            segmentMutation.isSuccess &&
            segmentResults.length === 0 && (
              <Card className="p-8 text-center text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="font-medium text-foreground">
                  Nenhuma empresa encontrada para este filtro imediato.
                </p>
                <p className="text-xs mt-1">
                  Experimente remover o filtro de município ou porte para ampliar os resultados.
                </p>
              </Card>
            )}

          {segmentResults.length > 0 && (
            <div className="space-y-4">
              {/* Header com total encontrado e contador (Item 6) */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Encontradas <strong>{totalFound}</strong> empresas no segmento (exibindo{" "}
                  <strong>{segmentResults.length}</strong>)
                </span>
                {soMatriz && (
                  <Badge variant="outline" className="text-[10px]">
                    Filtro: Apenas Matrizes
                  </Badge>
                )}
              </div>

              <div className="grid gap-3">
                {segmentResults.map((emp) => {
                  const isRecuperacao = isRecuperacaoJudicialOuFalencia(emp.razaoSocial);
                  const emailWarning = checkEmailWarning(emp.email);

                  return (
                    <Card
                      key={emp.cnpj}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        {/* Alerta de Recuperação Judicial (Item 9) */}
                        {isRecuperacao && (
                          <div className="inline-flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded px-1.5 py-0.5 font-bold mb-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>RECUPERAÇÃO JUDICIAL / FALÊNCIA</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {emp.razaoSocial}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {emp.uf}
                          </Badge>
                          <Badge
                            variant={emp.matriz ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {emp.matriz ? "Matriz" : "Filial"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {emp.porte === "01"
                              ? "ME"
                              : emp.porte === "03"
                              ? "EPP"
                              : emp.porte === "05"
                              ? "Demais Portes"
                              : "Porte não informado"}
                          </Badge>
                        </div>

                        {emp.nomeFantasia && (
                          <p className="text-xs text-muted-foreground font-medium">
                            Fantasia: {emp.nomeFantasia}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground font-mono">
                          CNPJ: {formatCnpj(emp.cnpj)} • {emp.municipio || "Cidade não informada"}
                          {emp.bairro ? ` • ${emp.bairro}` : ""}
                        </p>

                        <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                          {emp.telefone && (
                            <span>
                              Tel: <b className="text-foreground">{emp.telefone}</b>
                            </span>
                          )}
                          {emp.email && (
                            <span className="flex items-center gap-1">
                              Email: <b className="text-foreground">{emp.email}</b>
                              {/* Alerta de e-mail suspeito (Item 11) */}
                              {emailWarning.isSuspicious && (
                                <span
                                  className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1 rounded ml-1"
                                  title={emailWarning.reason}
                                >
                                  ⚠️ E-mail Terceiro / Confirmar
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOutreachCompany(emp)}
                          className="gap-1 text-xs"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Copy Vendas
                        </Button>

                        <Button
                          variant={isRecuperacao ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => handleAddToPipeline(emp)}
                          className={`gap-1 text-xs ${
                            isRecuperacao ? "border-rose-500/40 text-rose-600 hover:bg-rose-50" : ""
                          }`}
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Salvar no Funil
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Botão de Paginação / Carregar Mais (Item 6) */}
              {segmentResults.length < totalFound && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="gap-2 text-xs font-semibold px-6"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Carregar mais 50 empresas (Restam {totalFound - segmentResults.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "local_seo" && <LocalSeoProgrammatic />}

      {activeTab === "kanban" && <LeadsKanban />}

      {outreachCompany && (
        <OutreachCopyDialog
          lead={{
            id: `lead-temp-${Date.now()}`,
            cnpj: outreachCompany.cnpj,
            razaoSocial: outreachCompany.razaoSocial,
            nomeFantasia: outreachCompany.nomeFantasia,
            uf: outreachCompany.uf,
            municipio: outreachCompany.municipio,
            telefone: outreachCompany.telefone,
            email: outreachCompany.email,
            cnae: outreachCompany.cnae,
            cnaeDescricao: outreachCompany.cnaeDescricao,
            socioPrincipal: outreachCompany.socios?.[0]?.nome || null,
            stage: "prospect",
            createdAt: new Date().toISOString(),
            socios: outreachCompany.socios,
          }}
          isOpen={!!outreachCompany}
          onClose={() => setOutreachCompany(null)}
          onUpdateLead={(updated) => {
            handleAddToPipeline({
              ...outreachCompany,
              socios: updated.socios || outreachCompany.socios,
            });
            setOutreachCompany(null);
          }}
        />
      )}
    </div>
  );
}
