"use client";

import "./payments.css";
import { useMemo, useState } from "react";
import { usePayments, type PaymentRecord } from "@/hooks/usePayments";
import { Nav } from "@/components/ui/Nav";
import { Avatar } from "@/components/ui/Avatar";
import { STATUS_CONFIG } from "@/lib/constants/status";
import { formatINR, formatDate } from "@/lib/utils/format";
import { monthStartISO } from "@/lib/utils/date";
import { PaymentDrawer } from "./PaymentDrawer";
import type { PaymentStatus } from "@/types";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type PaymentFilter = "all" | PaymentStatus;
type SortKey = "date" | "amount" | "member";

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const FILTERS: { key: PaymentFilter; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "paid",    label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "overdue", label: "Overdue" },
];

const METHOD_LABEL: Record<string, string> = {
  cash:  "Cash",
  upi:   "UPI",
  card:  "Card",
  other: "Other",
};

// ------------------------------------------------------------------
// RevenueBar — local sparkline bar (payments-page only, not shared)
// ------------------------------------------------------------------

function RevenueBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="rev-bar-item">
      <div className="rev-bar-track">
        <div className="rev-bar-fill" style={{ height: `${pct}%`, background: color }} />
      </div>
      <span className="rev-bar-label">{label}</span>
    </div>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function PaymentsPage() {
  const { data: records = [], isLoading, error } = usePayments();
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [search, setSearch]  = useState("");
  const [sort, setSort]      = useState<SortKey>("date");
  const [selected, setSelected] = useState<PaymentRecord | null>(null);

  // ── Revenue summary ─────────────────────────────────────────────
  const summary = useMemo(() => {
    const monthStart = monthStartISO();
    const amountDue = (r: PaymentRecord) =>
      Math.max(0, (r.plan?.price ?? 0) - (r.amount_paid ?? 0));

    // Deduplicate to latest membership per member — same logic as dashboard + members page.
    // Records are already ordered created_at DESC from usePayments, so first-seen = latest.
    // Used for pending/overdue AMOUNTS so summary cards match the dashboard exactly.
    const latestByMember = new Map<string, PaymentRecord>();
    for (const r of records) {
      if (!latestByMember.has(r.member_id)) {
        latestByMember.set(r.member_id, r);
      }
    }
    const latestRecords = Array.from(latestByMember.values());

    return {
      // totalCollected: sum ALL paid rows — each renewal is real money received.
      totalCollected: records
        .filter((r) => r.payment_status === "paid")
        .reduce((s, r) => s + (r.amount_paid ?? 0), 0),
      // totalPending / totalOverdue: current outstanding — latest per member only.
      totalPending: latestRecords
        .filter((r) => r.payment_status === "pending")
        .reduce((s, r) => s + amountDue(r), 0),
      totalOverdue: latestRecords
        .filter((r) => r.payment_status === "overdue")
        .reduce((s, r) => s + amountDue(r), 0),
      thisMonthCollected: records
        .filter((r) => r.payment_status === "paid" && r.created_at >= monthStart)
        .reduce((s, r) => s + (r.amount_paid ?? 0), 0),
      cashCount: records.filter((r) => r.payment_method === "cash").length,
      upiCount:  records.filter((r) => r.payment_method === "upi").length,
      // Member-level counts for header sub-text (matches dashboard + members page)
      pendingMemberCount: latestRecords.filter((r) => r.payment_status === "pending").length,
      overdueMemberCount: latestRecords.filter((r) => r.payment_status === "overdue").length,
    };
  }, [records]);

  // ── Filter tab counts (row counts — how many RECORDS match, for the table) ──
  // Intentionally uses ALL rows so filter tab count and visible table rows stay in sync.
  const counts = useMemo(
    () => ({
      all:     records.length,
      paid:    records.filter((r) => r.payment_status === "paid").length,
      pending: records.filter((r) => r.payment_status === "pending").length,
      overdue: records.filter((r) => r.payment_status === "overdue").length,
    }),
    [records],
  );

  // ── Filtered + sorted list ──────────────────────────────────────
  const filtered = useMemo(() => {
    const list = records.filter((r) => {
      if (filter !== "all" && r.payment_status !== filter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        r.member.full_name.toLowerCase().includes(q) ||
        r.member.phone.includes(q) ||
        (r.plan?.name ?? "").toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sort === "amount") return (b.amount_paid ?? 0) - (a.amount_paid ?? 0);
      if (sort === "member") return a.member.full_name.localeCompare(b.member.full_name);
      return b.created_at.localeCompare(a.created_at); // date desc
    });
  }, [records, filter, search, sort]);

  const maxRevBar = Math.max(summary.totalCollected, summary.totalPending, summary.totalOverdue, 1);
  const currentMonth = new Date().toLocaleString("en-IN", { month: "long" });

  return (
    <>
      <Nav role="owner" />

      {isLoading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading payments...
        </div>
      )}

      {error && <div className="error-screen">Failed to load: {error.message}</div>}

      {!isLoading && !error && (
        <div className="page">

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Payments</h1>
              <p className="page-sub">
                {counts.paid} paid · {summary.pendingMemberCount} pending · {summary.overdueMemberCount} overdue
              </p>
            </div>
            <button className="export-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export CSV
            </button>
          </div>

          {/* Summary stat cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <p className="summary-label">Total collected</p>
              <p className="summary-value" style={{ color: "var(--accent-green)" }}>
                {formatINR(summary.totalCollected)}
              </p>
              <p className="summary-sub">{counts.paid} payments</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">This month</p>
              <p className="summary-value">{formatINR(summary.thisMonthCollected)}</p>
              <p className="summary-sub">collected in {currentMonth}</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Pending</p>
              <p className="summary-value" style={{ color: "var(--accent-amber)" }}>
                {formatINR(summary.totalPending)}
              </p>
              <p className="summary-sub">{summary.pendingMemberCount} members</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Overdue</p>
              <p className="summary-value" style={{ color: "var(--accent-red)" }}>
                {formatINR(summary.totalOverdue)}
              </p>
              <p className="summary-sub">{summary.overdueMemberCount} members</p>
            </div>
          </div>

          {/* Revenue overview panel */}
          <div className="revenue-panel">
            <div>
              <p className="revenue-panel-title">Total revenue</p>
              <p className="revenue-panel-amount">{formatINR(summary.totalCollected)}</p>
              <p className="revenue-panel-sub">
                {formatINR(summary.totalPending + summary.totalOverdue)} outstanding
              </p>
              <div className="method-chips">
                <span className="method-chip">
                  <span className="method-chip-icon">₹</span>
                  {summary.cashCount} cash payments
                </span>
                <span className="method-chip">
                  <span className="method-chip-icon">⟳</span>
                  {summary.upiCount} UPI payments
                </span>
              </div>
            </div>
            <div className="rev-bar-chart">
              <RevenueBar label="Collected" value={summary.totalCollected} max={maxRevBar} color="var(--accent-green)" />
              <RevenueBar label="Pending"   value={summary.totalPending}   max={maxRevBar} color="var(--accent-amber)" />
              <RevenueBar label="Overdue"   value={summary.totalOverdue}   max={maxRevBar} color="var(--accent-red)" />
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-wrap">
              <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="search-input"
                placeholder="Search member, plan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-tabs">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`filter-tab ${filter === f.key ? "active" : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span className="filter-count">{counts[f.key]}</span>
                </button>
              ))}
            </div>

            <select
              className="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="date">Sort: Newest first</option>
              <option value="amount">Sort: Amount</option>
              <option value="member">Sort: Member name</option>
            </select>
          </div>

          {/* Payments table */}
          <div className="table-wrap">
            <div className="table-meta">
              Showing {filtered.length} of {records.length} records
              {search && ` · "${search}"`}
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">No payment records found.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const statusKey = (["paid", "pending", "overdue"] as PaymentStatus[]).includes(
                      r.payment_status
                    ) ? r.payment_status : "pending";
                    const cfg = STATUS_CONFIG[statusKey];
                    const due = Math.max(0, (r.plan?.price ?? 0) - (r.amount_paid ?? 0));

                    return (
                      <tr key={r.id} onClick={() => setSelected(r)}>
                        {/* Member */}
                        <td>
                          <div className="member-cell">
                            <Avatar
                              name={r.member.full_name}
                              src={r.member.profile_photo_url}
                              size={34}
                            />
                            <div>
                              <div className="member-name">{r.member.full_name}</div>
                              <div className="member-phone">{r.member.phone}</div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className="status-pill"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                          >
                            <span className="status-dot" />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Plan */}
                        <td>
                          <span className="plan-tag">{r.plan?.name ?? "—"}</span>
                        </td>

                        {/* Method */}
                        <td>
                          <span className="method-tag">
                            {METHOD_LABEL[r.payment_method ?? ""] ?? r.payment_method ?? "—"}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                          {formatDate(r.created_at)}
                        </td>

                        {/* Amount */}
                        <td>
                          <div className="amount-cell">
                            <span className="amount-paid">{formatINR(r.amount_paid ?? 0)}</span>
                            {due > 0 && (
                              <span className="amount-due">−{formatINR(due)} due</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Payment detail drawer */}
      {selected && (
        <PaymentDrawer record={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
