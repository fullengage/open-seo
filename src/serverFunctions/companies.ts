import { createServerFn } from "@tanstack/react-start";
import { CompanyService } from "@/server/features/companies/services/CompanyService";
import { LeadEnrichmentService } from "@/server/features/companies/services/LeadEnrichmentService";
import {
  companyLookupInputSchema,
  companySearchSegmentInputSchema,
} from "@/types/schemas/company";

import { z } from "zod";

export const getCompanyByCnpj = createServerFn({ method: "POST" })
  .validator(companyLookupInputSchema)
  .handler(async ({ data }) => {
    return CompanyService.getByCnpj(data.cnpj);
  });

export const searchCompaniesBySegment = createServerFn({ method: "POST" })
  .validator(companySearchSegmentInputSchema)
  .handler(async ({ data }) => {
    if (!data.cnae || !data.uf) return { items: [], total: 0 };
    return CompanyService.searchBySegment(data.cnae, data.uf, data.limit, data.offset, {
      municipio: data.municipio || data.city,
      porte: data.porte,
      matriz: data.matriz,
    });
  });

const inspectWebsiteInputSchema = z.object({
  url: z.string().min(3),
  companyName: z.string().min(1),
});

export const inspectWebsiteForFacts = createServerFn({ method: "POST" })
  .validator(inspectWebsiteInputSchema)
  .handler(async ({ data }) => {
    return CompanyService.inspectWebsiteFacts(data.url, data.companyName);
  });

// "Enriquecer tudo": Receita, site, tecnologias, redes, Registro.br, DNS, CrUX, diagnóstico, Google Maps (Apify) e IA
export const enrichLeadAll = createServerFn({ method: "POST" })
  .validator(z.object({ lead: z.any() }))
  .handler(async ({ data }) => LeadEnrichmentService.enrich(data.lead));
