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
  - [x] tradução para pt_br

  Refiz o relatório nesse formato: QA-OpenSEO-funil-2026-10-19.md. Resumo de cada item:

#	Problema	Solução	Esforço
1	Abre sem login	Bloqueio no servidor com nível de acesso; /mcp só com token; senha em variável de ambiente, com hash; trocar a senha do Postgres	Grande (você está fazendo)
2	Pipeline só no navegador	Tabela pipeline_leads no Postgres que já existe, por organização, mais um botão “Importar leads deste navegador”	1 dia
3	Abordagem inventa dados	Frases só a partir de fatos medidos, com mínimo de 2, e a IA só reescreve (ver a SPEC)	1 dia
4	Decisor = primeiro sócio	Usar o decisor do card; se estiver vazio, você escolhe na lista de sócios	Horas
5	Card de exemplo inventado	Remover o card de exemplo; o Kanban começa vazio	Horas
6	Só 15 resultados	Paginação e total no topo	Horas
7	Sem filtro de cidade e porte	A base já tem municipio, porte e matriz: criar os 3 filtros, com atalho “Alto Tietê”	Horas
8	Filial no lugar da matriz	Filtro “só matriz”, ligado por padrão	Horas
9	Recuperação judicial sem aviso	Selo vermelho e fora do funil por padrão	Horas
10	Sem situação cadastral	Reimportar a base com a coluna de situação e mostrar só as ativas	1 dia
11	E-mail de contador ou setor errado	Alerta quando o domínio é de terceiro ou o endereço é contab/legal/financeiro	Horas
12	Assina “OpenSEO”	Marca e remetente vindos da configuração (Fullweb / Richard Wagner)	Horas
13	Sem descadastro	Linha fixa no e-mail e campo “não contatar” no lead	Horas
14	Diagnóstico sem link público	Auditoria, relatório e link /s/<token>, ligado depois do login; o card registra quando o lead abre	1 dia
15	Bloco de custo aparece para todos	Mover para uma página só do admin	Horas

Ordem sugerida:

Login (item 1).
Pipeline no banco (item 2).
Os ajustes rápidos: itens 5, 4, 12 e 13.
Abordagem com fatos medidos (item 3).
Filtros e alertas da lista: itens 7, 9, 11 e 6.
Link público do diagnóstico (item 14).
Reimportação da base (item 10).
Bloco de custo só para o admin (item 15).