export type PipelineStage =
  | "prospect"
  | "audit_ready"
  | "outreach_sent"
  | "negotiation"
  | "won";

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
