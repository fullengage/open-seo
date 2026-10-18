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
          e.bairro, e.cep, e.tel, e.email
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

      res.end(JSON.stringify({
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
        socios: socios.map((s) => ({
          nome: String(s.nome),
          qualificacao: s.qualificacao ? String(s.qualificacao) : null,
          qualificacaoDescricao: s.qualif_desc ? String(s.qualif_desc) : null,
          entrada: s.entrada ? String(s.entrada) : null,
        })),
      }));
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
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);

    if (!cleanCnae || !uf) {
      res.statusCode = 400;
      res.end(JSON.stringify([]));
      return;
    }

    try {
      const stmt = db.prepare(`
        SELECT 
          e.cnpj, e.cnpj_basico, e.fantasia, emp.razao, emp.capital, emp.porte,
          e.cnae, c.descricao as cnae_desc, e.uf, m.nome as municipio_nome,
          e.bairro, e.cep, e.tel, e.email
        FROM estab e
        JOIN empresa emp ON emp.cnpj_basico = e.cnpj_basico
        LEFT JOIN cnae c ON c.codigo = e.cnae
        LEFT JOIN municipio m ON m.codigo = e.municipio
        WHERE (e.cnae = ? OR e.cnae LIKE ?) AND e.uf = ?
        LIMIT ?
      `);
      const rows = stmt.all(cleanCnae, `${cleanCnae}%`, uf, limit);
      res.end(JSON.stringify(rows.map((row) => ({
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
      }))));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
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
