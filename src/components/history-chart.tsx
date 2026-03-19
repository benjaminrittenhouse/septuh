"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface HistoryRow {
  day: string;
  late_pct: number;
  avg_late_min: number | null;
  cancelled_count: number;
}

export function HistoryChart({ data }: { data: HistoryRow[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground italic text-sm">
        No historical data yet. Let the collector run for a few days!
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "var(--font-geist-sans)" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="pct" tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "var(--font-geist-sans)" }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `${v}%`} />
        <YAxis yAxisId="min" orientation="right" tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "var(--font-geist-sans)" }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `${v}m`} />
        <Tooltip
          contentStyle={{ background: "#1e2130", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: "#e2e8f0", marginBottom: 4 }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          formatter={(value, name) => {
            if (name === "Late %") return [`${value}%`, name];
            if (name === "Avg delay") return [`${value} min`, name];
            return [value, name];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
        <Area
          yAxisId="pct"
          type="monotone"
          dataKey="late_pct"
          name="Late %"
          stroke="#f87171"
          fill="#f8717120"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="min"
          type="monotone"
          dataKey="avg_late_min"
          name="Avg delay"
          stroke="#fbbf24"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
