import { createServerFn } from "@tanstack/react-start";
import { CompanyService } from "@/server/features/companies/services/CompanyService";
import {
  companyLookupInputSchema,
  companySearchSegmentInputSchema,
} from "@/types/schemas/company";

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
