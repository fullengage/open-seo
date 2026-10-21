import {
  DataTableFilterGroup,
  DataTableFilterPanel,
  DataTableFilterToggle,
  DataTableRangeFilter,
  DataTableToolbar,
} from "@/client/components/table/DataTableToolbar";
import { Input } from "@/client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import type {
  PagesFilters,
  PerformanceFilters,
} from "@/client/features/audit/results/AuditResultsTableFilterLogic";

export function PagesFilterBar({
  filters,
  onChange,
  activeFilterCount,
  onReset,
}: {
  filters: PagesFilters;
  onChange: (filters: PagesFilters) => void;
  activeFilterCount: number;
  onReset: () => void;
}) {
  return (
    <DataTableFilterPanel activeCount={activeFilterCount} onReset={onReset}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <TextFilter
          label="Buscar"
          value={filters.query}
          placeholder="URL, title, meta"
          onChange={(query) => onChange({ ...filters, query })}
        />
        <SelectFilter
          label="Situação"
          value={filters.status}
          onChange={(status) => onChange({ ...filters, status })}
          options={[
            ["all", "All"],
            ["ok", "2xx"],
            ["redirect", "3xx"],
            ["error", "4xx/5xx"],
            ["missing", "Ausente"],
          ]}
        />
        <SelectFilter
          label="Resultado da leitura"
          value={filters.fetchClass}
          onChange={(fetchClass) => onChange({ ...filters, fetchClass })}
          options={[
            ["all", "All"],
            ["ok", "Lida"],
            ["error", "Falhou"],
            ["blocked", "Bloqueada"],
            ["rate_limited", "Limitada pelo site"],
          ]}
        />
        <SelectFilter
          label="Texto alternativo"
          value={filters.missingAlt}
          onChange={(missingAlt) => onChange({ ...filters, missingAlt })}
          options={[
            ["all", "All"],
            ["yes", "Sem texto alternativo"],
            ["no", "Com texto alternativo"],
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <RangeFilter
          label="Palavras"
          min={filters.minWords}
          max={filters.maxWords}
          onMinChange={(minWords) => onChange({ ...filters, minWords })}
          onMaxChange={(maxWords) => onChange({ ...filters, maxWords })}
        />
        <RangeFilter
          label="Tempo (ms)"
          min={filters.minResponseMs}
          max={filters.maxResponseMs}
          onMinChange={(minResponseMs) =>
            onChange({ ...filters, minResponseMs })
          }
          onMaxChange={(maxResponseMs) =>
            onChange({ ...filters, maxResponseMs })
          }
        />
      </div>
    </DataTableFilterPanel>
  );
}

export function PerformanceFilterBar({
  filters,
  onChange,
  activeFilterCount,
  onReset,
}: {
  filters: PerformanceFilters;
  onChange: (filters: PerformanceFilters) => void;
  activeFilterCount: number;
  onReset: () => void;
}) {
  return (
    <DataTableFilterPanel activeCount={activeFilterCount} onReset={onReset}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <TextFilter
          label="Buscar"
          value={filters.query}
          placeholder="URL"
          onChange={(query) => onChange({ ...filters, query })}
        />
        <SelectFilter
          label="Aparelho"
          value={filters.device}
          onChange={(device) => onChange({ ...filters, device })}
          options={[
            ["all", "All"],
            ["desktop", "Desktop"],
            ["mobile", "Celular"],
          ]}
        />
        <SelectFilter
          label="Situação"
          value={filters.status}
          onChange={(status) => onChange({ ...filters, status })}
          options={[
            ["all", "All"],
            ["ok", "OK"],
            ["failed", "Falhou"],
          ]}
        />
        <TextFilter
          label="Carregamento máx. (s)"
          value={filters.maxLcpSeconds}
          placeholder="2.5"
          type="number"
          onChange={(maxLcpSeconds) => onChange({ ...filters, maxLcpSeconds })}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <RangeFilter
          label="Velocidade"
          min={filters.minPerf}
          max={filters.maxPerf}
          onMinChange={(minPerf) => onChange({ ...filters, minPerf })}
          onMaxChange={(maxPerf) => onChange({ ...filters, maxPerf })}
        />
        <RangeFilter
          label="SEO"
          min={filters.minSeo}
          max={filters.maxSeo}
          onMinChange={(minSeo) => onChange({ ...filters, minSeo })}
          onMaxChange={(maxSeo) => onChange({ ...filters, maxSeo })}
        />
      </div>
    </DataTableFilterPanel>
  );
}

/** The toolbar above a results table: the filter toggle and the row count. */
export function ResultsTableToolbar({
  showFilters,
  onToggle,
  activeFilterCount,
  resultCount,
  totalCount,
}: {
  showFilters: boolean;
  onToggle: () => void;
  activeFilterCount: number;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <DataTableToolbar
      actions={
        <span className="text-sm tabular-nums text-muted-foreground">
          {resultCount.toLocaleString()} of {totalCount.toLocaleString()}
        </span>
      }
    >
      <DataTableFilterToggle
        open={showFilters}
        activeCount={activeFilterCount}
        onToggle={onToggle}
      />
    </DataTableToolbar>
  );
}

export function countActiveFilters<TFilters extends Record<string, string>>(
  filters: TFilters,
  emptyFilters: TFilters,
) {
  return Object.keys(filters).reduce((count, key) => {
    const filterKey = key as keyof TFilters;
    return filters[filterKey] !== emptyFilters[filterKey] ? count + 1 : count;
  }, 0);
}

function TextFilter({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
}) {
  return (
    <DataTableFilterGroup label={label}>
      <Input
        aria-label={label}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </DataTableFilterGroup>
  );
}

function RangeFilter({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <DataTableRangeFilter
      label={label}
      min={{ value: min, onChange: (event) => onMinChange(event.target.value) }}
      max={{ value: max, onChange: (event) => onMaxChange(event.target.value) }}
    />
  );
}

function SelectFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  const items = options.map(([optionValue, optionLabel]) => ({
    value: optionValue,
    label: optionLabel,
  }));
  return (
    <DataTableFilterGroup label={label}>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
      >
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DataTableFilterGroup>
  );
}
