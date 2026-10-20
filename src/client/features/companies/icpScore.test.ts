import { describe, it, expect } from "vitest";
import { calcIcpScore } from "./icpScore";
import type { PipelineLead, LeadFact } from "./types";

const fact = (category: LeadFact["category"]): LeadFact => ({
  id: Math.random().toString(),
  type: "no_meta_description",
  category,
  source: "Crawler",
  date: "2026-10-20T00:00:00Z",
  phrase: "x",
});

const base = {
  id: "1",
  cnpj: "09240082000116",
  razaoSocial: "LAGUNE COSMETICS INDUSTRIA LTDA",
  uf: "SP",
  stage: "prospect",
  createdAt: "2026-10-20T00:00:00Z",
} as PipelineLead;

describe("calcIcpScore", () => {
  it("Lagune completa (ME, 39 mil, site, 3 problemas, Eugênio, e-mail da empresa) = 80", () => {
    const r = calcIcpScore({
      ...base,
      porte: "01",
      capitalSocial: 39000,
      website: "lagune.com.br",
      decisorNome: "Eugênio Romano",
      decisorEmail: "romano@lagune.com.br",
      diagnostic: {
        crawledAt: "",
        websiteUrl: "",
        facts: [fact("negative"), fact("negative"), fact("negative")],
      },
    });
    expect(r.score).toBe(80);
  });

  it("lead sem dados = 0 e pede diagnóstico", () => {
    const r = calcIcpScore(base);
    expect(r.score).toBe(0);
    expect(r.reasons.join(" ")).toContain("rode o diagnóstico");
  });

  it("e-mail de contabilidade não pontua", () => {
    expect(calcIcpScore({ ...base, email: "contato@contabilidadex.com.br" }).score).toBe(0);
  });

  it("recuperação judicial e não contatar zeram", () => {
    expect(
      calcIcpScore({ ...base, porte: "05", razaoSocial: "X LTDA EM RECUPERACAO JUDICIAL" }).score,
    ).toBe(0);
    expect(calcIcpScore({ ...base, porte: "05", naoContatar: true }).score).toBe(0);
  });

  it("porte por texto da BrasilAPI", () => {
    expect(calcIcpScore({ ...base, porte: "DEMAIS" }).score).toBe(25);
    expect(calcIcpScore({ ...base, porte: "Microempresa (ME)" }).score).toBe(10);
  });
});
