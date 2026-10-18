import type { CompanyDetail } from "@/types/schemas/company";

const DAEMON_URL = process.env.CNPJ_DAEMON_URL || "http://127.0.0.1:3005";

export const CompanyService = {
  async getByCnpj(rawCnpj: string): Promise<CompanyDetail | null> {
    const cleanCnpj = rawCnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return null;

    // 1. Tentar busca no daemon local SQLite de alta velocidade
    try {
      const res = await fetch(`${DAEMON_URL}/cnpj?cnpj=${cleanCnpj}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data && data.cnpj) {
          return data as CompanyDetail;
        }
      }
    } catch {
      // Ignora falha do daemon e faz fallback transparente para BrasilAPI
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

    try {
      const res = await fetch(
        `${DAEMON_URL}/segment?cnae=${encodeURIComponent(cleanCnae)}&uf=${encodeURIComponent(uf.toUpperCase())}&limit=${limit}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) {
        return (await res.json()) as CompanyDetail[];
      }
    } catch (err) {
      console.error("CompanyService.searchBySegment error:", err);
    }
    return [];
  },
};
