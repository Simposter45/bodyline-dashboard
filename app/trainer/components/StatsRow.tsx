"use client";

import "./StatsRow.css";
import { Users, UserCheck, ClipboardList, AlertCircle } from "lucide-react";
import type { TrainerPortalStats } from "@/types";

interface StatsRowProps {
  stats: TrainerPortalStats;
  isLoading?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  iconColor: "blue" | "green" | "amber" | "red";
  value: number | string;
  label: string;
  sub?: string;
}

function StatCard({ icon, iconColor, value, label, sub }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconColor}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function StatsRow({ stats, isLoading = false }: StatsRowProps) {
  const dash = isLoading ? "—" : undefined;

  return (
    <div className="stats-row">
      <StatCard
        icon={<Users size={18} />}
        iconColor="blue"
        value={dash ?? stats.assigned_members}
        label="Assigned"
        sub="Total members"
      />
      <StatCard
        icon={<UserCheck size={18} />}
        iconColor="green"
        value={dash ?? stats.checked_in_today}
        label="In Gym"
        sub="Right now"
      />
      <StatCard
        icon={<ClipboardList size={18} />}
        iconColor="amber"
        value={dash ?? stats.sessions_today}
        label="Sessions"
        sub="Logged today"
      />
      <StatCard
        icon={<AlertCircle size={18} />}
        iconColor={stats.pending_dues > 0 ? "red" : "green"}
        value={dash ?? stats.pending_dues}
        label="Dues Due"
        sub={stats.pending_dues === 0 ? "All clear ✓" : "Pending/Overdue"}
      />
    </div>
  );
}
