"use client";

// ============================================================
// app/dashboard/trainers/page.tsx
// REFACT-007 — modularised Trainers page.
//
// Before: 861 lines, 450-line inline <style>, raw useEffect,
//   hardcoded nav, hardcoded "Pradeep · Owner", raw SVGs,
//   local getInitials / formatDate duplicates.
//
// After: ~150 lines. TanStack Query via useTrainers,
//   shared <Nav />, lucide-react icons, shared format utils,
//   co-located trainers.css for page-specific styles.
// ============================================================

import { useState, useMemo } from "react";
import { Phone, Mail, Plus } from "lucide-react";
import { Nav } from "@/components/ui/Nav";
import { useTrainers, type TrainerWithAssignments } from "@/hooks/useTrainers";
import { getInitials, formatDate } from "@/lib/utils/format";
import "./trainers.css";

// ------------------------------------------------------------------
// Specialization accent colors
// ------------------------------------------------------------------

const SPEC_COLORS: Record<string, { bg: string; color: string; border: string }> =
  {
    Strength: {
      bg: "rgba(248,113,113,0.08)",
      color: "#f87171",
      border: "rgba(248,113,113,0.2)",
    },
    Cardio: {
      bg: "rgba(96,165,250,0.08)",
      color: "#60a5fa",
      border: "rgba(96,165,250,0.2)",
    },
    Functional: {
      bg: "rgba(251,191,36,0.08)",
      color: "#fbbf24",
      border: "rgba(251,191,36,0.2)",
    },
  };

function getSpecColor(spec: string | null) {
  if (!spec)
    return { bg: "var(--bg3)", color: "var(--text-muted)", border: "var(--border)" };
  for (const key of Object.keys(SPEC_COLORS)) {
    if (spec.toLowerCase().includes(key.toLowerCase())) return SPEC_COLORS[key];
  }
  return {
    bg: "rgba(74,222,128,0.08)",
    color: "#4ade80",
    border: "rgba(74,222,128,0.2)",
  };
}

// ------------------------------------------------------------------
// Trainer card (left column)
// ------------------------------------------------------------------

function TrainerCard({
  trainer,
  isSelected,
  onClick,
}: {
  trainer: TrainerWithAssignments;
  isSelected: boolean;
  onClick: () => void;
}) {
  const specColor = getSpecColor(trainer.specialization);

  return (
    <div
      className={`trainer-card${isSelected ? " trainer-card--selected" : ""}`}
      onClick={onClick}
    >
      <div className="trainer-card-top">
        <div className="trainer-card-avatar">{getInitials(trainer.full_name)}</div>
        <div
          className="trainer-active-badge"
          style={{ opacity: trainer.is_active ? 1 : 0.4 }}
        >
          <span
            className="trainer-active-dot"
            style={{ background: trainer.is_active ? "#4ade80" : "#555450" }}
          />
          {trainer.is_active ? "On duty" : "Off duty"}
        </div>
      </div>

      <h3 className="trainer-card-name">{trainer.full_name}</h3>

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

      <div className="trainer-card-divider" />

      <div className="trainer-card-stats">
        <div className="trainer-stat">
          <span className="trainer-stat-value">{trainer.assignments.length}</span>
          <span className="trainer-stat-label">Members</span>
        </div>
        {trainer.phone && (
          <>
            <div className="trainer-stat-sep" />
            <div className="trainer-stat">
              <span className="trainer-stat-value">{trainer.phone}</span>
              <span className="trainer-stat-label">Phone</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Assignment panel (right column)
// ------------------------------------------------------------------

function AssignmentPanel({ trainer }: { trainer: TrainerWithAssignments }) {
  const specColor = getSpecColor(trainer.specialization);

  return (
    <div className="assignment-panel">
      {/* Trainer identity */}
      <div className="ap-header">
        <div className="ap-avatar">{getInitials(trainer.full_name)}</div>
        <div className="ap-info">
          <h2 className="ap-name">{trainer.full_name}</h2>
          {trainer.specialization && (
            <span
              className="ap-spec"
              style={{
                background: specColor.bg,
                color: specColor.color,
                border: `1px solid ${specColor.border}`,
              }}
            >
              {trainer.specialization}
            </span>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="ap-contact">
        {trainer.phone && (
          <div className="ap-contact-item">
            <Phone size={13} />
            {trainer.phone}
          </div>
        )}
        {trainer.email && (
          <div className="ap-contact-item">
            <Mail size={13} />
            {trainer.email}
          </div>
        )}
      </div>

      <div className="ap-divider" />

      {/* Assigned members */}
      <div className="ap-section-label">
        Assigned members
        <span className="ap-count">{trainer.assignments.length}</span>
      </div>

      {trainer.assignments.length === 0 ? (
        <div className="ap-empty">No members currently assigned.</div>
      ) : (
        <div className="ap-members">
          {trainer.assignments.map((a) => (
            <div key={a.id} className="ap-member-row">
              <div className="ap-member-avatar">
                {getInitials(a.member.full_name)}
              </div>
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

      <div className="ap-divider" />

      {/* Actions — FEAT-007: modals TBD */}
      <div className="ap-actions">
        <button className="ap-btn ap-btn-primary">Assign member</button>
        <button className="ap-btn ap-btn-secondary">Edit trainer</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function TrainersPage() {
  const { data: trainers = [], isLoading, error } = useTrainers();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first trainer once data loads
  const effectiveSelectedId =
    selectedId ?? (trainers.length > 0 ? trainers[0].id : null);

  const selected = useMemo(
    () => trainers.find((t) => t.id === effectiveSelectedId) ?? null,
    [trainers, effectiveSelectedId],
  );

  const activeCount  = trainers.filter((t) => t.is_active).length;
  const totalAssigned = trainers.reduce((s, t) => s + t.assignments.length, 0);

  if (isLoading) {
    return (
      <>
        <Nav role="owner" />
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading trainers...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Nav role="owner" />
        <div className="error-screen">Failed to load: {error.message}</div>
      </>
    );
  }

  return (
    <>
      <Nav role="owner" />

      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Trainers</h1>
            <p className="page-sub">
              {activeCount} active · {totalAssigned} members currently assigned
            </p>
          </div>
          {/* FEAT-007: Add Trainer modal — button wired, modal TBD */}
          <button className="btn-solid">
            <Plus size={14} />
            Add trainer
          </button>
        </div>

        {/* Two-column layout */}
        <div className="trainers-layout">
          {/* Trainer cards */}
          <div className="trainer-cards">
            {trainers.map((t) => (
              <TrainerCard
                key={t.id}
                trainer={t}
                isSelected={t.id === effectiveSelectedId}
                onClick={() => setSelectedId(t.id)}
              />
            ))}
          </div>

          {/* Assignment panel */}
          {selected ? (
            <AssignmentPanel trainer={selected} />
          ) : (
            <div className="panel-empty">Select a trainer to view details.</div>
          )}
        </div>
      </div>
    </>
  );
}
