"use client";

// ============================================================
// app/dashboard/payments/RevenueHealthGraph.tsx — FEAT-013
//
// Interactive dual-axis chart: Revenue ₹ (bars) vs. Paying
// Members (line) across 4 time scales: Week / Month / 6M / Year.
// ============================================================

import "./RevenueHealthGraph.css";
import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useRevenueGraph, type TimeScale, type RevenueDataPoint } from "@/hooks/useRevenueGraph";
import { formatINR } from "@/lib/utils/format";

// ── Time-scale toggle config ─────────────────────────────────

const SCALES: { key: TimeScale; label: string }[] = [
  { key: "week",    label: "Week" },
  { key: "month",   label: "Month" },
  { key: "6months", label: "6 M" },
  { key: "year",    label: "Year" },
];

// ── Custom tooltip — typed locally (Recharts TooltipProps generic
// doesn't reliably expose payload/label as destructurable props) ──

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number }>;
  label?: string;
}

function GraphTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  let revenue = 0;
  let members = 0;
  for (const entry of payload) {
    if (entry.dataKey === "revenue") revenue = entry.value ?? 0;
    if (entry.dataKey === "members") members = entry.value ?? 0;
  }

  return (
    <div className="rg-tooltip">
      <p className="rg-tooltip-label">{label}</p>
      <p className="rg-tooltip-row">
        <span className="rg-tooltip-dot rg-dot-green" />
        <span className="rg-tooltip-key">Revenue</span>
        <span className="rg-tooltip-val rg-val-green">{formatINR(revenue)}</span>
      </p>
      <p className="rg-tooltip-row">
        <span className="rg-tooltip-dot rg-dot-blue" />
        <span className="rg-tooltip-key">Members</span>
        <span className="rg-tooltip-val rg-val-blue">{members}</span>
      </p>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────

interface RevenueHealthGraphProps {
  /** Percentage of billed amount collected */
  collectionRate: number;
  /** Total billed (collected + pending + overdue) */
  totalRevenue: number;
  /** Cash payment count */
  cashCount: number;
  /** UPI payment count */
  upiCount: number;
}

// ── Component ────────────────────────────────────────────────

export function RevenueHealthGraph({
  collectionRate,
  totalRevenue,
  cashCount,
  upiCount,
}: RevenueHealthGraphProps) {
  const [scale, setScale] = useState<TimeScale>("month");
  const { data: rawData, isLoading } = useRevenueGraph(scale);
  const chartData: RevenueDataPoint[] = rawData ?? [];

  // Y-axis tick formatters
  const formatRevenueTick = (v: number) =>
    v >= 100000
      ? `₹${(v / 100000).toFixed(1)}L`
      : v >= 1000
      ? `₹${(v / 1000).toFixed(0)}k`
      : `₹${v}`;

  const formatMemberTick = (v: number) => String(v);

  return (
    <div className="rg-panel">

      {/* Header row: left = title + sub; right = badge + toggles */}
      <div className="rg-header">
        <div className="rg-header-left">
          <p className="rg-title">Revenue Health</p>
          <p className="rg-sub">{formatINR(totalRevenue)} total billed</p>
        </div>

        <div className="rg-header-right">
          {/* Collection rate badge */}
          <div className="rg-badge">
            <span className="rg-badge-value">{collectionRate}%</span>
            <span className="rg-badge-label">collected</span>
          </div>

          {/* Time-scale toggle pills */}
          <div className="rg-scales">
            {SCALES.map((s) => (
              <button
                key={s.key}
                id={`rg-scale-${s.key}`}
                className={`rg-scale-btn${scale === s.key ? " active" : ""}`}
                onClick={() => setScale(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart legend */}
      <div className="rg-legend">
        <span className="rg-legend-item">
          <span className="rg-legend-swatch rg-swatch-green" />
          Revenue ₹
        </span>
        <span className="rg-legend-item">
          <span className="rg-legend-swatch rg-swatch-blue rg-swatch-line" />
          Active members
        </span>
      </div>

      {/* Chart */}
      <div className="rg-chart-wrap">
        {isLoading ? (
          <div className="rg-chart-loading">
            <div className="loading-spinner" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              {/* Left Y — Revenue */}
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tickFormatter={formatRevenueTick}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              {/* Right Y — Members */}
              <YAxis
                yAxisId="members"
                orientation="right"
                tickFormatter={formatMemberTick}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                content={<GraphTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                fill="var(--accent-green)"
                opacity={0.8}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
              <Line
                yAxisId="members"
                type="monotone"
                dataKey="members"
                stroke="var(--accent-blue)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--accent-blue)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--accent-blue)" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Payment method chips */}
      <div className="method-chips">
        <span className="method-chip">
          <span className="method-chip-icon">&#8377;</span>
          {cashCount} cash payments
        </span>
        <span className="method-chip">
          <span className="method-chip-icon">&#x2B6F;</span>
          {upiCount} UPI payments
        </span>
      </div>
    </div>
  );
}
