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
        title="Saved Keywords"
        description="Save keyword ideas from research, organize them with tags, and revisit when you're ready to act."
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
              title="Fetch new volume, difficulty, and CPC"
              disabled={disabled || metricsRefreshing}
              onClick={() => setConfirmingRefresh(true)}
            >
              <RefreshCw
                data-icon="inline-start"
                className={metricsRefreshing ? "animate-spin" : ""}
              />
              {metricsRefreshing ? "Updating..." : "Update keyword stats"}
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
          title="Update keyword stats?"
          confirmLabel="Update stats"
          onConfirm={() => {
            setConfirmingRefresh(false);
            onRefreshMetrics();
          }}
          onClose={() => setConfirmingRefresh(false)}
        >
          This fetches new volume, difficulty, and CPC for every saved keyword
          in this project. Each keyword uses credits.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
