import { describe, it, expect } from "vitest";
import { generateMeasuredOutreach, hasEnoughFacts } from "./factsGenerator";
import type { PipelineLead, LeadFact } from "./types";

const fact = (type: LeadFact["type"], phrase: string): LeadFact => ({
  id: type,
  type,
  category: "negative",
  source: "Crawler",
  date: "2026-10-20T00:00:00Z",
  phrase,
});

describe("site fora do ar / domínio estacionado", () => {
  it("um fato de site fora do ar basta; um fato comum não", () => {
    expect(hasEnoughFacts([fact("site_down", "x")])).toBe(true);
    expect(hasEnoughFacts([fact("parked_domain", "x")])).toBe(true);
    expect(hasEnoughFacts([fact("no_meta_description", "x")])).toBe(false);
  });

  it("gera e-mail com 'um ponto' e assunto de site fora do ar", () => {
    const lead = {
      id: "wb",
      cnpj: "50602082000112",
      razaoSocial: "WB BEAUTY TERCEIRIZACAO DE COSMETICOS LTDA",
      uf: "SP",
      stage: "prospect",
      createdAt: "2026-10-20T00:00:00Z",
      decisorNome: "Anderson Fernandes Ribeiro",
      diagnostic: {
        crawledAt: "",
        websiteUrl: "https://wbbeauty.com",
        facts: [fact("site_down", "SITE-FORA")],
      },
    } as PipelineLead;
    const res = generateMeasuredOutreach(lead);
    expect(res.success).toBe(true);
    expect(res.draft!.subject).toContain("site fora do ar");
    expect(res.draft!.body).toContain("um ponto");
    expect(res.draft!.body).toContain("SITE-FORA");
  });
});
