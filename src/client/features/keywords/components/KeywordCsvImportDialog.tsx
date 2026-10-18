import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Textarea } from "@/client/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { saveKeywords } from "@/serverFunctions/keywords";
import type { KeywordIntent } from "@/types/keywords";

export type ParsedKeywordRow = {
  keyword: string;
  searchVolume?: number | null;
  cpc?: number | null;
  keywordDifficulty?: number | null;
  intent?: KeywordIntent | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onImportToSearch?: (keywords: string[]) => void;
  onImportComplete?: () => void;
};

function parseNumber(val: string | undefined): number | null {
  if (!val) return null;
  // Limpar símbolos de moeda como R$, $, espaços
  const clean = val.replace(/[R$\s]/g, "").trim();
  if (!clean) return null;

  // Se tiver formato brasileiro como 1.250,50 ou 2,50
  if (clean.includes(",") && !clean.includes(".")) {
    const num = parseFloat(clean.replace(",", "."));
    return isNaN(num) ? null : num;
  }
  if (clean.includes(".") && clean.includes(",")) {
    // 1.250,50 -> 1250.50
    const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
    return isNaN(num) ? null : num;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function parseIntent(val: string | undefined): KeywordIntent | null {
  if (!val) return null;
  const lower = val.toLowerCase().trim();
  if (lower.includes("transac") || lower.includes("compra")) return "transactional";
  if (lower.includes("comerc") || lower.includes("investig")) return "commercial";
  if (lower.includes("nav") || lower.includes("marca")) return "navigational";
  if (lower.includes("info") || lower.includes("duvida") || lower.includes("pergunta")) return "informational";
  return null;
}

function parseCsvOrText(raw: string): ParsedKeywordRow[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detectar delimitador da primeira linha
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";";

  // Verificar se primeira linha é cabeçalho
  const splitLine = (l: string) => {
    // Split simples respeitando aspas básicas
    const pattern = new RegExp(`(?:^|${delimiter})(?:"([^"]*)"|([^${delimiter}]*))`, "g");
    const fields: string[] = [];
    let match;
    while ((match = pattern.exec(l)) !== null) {
      fields.push((match[1] ?? match[2] ?? "").trim());
    }
    return fields.length > 0 ? fields : l.split(delimiter).map((s) => s.trim().replace(/^["']|["']$/g, ""));
  };

  const headerFields = splitLine(firstLine).map((h) => h.toLowerCase());
  let kwIdx = headerFields.findIndex((h) =>
    ["keyword", "keywords", "palavra", "palavra-chave", "termo", "query", "pesquisa"].includes(h),
  );
  let volIdx = headerFields.findIndex((h) =>
    ["volume", "search volume", "search_volume", "buscas", "volume de busca", "searches"].includes(h),
  );
  let cpcIdx = headerFields.findIndex((h) =>
    ["cpc", "cost per click", "custo por clique", "valor clique"].includes(h),
  );
  let kdIdx = headerFields.findIndex((h) =>
    ["kd", "difficulty", "dificuldade", "keyword difficulty", "seo difficulty", "score"].includes(h),
  );
  let intentIdx = headerFields.findIndex((h) =>
    ["intent", "intencao", "intenção", "tipo"].includes(h),
  );

  const hasHeader = kwIdx !== -1 || volIdx !== -1;
  const startRow = hasHeader ? 1 : 0;
  if (!hasHeader) {
    kwIdx = 0; // Se não tem cabeçalho, assume primeira coluna como keyword
  }

  const results: ParsedKeywordRow[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const fields = splitLine(lines[i]);
    const keyword = fields[kwIdx]?.trim().toLowerCase();
    if (!keyword) continue;

    const row: ParsedKeywordRow = {
      keyword,
      searchVolume: volIdx !== -1 ? parseNumber(fields[volIdx]) : null,
      cpc: cpcIdx !== -1 ? parseNumber(fields[cpcIdx]) : null,
      keywordDifficulty: kdIdx !== -1 ? parseNumber(fields[kdIdx]) : null,
      intent: intentIdx !== -1 ? parseIntent(fields[intentIdx]) : null,
    };
    results.push(row);
  }

  return results;
}

export function KeywordCsvImportDialog({
  open,
  onOpenChange,
  projectId,
  onImportToSearch,
  onImportComplete,
}: Props) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedKeywordRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const rows = parseCsvOrText(content);
        setParsedRows(rows);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setPasteText(text);
    const rows = parseCsvOrText(text);
    setParsedRows(rows);
  };

  const resetState = () => {
    setPasteText("");
    setParsedRows([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSearchImport = () => {
    if (parsedRows.length === 0) return;
    const keywords = parsedRows.map((r) => r.keyword);
    onImportToSearch?.(keywords);
    toast.success(`${keywords.length} palavras-chave importadas para pesquisa!`);
    onOpenChange(false);
    resetState();
  };

  const handleSaveToProject = async () => {
    if (parsedRows.length === 0) return;
    setIsSaving(true);
    try {
      const keywords = parsedRows.map((r) => r.keyword);
      const metrics = parsedRows.map((r) => ({
        keyword: r.keyword,
        searchVolume: r.searchVolume != null ? Math.round(r.searchVolume) : null,
        cpc: r.cpc != null ? r.cpc : null,
        keywordDifficulty: r.keywordDifficulty != null ? Math.round(r.keywordDifficulty) : null,
        intent: r.intent || "unknown",
      }));

      await saveKeywords({
        data: {
          projectId,
          keywords,
          metrics,
        },
      });

      toast.success(`${keywords.length} palavras-chave salvas com sucesso no projeto!`);
      onImportComplete?.();
      onOpenChange(false);
      resetState();
    } catch (err) {
      console.error("Erro ao salvar palavras importadas:", err);
      toast.error("Erro ao salvar palavras-chave no projeto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-emerald-500" />
            Importar Palavras-chave (CSV ou Texto)
          </DialogTitle>
          <DialogDescription>
            Importe listas de palavras-chave exportadas de outras ferramentas (Ubersuggest, Semrush, Google Ads) ou planilhas.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "file" | "paste")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="file">
              <Upload className="size-4 mr-1.5" />
              Arquivo CSV / TSV
            </TabsTrigger>
            <TabsTrigger value="paste">
              <FileText className="size-4 mr-1.5" />
              Colar Lista / Texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="pt-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors bg-muted/20"
            >
              <Upload className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {fileName ? fileName : "Clique para selecionar ou arraste o arquivo CSV"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Suporta .csv, .tsv e .txt (delimitado por vírgula, ponto-e-vírgula ou tabulação)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="paste" className="pt-3">
            <Textarea
              rows={5}
              placeholder="Cole aqui suas palavras-chave (uma por linha ou colunas copiadas do Excel)&#10;Exemplo:&#10;consultoria seo, 1200, 4.50, 35, commercial"
              value={pasteText}
              onChange={(e) => handlePasteChange(e.target.value)}
              className="font-mono text-xs"
            />
          </TabsContent>
        </Tabs>

        {parsedRows.length > 0 && (
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                {parsedRows.length} palavra(s) detectada(s)
              </span>
              <span>
                {parsedRows.filter((r) => r.searchVolume != null).length} com volume
              </span>
            </div>

            <div className="border rounded-md overflow-hidden max-h-36 overflow-y-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/50 text-[11px] border-b text-muted-foreground">
                  <tr>
                    <th className="p-1.5 font-medium">Palavra</th>
                    <th className="p-1.5 font-medium text-right">Vol</th>
                    <th className="p-1.5 font-medium text-right">CPC</th>
                    <th className="p-1.5 font-medium text-right">KD</th>
                    <th className="p-1.5 font-medium text-center">Intenção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {parsedRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="p-1.5 font-medium truncate max-w-[180px]">{row.keyword}</td>
                      <td className="p-1.5 text-right tabular-nums text-muted-foreground">
                        {row.searchVolume != null ? row.searchVolume.toLocaleString() : "N/D"}
                      </td>
                      <td className="p-1.5 text-right tabular-nums text-muted-foreground">
                        {row.cpc != null ? `$${row.cpc.toFixed(2)}` : "N/D"}
                      </td>
                      <td className="p-1.5 text-right tabular-nums text-muted-foreground">
                        {row.keywordDifficulty != null ? row.keywordDifficulty : "N/D"}
                      </td>
                      <td className="p-1.5 text-center text-muted-foreground capitalize">
                        {row.intent || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 5 && (
              <p className="text-[11px] text-muted-foreground text-center">
                + mais {parsedRows.length - 5} palavras na lista
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {onImportToSearch && (
            <Button
              variant="secondary"
              disabled={parsedRows.length === 0}
              onClick={handleSearchImport}
            >
              Pesquisar Palavras
            </Button>
          )}
          <Button
            pending={isSaving}
            disabled={parsedRows.length === 0 || isSaving}
            onClick={handleSaveToProject}
          >
            Salvar no Projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
