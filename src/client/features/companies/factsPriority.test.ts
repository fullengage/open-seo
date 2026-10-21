import { describe, it, expect } from "vitest";
import { generateMeasuredOutreach } from "./factsGenerator";
import type { PipelineLead, LeadFact } from "./types";

const f = (type: LeadFact["type"], phrase: string): LeadFact => ({
  id: type,
  type,
  category: "negative",
  source: type === "slow_lcp_mobile" ? "PageSpeed" : "Crawler",
  date: "2026-10-20T00:00:00Z",
  phrase,
});

describe("prioridade dos fatos no e-mail", () => {
  it("com 4 fatos, usa PageSpeed, meta description e H1, e deixa o ano antigo de fora", () => {
    const lead = {
      id: "1",
      cnpj: "09240082000116",
      razaoSocial: "LAGUNE COSMETICS",
      uf: "SP",
      stage: "prospect",
      createdAt: "2026-10-20T00:00:00Z",
      decisorNome: "Eugênio Romano",
      diagnostic: {
        crawledAt: "",
        websiteUrl: "",
        facts: [
          f("outdated_year", "ANO-2019"),
          f("generic_or_missing_h1", "H1-CONTATOS"),
          f("no_meta_description", "SEM-DESCRICAO"),
          f("slow_lcp_mobile", "LCP-5,6"),
        ],
      },
    } as PipelineLead;
    const res = generateMeasuredOutreach(lead);
    expect(res.success).toBe(true);
    const body = res.draft!.body;
    expect(body).toContain("LCP-5,6");
    expect(body).toContain("SEM-DESCRICAO");
    expect(body).toContain("H1-CONTATOS");
    expect(body).not.toContain("ANO-2019");
    expect(body.indexOf("LCP-5,6")).toBeLessThan(body.indexOf("SEM-DESCRICAO"));
  });
});
