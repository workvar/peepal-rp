"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeLayout, NodePos } from "./layout";

interface View { tx: number; ty: number; scale: number }

/** Holds node positions + pan/zoom and exposes pointer handlers for the canvas. */
export function useDbCanvas() {
  const base = useRef(computeLayout()).current;
  const [positions, setPositions] = useState<Record<string, NodePos>>(() => ({ ...base.positions }));
  const [view, setView] = useState<View>({ tx: 24, ty: 24, scale: 0.65 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<
    | { kind: "pan"; sx: number; sy: number; otx: number; oty: number }
    | { kind: "node"; name: string; sx: number; sy: number; ox: number; oy: number }
    | null
  >(null);

  const resetLayout = useCallback(() => {
    setPositions({ ...computeLayout().positions });
  }, []);

  const fitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 60;
    const sx = (el.clientWidth - pad) / base.worldW;
    const sy = (el.clientHeight - pad) / base.worldH;
    const scale = Math.min(sx, sy, 1);
    setView({
      scale,
      tx: (el.clientWidth - base.worldW * scale) / 2,
      ty: 24,
    });
  }, [base.worldW, base.worldH]);

  const zoomBy = useCallback((factor: number) => {
    setView((v) => {
      const el = containerRef.current;
      const cx = el ? el.clientWidth / 2 : 0;
      const cy = el ? el.clientHeight / 2 : 0;
      const scale = Math.min(2, Math.max(0.2, v.scale * factor));
      const k = scale / v.scale;
      return { scale, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k };
    });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView((v) => {
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const scale = Math.min(2, Math.max(0.2, v.scale * factor));
      const k = scale / v.scale;
      return { scale, tx: mx - (mx - v.tx) * k, ty: my - (my - v.ty) * k };
    });
  }, []);

  const startPan = useCallback((e: React.PointerEvent) => {
    drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, otx: view.tx, oty: view.ty };
  }, [view.tx, view.ty]);

  const startNode = useCallback((e: React.PointerEvent, name: string) => {
    e.stopPropagation();
    const p = positions[name];
    drag.current = { kind: "node", name, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
  }, [positions]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (d.kind === "pan") {
        setView((v) => ({ ...v, tx: d.otx + (e.clientX - d.sx), ty: d.oty + (e.clientY - d.sy) }));
      } else {
        const dx = (e.clientX - d.sx) / view.scale;
        const dy = (e.clientY - d.sy) / view.scale;
        setPositions((p) => ({ ...p, [d.name]: { ...p[d.name], x: d.ox + dx, y: d.oy + dy } }));
      }
    };
    const up = () => { drag.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [view.scale]);

  return {
    base, positions, view, containerRef,
    onWheel, startPan, startNode,
    resetLayout, fitView, zoomBy,
  };
}
