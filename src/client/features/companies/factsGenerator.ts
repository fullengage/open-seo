import type { PipelineLead, LeadFact, OutreachDraft } from "./types";

const FORBIDDEN_WORDS = [
  "pré-diagnóstico",
  "pre-diagnostico",
  "gargalos",
  "centenas de buscas",
  "striking distance",
  "dobra os cliques",
  "openseo",
  "equipe de estratégia b2b",
  "equipe de estrategia b2b",
];

// Site fora do ar ou domínio estacionado já é motivo suficiente; o resto pede 2 fatos.
export function hasEnoughFacts(facts: LeadFact[]): boolean {
  const neg = facts.filter((f) => f.category === "negative");
  return neg.length >= 2 || neg.some((f) => f.type === "site_down" || f.type === "parked_domain");
}

export function getShortSubjectFact(fact: LeadFact): string {
  switch (fact.type) {
    case "no_meta_description":
      return "sem descrição própria nas buscas";
    case "generic_or_missing_h1":
      return "título da página inicial";
    case "outdated_year":
      return "conteúdo da página inicial desatualizado";
    case "slow_lcp_mobile":
      return "carregamento lento no celular";
    case "not_in_top_10":
      return "posicionamento nas buscas";
    case "site_down":
      return "site fora do ar";
    case "parked_domain":
      return "endereço do site sem a empresa";
    default:
      return "diagnóstico no Google";
  }
}

export function buildFactPhrase(factType: LeadFact["type"], companyName: string, value?: string | number | null): string {
  switch (factType) {
    case "no_meta_description":
      return `Quando alguém procura ${companyName}, o Google mostra como descrição um trecho aleatório da página, porque o site não tem uma descrição própria.`;
    case "generic_or_missing_h1":
      if (value) {
        return `O título principal da página inicial é "${value}", que não diz o que a empresa faz.`;
      }
      return `A página inicial não tem um título principal definindo o que a empresa faz.`;
    case "outdated_year":
      return `O conteúdo da página inicial ainda fala de ${value || "anos anteriores"}.`;
    case "slow_lcp_mobile":
      return `No celular, a página inicial levou ${value || "mais de 4 s"} para carregar o conteúdo principal no teste do Google.`;
    case "not_in_top_10":
      return `Na busca "${value || "seu segmento"}", a ${companyName} não apareceu entre os primeiros resultados.`;
    case "high_google_rating":
      return `O perfil no Google tem nota ${value}.`;
    default:
      return "";
  }
}

export function generateMeasuredOutreach(lead: PipelineLead): {
  success: boolean;
  error?: string;
  draft?: OutreachDraft;
} {
  // 1. Validar decisor
  if (!lead.decisorNome || !lead.decisorNome.trim()) {
    return {
      success: false,
      error: "needs_decisor",
    };
  }

  // 2. Coletar fatos medidos
  const allFacts = lead.diagnostic?.facts || [];
  // Ordem de força: busca no Google > PageSpeed > meta description > H1 > ano antigo
  const FACT_PRIORITY: LeadFact["type"][] = [
    "site_down",
    "parked_domain",
    "not_in_top_10",
    "slow_lcp_mobile",
    "no_meta_description",
    "generic_or_missing_h1",
    "outdated_year",
  ];
  const rank = (t: LeadFact["type"]) => {
    const i = FACT_PRIORITY.indexOf(t);
    return i === -1 ? FACT_PRIORITY.length : i;
  };
  const negativeFacts = allFacts
    .filter((f) => f.category === "negative")
    .sort((a, b) => rank(a.type) - rank(b.type));
  const positiveFacts = allFacts.filter((f) => f.category === "positive");

  // Bloquear se houver menos de 2 fatos negativos
  if (!hasEnoughFacts(allFacts)) {
    return {
      success: false,
      error: "needs_diagnostic",
    };
  }

  // Limitar a até 3 fatos negativos
  const factsToUse = negativeFacts.slice(0, 3);
  const positiveFact = positiveFacts[0];

  const companyName = lead.nomeFantasia || lead.razaoSocial;
  const firstName = lead.decisorNome.trim().split(" ")[0];
  const segmento = lead.segmento || (lead.cnaeDescricao ? lead.cnaeDescricao.toLowerCase() : "seus serviços");

  const mainShortFact = getShortSubjectFact(factsToUse[0]);
  const subject = `${companyName} no Google: ${mainShortFact}`;

  const factItemsText = factsToUse
    .map((f, idx) => `${idx + 1}. ${f.phrase}`)
    .join("\n");

  const positiveParagraph = positiveFact ? `\n\n${positiveFact.phrase}` : "";

  const body = `Olá, ${firstName}, tudo bem?

Sou o Richard, da Fullweb. Olhei hoje como a ${companyName} aparece para quem procura ${segmento}, e separei ${factsToUse.length === 1 ? "um ponto" : `${factsToUse.length} pontos`}:

${factItemsText}${positiveParagraph}

Se fizer sentido, te mando o diagnóstico completo com os prints e a ordem do que eu ajustaria primeiro. É só responder "pode mandar".

Abraço,
Richard Wagner
Fullweb

Se preferir não receber outro contato meu, é só avisar.`;

  // Validação estrita de proibição
  const lowerBody = body.toLowerCase();
  for (const forbidden of FORBIDDEN_WORDS) {
    if (lowerBody.includes(forbidden)) {
      return {
        success: false,
        error: `Texto gerado continha termo proibido: ${forbidden}`,
      };
    }
  }

  const allUsedFacts = positiveFact ? [...factsToUse, positiveFact] : factsToUse;

  const draft: OutreachDraft = {
    id: `draft-${Date.now()}`,
    status: "awaiting_approval",
    subject,
    body,
    decisorNome: lead.decisorNome,
    factsUsed: allUsedFacts,
    generatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    draft,
  };
}

export function validateAiRewrite(originalText: string, aiText: string, facts: LeadFact[]): boolean {
  // Proibir termos banidos
  const lowerAi = aiText.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (lowerAi.includes(word)) return false;
  }

  // Coleta todos os números permitidos da lista de fatos e do template original
  const allowedNumbers = new Set<string>();
  const origMatches = originalText.match(/\b\d+([.,]\d+)?\b/g) || [];
  origMatches.forEach((n) => allowedNumbers.add(n));

  facts.forEach((f) => {
    if (f.value !== undefined && f.value !== null) {
      const valMatches = String(f.value).match(/\b\d+([.,]\d+)?\b/g) || [];
      valMatches.forEach((n) => allowedNumbers.add(n));
    }
  });

  // Extrai todos os números do texto da IA
  const aiNumbers = aiText.match(/\b\d+([.,]\d+)?\b/g) || [];
  for (const num of aiNumbers) {
    // Permite numeração de itens de lista (1, 2, 3)
    if (["1", "2", "3", "4", "5"].includes(num)) continue;
    if (!allowedNumbers.has(num)) {
      return false; // Alucinação de número detectada!
    }
  }

  return true;
}
