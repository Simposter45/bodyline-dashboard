"use client";

import "./HomeTab.css";
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import StatsRow from "../components/StatsRow";

import { useSessionCountToday } from "@/hooks/useSessionLogs";
import { formatDateIST } from "@/lib/utils/date";

import type { Trainer, AssignedMemberWithDues, TrainerPortalStats } from "@/types";

// ── Helpers ────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Props ──────────────────────────────────────────────────────

interface HomeTabProps {
  trainer: Trainer;
  assignedMembers: AssignedMemberWithDues[];
  isMembersLoading: boolean;
  /** Callback to switch portal to Members tab */
  onNavigateToMembers: () => void;
}

// ── Component ──────────────────────────────────────────────────

export default function HomeTab({
  trainer,
  assignedMembers,
  isMembersLoading,
  onNavigateToMembers,
}: HomeTabProps) {
  // ── Session count today ───────────────────────────────────
  const { data: sessionsToday = 0 } = useSessionCountToday(trainer.id);

  // ── Derived stats ─────────────────────────────────────────
  const stats: TrainerPortalStats = useMemo(() => {
    const checkedIn = assignedMembers.filter((m) => m.is_checked_in_today).length;
    const pendingDues = assignedMembers.filter(
      (m) =>
        m.current_membership?.payment_status === "overdue" ||
        m.current_membership?.payment_status === "pending",
    ).length;

    return {
      assigned_members: assignedMembers.length,
      checked_in_today: checkedIn,
      sessions_today: sessionsToday,
      pending_dues: pendingDues,
    };
  }, [assignedMembers, sessionsToday]);

  // ── Members currently on the floor ───────────────────────
  const onFloor = useMemo(
    () => assignedMembers.filter((m) => m.is_checked_in_today),
    [assignedMembers],
  );

  // ── Overdue/pending members for dues alert ────────────────
  const dueMembers = useMemo(
    () =>
      assignedMembers.filter(
        (m) =>
          m.current_membership?.payment_status === "overdue" ||
          m.current_membership?.payment_status === "pending",
      ),
    [assignedMembers],
  );

  return (
    <div className="home-tab">
      {/* ── 1. Welcome Hero ───────────────────────────────── */}
      <div className="home-hero">
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
          Welcome back, {trainer.full_name.split(' ')[0]}!
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          Here's your overview for today.
        </p>
      </div>

      {/* ── 2. Stats Row ──────────────────────────────────── */}
      <StatsRow stats={stats} isLoading={isMembersLoading} />

      {/* ── 3. Dues Alert Banner ──────────────────────────── */}
      {dueMembers.length > 0 && (
        <div className="dues-alert" role="alert">
          <div className="dues-alert-left">
            <AlertTriangle size={18} className="dues-alert-icon" />
            <div>
              <div className="dues-alert-text">
                {dueMembers.length} member{dueMembers.length > 1 ? "s" : ""}{" "}
                with outstanding dues
              </div>
              <div className="dues-alert-sub">
                {dueMembers
                  .slice(0, 2)
                  .map((m) => m.member.full_name)
                  .join(", ")}
                {dueMembers.length > 2 && ` +${dueMembers.length - 2} more`}
              </div>
            </div>
          </div>
          <button className="dues-alert-btn" onClick={onNavigateToMembers}>
            View
          </button>
        </div>
      )}

      {/* ── 4. Today's Floor ──────────────────────────────── */}
      <div>
        <p className="home-section-label">
          On the Floor Now{" "}
          {onFloor.length > 0 && `· ${onFloor.length}`}
        </p>
        <div className="floor-list">
          {onFloor.length === 0 ? (
            <div className="floor-empty">
              <div className="floor-empty-icon">🏋️</div>
              <p>None of your members are checked in right now.</p>
            </div>
          ) : (
            onFloor.map(({ member, assignment_id, current_membership }) => (
              <div key={assignment_id} className="floor-item">
                {/* Avatar */}
                <div className="avatar">
                  {member.profile_photo_url ? (
                    <img
                      src={member.profile_photo_url}
                      alt={member.full_name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                    />
                  ) : (
                    getInitials(member.full_name)
                  )}
                </div>
                {/* Info */}
                <div className="floor-item-info">
                  <div className="floor-item-name">{member.full_name}</div>
                  <div className="floor-item-time">
                    {current_membership?.end_date
                      ? `Expires ${formatDateIST(current_membership.end_date)}`
                      : "No active plan"}
                  </div>
                </div>
                {/* Badge */}
                <span className="floor-item-badge">In Gym</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
