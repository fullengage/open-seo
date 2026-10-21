/**
 * Registry of site-audit issue types.
 *
 * Shared between the server (issue engine, MCP tools) and the client
 * (issues UI, CSV export). Each issue row in `audit_issues` references one
 * of these types by id.
 *
 * Textos em português para o empresário: `explanation` responde "por que isso importa",
 * `howToFix` responde "como corrigir". Nada aqui promete ganho de posição.
 */

export type IssueSeverity = "critical" | "warning" | "info";

interface AuditIssueDescriptor {
  severity: IssueSeverity;
  title: string;
  explanation: string;
  howToFix: string;
}

/** Prioridade mostrada ao usuário e o critério de cada uma. */
export const SEVERITY_LABEL: Record<IssueSeverity, { label: string; criterio: string }> = {
  critical: {
    label: "Prioridade alta",
    criterio: "Impede o acesso à página ou ao conteúdo, para visitantes ou para o Google.",
  },
  warning: {
    label: "Prioridade média",
    criterio: "A página funciona, mas o Google ou o visitante entendem pior o que ela oferece.",
  },
  info: {
    label: "Prioridade baixa",
    criterio: "Ajuste fino ou aviso; vale corrigir quando os itens de prioridade alta e média estiverem resolvidos.",
  },
};

