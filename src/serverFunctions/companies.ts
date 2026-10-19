import { createServerFn } from "@tanstack/react-start";
import { CompanyService } from "@/server/features/companies/services/CompanyService";
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
    if (!data.cnae || !data.uf) return [];
    return CompanyService.searchBySegment(data.cnae, data.uf, data.limit);
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

