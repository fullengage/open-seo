import { useState } from "react";
import {
  MapPin,
  Sparkles,
  Download,
  Copy,
  Check,
  Compass,
  FileCode,
  Globe2,
} from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { toast } from "sonner";
import type { ProgrammaticPage } from "./types";

const DEFAULT_SUBREGIONS: Record<string, string[]> = {
  SP: [
    "Centro",
    "Jardins",
    "Pinheiros",
    "Moema",
    "Vila Mariana",
    "Tatuapé",
    "Santana",
    "Morumbi",
    "Santo Amaro",
    "Barra Funda",
  ],
  Campinas: [
    "Cambuí",
    "Taquaral",
    "Barão Geraldo",
    "Nova Campinas",
    "Castelo",
    "Sousas",
    "Guanabara",
    "Mansões Santo Antônio",
  ],
  Curitiba: [
    "Batel",
    "Água Verde",
    "Bigorrilho",
    "Centro Cívico",
    "Cabral",
    "Santa Felicidade",
    "Portão",
  ],
  Geral: [
    "Centro",
    "Zona Norte",
    "Zona Sul",
    "Zona Leste",
    "Zona Oeste",
    "Região Metropolitana",
    "Bairro Nobre",
    "Distrito Industrial",
  ],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

export function LocalSeoProgrammatic() {
  const [service, setService] = useState("Advogado Trabalhista");
  const [city, setCity] = useState("Campinas");
  const [uf, setUf] = useState("SP");
  const [radius, setRadius] = useState("30");
  const [regionsText, setRegionsText] = useState(
    DEFAULT_SUBREGIONS.Campinas.join(", ")
  );
  const [domain, setDomain] = useState("https://seusite.com.br");
  const [pages, setPages] = useState<ProgrammaticPage[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function handleCityChange(newCity: string) {
    setCity(newCity);
    if (DEFAULT_SUBREGIONS[newCity]) {
      setRegionsText(DEFAULT_SUBREGIONS[newCity].join(", "));
    }
  }

  function handleGenerate() {
    if (!service.trim() || !city.trim()) {
      toast.error("Informe o serviço e a cidade principal.");
      return;
    }

    const regions = regionsText
      .split(/[,;\n]/)
      .map((r) => r.trim())
      .filter(Boolean);

    const targetList = regions.length > 0 ? regions : ["Centro", "Região Central"];

    const generated: ProgrammaticPage[] = targetList.map((region) => {
      const serviceSlug = slugify(service);
      const citySlug = slugify(city);
      const regionSlug = slugify(region);
      const slug = `/${serviceSlug}/${citySlug}-${regionSlug}`;

      const title = `${service} em ${region}, ${city} - ${uf} | Atendimento Especializado`;
      const metaDescription = `Procurando ${service.toLowerCase()} no bairro ${region} em ${city} - ${uf}? Atendimento em raio de ${radius}km. Agende uma consulta com nossos especialistas locais.`;
      const h1 = `${service} em ${region} (${city} - ${uf})`;

      const schemaJson = JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: `${service} - ${region}, ${city}`,
          description: metaDescription,
          url: `${domain.replace(/\/$/, "")}${slug}`,
          areaServed: {
            "@type": "AdministrativeArea",
            name: `${region}, ${city} - ${uf}`,
          },
        },
        null,
        2
      );

      return {
        slug,
        title,
        metaDescription,
        h1,
        cidade: city,
        bairro: region,
        servico: service,
        schemaJson,
      };
    });

    setPages(generated);
    toast.success(`${generated.length} Landing Pages programáticas geradas!`);
  }

  function handleCopyAllUrls() {
    if (pages.length === 0) return;
    const base = domain.replace(/\/$/, "");
    const text = pages.map((p) => `${base}${p.slug}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Todas as URLs copiadas para a área de transferência!");
  }

  function handleExportCsv() {
    if (pages.length === 0) return;
    const base = domain.replace(/\/$/, "");
    const headers = ["URL", "H1", "Meta Title", "Meta Description", "Bairro", "Cidade", "UF"];
    const rows = pages.map((p) => [
      `"${base}${p.slug}"`,
      `"${p.h1}"`,
      `"${p.title}"`,
      `"${p.metaDescription}"`,
      `"${p.bairro || ""}"`,
      `"${p.cidade}"`,
      `"${uf}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `landing-pages-locais-${slugify(city)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Planilha CSV exportada com sucesso!");
  }

  function handleCopySchema(schema: string, idx: number) {
    navigator.clipboard.writeText(schema);
    setCopiedIndex(idx);
    toast.success("Código Schema.org LocalBusiness copiado!");
    setTimeout(() => setCopiedIndex(null), 2500);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Configuração de Raio de Atuação & Landing Pages Programáticas
          </CardTitle>
          <CardDescription>
            Gere estruturas completas de URLs, meta tags e Schema.org LocalBusiness para capturar tráfego orgânico hiperlocal e evitar desperdício com buscas de outras regiões.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Serviço / Solução
              </label>
              <Input
                placeholder="Ex: Consultoria Tributária, Clínica Odontológica"
                value={service}
                onChange={(e) => setService(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Cidade Polo
              </label>
              <Input
                placeholder="Ex: Campinas, São Paulo, Curitiba"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  UF
                </label>
                <Input
                  maxLength={2}
                  className="uppercase font-mono"
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Raio de Atendimento
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="15">15 km</option>
                  <option value="30">30 km</option>
                  <option value="50">50 km</option>
                  <option value="100">100 km (Regional)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Bairros e Micro-Regiões Atendidas (Separados por vírgula)
              </label>
              <Input
                placeholder="Cambuí, Taquaral, Barão Geraldo, Nova Campinas..."
                value={regionsText}
                onChange={(e) => setRegionsText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Domínio Base do Site
              </label>
              <Input
                placeholder="https://seusite.com.br"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleGenerate} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Gerar Matriz de Landing Pages Programáticas
            </Button>
          </div>
        </CardContent>
      </Card>

      {pages.length > 0 && (
        <Card className="animate-in fade-in-50 duration-200">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {pages.length} Páginas Programáticas Otimizadas para {city} - {uf}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  Raio {radius}km
                </Badge>
              </div>
              <CardDescription>
                Estrutura pronta para WordPress, Webflow, Next.js ou CMS próprio com tags de SEO local e JSON-LD.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyAllUrls} className="gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" />
                Copiar URLs
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border border rounded-md">
              {pages.map((p, idx) => (
                <div key={idx} className="p-4 space-y-2 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-sm">{p.bairro}</span>
                      <span className="text-xs font-mono text-muted-foreground">{p.slug}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopySchema(p.schemaJson, idx)}
                      className="h-8 gap-1 text-xs shrink-0"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          Schema Copiado!
                        </>
                      ) : (
                        <>
                          <FileCode className="h-3.5 w-3.5" />
                          Copiar Schema JSON-LD
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-medium text-foreground">
                      <span className="text-muted-foreground mr-1.5">Title:</span> {p.title}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium mr-1.5">Meta:</span> {p.metaDescription}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
