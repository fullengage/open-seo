CREATE TABLE IF NOT EXISTS pipeline_leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'default-org',
  cnpj TEXT NOT NULL,
  empresa TEXT NOT NULL,
  etapa TEXT NOT NULL DEFAULT 'prospect',
  decisor_nome TEXT,
  decisor_cargo TEXT,
  email TEXT,
  telefone TEXT,
  linkedin TEXT,
  site TEXT,
  temperatura TEXT DEFAULT 'warm',
  ticket NUMERIC,
  proxima_acao TEXT,
  proximo_contato TEXT,
  notas TEXT,
  diagnostic JSONB,
  draft JSONB,
  nao_contatar BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_org ON pipeline_leads (organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_cnpj ON pipeline_leads (cnpj);
