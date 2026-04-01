"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Member,
  MemberMembership,
  MembershipPlan,
  Attendance,
  Trainer,
} from "@/types";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface DashboardData {
  totalActive: number;
  newThisMonth: number;
  expiringThisWeek: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  overdueMembers: (MemberMembership & {
    member: Member;
    plan: MembershipPlan;
  })[];
  todayCheckins: number;
  currentlyInGym: number;
  todayAttendance: (Attendance & { member: Member })[];
  trainers: Trainer[];
}

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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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

// ------------------------------------------------------------------
// Data fetching
// ------------------------------------------------------------------

async function fetchDashboardData(): Promise<DashboardData> {
  const today = todayISO();
  const weekFromNow = sevenDaysFromNow();
  const monthStart = startOfMonth();
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const [
    activeMembersRes,
    newThisMonthRes,
    membershipsRes,
    todayAttendanceRes,
    trainersRes,
  ] = await Promise.all([
    supabase.from("members").select("id").eq("is_active", true),
    supabase
      .from("members")
      .select("id")
      .eq("is_active", true)
      .gte("joined_date", monthStart),
    supabase
      .from("member_memberships")
      .select("*, member:members(*), plan:membership_plans(*)")
      .order("created_at", { ascending: false }),
    supabase
      .from("attendance")
      .select("*, member:members(*)")
      .gte("check_in", todayStart)
      .lte("check_in", todayEnd)
      .order("check_in", { ascending: false }),
    supabase.from("trainers").select("*").eq("is_active", true),
  ]);

  const allMemberships = (membershipsRes.data ?? []) as (MemberMembership & {
    member: Member;
    plan: MembershipPlan;
  })[];

  const expiringThisWeek = allMemberships.filter(
    (m) =>
      m.end_date >= today &&
      m.end_date <= weekFromNow &&
      m.payment_status === "paid",
  ).length;

  const totalCollected = allMemberships
    .filter((m) => m.payment_status === "paid")
    .reduce((sum, m) => sum + (m.amount_paid ?? 0), 0);

  const totalPending = allMemberships
    .filter((m) => m.payment_status === "pending")
    .reduce((sum, m) => {
      const planPrice = (m.plan as MembershipPlan)?.price ?? 0;
      return sum + planPrice;
    }, 0);

  const overdueMembers = allMemberships.filter(
    (m) => m.payment_status === "overdue",
  );

  const totalOverdue = overdueMembers.reduce((sum, m) => {
    const planPrice = (m.plan as MembershipPlan)?.price ?? 0;
    const paid = m.amount_paid ?? 0;
    return sum + (planPrice - paid);
  }, 0);

  const todayAttendance = (todayAttendanceRes.data ?? []) as (Attendance & {
    member: Member;
  })[];

  const currentlyInGym = todayAttendance.filter((a) => !a.check_out).length;

  return {
    totalActive: activeMembersRes.data?.length ?? 0,
    newThisMonth: newThisMonthRes.data?.length ?? 0,
    expiringThisWeek,
    totalCollected,
    totalPending,
    totalOverdue,
    overdueMembers,
    todayCheckins: todayAttendance.length,
    currentlyInGym,
    todayAttendance,
    trainers: trainersRes.data ?? [],
  };
}

