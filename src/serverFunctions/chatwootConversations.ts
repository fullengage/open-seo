import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { CHATWOOT_URL, readSession } from "@/server/lib/fullwebSession";

export interface LeadConversation {
  id: number;
  status: string;
  url: string;
  lastActivityAt: number | null;
  messages: { content: string; incoming: boolean; at: number }[];
}

// Conversas do lead no Chatwoot, com o token de quem entrou pelo ChatHook.
export const getLeadConversations = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().nullable().optional(),
      telefone: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const s = readSession(getRequest().headers.get("cookie"));
    if (!s?.cw || !s.accountId) {
      return { ok: false as const, reason: "Entre pelo ChatHook para ver as conversas do lead." };
    }
    const headers = { "access-token": s.cw.token, client: s.cw.client, uid: s.cw.uid, "token-type": "Bearer" };
    const base = `${CHATWOOT_URL}/api/v1/accounts/${s.accountId}`;
    const q = (data.email || "").trim() || (data.telefone || "").replace(/\D/g, "");
    if (!q) return { ok: false as const, reason: "Lead sem e-mail ou telefone." };

    const sr = await fetch(`${base}/contacts/search?q=${encodeURIComponent(q)}`, { headers });
    if (!sr.ok) return { ok: false as const, reason: `O Chatwoot respondeu ${sr.status}.` };
    const contacts = ((await sr.json()) as { payload?: { id: number; name: string }[] }).payload || [];
    if (!contacts.length) return { ok: true as const, contact: null, conversations: [] as LeadConversation[] };

    const contact = contacts[0];
    const cr = await fetch(`${base}/contacts/${contact.id}/conversations`, { headers });
    if (!cr.ok) return { ok: false as const, reason: `O Chatwoot respondeu ${cr.status}.` };
    type RawMsg = { content?: string | null; message_type?: number; created_at?: number };
    type RawConv = { id: number; status?: string; last_activity_at?: number; messages?: RawMsg[] };
    const raw = ((await cr.json()) as { payload?: RawConv[] }).payload || [];

    const conversations: LeadConversation[] = raw.slice(0, 3).map((cv) => ({
      id: cv.id,
      status: cv.status || "",
      url: `${CHATWOOT_URL}/app/accounts/${s.accountId}/conversations/${cv.id}`,
      lastActivityAt: cv.last_activity_at ?? null,
      messages: (cv.messages || [])
        .filter((m) => m.content)
        .slice(-3)
        .map((m) => ({
          content: String(m.content).slice(0, 300),
          incoming: m.message_type === 0, // 0 = mensagem recebida do contato
          at: m.created_at ?? 0,
        })),
    }));
    return { ok: true as const, contact: { id: contact.id, name: contact.name }, conversations };
  });

// Quem respondeu no ChatHook depois da abordagem aprovada (para o relatório da semana)
export const getRepliesSince = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leads: z.array(
        z.object({
          id: z.string(),
          email: z.string().nullable().optional(),
          telefone: z.string().nullable().optional(),
          since: z.string(),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const s = readSession(getRequest().headers.get("cookie"));
    if (!s?.cw || !s.accountId) {
      return { ok: false as const, reason: "Entre pelo ChatHook para contar as respostas." };
    }
    const headers = { "access-token": s.cw.token, client: s.cw.client, uid: s.cw.uid, "token-type": "Bearer" };
    const base = `${CHATWOOT_URL}/api/v1/accounts/${s.accountId}`;
    const replied: { id: string; at: number }[] = [];
    // ponytail: 2 chamadas por lead em sequência; trocar por webhook quando houver dezenas por semana
    for (const l of data.leads.slice(0, 50)) {
      const q = (l.email || "").trim() || (l.telefone || "").replace(/\D/g, "");
      if (!q) continue;
      const sinceUnix = Date.parse(l.since) / 1000;
      try {
        const sr = await fetch(`${base}/contacts/search?q=${encodeURIComponent(q)}`, { headers });
        const contact = ((await sr.json()) as { payload?: { id: number }[] }).payload?.[0];
        if (!contact) continue;
        const cr = await fetch(`${base}/contacts/${contact.id}/conversations`, { headers });
        const convs = ((await cr.json()) as { payload?: { messages?: { message_type?: number; created_at?: number }[] }[] }).payload || [];
        const at = convs
          .flatMap((c) => c.messages || [])
          .filter((m) => m.message_type === 0 && (m.created_at ?? 0) > sinceUnix)
          .map((m) => m.created_at ?? 0)[0];
        if (at) replied.push({ id: l.id, at });
      } catch {
        // um lead com erro não derruba o relatório
      }
    }
    return { ok: true as const, replied };
  });
