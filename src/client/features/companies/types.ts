export type PipelineStage =
  | "prospect"
  | "audit_ready"
  | "outreach_sent"
  | "negotiation"
  | "won";

export type LeadTemperature = "cold" | "warm" | "hot";

export interface LeadFact {
  id: string;
  type:
    | "no_meta_description"
    | "generic_or_missing_h1"
    | "outdated_year"
    | "slow_lcp_mobile"
    | "no_structured_data"
    | "not_in_top_10"
    | "high_google_rating";
  category: "negative" | "positive" | "diagnostic_only";
  source: "Crawler" | "PageSpeed" | "SERP (Apify)" | "Perfil Google (Apify)";
  date: string;
  value?: string | number | null;
  phrase: string;
}

export interface LeadDiagnostic {
  crawledAt: string;
  websiteUrl: string;
  facts: LeadFact[];
}

export interface OutreachDraft {
  id: string;
  status: "awaiting_approval" | "approved";
  subject: string;
  body: string;
  decisorNome: string;
  factsUsed: LeadFact[];
  generatedAt: string;
  approvedAt?: string;
  aiEnhanced?: boolean;
}

export interface PipelineLead {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  uf: string;
  municipio?: string | null;
  telefone?: string | null;
  email?: string | null;
  cnae?: string;
  cnaeDescricao?: string | null;
  segmento?: string | null;
  socioPrincipal?: string | null;
  stage: PipelineStage;
  createdAt: string;
  notes?: string;

  // Campos de Enriquecimento B2B (360° / CRM & Prospecção):
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  whatsapp?: string | null;
  decisorNome?: string | null;
  decisorCargo?: string | null;
  decisorEmail?: string | null;
  decisorLinkedin?: string | null;
  capitalSocial?: number | null;
  porte?: string | null;
  bairro?: string | null;
  cep?: string | null;
  endereco?: string | null;
  ticketEstimado?: number | null;
  temperatura?: LeadTemperature;
  proximoPasso?: string | null;
  dataProximoContato?: string | null;
  socios?: { nome: string; qualificacaoDescricao?: string | null }[];
  isEnriched?: boolean;

  // Diagnóstico de fatos medidos e Abordagem
  diagnostic?: LeadDiagnostic | null;
  draft?: OutreachDraft | null;
  naoContatar?: boolean;
}

export interface ProgrammaticPage {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  cidade: string;
  bairro?: string;
  servico: string;
  schemaJson: string;
}

export function isRecuperacaoJudicialOuFalencia(razaoSocial?: string | null): boolean {
  if (!razaoSocial) return false;
  const upper = razaoSocial.toUpperCase();
  return (
    upper.includes("RECUPERACAO JUDICIAL") ||
    upper.includes("RECUPERAÇÃO JUDICIAL") ||
    upper.includes("FALIDO") ||
    upper.includes("FALENCIA") ||
    upper.includes("FALÊNCIA") ||
    upper.includes("EM LIQUIDACAO") ||
    upper.includes("EM LIQUIDAÇÃO")
  );
}

export function checkEmailWarning(
  email?: string | null,
  website?: string | null
): { isSuspicious: boolean; reason?: string } {
  if (!email) return { isSuspicious: false };
  const lower = email.toLowerCase().trim();

  // (b) Palavras que indicam contador, advogado ou setor corporativo errado
  const suspiciousKeywords = [
    "contab",
    "contabil",
    "contabilidade",
    "advog",
    "advocacia",
    "advogado",
    "legal@",
    "juridico",
    "fiscal",
    "financeiro",
    "cobranca",
    "rh@",
    "dp@",
    "dp.",
    "contato@heroncont",
  ];

  for (const kw of suspiciousKeywords) {
    if (lower.includes(kw)) {
      return {
        isSuspicious: true,
        reason: "provável terceiro/setor errado — confirmar",
      };
    }
  }

  // (a) Se tiver website e o domínio não for o mesmo e não for webmail genérico
  if (website) {
    try {
      const cleanUrl = website.startsWith("http") ? website : `https://${website}`;
      const siteHost = new URL(cleanUrl).hostname.replace(/^www\./, "").toLowerCase();
      const parts = lower.split("@");
      if (parts.length === 2) {
        const emailDomain = parts[1];
        const commonWebmails = [
          "gmail.com",
          "hotmail.com",
          "outlook.com",
          "yahoo.com",
          "uol.com.br",
          "bol.com.br",
          "terra.com.br",
          "icloud.com",
        ];
        if (
          !commonWebmails.includes(emailDomain) &&
          emailDomain !== siteHost &&
          !siteHost.includes(emailDomain) &&
          !emailDomain.includes(siteHost)
        ) {
          return {
            isSuspicious: true,
            reason: "provável terceiro/setor errado — confirmar",
          };
        }
      }
    } catch {
      // ignore URL parsing
    }
  }

  return { isSuspicious: false };
}
