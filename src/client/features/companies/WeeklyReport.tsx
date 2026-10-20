import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import type { PipelineLead } from "./types";
import { getRepliesSince } from "@/serverFunctions/chatwootConversations";

const WEEK_MS = 7 * 24 * 3600 * 1000;

/** Relatório da semana: abordagens aprovadas, respostas no ChatHook e funil por etapa. */
export function WeeklyReport({ leads }: { leads: PipelineLead[] }) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<{ id: string; at: number }[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const since = Date.now() - WEEK_MS;
  const approved = leads.filter((l) => l.draft?.status === "approved" && l.draft.approvedAt && Date.parse(l.draft.approvedAt) >= since);
  const byStage = (s: PipelineLead["stage"]) => leads.filter((l) => l.stage === s).length;
  const diagnosed = leads.filter((l) => (l.diagnostic?.facts || []).length > 0).length;

  async function load() {
    setOpen(!open);
    if (open || replies) return;
    if (!approved.length) {
      setReplies([]);
      return;
    }
    const r = await getRepliesSince({
      data: {
        leads: approved.map((l) => ({
          id: l.id,
          email: l.decisorEmail || l.email || null,
          telefone: l.whatsapp || l.telefone || null,
          since: l.draft!.approvedAt!,
        })),
      },
    });
    if (r.ok) setReplies(r.replied);
    else {
      setReplies([]);
      setNote(r.reason);
    }
  }

  const name = (id: string) => {
    const l = leads.find((x) => x.id === id);
    return l ? l.nomeFantasia || l.razaoSocial : id;
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={load}>
        Relatório da semana
      </Button>
      {open && (
        <div className="fixed right-4 top-20 z-40 w-80 rounded-lg border border-border bg-background p-4 shadow-xl space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <strong>Últimos 7 dias</strong>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
          <Row label="Abordagens aprovadas (enviadas)" value={approved.length} />
          <Row label="Responderam no ChatHook" value={replies === null ? "…" : replies.length} />
          <Row
            label="Taxa de resposta"
            value={replies && approved.length ? `${Math.round((replies.length / approved.length) * 100)}%` : "—"}
          />
          <hr className="border-border" />
          <Row label="Leads com diagnóstico" value={diagnosed} />
          <Row label="Etapa: Diagnóstico pronto" value={byStage("audit_ready")} />
          <Row label="Etapa: Abordagem enviada" value={byStage("outreach_sent")} />
          <Row label="Etapa: Em negociação (diagnóstico aceito)" value={byStage("negotiation")} />
          <Row label="Etapa: Contrato fechado" value={byStage("won")} />
          {replies && replies.length > 0 && (
            <p className="text-xs text-muted-foreground">Responderam: {replies.map((r) => name(r.id)).join(", ")}</p>
          )}
          {note && <p className="text-xs text-amber-600">{note}</p>}
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
