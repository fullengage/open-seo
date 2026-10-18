import { createClient } from "@libsql/client";
import path from "node:path";
import { existsSync } from "node:fs";
import type { CompanyDetail } from "@/types/schemas/company";

let dbClient: ReturnType<typeof createClient> | null = null;

function getDbClient() {
  if (dbClient) return dbClient;

  const defaultPath =
    typeof process !== "undefined" && process.platform === "win32"
      ? path.resolve("open-seo-data/cnpj/cnpj-2026-10.db")
      : "/root/openseo-data/cnpj-2026-10.db";

  const dbPath =
    (typeof process !== "undefined" && process.env.CNPJ_DATABASE_PATH) ||
    defaultPath;

  try {
    const normalized = dbPath.replace(/\\/g, "/");
    dbClient = createClient({
      url: `file:${normalized}`,
    });
    return dbClient;
  } catch (err) {
    console.error("CompanyService.getDbClient error:", err);
    return null;
  }
}

export const CompanyService = {
  async getByCnpj(rawCnpj: string): Promise<CompanyDetail | null> {
    const cleanCnpj = rawCnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return null;

    const client = getDbClient();

    // 1. Tentar busca no banco SQLite local de alta velocidade
    if (client) {
      try {
        const estabRes = await client.execute({
          sql: `
            SELECT 
              e.cnpj,
              e.cnpj_basico,
              e.fantasia,
              emp.razao,
              emp.capital,
              emp.porte,
              e.cnae,
              c.descricao as cnae_desc,
              e.uf,
              m.nome as municipio_nome,
              e.bairro,
              e.cep,
              e.tel,
              e.email
            FROM estab e
            JOIN empresa emp ON emp.cnpj_basico = e.cnpj_basico
            LEFT JOIN cnae c ON c.codigo = e.cnae
            LEFT JOIN municipio m ON m.codigo = e.municipio
            WHERE e.cnpj = ?
            LIMIT 1
          `,
          args: [cleanCnpj],
        });

        if (estabRes.rows.length > 0) {
          const row = estabRes.rows[0];
          const cnpjBasico = String(row.cnpj_basico);

          const sociosRes = await client.execute({
            sql: `
              SELECT 
                s.nome, 
                s.qualificacao, 
                q.descricao as qualif_desc, 
                s.entrada 
              FROM socio s 
              LEFT JOIN qualificacao q ON q.codigo = s.qualificacao 
              WHERE s.cnpj_basico = ?
            `,
            args: [cnpjBasico],
          });

          return {
            cnpj: String(row.cnpj),
            cnpjBasico,
            razaoSocial: String(row.razao),
            nomeFantasia: row.fantasia ? String(row.fantasia) : null,
            capitalSocial: row.capital ? Number(row.capital) : null,
            porte: row.porte ? String(row.porte) : null,
            cnae: String(row.cnae),
            cnaeDescricao: row.cnae_desc ? String(row.cnae_desc) : null,
            uf: String(row.uf),
            municipio: row.municipio_nome ? String(row.municipio_nome) : null,
            bairro: row.bairro ? String(row.bairro) : null,
            cep: row.cep ? String(row.cep) : null,
            telefone: row.tel ? String(row.tel) : null,
            email: row.email ? String(row.email) : null,
            socios: sociosRes.rows.map((s) => ({
              nome: String(s.nome),
              qualificacao: s.qualificacao ? String(s.qualificacao) : null,
              qualificacaoDescricao: s.qualif_desc ? String(s.qualif_desc) : null,
              entrada: s.entrada ? String(s.entrada) : null,
            })),
          };
        }
      } catch (err) {
        console.warn("CompanyService.localDb error, falling back to BrasilAPI:", err);
      }
    }

    // 2. Fallback online em tempo real via BrasilAPI
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: { "User-Agent": "OpenSEO-Fullengage" },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as any;

      return {
        cnpj: cleanCnpj,
        cnpjBasico: cleanCnpj.slice(0, 8),
        razaoSocial: data.razao_social || "",
        nomeFantasia: data.nome_fantasia || null,
        capitalSocial: data.capital_social || null,
        porte: data.porte || null,
        cnae: String(data.cnae_fiscal || ""),
        cnaeDescricao: data.cnae_fiscal_descricao || null,
        uf: data.uf || "",
        municipio: data.municipio || null,
        bairro: data.bairro || null,
        cep: data.cep || null,
        telefone: data.ddd_telefone_1 || null,
        email: data.email || null,
        socios: Array.isArray(data.qsa)
          ? data.qsa.map((s: any) => ({
              nome: s.nome_socio || "",
              qualificacao: s.codigo_qualificacao_socio ? String(s.codigo_qualificacao_socio) : null,
              qualificacaoDescricao: s.qualificacao_socio || null,
              entrada: s.data_entrada_sociedade || null,
            }))
          : [],
      };
    } catch (err) {
      console.error("CompanyService.brasilApi error:", err);
      return null;
    }
  },

  async searchBySegment(cnae: string, uf: string, limit = 20): Promise<CompanyDetail[]> {
    const cleanCnae = cnae.replace(/\D/g, "");
    if (!cleanCnae) return [];

    const client = getDbClient();
    if (!client) return [];

    try {
      const q = await client.execute({
        sql: `
          SELECT 
            e.cnpj,
            e.cnpj_basico,
            e.fantasia,
            emp.razao,
            emp.capital,
            emp.porte,
            e.cnae,
            c.descricao as cnae_desc,
            e.uf,
            m.nome as municipio_nome,
            e.bairro,
            e.cep,
            e.tel,
            e.email
          FROM estab e
          JOIN empresa emp ON emp.cnpj_basico = e.cnpj_basico
          LEFT JOIN cnae c ON c.codigo = e.cnae
          LEFT JOIN municipio m ON m.codigo = e.municipio
          WHERE (e.cnae = ? OR e.cnae LIKE ?) AND e.uf = ?
          LIMIT ?
        `,
        args: [cleanCnae, `${cleanCnae}%`, uf.toUpperCase(), limit],
      });

      return q.rows.map((row) => ({
        cnpj: String(row.cnpj),
        cnpjBasico: String(row.cnpj_basico),
        razaoSocial: String(row.razao),
        nomeFantasia: row.fantasia ? String(row.fantasia) : null,
        capitalSocial: row.capital ? Number(row.capital) : null,
        porte: row.porte ? String(row.porte) : null,
        cnae: String(row.cnae),
        cnaeDescricao: row.cnae_desc ? String(row.cnae_desc) : null,
        uf: String(row.uf),
        municipio: row.municipio_nome ? String(row.municipio_nome) : null,
        bairro: row.bairro ? String(row.bairro) : null,
        cep: row.cep ? String(row.cep) : null,
        telefone: row.tel ? String(row.tel) : null,
        email: row.email ? String(row.email) : null,
        socios: [],
      }));
    } catch (err) {
      console.error("CompanyService.searchBySegment error:", err);
      return [];
    }
  },
};
