import { useState } from "react";
import { RefreshCw, Upload } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { ExportMenu } from "@/client/components/ExportMenu";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { KeywordCsvImportDialog } from "@/client/features/keywords/components/KeywordCsvImportDialog";

export function SavedKeywordsHeader({
  projectId,
  totalCount,
  exporting,
  metricsRefreshing,
  onExportCsv,
  onExportSheets,
  onRefreshMetrics,
  onImportComplete,
}: {
  projectId?: string;
  totalCount: number;
  exporting: "csv" | "sheets" | null;
  metricsRefreshing: boolean;
  onExportCsv: () => void;
  onExportSheets: () => void;
  onRefreshMetrics: () => void;
  onImportComplete?: () => void;
}) {
  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const disabled = totalCount === 0 || exporting != null;

  return (
    <>
      <PageHeader
        title="Palavras-chave Salvas"
        description="Salve palavras-chave de suas pesquisas, organize com etiquetas e acompanhe sua evolução."
        actions={
          <>
            {projectId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportDialog(true)}
                title="Importar lista de palavras via CSV ou texto"
              >
                <Upload data-icon="inline-start" className="size-3.5" />
                Importar CSV
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              title="Buscar novo volume, dificuldade e CPC"
              disabled={disabled || metricsRefreshing}
              onClick={() => setConfirmingRefresh(true)}
            >
              <RefreshCw
                data-icon="inline-start"
                className={metricsRefreshing ? "animate-spin" : ""}
              />
              {metricsRefreshing ? "Atualizando..." : "Atualizar métricas"}
            </Button>

            <ExportMenu
              actions={["sheets", "csv"]}
              busy={exporting != null}
              disabled={disabled}
              onExport={(action) =>
                action === "sheets" ? onExportSheets() : onExportCsv()
              }
            />
          </>
        }
      />

      {projectId && (
        <KeywordCsvImportDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          projectId={projectId}
          onImportComplete={onImportComplete}
        />
      )}

      {confirmingRefresh ? (
        <ConfirmDialog
          title="Atualizar métricas das palavras?"
          confirmLabel="Atualizar métricas"
          onConfirm={() => {
            setConfirmingRefresh(false);
            onRefreshMetrics();
          }}
          onClose={() => setConfirmingRefresh(false)}
        >
          Isso consulta novo volume de busca, dificuldade e CPC para todas as palavras-chave salvas neste projeto.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
