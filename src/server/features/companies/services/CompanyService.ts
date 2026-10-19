import type { CompanyDetail } from "@/types/schemas/company";

const DAEMON_URL = process.env.CNPJ_DAEMON_URL || "http://127.0.0.1:3005";

export const CompanyService = {
  async getByCnpj(rawCnpj: string): Promise<CompanyDetail | null> {
    const cleanCnpj = rawCnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return null;

    // 1. Tentar busca no daemon local SQLite de alta velocidade
    try {
      const res = await fetch(`${DAEMON_URL}/cnpj?cnpj=${cleanCnpj}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data && data.cnpj) {
          return data as CompanyDetail;
        }
      }
    } catch {
      // Ignora falha do daemon e faz fallback transparente para BrasilAPI
    }

    // 2. Fallback online em tempo real via BrasilAPI
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: { "User-Agent": "OpenSEO-Fullengage" },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as any;

      return {
        cnpj: cleanCnpj,
        cnpjBasico: cleanCnpj.slice(0, 8),
        razaoSocial: data.razao_social || "",
        nomeFantasia: data.nome_fantasia || null,
        capitalSocial: data.capital_social || null,
        porte: data.porte || null,
        cnae: String(data.cnae_fiscal || ""),
        cnaeDescricao: data.cnae_fiscal_descricao || null,
        uf: data.uf || "",
        municipio: data.municipio || null,
        bairro: data.bairro || null,
        cep: data.cep || null,
        telefone: data.ddd_telefone_1 || null,
        email: data.email || null,
        socios: Array.isArray(data.qsa)
          ? data.qsa.map((s: any) => ({
              nome: s.nome_socio || "",
              qualificacao: s.codigo_qualificacao_socio ? String(s.codigo_qualificacao_socio) : null,
              qualificacaoDescricao: s.qualificacao_socio || null,
              entrada: s.data_entrada_sociedade || null,
            }))
          : [],
      };
    } catch (err) {
      console.error("CompanyService.brasilApi error:", err);
      return null;
    }
  },

  async searchBySegment(cnae: string, uf: string, limit = 20): Promise<CompanyDetail[]> {
    const cleanCnae = cnae.replace(/\D/g, "");
    if (!cleanCnae) return [];

    try {
      const res = await fetch(
        `${DAEMON_URL}/segment?cnae=${encodeURIComponent(cleanCnae)}&uf=${encodeURIComponent(uf.toUpperCase())}&limit=${limit}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) {
        return (await res.json()) as CompanyDetail[];
      }
    } catch (err) {
      console.error("CompanyService.searchBySegment error:", err);
    }
    return [];
  },

  async inspectWebsiteFacts(url: string, companyName: string) {
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    const nowIso = new Date().toISOString();
    const facts: any[] = [];

    try {
      const response = await fetch(formattedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const html = await response.text();

        // 1. Meta Description
        const descMatch =
          html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
          html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
        const metaDesc = descMatch ? descMatch[1].trim() : "";

        if (!metaDesc) {
          facts.push({
            id: `fact-desc-${Date.now()}`,
            type: "no_meta_description",
            category: "negative",
            source: "Crawler",
            date: nowIso,
            phrase: `Quando alguém procura ${companyName}, o Google mostra como descrição um trecho aleatório da página, porque o site não tem uma descrição própria.`,
          });
        }

        // 2. H1
        const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (!h1Match) {
          facts.push({
            id: `fact-h1-${Date.now()}`,
            type: "generic_or_missing_h1",
            category: "negative",
            source: "Crawler",
            date: nowIso,
            phrase: `A página inicial não tem um título principal definindo o que a empresa faz.`,
          });
        } else {
          const h1Text = h1Match[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
          const lowerH1 = h1Text.toLowerCase();
          const genericTerms = ["home", "início", "inicio", "bem-vindo", "bem vindo", companyName.toLowerCase()];
          if (h1Text.length < 4 || genericTerms.includes(lowerH1)) {
            facts.push({
              id: `fact-h1-${Date.now()}`,
              type: "generic_or_missing_h1",
              category: "negative",
              source: "Crawler",
              date: nowIso,
              value: h1Text,
              phrase: `O título principal da página inicial é "${h1Text}", que não diz o que a empresa faz.`,
            });
          }
        }

        // 3. Anos antigos no texto (ano atual - 3 = 2026 - 3 = 2023 ou menor)
        const textOnly = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]*>/g, " ");

        const yearMatches = textOnly.match(/\b(201[5-9]|202[0-3])\b/g);
        if (yearMatches && yearMatches.length > 0) {
          const uniqueYears = Array.from(new Set(yearMatches)).sort();
          facts.push({
            id: `fact-year-${Date.now()}`,
            type: "outdated_year",
            category: "negative",
            source: "Crawler",
            date: nowIso,
            value: uniqueYears.slice(0, 2).join("/"),
            phrase: `O conteúdo da página inicial ainda fala de ${uniqueYears.slice(0, 2).join("/")}.`,
          });
        }

        // 4. Sem dados estruturados
        const hasSchema = /<script[^>]*type=["']application\/ld\+json["']/i.test(html);
        if (!hasSchema) {
          facts.push({
            id: `fact-schema-${Date.now()}`,
            type: "no_structured_data",
            category: "diagnostic_only",
            source: "Crawler",
            date: nowIso,
            phrase: `Sem dados estruturados Schema.org.`,
          });
        }
      }
    } catch {
      // Ignora falha de crawl da URL
    }

    return {
      crawledAt: nowIso,
      websiteUrl: formattedUrl,
      facts,
    };
  },
};
