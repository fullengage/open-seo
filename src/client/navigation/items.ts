import {
  Bookmark,
  Bot,
  Brain,
  Building2,
  ChartLine,
  ClipboardCheck,
  FileText,
  Globe,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Search,
  TrendingUp,
} from "lucide-react";
import { linkOptions } from "@tanstack/react-router";
import { GoogleGlyphMuted } from "@/client/features/gsc/GoogleGlyph";

const projectNavItems = [
  {
    to: "/p/$projectId" as const,
    label: "Painel Geral",
    icon: LayoutDashboard,
    // Without exact matching, the index path is a prefix of every project
    // route and the Dashboard item would render active everywhere.
    activeOptions: { exact: true, includeSearch: false },
  },
  {
    to: "/p/$projectId/keywords" as const,
    label: "Pesquisa de Palavras-chave",
    icon: Search,
  },
  {
    to: "/p/$projectId/saved" as const,
    label: "Palavras-chave Salvas",
    icon: Bookmark,
  },
  {
    to: "/p/$projectId/rank-tracking" as const,
    label: "Monitor de Posições (Rank)",
    icon: TrendingUp,
  },
  {
    to: "/p/$projectId/search-performance" as const,
    label: "Desempenho no Google (GSC)",
    icon: GoogleGlyphMuted,
  },
  {
    to: "/p/$projectId/domain" as const,
    label: "Visão do Domínio",
    icon: Globe,
  },
  {
    to: "/p/$projectId/backlinks" as const,
    label: "Backlinks",
    icon: Link2,
  },
  {
    to: "/p/$projectId/audit" as const,
    label: "Auditoria Técnica de SEO",
    icon: ClipboardCheck,
  },
  {
    to: "/p/$projectId/ai-visibility" as const,
    label: "Monitoramento de Prompts",
    icon: ChartLine,
    activeOptions: { exact: true, includeSearch: false },
  },
  {
    to: "/p/$projectId/ai-visibility/research" as const,
    label: "Pesquisa de Prompts IA",
    icon: Search,
  },
  {
    to: "/p/$projectId/prompt-explorer" as const,
    label: "Explorador de Prompts",
    icon: MessageSquare,
  },
  {
    to: "/p/$projectId/reports" as const,
    label: "Relatórios",
    icon: FileText,
  },
  {
    to: "/p/$projectId/context" as const,
    label: "Contexto do Projeto",
    icon: Brain,
  },
] as const;

// Project-independent. Rendered inside the project "AI Tools" group when a project
// is selected, and on its own (connectNavGroup) when none is.
const aiNavItem = linkOptions({
  to: "/ai" as const,
  label: "Agentes IA",
  icon: Bot,
});

export const companiesNavItem = linkOptions({
  to: "/companies" as const,
  label: "Prospecção B2B (Funil)",
  icon: Building2,
});

// Shown only when no project is selected; with a project, Agent setup lives in
// the "AI Tools" group below.
export const connectNavGroup = {
  label: "Ferramentas",
  items: [companiesNavItem, aiNavItem],
};

function getProjectNavItems(projectId: string) {
  return linkOptions(
    projectNavItems.map((item) => ({
      ...item,
      params: { projectId },
      search: {},
    })),
  );
}

// Grouped by scope: "My Site" is the project's own domain (tracked data),
// "Research" is point-at-anything lookup tools.
export function getProjectNavGroups(projectId: string) {
  const all = getProjectNavItems(projectId);
  const byPath = (path: (typeof projectNavItems)[number]["to"]) =>
    all.find((i) => i.to === path)!;

  return [
    {
      label: "Visão Geral",
      items: [byPath("/p/$projectId")],
    },
    {
      label: "Pesquisa & Mercado",
      items: [
        byPath("/p/$projectId/keywords"),
        byPath("/p/$projectId/domain"),
        byPath("/p/$projectId/backlinks"),
      ],
    },
    {
      label: "Visibilidade em IA",
      items: [
        byPath("/p/$projectId/ai-visibility/research"),
        byPath("/p/$projectId/prompt-explorer"),
        byPath("/p/$projectId/ai-visibility"),
      ],
    },
    {
      label: "Meu Site & SEO",
      items: [
        byPath("/p/$projectId/search-performance"),
        byPath("/p/$projectId/rank-tracking"),
        byPath("/p/$projectId/saved"),
        byPath("/p/$projectId/audit"),
      ],
    },
    {
      label: "Prospecção & Relatórios",
      items: [
        companiesNavItem,
        byPath("/p/$projectId/reports"),
        byPath("/p/$projectId/context"),
        aiNavItem,
      ],
    },
  ];
}


export const dataforseoHelpLinkOptions = linkOptions({
  to: "/help/dataforseo-api-key",
});
