"use client";

import "./payments.css";
import { useMemo, useState, useEffect } from "react";
import { SlidersHorizontal, Check, ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown, Bell, RefreshCw, IndianRupee } from "lucide-react";
import { usePayments, type PaymentRecord } from "@/hooks/usePayments";
import { Nav } from "@/components/ui/Nav";
import { Avatar } from "@/components/ui/Avatar";
import { STATUS_CONFIG } from "@/lib/constants/status";
import { formatINR, formatDate } from "@/lib/utils/format";
import { monthStartISTTimestamp, currentMonthName } from "@/lib/utils/date";
import { PaymentDrawer } from "./PaymentDrawer";
import { RevenueHealthGraph } from "./RevenueHealthGraph";
import { RenewMembershipModal } from "@/components/members/RenewMembershipModal";
import { RecordPaymentModal } from "@/components/members/RecordPaymentModal";
import type { PaymentStatus } from "@/types";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type PaymentFilter = "all" | PaymentStatus;
type SortKey = "date" | "amount" | "member";

// Data-driven card action (mobile only)
type CardActionVariant = "primary" | "ghost" | "icon";
interface CardAction {
  id: string;
  label?: string;
  icon: React.ReactNode;
  variant: CardActionVariant;
  onClick: (e: React.MouseEvent) => void;
}

// ------------------------------------------------------------------
// CardActionBar — renders a dynamic set of actions at the bottom of
// each mobile card. Pass actions[] built per-record in the page.
// Desktop: hidden via payments.css. Mobile: full-width block.
// ------------------------------------------------------------------

