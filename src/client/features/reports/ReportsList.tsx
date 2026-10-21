import { Link } from "@tanstack/react-router";
import { FileText, Trash2 } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { formatCreatedBy } from "@/client/features/reports/shared";
import { formatRelativeTime } from "@/client/lib/relative-time";
import type { ReportListItem } from "@/serverFunctions/reports";
import { REPORT_APP_LIST_LIMIT } from "@/types/schemas/reports";

export function ReportsList({
  projectId,
  reports,
  onDelete,
}: {
  projectId: string;
  reports: ReportListItem[];
  onDelete: (report: ReportListItem) => void;
}) {
  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nenhum relatório gerado ainda"
        description="Gere uma auditoria técnica ou acompanhamento de desempenho para consolidar relatórios executivos para este projeto."
      />
    );
  }

  return (
    <div className="space-y-3">
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="max-w-[420px]">
                  <Link
                    to="/p/$projectId/reports/$reportId"
                    params={{ projectId, reportId: report.id }}
                    className="font-medium hover:underline"
                  >
                    {report.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCreatedBy(report)}
                </TableCell>
                {/* The template the report was written from, else the skill
                    that produced it: what a reader needs to tell two reports
                    on the same site apart. */}
                <TableCell className="text-muted-foreground">
                  {report.templateName ?? report.skill ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatRelativeTime(report.updatedAt)}
                </TableCell>
                <TableCell className="w-10 text-right">
                  <RowActionsMenu label={`Ações para ${report.title}`}>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(report)}
                    >
                      <Trash2 />
                      Excluir
                    </DropdownMenuItem>
                  </RowActionsMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      {reports.length === REPORT_APP_LIST_LIMIT ? (
        <p className="text-xs text-muted-foreground">
          Showing the {REPORT_APP_LIST_LIMIT} most recent reports.
        </p>
      ) : null}
    </div>
  );
}
