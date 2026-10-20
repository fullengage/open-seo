import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import path from "node:path";

const defaultPath =
  process.platform === "win32"
    ? path.resolve("open-seo-data/cnpj/cnpj-2026-10.db")
    : "/root/openseo-data/cnpj-2026-10.db";

const dbPath = process.env.CNPJ_DATABASE_PATH || defaultPath;

let db = null;
if (existsSync(dbPath)) {
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
    console.log("[cnpj-daemon] Opened SQLite DB at:", dbPath);
  } catch (err) {
    console.error("[cnpj-daemon] Failed to open DB:", err);
  }
} else {
  console.warn("[cnpj-daemon] DB file not found at:", dbPath);
}

// Situação cadastral (Receita): base separada, gerada por import_situacao.py
const SITUACAO = { "01": "Nula", "02": "Ativa", "03": "Suspensa", "04": "Inapta", "08": "Baixada" };
const sitPath =
  process.env.CNPJ_SITUACAO_PATH || dbPath.replace(/cnpj-(\d{4}-\d{2})\.db$/, "situacao-$1.db");
let hasSituacao = false;
// Anexa na primeira consulta em que o arquivo existir (a importação pode terminar com o serviço no ar)
function ensureSituacao() {
  if (hasSituacao || !db || !existsSync(sitPath)) return hasSituacao;
  try {
    db.exec(`ATTACH DATABASE '${sitPath}' AS s`);
    hasSituacao = true;
    console.log("[cnpj-daemon] Situação cadastral anexada:", sitPath);
  } catch (err) {
    console.error("[cnpj-daemon] Falha ao anexar situação:", err);
  }
  return hasSituacao;
}
ensureSituacao();
function situacaoDe(cnpj) {
  if (!ensureSituacao()) return { situacaoCadastral: null, dataSituacao: null };
  const r = db.prepare("SELECT sit, data FROM s.situacao WHERE cnpj = ?").get(String(cnpj));
  if (!r) return { situacaoCadastral: null, dataSituacao: null };
  const d = String(r.data || "");
  return {
    situacaoCadastral: SITUACAO[r.sit] || String(r.sit),
    dataSituacao: d.length === 8 ? `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}` : null,
  };
}

