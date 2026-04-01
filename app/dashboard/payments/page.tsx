"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Member, MemberMembership, MembershipPlan } from "@/types";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type PaymentRecord = MemberMembership & {
  member: Member;
  plan: MembershipPlan;
};

type PaymentFilter = "all" | "paid" | "pending" | "overdue";
type SortKey = "date" | "amount" | "member";

interface RevenueSummary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  thisMonthCollected: number;
  cashCount: number;
  upiCount: number;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function amountDue(record: PaymentRecord): number {
  return (record.plan?.price ?? 0) - (record.amount_paid ?? 0);
}

// ------------------------------------------------------------------
// Fetch
// ------------------------------------------------------------------

async function fetchPayments(): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from("member_memberships")
    .select("*, member:members(*), plan:membership_plans(*)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentRecord[];
}

// ------------------------------------------------------------------
// Revenue mini-chart (bar sparkline)
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
        <div
          className="rev-bar-fill"
          style={{ height: `${pct}%`, background: color }}
        />
      </div>
      <span className="rev-bar-label">{label}</span>
    </div>
  );
}

// ------------------------------------------------------------------
// Status config
// ------------------------------------------------------------------

const STATUS_CFG = {
  paid: {
    label: "Paid",
    bg: "rgba(74,222,128,0.1)",
    color: "#4ade80",
    border: "rgba(74,222,128,0.2)",
  },
  pending: {
    label: "Pending",
    bg: "rgba(251,191,36,0.1)",
    color: "#fbbf24",
    border: "rgba(251,191,36,0.2)",
  },
  overdue: {
    label: "Overdue",
    bg: "rgba(248,113,113,0.1)",
    color: "#f87171",
    border: "rgba(248,113,113,0.2)",
  },
};

const METHOD_CFG: Record<string, { label: string; icon: string }> = {
  cash: { label: "Cash", icon: "₹" },
  upi: { label: "UPI", icon: "⟳" },
  card: { label: "Card", icon: "▭" },
  other: { label: "Other", icon: "·" },
};

// ------------------------------------------------------------------
// Payment detail drawer
// ------------------------------------------------------------------

