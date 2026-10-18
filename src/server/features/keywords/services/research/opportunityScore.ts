import type { KeywordIntent } from "@/types/keywords";

export type OpportunityScoreParams = {
  intent: KeywordIntent;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  cpc: number | null;
  competition: number | null;
};

export type OpportunityScoreResult = {
  score: number;
  isPartial: boolean;
  confidence: "alta" | "média" | "baixa";
};

/**
 * Calcula o Score de Oportunidade Comercial de 0 a 100 conforme a fórmula planejada:
 * score = intenção * 0.30 + relevância * 0.25 + demanda * 0.15 + (100 - dificuldade) * 0.15 + valor_comercial * 0.15
 */
export function calculateOpportunityScore(params: OpportunityScoreParams): OpportunityScoreResult {
  let knownWeight = 0;
  let rawScore = 0;

  // 1. Intenção de Busca (peso 30%)
  // Transacional / Comercial têm muito mais valor que Informacional puro
  let intentScore = 50;
  if (params.intent === "transactional") intentScore = 100;
  else if (params.intent === "commercial") intentScore = 85;
  else if (params.intent === "informational") intentScore = 45;
  else if (params.intent === "navigational") intentScore = 30;
  
  rawScore += intentScore * 0.30;
  knownWeight += 0.30;

  // 2. Relevância Semântica básica (peso 25%) - base padrão 75
  rawScore += 75 * 0.25;
  knownWeight += 0.25;

  // 3. Demanda / Volume de Busca (peso 15%)
  if (params.searchVolume !== null && params.searchVolume !== undefined) {
    // Normalizar volume: 0 a 10.000 buscas
    const volumeScore = Math.min(100, Math.round((params.searchVolume / 5000) * 100));
    rawScore += volumeScore * 0.15;
    knownWeight += 0.15;
  }

  // 4. Dificuldade SEO (peso 15%) - quanto menor a dificuldade, maior a oportunidade!
  if (params.keywordDifficulty !== null && params.keywordDifficulty !== undefined) {
    const easyScore = Math.max(0, 100 - params.keywordDifficulty);
    rawScore += easyScore * 0.15;
    knownWeight += 0.15;
  }

  // 5. Valor Comercial / CPC (peso 15%)
  if (params.cpc !== null && params.cpc !== undefined) {
    // CPC de R$ 0 a R$ 10 normalizado
    const cpcScore = Math.min(100, Math.round((params.cpc / 10) * 100));
    rawScore += cpcScore * 0.15;
    knownWeight += 0.15;
  }

  // Normalizar pelo peso conhecido para não penalizar ausência de métricas pagas
  const normalizedFinalScore = Math.round(rawScore / knownWeight);
  const finalScore = Math.min(100, Math.max(1, normalizedFinalScore));

  const isPartial = knownWeight < 0.85;
  const confidence = knownWeight >= 0.85 ? "alta" : knownWeight >= 0.55 ? "média" : "baixa";

  return {
    score: finalScore,
    isPartial,
    confidence,
  };
}
