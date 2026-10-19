import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import {
  buildStoredPageSpeedPayload,
  type GooglePageSpeedResponse,
} from "@/server/lib/pageSpeedPayload";

const onDemandPageSpeedSchema = z.object({
  url: z.string().url(),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
});

export const runOnDemandPageSpeed = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(onDemandPageSpeedSchema)
  .handler(async ({ data }) => {
    const apiKey =
      process.env.GOOGLE_PAGESPEED_API_KEY ||
      process.env.PAGESPEED_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error(
        "PageSpeed API Key não configurada. Configure GOOGLE_PAGESPEED_API_KEY no servidor.",
      );
    }

    const apiUrl = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    apiUrl.searchParams.set("url", data.url);
    apiUrl.searchParams.set("strategy", data.strategy.toUpperCase());
    apiUrl.searchParams.append("category", "PERFORMANCE");
    apiUrl.searchParams.append("category", "SEO");
    apiUrl.searchParams.append("category", "ACCESSIBILITY");
    apiUrl.searchParams.append("category", "BEST_PRACTICES");
    apiUrl.searchParams.set("key", apiKey);

    const response = await fetch(apiUrl.toString(), {
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = "Falha ao consultar Google PageSpeed Insights.";
      try {
        const errJson = JSON.parse(errText) as {
          error?: { message?: string };
        };
        if (errJson.error?.message) {
          msg = errJson.error.message;
        }
      } catch {
        // use fallback
      }
      throw new Error(msg);
    }

    const json = (await response.json()) as GooglePageSpeedResponse;
    const stored = buildStoredPageSpeedPayload({
      url: data.url,
      strategy: data.strategy,
      response: json,
    });

    return {
      scores: stored.scores,
      metrics: stored.metrics,
      issues: stored.issues.slice(0, 15),
      metadata: stored.metadata,
    };
  });