function PaymentDrawer({
  record,
  onClose,
}: {
  record: PaymentRecord;
  onClose: () => void;
}) {
  const cfg =
    STATUS_CFG[record.payment_status as keyof typeof STATUS_CFG] ??
    STATUS_CFG.pending;
  const due = amountDue(record);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <button className="drawer-close" onClick={onClose}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Member identity */}
        <div className="drawer-identity">
          <div className="drawer-avatar">
            {getInitials(record.member.full_name)}
          </div>
          <div>
            <h2 className="drawer-name">{record.member.full_name}</h2>
            <p className="drawer-sub">{record.member.phone}</p>
          </div>
        </div>

        {/* Status */}
        <span
          className="drawer-status"
          style={{
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.label}
        </span>

        <div className="drawer-divider" />

        {/* Amount breakdown */}
        <div className="drawer-section">
          <p className="drawer-section-label">Payment breakdown</p>
          <div className="amount-breakdown">
            <div className="amount-row">
              <span className="amount-key">Plan price</span>
              <span className="amount-val">
                {formatINR(record.plan?.price ?? 0)}
              </span>
            </div>
            <div className="amount-row">
              <span className="amount-key">Amount paid</span>
              <span className="amount-val" style={{ color: "#4ade80" }}>
                {formatINR(record.amount_paid ?? 0)}
              </span>
            </div>
            {due > 0 && (
              <div className="amount-row amount-row-due">
                <span className="amount-key">Balance due</span>
                <span className="amount-val" style={{ color: "#f87171" }}>
                  {formatINR(due)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="drawer-divider" />

        {/* Membership info */}
        <div className="drawer-section">
          <p className="drawer-section-label">Membership details</p>
          <div className="drawer-info-grid">
            <div className="drawer-info-item">
              <span className="drawer-info-key">Plan</span>
              <span className="drawer-info-val">
                {record.plan?.name ?? "—"}
              </span>
            </div>
            <div className="drawer-info-item">
              <span className="drawer-info-key">Duration</span>
              <span className="drawer-info-val">
                {record.plan?.duration_days ?? "—"} days
              </span>
            </div>
            <div className="drawer-info-item">
              <span className="drawer-info-key">Start date</span>
              <span className="drawer-info-val">
                {formatDate(record.start_date)}
              </span>
            </div>
            <div className="drawer-info-item">
              <span className="drawer-info-key">End date</span>
              <span className="drawer-info-val">
                {formatDate(record.end_date)}
              </span>
            </div>
            <div className="drawer-info-item">
              <span className="drawer-info-key">Payment method</span>
              <span
                className="drawer-info-val"
                style={{ textTransform: "capitalize" }}
              >
                {record.payment_method ?? "—"}
              </span>
            </div>
            <div className="drawer-info-item">
              <span className="drawer-info-key">Recorded on</span>
              <span className="drawer-info-val">
                {formatDate(record.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="drawer-actions">
          {record.payment_status !== "paid" && (
            <button className="drawer-btn drawer-btn-primary">
              Mark as paid
            </button>
          )}
          <button className="drawer-btn drawer-btn-secondary">
            Send reminder
          </button>
          <button className="drawer-btn drawer-btn-ghost">
            View member profile
          </button>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function PaymentsPage() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [selected, setSelected] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    fetchPayments()
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo<RevenueSummary>(() => {
    const monthStart = startOfMonth();
    return {
      totalCollected: records
        .filter((r) => r.payment_status === "paid")
        .reduce((s, r) => s + (r.amount_paid ?? 0), 0),
      totalPending: records
        .filter((r) => r.payment_status === "pending")
        .reduce((s, r) => s + amountDue(r), 0),
      totalOverdue: records
        .filter((r) => r.payment_status === "overdue")
        .reduce((s, r) => s + amountDue(r), 0),
      thisMonthCollected: records
        .filter(
          (r) => r.payment_status === "paid" && r.created_at >= monthStart,
        )
        .reduce((s, r) => s + (r.amount_paid ?? 0), 0),
      cashCount: records.filter((r) => r.payment_method === "cash").length,
      upiCount: records.filter((r) => r.payment_method === "upi").length,
    };
  }, [records]);

  const counts = useMemo(
    () => ({
      all: records.length,
      paid: records.filter((r) => r.payment_status === "paid").length,
      pending: records.filter((r) => r.payment_status === "pending").length,
      overdue: records.filter((r) => r.payment_status === "overdue").length,
    }),
    [records],
  );

  const filtered = useMemo(() => {
    let list = records.filter((r) => {
      if (filter !== "all" && r.payment_status !== filter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        r.member.full_name.toLowerCase().includes(q) ||
        r.member.phone.includes(q) ||
        r.plan?.name.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sort === "amount") return (b.amount_paid ?? 0) - (a.amount_paid ?? 0);
      if (sort === "member")
        return a.member.full_name.localeCompare(b.member.full_name);
      return b.created_at.localeCompare(a.created_at); // date desc
    });

    return list;
  }, [records, filter, search, sort]);

  const maxRevBar = Math.max(
    summary.totalCollected,
    summary.totalPending,
    summary.totalOverdue,
    1,
  );

  const FILTERS: { key: PaymentFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "pending", label: "Pending" },
    { key: "overdue", label: "Overdue" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:             #0d0d0f;
          --bg2:            #141417;
          --bg3:            #1c1c21;
          --border:         rgba(255,255,255,0.07);
          --border-hi:      rgba(255,255,255,0.13);
          --text-primary:   #f0efe8;
          --text-secondary: #8a8987;
          --text-muted:     #555450;
          --accent-green:   #4ade80;
          --accent-amber:   #fbbf24;
          --accent-red:     #f87171;
          --accent-blue:    #60a5fa;
          --font-display:   'Syne', sans-serif;
          --font-body:      'DM Sans', sans-serif;
          --radius:         14px;
          --radius-sm:      8px;
        }

        body {
          background: var(--bg);
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 15px;
          line-height: 1.6;
          min-height: 100vh;
        }

        /* ── Nav ── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 32px;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .nav-logo {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          text-decoration: none;
        }
        .nav-logo span { color: var(--accent-green); }
        .nav-links { display: flex; gap: 4px; }
        .nav-link {
          font-size: 13px;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          transition: all 0.15s;
        }
        .nav-link:hover { background: var(--bg3); color: var(--text-primary); }
        .nav-link.active { background: var(--bg3); color: var(--text-primary); font-weight: 500; }
        .nav-owner { font-size: 13px; color: var(--text-muted); }

        /* ── Page ── */
        .page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 32px 80px;
        }

        /* ── Page header ── */
        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 36px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .page-title {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }
        .page-sub {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 6px;
          font-weight: 300;
        }
        .export-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg2);
          color: var(--text-secondary);
          border: 1px solid var(--border-hi);
          border-radius: var(--radius-sm);
          padding: 10px 18px;
          font-family: var(--font-body);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .export-btn:hover { color: var(--text-primary); border-color: var(--border-hi); background: var(--bg3); }

        /* ── Summary cards ── */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2px;
          margin-bottom: 32px;
        }
        @media (max-width: 800px) {
          .summary-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .summary-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          padding: 24px;
          transition: border-color 0.2s;
        }
        .summary-card:first-child { border-radius: var(--radius) 0 0 var(--radius); }
        .summary-card:last-child  { border-radius: 0 var(--radius) var(--radius) 0; }
        .summary-card:hover { border-color: var(--border-hi); }

        .summary-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .summary-value {
          font-family: var(--font-display);
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 6px;
        }
        .summary-sub {
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* ── Revenue chart panel ── */
        .revenue-panel {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px;
          margin-bottom: 32px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 32px;
          align-items: center;
        }
        @media (max-width: 700px) {
          .revenue-panel { grid-template-columns: 1fr; }
        }

        .revenue-panel-left {}
        .revenue-panel-title {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }
        .revenue-panel-amount {
          font-family: var(--font-display);
          font-size: 2.8rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--accent-green);
          line-height: 1;
          margin-bottom: 8px;
        }
        .revenue-panel-sub {
          font-size: 13px;
          color: var(--text-muted);
        }

        .method-chips {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .method-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          padding: 5px 12px;
          border-radius: 99px;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          background: var(--bg3);
        }
        .method-chip-icon {
          font-size: 13px;
          color: var(--accent-blue);
        }

        /* ── Bar chart ── */
        .rev-bar-chart {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          height: 100px;
        }
        .rev-bar-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          height: 100%;
        }
        .rev-bar-track {
          flex: 1;
          width: 40px;
          background: var(--bg3);
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
        }
        .rev-bar-fill {
          width: 100%;
          border-radius: 6px;
          transition: height 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          min-height: 2px;
        }
        .rev-bar-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
          white-space: nowrap;
        }

        /* ── Toolbar ── */
        .toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 180px;
          max-width: 300px;
        }
        .search-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 14px 10px 38px;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-input::placeholder { color: var(--text-muted); }
        .search-input:focus { border-color: var(--border-hi); }

        .filter-tabs { display: flex; gap: 4px; }
        .filter-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          padding: 7px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font-body);
        }
        .filter-tab:hover { background: var(--bg3); color: var(--text-primary); }
        .filter-tab.active {
          background: var(--bg2);
          border-color: var(--border-hi);
          color: var(--text-primary);
        }
        .filter-count {
          font-size: 11px;
          background: var(--bg3);
          border-radius: 99px;
          padding: 1px 7px;
          color: var(--text-muted);
        }
        .filter-tab.active .filter-count {
          background: rgba(255,255,255,0.08);
          color: var(--text-secondary);
        }

        .sort-select {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 9px 14px;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 13px;
          cursor: pointer;
          outline: none;
          margin-left: auto;
        }
        .sort-select:focus { border-color: var(--border-hi); }

        /* ── Table ── */
        .table-wrap {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .table-meta {
          padding: 14px 24px;
          font-size: 13px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
        }

        table { width: 100%; border-collapse: collapse; }
        thead th {
          padding: 12px 20px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        thead th:last-child { text-align: right; }

        tbody tr {
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.12s;
        }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: var(--bg3); }

        td {
          padding: 15px 20px;
          vertical-align: middle;
          font-size: 14px;
        }
        td:last-child { text-align: right; }

        /* ── Member cell ── */
        .member-cell { display: flex; align-items: center; gap: 12px; }
        .member-avatar {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .member-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .member-phone { font-size: 12px; color: var(--text-muted); }

        /* ── Status pill ── */
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 99px;
          white-space: nowrap;
        }
        .status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

        /* ── Plan tag ── */
        .plan-tag {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 2px 8px;
          display: inline-block;
        }

        /* ── Method tag ── */
        .method-tag {
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg3);
          border-radius: var(--radius-sm);
          padding: 2px 8px;
          text-transform: capitalize;
        }

        /* ── Amount ── */
        .amount-cell { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .amount-paid {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .amount-due {
          font-size: 11px;
          color: var(--accent-red);
        }

        /* ── Empty ── */
        .empty-state {
          padding: 56px 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }

        /* ── Loading / Error ── */
        .loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 1.1rem;
          color: var(--text-secondary);
          gap: 12px;
        }
        .loading-spinner {
          width: 20px; height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--accent-green);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-red);
          font-family: var(--font-display);
        }

        /* ── Drawer ── */
        .drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 40;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .drawer {
          position: fixed;
          top: 0; right: 0;
          width: 400px;
          max-width: 100vw;
          height: 100vh;
          background: var(--bg2);
          border-left: 1px solid var(--border-hi);
          z-index: 50;
          overflow-y: auto;
          padding: 28px;
          animation: slideIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }

        .drawer-header { display: flex; justify-content: flex-end; margin-bottom: 24px; }
        .drawer-close {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .drawer-close:hover { color: var(--text-primary); border-color: var(--border-hi); }

        .drawer-identity {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
        }
        .drawer-avatar {
          width: 52px; height: 52px;
          border-radius: 50%;
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .drawer-name {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }
        .drawer-sub { font-size: 13px; color: var(--text-secondary); }

        .drawer-status {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 99px;
          margin-bottom: 20px;
        }

        .drawer-divider { height: 1px; background: var(--border); margin: 20px 0; }

        .drawer-section { margin-bottom: 4px; }
        .drawer-section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 14px;
        }

        .amount-breakdown {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .amount-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }
        .amount-row:last-child { border-bottom: none; }
        .amount-row-due { background: rgba(248,113,113,0.04); }
        .amount-key { font-size: 13px; color: var(--text-secondary); }
        .amount-val { font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--text-primary); }

        .drawer-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .drawer-info-item { display: flex; flex-direction: column; gap: 3px; }
        .drawer-info-key {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 500;
        }
        .drawer-info-val { font-size: 14px; color: var(--text-primary); font-weight: 500; }

        .drawer-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 28px; }
        .drawer-btn {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-sm);
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s;
          border: none;
          letter-spacing: 0.01em;
        }
        .drawer-btn:hover { opacity: 0.85; }
        .drawer-btn-primary { background: var(--accent-green); color: #0d0d0f; }
        .drawer-btn-secondary { background: var(--bg3); border: 1px solid var(--border-hi); color: var(--text-primary); }
        .drawer-btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text-muted); }

        @media (max-width: 900px) {
          thead th:nth-child(4), td:nth-child(4) { display: none; }
        }
        @media (max-width: 700px) {
          thead th:nth-child(3), td:nth-child(3) { display: none; }
          .page { padding: 24px 16px 60px; }
          .nav { padding: 16px; }
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <a href="/dashboard" className="nav-logo">
          Bodyline<span>.</span>
        </a>
        <div className="nav-links">
          <a href="/dashboard" className="nav-link">
            Dashboard
          </a>
          <a href="/dashboard/members" className="nav-link">
            Members
          </a>
          <a href="/dashboard/payments" className="nav-link active">
            Payments
          </a>
          <a href="/dashboard/trainers" className="nav-link">
            Trainers
          </a>
        </div>
        <div className="nav-owner">Pradeep · Owner</div>
      </nav>

      {loading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading payments...
        </div>
      )}

      {error && <div className="error-screen">Failed to load: {error}</div>}

      {!loading && !error && (
        <div className="page">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Payments</h1>
              <p className="page-sub">
                {counts.paid} paid · {counts.pending} pending · {counts.overdue}{" "}
                overdue
              </p>
            </div>
            <button className="export-btn">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export CSV
            </button>
          </div>

          {/* Summary cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <p className="summary-label">Total collected</p>
              <p
                className="summary-value"
                style={{ color: "var(--accent-green)" }}
              >
                {formatINR(summary.totalCollected)}
              </p>
              <p className="summary-sub">{counts.paid} payments</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">This month</p>
              <p className="summary-value">
                {formatINR(summary.thisMonthCollected)}
              </p>
              <p className="summary-sub">
                collected in{" "}
                {new Date().toLocaleString("en-IN", { month: "long" })}
              </p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Pending</p>
              <p
                className="summary-value"
                style={{ color: "var(--accent-amber)" }}
              >
                {formatINR(summary.totalPending)}
              </p>
              <p className="summary-sub">{counts.pending} members</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Overdue</p>
              <p
                className="summary-value"
                style={{ color: "var(--accent-red)" }}
              >
                {formatINR(summary.totalOverdue)}
              </p>
              <p className="summary-sub">{counts.overdue} members</p>
            </div>
          </div>

          {/* Revenue overview panel */}
          <div className="revenue-panel">
            <div className="revenue-panel-left">
              <p className="revenue-panel-title">Total revenue</p>
              <p className="revenue-panel-amount">
                {formatINR(summary.totalCollected)}
              </p>
              <p className="revenue-panel-sub">
                {formatINR(summary.totalPending + summary.totalOverdue)}{" "}
                outstanding
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
              <RevenueBar
                label="Collected"
                value={summary.totalCollected}
                max={maxRevBar}
                color="#4ade80"
              />
              <RevenueBar
                label="Pending"
                value={summary.totalPending}
                max={maxRevBar}
                color="#fbbf24"
              />
              <RevenueBar
                label="Overdue"
                value={summary.totalOverdue}
                max={maxRevBar}
                color="#f87171"
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-wrap">
              <svg
                className="search-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
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
                    const cfg =
                      STATUS_CFG[r.payment_status as keyof typeof STATUS_CFG] ??
                      STATUS_CFG.pending;
                    const due = amountDue(r);
                    const methodInfo = METHOD_CFG[r.payment_method ?? ""] ?? {
                      label: r.payment_method ?? "—",
                      icon: "·",
                    };

                    return (
                      <tr key={r.id} onClick={() => setSelected(r)}>
                        {/* Member */}
                        <td>
                          <div className="member-cell">
                            <div className="member-avatar">
                              {getInitials(r.member.full_name)}
                            </div>
                            <div>
                              <div className="member-name">
                                {r.member.full_name}
                              </div>
                              <div className="member-phone">
                                {r.member.phone}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className="status-pill"
                            style={{
                              background: cfg.bg,
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            <span className="status-dot" />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Plan */}
                        <td>
                          <span className="plan-tag">
                            {r.plan?.name ?? "—"}
                          </span>
                        </td>

                        {/* Method */}
                        <td>
                          <span className="method-tag">{methodInfo.label}</span>
                        </td>

                        {/* Date */}
                        <td
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: 13,
                          }}
                        >
                          {formatDate(r.created_at)}
                        </td>

                        {/* Amount */}
                        <td>
                          <div className="amount-cell">
                            <span className="amount-paid">
                              {formatINR(r.amount_paid ?? 0)}
                            </span>
                            {due > 0 && (
                              <span className="amount-due">
                                −{formatINR(due)} due
                              </span>
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
