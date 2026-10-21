import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card } from "@/client/components/ui/card";
import { getPositionMonitor } from "@/serverFunctions/positionMonitor";

const br = (d: string) => d.split("-").reverse().join("/");

/** Aviso padrão quando o Search Console ainda não está ligado. */
export function ConecteGoogle({ projectId, oque }: { projectId: string; oque: string }) {
  return (
    <Card className="p-6 space-y-2">
      <p className="font-semibold">Conecte o Google Search Console para ver {oque}.</p>
      <p className="text-sm text-muted-foreground">
        Os dados vêm direto da sua conta Google, sem custo. Você entra com a conta que tem acesso ao site e escolhe
        qual site acompanhar.
      </p>
      <Link
        to="/p/$projectId/search-performance"
        params={{ projectId }}
        className="inline-block text-sm font-medium text-primary underline"
      >
        Conectar Google Search Console
      </Link>
    </Card>
  );
}

export function MonitorPosicoes({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["positionMonitor", projectId],
    queryFn: () => getPositionMonitor({ data: { projectId } }),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando dados do Google…</p>;
  if (q.isError)
    return (
      <Card className="p-6 text-sm">
        Não foi possível buscar os dados do Google agora. Tente de novo em alguns minutos; se continuar, a conexão com
        o Search Console pode ter expirado e precisa ser refeita.
      </Card>
    );
  const d = q.data;
  if (!d || !d.connected) return <ConecteGoogle projectId={projectId} oque="a posição das suas palavras no Google" />;

  return (
    <div className="space-y-3">
      <Card className="p-4 text-sm space-y-1">
        <p>
          <strong>Como ler:</strong> este monitor mostra a <strong>posição média</strong> com que cada busca levou ao
          seu site, segundo o Google Search Console. É a média de todas as vezes que o site apareceu (cidades,
          aparelhos e dias diferentes), não a posição exata numa busca específica.
        </p>
        <p className="text-muted-foreground">
          Fonte: {d.source}. Período: {br(d.range.startDate)} a {br(d.range.endDate)}, comparado com{" "}
          {br(d.range.prevStartDate)} a {br(d.range.prevEndDate)}. Só aparecem buscas com 10 ou mais impressões.
        </p>
      </Card>
      {d.rows.length === 0 ? (
        <Card className="p-6 text-sm">
          O Google ainda não registrou buscas suficientes para o site neste período.
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-2">Palavra-chave (busca)</th>
                <th className="text-left p-2">Página</th>
                <th className="text-right p-2">Posição média</th>
                <th className="text-right p-2">Antes</th>
                <th className="text-right p-2">Evolução</th>
                <th className="text-right p-2">Impressões</th>
                <th className="text-right p-2">Cliques</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.query + r.page} className="border-t border-border">
                  <td className="p-2 font-medium">{r.query}</td>
                  <td className="p-2 max-w-[260px] truncate text-muted-foreground" title={r.page}>
                    {r.page.replace(/^https?:\/\/[^/]+/, "") || "/"}
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.position.toFixed(1)}</td>
                  <td className="p-2 text-right tabular-nums text-muted-foreground">
                    {r.previousPosition === null ? "—" : r.previousPosition.toFixed(1)}
                  </td>
                  <td
                    className={`p-2 text-right tabular-nums ${
                      r.change === null ? "text-muted-foreground" : r.change > 0 ? "text-emerald-600" : r.change < 0 ? "text-rose-600" : ""
                    }`}
                  >
                    {r.change === null ? "nova" : r.change > 0 ? `▲ ${r.change.toFixed(1)}` : r.change < 0 ? `▼ ${(-r.change).toFixed(1)}` : "="}
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.impressions}</td>
                  <td className="p-2 text-right tabular-nums">{r.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
