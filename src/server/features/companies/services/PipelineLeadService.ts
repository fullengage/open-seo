import postgres from "postgres";
import type { PipelineLead, PipelineStage } from "@/client/features/companies/types";

/**
 * Uma conexão por chamada. O runtime (workerd) não deixa reaproveitar o socket
 * aberto em outra requisição ("Cannot perform I/O on behalf of a different
 * request"), então um cliente em cache só funcionava na primeira gravação.
 * ponytail: conexão nova por chamada; trocar por Hyperdrive/pool se o volume crescer.
 */
async function withSql<T>(label: string, fallback: T, fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const url = process.env.POSTGRES_DATABASE_URL;
  if (!url) return fallback;
  const sql = postgres(url, { max: 1, idle_timeout: 5 });
  try {
    return await fn(sql);
  } catch (err) {
    console.error(`PipelineLeadService.${label} error:`, err);
    return fallback;
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

const parseJson = (v: unknown) => (v ? (typeof v === "string" ? JSON.parse(v) : v) : null);

export const PipelineLeadService = {
  async listLeads(organizationId = "default-org"): Promise<PipelineLead[]> {
    return withSql("listLeads", [] as PipelineLead[], async (sql) => {
      const rows = await sql`
        SELECT * FROM pipeline_leads
        WHERE organization_id = ${organizationId}
        ORDER BY criado_em DESC
      `;

      return rows.map((r: any) => {
        // Lead completo (porte, capital, UF, cidade, CNAE, sócios...); as colunas valem por cima
        const dados = (parseJson(r.dados) || {}) as Partial<PipelineLead>;
        return {
          ...dados,
          id: r.id,
          cnpj: r.cnpj,
          razaoSocial: dados.razaoSocial || r.empresa,
          nomeFantasia: dados.nomeFantasia ?? r.empresa,
          uf: dados.uf || "",
          stage: r.etapa as PipelineStage,
          decisorNome: r.decisor_nome || null,
          decisorCargo: r.decisor_cargo || null,
          email: dados.email ?? r.email ?? null,
          decisorEmail: dados.decisorEmail ?? null,
          telefone: r.telefone || null,
          whatsapp: dados.whatsapp ?? r.telefone ?? null,
          linkedin: r.linkedin || null,
          decisorLinkedin: dados.decisorLinkedin ?? r.linkedin ?? null,
          website: r.site || null,
          temperatura: r.temperatura || "warm",
          ticketEstimado: r.ticket ? Number(r.ticket) : null,
          proximoPasso: r.proxima_acao || null,
          dataProximoContato: r.proximo_contato || null,
          notes: r.notas || undefined,
          diagnostic: parseJson(r.diagnostic),
          draft: parseJson(r.draft),
          naoContatar: Boolean(r.nao_contatar),
          createdAt: r.criado_em ? new Date(r.criado_em).toISOString() : new Date().toISOString(),
          isEnriched: Boolean(r.decisor_nome || r.site || r.ticket || r.diagnostic),
        } as PipelineLead;
      });
    });
  },

  async saveLead(lead: PipelineLead, organizationId = "default-org"): Promise<boolean> {
    return withSql("saveLead", false, async (sql) => {
      const diagJson = lead.diagnostic ? JSON.stringify(lead.diagnostic) : null;
      const draftJson = lead.draft ? JSON.stringify(lead.draft) : null;

      await sql`
        INSERT INTO pipeline_leads (
          id, organization_id, cnpj, empresa, etapa, decisor_nome, decisor_cargo,
          email, telefone, linkedin, site, temperatura, ticket, proxima_acao,
          proximo_contato, notas, diagnostic, draft, nao_contatar, dados, criado_em, atualizado_em
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
          ${JSON.stringify(lead)}::jsonb,
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
          dados = EXCLUDED.dados,
          atualizado_em = NOW();
      `;
      return true;
    });
  },

  async importLeads(leads: PipelineLead[], organizationId = "default-org"): Promise<number> {
    const existing = await this.listLeads(organizationId);
    const ids = new Set(existing.map((l) => l.id));
    const raiz = (c?: string | null) => (c || "").replace(/\D/g, "").slice(0, 8);
    const cnpjs = new Set(existing.map((l) => raiz(l.cnpj)).filter(Boolean));
    let count = 0;
    for (const lead of leads) {
      // ponytail: o banco ganha sempre; cópia do navegador só entra se o lead não existir
      if (ids.has(lead.id) || (raiz(lead.cnpj) && cnpjs.has(raiz(lead.cnpj)))) continue;
      const ok = await this.saveLead(lead, organizationId);
      if (ok) {
        count++;
        ids.add(lead.id);
        if (raiz(lead.cnpj)) cnpjs.add(raiz(lead.cnpj));
      }
    }
    return count;
  },

  async deleteLead(id: string, organizationId = "default-org"): Promise<boolean> {
    return withSql("deleteLead", false, async (sql) => {
      await sql`
        DELETE FROM pipeline_leads
        WHERE id = ${id} AND organization_id = ${organizationId}
      `;
      return true;
    });
  },

  async updateStage(
    id: string,
    stage: PipelineStage,
    organizationId = "default-org",
  ): Promise<boolean> {
    return withSql("updateStage", false, async (sql) => {
      await sql`
        UPDATE pipeline_leads
        SET etapa = ${stage}, atualizado_em = NOW(),
          dados = to_jsonb((COALESCE((dados #>> '{}')::jsonb, '{}'::jsonb)
            || jsonb_build_object('stageChangedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))::text)
        WHERE id = ${id} AND organization_id = ${organizationId}
      `;
      return true;
    });
  },

  async recordShareOpen(token: string, domain?: string | null): Promise<void> {
    await withSql("recordShareOpen", undefined, async (sql) => {
      const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const noteAppend = `\n[${nowStr}] 👁️ Diagnóstico visualizado pelo lead`;

      if (domain) {
        await sql`
          UPDATE pipeline_leads
          SET
            notas = COALESCE(notas, '') || ${noteAppend},
            atualizado_em = NOW()
          WHERE site ILIKE ${"%" + domain + "%"}
             OR (diagnostic->>'shareUrl') ILIKE ${"%" + token + "%"}
        `;
      } else {
        await sql`
          UPDATE pipeline_leads
          SET
            notas = COALESCE(notas, '') || ${noteAppend},
            atualizado_em = NOW()
          WHERE (diagnostic->>'shareUrl') ILIKE ${"%" + token + "%"}
        `;
      }
    });
  },
};
