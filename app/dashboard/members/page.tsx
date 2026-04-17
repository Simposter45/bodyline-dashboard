"use client";

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
            className="drawer-avatar"
            style={{ padding: 0, overflow: "hidden" }}
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
                      .closest(".drawer-avatar")
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
        
        ::-webkit-scrollbar {
          display: none;
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
          font-weight: 400;
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
        .add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--accent-green);
          color: #0d0d0f;
          border: none;
          border-radius: var(--radius-sm);
          padding: 10px 18px;
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: opacity 0.15s;
          white-space: nowrap;
        }
        .add-btn:hover { opacity: 0.88; }

        /* ── Toolbar ── */
        .toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
          max-width: 340px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
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
          padding: 10px 14px 10px 40px;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-input::placeholder { color: var(--text-muted); }
        .search-input:focus { border-color: var(--border-hi); }

        /* ── Filter tabs ── */
        .filter-tabs {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
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
          font-family: var(--font-body);
          background: transparent;
          color: var(--text-secondary);
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
          min-width: 20px;
          text-align: center;
        }
        .filter-tab.active .filter-count {
          background: rgba(255,255,255,0.08);
          color: var(--text-secondary);
        }

        /* ── Table ── */
        .table-wrap {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .table-meta {
          padding: 16px 24px;
          font-size: 13px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead th {
          padding: 12px 24px;
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
          padding: 16px 24px;
          vertical-align: middle;
        }
        td:last-child { text-align: right; }

        /* ── Member name cell ── */
        .member-cell {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .member-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .member-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .member-phone {
          font-size: 12px;
          color: var(--text-muted);
        }

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
        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }

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

        /* ── Expiry text ── */
        .expiry-text {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .expiry-warning { color: var(--accent-amber); }
        .expiry-overdue { color: var(--accent-red); }

        /* ── Amount ── */
        .amount-text {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        /* ── Empty state ── */
        .empty-state {
          padding: 64px 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        .empty-icon {
          font-size: 2rem;
          margin-bottom: 12px;
          opacity: 0.4;
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
          letter-spacing: 0.05em;
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
          top: 0;
          right: 0;
          width: 420px;
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

        .drawer-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .drawer-close {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .drawer-close:hover { color: var(--text-primary); border-color: var(--border-hi); }

        .drawer-identity {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .drawer-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .drawer-name {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .drawer-phone {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .drawer-email {
          font-size: 12px;
          color: var(--text-muted);
        }

        .drawer-status-pill {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 99px;
          margin-bottom: 24px;
        }

        .drawer-divider {
          height: 1px;
          background: var(--border);
          margin: 20px 0;
        }

        .drawer-section { margin-bottom: 4px; }
        .drawer-section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 14px;
        }
        .drawer-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .drawer-info-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .drawer-info-key {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 500;
        }
        .drawer-info-val {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .drawer-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 28px;
        }
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
        .drawer-btn-primary {
          background: var(--accent-green);
          color: #0d0d0f;
        }
        .drawer-btn-secondary {
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          color: var(--text-primary);
        }

        @media (max-width: 900px) {
          thead th:nth-child(4),
          td:nth-child(4) { display: none; }
        }
        @media (max-width: 700px) {
          thead th:nth-child(3),
          td:nth-child(3) { display: none; }
          .page { padding: 24px 16px 60px; }
          .nav { padding: 16px; }
        }
      `}</style>

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
            <button className="add-btn">
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
                          <div className="member-cell">
                            <div
                              className="member-avatar"
                              style={{ padding: 0, overflow: "hidden" }}
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
                              <div className="member-name">{m.full_name}</div>
                              <div className="member-phone">{m.phone}</div>
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
                            <span className="plan-tag">{plan.name}</span>
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
