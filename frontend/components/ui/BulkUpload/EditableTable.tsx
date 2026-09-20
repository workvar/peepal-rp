"use client";

import { createPortal } from "react-dom";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { BulkField, BulkSchema } from "@/api/services/bulk";

export interface DynamicOption { label: string; value: string; }

// Per-field config: static array OR a function that receives the current row
// and returns options (enables dependent dropdowns like batch → course).
export interface DynamicFieldConfig {
  options: DynamicOption[] | ((row: Record<string, string>) => DynamicOption[]);
  searchable?: boolean;
  /** When a value is selected, return additional fields to set on the same row (auto-populate). */
  onRowChange?: (value: string, row: Record<string, string>) => Record<string, string>;
  /**
   * When true, a non-empty value that isn't one of the resolved options is
   * flagged as an error (red cell). Matched values are still normalized to the
   * option's value on import; only genuinely unknown values are rejected.
   */
  strict?: boolean;
}

export type DynamicFieldEntry = DynamicOption[] | DynamicFieldConfig;

function resolveEntry(
  entry: DynamicFieldEntry,
  row: Record<string, string>
): { opts: DynamicOption[]; searchable: boolean; onRowChange?: DynamicFieldConfig["onRowChange"] } {
  if (Array.isArray(entry)) return { opts: entry, searchable: false };
  const raw = typeof entry.options === "function" ? entry.options(row) : entry.options;
  return { opts: raw, searchable: entry.searchable ?? false, onRowChange: entry.onRowChange };
}

interface EditableTableProps {
  schema: BulkSchema;
  rows: Record<string, string>[];
  cellErrors: Record<number, Record<string, string>>;
  onChangeCell: (rowIdx: number, field: string, value: string) => void;
  /** Update multiple fields at once on a single row (for auto-populate). */
  onChangeCells?: (rowIdx: number, updates: Record<string, string>) => void;
  onDeleteRow: (rowIdx: number) => void;
  onAddRow: () => void;
  readOnly?: boolean;
  dynamicOptions?: Record<string, DynamicFieldEntry>;
  selectedRows?: Set<number>;
  onToggleRow?: (i: number) => void;
  onToggleAll?: () => void;
}

const ROW_HEIGHT = 38;
const OVERSCAN = 8;

