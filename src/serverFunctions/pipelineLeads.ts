import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PipelineLeadService } from "@/server/features/companies/services/PipelineLeadService";
import type { PipelineLead } from "@/client/features/companies/types";

export const getPipelineLeads = createServerFn({ method: "GET" }).handler(
  async () => {
    return PipelineLeadService.listLeads("default-org");
  },
);

const savePipelineLeadInputSchema = z.object({
  lead: z.any(),
});

export const savePipelineLead = createServerFn({ method: "POST" })
  .validator(savePipelineLeadInputSchema)
  .handler(async ({ data }) => {
    const ok = await PipelineLeadService.saveLead(data.lead as PipelineLead, "default-org");
    return { success: ok };
  });

const importPipelineLeadsInputSchema = z.object({
  leads: z.array(z.any()),
});

export const importPipelineLeads = createServerFn({ method: "POST" })
  .validator(importPipelineLeadsInputSchema)
  .handler(async ({ data }) => {
    const importedCount = await PipelineLeadService.importLeads(
      data.leads as PipelineLead[],
      "default-org",
    );
    return { success: true, count: importedCount };
  });

const deletePipelineLeadInputSchema = z.object({
  id: z.string(),
});

export const deletePipelineLead = createServerFn({ method: "POST" })
  .validator(deletePipelineLeadInputSchema)
  .handler(async ({ data }) => {
    const ok = await PipelineLeadService.deleteLead(data.id, "default-org");
    return { success: ok };
  });

const updatePipelineLeadStageInputSchema = z.object({
  id: z.string(),
  stage: z.enum(["prospect", "audit_ready", "outreach_sent", "negotiation", "won", "lost"]),
});

export const updatePipelineLeadStage = createServerFn({ method: "POST" })
  .validator(updatePipelineLeadStageInputSchema)
  .handler(async ({ data }) => {
    const ok = await PipelineLeadService.updateStage(data.id, data.stage, "default-org");
    return { success: ok };
  });
