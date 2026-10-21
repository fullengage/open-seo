import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler((): { configured: boolean } => {
    // Modo autônomo ativo: APIs gratuitas do Google e base local dispensam DataForSEO
    return { configured: true };
  });