export default function EditableTable({
  schema,
  rows,
  cellErrors,
  onChangeCell,
  onChangeCells,
  onDeleteRow,
  onAddRow,
  readOnly,
  dynamicOptions = {},
  selectedRows = new Set(),
  onToggleRow,
  onToggleAll,
}: EditableTableProps) {
  const allSelected = rows.length > 0 && selectedRows.size === rows.length;
  const someSelected = selectedRows.size > 0 && !allSelected;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(440);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
    const onResize = () => setViewportHeight(el.clientHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    if (headerRef.current)
      headerRef.current.style.transform = `translateX(-${el.scrollLeft}px)`;
  }, []);

  const totalHeight = rows.length * ROW_HEIGHT;
  const firstVisible = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const lastVisible = Math.min(rows.length, firstVisible + visibleCount);

  const visibleRows = useMemo(() => {
    const out: Array<{ index: number; row: Record<string, string> }> = [];
    for (let i = firstVisible; i < lastVisible; i++) {
      if (rows[i]) out.push({ index: i, row: rows[i] });
    }
    return out;
  }, [rows, firstVisible, lastVisible]);

  const gridTemplate = useMemo(
    () => "36px 56px " + schema.fields.map(() => "180px").join(" ") + " 48px",
    [schema.fields]
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      {/* Header */}
      <div
        ref={headerRef}
        className="grid bg-muted/60 border-b border-border text-xs font-semibold text-foreground/80"
        style={{ gridTemplateColumns: gridTemplate, willChange: "transform" }}
      >
        {/* Select-all checkbox */}
        <div className="px-2 py-2 border-r border-border flex items-center justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={onToggleAll}
            className="cursor-pointer accent-primary"
            title="Select all"
          />
        </div>
        <div className="px-2 py-2 border-r border-border text-center">#</div>
        {schema.fields.map((f) => <HeaderCell key={f.name} field={f} />)}
        <div className="px-2 py-2 text-center" />
      </div>

      {/* Virtualized body */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="overflow-auto"
        style={{ height: 440 }}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          {visibleRows.map(({ index, row }) => {
            const top = index * ROW_HEIGHT;
            const errs = cellErrors[index] ?? {};
            return (
              <div
                key={index}
                className={`grid text-xs absolute left-0 right-0 ${selectedRows.has(index) ? "bg-primary/5" : ""}`}
                style={{ gridTemplateColumns: gridTemplate, top, height: ROW_HEIGHT }}
              >
                {/* Row checkbox */}
                <div className="px-2 flex items-center justify-center border-b border-r border-border/60">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(index)}
                    onChange={() => onToggleRow?.(index)}
                    className="cursor-pointer accent-primary"
                  />
                </div>
                <div className="px-2 flex items-center justify-center border-b border-r border-border/60 text-muted-foreground font-mono">
                  {index + 1}
                </div>
                {schema.fields.map((f) => {
                  const entry = dynamicOptions[f.name];
                  const { opts, searchable, onRowChange } = entry
                    ? resolveEntry(entry, row)
                    : { opts: [], searchable: false, onRowChange: undefined };
                  return (
                    <Cell
                      key={f.name}
                      field={f}
                      value={row[f.name] ?? ""}
                      error={errs[f.name]}
                      readOnly={!!readOnly}
                      onChange={(v) => onChangeCell(index, f.name, v)}
                      onMultiChange={
                        onRowChange && onChangeCells
                          ? (v) => {
                              const extra = onRowChange(v, row);
                              onChangeCells(index, { [f.name]: v, ...extra });
                            }
                          : undefined
                      }
                      dynamicOpts={entry ? opts : undefined}
                      searchable={searchable}
                    />
                  );
                })}
                <div className="flex items-center justify-center border-b border-border/60">
                  {!readOnly && (
                    <button
                      onClick={() => onDeleteRow(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <span>
          {rows.length} row{rows.length === 1 ? "" : "s"}
          {selectedRows.size > 0 && (
            <span className="ml-2 text-primary font-medium">({selectedRows.size} selected)</span>
          )}
          {rows.length > visibleRows.length && (
            <span className="ml-2 text-muted-foreground/60">
              · rendering {visibleRows.length} visible (scroll to see more)
            </span>
          )}
        </span>
        {!readOnly && (
          <button onClick={onAddRow} className="text-primary hover:underline font-medium">
            + Add empty row
          </button>
        )}
      </div>
    </div>
  );
}

function HeaderCell({ field }: { field: BulkField }) {
  return (
    <div
      className="px-2 py-2 border-r border-border truncate"
      title={`${field.label} (${field.type}${field.required ? ", required" : ""})`}
    >
      {field.label}
      {field.required && <span className="text-red-500 ml-0.5">*</span>}
    </div>
  );
}

function Cell({
  field,
  value,
  error,
  onChange,
  onMultiChange,
  readOnly,
  dynamicOpts,
  searchable,
}: {
  field: BulkField;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  /** Called instead of onChange when this field has auto-populate side-effects. */
  onMultiChange?: (v: string) => void;
  readOnly: boolean;
  dynamicOpts?: DynamicOption[];
  searchable?: boolean;
}) {
  const isEnum = field.type === "enum" && field.allowed_values && field.allowed_values.length > 0;
  // hasDynamic is true whenever a dynamic entry exists, even if the resolved
  // list is currently empty (e.g. batch before a course is chosen).
  const hasDynamic = dynamicOpts !== undefined;
  const inputType =
    field.type === "int" || field.type === "float" ? "number"
    : field.type === "date" ? "date"
    : "text";

  if (hasDynamic && searchable) {
    return (
      <SearchableCell
        value={value}
        options={dynamicOpts!}
        error={error}
        readOnly={readOnly}
        onChange={onMultiChange ?? onChange}
      />
    );
  }

  return (
    <div className="border-r border-b border-border/60" title={error}>
      {hasDynamic ? (
        <select
          disabled={readOnly}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cellClass(error)}
        >
          <option value="">—</option>
          {dynamicOpts!.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : isEnum ? (
        <select
          disabled={readOnly}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cellClass(error)}
        >
          <option value="" disabled={field.required}>—</option>
          {(field.allowed_values ?? []).map((av) => (
            <option key={av} value={av}>{av}</option>
          ))}
        </select>
      ) : (
        <input
          readOnly={readOnly}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cellClass(error)}
          placeholder={
            field.type === "daterange" ? "YYYY-MM-DD or start..end"
            : (field.example || "")
          }
        />
      )}
    </div>
  );
}

// Portal-based searchable dropdown — avoids being clipped by overflow:auto on the scroller.
function SearchableCell({
  value,
  options,
  error,
  readOnly,
  onChange,
}: {
  value: string;
  options: DynamicOption[];
  error?: string;
  readOnly: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const cellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180 });

  const currentLabel = options.find((o) => o.value === value)?.label ?? value;
  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  function openDropdown() {
    if (readOnly) return;
    const rect = cellRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom, left: rect.left, width: rect.width });
    // Seed the search with the current selection so the list opens narrowed to
    // the matched option rather than every option. The text is selected on
    // focus, so the user can immediately type to search for a different one.
    setQuery(value ? currentLabel : "");
    setOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function handleDown(e: MouseEvent) {
      const portal = document.getElementById("__bulk_search_portal__");
      if (cellRef.current?.contains(e.target as Node)) return;
      if (portal?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [open]);

  return (
    <div ref={cellRef} className="border-r border-b border-border/60 h-full" title={error}>
      <button
        type="button"
        onClick={openDropdown}
        disabled={readOnly}
        className={[
          "w-full h-full px-2 text-xs text-left truncate focus:outline-none focus:ring-1 focus:ring-primary",
          error ? "ring-1 ring-red-500 bg-red-50/60 dark:bg-red-950/30" : "",
          value ? "text-foreground" : "text-muted-foreground",
        ].join(" ")}
      >
        {currentLabel || "—"}
      </button>

      {open &&
        createPortal(
          <div
            id="__bulk_search_portal__"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: Math.max(pos.width, 260),
              zIndex: 9999,
            }}
            className="bg-popover border border-border rounded-md shadow-lg overflow-hidden"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && filtered.length > 0) select(filtered[0].value);
              }}
              placeholder="Search…"
              className="w-full px-2 py-1.5 text-xs border-b border-border bg-background outline-none"
            />
            <div className="max-h-48 overflow-y-auto">
              <button
                type="button"
                onMouseDown={() => select("")}
                className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                — (none)
              </button>
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={() => select(opt.value)}
                  className={[
                    "w-full text-left px-2 py-1.5 text-xs hover:bg-muted",
                    opt.value === value ? "bg-primary/10 font-medium" : "",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-2 py-2 text-xs text-muted-foreground">No matches</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function cellClass(error?: string) {
  return (
    "w-full h-full px-2 text-xs bg-transparent focus:outline-none focus:ring-1 " +
    (error
      ? "ring-1 ring-red-500 bg-red-50/60 dark:bg-red-950/30 text-foreground"
      : "focus:ring-primary")
  );
}
