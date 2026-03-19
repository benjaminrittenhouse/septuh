"use client";

import { useState } from "react";

interface LineData {
  line: string;
  total: number;
  late_count: number;
  cancelled_count: number;
  late_pct: number;
  avg_late_min: number | null;
  max_late_min: number;
}

interface LineCfg {
  id: string;
  name: string;
  color: string;
  /** Main SVG path — terminal to Center City (390, 220) */
  d: string;
  /** Primary terminal dot */
  tx: number;
  ty: number;
  /** Optional second terminal dot (Lansdale/Doylestown fork) */
  tx2?: number;
  ty2?: number;
}

// ViewBox: 0 0 820 438
// Center City:  (390, 220)  ← Suburban / Jefferson Stations
// 30th Street:  (258, 220)  ← west of Schuylkill, east entry to suburbs
//
// Paths traced from the official SEPTA Regional Rail map geometry:
//  - Paoli/Thorndale: due west, straight horizontal along the Main Line
//  - Cynwyd:          short NW stub off the Paoli line near Overbrook
//  - Manayunk:        NW diagonal from 30th St along the Schuylkill valley
//  - CHW:             N-NNW through Germantown, slight NW at terminus
//  - Lansdale/Dtown:  N with a Y-fork near the top (Doylestown N, Lansdale NW)
//  - CHE:             NNE through Mt Airy, tighter than CHW
//  - Fox Chase:       NE, stays east of the Schuylkill
//  - Warminster:      NNE through Hatboro / Willow Grove
//  - West Trenton:    NE with clear angular sweep
//  - Trenton:         NE crossing the Delaware River far into NJ
//  - Airport:         S from 30th St area, bends slightly SW toward PHL
//  - Media/Wawa:      SW diagonal through Southwest Philadelphia
//  - Wilmington:      SSW following the Delaware River valley

const LINES: LineCfg[] = [
  {
    id: "paoli",
    name: "Paoli/Thorndale",
    color: "#0095D6",
    // Dead-straight west along the Main Line
    d: "M 36,220 L 390,220",
    tx: 36, ty: 220,
  },
  {
    id: "cynwyd",
    name: "Cynwyd",
    color: "#9B2743",
    // Short NW stub branching from the Paoli line near Overbrook
    d: "M 88,192 L 192,220 L 390,220",
    tx: 88, ty: 192,
  },
  {
    id: "manayunk",
    name: "Manayunk/Norristown",
    color: "#AC7000",
    // NW along the Schuylkill valley, enters Center City via 30th St
    d: "M 36,142 Q 140,178 258,220 L 390,220",
    tx: 36, ty: 142,
  },
  {
    id: "chw",
    name: "Chestnut Hill West",
    color: "#00A3AD",
    // N through Germantown, slight NW lean at the top
    d: "M 152,36 L 248,108 L 318,162 Q 360,194 390,220",
    tx: 152, ty: 36,
  },
  {
    id: "lansdale",
    name: "Lansdale/Doylestown",
    color: "#C8A800",
    // Y-fork at top: Doylestown goes N, Lansdale goes NW; shared trunk south
    d: "M 172,24 L 272,82 Q 330,146 390,220"
     + " M 208,24 L 272,82",
    tx: 172, ty: 24,
    tx2: 208, ty2: 24,
  },
  {
    id: "che",
    name: "Chestnut Hill East",
    color: "#00843D",
    // NNE, tighter northward than CHW
    d: "M 308,24 Q 344,92 366,156 Q 380,192 390,220",
    tx: 308, ty: 24,
  },
  {
    id: "foxchase",
    name: "Fox Chase",
    color: "#F5821F",
    // NE through Northeast Philadelphia
    d: "M 522,50 L 470,112 L 432,172 L 390,220",
    tx: 522, ty: 50,
  },
  {
    id: "warminster",
    name: "Warminster",
    color: "#7B3F8E",
    // NNE through Hatboro, angular SEPTA-style bends
    d: "M 590,26 L 548,90 L 506,152 L 462,198 L 390,220",
    tx: 590, ty: 26,
  },
  {
    id: "westtrenton",
    name: "West Trenton",
    color: "#6D6E71",
    // NE, clear diagonal sweep
    d: "M 654,38 L 600,102 L 546,158 L 492,204 L 390,220",
    tx: 654, ty: 38,
  },
  {
    id: "trenton",
    name: "Trenton",
    color: "#C8102E",
    // NE sweeping into NJ — terminal is east of the Delaware River
    d: "M 798,86 L 728,128 L 646,168 L 558,206 L 390,220",
    tx: 798, ty: 86,
  },
  {
    id: "airport",
    name: "Airport",
    color: "#003DA5",
    // South from 30th St / Gray's Ferry area toward PHL airport
    d: "M 366,415 L 374,340 L 382,278 L 390,220",
    tx: 366, ty: 415,
  },
  {
    id: "mediawawa",
    name: "Media/Wawa",
    color: "#CF3B1E",
    // SW diagonal through Southwest Philly, angular bends
    d: "M 142,374 L 212,332 L 298,284 L 358,248 L 390,220",
    tx: 142, ty: 374,
  },
  {
    id: "wilmington",
    name: "Wilmington/Newark",
    color: "#E8A000",
    // SSW following the Delaware River valley south
    d: "M 538,410 L 494,354 L 452,302 L 424,258 L 390,220",
    tx: 538, ty: 410,
  },
];

