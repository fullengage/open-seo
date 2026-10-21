import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler((): { configured: boolean } => {
    // Fullweb / ChatHook: o sistema funciona sem DataForSEO (dados de busca vêm do Search Console); nada a configurar.
    return { configured: true };
  });
