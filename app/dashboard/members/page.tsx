"use client";

import "./members.css";
import { useState, useMemo } from "react";
import { Plus, SlidersHorizontal, Check, ChevronRight } from "lucide-react";
import type { Member } from "@/types";
import { formatINR, formatDate } from "@/lib/utils/format";
import { daysUntil } from "@/lib/utils/date";
import { STATUS_CONFIG } from "@/lib/constants/status";
import { useMembers, type MemberWithMembership } from "@/hooks/useMembers";
import { getMemberStatus } from "@/lib/members/status";
import { MemberDrawer } from "./MemberDrawer";
import { Nav } from "@/components/ui/Nav";
import { Avatar } from "@/components/ui/Avatar";
import { useGymSettings } from "@/hooks/useGymSettings";
import { MEMBER_FILTERS, type MemberFilterStatus } from "@/lib/members/filters";
import { AddMemberModal } from "@/components/members/AddMemberModal";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

// MemberWithMembership is exported from @/hooks/useMembers (single source)

type BranchFilter = "all" | string; // dynamic from gym_settings.branches

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function MembersPage() {
  const { data: members = [], isLoading: loading, error: fetchError } = useMembers();
  const { data: gymSettings } = useGymSettings();
  // Active filters — single record; add new keys to FilterValues + filterSections to extend
  type FilterValues = { status: MemberFilterStatus; branch: BranchFilter };
  const DEFAULT_FILTERS: FilterValues = { status: "all", branch: "all" };
  const [activeFilters, setActiveFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberWithMembership | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter sheet state (mobile)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS);

  const counts = useMemo(() => {
    const c: Record<MemberFilterStatus, number> = {
      all: members.length,
      active: 0,
      expiring: 0,
      overdue: 0,
      pending: 0,
      inactive: 0,
    };
    for (const m of members) {
      c[getMemberStatus(m) as MemberFilterStatus]++;
    }
    return c;
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesFilter = activeFilters.status === "all" || getMemberStatus(m) === activeFilters.status;
      const matchesBranch =
        activeFilters.branch === "all" ||
        (m as Member & { branch: string }).branch === activeFilters.branch;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        m.full_name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.email ?? "").toLowerCase().includes(q);
      return matchesFilter && matchesSearch && matchesBranch;
    });
  }, [members, activeFilters, search]);



  // Filter sections config — add a new object here to add a new filter parameter.
  // The sheet UI renders entirely from this array; no JSX changes needed.
  const filterSections = useMemo(
    () => [
      {
        key: "status" as keyof FilterValues,
        label: "Status",
        options: MEMBER_FILTERS.map((f) => ({
          value: f.key,
          label: f.label,
          count: counts[f.key] as number | undefined,
        })),
      },
      {
        key: "branch" as keyof FilterValues,
        label: "Branch",
        options: (["all", ...(gymSettings?.branches ?? [])] as string[]).map((b) => ({
          value: b,
          label: b === "all" ? "All branches" : b,
          count: undefined as number | undefined,
        })),
      },
      // → Future: { key: "plan", label: "Plan", options: [...] }
    ],
    [counts, gymSettings?.branches]
  );

  const hasActiveFilters = Object.values(activeFilters).some((v) => v !== "all");
  const activeFilterCount = Object.values(activeFilters).filter((v) => v !== "all").length;
  const chipLabel = (() => {
    const parts: string[] = [];
    if (activeFilters.status !== "all")
      parts.push(MEMBER_FILTERS.find((f) => f.key === activeFilters.status)?.label ?? activeFilters.status);
    if (activeFilters.branch !== "all") parts.push(activeFilters.branch);
    return parts.length > 0 ? parts.join(" · ") : "All members";
  })();

  const openFilterSheet = () => { setPendingFilters(activeFilters); setIsFilterSheetOpen(true); };
  const applyFilters   = () => { setActiveFilters(pendingFilters); setIsFilterSheetOpen(false); };
  const resetFilters   = () => setPendingFilters(DEFAULT_FILTERS);

  return (
    <>
      <Nav role="owner" />

      {loading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading members...
        </div>
      )}

      {fetchError && <div className="error-screen">Failed to load: {fetchError.message}</div>}

      {!loading && !fetchError && (
        <>
          <div className="page">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Members</h1>
              <p className="page-sub">
                {counts.all} total · {counts.active} active · {counts.overdue}{" "}
                overdue
              </p>
            </div>
            {/* Desktop only — hidden on mobile (FAB takes over) */}
            <button
              className="btn-solid members-add-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={14} />
              Add member
            </button>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-wrap">
              <svg
                className="search-icon"
                width="16"
                height="16"
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
                placeholder="Search by name, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Mobile: pill chip that opens bottom sheet */}
            <button
              id="members-filter-chip"
              className={`filter-chip${hasActiveFilters ? " has-filters" : ""}`}
              onClick={openFilterSheet}
              aria-label="Open filter options"
            >
              <SlidersHorizontal size={14} />
              {chipLabel}
              {hasActiveFilters && (
                <span className="filter-chip-badge">{activeFilterCount}</span>
              )}
            </button>

            {/* Desktop: inline tab rows (hidden on mobile via members.css) */}
            <div className="members-filter-tabs-group">
              <div className="filter-tabs">
                {MEMBER_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`filter-tab ${activeFilters.status === f.key ? "active" : ""}`}
                    onClick={() => setActiveFilters((prev) => ({ ...prev, status: f.key }))}
                  >
                    {f.label}
                    <span className="filter-count">{counts[f.key]}</span>
                  </button>
                ))}
              </div>

              {/* Branch filter */}
              <div className="filter-tabs" style={{ marginLeft: "auto" }}>
                {(
                  ["all", ...(gymSettings?.branches || [])] as BranchFilter[]
                ).map((b) => (
                  <button
                    key={b}
                    className={`filter-tab ${activeFilters.branch === b ? "active" : ""}`}
                    onClick={() => setActiveFilters((prev) => ({ ...prev, branch: b }))}
                  >
                    {b === "all" ? "All branches" : b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <div className="table-meta">
              <span>
                Showing {filtered.length} of {counts.all} members
                {search && ` · "${search}"`}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⌀</div>
                No members found
                {search && ` matching "${search}"`}
              </div>
            ) : (
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Status</th>
                    <th>Branch</th>
                    <th>Plan</th>
                    <th>Expires</th>
                    <th>Amount paid</th>
                    {/* card-action-th: hidden on desktop; keeps column count consistent */}
                    <th className="card-action-th" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const status = getMemberStatus(m);
                    const cfg = STATUS_CONFIG[status];
                    const ms = m.membership;
                    const plan = ms?.plan;
                    const days = ms ? daysUntil(ms.end_date) : null;

                    return (
                      <tr
                        key={m.id}
                        onClick={() => { if (window.innerWidth > 640) setSelected(m); }}
                      >
                        {/* Member — no data-label: first-child renders full-width as card header */}
                        <td>
                          <div className="row-cell">
                            <Avatar
                              name={m.full_name}
                              src={m.profile_photo_url}
                              size={36}
                            />
                            <div>
                              <div className="row-name">{m.full_name}</div>
                              <div className="row-sub">{m.phone}</div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td data-label="Status">
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

                        {/* Branch */}
                        <td data-label="Branch">
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {(m as Member & { branch: string }).branch ?? "—"}
                          </span>
                        </td>

                        {/* Plan */}
                        <td data-label="Plan">
                          {plan ? (
                            <span className="tag">{plan.name}</span>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: 13,
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>

                        {/* Expires */}
                        <td data-label="Expires">
                          {ms ? (
                            <span
                              className={`expiry-text ${
                                status === "overdue"
                                  ? "expiry-overdue"
                                  : status === "expiring"
                                    ? "expiry-warning"
                                    : ""
                              }`}
                            >
                              {formatDate(ms.end_date)}
                              {status === "expiring" && days !== null && (
                                <span style={{ marginLeft: 6, fontSize: 12 }}>
                                  ({days}d)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: 13,
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td data-label="Amount paid">
                          <span className="amount-text">
                            {ms ? formatINR(ms.amount_paid ?? 0) : "—"}
                          </span>
                        </td>

                        {/* View details — mobile card only; hidden on desktop */}
                        <td className="card-action-cell" aria-hidden="true">
                          <button
                            className="card-action-btn"
                            onClick={() => setSelected(m)}
                            tabIndex={-1}
                          >
                            View details
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          </div>

          {/* FAB — mobile only; sits above the bottom tab bar */}
          <button
            id="members-fab"
            className="fab"
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Add member"
          >
            <Plus size={24} />
          </button>

          {/* Mobile filter sheet — data-driven: add to filterSections to extend */}
          {isFilterSheetOpen && (
            <>
              <div className="filter-sheet-overlay" onClick={() => setIsFilterSheetOpen(false)} />
              <div className="filter-sheet" role="dialog" aria-label="Filter members">
                <div className="filter-sheet-handle" />
                <div className="filter-sheet-title">Filter Members</div>

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

      {/* Member detail drawer */}
      {selected && (
        <MemberDrawer 
          member={members.find(m => m.id === selected.id) || selected} 
          onClose={() => setSelected(null)} 
        />
      )}

      <AddMemberModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </>
  );
}