// ── Info panel helpers ────────────────────────────────────────────────────────

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center text-xs py-[5px] border-b border-neutral-100 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${color ?? "text-neutral-800"}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ data }: { data: LineData }) {
  if (data.cancelled_count > 0)
    return <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase tracking-wide">⬤ Disrupted</span>;
  if (data.late_pct > 30)
    return <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wide">⬤ Delays</span>;
  if (data.late_pct > 5)
    return <span className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-200 uppercase tracking-wide">⬤ Minor Delays</span>;
  return <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wide">⬤ On Time</span>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RailMap({ data }: { data: LineData[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredLine = LINES.find((l) => l.id === hoveredId) ?? null;
  const hoveredData = hoveredLine ? (data.find((d) => d.line === hoveredLine.name) ?? null) : null;
  const FONT = "var(--font-geist-sans), system-ui, sans-serif";

  return (
    <div className="flex h-[360px] bg-white border border-border rounded-sm overflow-hidden">

      {/* ── SVG Map ── */}
      <div className="flex-1 overflow-hidden">
        <svg
          viewBox="0 0 820 438"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Clean white canvas — no background geography */}
          <rect width="820" height="438" fill="white" />

          {/* ── Rail lines — visual paths ── */}
          {LINES.map((line) => {
            const isHovered = hoveredId === line.id;
            const dimmed = hoveredId !== null && !isHovered;
            return (
              <path
                key={line.id}
                d={line.d}
                stroke={line.color}
                strokeWidth={isHovered ? 3.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={dimmed ? 0.13 : isHovered ? 1 : 0.75}
                style={{ transition: "opacity 0.1s ease, stroke-width 0.1s ease" }}
              />
            );
          })}

          {/* ── Terminal endpoint dots ── */}
          {LINES.map((line) => {
            const isHovered = hoveredId === line.id;
            const dimmed = hoveredId !== null && !isHovered;
            return (
              <g key={`dots-${line.id}`} opacity={dimmed ? 0.11 : 1} style={{ transition: "opacity 0.1s ease" }}>
                <circle cx={line.tx} cy={line.ty} r={isHovered ? 5 : 3.5} fill={line.color} />
                {line.tx2 !== undefined && (
                  <circle cx={line.tx2} cy={line.ty2} r={isHovered ? 5 : 3.5} fill={line.color} />
                )}
              </g>
            );
          })}

          {/* ── 30th Street Station ── */}
          <circle cx={258} cy={220} r={5} fill="white" stroke="#555" strokeWidth={1.5}
            opacity={hoveredId !== null ? 0.3 : 1} style={{ transition: "opacity 0.1s" }} />
          <text x={258} y={235} textAnchor="middle" fontSize="7.5" fill="#888"
            fontFamily={FONT} opacity={hoveredId !== null ? 0.3 : 1}
            style={{ transition: "opacity 0.1s" }}>
            30th St
          </text>

          {/* ── Center City Station ── */}
          <circle cx={390} cy={220} r={9} fill="white" stroke="#1a1a1a" strokeWidth={2} />
          <circle cx={390} cy={220} r={3.5} fill="#1a1a1a" />
          <text x={390} y={238} textAnchor="middle" fontSize="7.5" fill="#222"
            fontFamily={FONT} fontWeight="700" letterSpacing="0.5">
            CENTER CITY
          </text>

          {/* ── Hit areas (transparent, on top) ── */}
          {LINES.map((line) => (
            <path
              key={`hit-${line.id}`}
              d={line.d}
              stroke="transparent"
              strokeWidth={16}
              fill="none"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredId(line.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          ))}
        </svg>
      </div>

      {/* ── Info Panel ── */}
      <div className="w-52 border-l border-border flex flex-col shrink-0 bg-white">
        {hoveredLine ? (
          <div className="p-4 flex flex-col gap-3 h-full">
            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-[3px]" style={{ background: hoveredLine.color }} />
              <span className="font-bold text-sm text-foreground leading-snug">{hoveredLine.name}</span>
            </div>

            {hoveredData ? (
              <>
                <StatusBadge data={hoveredData} />
                <div className="flex flex-col">
                  <StatRow label="Observed" value={String(hoveredData.total)} />
                  <StatRow label="Late" value={hoveredData.late_count ? String(hoveredData.late_count) : "—"}
                    color={hoveredData.late_count > 0 ? "text-amber-600" : undefined} />
                  <StatRow label="Cancelled" value={hoveredData.cancelled_count ? String(hoveredData.cancelled_count) : "—"}
                    color={hoveredData.cancelled_count > 0 ? "text-red-600" : undefined} />
                  <StatRow label="Late rate" value={`${Math.round(hoveredData.late_pct)}%`}
                    color={hoveredData.late_pct > 30 ? "text-amber-600" : hoveredData.late_pct > 0 ? "text-amber-500" : "text-emerald-600"} />
                  <StatRow label="Avg delay"
                    value={hoveredData.avg_late_min ? `${Math.round(hoveredData.avg_late_min)} min` : "—"} />
                  <StatRow label="Worst delay"
                    value={hoveredData.max_late_min ? `+${hoveredData.max_late_min} min` : "—"}
                    color={hoveredData.max_late_min > 0 ? "text-amber-600" : undefined} />
                </div>
                <div className="mt-auto">
                  <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                    <span>on time</span><span>late</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${hoveredData.late_pct > 50 ? "bg-red-500" : hoveredData.late_pct > 25 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(hoveredData.late_pct, 100)}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No service data for this line today.</p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-5 text-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="#0057a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M12 3v18" /><circle cx="12" cy="12" r="9" />
            </svg>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hover over a line to see today&apos;s service stats
            </p>
            <p className="text-[10px] text-neutral-300 mt-1">13 Regional Rail lines</p>
          </div>
        )}
      </div>
    </div>
  );
}
