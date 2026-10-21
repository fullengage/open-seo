import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(() => {
    // Fullweb: o sistema funciona sem DataForSEO (dados de busca vêm do Search Console); nada a configurar.
    const configured = true as boolean;
    return { configured };
  });
