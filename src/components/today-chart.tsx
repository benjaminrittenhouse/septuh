"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TodayRow {
  hour_min: string;
  total: number;
  late_count: number;
  cancelled_count: number;
  avg_late_min: number | null;
  max_late_min: number;
}

export function TodayChart({ data }: { data: TodayRow[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground italic text-sm">
        No data collected yet today. Start the collector!
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="hour_min" tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "var(--font-geist-sans)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "var(--font-geist-sans)" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{ background: "#1e2130", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: "#e2e8f0", marginBottom: 4 }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
        <Bar dataKey="late_count" name="Late" fill="#f87171" opacity={0.85} maxBarSize={48} radius={[3, 3, 0, 0]} />
        <Bar dataKey="cancelled_count" name="Cancelled" fill="#a855f7" opacity={0.85} maxBarSize={48} radius={[3, 3, 0, 0]} />
        <Line
          type="monotone"
          dataKey="total"
          name="Total observed"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
