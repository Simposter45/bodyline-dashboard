"use client";

import "./members.css";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
import type { Member, MemberMembership, MembershipPlan } from "@/types";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type MemberWithMembership = Member & {
  membership: (MemberMembership & { plan: MembershipPlan }) | null;
};

type FilterStatus =
  | "all"
  | "active"
  | "expiring"
  | "overdue"
  | "pending"
  | "inactive";

type BranchFilter = "all" | "Sector 14" | "DLF Phase 1" | "Sohna Road";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function sevenDaysFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
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

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getMemberStatus(m: MemberWithMembership): FilterStatus {
  if (!m.is_active) return "inactive";
  if (!m.membership) return "active";
  const today = todayISO();
  const weekFromNow = sevenDaysFromNow();
  const { payment_status, end_date } = m.membership;
  if (payment_status === "overdue") return "overdue";
  if (payment_status === "pending") return "pending";
  if (end_date >= today && end_date <= weekFromNow) return "expiring";
  return "active";
}

// ------------------------------------------------------------------
// Fetch
// ------------------------------------------------------------------

async function fetchMembers(): Promise<MemberWithMembership[]> {
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .order("joined_date", { ascending: false });

  const { data: memberships } = await supabase
    .from("member_memberships")
    .select("*, plan:membership_plans(*)")
    .order("created_at", { ascending: false });

  const memberList = (members ?? []) as Member[];
  const membershipList = (memberships ?? []) as (MemberMembership & {
    plan: MembershipPlan;
  })[];

  // Get latest membership per member
  const latestMembership = new Map<
    string,
    MemberMembership & { plan: MembershipPlan }
  >();
  for (const ms of membershipList) {
    if (!latestMembership.has(ms.member_id)) {
      latestMembership.set(ms.member_id, ms);
    }
  }

  return memberList.map((m) => ({
    ...m,
    membership: latestMembership.get(m.id) ?? null,
  }));
}

// ------------------------------------------------------------------
// Status pill config
// ------------------------------------------------------------------

const STATUS_CONFIG: Record<
  FilterStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  active: {
    label: "Active",
    bg: "rgba(74,222,128,0.1)",
    color: "#4ade80",
    border: "rgba(74,222,128,0.2)",
  },
  expiring: {
    label: "Expiring soon",
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
  pending: {
    label: "Pending",
    bg: "rgba(251,191,36,0.08)",
    color: "#fbbf24",
    border: "rgba(251,191,36,0.15)",
  },
  inactive: {
    label: "Inactive",
    bg: "rgba(255,255,255,0.04)",
    color: "#555450",
    border: "rgba(255,255,255,0.07)",
  },
  all: {
    label: "All",
    bg: "transparent",
    color: "#8a8987",
    border: "transparent",
  },
};

// ------------------------------------------------------------------
// Member Detail Drawer
// ------------------------------------------------------------------

