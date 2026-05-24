"use client";

// ============================================================
// app/dashboard/trainers/TrainerDrawer.tsx
// Mobile bottom-sheet drawer for a selected trainer.
// Shows two tabs: Profile (contact/branch/since) and Members.
// ============================================================

import "./TrainerDrawer.css";
import { useState } from "react";
import { X, Phone, Mail, MapPin, CalendarDays } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { getInitials, formatDate } from "@/lib/utils/format";
import type { TrainerWithAssignments } from "@/hooks/useTrainers";

interface TrainerDrawerProps {
  trainer: TrainerWithAssignments;
  onClose: () => void;
  defaultTab?: "profile" | "members";
  onAssign?: () => void;
  onEdit?: () => void;
}

export function TrainerDrawer({
  trainer,
  onClose,
  defaultTab = "profile",
  onAssign,
  onEdit,
}: TrainerDrawerProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "members">(defaultTab);
  const specColor = getSpecColorDrawer(trainer.specialization);

  return (
    <>
      {/* Overlay — tap to close */}
      <div className="tr-drawer-overlay" onClick={onClose} />

      {/* Bottom sheet panel */}
      <div className="tr-drawer" role="dialog" aria-label={`${trainer.full_name} details`}>

        {/* Drag handle */}
        <div className="tr-drawer-handle" />

        {/* Header: avatar + name + badge + close */}
        <div className="tr-drawer-header">
          <div className="tr-drawer-avatar">{getInitials(trainer.full_name)}</div>

          <div className="tr-drawer-identity">
            <h2 className="tr-drawer-name">{trainer.full_name}</h2>
            <div className="tr-drawer-tags">
              {trainer.specialization && (
                <span
                  className="trainer-spec-tag"
                  style={{
                    background: specColor.bg,
                    color: specColor.color,
                    border: `1px solid ${specColor.border}`,
                  }}
                >
                  {trainer.specialization}
                </span>
              )}
              <div
                className="trainer-active-badge"
                style={{ opacity: trainer.is_active ? 1 : 0.55 }}
              >
                <span
                  className="trainer-active-dot"
                  style={{ background: trainer.is_active ? "#4ade80" : "#555450" }}
                />
                {trainer.is_active ? "On duty" : "Off duty"}
              </div>
            </div>
          </div>

          <button className="tr-drawer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="tr-drawer-tabs">
          <button
            className={`tr-drawer-tab${activeTab === "profile" ? " active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>
          <button
            className={`tr-drawer-tab${activeTab === "members" ? " active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            Members
            <span className="tr-drawer-tab-badge">{trainer.assignments.length}</span>
          </button>
        </div>

        {/* ── Profile tab ── */}
        {activeTab === "profile" && (
          <div className="tr-drawer-tab-content">
            {trainer.branch && (
              <div className="tr-drawer-branch">
                <MapPin size={13} />
                {trainer.branch}
              </div>
            )}

            <div className="tr-drawer-contact">
              {trainer.phone && (
                <a href={`tel:${trainer.phone}`} className="tr-drawer-contact-item">
                  <Phone size={14} />
                  {trainer.phone}
                </a>
              )}
              {trainer.email && (
                <a href={`mailto:${trainer.email}`} className="tr-drawer-contact-item">
                  <Mail size={14} />
                  {trainer.email}
                </a>
              )}
              <div className="tr-drawer-contact-item tr-drawer-since">
                <CalendarDays size={14} />
                <span className="tr-drawer-since-label">Since</span>
                {formatDate(trainer.created_at)}
              </div>
            </div>
          </div>
        )}

        {/* ── Members tab ── */}
        {activeTab === "members" && (
          <div className="tr-drawer-tab-content">
            {trainer.assignments.length === 0 ? (
              <div className="tr-drawer-empty">No members currently assigned.</div>
            ) : (
              <div className="ap-members">
                {trainer.assignments.map((a) => (
                  <div key={a.id} className="ap-member-row">
                    <Avatar
                      name={a.member.full_name}
                      src={a.member.profile_photo_url}
                      size={32}
                    />
                    <div className="ap-member-info">
                      <div className="ap-member-name">{a.member.full_name}</div>
                      <div className="ap-member-sub">
                        Assigned {formatDate(a.assigned_date)}
                      </div>
                    </div>
                    {a.member.phone && (
                      <div className="ap-member-phone">{a.member.phone}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="tr-drawer-divider" />

            {/* Actions — FEAT-007 */}
            <div className="ap-actions">
              <button
                className="ap-btn ap-btn-primary"
                onClick={onAssign}
                id="trainer-drawer-assign-btn"
              >
                Assign member
              </button>
              <button
                className="ap-btn ap-btn-secondary"
                onClick={onEdit}
                id="trainer-drawer-edit-btn"
              >
                Edit trainer
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ------------------------------------------------------------------
// Local spec-color helper
// ------------------------------------------------------------------

const SPEC_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Strength:   { bg: "rgba(248,113,113,0.08)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
  Cardio:     { bg: "rgba(96,165,250,0.08)",  color: "#60a5fa", border: "rgba(96,165,250,0.2)" },
  Functional: { bg: "rgba(251,191,36,0.08)",  color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
};

function getSpecColorDrawer(spec: string | null) {
  if (!spec) return { bg: "var(--bg3)", color: "var(--text-muted)", border: "var(--border)" };
  for (const key of Object.keys(SPEC_COLORS)) {
    if (spec.toLowerCase().includes(key.toLowerCase())) return SPEC_COLORS[key];
  }
  return { bg: "rgba(74,222,128,0.08)", color: "#4ade80", border: "rgba(74,222,128,0.2)" };
}
