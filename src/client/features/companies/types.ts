export type PipelineStage =
  | "prospect"
  | "audit_ready"
  | "outreach_sent"
  | "negotiation"
  | "won";

export type LeadTemperature = "cold" | "warm" | "hot";

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
