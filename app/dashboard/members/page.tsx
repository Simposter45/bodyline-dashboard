"use client";

import "./members.css";
import { useState, useMemo } from "react";
import type { Member } from "@/types";
import { formatINR, formatDate, getInitials } from "@/lib/utils/format";
import { daysUntil } from "@/lib/utils/date";
import { STATUS_CONFIG } from "@/lib/constants/status";
import { useMembers, type MemberWithMembership } from "@/hooks/useMembers";
import { getMemberStatus } from "@/lib/members/status";
import { MemberDrawer } from "./MemberDrawer";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

// MemberWithMembership is exported from @/hooks/useMembers (single source)
// MemberFilterStatus uses StatusKey values relevant to members (excludes 'paid' which is Payments-only)
type MemberFilterStatus = "all" | "active" | "expiring" | "overdue" | "pending" | "inactive";

type BranchFilter = "all" | string; // dynamic from gym_settings.branches

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function MembersPage() {
  const { data: members = [], isLoading: loading, error: fetchError } = useMembers();
  const [filter, setFilter] = useState<MemberFilterStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberWithMembership | null>(null);
  const [branch, setBranch] = useState<BranchFilter>("all");

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
      const matchesFilter = filter === "all" || getMemberStatus(m) === filter;
      const matchesBranch =
        branch === "all" ||
        (m as Member & { branch: string }).branch === branch;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        m.full_name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.email ?? "").toLowerCase().includes(q);
      return matchesFilter && matchesSearch && matchesBranch;
    });
  }, [members, filter, search, branch]);

  const FILTERS: { key: MemberFilterStatus; label: string }[] = [
    { key: "all", label: "All members" },
    { key: "active", label: "Active" },
    { key: "expiring", label: "Expiring soon" },
    { key: "overdue", label: "Overdue" },
    { key: "pending", label: "Pending" },
    { key: "inactive", label: "Inactive" },
  ];

  return (
    <>
      {/* Nav */}
      <nav className="nav">
        <a href="/dashboard" className="nav-logo">
          Gym<span>.</span>
        </a>
        <div className="nav-links">
          <a href="/dashboard" className="nav-link">
            Dashboard
          </a>
          <a href="/dashboard/members" className="nav-link active">
            Members
          </a>
          <a href="/dashboard/payments" className="nav-link">
            Payments
          </a>
          <a href="/dashboard/trainers" className="nav-link">
            Trainers
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="nav-owner">Pradeep · Owner</span>
          <button
            onClick={async () => {
              const { createClient } = await import("@/lib/supabase/client");
              await createClient().auth.signOut();
              window.location.href = "/login";
            }}
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "5px 12px",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {loading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading members...
        </div>
      )}

      {fetchError && <div className="error-screen">Failed to load: {fetchError.message}</div>}

      {!loading && !fetchError && (
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
            <button className="btn-solid">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
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

            {/* Branch filter */}
            <div className="filter-tabs" style={{ marginLeft: "auto" }}>
              {(
                [
                  "all",
                  "Sector 14",
                  "DLF Phase 1",
                  "Sohna Road",
                ] as BranchFilter[]
              ).map((b) => (
                <button
                  key={b}
                  className={`filter-tab ${branch === b ? "active" : ""}`}
                  onClick={() => setBranch(b)}
                >
                  {b === "all" ? "All branches" : b}
                </button>
              ))}
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
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Status</th>
                    <th>Branch</th>
                    <th>Plan</th>
                    <th>Expires</th>
                    <th>Amount paid</th>
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
                      <tr key={m.id} onClick={() => setSelected(m)}>
                        {/* Member */}
                        <td>
                          <div className="row-cell">
                            <div
                              className="avatar"
                              style={{ padding: 0 }}
                            >
                              {m.profile_photo_url ? (
                                <img
                                  src={m.profile_photo_url}
                                  alt={m.full_name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "50%",
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.nextElementSibling?.removeAttribute(
                                      "style",
                                    );
                                  }}
                                />
                              ) : null}
                              <span
                                style={{
                                  display: m.profile_photo_url
                                    ? "none"
                                    : "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "100%",
                                  height: "100%",
                                }}
                              >
                                {getInitials(m.full_name)}
                              </span>
                            </div>
                            <div>
                              <div className="row-name">{m.full_name}</div>
                              <div className="row-sub">{m.phone}</div>
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

                        {/* Branch */}
                        <td>
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
                        <td>
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
                        <td>
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
                        <td>
                          <span className="amount-text">
                            {ms ? formatINR(ms.amount_paid ?? 0) : "—"}
                          </span>
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

      {/* Member detail drawer */}
      {selected && (
        <MemberDrawer member={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
