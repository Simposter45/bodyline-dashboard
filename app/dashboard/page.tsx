"use client";

import "./dashboard.css";
import { Nav } from "@/components/ui/Nav";
import { StatCard } from "@/components/ui/StatCard";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatINR, formatTime, getGreeting } from "@/lib/utils/format";

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { data: userInfo } = useCurrentUser();

  const userName = userInfo?.userName ?? "";
  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Nav role="owner" />

      {isLoading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading dashboard...
        </div>
      )}

      {error && (
        <div className="error-screen">Failed to load: {error.message}</div>
      )}

      {!isLoading && !error && stats && (
        <div className="page">

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="greeting">
                {getGreeting()},<br />
                <span>{userName.split(" ")[0]}</span>
              </h1>
              <span className="date-pill">{todayStr}</span>
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
              value={stats.members.totalActive}
              accent="green"
            />
            <StatCard
              label="New this month"
              value={stats.members.newThisMonth}
              sub="joined recently"
            />
            <StatCard
              label="Expiring this week"
              value={stats.members.expiringThisWeek}
              sub="need renewal"
            />
            <StatCard
              label="In gym right now"
              value={stats.today.currentlyInGym}
              sub={`${stats.today.todayCheckins} check-ins today`}
            />
          </div>

          {/* Revenue stats */}
          <p className="section-label">Revenue</p>
          <div className="stats-grid stats-grid-revenue">
            <StatCard
              label="Total collected"
              value={formatINR(stats.revenue.totalCollected)}
              accent="green"
            />
            <StatCard
              label="Pending"
              value={formatINR(stats.revenue.totalPending)}
              sub="awaiting payment"
            />
            <StatCard
              label="Overdue"
              value={formatINR(stats.revenue.totalOverdue)}
              accent="red"
              sub={`${stats.revenue.overdueCount} members`}
            />
          </div>

          {/* Today panels */}
          <p className="section-label">Today</p>
          <div className="bottom-grid">

            {/* Check-ins panel */}
            <Panel title="Check-ins today" badge={stats.today.todayCheckins}>
              {stats.today.attendance.length === 0 ? (
                <div className="panel-empty">No check-ins today.</div>
              ) : (
                stats.today.attendance.map((a) => (
                  <div key={a.id} className="row-item">
                    <Avatar name={a.member.full_name} size={36} />
                    <div className="row-info">
                      <div className="row-name">{a.member.full_name}</div>
                      <div className="row-sub">In {formatTime(a.check_in)}</div>
                    </div>
                    <StatusPill
                      label={a.check_out ? "Left" : "In gym"}
                      type={a.check_out ? "neutral" : "success"}
                    />
                  </div>
                ))
              )}
            </Panel>

            {/* Trainers panel */}
            <Panel title="Active Trainers" badge={stats.trainers.length}>
              {stats.trainers.slice(0, 5).map((t) => (
                <div key={t.id} className="row-item">
                  <Avatar name={t.full_name} size={40} accent="blue" />
                  <div className="row-info">
                    <div className="row-name">{t.full_name}</div>
                    <div className="row-sub">{t.specialization ?? "—"}</div>
                  </div>
                  <StatusPill label="Available" type="info" />
                </div>
              ))}
            </Panel>

          </div>
        </div>
      )}
    </>
  );
}
