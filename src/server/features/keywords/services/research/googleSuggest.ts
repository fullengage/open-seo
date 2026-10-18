import type { KeywordResearchRow, KeywordIntent } from "@/types/keywords";
import { calculateOpportunityScore } from "./opportunityScore";

/**
 * Consulta a API pública de sugestões/autocomplete do Google (100% gratuita, oficial e em tempo real).
 */
async function fetchRawGoogleSuggest(query: string, lang = "pt-BR", country = "br"): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=${lang}&gl=${country}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return [];
    const data = (await response.json()) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch (err) {
    console.warn(`[googleSuggest] Erro ao buscar sugestões para "${query}":`, err);
    return [];
  }
}

/**
 * Classifica a intenção de busca a partir de padrões léxicos de busca em português/inglês.
 */
function detectIntent(keyword: string): KeywordIntent {
  const lower = keyword.toLowerCase();

  // Transacional / Ação direta
  if (
    lower.includes("preço") ||
    lower.includes("preco") ||
    lower.includes("valor") ||
    lower.includes("quanto custa") ||
    lower.includes("comprar") ||
    lower.includes("contratar") ||
    lower.includes("orçamento") ||
    lower.includes("orcamento") ||
    lower.includes("cupom") ||
    lower.includes("desconto")
  ) {
    return "transactional";
  }

  // Comercial / Comparativa
  if (
    lower.includes("melhor") ||
    lower.includes("melhores") ||
    lower.includes("top") ||
    lower.includes("vs") ||
    lower.includes("comparativo") ||
    lower.includes("review") ||
    lower.includes("avaliação") ||
    lower.includes("avaliacao") ||
    lower.includes("empresa") ||
    lower.includes("agência") ||
    lower.includes("agencia") ||
    lower.includes("serviço") ||
    lower.includes("servico")
  ) {
    return "commercial";
  }

  // Informacional / Dúvidas
  if (
    lower.startsWith("como") ||
    lower.startsWith("o que") ||
    lower.startsWith("oq") ||
    lower.startsWith("por que") ||
    lower.startsWith("porque") ||
    lower.startsWith("quando") ||
    lower.startsWith("onde") ||
    lower.startsWith("qual") ||
    lower.startsWith("quem") ||
    lower.includes("significado") ||
    lower.includes("tutorial") ||
    lower.includes("dicas")
  ) {
    return "informational";
  }

  // Navegacional (marcas / logins)
  if (lower.includes("login") || lower.includes("entrar") || lower.includes("portal") || lower.includes("site oficial")) {
    return "navigational";
  }

  return "commercial";
}

/**
 * Retorna palavras-chave reais sugeridas pelo Google para a semente,
 * incluindo expansões de cauda longa e perguntas.
 */
export async function fetchGoogleSuggestions(
  seedKeyword: string,
  options?: { languageCode?: string; countryCode?: string; limit?: number },
): Promise<KeywordResearchRow[]> {
  const seed = seedKeyword.trim();
  if (!seed) return [];

  const lang = options?.languageCode === "pt" ? "pt-BR" : options?.languageCode || "pt-BR";
  const country = options?.countryCode || "br";
  const limit = options?.limit || 30;

  // Modificadores para expandir cauda longa e perguntas
  const expansionQueries = [
    seed,
    `como ${seed}`,
    `melhor ${seed}`,
    `${seed} quanto custa`,
    `${seed} curso`,
    `${seed} empresa`,
    `${seed} para`,
    `${seed} o que é`,
  ];

  const results = await Promise.allSettled(
    expansionQueries.map((q) => fetchRawGoogleSuggest(q, lang, country)),
  );

  const seen = new Set<string>();
  const rows: KeywordResearchRow[] = [];

  for (const res of results) {
    if (res.status !== "fulfilled") continue;
    for (const term of res.value) {
      const cleanTerm = term.trim().toLowerCase();
      if (!cleanTerm || seen.has(cleanTerm)) continue;
      seen.add(cleanTerm);

      const intent = detectIntent(cleanTerm);
      const opp = calculateOpportunityScore({
        intent,
        searchVolume: null,
        keywordDifficulty: null,
        cpc: null,
        competition: null,
      });

      rows.push({
        keyword: cleanTerm,
        searchVolume: null,
        trend: [],
        keywordDifficulty: null,
        cpc: null,
        competition: null,
        intent,
        opportunityScore: opp.score,
        category: cleanTerm.includes("como") || cleanTerm.includes("o que") ? "Pergunta" : "Google Suggest",
        source: "suggestions",
      });

      if (rows.length >= limit) break;
    }
    if (rows.length >= limit) break;
  }

  return rows;
}
