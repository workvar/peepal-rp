// Deterministic auto-layout: each module becomes a vertical column of cards,
// columns flow left-to-right and wrap into bands. Pure math, no React.
import { TABLES, MODULES, Table } from "./schema";

export const CARD_W = 196;
const HEADER = 48;
const ROW_H = 15;
const CARD_PAD = 14;
const GAP_X = 64;
const GAP_Y = 30;
const LABEL_H = 26;
const MAX_X = 1850;
const START_X = 48;
const START_Y = 48;
const BAND_GAP = 64;

export interface NodePos { x: number; y: number; w: number; h: number }
export interface ModuleBox { name: string; color: string; x: number; y: number; w: number; h: number }

/** Number of FK rows a card shows (drives its height). */
export function fkColumns(t: Table) {
  return t.columns.filter((c) => c.fk);
}

export function cardHeight(t: Table) {
  const fks = Math.min(fkColumns(t).length, 6);
  return HEADER + fks * ROW_H + CARD_PAD;
}

export interface LayoutResult {
  positions: Record<string, NodePos>;
  moduleBoxes: ModuleBox[];
  worldW: number;
  worldH: number;
}

export function computeLayout(): LayoutResult {
  const positions: Record<string, NodePos> = {};
  const moduleBoxes: ModuleBox[] = [];

  let x = START_X;
  let y = START_Y;
  let bandH = 0;
  let worldW = 0;

  for (const mod of MODULES) {
    const tables = TABLES.filter((t) => t.module === mod.name);
    if (!tables.length) continue;

    let curY = y + LABEL_H;
    for (const t of tables) {
      const h = cardHeight(t);
      positions[t.name] = { x, y: curY, w: CARD_W, h };
      curY += h + GAP_Y;
    }
    const moduleHeight = curY - y - GAP_Y + 12;
    moduleBoxes.push({ name: mod.name, color: mod.color, x: x - 12, y: y - 6, w: CARD_W + 24, h: moduleHeight + LABEL_H });

    bandH = Math.max(bandH, moduleHeight + LABEL_H);
    worldW = Math.max(worldW, x + CARD_W);
    x += CARD_W + GAP_X;

    if (x > MAX_X) {
      x = START_X;
      y += bandH + BAND_GAP;
      bandH = 0;
    }
  }

  const worldH = y + bandH + START_Y;
  return { positions, moduleBoxes, worldW: worldW + START_X, worldH };
}
