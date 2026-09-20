"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { BookOpen, Library, Layers, AlertTriangle } from "lucide-react";
import type { LibraryBook } from "@/types";

// A book counts as "placed" once it has a rack or a shelf. Everything else lands
// in the unplaced bucket so the librarian can see what still needs arranging.
const trim = (s?: string) => (s ?? "").trim();
const isPlaced = (b: LibraryBook) => !!(trim(b.rack) || trim(b.shelf));
const byNumericName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

export default function LibraryVisualizer() {
  const { books, loading } = useAppSelector((s) => s.library);

  const placed = useMemo(() => books.filter(isPlaced), [books]);
  const unplaced = useMemo(() => books.filter((b) => !isPlaced(b)), [books]);

  // rack -> shelf -> books[]
  const racks = useMemo(() => {
    const m: Record<string, Record<string, LibraryBook[]>> = {};
    for (const b of placed) {
      const rk = trim(b.rack) || "(no rack)";
      const sh = trim(b.shelf) || "(no shelf)";
      (m[rk] ||= {});
      (m[rk][sh] ||= []).push(b);
    }
    return m;
  }, [placed]);

  const rackNames = useMemo(() => Object.keys(racks).sort(byNumericName), [racks]);
  const totalCopies = useMemo(
    () => books.reduce((s, b) => s + (b.total_copies || 0), 0),
    [books]
  );

  if (loading && books.length === 0) return <LoadingSpinner />;
  if (books.length === 0) {
    return (
      <div className="card p-8 text-center text-muted-foreground">
        Add books with a rack and shelf to see the arrangement map.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Titles" value={books.length} />
        <Stat label="Copies" value={totalCopies} />
        <Stat label="Racks" value={rackNames.filter((r) => r !== "(no rack)").length} accent="text-blue-500" />
        <Stat label="Placed" value={placed.length} accent="text-emerald-500" />
        <Stat label="Unplaced" value={unplaced.length} accent="text-amber-500" />
      </div>

      {/* Racks and their shelves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rackNames.map((rackName) => {
          const shelves = racks[rackName];
          const shelfNames = Object.keys(shelves).sort(byNumericName);
          const titleCount = shelfNames.reduce((s, sh) => s + shelves[sh].length, 0);
          return (
            <div key={rackName} className="card p-4 border-l-4 border-l-primary/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Library size={16} className="text-muted-foreground shrink-0" />
                  <h3 className="font-semibold truncate">Rack {rackName}</h3>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {shelfNames.length} shelf{shelfNames.length === 1 ? "" : "ves"} · {titleCount} title{titleCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {shelfNames.map((sh) => (
                  <div key={sh}>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                      <Layers size={12} className="shrink-0" />
                      Shelf {sh}
                      <span className="text-foreground/40">({shelves[sh].length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {shelves[sh]
                        .slice()
                        .sort((a, b) => a.title.localeCompare(b.title))
                        .map((b) => (
                          <BookRow key={b.id} book={b} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unplaced books */}
      <div>
        <h3 className="font-semibold mb-1 flex items-center gap-2 text-amber-600">
          <AlertTriangle size={15} />
          Unplaced books
          <span className="text-sm font-normal text-muted-foreground">({unplaced.length})</span>
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          No rack or shelf set yet. Edit a book to give it a location and it will appear on the map.
        </p>
        {unplaced.length === 0 ? (
          <div className="card p-4 text-sm text-muted-foreground">Every book has a shelf location.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unplaced.map((b) => (
              <div key={b.id} className="card p-3 border-l-4 border-l-amber-500 flex items-center gap-3">
                <BookOpen size={16} className="text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{b.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.author}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookRow({ book }: { book: LibraryBook }) {
  const avail = book.available_copies ?? 0;
  const total = book.total_copies ?? 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <BookOpen size={15} className="text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{book.title}</span>
          <Badge variant={avail <= 0 ? "destructive" : "secondary"} className="shrink-0">
            {avail}/{total}
          </Badge>
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{book.author}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted-foreground uppercase mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
