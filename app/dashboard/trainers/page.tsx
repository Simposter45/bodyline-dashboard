"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Trainer, Member, TrainerAssignment } from "@/types";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type TrainerWithAssignments = Trainer & {
  assignments: (TrainerAssignment & { member: Member })[];
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ------------------------------------------------------------------
// Specialization accent colors
// ------------------------------------------------------------------

const SPEC_COLORS: Record<
  string,
  { bg: string; color: string; border: string }
> = {
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
    return {
      bg: "var(--bg3)",
      color: "var(--text-muted)",
      border: "var(--border)",
    };
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
// Fetch
// ------------------------------------------------------------------

async function fetchTrainers(): Promise<TrainerWithAssignments[]> {
  const [trainersRes, assignmentsRes] = await Promise.all([
    supabase
      .from("trainers")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("trainer_assignments")
      .select("*, member:members(*)")
      .eq("is_current", true)
      .order("assigned_date", { ascending: false }),
  ]);

  if (trainersRes.error) throw new Error(trainersRes.error.message);

  const trainers = (trainersRes.data ?? []) as Trainer[];
  const assignments = (assignmentsRes.data ?? []) as (TrainerAssignment & {
    member: Member;
  })[];

  return trainers.map((t) => ({
    ...t,
    assignments: assignments.filter((a) => a.trainer_id === t.id),
  }));
}

// ------------------------------------------------------------------
// Trainer card
// ------------------------------------------------------------------

function TrainerCard({
  trainer,
  onClick,
  isSelected,
}: {
  trainer: TrainerWithAssignments;
  onClick: () => void;
  isSelected: boolean;
}) {
  const specColor = getSpecColor(trainer.specialization);
  const memberCount = trainer.assignments.length;

  return (
    <div
      className={`trainer-card ${isSelected ? "trainer-card--selected" : ""}`}
      onClick={onClick}
    >
      {/* Top row */}
      <div className="trainer-card-top">
        <div className="trainer-card-avatar">
          {getInitials(trainer.full_name)}
        </div>
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

      {/* Name */}
      <h3 className="trainer-card-name">{trainer.full_name}</h3>

      {/* Specialization */}
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

      {/* Divider */}
      <div className="trainer-card-divider" />

      {/* Stats row */}
      <div className="trainer-card-stats">
        <div className="trainer-stat">
          <span className="trainer-stat-value">{memberCount}</span>
          <span className="trainer-stat-label">Members</span>
        </div>
        <div className="trainer-stat-sep" />
        <div className="trainer-stat">
          <span className="trainer-stat-value">{trainer.phone}</span>
          <span className="trainer-stat-label">Phone</span>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Member assignment list (right panel)
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
        <div className="ap-contact-item">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
          </svg>
          {trainer.phone}
        </div>
        {trainer.email && (
          <div className="ap-contact-item">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
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
              <div className="ap-member-phone">{a.member.phone}</div>
            </div>
          ))}
        </div>
      )}

      <div className="ap-divider" />

      {/* Actions */}
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
  const [trainers, setTrainers] = useState<TrainerWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrainers()
      .then((data) => {
        setTrainers(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => trainers.find((t) => t.id === selectedId) ?? null,
    [trainers, selectedId],
  );

  const totalAssigned = trainers.reduce((s, t) => s + t.assignments.length, 0);

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
          margin-bottom: 40px;
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
          transition: opacity 0.15s;
          white-space: nowrap;
        }
        .add-btn:hover { opacity: 0.88; }

        /* ── Two-column layout ── */
        .trainers-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 960px) {
          .trainers-layout { grid-template-columns: 1fr; }
        }

        /* ── Trainer cards ── */
        .trainer-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trainer-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .trainer-card:hover { border-color: var(--border-hi); }
        .trainer-card--selected {
          border-color: rgba(74,222,128,0.3) !important;
          background: rgba(74,222,128,0.03);
        }

        .trainer-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .trainer-card-avatar {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-sm);
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .trainer-active-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
          border: 1px solid var(--border);
          border-radius: 99px;
          padding: 4px 10px;
        }
        .trainer-active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .trainer-card-name {
          font-family: var(--font-display);
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .trainer-spec-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 99px;
          letter-spacing: 0.04em;
        }

        .trainer-card-divider {
          height: 1px;
          background: var(--border);
          margin: 16px 0;
        }

        .trainer-card-stats {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .trainer-stat {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .trainer-stat-value {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        .trainer-stat-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 500;
        }
        .trainer-stat-sep {
          width: 1px;
          height: 28px;
          background: var(--border);
        }

        /* ── Assignment panel ── */
        .assignment-panel {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 28px;
          position: sticky;
          top: 92px;
        }

        .ap-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }
        .ap-avatar {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-sm);
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
        .ap-info { flex: 1; }
        .ap-name {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .ap-spec {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 99px;
          letter-spacing: 0.04em;
        }

        .ap-contact {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 4px;
        }
        .ap-contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .ap-contact-item svg { color: var(--text-muted); flex-shrink: 0; }

        .ap-divider { height: 1px; background: var(--border); margin: 20px 0; }

        .ap-section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ap-count {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 99px;
          padding: 1px 8px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .ap-empty {
          font-size: 13px;
          color: var(--text-muted);
          padding: 12px 0;
        }

        .ap-members { display: flex; flex-direction: column; gap: 2px; }
        .ap-member-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          transition: background 0.12s;
        }
        .ap-member-row:hover { background: var(--bg3); }

        .ap-member-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .ap-member-info { flex: 1; min-width: 0; }
        .ap-member-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ap-member-sub {
          font-size: 11px;
          color: var(--text-muted);
        }
        .ap-member-phone {
          font-size: 11px;
          color: var(--text-muted);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .ap-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ap-btn {
          width: 100%;
          padding: 11px;
          border-radius: var(--radius-sm);
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s;
          border: none;
          letter-spacing: 0.01em;
        }
        .ap-btn:hover { opacity: 0.85; }
        .ap-btn-primary { background: var(--accent-green); color: #0d0d0f; }
        .ap-btn-secondary {
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          color: var(--text-primary);
        }

        /* ── Empty panel ── */
        .panel-empty {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 56px 32px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
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
          <a href="/dashboard/members" className="nav-link">
            Members
          </a>
          <a href="/dashboard/payments" className="nav-link">
            Payments
          </a>
          <a href="/dashboard/trainers" className="nav-link active">
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
          Loading trainers...
        </div>
      )}

      {error && <div className="error-screen">Failed to load: {error}</div>}

      {!loading && !error && (
        <div className="page">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Trainers</h1>
              <p className="page-sub">
                {trainers.filter((t) => t.is_active).length} active ·{" "}
                {totalAssigned} members currently assigned
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
                  isSelected={t.id === selectedId}
                  onClick={() => setSelectedId(t.id)}
                />
              ))}
            </div>

            {/* Assignment panel */}
            {selected ? (
              <AssignmentPanel trainer={selected} />
            ) : (
              <div className="panel-empty">
                Select a trainer to view details.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
