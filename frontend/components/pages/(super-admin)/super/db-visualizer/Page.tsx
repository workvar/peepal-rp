"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { MODULES, TABLES, EDGES } from "./schema";
import { useDbCanvas } from "./useDbCanvas";
import Canvas from "./Canvas";
import Toolbar from "./Toolbar";
import DetailsPanel from "./DetailsPanel";

/** Super-admin DB Visualizer: interactive canvas of every table and relation. */
export default function DbVisualizerPage() {
  const canvas = useDbCanvas();
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const colorOf = useMemo(() => {
    const map = new Map(MODULES.map((m) => [m.name, m.color]));
    return (mod: string) => map.get(mod) || "#94a3b8";
  }, []);

  const activeTable = TABLES.find((t) => t.name === active) || null;
  const effectiveQuery = query || activeModule || "";

  useEffect(() => {
    const t = setTimeout(() => canvas.fitView(), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = (name: string) => {
    setActive(name);
    setQuery("");
    setActiveModule(null);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Database Visualizer"
        subtitle={`${TABLES.length} tables · ${EDGES.length} relationships · ${MODULES.length} modules`}
      />

      <Toolbar
        query={query}
        setQuery={(q) => { setQuery(q); setActiveModule(null); }}
        onZoomIn={() => canvas.zoomBy(1.2)}
        onZoomOut={() => canvas.zoomBy(0.8)}
        onFit={canvas.fitView}
        onReset={canvas.resetLayout}
        activeModule={activeModule}
        setActiveFilter={(m) => { setActiveModule(m); setQuery(""); }}
      />

      <div className="relative flex-1 min-h-[520px] rounded-xl border border-border overflow-hidden">
        <Canvas
          canvas={canvas}
          colorOf={colorOf}
          active={active}
          setActive={setActive}
          query={effectiveQuery}
        />
        <DetailsPanel table={activeTable} color={activeTable ? colorOf(activeTable.module) : "#000"} onClose={() => setActive(null)} onJump={jump} />
        <div className="absolute bottom-2 left-3 text-[10.5px] text-muted-foreground bg-card/80 px-2 py-1 rounded pointer-events-none">
          Scroll to zoom · drag canvas to pan · drag a card to move · click a card for details
        </div>
      </div>
    </div>
  );
}
