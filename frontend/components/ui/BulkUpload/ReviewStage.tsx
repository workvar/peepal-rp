"use client";

import { type BulkSchema } from "@/api/services/bulk";
import EditableTable, { type DynamicFieldEntry } from "./EditableTable";

interface ReviewStageProps {
  schema: BulkSchema;
  rows: Record<string, string>[];
  cellErrors: Record<number, Record<string, string>>;
  onChangeCell: (r: number, f: string, v: string) => void;
  onChangeCells?: (r: number, updates: Record<string, string>) => void;
  onDeleteRow: (r: number) => void;
  onDeleteSelected: () => void;
  onAddRow: () => void;
  dynamicOptions?: Record<string, DynamicFieldEntry>;
  selectedRows: Set<number>;
  onToggleRow: (i: number) => void;
  onToggleAll: () => void;
}

// Second wizard stage: editable preview of the parsed CSV rows.
export default function ReviewStage(props: ReviewStageProps) {
  const selCount = props.selectedRows.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Double-click any cell to edit. Cells with invalid values are highlighted in red — hover to see why.
        </p>
        {selCount > 0 && (
          <button
            type="button"
            onClick={props.onDeleteSelected}
            className="text-xs text-red-600 hover:text-red-700 font-medium border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors shrink-0 ml-3"
          >
            Delete {selCount} selected
          </button>
        )}
      </div>
      <EditableTable
        schema={props.schema}
        rows={props.rows}
        cellErrors={props.cellErrors}
        onChangeCell={props.onChangeCell}
        onChangeCells={props.onChangeCells}
        onDeleteRow={props.onDeleteRow}
        onAddRow={props.onAddRow}
        dynamicOptions={props.dynamicOptions}
        selectedRows={props.selectedRows}
        onToggleRow={props.onToggleRow}
        onToggleAll={props.onToggleAll}
      />
    </div>
  );
}