export const AUDIT_ISSUE_TYPES = {
  "blocked-page": {
    severity: "critical",
    title: "Nossa análise foi bloqueada",
    explanation:
      "O site respondeu com um bloqueio de segurança (por exemplo, Cloudflare ou erro 403) em vez da página. Não conseguimos analisar esta página, e o Google pode enfrentar barreira parecida.",
    howToFix:
      'Peça a quem cuida do site para liberar o robô "OpenSEO-Audit" na proteção contra bots (no Cloudflare: uma regra que pula a proteção quando o user agent contém "OpenSEO-Audit"). Depois rode a auditoria de novo. Em lojas Shopify, use Loja virtual → Preferências → Acesso de rastreadores.',
  },
  "javascript-rendering-suspected": {
    severity: "warning",
    title: "Conteúdo pode depender de JavaScript",
    explanation:
      "A página chega quase vazia e só monta o conteúdo no navegador. Se o Google não esperar essa montagem, pode enxergar menos do que o visitante vê. Isto é um alerta, não uma prova de que o Google não indexa a página.",
    howToFix:
      'Rode uma nova auditoria com a opção "Renderizar JavaScript" ligada para conferir. Para garantir, peça ao desenvolvedor que o conteúdo principal e o menu venham prontos no HTML (renderização no servidor ou pré-renderização).',
  },
  "rate-limited-page": {
    severity: "warning",
    title: "Site pediu para esperar (erro 429)",
    explanation:
      "O servidor respondeu \"muitas requisições\" e esta página não pôde ser analisada. Se o limite for rígido demais, o Google também pode visitar menos o site.",
    howToFix:
      'Peça a quem cuida do servidor para aumentar o limite para robôs ou liberar o "OpenSEO-Audit". Depois rode a auditoria de novo, se preciso com menos páginas.',
  },
  "crawl-rate-limited": {
    severity: "warning",
    title: "Análise interrompida pelo limite do site",
    explanation:
      "O site pediu um tempo de espera maior do que a auditoria permite, então paramos antes do fim. Este relatório está incompleto: páginas não visitadas não foram marcadas como quebradas.",
    howToFix:
      'Rode a auditoria de novo mais tarde ou peça a liberação do robô "OpenSEO-Audit".',
  },
  "server-error": {
    severity: "critical",
    title: "Página com erro no servidor (5xx)",
    explanation:
      "A página deu erro no servidor e o visitante não vê nada. Se o Google encontra esse erro com frequência, passa a visitar menos o site e pode tirar a página dos resultados.",
    howToFix:
      "Peça ao desenvolvedor ou à hospedagem para verificar o registro de erros desta página e corrigir a causa. Se a página não existe mais, ela deve responder 404 ou redirecionar para uma página equivalente.",
  },
  "broken-internal-link": {
    severity: "critical",
    title: "Link interno quebrado",
    explanation:
      "Esta página tem um link para outra página do próprio site que dá erro. O visitante cai num beco sem saída e o Google gasta visitas em endereços que não funcionam.",
    howToFix:
      "Atualize o link para o endereço correto ou remova-o. Se a página de destino mudou de endereço, aponte direto para o novo endereço.",
  },
  "missing-title": {
    severity: "critical",
    title: "Página sem título",
    explanation:
      "A página não tem título (a tag <title>). É o título que aparece em azul no Google; sem ele, o Google inventa um, quase sempre pior.",
    howToFix:
      "Escreva um título único e claro, com cerca de 50 a 60 caracteres, dizendo o que a página oferece.",
  },
  "broken-page": {
    severity: "warning",
    title: "Página não encontrada (erro 4xx)",
    explanation:
      "Este endereço responde \"página não encontrada\" (por exemplo, 404). Se ele aparece no mapa do site ou em links, visitantes e o Google continuam chegando num erro.",
    howToFix:
      "Se a página deveria existir, restaure-a. Se saiu de propósito, tire-a do mapa do site e dos links e redirecione (301) para a página mais parecida.",
  },
  "duplicate-title": {
    severity: "warning",
    title: "Título repetido em várias páginas",
    explanation:
      "Mais de uma página usa o mesmo título. Fica difícil para o Google e para quem pesquisa saber qual página escolher, e elas acabam disputando entre si.",
    howToFix:
      "Dê a cada página um título próprio que descreva o conteúdo dela. Em páginas geradas por modelo, inclua o que as diferencia (produto, categoria, cidade).",
  },
  "duplicate-meta-description": {
    severity: "warning",
    title: "Descrição repetida em várias páginas",
    explanation:
      "Mais de uma página usa a mesma descrição (o texto cinza abaixo do título no Google). Quem pesquisa vê resumos iguais e não sabe qual página abrir.",
    howToFix:
      "Escreva uma descrição própria para cada página, ou apague a repetida: o Google monta um resumo a partir do texto da página, o que é melhor do que uma descrição errada.",
  },
  "duplicate-content": {
    severity: "warning",
    title: "Conteúdo duplicado",
    explanation:
      "Dois ou mais endereços mostram exatamente o mesmo texto. O Google escolhe só um para mostrar e ignora os outros, e a relevância fica dividida.",
    howToFix:
      "Escolha o endereço principal, marque-o como canônico nas cópias (rel=canonical) e, se possível, redirecione as cópias (301). Causas comuns: endereço com e sem barra no final, com e sem www, ou com parâmetros.",
  },
  "missing-meta-description": {
    severity: "warning",
    title: "Página sem descrição",
    explanation:
      "A página não tem descrição (meta description). O Google monta um resumo a partir do texto, que costuma convencer menos a pessoa a clicar.",
    howToFix:
      "Escreva uma descrição de 70 a 160 caracteres que resuma a página e dê um motivo para clicar.",
  },
  "missing-h1": {
    severity: "warning",
    title: "Página sem título principal (H1)",
    explanation:
      "A página não tem o título principal no conteúdo (H1). É ele que diz ao visitante e ao Google, logo de cara, do que a página trata.",
    howToFix:
      "Coloque um único H1 com o assunto principal da página, coerente com o título.",
  },
  "multiple-h1": {
    severity: "warning",
    title: "Mais de um título principal (H1)",
    explanation:
      "A página tem vários H1, o que confunde qual é o assunto principal. Normalmente é um erro do tema do site (por exemplo, logo e título marcados como H1).",
    howToFix:
      "Deixe um H1 para o título principal e transforme os outros em H2 ou H3 (ou em texto comum, no caso do logo).",
  },
  "redirect-chain": {
    severity: "warning",
    title: "Redirecionamento em cadeia",
    explanation:
      "Para chegar à página final o endereço passa por dois ou mais redirecionamentos. Cada salto deixa o carregamento mais lento e cadeias longas podem nem ser seguidas pelo Google.",
    howToFix:
      "Faça o primeiro endereço (e os links internos) apontarem direto para o destino final, com no máximo um redirecionamento.",
  },
  "redirect-loop": {
    severity: "warning",
    title: "Redirecionamento em círculo",
    explanation:
      "O redirecionamento volta para ele mesmo e a página nunca abre. Navegador e Google desistem com erro.",
    howToFix:
      "Peça ao desenvolvedor para revisar as regras de redirecionamento deste endereço e quebrar o círculo, terminando numa página que abre normalmente.",
  },
  "canonical-conflict": {
    severity: "warning",
    title: "Indicação de página principal conflitante",
    explanation:
      "A página indica um endereço principal (canônico) no HTML e outro diferente no cabeçalho do servidor. Com sinais conflitantes, o Google ignora os dois e decide sozinho.",
    howToFix:
      "Escolha um endereço principal e declare-o em um lugar só (o mais comum é no HTML); remova ou alinhe a outra indicação.",
  },
  "thin-content": {
    severity: "warning",
    title: "Pouco conteúdo na página",
    explanation:
      "A página tem pouquíssimo texto. Páginas assim raramente aparecem bem no Google e podem indicar que o conteúdo só aparece via JavaScript.",
    howToFix:
      "Amplie a página com conteúdo útil de verdade, junte-a a uma página mais completa ou marque-a para não ser indexada (noindex).",
  },
  "images-missing-alt": {
    severity: "warning",
    title: "Imagens sem texto alternativo",
    explanation:
      "Algumas imagens não têm texto alternativo (alt). Ele é lido por quem usa leitor de tela e é a principal forma de o Google entender a imagem.",
    howToFix:
      'Descreva em poucas palavras as imagens importantes no campo "texto alternativo". Imagens só decorativas podem ficar com alt vazio.',
  },
  "orphan-page": {
    severity: "warning",
    title: "Página sem links apontando para ela",
    explanation:
      "Nenhuma página do site tem link para este endereço; ele só aparece no mapa do site. Visitantes não chegam até ela navegando e o Google dá pouca atenção.",
    howToFix:
      "Coloque links para ela em páginas relacionadas (menu, categorias, conteúdos parecidos) ou tire-a do mapa do site se ela não deve aparecer no Google.",
  },
  "no-outgoing-links": {
    severity: "warning",
    title: "Página sem nenhum link",
    explanation:
      "A página não tem nenhum link: é um beco sem saída. O visitante precisa usar o botão voltar e o Google não tem para onde seguir.",
    howToFix:
      "Adicione links para páginas relacionadas, para a categoria ou para a página inicial. Se o menu do site é montado por JavaScript, garanta que ele também venha no HTML.",
  },
  "title-too-long": {
    severity: "info",
    title: "Título muito longo",
    explanation:
      "O título passa de cerca de 60 caracteres e pode ser cortado no Google, escondendo o final. Um título claro ajuda a pessoa a decidir clicar; o tamanho, sozinho, não define a posição.",
    howToFix:
      "Revise o título para cerca de 50 a 60 caracteres, com as palavras mais importantes no começo.",
  },
  "title-too-short": {
    severity: "info",
    title: "Título muito curto",
    explanation:
      "O título tem menos de cerca de 10 caracteres e costuma ser genérico demais para explicar a página ou atrair cliques.",
    howToFix:
      "Transforme o título numa frase descritiva (cerca de 30 a 60 caracteres) dizendo o que a página oferece.",
  },
  "meta-description-too-long": {
    severity: "info",
    title: "Descrição da página muito longa",
    explanation:
      "A descrição passa de cerca de 160 caracteres e o Google corta o texto no resultado da busca.",
    howToFix:
      "Reduza para 70 a 160 caracteres, mantendo a mensagem principal e o convite para clicar.",
  },
  "meta-description-too-short": {
    severity: "info",
    title: "Descrição da página muito curta",
    explanation:
      "A descrição tem menos de cerca de 70 caracteres. Ela desperdiça o espaço do resultado e o Google muitas vezes a troca por um trecho da página.",
    howToFix:
      "Amplie para 70 a 160 caracteres, resumindo a página e dando um motivo para clicar.",
  },
  "heading-order-skip": {
    severity: "info",
    title: "Hierarquia de títulos incorreta",
    explanation:
      "Os títulos internos pulam níveis (por exemplo, um H4 logo depois de um H2). Isso atrapalha leitores de tela e deixa a estrutura do conteúdo menos clara.",
    howToFix:
      "Ajuste os níveis para descerem um de cada vez (H1 → H2 → H3), sem pular.",
  },
  "slow-response": {
    severity: "info",
    title: "Servidor lento para responder",
    explanation:
      "O servidor levou mais de 1,5 segundo para começar a entregar a página. Isso atrasa todo o carregamento para o visitante.",
    howToFix:
      "Peça à hospedagem ou ao desenvolvedor para ativar cache e revisar o tempo do servidor e do banco de dados nesta página.",
  },
  "noindex-page": {
    severity: "info",
    title: "Página marcada para não aparecer no Google",
    explanation:
      "A página pede ao Google para não mostrá-la nos resultados (noindex). Muitas vezes é de propósito; é um aviso, não um erro.",
    howToFix:
      "Se esta página deveria aparecer no Google, remova o noindex. Se é de propósito (área administrativa, página de obrigado), não precisa fazer nada.",
  },
  "canonicalized-page": {
    severity: "info",
    title: "Página aponta outra como principal",
    explanation:
      "A página indica outro endereço como principal (canônico), pedindo ao Google para mostrar aquele no lugar dela. Normal quando é de propósito; problema se esta página deveria aparecer.",
    howToFix:
      "Se esta página deve aparecer no Google por conta própria, aponte o canônico para ela mesma. Caso contrário, não precisa fazer nada.",
  },
  "deep-page": {
    severity: "info",
    title: "Página muito escondida no site",
    explanation:
      "A página está a 5 ou mais cliques da página inicial. Páginas tão fundas são visitadas menos pelo Google e pelas pessoas.",
    howToFix:
      "Coloque links para ela em páginas de nível mais alto (menu, categorias, páginas de assunto) para encurtar o caminho.",
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
