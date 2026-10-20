// Login único: dentro da aba do Chatwoot, o script do Chatwoot manda a sessão
// do usuário (AUTH_TOKEN). Trocamos por uma sessão assinada do OpenSEO e, se
// estávamos na tela de login, seguimos para o funil. Nada roda fora de iframe.
import { getPipelineLeads, savePipelineLead } from "@/serverFunctions/pipelineLeads";
import type { PipelineLead } from "@/client/features/companies/types";

const CHATWOOT_ORIGIN = "https://chat.chathook.com.br";

type ChatwootLead = {
  contactId: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  conversationId: number;
};

// Contato da conversa → card no pipeline (CNPJ é completado depois no "Editar")
async function addLeadFromChatwoot(c: ChatwootLead) {
  const id = `lead-cw-${c.contactId}`;
  const existing = await getPipelineLeads();
  const dup = existing.find((l) => l.id === id || (c.email && (l.email === c.email || l.decisorEmail === c.email)));
  if (!dup) {
    const lead: PipelineLead = {
      id,
      cnpj: "",
      razaoSocial: c.company || c.name || "Contato do ChatHook",
      nomeFantasia: c.company || c.name || null,
      uf: "",
      email: c.email || null,
      decisorEmail: c.email || null,
      telefone: c.phone || null,
      whatsapp: c.phone || null,
      decisorNome: c.name || null,
      stage: "prospect",
      createdAt: new Date().toISOString(),
      notes: `Veio do ChatHook (conversa #${c.conversationId}). Completar o CNPJ no Editar.`,
    };
    await savePipelineLead({ data: { lead } });
  }
  window.location.href = "/companies?tab=kanban";
}
type W = Window & { __fwChatwootBridge?: boolean };

if (typeof window !== "undefined" && window.parent !== window && !(window as W).__fwChatwootBridge) {
  (window as W).__fwChatwootBridge = true;

  window.addEventListener("message", async (e: MessageEvent) => {
    if (e.origin !== CHATWOOT_ORIGIN) return;
    const data = e.data as {
      type?: string;
      payload?: Record<string, unknown>;
      path?: string;
      lead?: ChatwootLead;
    } | null;
    if (data?.type === "NAVIGATE" && typeof data.path === "string") {
      // "companies" é global; o resto é seção do último projeto aberto
      const projectId = window.localStorage.getItem("openseo:lastProjectId");
      const target =
        data.path === "companies" || !projectId ? "/companies" : `/p/${projectId}${data.path ? `/${data.path}` : ""}`;
      if (window.location.pathname !== target) window.location.href = target;
      return;
    }
    if (data?.type === "ADD_LEAD" && data.lead) {
      await addLeadFromChatwoot(data.lead);
      return;
    }
    if (data?.type !== "AUTH_TOKEN" || !data.payload) return;
    try {
      const res = await fetch("/api/auth/chatwoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: data.payload, accountId: data.payload.account_id ?? null }),
      });
      if (res.ok && window.location.pathname === "/sign-in") {
        window.location.href = "/companies";
      }
    } catch {
      // sem sessão do Chatwoot: a tela de login continua disponível
    }
  });

  window.parent.postMessage({ type: "OPENSEO_READY" }, CHATWOOT_ORIGIN);
}

export {};
