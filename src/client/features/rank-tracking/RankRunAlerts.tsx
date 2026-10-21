import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { useRankRunPolling } from "./useRankRunPolling";

/** Warnings about the latest rank check: stale, failed, or incomplete. */
export function RankRunAlerts({
  run,
}: {
  run: ReturnType<typeof useRankRunPolling>;
}) {
  if (!run) return null;

  if (run.maybeStale) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          Esta verificação pode estar demorando mais do que o esperado e será finalizada automaticamente.
        </AlertDescription>
      </Alert>
    );
  }

  if (run.status === "failed") {
    const isDataForSeoError =
      run.errorMessage?.includes("DataForSEO") ||
      run.errorMessage?.includes("403") ||
      run.errorMessage?.includes("DATAFORSEO");
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground space-y-1">
          <p>
            <span className="font-medium">
              {isDataForSeoError
                ? "Monitoramento independente em transição de custo zero"
                : "Última verificação não concluída."}
            </span>{" "}
            {isDataForSeoError ? (
              "O rastreamento de posições via provedores pagos externos (DataForSEO) está desativado na arquitetura autônoma. Para dados reais e gratuitos de termos, impressões e posição média do seu site, utilize a aba 'Desempenho no Google' (Search Console)."
            ) : (
              run.errorMessage &&
              getStandardErrorMessage(new Error(run.errorMessage))
            )}
          </p>
          {isDataForSeoError && (
            <p className="text-xs text-muted-foreground">
              Nota: A posição média do Search Console reflete cliques e impressões reais dos usuários, enquanto o rastreador calcula a posição exata de uma busca pontual.
            </p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // A completed run only has an error message when some checks failed.
  if (run.status === "completed" && run.errorMessage) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">Verificação parcial.</span> Alguns
            termos não puderam ser verificados e mantiveram a posição anterior.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
