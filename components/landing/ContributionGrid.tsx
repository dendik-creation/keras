"use client";

/**
 * ContributionGrid — v2, performance-first
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture:
 *   • Bottom-anchored, 40% hero height, fades upward via CSS mask
 *   • 300–500 cells desktop / 200–350 tablet / 120–220 mobile
 *   • 96–98% static (no animation), 2–4% animate via CSS keyframes
 *   • Single shared @keyframes kg-blink (defined in globals.css)
 *     — per-cell delay + duration set inline, opacity values via CSS custom props
 *   • Zero requestAnimationFrame, zero setInterval, zero pointer tracking
 *   • useMemo generates cell data once — stable across re-renders
 *   • Cells are static JSX — no reconciliation after mount
 */

import { useMemo } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CELL_PX = 90;   // cell size, px
const GAP_PX  = 5;    // gap between cells, px
const STEP    = CELL_PX + GAP_PX;

// Grid size targets — tuned to avoid cell count blow-up
const GRID = {
  desktop: { cols: 52, rows: 8  },  // ~416 cells
  tablet:  { cols: 36, rows: 7  },  // ~252 cells
  mobile:  { cols: 22, rows: 7  },  // ~154 cells
} as const;

// Static opacity variants (probability-weighted distribution)
const STATIC_LEVELS = [
  { opacity: 0.025, weight: 5 },   // near-invisible — dominant
  { opacity: 0.025, weight: 4 },
  { opacity: 0.06,  weight: 3 },   // medium
  { opacity: 0.06,  weight: 2 },
  { opacity: 0.12,  weight: 1 },   // strong — rare
] as const;

const ACCENT_COLOR     = "#FF3000";
const ACCENT_PROB      = 0.008;   // ~0.8%
const ANIMATED_PROB    = 1.0;     // 100% get CSS animation
const ANIM_DUR_MIN     = 6;       // seconds
const ANIM_DUR_MAX     = 6;       // seconds (uniform duration for sync)
const ANIM_DELAY_MAX   = 0;       // seconds (zero delay for simultaneous start)

// ─── SEEDED PRNG (Mulberry32) — deterministic, no hydration mismatch ─────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── CELL DATA TYPE ───────────────────────────────────────────────────────────
interface CellData {
  key: number;
  isAccent: boolean;
  staticOpacity: number;
  animated: boolean;
  animDelaySec: number;
  animDurSec: number;
  // CSS custom prop values for kg-blink
  kgBase: number;   // --kg-base
  kgPeak: number;   // --kg-peak
}

// ─── WEIGHTED PICK ────────────────────────────────────────────────────────────
function pickLevel(rng: () => number): number {
  const total = STATIC_LEVELS.reduce((s, l) => s + l.weight, 0);
  let r = rng() * total;
  for (const l of STATIC_LEVELS) {
    r -= l.weight;
    if (r <= 0) return l.opacity;
  }
  return STATIC_LEVELS[0].opacity;
}

// ─── GENERATE CELLS — runs once per grid size via useMemo ────────────────────
function generateCells(cols: number, rows: number): CellData[] {
  const rng = mulberry32(0xdeadbeef ^ (cols * 1000 + rows));
  const total = cols * rows;
  const cells: CellData[] = [];

  for (let i = 0; i < total; i++) {
    const isAccent = rng() < ACCENT_PROB;
    const staticOpacity = isAccent ? 0.07 : pickLevel(rng);
    const animated = true;
    const kgBase = staticOpacity;
    const kgPeak = isAccent ? 0.55 : Math.min(0.20, staticOpacity * 4 + 0.06);

    cells.push({
      key: i,
      isAccent,
      staticOpacity,
      animated,
      animDelaySec: animated ? rng() * ANIM_DELAY_MAX : 0,
      animDurSec:   animated ? ANIM_DUR_MIN + rng() * (ANIM_DUR_MAX - ANIM_DUR_MIN) : 0,
      kgBase,
      kgPeak,
    });
  }

  return cells;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function ContributionGrid() {
  // Three fixed grids — SSR safe, stable across re-renders
  const desktopCells = useMemo(
    () => generateCells(GRID.desktop.cols, GRID.desktop.rows),
    []
  );
  const tabletCells = useMemo(
    () => generateCells(GRID.tablet.cols, GRID.tablet.rows),
    []
  );
  const mobileCells = useMemo(
    () => generateCells(GRID.mobile.cols, GRID.mobile.rows),
    []
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-0 right-0 overflow-hidden"
      style={{
        height: "70%",
        // CSS mask: bottom opaque → top transparent — removes hard edge
        WebkitMaskImage:
          "linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.5) 70%, transparent 100%)",
        maskImage:
          "linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.5) 70%, transparent 100%)",
      }}
    >
      {/* ── Desktop grid — hidden below md ── */}
      <GridLayer
        cells={desktopCells}
        cols={GRID.desktop.cols}
        rows={GRID.desktop.rows}
        className="hidden md:block"
      />

      {/* ── Tablet grid — sm only ── */}
      <GridLayer
        cells={tabletCells}
        cols={GRID.tablet.cols}
        rows={GRID.tablet.rows}
        className="hidden sm:block md:hidden"
      />

      {/* ── Mobile grid — xs only ── */}
      <GridLayer
        cells={mobileCells}
        cols={GRID.mobile.cols}
        rows={GRID.mobile.rows}
        className="block sm:hidden"
      />
    </div>
  );
}

// ─── GRID LAYER — renders one responsive variant ──────────────────────────────
interface GridLayerProps {
  cells: CellData[];
  cols: number;
  rows: number;
  className?: string;
}

function GridLayer({ cells, cols, rows, className }: GridLayerProps) {
  const gridWidth = cols * STEP - GAP_PX;

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: gridWidth,
        maxWidth: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${CELL_PX}px)`,
        gap: GAP_PX,
        // Overflow hidden prevents stray cells
        overflow: "hidden",
      }}
    >
      {cells.map((cell) => (
        <Cell key={cell.key} data={cell} />
      ))}
    </div>
  );
}

// ─── CELL — single square, static or CSS-animated ────────────────────────────
function Cell({ data }: { data: CellData }) {
  const {
    isAccent,
    staticOpacity,
    animated,
    animDelaySec,
    animDurSec,
    kgBase,
    kgPeak,
  } = data;

  const style: React.CSSProperties & Record<string, unknown> = {
    width: CELL_PX,
    height: CELL_PX,
    borderRadius: 2,
    background: isAccent ? ACCENT_COLOR : "white",
    opacity: staticOpacity,
    willChange: animated ? "opacity" : undefined,
  };

  if (animated) {
    style["--kg-base"] = kgBase;
    style["--kg-peak"] = kgPeak;
    style.animation = `kg-blink ${animDurSec.toFixed(1)}s ${animDelaySec.toFixed(1)}s ease-in-out infinite`;
  }

  return <div style={style} />;
}
