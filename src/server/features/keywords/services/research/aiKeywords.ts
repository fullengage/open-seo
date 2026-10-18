import { generateText } from "ai";
import { buildChatAgentModel } from "@/server/lib/openrouter";
import { getOptionalEnvValue, getRequiredEnvValue } from "@/server/lib/runtime-env";
import type { KeywordResearchRow, KeywordIntent } from "@/types/keywords";
import { calculateOpportunityScore } from "./opportunityScore";

export type AiKeywordGenerationInput = {
  seedKeyword: string;
  languageCode: string;
  locationName?: string;
  limit?: number;
};

/**
 * Gera palavras-chave semanticamente ricas com IA (OpenRouter),
 * categorizando intenção (informacional, comercial, transacional, navegacional, local),
 * sem inventar métricas numéricas falsas de volume ou CPC.
 */
export async function generateKeywordsWithAi(input: AiKeywordGenerationInput): Promise<KeywordResearchRow[]> {
  const apiKey = await getRequiredEnvValue("OPENROUTER_API_KEY");
  const modelName = await getOptionalEnvValue("OPENROUTER_MODEL");
  const model = buildChatAgentModel(apiKey, modelName, "low");

  const prompt = `Você é um especialista sênior em SEO, SEM e Search Intent.
Palavra-chave semente: "${input.seedKeyword}"
Idioma: ${input.languageCode === "pt" ? "Português do Brasil" : input.languageCode}
${input.locationName ? `Localização geográfica: ${input.locationName}` : ""}

Gere uma lista de até ${input.limit || 25} palavras-chave e variações relevantes de cauda longa (long-tail), comerciais, transacionais, perguntas de compradores e termos locais (se aplicável).

NUNCA invente volumes numéricos aleatórios ou falsos. Apenas forneça o termo, a intenção real e a categoria.

Responda ESTRITAMENTE com um array JSON válido sem markdown ou explicações:
[
  {
    "keyword": "termo exato",
    "intent": "informational" | "commercial" | "transactional" | "navigational",
    "category": "Principal" | "Cauda Longa" | "Pergunta" | "Transacional" | "Local" | "Comparativa"
  }
]`;

  try {
    const result = await generateText({
      model,
      prompt,
      maxOutputTokens: 2500,
      abortSignal: AbortSignal.timeout(45_000),
    });

    const text = result.text.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
    const items = JSON.parse(text) as Array<{ keyword: string; intent: string; category?: string }>;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Resposta da IA vazia ou malformada");
    }

    return items.map((item) => {
      const validIntents: KeywordIntent[] = ["informational", "commercial", "transactional", "navigational"];
      const intent: KeywordIntent = validIntents.includes(item.intent as KeywordIntent)
        ? (item.intent as KeywordIntent)
        : "commercial";

      const opp = calculateOpportunityScore({
        intent,
        searchVolume: null, // Deixado como null (N/D) para não inventar números falsos
        keywordDifficulty: null,
        cpc: null,
        competition: null,
      });

      return {
        keyword: item.keyword.trim().toLowerCase(),
        searchVolume: null,
        trend: [],
        keywordDifficulty: null,
        cpc: null,
        competition: null,
        intent,
        opportunityScore: opp.score,
        category: item.category || "Variação",
        source: "ai",
      };
    });
  } catch (err) {
    console.error("generateKeywordsWithAi error, using structured fallback:", err);
    // Fallback estruturado se o modelo demorar ou falhar
    const prefixes = [
      { p: "melhor", intent: "commercial", cat: "Comparativa" },
      { p: "quanto custa", intent: "commercial", cat: "Transacional" },
      { p: "como contratar", intent: "transactional", cat: "Transacional" },
      { p: "empresa de", intent: "commercial", cat: "Comercial" },
      { p: "especialista em", intent: "commercial", cat: "Comercial" },
      { p: "como funciona", intent: "informational", cat: "Pergunta" },
      { p: "o que é", intent: "informational", cat: "Pergunta" },
      { p: "preço de", intent: "commercial", cat: "Transacional" },
      { p: "serviço de", intent: "commercial", cat: "Comercial" },
      { p: "consultoria em", intent: "commercial", cat: "Comercial" },
    ] as const;

    return [
      {
        keyword: input.seedKeyword.toLowerCase(),
        searchVolume: null,
        trend: [],
        keywordDifficulty: null,
        cpc: null,
        competition: null,
        intent: "commercial",
        opportunityScore: 75,
        category: "Principal",
        source: "seed",
      },
      ...prefixes.map(({ p, intent, cat }) => ({
        keyword: `${p} ${input.seedKeyword}`.toLowerCase(),
        searchVolume: null,
        trend: [],
        keywordDifficulty: null,
        cpc: null,
        competition: null,
        intent: intent as KeywordIntent,
        opportunityScore: intent === "transactional" ? 85 : 65,
        category: cat,
        source: "template",
      })),
    ];
  }
}