function CardActionBar({ actions }: { actions: CardAction[] }) {
  const btnActions = actions.filter((a) => a.variant !== "icon");
  if (btnActions.length === 0) return null;
  return (
    <div className="card-action-bar">
      {btnActions.map((a) => (
        <button
          key={a.id}
          className={`card-action-bar-btn ${
            a.variant === "primary" ? "card-action-bar-btn-primary" : "card-action-bar-btn-ghost"
          }`}
          onClick={a.onClick}
          tabIndex={-1}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  );
}

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

const PAGE_SIZE = 25;

// RevenueRow helper moved to RevenueHealthGraph.tsx (FEAT-013)

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// SortDropdown — custom sort picker (shared pattern, globals.css styles)
// ------------------------------------------------------------------

function SortDropdown({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value)?.label ?? value;
  return (
    <div className="sort-dropdown-wrap">
      {open && <div className="sort-dd-overlay" onClick={() => setOpen(false)} />}
      <button
        className={`sort-dropdown-btn${open ? " open" : ""}`}
        onClick={() => setOpen((p) => !p)}
        aria-label={`Sort by: ${current}`}
      >
        <ArrowUpDown size={13} />
        {current}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="sort-dropdown-menu">
          {options.map((o) => (
            <div
              key={o.key}
              className={`sort-dropdown-item${value === o.key ? " active" : ""}`}
              onClick={() => { onChange(o.key); setOpen(false); }}
            >
              {o.label}
              {value === o.key && <Check size={13} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function PaymentsPage() {
  const { data: records = [], isLoading, error } = usePayments();

  // Filter state — status only (separate from sort)
  type FilterValues = { status: PaymentFilter };
  const DEFAULT_FILTERS: FilterValues = { status: "all" };

  const [activeFilters, setActiveFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("date");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PaymentRecord | null>(null);

  // Modal state — wired to existing RenewMembershipModal + RecordPaymentModal
  const [renewTarget, setRenewTarget] = useState<PaymentRecord | null>(null);
  const [recordTarget, setRecordTarget] = useState<PaymentRecord | null>(null);

  // Filter sheet state (mobile)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  // ── Revenue summary ─────────────────────────────────────────────
  const summary = useMemo(() => {
    const monthStart = monthStartISTTimestamp();
    const amountDue = (r: PaymentRecord) =>
      Math.max(0, (r.plan?.price ?? 0) - (r.amount_paid ?? 0));

    const latestByMember = new Map<string, PaymentRecord>();
    for (const r of records) {
      if (!latestByMember.has(r.member_id)) {
        latestByMember.set(r.member_id, r);
      }
    }
    const latestRecords = Array.from(latestByMember.values());

    return {
      totalCollected: records
        .filter((r) => r.payment_status === "paid")
        .reduce((s, r) => s + (r.amount_paid ?? 0), 0),
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
      pendingMemberCount: latestRecords.filter((r) => r.payment_status === "pending").length,
      overdueMemberCount: latestRecords.filter((r) => r.payment_status === "overdue").length,
    };
  }, [records]);

  // ── Filter tab counts ────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      all:        records.length,
      paid:       records.filter((r) => r.payment_status === "paid").length,
      pending:    records.filter((r) => r.payment_status === "pending").length,
      overdue:    records.filter((r) => r.payment_status === "overdue").length,
      superseded: records.filter((r) => r.payment_status === "superseded").length,
    }),
    [records],
  );

  // ── Filtered + sorted list ──────────────────────────────────────
  const filtered = useMemo(() => {
    const list = records.filter((r) => {
      if (activeFilters.status !== "all" && r.payment_status !== activeFilters.status) return false;
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
      return b.created_at.localeCompare(a.created_at);
    });
  }, [records, activeFilters, sort, search]);

  // Reset to page 1 whenever filters, search, or sort changes
  useEffect(() => { setPage(1); }, [activeFilters, search, sort]);

  // ── Pagination slice ─────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);


  // ── Filter sheet helpers ─────────────────────────────────────────
  // Status-only filter sections — extend by appending objects here
  const filterSections = useMemo(
    () => [
      {
        key: "status" as keyof FilterValues,
        label: "Status",
        options: FILTERS.map((f) => ({
          value: f.key,
          label: f.label,
          count: counts[f.key] as number | undefined,
        })),
      },
      // → Future: { key: "method", label: "Payment method", options: [...] }
    ],
    [counts],
  );

  // ── Per-record card actions (mobile) ────────────────────────────
  // Data-driven: build action list based on payment_status.
  // Extend by appending new CardAction objects here — no JSX changes needed.
  const getCardActions = (r: PaymentRecord): CardAction[] => {
    const due = Math.max(0, (r.plan?.price ?? 0) - (r.amount_paid ?? 0));
    const actions: CardAction[] = [];

    if (r.payment_status === "overdue") {
      actions.push({
        id: "renew",
        // label: "Renew",
        icon: <RefreshCw size={13} />,
        variant: "primary",
        onClick: (e) => { e.stopPropagation(); setRenewTarget(r); },
      });
    }

    if ((r.payment_status === "pending" || r.payment_status === "overdue") && due > 0) {
      actions.push({
        id: "record",
        label: "Record Payment",
        icon: <IndianRupee size={13} />,
        variant: r.payment_status === "overdue" ? "ghost" : "primary",
        onClick: (e) => { e.stopPropagation(); setRecordTarget(r); },
      });
    }

    actions.push({
      id: "details",
      label: "View details",
      icon: <ChevronRight size={13} />,
      variant: "ghost",
      onClick: (e) => { e.stopPropagation(); setSelected(r); },
    });

    if (r.payment_status !== "superseded" && r.payment_status !== "paid") {
      actions.push({
        id: "reminder",
        label: "Send reminder",
        icon: <Bell size={14} />,
        variant: "icon",
        onClick: (e) => { e.stopPropagation(); /* TODO: wire notification */ },
      });
    }

    return actions;
  };

  const hasActiveFilters = activeFilters.status !== "all";
  const chipLabel = hasActiveFilters
    ? (FILTERS.find((f) => f.key === activeFilters.status)?.label ?? activeFilters.status)
    : "Filter";

  const totalRevenue = summary.totalCollected + summary.totalPending + summary.totalOverdue;
  const collectionRate = totalRevenue > 0 ? Math.round((summary.totalCollected / totalRevenue) * 100) : 0;
  const currentMonth = currentMonthName();

  const openFilterSheet = () => { setPendingFilters(activeFilters); setIsFilterSheetOpen(true); };
  const applyFilters    = () => { setActiveFilters(pendingFilters); setIsFilterSheetOpen(false); };
  const resetFilters    = () => setPendingFilters(DEFAULT_FILTERS);

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
        <>
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

            {/* Summary stat strip */}
            <div className="stats-strip">
              <div className="stat-item">
                <p className="stat-label">Total collected</p>
                <p className="stat-value" style={{ color: "var(--accent-green)" }}>
                  {formatINR(summary.totalCollected)}
                </p>
                <p className="stat-sub">{counts.paid} payments</p>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <p className="stat-label">This month</p>
                <p className="stat-value">{formatINR(summary.thisMonthCollected)}</p>
                <p className="stat-sub">in {currentMonth}</p>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <p className="stat-label">Pending</p>
                <p className="stat-value" style={{ color: "var(--accent-amber)" }}>
                  {formatINR(summary.totalPending)}
                </p>
                <p className="stat-sub">{summary.pendingMemberCount} members</p>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <p className="stat-label">Overdue</p>
                <p className="stat-value" style={{ color: "var(--accent-red)" }}>
                  {formatINR(summary.totalOverdue)}
                </p>
                <p className="stat-sub">{summary.overdueMemberCount} members</p>
              </div>
            </div>

            {/* Revenue Health Graph — FEAT-013 */}
            <RevenueHealthGraph
              collectionRate={collectionRate}
              totalRevenue={totalRevenue}
              cashCount={summary.cashCount}
              upiCount={summary.upiCount}
            />

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

              {/* Controls row — filter chip/tabs + sort select, always side by side */}
              <div className="payments-controls-row">

                {/* Mobile: pill chip that opens bottom sheet */}
                <button
                  id="payments-filter-chip"
                  className={`filter-chip${hasActiveFilters ? " has-filters" : ""}`}
                  onClick={openFilterSheet}
                  aria-label="Open filter options"
                >
                  <SlidersHorizontal size={14} />
                  {chipLabel}
                  {hasActiveFilters && <span className="filter-chip-badge">1</span>}
                </button>

                {/* Desktop: inline status filter tabs (hidden on mobile via payments.css) */}
                <div className="payments-filter-tabs-group">
                  <div className="filter-tabs">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        className={`filter-tab ${activeFilters.status === f.key ? "active" : ""}`}
                        onClick={() => setActiveFilters({ status: f.key })}
                      >
                        {f.label}
                        <span className="filter-count">{counts[f.key]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort dropdown — always visible on both desktop and mobile */}
                <SortDropdown
                  options={[
                    { key: "date",   label: "Newest first" },
                    { key: "amount", label: "Amount" },
                    { key: "member", label: "Member name" },
                  ]}
                  value={sort}
                  onChange={(k) => setSort(k as SortKey)}
                />

              </div>
            </div>

            {/* Payments table */}
            <div className="table-wrap">
              <div className="table-meta">
                Showing {paginated.length} of {filtered.length} records
                {search && ` · "${search}"`}
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">No payment records found.</div>
              ) : (
                <>
                <table className="responsive-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Status</th>
                      <th>Plan</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th className="card-action-th" aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r) => {
                      const statusKey = (["paid", "pending", "overdue", "superseded"] as PaymentStatus[]).includes(
                        r.payment_status
                      ) ? r.payment_status : "superseded";
                      const cfg = STATUS_CONFIG[statusKey];
                      const due = Math.max(0, (r.plan?.price ?? 0) - (r.amount_paid ?? 0));
                      // Compute actions once — used by both the bell and the action bar
                      const cardActions = getCardActions(r);
                      const reminderAction = cardActions.find((a) => a.id === "reminder");

                      return (
                        <tr
                          key={r.id}
                          onClick={() => { if (window.innerWidth > 640) setSelected(r); }}
                        >
                          {/* Member — card header row: avatar+name on left, bell on right */}
                          <td>
                            <div className="member-card-header">
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
                              {reminderAction && (
                                <button
                                  className="member-card-bell"
                                  onClick={reminderAction.onClick}
                                  tabIndex={-1}
                                  aria-label={reminderAction.label}
                                  title={reminderAction.label}
                                >
                                  <Bell size={15} />
                                </button>
                              )}
                            </div>
                          </td>

                          <td data-label="Status">
                            <span
                              className="status-pill"
                              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                            >
                              <span className="status-dot" />
                              {cfg.label}
                            </span>
                          </td>

                          <td data-label="Plan">
                            <span className="plan-tag">{r.plan?.name ?? "—"}</span>
                          </td>

                          <td data-label="Method">
                            <span className="method-tag">
                              {METHOD_LABEL[r.payment_method ?? ""] ?? r.payment_method ?? "—"}
                            </span>
                          </td>

                          <td data-label="Date" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                            {formatDate(r.created_at)}
                          </td>

                          <td data-label="Amount">
                            <div className="amount-cell">
                              <span className="amount-paid">{formatINR(r.amount_paid ?? 0)}</span>
                              {due > 0 && (
                                <span className="amount-due">−{formatINR(due)} due</span>
                              )}
                            </div>
                          </td>

                          {/* Card action bar — mobile only; hidden on desktop via payments.css */}
                          <td className="card-action-cell" aria-hidden="true">
                            <CardActionBar actions={cardActions} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="pagination">
                    <span className="pagination-info">
                      Rows {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        disabled={safePage === 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <span className="pagination-btn active" style={{ cursor: "default" }}>
                        {safePage} / {totalPages}
                      </span>
                      <button
                        className="pagination-btn"
                        disabled={safePage === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          </div>

          {/* Mobile filter sheet — status only */}
          {isFilterSheetOpen && (
            <>
              <div className="filter-sheet-overlay" onClick={() => setIsFilterSheetOpen(false)} />
              <div className="filter-sheet" role="dialog" aria-label="Filter payments">
                <div className="filter-sheet-handle" />
                <div className="filter-sheet-title">Filter Payments</div>

                {filterSections.map((section, sIdx) => (
                  <div key={section.key}>
                    {sIdx > 0 && <div className="filter-sheet-divider" />}
                    <div className="filter-sheet-section-label">{section.label}</div>
                    {section.options.map((opt) => {
                      const isSelected = pendingFilters[section.key] === opt.value;
                      return (
                        <div
                          key={opt.value}
                          id={`filter-${section.key}-${opt.value}`}
                          className={`filter-sheet-row${isSelected ? " selected" : ""}`}
                          onClick={() =>
                            setPendingFilters((prev) => ({ ...prev, [section.key]: opt.value }))
                          }
                          role="radio"
                          aria-checked={isSelected}
                        >
                          <span className="filter-sheet-row-label">{opt.label}</span>
                          {opt.count !== undefined && (
                            <span className="filter-sheet-row-count">{opt.count}</span>
                          )}
                          {isSelected && <Check size={16} className="filter-sheet-check" />}
                        </div>
                      );
                    })}
                  </div>
                ))}

                <div className="filter-sheet-footer">
                  <button className="filter-sheet-reset" onClick={resetFilters}>
                    Reset
                  </button>
                  <button className="filter-sheet-apply" onClick={applyFilters}>
                    Apply Filters
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Payment detail drawer */}
      {selected && (
        <PaymentDrawer
          record={selected}
          onClose={() => setSelected(null)}
          onRecordPayment={() => {
            setSelected(null);
            setRecordTarget(selected);
          }}
          onRenew={() => {
            setSelected(null);
            setRenewTarget(selected);
          }}
        />
      )}

      {/* Renew Membership modal — overdue records */}
      {renewTarget && (
        <RenewMembershipModal
          isOpen
          memberId={renewTarget.member_id}
          onClose={() => setRenewTarget(null)}
        />
      )}

      {/* Record Payment modal — pending / overdue records */}
      {recordTarget && (
        <RecordPaymentModal
          isOpen
          membershipId={recordTarget.id}
          remainingBalance={Math.max(0, (recordTarget.plan?.price ?? 0) - (recordTarget.amount_paid ?? 0))}
          planPrice={recordTarget.plan?.price ?? 0}
          currentAmountPaid={recordTarget.amount_paid ?? 0}
          onClose={() => setRecordTarget(null)}
        />
      )}
    </>
  );
}
