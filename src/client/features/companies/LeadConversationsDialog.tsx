import { useEffect, useState } from "react";
import { Button } from "@/client/components/ui/button";
import type { PipelineLead } from "./types";
import { getLeadConversations, type LeadConversation } from "@/serverFunctions/chatwootConversations";

type Result =
  | { ok: true; contact: { id: number; name: string } | null; conversations: LeadConversation[] }
  | { ok: false; reason: string };

const fmt = (unix: number) => (unix ? new Date(unix * 1000).toLocaleString("pt-BR") : "");

export function LeadConversationsDialog({ lead, onClose }: { lead: PipelineLead; onClose: () => void }) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    getLeadConversations({ data: { email: lead.decisorEmail || lead.email, telefone: lead.whatsapp || lead.telefone } })
      .then((r) => setResult(r as Result))
      .catch(() => setResult({ ok: false, reason: "Não foi possível falar com o Chatwoot." }));
  }, [lead]);

  // "Respondeu": mensagem do lead depois da aprovação da abordagem
  const approvedAt = lead.draft?.approvedAt ? Date.parse(lead.draft.approvedAt) / 1000 : null;
  const replied =
    result?.ok &&
    approvedAt !== null &&
    result.conversations.some((c) => c.messages.some((m) => m.incoming && m.at > approvedAt));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-background p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Conversas — {lead.nomeFantasia || lead.razaoSocial}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        {!result && <p className="text-xs text-muted-foreground">Buscando no ChatHook…</p>}
        {result && !result.ok && <p className="text-xs text-[#8A6B3A]">{result.reason}</p>}
        {result?.ok && !result.contact && (
          <p className="text-xs text-muted-foreground">Nenhuma conversa com este lead no ChatHook ainda.</p>
        )}
        {replied && (
          <p className="text-xs font-semibold text-emerald-600">Respondeu depois da abordagem aprovada.</p>
        )}

        {result?.ok &&
          result.conversations.map((c) => (
            <div key={c.id} className="rounded border border-border p-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  #{c.id} · {c.status} · {fmt(c.lastActivityAt ?? 0)}
                </span>
                <a href={c.url} target="_blank" rel="noreferrer" className="text-primary underline">
                  Abrir no ChatHook
                </a>
              </div>
              {c.messages.map((m, i) => (
                <p
                  key={i}
                  className={`text-xs rounded px-2 py-1 ${m.incoming ? "bg-muted" : "bg-primary/10 text-right"}`}
                >
                  {m.content}
                </p>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