// ------------------------------------------------------------------
// Stat card
// ------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  accent,
  large,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "amber" | "red" | "blue";
  large?: boolean;
}) {
  const accentMap = {
    green: "var(--accent-green)",
    amber: "var(--accent-amber)",
    red: "var(--accent-red)",
    blue: "var(--accent-blue)",
  };
  const color = accent ? accentMap[accent] : "var(--text-primary)";

  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p
        className="stat-value"
        style={{ color, fontSize: large ? "2.6rem" : "2rem" }}
      >
        {value}
      </p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17) setGreeting("Good evening");
  }, []);

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:           #0d0d0f;
          --bg2:          #141417;
          --bg3:          #1c1c21;
          --border:       rgba(255,255,255,0.07);
          --border-hi:    rgba(255,255,255,0.13);
          --text-primary: #f0efe8;
          --text-secondary: #8a8987;
          --text-muted:   #555450;
          --accent-green: #4ade80;
          --accent-amber: #fbbf24;
          --accent-red:   #f87171;
          --accent-blue:  #60a5fa;
          --accent-green-dim: rgba(74,222,128,0.12);
          --accent-amber-dim: rgba(251,191,36,0.12);
          --accent-red-dim:   rgba(248,113,113,0.12);
          --accent-blue-dim:  rgba(96,165,250,0.12);
          --font-display: 'Syne', sans-serif;
          --font-body:    'DM Sans', sans-serif;
          --radius:       14px;
          --radius-sm:    8px;
        }

        body {
          background: var(--bg);
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 15px;
          line-height: 1.6;
          min-height: 100vh;
        }

        .page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 32px 80px;
        }

        /* ── Header ── */
        .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 48px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .header-left {}
        .greeting {
          font-family: var(--font-display);
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.1;
          color: var(--text-primary);
        }
        .greeting span {
          color: var(--accent-green);
        }
        .date-pill {
          display: inline-block;
          margin-top: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 300;
          letter-spacing: 0.02em;
        }
        .live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: 99px;
          padding: 6px 14px;
        }
        .live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--accent-green);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }

        /* ── Section label ── */
        .section-label {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 16px;
          margin-top: 40px;
        }

        /* ── Stat cards grid ── */
        .stats-grid {
          display: grid;
          gap: 2px;
        }
        .stats-grid-members {
          grid-template-columns: repeat(4, 1fr);
        }
        .stats-grid-revenue {
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 768px) {
          .stats-grid-members,
          .stats-grid-revenue { grid-template-columns: repeat(2, 1fr); }
        }

        .stat-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 0;
          padding: 28px 24px;
          transition: border-color 0.2s;
        }
        .stat-card:first-child { border-radius: var(--radius) 0 0 var(--radius); }
        .stat-card:last-child  { border-radius: 0 var(--radius) var(--radius) 0; }
        .stats-grid-members .stat-card:nth-child(1) { border-radius: var(--radius) 0 0 var(--radius); }
        .stats-grid-members .stat-card:nth-child(4) { border-radius: 0 var(--radius) var(--radius) 0; }
        .stats-grid-revenue .stat-card:nth-child(1) { border-radius: var(--radius) 0 0 var(--radius); }
        .stats-grid-revenue .stat-card:nth-child(3) { border-radius: 0 var(--radius) var(--radius) 0; }

        .stat-card:hover { border-color: var(--border-hi); }
        .stat-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .stat-value {
          font-family: var(--font-display);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 6px;
        }
        .stat-sub {
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* ── Bottom grid ── */
        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          margin-top: 2px;
        }
        @media (max-width: 900px) {
          .bottom-grid { grid-template-columns: 1fr; }
        }

        /* ── Panel ── */
        .panel {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }
        .panel-title {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .panel-badge {
          font-size: 12px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 99px;
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }

        /* ── Attendance rows ── */
        .attendance-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .attendance-row:last-child { border-bottom: none; }
        .attendance-row:hover { background: var(--bg3); }

        .avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display);
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .attendance-info { flex: 1; min-width: 0; }
        .attendance-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .attendance-time {
          font-size: 12px;
          color: var(--text-muted);
        }
        .status-pill {
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 99px;
          flex-shrink: 0;
        }
        .status-in {
          background: var(--accent-green-dim);
          color: var(--accent-green);
        }
        .status-out {
          background: var(--bg3);
          color: var(--text-muted);
        }

        /* ── Overdue rows ── */
        .overdue-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .overdue-row:last-child { border-bottom: none; }
        .overdue-row:hover { background: var(--bg3); }
        .overdue-info { flex: 1; min-width: 0; }
        .overdue-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .overdue-plan {
          font-size: 12px;
          color: var(--text-muted);
        }
        .overdue-amount {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--accent-red);
          flex-shrink: 0;
        }
        .overdue-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--accent-red);
          flex-shrink: 0;
          opacity: 0.7;
        }

        /* ── Trainer chips ── */
        .trainer-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .trainer-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
        }
        .trainer-row:last-child { border-bottom: none; }
        .trainer-avatar {
          width: 40px; height: 40px;
          border-radius: var(--radius-sm);
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          color: var(--accent-blue);
          flex-shrink: 0;
        }
        .trainer-info { flex: 1; }
        .trainer-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .trainer-spec {
          font-size: 12px;
          color: var(--text-muted);
        }
        .trainer-active {
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 99px;
          background: var(--accent-blue-dim);
          color: var(--accent-blue);
        }

        /* ── Revenue highlight ── */
        .revenue-highlight {
          background: linear-gradient(135deg, rgba(74,222,128,0.06) 0%, rgba(74,222,128,0.02) 100%);
          border-color: rgba(74,222,128,0.15);
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

        /* ── Gym in-use bar ── */
        .gym-bar-wrap {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }
        .gym-bar-label {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }
        .gym-bar-track {
          height: 4px;
          background: var(--bg3);
          border-radius: 99px;
          overflow: hidden;
        }
        .gym-bar-fill {
          height: 100%;
          background: var(--accent-green);
          border-radius: 99px;
          transition: width 0.8s ease;
        }

        /* ── Divider ── */
        .divider {
          height: 1px;
          background: var(--border);
          margin: 40px 0 0;
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
        }
        .nav-logo span { color: var(--accent-green); }
        .nav-links {
          display: flex;
          gap: 4px;
        }
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
        .nav-link.active {
          background: var(--bg3);
          color: var(--text-primary);
          font-weight: 500;
        }
        .nav-owner {
          font-size: 13px;
          color: var(--text-muted);
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">
          Bodyline<span>.</span>
        </div>
        <div className="nav-links">
          <a href="/dashboard" className="nav-link active">
            Dashboard
          </a>
          <a href="/dashboard/members" className="nav-link">
            Members
          </a>
          <a href="/dashboard/payments" className="nav-link">
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
          Loading dashboard...
        </div>
      )}

      {error && <div className="error-screen">Failed to load: {error}</div>}

      {!loading && !error && data && (
        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="header-left">
              <h1 className="greeting">
                {greeting},<br />
                <span>Pradeep.</span>
              </h1>
              <span className="date-pill">{today}</span>
            </div>
            <div className="live-badge">
              <div className="live-dot" />
              Live data
            </div>
          </div>

          {/* Members stats */}
          <p className="section-label">Members</p>
          <div className="stats-grid stats-grid-members">
            <StatCard
              label="Active members"
              value={String(data.totalActive)}
              large
              accent="green"
            />
            <StatCard
              label="New this month"
              value={String(data.newThisMonth)}
              sub="joined recently"
            />
            <StatCard
              label="Expiring this week"
              value={String(data.expiringThisWeek)}
              accent={data.expiringThisWeek > 0 ? "amber" : undefined}
              sub="need renewal"
            />
            <StatCard
              label="In gym right now"
              value={String(data.currentlyInGym)}
              accent={data.currentlyInGym > 0 ? "blue" : undefined}
              sub={`${data.todayCheckins} check-ins today`}
            />
          </div>

          {/* Revenue stats */}
          <p className="section-label">Revenue</p>
          <div className="stats-grid stats-grid-revenue">
            <StatCard
              label="Total collected"
              value={formatINR(data.totalCollected)}
              large
              accent="green"
            />
            <StatCard
              label="Pending"
              value={formatINR(data.totalPending)}
              accent={data.totalPending > 0 ? "amber" : undefined}
              sub="awaiting payment"
            />
            <StatCard
              label="Overdue"
              value={formatINR(data.totalOverdue)}
              accent={data.totalOverdue > 0 ? "red" : undefined}
              sub={`${data.overdueMembers.length} member${data.overdueMembers.length !== 1 ? "s" : ""}`}
            />
          </div>

          {/* Bottom panels */}
          <p className="section-label">Today</p>
          <div className="bottom-grid">
            {/* Today's attendance */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Check-ins today</span>
                <span className="panel-badge">{data.todayCheckins} total</span>
              </div>
              {data.todayAttendance.length === 0 ? (
                <div
                  style={{
                    padding: "32px 24px",
                    color: "var(--text-muted)",
                    fontSize: "14px",
                  }}
                >
                  No check-ins yet today.
                </div>
              ) : (
                <>
                  {data.todayAttendance.map((a) => (
                    <div key={a.id} className="attendance-row">
                      <div className="avatar">
                        {getInitials(a.member.full_name)}
                      </div>
                      <div className="attendance-info">
                        <div className="attendance-name">
                          {a.member.full_name}
                        </div>
                        <div className="attendance-time">
                          In {formatTime(a.check_in)}
                          {a.check_out
                            ? ` · Out ${formatTime(a.check_out)}`
                            : ""}
                        </div>
                      </div>
                      <span
                        className={`status-pill ${a.check_out ? "status-out" : "status-in"}`}
                      >
                        {a.check_out ? "Left" : "In gym"}
                      </span>
                    </div>
                  ))}
                  <div className="gym-bar-wrap">
                    <div className="gym-bar-label">
                      <span>Currently in gym</span>
                      <span>
                        {data.currentlyInGym} / {data.todayCheckins}
                      </span>
                    </div>
                    <div className="gym-bar-track">
                      <div
                        className="gym-bar-fill"
                        style={{
                          width: `${data.todayCheckins > 0 ? (data.currentlyInGym / data.todayCheckins) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Overdue + Trainers stacked */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2px" }}
            >
              {/* Overdue members */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Overdue payments</span>
                  <span
                    className="panel-badge"
                    style={{
                      background:
                        data.overdueMembers.length > 0
                          ? "var(--accent-red-dim)"
                          : undefined,
                      color:
                        data.overdueMembers.length > 0
                          ? "var(--accent-red)"
                          : undefined,
                      borderColor:
                        data.overdueMembers.length > 0
                          ? "rgba(248,113,113,0.25)"
                          : undefined,
                    }}
                  >
                    {data.overdueMembers.length} members
                  </span>
                </div>
                {data.overdueMembers.length === 0 ? (
                  <div
                    style={{
                      padding: "24px",
                      color: "var(--text-muted)",
                      fontSize: "14px",
                    }}
                  >
                    All payments up to date.
                  </div>
                ) : (
                  data.overdueMembers.map((m) => {
                    const plan = m.plan as MembershipPlan;
                    const due = plan.price - (m.amount_paid ?? 0);
                    return (
                      <div key={m.id} className="overdue-row">
                        <div className="overdue-dot" />
                        <div className="overdue-info">
                          <div className="overdue-name">
                            {m.member.full_name}
                          </div>
                          <div className="overdue-plan">
                            {plan.name} · expired {m.end_date}
                          </div>
                        </div>
                        <div className="overdue-amount">{formatINR(due)}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Trainers on duty */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Trainers</span>
                  <span className="panel-badge">
                    {data.trainers.length} active
                  </span>
                </div>
                <div className="trainer-grid">
                  {data.trainers.map((t) => (
                    <div key={t.id} className="trainer-row">
                      <div className="trainer-avatar">
                        {getInitials(t.full_name)}
                      </div>
                      <div className="trainer-info">
                        <div className="trainer-name">{t.full_name}</div>
                        <div className="trainer-spec">
                          {t.specialization ?? "—"}
                        </div>
                      </div>
                      <span className="trainer-active">On duty</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
