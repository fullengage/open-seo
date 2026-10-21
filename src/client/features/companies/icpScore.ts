import type { PipelineLead } from "./types";
import { checkEmailWarning, isRecuperacaoJudicialOuFalencia } from "./types";

export interface IcpScore {
  score: number;
  reasons: string[];
}

// Receita: 01 = ME, 03 = EPP, 05 = Demais. A BrasilAPI devolve o texto.
function porteKind(porte?: string | null): "demais" | "epp" | "me" | "outro" {
  const p = (porte || "").toUpperCase();
  if (p === "05" || p.includes("DEMAIS")) return "demais";
  if (p === "03" || p.includes("EPP") || p.includes("PEQUENO PORTE")) return "epp";
  if (p === "01" || p.includes("(ME)") || p === "ME" || p.includes("MICROEMPRESA")) return "me";
  return "outro";
}

/**
 * ICP Fullweb (0-100): porte 25 + capital 15 + site 15 + oportunidade medida 25
 * + decisor 10 + e-mail utilizável 10. Zero para recuperação judicial ou "não contatar".
 * ponytail: pesos fixos; ajustar quando houver taxa de resposta por faixa de score.
 */
export function calcIcpScore(lead: PipelineLead): IcpScore {
  if (lead.naoContatar) return { score: 0, reasons: ["Pediu para não ser contatado"] };
  if (isRecuperacaoJudicialOuFalencia(lead.razaoSocial)) {
    return { score: 0, reasons: ["Recuperação judicial / falência"] };
  }

  let score = 0;
  const reasons: string[] = [];
  const add = (pts: number, why: string) => {
    score += pts;
    reasons.push(`+${pts} ${why}`);
  };

  const porte = porteKind(lead.porte);
  if (porte === "demais") add(25, "porte Demais");
  else if (porte === "epp") add(20, "porte EPP");
  else if (porte === "me") add(10, "porte ME");
  else reasons.push("+0 porte desconhecido/MEI");

  const capital = lead.capitalSocial ?? 0;
  if (capital >= 100_000) add(15, "capital ≥ R$ 100 mil");
  else if (capital >= 30_000) add(10, "capital ≥ R$ 30 mil");
  else reasons.push("+0 capital baixo/desconhecido");

  if (lead.website) add(15, "tem site");
  else reasons.push("+0 sem site");

  if (!lead.diagnostic) {
    reasons.push("+0 oportunidade: rode o diagnóstico");
  } else {
    const neg = lead.diagnostic.facts.filter((f) => f.category === "negative").length;
    if (neg >= 3) add(25, `${neg} problemas medidos no site`);
    else if (neg === 2) add(15, "2 problemas medidos no site");
    else if (neg === 1) add(5, "1 problema medido no site");
    else reasons.push("+0 site sem problema medido");
  }

  if (lead.decisorNome) add(10, "decisor identificado");
  else reasons.push("+0 sem decisor");

  const email = lead.decisorEmail || lead.email;
  if (email && !checkEmailWarning(email, lead.website).isSuspicious) add(10, "e-mail utilizável");
  else reasons.push("+0 sem e-mail confiável");

  return { score, reasons };
}
