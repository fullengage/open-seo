import postgres from "postgres";
import type { PipelineLead, PipelineStage } from "@/client/features/companies/types";

let cachedSql: postgres.Sql | null = null;

function getSql(): postgres.Sql | null {
  if (cachedSql) return cachedSql;
  const url = process.env.POSTGRES_DATABASE_URL;
  if (!url) return null;
  try {
    cachedSql = postgres(url, { max: 10, idle_timeout: 20 });
    return cachedSql;
  } catch (err) {
    console.error("PipelineLeadService: failed to connect to Postgres:", err);
    return null;
  }
}

export const PipelineLeadService = {
  async listLeads(organizationId = "default-org"): Promise<PipelineLead[]> {
    const sql = getSql();
    if (!sql) return [];

    try {
      const rows = await sql`
        SELECT * FROM pipeline_leads
        WHERE organization_id = ${organizationId}
        ORDER BY criado_em DESC
      `;

      return rows.map((r: any) => ({
        id: r.id,
        cnpj: r.cnpj,
        razaoSocial: r.empresa,
        nomeFantasia: r.empresa,
        uf: "SP",
        stage: r.etapa as PipelineStage,
        decisorNome: r.decisor_nome || null,
        decisorCargo: r.decisor_cargo || null,
        email: r.email || null,
        telefone: r.telefone || null,
        whatsapp: r.telefone || null,
        linkedin: r.linkedin || null,
        decisorLinkedin: r.linkedin || null,
        website: r.site || null,
        temperatura: r.temperatura || "warm",
        ticketEstimado: r.ticket ? Number(r.ticket) : null,
        proximoPasso: r.proxima_acao || null,
        dataProximoContato: r.proximo_contato || null,
        notes: r.notas || undefined,
        diagnostic: r.diagnostic
          ? typeof r.diagnostic === "string"
            ? JSON.parse(r.diagnostic)
            : r.diagnostic
          : null,
        draft: r.draft
          ? typeof r.draft === "string"
            ? JSON.parse(r.draft)
            : r.draft
          : null,
        naoContatar: Boolean(r.nao_contatar),
        createdAt: r.criado_em ? new Date(r.criado_em).toISOString() : new Date().toISOString(),
        isEnriched: Boolean(r.decisor_nome || r.site || r.ticket || r.diagnostic),
      }));
    } catch (err) {
      console.error("PipelineLeadService.listLeads error:", err);
      return [];
    }
  },

  async saveLead(lead: PipelineLead, organizationId = "default-org"): Promise<boolean> {
    const sql = getSql();
    if (!sql) return false;

    try {
      const diagJson = lead.diagnostic ? JSON.stringify(lead.diagnostic) : null;
      const draftJson = lead.draft ? JSON.stringify(lead.draft) : null;

      await sql`
        INSERT INTO pipeline_leads (
          id, organization_id, cnpj, empresa, etapa, decisor_nome, decisor_cargo,
          email, telefone, linkedin, site, temperatura, ticket, proxima_acao,
          proximo_contato, notas, diagnostic, draft, nao_contatar, criado_em, atualizado_em
        ) VALUES (
          ${lead.id},
          ${organizationId},
          ${lead.cnpj},
          ${lead.nomeFantasia || lead.razaoSocial},
          ${lead.stage},
          ${lead.decisorNome || null},
          ${lead.decisorCargo || null},
          ${lead.decisorEmail || lead.email || null},
          ${lead.whatsapp || lead.telefone || null},
          ${lead.decisorLinkedin || lead.linkedin || null},
          ${lead.website || null},
          ${lead.temperatura || "warm"},
          ${lead.ticketEstimado || null},
          ${lead.proximoPasso || null},
          ${lead.dataProximoContato || null},
          ${lead.notes || null},
          ${diagJson}::jsonb,
          ${draftJson}::jsonb,
          ${Boolean(lead.naoContatar)},
          ${lead.createdAt || new Date().toISOString()},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          cnpj = EXCLUDED.cnpj,
          empresa = EXCLUDED.empresa,
          etapa = EXCLUDED.etapa,
          decisor_nome = EXCLUDED.decisor_nome,
          decisor_cargo = EXCLUDED.decisor_cargo,
          email = EXCLUDED.email,
          telefone = EXCLUDED.telefone,
          linkedin = EXCLUDED.linkedin,
          site = EXCLUDED.site,
          temperatura = EXCLUDED.temperatura,
          ticket = EXCLUDED.ticket,
          proxima_acao = EXCLUDED.proxima_acao,
          proximo_contato = EXCLUDED.proximo_contato,
          notas = EXCLUDED.notas,
          diagnostic = EXCLUDED.diagnostic,
          draft = EXCLUDED.draft,
          nao_contatar = EXCLUDED.nao_contatar,
          atualizado_em = NOW();
      `;
      return true;
    } catch (err) {
      console.error("PipelineLeadService.saveLead error:", err);
      return false;
    }
  },

  async importLeads(leads: PipelineLead[], organizationId = "default-org"): Promise<number> {
    let count = 0;
    for (const lead of leads) {
      const ok = await this.saveLead(lead, organizationId);
      if (ok) count++;
    }
    return count;
  },

  async deleteLead(id: string, organizationId = "default-org"): Promise<boolean> {
    const sql = getSql();
    if (!sql) return false;

    try {
      await sql`
        DELETE FROM pipeline_leads
        WHERE id = ${id} AND organization_id = ${organizationId}
      `;
      return true;
    } catch (err) {
      console.error("PipelineLeadService.deleteLead error:", err);
      return false;
    }
  },

  async updateStage(
    id: string,
    stage: PipelineStage,
    organizationId = "default-org",
  ): Promise<boolean> {
    const sql = getSql();
    if (!sql) return false;

    try {
      await sql`
        UPDATE pipeline_leads
        SET etapa = ${stage}, atualizado_em = NOW()
        WHERE id = ${id} AND organization_id = ${organizationId}
      `;
      return true;
    } catch (err) {
      console.error("PipelineLeadService.updateStage error:", err);
      return false;
    }
  },

  async recordShareOpen(token: string, domain?: string | null): Promise<void> {
    const sql = getSql();
    if (!sql) return;

    try {
      const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const noteAppend = `\n[${nowStr}] 👁️ Diagnóstico visualizado pelo lead`;
      
      if (domain) {
        await sql`
          UPDATE pipeline_leads
          SET 
            notas = COALESCE(notas, '') || ${noteAppend},
            atualizado_em = NOW()
          WHERE site ILIKE ${'%' + domain + '%'}
             OR (diagnostic->>'shareUrl') ILIKE ${'%' + token + '%'}
        `;
      } else {
        await sql`
          UPDATE pipeline_leads
          SET 
            notas = COALESCE(notas, '') || ${noteAppend},
            atualizado_em = NOW()
          WHERE (diagnostic->>'shareUrl') ILIKE ${'%' + token + '%'}
        `;
      }
    } catch (err) {
      console.warn("PipelineLeadService.recordShareOpen warning:", err);
    }
  },
};