const ALTO_TIETE_CODES = [
  "6713", // Mogi das Cruzes
  "7151", // Suzano
  "6563", // Itaquaquecetuba
  "6897", // Poá
  "6415", // Ferraz de Vasconcelos
  "6177", // Arujá
  "7037", // Santa Isabel
  "6467", // Guararema
  "6231", // Biritiba-Mirim
  "7001", // Salesópolis
];

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

  if (!db) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "Database not available" }));
    return;
  }

  if (url.pathname === "/cnpj") {
    const rawCnpj = url.searchParams.get("cnpj") || "";
    const cleanCnpj = rawCnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid CNPJ" }));
      return;
    }

    try {
      const estabStmt = db.prepare(`
        SELECT 
          e.cnpj, e.cnpj_basico, e.fantasia, emp.razao, emp.capital, emp.porte,
          e.cnae, c.descricao as cnae_desc, e.uf, m.nome as municipio_nome,
          e.bairro, e.cep, e.tel, e.email, e.matriz
        FROM estab e
        JOIN empresa emp ON emp.cnpj_basico = e.cnpj_basico
        LEFT JOIN cnae c ON c.codigo = e.cnae
        LEFT JOIN municipio m ON m.codigo = e.municipio
        WHERE e.cnpj = ?
        LIMIT 1
      `);
      const row = estabStmt.get(cleanCnpj);
      if (!row) {
        res.statusCode = 404;
        res.end(JSON.stringify(null));
        return;
      }

      const sociosStmt = db.prepare(`
        SELECT s.nome, s.qualificacao, q.descricao as qualif_desc, s.entrada 
        FROM socio s 
        LEFT JOIN qualificacao q ON q.codigo = s.qualificacao 
        WHERE s.cnpj_basico = ?
      `);
      const socios = sociosStmt.all(String(row.cnpj_basico));

      // Filiais caso seja matriz
      let filiais = [];
      if (row.matriz === 1) {
        try {
          const filiaisStmt = db.prepare(`
            SELECT e.cnpj, e.fantasia, m.nome as municipio_nome, e.uf
            FROM estab e
            LEFT JOIN municipio m ON m.codigo = e.municipio
            WHERE e.cnpj_basico = ? AND e.matriz = 2
            LIMIT 10
          `);
          filiais = filiaisStmt.all(String(row.cnpj_basico)).map((f) => ({
            cnpj: String(f.cnpj),
            nomeFantasia: f.fantasia ? String(f.fantasia) : null,
            municipio: f.municipio_nome ? String(f.municipio_nome) : null,
            uf: String(f.uf),
          }));
        } catch {
          // ignore
        }
      }

      res.end(
        JSON.stringify({
          cnpj: String(row.cnpj),
          cnpjBasico: String(row.cnpj_basico),
          razaoSocial: String(row.razao),
          nomeFantasia: row.fantasia ? String(row.fantasia) : null,
          capitalSocial: row.capital ? Number(row.capital) : null,
          porte: row.porte ? String(row.porte) : null,
          matriz: row.matriz === 1,
          cnae: String(row.cnae),
          cnaeDescricao: row.cnae_desc ? String(row.cnae_desc) : null,
          uf: String(row.uf),
          municipio: row.municipio_nome ? String(row.municipio_nome) : null,
          bairro: row.bairro ? String(row.bairro) : null,
          cep: row.cep ? String(row.cep) : null,
          telefone: row.tel ? String(row.tel) : null,
          email: row.email ? String(row.email) : null,
          ...situacaoDe(row.cnpj),
          filiais,
          socios: socios.map((s) => ({
            nome: String(s.nome),
            qualificacao: s.qualificacao ? String(s.qualificacao) : null,
            qualificacaoDescricao: s.qualif_desc ? String(s.qualif_desc) : null,
            entrada: s.entrada ? String(s.entrada) : null,
          })),
        })
      );
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (url.pathname === "/segment") {
    const rawCnae = url.searchParams.get("cnae") || "";
    const cleanCnae = rawCnae.replace(/\D/g, "");
    const uf = (url.searchParams.get("uf") || "").toUpperCase();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
    const municipioParam = (url.searchParams.get("municipio") || "").trim();
    const porteParam = (url.searchParams.get("porte") || "").trim();
    const soMatriz = url.searchParams.get("matriz") !== "false" && url.searchParams.get("matriz") !== "0";
    // ponytail: a base principal já só tem ativas (importada com situação 02); a situação serve à ficha

    if (!cleanCnae || !uf) {
      res.statusCode = 400;
      res.end(JSON.stringify({ items: [], total: 0 }));
      return;
    }

    try {
      const whereClauses = ["e.cnae = ?", "e.uf = ?"];
      const params = [cleanCnae, uf];

      if (soMatriz) {
        whereClauses.push("e.matriz = 1");
      }

      if (porteParam) {
        whereClauses.push("emp.porte = ?");
        params.push(porteParam);
      }

      if (municipioParam) {
        if (municipioParam.toUpperCase() === "ALTO_TIETE") {
          whereClauses.push(`e.municipio IN (${ALTO_TIETE_CODES.map((c) => `'${c}'`).join(",")})`);
        } else if (/^\d+$/.test(municipioParam)) {
          whereClauses.push("e.municipio = ?");
          params.push(municipioParam);
        } else {
          // Resolve municipality code by name
          const munRow = db
            .prepare("SELECT codigo FROM municipio WHERE nome LIKE ? LIMIT 1")
            .get(`%${municipioParam.toUpperCase()}%`);
          if (munRow && munRow.codigo) {
            whereClauses.push("e.municipio = ?");
            params.push(munRow.codigo);
          }
        }
      }

      const whereSql = whereClauses.join(" AND ");

      // 1. Total count
      const countStmt = db.prepare(`
        SELECT count(*) as total
        FROM estab e
        JOIN empresa emp ON emp.cnpj_basico = e.cnpj_basico
        WHERE ${whereSql}
      `);
      const totalRow = countStmt.get(...params);
      const total = totalRow ? Number(totalRow.total) : 0;

      // 2. Items query with LIMIT & OFFSET
      const itemsStmt = db.prepare(`
        SELECT 
          e.cnpj, e.cnpj_basico, e.fantasia, emp.razao, emp.capital, emp.porte,
          e.cnae, c.descricao as cnae_desc, e.uf, m.nome as municipio_nome,
          e.bairro, e.cep, e.tel, e.email, e.matriz
        FROM estab e
        JOIN empresa emp ON emp.cnpj_basico = e.cnpj_basico
        LEFT JOIN cnae c ON c.codigo = e.cnae
        LEFT JOIN municipio m ON m.codigo = e.municipio
        WHERE ${whereSql}
        ORDER BY emp.capital DESC
        LIMIT ? OFFSET ?
      `);
      const rows = itemsStmt.all(...params, limit, offset);

      const items = rows.map((row) => ({
        cnpj: String(row.cnpj),
        cnpjBasico: String(row.cnpj_basico),
        razaoSocial: String(row.razao),
        nomeFantasia: row.fantasia ? String(row.fantasia) : null,
        capitalSocial: row.capital ? Number(row.capital) : null,
        porte: row.porte ? String(row.porte) : null,
        matriz: row.matriz === 1,
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

      res.end(JSON.stringify({ items, total }));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message, items: [], total: 0 }));
    }
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = Number(process.env.CNPJ_DAEMON_PORT || 3005);
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[cnpj-daemon] Listening on http://127.0.0.1:${PORT}`);
});
