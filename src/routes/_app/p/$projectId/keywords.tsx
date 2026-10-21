import { createFileRoute, redirect } from "@tanstack/react-router";
import { keywordsSearchSchema } from "@/types/schemas/keywords";

// Fullweb: sem DataForSEO. Palavras-chave = consultas reais do Google Search Console.
export const Route = createFileRoute("/_app/p/$projectId/keywords")({
  validateSearch: keywordsSearchSchema,
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/p/$projectId/search-performance",
      params,
      search: { tab: "queries" } as never,
    });
  },
});