function MemberDrawer({
  member,
  onClose,
}: {
  member: MemberWithMembership;
  onClose: () => void;
}) {
  const status = getMemberStatus(member);
  const cfg = STATUS_CONFIG[status];
  const ms = member.membership;
  const plan = ms?.plan;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        {/* Header */}
        <div className="drawer-header">
          <button className="drawer-close" onClick={onClose}>
            <svg
              width="18"
              height="18"
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
          <div
            className="avatar avatar-lg"
            style={{ padding: 0 }}
          >
            {member.profile_photo_url ? (
              <a
                href={member.profile_photo_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "block", width: "100%", height: "100%" }}
              >
                <img
                  src={member.profile_photo_url}
                  alt={member.full_name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                    cursor: "pointer",
                  }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.parentElement!.style.display = "none";
                    target
                      .closest(".avatar-lg")
                      ?.querySelector("span")
                      ?.removeAttribute("style");
                  }}
                />
              </a>
            ) : null}
            <span
              style={{
                display: member.profile_photo_url ? "none" : "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
              }}
            >
              {getInitials(member.full_name)}
            </span>
          </div>
          <div>
            <h2 className="drawer-name">{member.full_name}</h2>
            <p className="drawer-phone">{member.phone}</p>
            {member.email && <p className="drawer-email">{member.email}</p>}
          </div>
        </div>

        {/* Status */}
        <div
          className="drawer-status-pill"
          style={{
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.label}
        </div>

        {/* Divider */}
        <div className="drawer-divider" />

        {/* Membership info */}
        {ms && plan ? (
          <div className="drawer-section">
            <p className="drawer-section-label">Current Membership</p>
            <div className="drawer-info-grid">
              <div className="drawer-info-item">
                <span className="drawer-info-key">Plan</span>
                <span className="drawer-info-val">{plan.name}</span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Branch</span>
                <span className="drawer-info-val">
                  {(member as Member & { branch: string }).branch ?? "—"}
                </span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Price</span>
                <span className="drawer-info-val">{formatINR(plan.price)}</span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Start date</span>
                <span className="drawer-info-val">
                  {formatDate(ms.start_date)}
                </span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Expiry</span>
                <span
                  className="drawer-info-val"
                  style={{
                    color:
                      status === "expiring" || status === "overdue"
                        ? "#f87171"
                        : "inherit",
                  }}
                >
                  {formatDate(ms.end_date)}
                  {status === "expiring" && (
                    <span
                      style={{ color: "#fbbf24", marginLeft: 6, fontSize: 12 }}
                    >
                      ({daysUntil(ms.end_date)}d left)
                    </span>
                  )}
                </span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Paid</span>
                <span className="drawer-info-val" style={{ color: "#4ade80" }}>
                  {formatINR(ms.amount_paid ?? 0)}
                </span>
              </div>
              {ms.payment_status !== "paid" && (
                <div className="drawer-info-item">
                  <span className="drawer-info-key">Due</span>
                  <span
                    className="drawer-info-val"
                    style={{ color: "#f87171" }}
                  >
                    {formatINR(plan.price - (ms.amount_paid ?? 0))}
                  </span>
                </div>
              )}
              <div className="drawer-info-item">
                <span className="drawer-info-key">Method</span>
                <span
                  className="drawer-info-val"
                  style={{ textTransform: "capitalize" }}
                >
                  {ms.payment_method ?? "—"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "20px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No membership record found.
          </div>
        )}

        <div className="drawer-divider" />

        {/* Personal info */}
        <div className="drawer-section">
          <p className="drawer-section-label">Personal Details</p>
          <div className="drawer-info-grid">
            <div className="drawer-info-item">
              <span className="drawer-info-key">Joined</span>
              <span className="drawer-info-val">
                {formatDate(member.joined_date)}
              </span>
            </div>
            {member.date_of_birth && (
              <div className="drawer-info-item">
                <span className="drawer-info-key">DOB</span>
                <span className="drawer-info-val">
                  {formatDate(member.date_of_birth)}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Documents */}
        {member.id_proof_url && (
          <>
            <div className="drawer-divider" />
            <div className="drawer-section">
              <p className="drawer-section-label">Identity Document</p>

              <a
                href={member.id_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--bg3)",
                  border: "1px solid var(--border-hi)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 14px",
                  textDecoration: "none",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 500,
                  transition: "border-color 0.15s",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-blue)"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Aadhaar / ID Proof
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="2"
                  style={{ marginLeft: "auto" }}
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="drawer-actions">
          <button className="drawer-btn drawer-btn-primary">
            Renew membership
          </button>
          <button className="drawer-btn drawer-btn-secondary">
            Record payment
          </button>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberWithMembership | null>(null);
  const [branch, setBranch] = useState<BranchFilter>("all");

  useEffect(() => {
    fetchMembers()
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<FilterStatus, number> = {
      all: members.length,
      active: 0,
      expiring: 0,
      overdue: 0,
      pending: 0,
      inactive: 0,
    };
    for (const m of members) {
      c[getMemberStatus(m)]++;
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

  const FILTERS: { key: FilterStatus; label: string }[] = [
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

      {error && <div className="error-screen">Failed to load: {error}</div>}

      {!loading && !error && (
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
