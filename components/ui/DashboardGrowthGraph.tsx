"use client";

// ============================================================
// components/ui/DashboardGrowthGraph.tsx — FEAT-015
//
// Dashboard-specific growth chart:
//   - LINE:  Cumulative active member count (growing over time)
//   - BARS:  Revenue collected per month (period metric)
//
// Shows the gym's momentum at a glance. Completely separate
// from RevenueHealthGraph (which lives on the Payments page).
// ============================================================

import "./DashboardGrowthGraph.css";
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
import {
  useDashboardGrowthGraph,
  type GrowthScale,
  type GrowthDataPoint,
} from "@/hooks/useDashboardGrowthGraph";
import { formatINR } from "@/lib/utils/format";

// ── Scale options ─────────────────────────────────────────────

const SCALES: { key: GrowthScale; label: string }[] = [
  { key: "6months", label: "6 M" },
  { key: "year",    label: "Year" },
];

// ── Custom tooltip ────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number }>;
  label?: string;
}

function GrowthTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  let revenue = 0;
  let members = 0;
  let revenueDelta = 0;
  let newMembers = 0;

  for (const entry of payload) {
    if (entry.dataKey === "revenue") revenue = entry.value ?? 0;
    if (entry.dataKey === "members") members = entry.value ?? 0;
    if (entry.dataKey === "revenueDelta") revenueDelta = entry.value ?? 0;
    if (entry.dataKey === "newMembers") newMembers = entry.value ?? 0;
  }

  const deltaSign = revenueDelta > 0 ? "+" : "";
  const deltaClass = revenueDelta > 0 ? "up" : revenueDelta < 0 ? "down" : "";

  return (
    <div className="dg-tooltip">
      <p className="dg-tooltip-label">{label}</p>

      {/* Revenue row */}
      <div className="dg-tooltip-row">
        <span className="dg-tooltip-dot green" />
        <span className="dg-tooltip-key">Revenue</span>
        <span className="dg-tooltip-val green">{formatINR(revenue)}</span>
        {revenueDelta !== 0 && (
          <span className={`dg-tooltip-delta ${deltaClass}`}>
            ({deltaSign}{formatINR(revenueDelta)})
          </span>
        )}
      </div>

      {/* Members row */}
      <div className="dg-tooltip-row">
        <span className="dg-tooltip-dot blue" />
        <span className="dg-tooltip-key">Total members</span>
        <span className="dg-tooltip-val blue">{members}</span>
      </div>

      {/* New members this month */}
      {newMembers > 0 && (
        <div className="dg-tooltip-row">
          <span className="dg-tooltip-dot" style={{ background: "transparent", border: "1.5px solid var(--accent-blue)" }} />
          <span className="dg-tooltip-key">New this month</span>
          <span className="dg-tooltip-val blue">+{newMembers}</span>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────

export function DashboardGrowthGraph() {
  const [scale, setScale] = useState<GrowthScale>("6months");
  const { data, isLoading } = useDashboardGrowthGraph(scale);
  const points: GrowthDataPoint[] = data ?? [];

  // Latest-month snapshot values for KPI chips
  const latest = points[points.length - 1];
  const prev = points[points.length - 2];

  const latestMembers = latest?.members ?? 0;
  const memberDelta = latest && prev ? latest.members - prev.members : 0;

  const latestRevenue = latest?.revenue ?? 0;
  const revenueDelta = latest?.revenueDelta ?? 0;

  // Y-axis formatters
  const fmtRevenue = (v: number) =>
    v >= 100000 ? `₹${(v / 100000).toFixed(1)}L`
    : v >= 1000  ? `₹${(v / 1000).toFixed(0)}k`
    : `₹${v}`;

  const fmtMembers = (v: number) => String(v);

  const deltaClass = (d: number) => (d > 0 ? "up" : d < 0 ? "down" : "flat");
  const deltaPrefix = (d: number) => (d > 0 ? "+" : "");

  return (
    <div className="dg-panel">

      {/* ── Header ── */}
      <div className="dg-header">
        <div className="dg-header-left">
          <p className="dg-eyebrow">Gym Growth</p>
          <p className="dg-title">Member & Revenue Trend</p>
          <p className="dg-subtitle">
            Cumulative member count · monthly revenue collected
          </p>
        </div>

        <div className="dg-header-right">
          <div className="dg-scales">
            {SCALES.map((s) => (
              <button
                key={s.key}
                id={`dg-scale-${s.key}`}
                className={`dg-scale-btn${scale === s.key ? " active" : ""}`}
                onClick={() => setScale(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI chips ── */}
      <div className="dg-kpi-row">
        <div className="dg-kpi-chip">
          <span className="dg-kpi-label">Total Members</span>
          <span className="dg-kpi-value">{latestMembers}</span>
          {memberDelta !== 0 && (
            <span className={`dg-kpi-delta ${deltaClass(memberDelta)}`}>
              {deltaPrefix(memberDelta)}{memberDelta} vs last month
            </span>
          )}
        </div>

        <div className="dg-kpi-chip">
          <span className="dg-kpi-label">This Month Revenue</span>
          <span className="dg-kpi-value">{formatINR(latestRevenue)}</span>
          {revenueDelta !== 0 && (
            <span className={`dg-kpi-delta ${deltaClass(revenueDelta)}`}>
              {deltaPrefix(revenueDelta)}{formatINR(revenueDelta)} vs last month
            </span>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="dg-legend">
        <span className="dg-legend-item">
          <span className="dg-swatch green" />
          Revenue ₹ (per month)
        </span>
        <span className="dg-legend-item">
          <span className="dg-swatch line blue" />
          Total Members (cumulative)
        </span>
      </div>

      {/* ── Chart ── */}
      <div className="dg-chart-wrap">
        {isLoading ? (
          <div className="dg-chart-loading">
            <div className="loading-spinner" />
          </div>
        ) : points.length === 0 ? (
          <div className="dg-empty">
            <span>No data yet</span>
            <span style={{ fontSize: 11 }}>Add members to see growth here</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={points}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
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
                tickFormatter={fmtRevenue}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              {/* Right Y — Members */}
              <YAxis
                yAxisId="members"
                orientation="right"
                tickFormatter={fmtMembers}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
                domain={[0, "auto"]}
              />
              <Tooltip
                content={<GrowthTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              {/* Revenue bars */}
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                fill="var(--accent-green)"
                opacity={0.75}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              {/* Member count line — drawn on top */}
              <Line
                yAxisId="members"
                type="monotone"
                dataKey="members"
                stroke="var(--accent-blue)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--accent-blue)", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "var(--accent-blue)", stroke: "var(--bg2)", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
