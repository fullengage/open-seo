# 🚀 Plano Mestre: Plataforma SaaS B2B de SEO Local, Inteligência GTM & Enriquecimento (Anti-Clay)

## Fase 1 — Fundação & Arquitetura Multi-Tenant
> **🎯 Métrica de Sucesso da Fase 1:** **Tempo de Conexão GSC < 60s** (Onboarding autônomo e sem fricção técnica).
- [x] Corrigir país, idioma e domínio inicial (Brasil / pt-BR / 2076 como padrão nativo)
- [x] Configurar OAuth do Search Console (Credenciais A4IA SaaS integradas e ativas na VPS)
- [x] **Onboarding: Conectar o Search Console Sozinho** (Fluxo guiado em 1 clique no Dashboard e auto-seleção de propriedade compatível, permitindo que o cliente se conecte sozinho sem suporte técnico)
- [x] Revisar autenticação e isolamento entre clientes (Arquitetura multi-tenant validada: isolamento estrito por `OrganizationId` e `UserId` no middleware global)
- [x] Criar estados claros de erro, carregamento e ausência de dados (Fallbacks seguros aplicados em Dashboard e Search Performance com renderização estável)

## Fase 2 — Dados Gratuitos & Infraestrutura de Custo Zero (SEO Técnico)
> **🎯 Métrica de Sucesso da Fase 2:** **Custo Fixo de APIs = R$ 0,00/mês** (Operação 100% autônoma e gratuita).
- [x] Implementar crawler próprio e incremental (Rastreamento nativo sem DataForSEO, suporte a `304 Not Modified`, detecção de mudanças/delta entre auditorias e exibição de problemas corrigidos e novos)
- [x] Integrar PageSpeed e Lighthouse (Google PageSpeed Insights API v5 conectada com chave do projeto A4IA SaaS, cota de 25k req/dia gratuitas, conversão para `StoredLighthousePayload` e Card interativo de teste imediato)
- [x] Construir análise de oportunidades pelo Search Console (Detecção automática de *Striking Distance* posições 4-15, oportunidades de CTR e cálculo de ganho potencial de tráfego)
- [x] Criar cache compartilhado com isolamento por autorização (Isolamento por organização/usuário com TanStack Query cache em memória e SQLite; cache global para dados brutos de crawlers e PageSpeed para economizar requisições)

## Fase 3 — Experiência do Cliente & SEO Local Georreferenciado
> **🎯 Métrica de Sucesso da Fase 3:** **Potencial de Tráfego Identificado (+Cliques/Mês)** em termos Striking Distance.
- [x] Reorganizar a navegação orientada a resultados (Abas unificadas no Dashboard com Visão Geral, Plano de Ação, Palavras-chave e Backlinks)
- [x] Gerar plano de ação SEO com prioridades justificadas (Módulo `DashboardActionPlan` priorizando *Quick Wins* Top 3, melhorias de CTR e correções técnicas críticas)
- [x] Apresentar fonte e atualização de cada métrica (Métricas identificadas por fonte: GSC oficial, Google PageSpeed API, Crawler próprio)
- [x] **Implementar Configuração de Raio de Atuação Geográfica por Tenant** (Definição de cidade polo, UF e raio de atendimento de 15km a 100km no módulo de SEO Local)
- [x] **Geração de Landing Pages Programáticas Locais** (Módulo `LocalSeoProgrammatic` com geração de URLs, H1, Meta Title/Description e Schema.org LocalBusiness prontos com exportação CSV)

## Fase 4 — Inteligência de Mercado, Apify & Decisores (O "Anti-Clay")
> **🎯 Métrica de Sucesso da Fase 4:** **100% de Decisores Mapeados no QSA** para empresas consultadas.
- [x] **Integrar Atores de Prospecção & Dados da Receita Federal (QSA):**
  - Extração de dados cadastrais de 55M+ empresas via Daemon Local + BrasilAPI em tempo real.
  - Identificação dos sócios administradores (QSA) para direcionamento de abordagem comercial a decisores reais.
  - Prospecção em lote por código CNAE e Estado (UF).
- [x] **Motor de Antecipação e Diagnóstico Técnico de Mercado:**
  - Cruzamento de dados de localização e gargalos de velocidade (Core Web Vitals) e posicionamento orgânico.
  - Geração de teses de oportunidade e valor de mercado por segmento.

## Fase 5 — Roteador Multi-LLM & Contexto Dinâmico (Personalização)
> **🎯 Métrica de Sucesso da Fase 5:** **Tempo de Geração de Copy < 3s** (Abordagem executiva fria e WhatsApp prontos).
- [x] **Camada de Orquestração & Copywriting de Vendas (Anti-Clay):**
  - Módulo `OutreachCopyDialog` gerando automaticamente e-mails executivos frios personalizados para o sócio do QSA.
  - Geração de mensagens de alta conversão para WhatsApp/LinkedIn citando dados técnicos reais e oportunidades de tráfego.

## Fase 6 — Geração de Demanda, Relatórios Interativos & Kanban
> **🎯 Métrica de Sucesso da Fase 6:** **Pipeline Comercial Ativo** com 5 etapas de conversão e gestão de leads.
- [x] **Pipeline / Kanban Comercial de Leads:**
  - Módulo `LeadsKanban` com 5 etapas de vendas: Prospecção, Diagnóstico Pronto, Abordagem Enviada, Em Negociação e Contrato Fechado.
  - Adição direta de empresas consultadas no funil comercial com um clique e persistência local.

## Fase 7 — Escala, Monetização & Testes Automatizados
> **🎯 Métrica de Sucesso da Fase 7:** **Zero Custos Recorrentes de Terceiros & 100% Autonomia**.
- [x] Operação 100% autônoma e sem custos fixos abusivos de API (DataForSEO desativado, APIs Google oficiais gratuitas, banco local escalável)
- [x] Validar desempenho e segurança com testes automatizados (Testes vitest passando, `types:check` aprovado e verificação em produção)
- [x] **Sistema de Cotas e Monitor de Custo Zero:**
  - Módulo `QuotasCard` integrado monitorando os limites gratuitos da Google PageSpeed API (25k req/dia), Crawler ilimitado e base de CNPJ.