"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileDown, FileText, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { CREATE_PURCHASE_ORDER } from "@/graphql/mutations/procurement";
import { parseCsv, rowsToObjects } from "@/components/ui/BulkUpload/csvParser";
import { validateRow, groupErrorsByRow } from "@/components/ui/BulkUpload/clientValidate";
import EditableTable, { type DynamicFieldEntry } from "@/components/ui/BulkUpload/EditableTable";
import {
  buildBulkPOSchema,
  buildPOCsvTemplate,
  vendorLookup,
  itemLookup,
  groupRowsToPOInputs,
  extraPORowErrors,
  type VendorRef,
  type ItemRef,
} from "./bulkPOSchema";
import { buildFieldGuidePdf, buildStarterKitZip, downloadBlob } from "./bulkPOArtifacts";
import BulkPOResults, { type GroupResult } from "./BulkPOResults";

type Stage = "pick" | "review" | "uploading" | "results";
type Row = Record<string, string>;

export default function BulkPOModal({
  open,
  vendors,
  items,
  onClose,
  onFinished,
}: {
  open: boolean;
  vendors: VendorRef[];
  items: ItemRef[];
  onClose: () => void;
  onFinished?: () => void;
}) {
  const [createPO] = useMutation(CREATE_PURCHASE_ORDER);

  const sampleVendor = vendors[0]?.name ?? "";
  const sampleItemCode = items[0]?.code ?? "";
  const schema = useMemo(() => buildBulkPOSchema(sampleVendor, sampleItemCode), [sampleVendor, sampleItemCode]);

  const vendorMap = useMemo(() => vendorLookup(vendors), [vendors]);
  const itemMap = useMemo(() => itemLookup(items), [items]);

  const dynamicOptions = useMemo<Record<string, DynamicFieldEntry>>(
    () => ({
      vendor: {
        options: vendors.map((v) => ({ value: v.name, label: v.name })),
        searchable: true,
      },
      item_code: {
        options: items.map((it) => ({ value: it.code, label: `${it.code} — ${it.name}` })),
        searchable: true,
        // Picking a catalog item fills the item name from the catalog.
        onRowChange: (value): Record<string, string> => {
          const it = itemMap.get(value.trim().toLowerCase());
          return it ? { item_name: it.name } : {};
        },
      },
    }),
    [vendors, items, itemMap],
  );

  const blankRow = (): Row => {
    const r: Row = {};
    schema.fields.forEach((f) => (r[f.name] = ""));
    return r;
  };

  const [stage, setStage] = useState<Stage>("pick");
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<GroupResult[]>([]);
  const [groups, setGroups] = useState(() => groupRowsToPOInputs([], vendorMap, itemMap));
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setStage("pick");
      setRows([]);
      setResults([]);
      setProgress({ done: 0, total: 0 });
    }
  }, [open]);

  const cellErrors = useMemo(() => {
    const errs = rows.flatMap((r, i) => validateRow(schema, i, r, dynamicOptions));
    errs.push(...extraPORowErrors(rows, vendorMap, itemMap));
    return groupErrorsByRow(errs);
  }, [rows, schema, dynamicOptions, vendorMap, itemMap]);
  const errorCount = Object.keys(cellErrors).length;

  const groupCount = useMemo(
    () => new Set(rows.map((r) => (r.po_ref ?? "").trim()).filter(Boolean)).size,
    [rows],
  );

  async function download(make: () => Blob | Promise<Blob>, filename: string) {
    try {
      downloadBlob(await make(), filename);
    } catch {
      toast.error("Could not generate the file");
    }
  }
  const handleTemplate = () =>
    download(() => new Blob([buildPOCsvTemplate(sampleVendor, sampleItemCode)], { type: "text/csv;charset=utf-8" }), "purchase_orders_template.csv");
  const handleGuide = () => download(buildFieldGuidePdf, "purchase_orders_bulk_upload_guide.pdf");
  const handleStarterKit = () => download(() => buildStarterKitZip(sampleVendor, sampleItemCode), "purchase_orders_bulk_upload_starter.zip");

  function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result || ""));
      if (parsed.header.length === 0) {
        toast.error("CSV looks empty");
        return;
      }
      const objs = rowsToObjects(parsed.header, parsed.rows);
      const normalized = objs.map((r) => {
        const out: Row = {};
        schema.fields.forEach((f) => (out[f.name] = r[f.name] ?? ""));
        return out;
      });
      setRows(normalized.length ? normalized : [blankRow()]);
      setStage("review");
    };
    reader.readAsText(file);
  }

  function startBlank() {
    setRows([blankRow()]);
    setStage("review");
  }

  const setCell = (i: number, field: string, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const setCells = (i: number, updates: Row) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...updates } : r)));
  const deleteRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const addRow = () => setRows((prev) => [...prev, blankRow()]);

  async function handleSubmit() {
    if (rows.length === 0 || errorCount > 0) {
      toast.error("Fix the highlighted cells first");
      return;
    }
    const built = groupRowsToPOInputs(rows, vendorMap, itemMap);
    if (built.length === 0) {
      toast.error("Nothing to create — set a PO Ref on each row");
      return;
    }
    setGroups(built);
    setStage("uploading");
    setProgress({ done: 0, total: built.length });
    const acc: GroupResult[] = [];
    for (let i = 0; i < built.length; i++) {
      try {
        const res = await createPO({ variables: { input: built[i].input } });
        acc.push({ index: i, success: true, poNumber: res.data?.createPurchaseOrder?.poNumber });
      } catch (e: unknown) {
        acc.push({ index: i, success: false, error: e instanceof Error ? e.message : "Failed" });
      }
      setProgress({ done: i + 1, total: built.length });
    }
    setResults(acc);
    setStage("results");
    const ok = acc.filter((r) => r.success).length;
    toast.success(`Created ${ok} of ${built.length} purchase orders`);
    onFinished?.();
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="xl" onClose={onClose} accent="green">
        <DialogHeader icon={<Upload size={18} />}>
          <DialogTitle>Bulk Add Purchase Orders</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{schema.description}</p>
        </DialogHeader>

        <DialogBody className="min-h-[200px]">
          {stage === "pick" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={handleTemplate} className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left">
                  <FileDown size={20} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">CSV template</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Headers and example rows.</div>
                  </div>
                </button>
                <button onClick={handleGuide} className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left">
                  <FileText size={20} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">Field guide (PDF)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Column meanings, how grouping works.</div>
                  </div>
                </button>
                <button onClick={handleStarterKit} className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left">
                  <Archive size={20} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">Starter kit (ZIP)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">CSV + instructions.txt.</div>
                  </div>
                </button>
              </div>

              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Upload a filled-in CSV</p>
                <p className="text-xs text-muted-foreground mb-4">
                  One row per line item. Rows that share a PO Ref become one order. We&apos;ll show an editable preview before anything is saved.
                </p>
                <button onClick={() => fileRef.current?.click()} className="btn-primary">Choose file…</button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
                <p className="text-[11px] text-muted-foreground/70 mt-3">
                  Or{" "}
                  <button onClick={startBlank} className="text-primary hover:underline font-medium">start with a blank row</button>{" "}
                  and type lines in.
                </p>
              </div>
            </div>
          )}

          {stage === "review" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Edit any cell. Invalid cells are highlighted in red; hover to see why. Rows sharing a PO Ref are merged into one order.
              </p>
              <EditableTable
                schema={schema}
                rows={rows}
                cellErrors={cellErrors}
                dynamicOptions={dynamicOptions}
                onChangeCell={setCell}
                onChangeCells={setCells}
                onDeleteRow={deleteRow}
                onAddRow={addRow}
              />
            </div>
          )}

          {stage === "uploading" && (
            <div className="py-10 space-y-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Creating {progress.done} of {progress.total} purchase orders</span>
                <span className="text-muted-foreground">
                  {progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {stage === "results" && <BulkPOResults results={results} groups={groups} />}
        </DialogBody>

        <DialogFooter>
          {stage === "pick" && <button className="btn-secondary" onClick={onClose}>Close</button>}
          {stage === "review" && (
            <>
              <button className="btn-ghost" onClick={() => setStage("pick")}>Back</button>
              <div className="flex-1 ml-2 text-xs text-muted-foreground">
                {errorCount > 0 ? (
                  <span className="text-red-600 font-medium">Fix {errorCount} row(s) with errors</span>
                ) : (
                  <span>{rows.length} line(s) → {groupCount} order(s)</span>
                )}
              </div>
              <button className="btn-primary" disabled={rows.length === 0 || errorCount > 0} onClick={handleSubmit}>
                Create {groupCount || ""}
              </button>
            </>
          )}
          {stage === "uploading" && <button className="btn-ghost" disabled>Creating…</button>}
          {stage === "results" && <button className="btn-primary" onClick={onClose}>Done</button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
