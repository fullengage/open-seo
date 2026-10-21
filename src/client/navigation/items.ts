import {
  Bookmark,
  Bot,
  Brain,
  Building2,
  Cable,
  ChartLine,
  ClipboardCheck,
  FileText,
  Globe,
  Inbox,
  LayoutDashboard,
  Link2,
  MessageSquare,
  MessageSquareQuote,
  Search,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { linkOptions } from "@tanstack/react-router";
import { GoogleGlyphMuted } from "@/client/features/gsc/GoogleGlyph";

const projectNavItems = [
  {
    to: "/p/$projectId" as const,
    label: "Painel Geral",
    icon: LayoutDashboard,
    activeOptions: { exact: true, includeSearch: false },
  },
  {
    to: "/p/$projectId/search-performance" as const,
    label: "Desempenho no Google",
    icon: GoogleGlyphMuted,
  },
  {
    to: "/p/$projectId/rank-tracking" as const,
    label: "Monitor de Posições",
    icon: TrendingUp,
  },
  {
    to: "/p/$projectId/audit" as const,
    label: "Auditoria Técnica",
    icon: ClipboardCheck,
  },
  {
    to: "/p/$projectId/keywords" as const,
    label: "Palavras-chave",
    icon: Search,
  },
  {
    to: "/p/$projectId/reports" as const,
    label: "Relatórios",
    icon: FileText,
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
    to: "/p/$projectId/saved" as const,
    label: "Palavras-chave Salvas",
    icon: Bookmark,
  },
  {
    to: "/p/$projectId/context" as const,
    label: "Contexto do Projeto",
    icon: Brain,
  },
  {
    to: "/p/$projectId/settings/integrations" as const,
    label: "Conexões",
    icon: Cable,
  },
  {
    to: "/p/$projectId/settings" as const,
    label: "Config Extra",
    icon: Settings,
  },
] as const;

export const companiesNavItem = linkOptions({
  to: "/companies" as const,
  label: "Prospecção B2B",
  icon: Building2,
});

export const inboxNavItem = linkOptions({
  to: "/companies" as const,
  label: "Caixa de Entrada",
  icon: Inbox,
});

export const conversationsNavItem = linkOptions({
  to: "/companies" as const,
  label: "Conversas",
  icon: MessageSquareQuote,
});

export const teamsNavItem = linkOptions({
  to: "/settings/organization" as const,
  label: "Times",
  icon: Users,
});

const aiNavItem = linkOptions({
  to: "/ai" as const,
  label: "Agentes IA",
  icon: Bot,
});

export const connectNavGroup = {
  label: "Inteligência Comercial",
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

export function getProjectNavGroups(projectId: string) {
  const all = getProjectNavItems(projectId);
  const byPath = (path: (typeof projectNavItems)[number]["to"]) =>
    all.find((i) => i.to === path)!;

  return [
    {
      label: "Inteligência Comercial",
      items: [
        byPath("/p/$projectId"), // 1. Painel Geral
        companiesNavItem, // 2. Prospecção B2B
        byPath("/p/$projectId/search-performance"), // 3. Desempenho no Google
        byPath("/p/$projectId/rank-tracking"), // 4. Monitor de Posições
        byPath("/p/$projectId/audit"), // 5. Auditoria Técnica
        byPath("/p/$projectId/keywords"), // 6. Palavras-chave
        byPath("/p/$projectId/reports"), // 7. Relatórios
      ],
    },
    {
      label: "Atendimento",
      items: [
        inboxNavItem,
        conversationsNavItem,
        teamsNavItem,
      ],
    },
    {
      label: "Presença Digital & IA",
      items: [
        byPath("/p/$projectId/domain"),
        byPath("/p/$projectId/backlinks"),
        byPath("/p/$projectId/ai-visibility"),
        byPath("/p/$projectId/ai-visibility/research"),
        byPath("/p/$projectId/prompt-explorer"),
        byPath("/p/$projectId/saved"),
        byPath("/p/$projectId/context"),
        aiNavItem,
      ],
    },
    {
      label: "Integrações e Configurações",
      items: [
        byPath("/p/$projectId/settings/integrations"),
        byPath("/p/$projectId/settings"),
      ],
    },
  ];
}

export const dataforseoHelpLinkOptions = linkOptions({
  to: "/help/dataforseo-api-key",
});
