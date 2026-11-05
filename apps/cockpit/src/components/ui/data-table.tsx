"use client";

import {
  useTable,
  tableFeatures,
  rowSortingFeature,
  createSortedRowModel,
  sortFn_alphanumeric,
  sortFn_text,
  sortFn_datetime,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, datetime: sortFn_datetime },
  columnMeta: {} as { numeric?: boolean },
});
export type DataColumn<T extends RowData> = ColumnDef<typeof TABLE_FEATURES, T>;

/** TanStack owns row modelling and sorting; this layer supplies the cockpit's table chrome. */
export function DataTable<T extends RowData>({
  data,
  columns,
  label,
  empty = "No records available.",
}: {
  data: T[];
  columns: DataColumn<T>[];
  label: string;
  empty?: string;
}) {
  const table = useTable({ features: TABLE_FEATURES, data, columns });
  return (
    <div
      role="region"
      aria-label={`${label} scroll area`}
      tabIndex={0}
      className="max-h-96 overflow-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring"
    >
      <table aria-label={label} className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-card text-muted-foreground">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b">
              {group.headers.map((header) => {
                const numeric = header.column.columnDef.meta?.numeric;
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
                    }
                    className={cn(
                      "whitespace-nowrap p-2 text-left font-medium",
                      numeric && "text-right",
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        className={numeric ? "ml-auto" : "-ml-2"}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {<table.FlexRender header={header} />}
                        <span aria-hidden>
                          {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
                        </span>
                      </Button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
              {row.getAllCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    "p-2",
                    cell.column.columnDef.meta?.numeric && "text-right font-mono tabular-nums",
                  )}
                >
                  {<table.FlexRender cell={cell} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="p-4 text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}
