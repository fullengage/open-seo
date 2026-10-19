import { describe, it, expect } from "vitest";
import { generateMeasuredOutreach, validateAiRewrite } from "./factsGenerator";
import type { PipelineLead, LeadFact } from "./types";

describe("factsGenerator - Spec: Gerar Abordagem só com fatos medidos", () => {
  const laguneFacts: LeadFact[] = [
    {
      id: "fact-1",
      type: "no_meta_description",
      category: "negative",
      source: "Crawler",
      date: "2026-10-19T10:00:00Z",
      phrase:
        "Quando alguém procura Lagune, o Google mostra como descrição um trecho aleatório da página, porque o site não tem uma descrição própria.",
    },
    {
      id: "fact-2",
      type: "outdated_year",
      category: "negative",
      source: "Crawler",
      date: "2026-10-19T10:00:00Z",
      value: "2019/2020",
      phrase: "O conteúdo da página inicial ainda fala de 2019/2020.",
    },
    {
      id: "fact-3",
      type: "slow_lcp_mobile",
      category: "negative",
      source: "PageSpeed",
      date: "2026-10-19T10:00:00Z",
      value: "6,2 s",
      phrase:
        "No celular, a página inicial levou 6,2 s para carregar o conteúdo principal no teste do Google.",
    },
    {
      id: "fact-4",
      type: "high_google_rating",
      category: "positive",
      source: "Perfil Google (Apify)",
      date: "2026-10-19T10:00:00Z",
      value: "4,7",
      phrase: "O perfil no Google tem nota 4,7.",
    },
  ];

  const laguneLead: PipelineLead = {
    id: "lead-lagune",
    cnpj: "19845309000185",
    razaoSocial: "LAGUNE PISCINAS E CONSTRUCAO LTDA",
    nomeFantasia: "Lagune",
    uf: "SP",
    municipio: "Campinas",
    segmento: "piscinas em Campinas",
    decisorNome: "Eugênio Romano",
    decisorCargo: "Sócio-Administrador",
    stage: "prospect",
    createdAt: "2026-10-19T10:00:00Z",
    diagnostic: {
      crawledAt: "2026-10-19T10:00:00Z",
      websiteUrl: "https://lagune.com.br",
      facts: laguneFacts,
    },
  };

  it("gera abordagem exata para a Lagune endereçando ao Eugênio com fatos medidos", () => {
    const res = generateMeasuredOutreach(laguneLead);
    expect(res.success).toBe(true);
    expect(res.draft).toBeDefined();

    const draft = res.draft!;
    expect(draft.subject).toBe("Lagune no Google: sem descrição própria nas buscas");
    expect(draft.body).toContain("Olá, Eugênio, tudo bem?");
    expect(draft.body).toContain("Sou o Richard, da Fullweb.");
    expect(draft.body).toContain("Olhei hoje como a Lagune aparece para quem procura piscinas em Campinas, e separei 3 pontos:");
    expect(draft.body).toContain(
      "1. Quando alguém procura Lagune, o Google mostra como descrição um trecho aleatório da página, porque o site não tem uma descrição própria."
    );
    expect(draft.body).toContain("2. O conteúdo da página inicial ainda fala de 2019/2020.");
    expect(draft.body).toContain(
      "3. No celular, a página inicial levou 6,2 s para carregar o conteúdo principal no teste do Google."
    );
    expect(draft.body).toContain("O perfil no Google tem nota 4,7.");
    expect(draft.body).toContain('É só responder "pode mandar".');
    expect(draft.body).toContain("Richard Wagner\nFullweb");
    expect(draft.body).toContain("Se preferir não receber outro contato meu, é só avisar.");
  });

  it("bloqueia geração se houver menos de 2 fatos negativos medidos", () => {
    const incompleteLead: PipelineLead = {
      ...laguneLead,
      diagnostic: {
        crawledAt: "2026-10-19T10:00:00Z",
        websiteUrl: "https://lagune.com.br",
        facts: [laguneFacts[0]], // Apenas 1 fato
      },
    };

    const res = generateMeasuredOutreach(incompleteLead);
    expect(res.success).toBe(false);
    expect(res.error).toBe("needs_diagnostic");
    expect(res.draft).toBeUndefined();
  });

  it("bloqueia se decisorNome estiver vazio para forçar escolha do sócio no QSA", () => {
    const noDecisorLead: PipelineLead = {
      ...laguneLead,
      decisorNome: null,
    };

    const res = generateMeasuredOutreach(noDecisorLead);
    expect(res.success).toBe(false);
    expect(res.error).toBe("needs_decisor");
    expect(res.draft).toBeUndefined();
  });

  it("proíbe estritamente termos não medidos ou genéricos no texto", () => {
    const res = generateMeasuredOutreach(laguneLead);
    const body = res.draft!.body.toLowerCase();

    expect(body).not.toContain("pré-diagnóstico");
    expect(body).not.toContain("gargalos");
    expect(body).not.toContain("centenas de buscas");
    expect(body).not.toContain("striking distance");
    expect(body).not.toContain("dobra os cliques");
    expect(body).not.toContain("openseo");
    expect(body).not.toContain("equipe de estratégia b2b");
  });

  it("valida reescrita da IA e bloqueia alucinações de novos números ou termos proibidos", () => {
    const originalText = laguneLead.diagnostic!.facts.map((f) => f.phrase).join("\n");

    const validAiText =
      "Olá, Eugênio! Separei 3 pontos sobre a Lagune: 1. Sem descrição no Google. 2. Conteúdo de 2019/2020. 3. Celular levou 6,2 s.";
    expect(validateAiRewrite(originalText, validAiText, laguneFacts)).toBe(true);

    const hallucinatedNumberAiText =
      "Olá, Eugênio! Identificamos 500 novos clientes e 99% de perda de tráfego.";
    expect(validateAiRewrite(originalText, hallucinatedNumberAiText, laguneFacts)).toBe(false);

    const forbiddenPhraseAiText =
      "Realizamos um pré-diagnóstico técnico no site.";
    expect(validateAiRewrite(originalText, forbiddenPhraseAiText, laguneFacts)).toBe(false);
  });
});
