import {
  Bot,
  ClipboardCheck,
  FolderPlus,
  Globe,
  Lightbulb,
  Users,
} from "lucide-react";
import type { DashboardActivation } from "@/server/features/dashboard/services/DashboardService";
import type { DashboardSetupStep } from "@/types/schemas/dashboard";

export const setupSteps: {
  id: DashboardSetupStep;
  label: string;
  detail: string;
  icon: typeof Globe;
}[] = [
  {
    id: "competitor",
    label: "Analisar concorrentes",
    detail: "Descubra oportunidades e páginas de referência no seu mercado.",
    icon: Globe,
  },
  {
    id: "keywords",
    label: "Pesquisar palavras-chave",
    detail: "Identifique termos e perguntas que potenciais clientes pesquisam.",
    icon: Lightbulb,
  },
  {
    id: "audit",
    label: "Diagnóstico técnico do site",
    detail: "Avalie estrutura, velocidade, títulos e páginas com problemas.",
    icon: ClipboardCheck,
  },
  {
    id: "mcp",
    label: "Conectar canais e inteligência",
    detail: "Integre canais de comunicação e agentes comerciais ao sistema.",
    icon: Bot,
  },
  {
    id: "team",
    label: "Convidar equipe comercial",
    detail: "Compartilhe o funil de prospecção e acompanhe oportunidades em conjunto.",
    icon: Users,
  },
  {
    id: "project",
    label: "Cadastrar nova empresa ou site",
    detail: "Adicione outros projetos para monitorar e prospectar.",
    icon: FolderPlus,
  },
];

export function getStepStatus(
  activation: DashboardActivation,
  step: DashboardSetupStep,
): "done" | "skipped" | "todo" {
  const completed: Record<DashboardSetupStep, boolean> = {
    competitor: activation.competitorClickedAt !== null,
    keywords: activation.keywordsClickedAt !== null,
    audit: activation.hasAudit,
    mcp:
      activation.mcp.authorizedAt !== null ||
      activation.mcp.firstToolCallAt !== null,
    team: activation.hasTeammate,
    project: activation.hasMultipleProjects,
  };
  if (completed[step]) return "done";
  // Preserve previous MCP dismissals without treating them as authorization.
  if (
    activation.dismissedSteps.includes(step) ||
    (step === "mcp" && activation.mcp.cardDismissedAt !== null)
  )
    return "skipped";
  return "todo";
}
