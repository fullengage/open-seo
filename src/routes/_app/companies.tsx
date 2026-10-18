import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Building2, Search, Users, MapPin, Phone, Mail, Globe, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { getCompanyByCnpj, searchCompaniesBySegment } from "@/serverFunctions/companies";
import type { CompanyDetail } from "@/types/schemas/company";

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
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [segmentResults, setSegmentResults] = useState<CompanyDetail[]>([]);
  const [activeTab, setActiveTab] = useState<"cnpj" | "segment">("cnpj");

  const cnpjMutation = useMutation({
    mutationFn: (cnpj: string) => getCompanyByCnpj({ data: { cnpj } }),
    onSuccess: (data) => {
      setCompany(data);
    },
  });

  const segmentMutation = useMutation({
    mutationFn: ({ cnae, uf }: { cnae: string; uf: string }) =>
      searchCompaniesBySegment({ data: { cnae, uf, limit: 15 } }),
    onSuccess: (data) => {
      setSegmentResults(data);
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
    segmentMutation.mutate({ cnae: cnaeInput.trim(), uf: ufInput.trim() });
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Consulta de Empresas & Inteligência de Mercado
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consulte dados cadastrais da Receita Federal, quadro societário (QSA) e prospecte empresas no Brasil.
          </p>
        </div>
      </div>

      <div className="flex border-b border-border space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab("cnpj")}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "cnpj"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Busca por CNPJ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("segment")}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "segment"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Prospecção por Segmento (CNAE + Estado)
        </button>
      </div>

      {activeTab === "cnpj" ? (
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
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{company.razaoSocial}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {company.porte === "01" ? "Microempresa (ME)" : company.porte === "03" ? "Empresa de Pequeno Porte (EPP)" : "Demais"}
                        </Badge>
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

                    <Button
                      onClick={() => {
                        window.location.href = `/projects?create=true&name=${encodeURIComponent(company.nomeFantasia || company.razaoSocial)}`;
                      }}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Criar Projeto SEO para esta Empresa
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Atividade Econômica (CNAE)</h4>
                      <p className="text-sm font-medium mt-1">
                        <span className="font-mono text-primary font-bold mr-2">{company.cnae}</span>
                        {company.cnaeDescricao || "Atividade principal"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Capital Social</h4>
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
                        {company.municipio || ""}{company.uf ? ` - ${company.uf}` : ""}
                        {company.cep ? ` (CEP: ${company.cep})` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Contato
                      </h4>
                      <div className="text-sm mt-1 space-y-1">
                        {company.telefone ? (
                          <p className="text-muted-foreground">Tel: <span className="text-foreground">{company.telefone}</span></p>
                        ) : null}
                        {company.email ? (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> <span className="text-foreground">{company.email}</span>
                          </p>
                        ) : null}
                        {!company.telefone && !company.email && (
                          <p className="text-xs text-muted-foreground italic">Nenhum telefone/e-mail cadastrado na base.</p>
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
                            <div key={i} className="text-sm border-l-2 border-primary/40 pl-2 py-0.5">
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
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtrar Empresas por Segmento e Estado</CardTitle>
              <CardDescription>
                Ex: CNAE 5611201 (Restaurantes), 6201501 (Desenvolvimento de Software), 6911701 (Advocacia)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearchSegment} className="flex flex-wrap gap-3 max-w-xl">
                <Input
                  placeholder="Código CNAE (ex: 5611201)"
                  value={cnaeInput}
                  onChange={(e) => setCnaeInput(e.target.value)}
                  className="w-48 font-mono"
                />
                <Input
                  placeholder="UF (ex: SP)"
                  value={ufInput}
                  maxLength={2}
                  onChange={(e) => setUfInput(e.target.value.toUpperCase())}
                  className="w-24 uppercase font-mono"
                />
                <Button type="submit" disabled={segmentMutation.isPending || !cnaeInput.trim()}>
                  {segmentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Buscar Empresas
                </Button>
              </form>
            </CardContent>
          </Card>

          {segmentMutation.isPending && (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Filtrando empresas pelo CNAE {cnaeInput} em {ufInput}...
            </div>
          )}

          {!segmentMutation.isPending && segmentMutation.isSuccess && segmentResults.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">Nenhuma empresa encontrada para este filtro imediato.</p>
              <p className="text-xs mt-1">
                A busca rápida por CNPJ individual (na aba ao lado) consulta em tempo real qualquer empresa do Brasil!
              </p>
            </Card>
          )}

          {segmentResults.length > 0 && (
            <div className="grid gap-3">
              {segmentResults.map((emp) => (
                <Card key={emp.cnpj} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{emp.razaoSocial}</span>
                      <Badge variant="outline" className="text-xs">{emp.uf}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      CNPJ: {formatCnpj(emp.cnpj)} • {emp.municipio || "Cidade não informada"} • {emp.bairro || ""}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      {emp.telefone && <span>Tel: <b className="text-foreground">{emp.telefone}</b></span>}
                      {emp.email && <span>Email: <b className="text-foreground">{emp.email}</b></span>}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCnpjInput(emp.cnpj);
                      setActiveTab("cnpj");
                      cnpjMutation.mutate(emp.cnpj);
                    }}
                  >
                    Ver Ficha Completa
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
