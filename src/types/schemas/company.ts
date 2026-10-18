import { z } from "zod";

export const companyLookupInputSchema = z.object({
  cnpj: z.string().min(14).max(18),
});

export const companySearchSegmentInputSchema = z.object({
  cnae: z.string().optional(),
  uf: z.string().length(2).optional(),
  city: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const companySocioSchema = z.object({
  nome: z.string(),
  qualificacao: z.string().nullable().optional(),
  qualificacaoDescricao: z.string().nullable().optional(),
  entrada: z.string().nullable().optional(),
});

export const companyDetailSchema = z.object({
  cnpj: z.string(),
  cnpjBasico: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable().optional(),
  capitalSocial: z.number().nullable().optional(),
  porte: z.string().nullable().optional(),
  cnae: z.string(),
  cnaeDescricao: z.string().nullable().optional(),
  uf: z.string(),
  municipio: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  socios: z.array(companySocioSchema).default([]),
});

export type CompanyDetail = z.infer<typeof companyDetailSchema>;
export type CompanySocio = z.infer<typeof companySocioSchema>;
