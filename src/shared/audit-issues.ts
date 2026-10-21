/**
 * Registry of site-audit issue types.
 *
 * Shared between the server (issue engine, MCP tools) and the client
 * (issues UI, CSV export). Each issue row in `audit_issues` references one
 * of these types by id.
 */

export type IssueSeverity = "critical" | "warning" | "info";

interface AuditIssueDescriptor {
  severity: IssueSeverity;
  title: string;
  explanation: string;
  howToFix: string;
}

export const AUDIT_ISSUE_TYPES = {
  "blocked-page": {
    severity: "critical",
    title: "Crawler was blocked",
    explanation:
      "The site returned a bot challenge or access denial (e.g. a Cloudflare challenge or a 403) instead of the page. We report this honestly rather than pretending the page is broken — but it means this page could not be audited, and other crawlers like search engines may face similar friction.",
    howToFix:
      'If you own this site, allowlist the "OpenSEO-Audit" user agent in your WAF/bot-protection settings (on Cloudflare: a WAF custom rule that skips bot protection when the user agent contains "OpenSEO-Audit"; on some free tiers you may need to relax bot protection). Then re-run the audit. On Shopify, use Crawler access instead (Online Store → Preferences → Crawler access) and paste the signature into OpenSEO under Settings → Crawler access.',
  },
  "javascript-rendering-suspected": {
    severity: "warning",
    title: "Content may require JavaScript",
    explanation:
      "The page's HTML contains a JavaScript app container with very little readable content and no headings, links, or images. The page may load its content in the browser, or it was still loading when rendered. Content checks were skipped because this HTML may not represent the complete page.",
    howToFix:
      'If this audit did not render JavaScript, start a new audit with "Render JavaScript" enabled to check the loaded content. For reliable crawling, serve important content and navigation in the initial HTML using server-side rendering or prerendering. This warning does not prove that search engines cannot index the page.',
  },
  "rate-limited-page": {
    severity: "warning",
    title: "Rate limited (429)",
    explanation:
      "The server answered 429 Too Many Requests, so this page could not be audited. The crawler waits before retrying when the site's cooldown fits within the audit time limit.",
    howToFix:
      'Raise the rate limit for crawlers, or allowlist the "OpenSEO-Audit" user agent in your rate-limiting rules (on Cloudflare: a rate-limiting rule exception matching that user agent). Then re-run the audit. Re-running with fewer pages also helps if the limit is strict. On Shopify, use Crawler access instead (Online Store → Preferences → Crawler access) and paste the signature into OpenSEO under Settings → Crawler access.',
  },
  "crawl-rate-limited": {
    severity: "warning",
    title: "Crawl stopped early: rate limit",
    explanation:
      "The site asked the crawler to wait longer than the audit time limit allowed. We stopped requesting pages. This report is incomplete; URLs we did not fetch are not recorded as broken or rate limited.",
    howToFix:
      "Re-run the audit after the site's rate limit resets, or ask the site owner to allow the OpenSEO-Audit crawler. On Shopify, use Crawler access instead (Online Store → Preferences → Crawler access) and paste the signature into OpenSEO under Settings → Crawler access.",
  },
  "server-error": {
    severity: "critical",
    title: "Erro no servidor (5xx)",
    explanation:
      "A página retornou erro interno de servidor (código 5xx). O Google deixa de rastrear e pode desindexar páginas que apresentam instabilidade frequente.",
    howToFix:
      "Verifique os registros do servidor para corrigir a falha técnica. Caso a página não exista mais, redirecione-a para uma URL equivalente via 301.",
  },
  "broken-internal-link": {
    severity: "critical",
    title: "Link interno quebrado",
    explanation:
      "Esta página aponta para um link interno inexistente ou com erro (4xx/5xx). Links quebrados frustram visitantes e prejudicam a distribuição de autoridade dentro do site.",
    howToFix:
      "Atualize o link para o endereço correto e ativo, ou remova o apontamento.",
  },
  "missing-title": {
    severity: "critical",
    title: "Tag de título ausente",
    explanation:
      "A página não possui título definido (<title>). O título é o principal sinal de relevância e o cabeçalho que aparece quando alguém pesquisa sua empresa no Google.",
    howToFix:
      "Adicione um título descritivo e único com 50 a 60 caracteres contendo o nome do serviço ou produto principal da página.",
  },
  "broken-page": {
    severity: "warning",
    title: "Página retorna erro (4xx)",
    explanation:
      "Esta URL retornou erro de página não encontrada (como 404). Se ela estiver em menus ou sitemaps, clientes e buscadores perdem tempo tentando acessá-la.",
    howToFix:
      "Restaure o conteúdo ou remova o link dos menus e sitemap. Caso haja outra página similar, crie um redirecionamento 301.",
  },
  "duplicate-title": {
    severity: "warning",
    title: "Título duplicado",
    explanation:
      "Várias páginas compartilham exatamente o mesmo título. Isso faz com que suas próprias páginas concorram entre si no Google.",
    howToFix:
      "Escreva um título exclusivo para cada página destacando sua finalidade específica ou categoria.",
  },
  "duplicate-meta-description": {
    severity: "warning",
    title: "Descrição duplicada",
    explanation:
      "Várias páginas têm a mesma descrição, fazendo com que os resumos no Google pareçam repetidos e confusos para os clientes.",
    howToFix:
      "Personalize a descrição de cada página com um resumo único do seu conteúdo.",
  },
  "duplicate-content": {
    severity: "warning",
    title: "Duplicate page content",
    explanation:
      "Two or more URLs serve byte-identical visible text. Search engines pick one version to index and ignore the rest, and ranking signals get split across the duplicates.",
    howToFix:
      "Consolidate duplicates: pick the canonical URL, add rel=canonical from the others, and 301-redirect duplicate URLs where possible (common causes: trailing-slash variants, URL parameters, http/https or www variants).",
  },
  "missing-meta-description": {
    severity: "warning",
    title: "Missing meta description",
    explanation:
      "The page has no meta description. Search engines will assemble a snippet from page text, which is often less compelling and hurts click-through rate.",
    howToFix:
      "Add a meta description of roughly 70–160 characters that summarizes the page and gives a reason to click.",
  },
  "missing-h1": {
    severity: "warning",
    title: "Missing H1 heading",
    explanation:
      "The page has no H1. The H1 tells users and search engines what the page is about; pages without one tend to have weaker topical clarity.",
    howToFix:
      "Add a single H1 that states the page's main topic, consistent with the title tag.",
  },
  "multiple-h1": {
    severity: "warning",
    title: "Multiple H1 headings",
    explanation:
      "The page has more than one H1, which dilutes the main-topic signal and usually indicates a templating mistake (e.g. a logo and a headline both marked up as H1).",
    howToFix:
      "Keep one H1 for the page's main heading and demote the others to H2/H3 (or unstyled elements for non-headings like logos).",
  },
  "redirect-chain": {
    severity: "warning",
    title: "Redirect chain",
    explanation:
      "Reaching the final page requires two or more consecutive redirects. Each hop adds latency, leaks link equity, and burns crawl budget; long chains may not be followed at all.",
    howToFix:
      "Point the first URL (and any internal links) directly at the final destination so there is at most one redirect.",
  },
  "redirect-loop": {
    severity: "warning",
    title: "Redirect loop",
    explanation:
      "This redirect eventually points back to itself, so the URL never resolves. Browsers and crawlers give up with an error.",
    howToFix:
      "Trace the redirect rules for this URL and break the cycle so the chain terminates at a real 200 page.",
  },
  "canonical-conflict": {
    severity: "warning",
    title: "Conflicting canonical signals",
    explanation:
      "The page declares different canonical URLs in its HTML <link rel=canonical> and its HTTP Link header. When signals conflict, search engines ignore both and choose their own canonical.",
    howToFix:
      "Pick one canonical URL and declare it in exactly one place (HTML head is the most common); remove or align the other declaration.",
  },
  "thin-content": {
    severity: "warning",
    title: "Thin content",
    explanation:
      "The page has very little visible text. Thin pages rarely rank, can drag down sitewide quality assessments, and (if the site renders client-side) may indicate content invisible to plain-HTML crawlers.",
    howToFix:
      "Either expand the page with genuinely useful content, noindex it, or consolidate it into a stronger page. If the content exists but is rendered by JavaScript, ensure it is server-rendered or pre-rendered.",
  },
  "images-missing-alt": {
    severity: "warning",
    title: "Images missing alt text",
    explanation:
      "One or more images on the page lack alt attributes. Alt text is an accessibility requirement and the main way search engines understand images.",
    howToFix:
      'Add descriptive alt text to meaningful images; use an empty alt (alt="") only for purely decorative ones.',
  },
  "orphan-page": {
    severity: "warning",
    title: "Orphan page",
    explanation:
      "No crawled page links to this URL — it was only discoverable via the sitemap. Pages without internal links receive little crawl attention and no internal link equity, and users can't find them by browsing.",
    howToFix:
      "Link to this page from relevant pages (navigation, related content, hub pages), or remove it from the sitemap if it shouldn't be indexed.",
  },
  "no-outgoing-links": {
    severity: "warning",
    title: "Page has no outgoing links",
    explanation:
      "The page contains no links at all — a dead end. Link equity that flows into it stops there, crawlers have nowhere to go next, and users have to reach for the back button.",
    howToFix:
      "Add links to related pages, the parent category, or the homepage. If the page's navigation is rendered by JavaScript, make sure it also exists in the server-rendered HTML.",
  },
  "title-too-long": {
    severity: "info",
    title: "Título muito longo",
    explanation:
      "O título da página excede cerca de 60 caracteres. Títulos muito longos costumam ser cortados nos resultados de busca do Google, prejudicando a clareza para o cliente.",
    howToFix:
      "Encurte o título para 50 a 60 caracteres, posicionando os termos mais importantes no início para garantir impacto visual.",
  },
  "title-too-short": {
    severity: "info",
    title: "Título muito curto",
    explanation:
      "O título possui menos de 10 caracteres, sendo genérico demais para descrever o serviço ou produto e atrair o clique do cliente.",
    howToFix:
      "Amplie o título para uma frase clara e descritiva (30 a 60 caracteres) que explique com exatidão o que a empresa oferece.",
  },
  "meta-description-too-long": {
    severity: "info",
    title: "Descrição da página muito longa",
    explanation:
      "A descrição da página (meta description) ultrapassa cerca de 160 caracteres, fazendo com que o Google corte o final do texto no resumo da busca.",
    howToFix:
      "Ajuste a descrição para ter entre 70 e 160 caracteres, mantendo a mensagem principal clara e uma chamada para ação objetiva.",
  },
  "meta-description-too-short": {
    severity: "info",
    title: "Descrição da página muito curta",
    explanation:
      "A descrição possui menos de 70 caracteres, desperdiçando o espaço de destaque no Google para convencer o cliente a acessar seu site.",
    howToFix:
      "Crie um resumo convidativo entre 70 e 160 caracteres explicando o diferencial e por que o usuário deve clicar.",
  },
  "heading-order-skip": {
    severity: "info",
    title: "Hierarquia de títulos incorreta",
    explanation:
      "A estrutura de cabeçalhos pula níveis (por exemplo, usando H4 diretamente após H2). Uma hierarquia desorganizada dificulta a leitura do conteúdo tanto pelo Google quanto por leitores de tela.",
    howToFix:
      "Organize os títulos em sequência lógica e descendente (H1 → H2 → H3) respeitando a ordem de importância dos tópicos.",
  },
  "slow-response": {
    severity: "info",
    title: "Slow server response",
    explanation:
      "The HTML response took over 1.5 seconds. Slow time-to-first-byte drags down every downstream performance metric and reduces crawl rate on large sites.",
    howToFix:
      "Investigate server/database time and caching for this route; serving cached or statically generated HTML usually fixes it.",
  },
  "noindex-page": {
    severity: "info",
    title: "Page is noindex",
    explanation:
      "The page asks search engines not to index it (via robots meta tag or X-Robots-Tag header). That's often intentional — this is a heads-up, not an error.",
    howToFix:
      "If this page should rank, remove the noindex directive. If it's intentional (admin, thank-you, filter pages), no action is needed.",
  },
  "canonicalized-page": {
    severity: "info",
    title: "Canonicalized to another URL",
    explanation:
      "The page declares a different URL as its canonical, telling search engines to index that URL instead. Fine when intentional (parameter pages, syndication) — a problem if this page was meant to rank.",
    howToFix:
      "If this page should rank on its own, set its canonical to itself. Otherwise no action is needed.",
  },
  "deep-page": {
    severity: "info",
    title: "Page is deep in the site structure",
    explanation:
      "The page is 5+ clicks from the homepage. Deep pages get crawled less often and receive less link equity.",
    howToFix:
      "Add links from higher-level pages (hubs, category pages, navigation) to flatten the path to this page.",
  },
} as const satisfies Record<string, AuditIssueDescriptor>;

export type AuditIssueType = keyof typeof AUDIT_ISSUE_TYPES;

export const ISSUE_SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const issueRegistry: Record<string, AuditIssueDescriptor> = AUDIT_ISSUE_TYPES;

export function getIssueDescriptor(
  issueType: string,
): AuditIssueDescriptor | null {
  return issueRegistry[issueType] ?? null;
}
