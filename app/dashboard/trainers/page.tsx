"use client";

// ============================================================
// app/dashboard/trainers/page.tsx
// REFACT-007 — modularised Trainers page.
// FEAT-010k — Owner-side trainer management:
//   - AssignmentPanel gains Members / Attendance tab switcher
//   - Per-member soft-remove (×) button
//   - Attendance log from useTrainerAttendanceAdmin
// ============================================================

import { useState, useMemo } from "react";
import { Phone, Mail, Plus, MapPin, CalendarDays, Search, SlidersHorizontal, Check, X, UserMinus } from "lucide-react";
import { TrainerDrawer } from "./TrainerDrawer";
import { Nav } from "@/components/ui/Nav";
import { Avatar } from "@/components/ui/Avatar";
import { useTrainers, type TrainerWithAssignments } from "@/hooks/useTrainers";
import { useTrainerAttendanceAdmin } from "@/hooks/useTrainerAttendanceAdmin";
import { useRemoveAssignment } from "@/hooks/useTrainerMutations";
import { getInitials, formatDate } from "@/lib/utils/format";
import { AddTrainerModal } from "@/components/trainers/AddTrainerModal";
import { EditTrainerModal } from "@/components/trainers/EditTrainerModal";
import { AssignMemberModal } from "@/components/trainers/AssignMemberModal";
import type { TrainerAttendance } from "@/types";
import "./trainers.css";

// ------------------------------------------------------------------
// Attendance helpers
// ------------------------------------------------------------------

function formatTimeIST(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function computeDuration(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return "";
  const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const totalMins = Math.round(diffMs / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatAttendanceDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

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
  onProfile,
  onMembers,
}: {
  trainer: TrainerWithAssignments;
  isSelected: boolean;
  onClick: () => void;
  onProfile: () => void;
  onMembers: () => void;
}) {
  const specColor = getSpecColor(trainer.specialization);

  return (
    <div
      className={`trainer-card${isSelected ? " trainer-card--selected" : ""}`}
      onClick={onClick}
    >
      {/* Top row: avatar + duty badge */}
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

      {/* Name + spec tag */}
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

      {/* Two action buttons — shown only on mobile via CSS */}
      <div className="trainer-card-actions">
        <button
          className="trainer-card-btn trainer-card-btn-ghost"
          onClick={(e) => { e.stopPropagation(); onProfile(); }}
          aria-label={`View profile for ${trainer.full_name}`}
        >
          Profile
        </button>
        <button
          className="trainer-card-btn trainer-card-btn-outline"
          onClick={(e) => { e.stopPropagation(); onMembers(); }}
          aria-label={`View members for ${trainer.full_name}`}
        >
          Members
          <span className="trainer-card-btn-badge">{trainer.assignments.length}</span>
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Attendance tab content for AssignmentPanel
// ------------------------------------------------------------------

function AttendanceTab({ trainerId }: { trainerId: string }) {
  const { data: logs = [], isLoading } = useTrainerAttendanceAdmin(trainerId, 14);

  if (isLoading) {
    return <div className="ap-att-empty">Loading attendance…</div>;
  }
  if (logs.length === 0) {
    return <div className="ap-att-empty">No attendance records in the last 14 days.</div>;
  }

  return (
    <div className="ap-att-list">
      {(logs as TrainerAttendance[]).map((row) => (
        <div key={row.id} className="ap-att-row">
          <span className="ap-att-date">{formatAttendanceDate(row.clock_in)}</span>
          <span className="ap-att-time">{formatTimeIST(row.clock_in)}</span>
          <span className="ap-att-time">
            {row.clock_out ? formatTimeIST(row.clock_out) : "—"}
          </span>
          {row.clock_out ? (
            <span className="ap-att-duration">{computeDuration(row.clock_in, row.clock_out)}</span>
          ) : (
            <span className="ap-att-open">In gym</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Assignment panel (right column) — FEAT-010k tabbed
// ------------------------------------------------------------------

type PanelTab = "members" | "attendance";

function AssignmentPanel({
  trainer,
  onAssign,
  onEdit,
}: {
  trainer: TrainerWithAssignments;
  onAssign: () => void;
  onEdit: () => void;
}) {
  const specColor = getSpecColor(trainer.specialization);
  const [panelTab, setPanelTab] = useState<PanelTab>("members");
  const { mutate: removeAssignment, isPending: isRemoving } = useRemoveAssignment();

  return (
    <div className="assignment-panel">

      {/* ── Profile header (always visible) ── */}
      <div className="ap-header">
        <div className="ap-avatar">{getInitials(trainer.full_name)}</div>
        <div className="ap-info">
          <h2 className="ap-name">{trainer.full_name}</h2>
          <div className="ap-tags">
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
      </div>

      {trainer.branch && (
        <div className="ap-branch">
          <MapPin size={12} />
          {trainer.branch}
        </div>
      )}

      {/* Contact rows */}
      <div className="ap-contact">
        {trainer.phone && (
          <a href={`tel:${trainer.phone}`} className="ap-contact-item ap-contact-link">
            <Phone size={13} />
            {trainer.phone}
          </a>
        )}
        {trainer.email && (
          <a href={`mailto:${trainer.email}`} className="ap-contact-item ap-contact-link">
            <Mail size={13} />
            {trainer.email}
          </a>
        )}
        <div className="ap-contact-item">
          <CalendarDays size={13} />
          <span className="ap-since-label">Since</span>
          {formatDate(trainer.created_at)}
        </div>
      </div>

      <div className="ap-actions" style={{ marginTop: 12 }}>
        <button
          className="ap-btn ap-btn-secondary"
          onClick={onEdit}
          id="trainer-panel-edit-btn"
        >
          Edit trainer
        </button>
      </div>

      <div className="ap-divider" />

      {/* ── Tab switcher ── */}
      <div className="ap-tabs">
        <button
          className={`ap-tab${panelTab === "members" ? " active" : ""}`}
          onClick={() => setPanelTab("members")}
          id="trainer-panel-tab-members"
        >
          Members
          <span className="ap-tab-badge">{trainer.assignments.length}</span>
        </button>
        <button
          className={`ap-tab${panelTab === "attendance" ? " active" : ""}`}
          onClick={() => setPanelTab("attendance")}
          id="trainer-panel-tab-attendance"
        >
          Attendance
        </button>
      </div>

      {/* ── Members tab ── */}
      {panelTab === "members" && (
        <>
          {trainer.assignments.length === 0 ? (
            <div className="ap-empty">No members currently assigned.</div>
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
                  <button
                    className="ap-member-remove"
                    onClick={() => removeAssignment({ assignmentId: a.id })}
                    disabled={isRemoving}
                    aria-label={`Unassign ${a.member.full_name}`}
                    title={`Unassign ${a.member.full_name}`}
                  >
                    <UserMinus size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="ap-actions" style={{ marginTop: 12 }}>
            <button
              className="ap-btn ap-btn-primary"
              onClick={onAssign}
              id="trainer-panel-assign-btn"
            >
              Assign member
            </button>
          </div>
        </>
      )}

      {/* ── Attendance tab ── */}
      {panelTab === "attendance" && (
        <AttendanceTab trainerId={trainer.id} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function TrainersPage() {
  const { data: trainers = [], isLoading, error } = useTrainers();
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [isDrawerOpen,    setIsDrawerOpen]    = useState(false);
  const [drawerTab,       setDrawerTab]       = useState<"profile" | "members">("profile");

  // FEAT-007 modal state
  const [isAddOpen,    setIsAddOpen]    = useState(false);
  const [isEditOpen,   setIsEditOpen]   = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Auto-select first trainer once data loads
  const effectiveSelectedId =
    selectedId ?? (trainers.length > 0 ? trainers[0].id : null);

  const selected = useMemo(
    () => trainers.find((t) => t.id === effectiveSelectedId) ?? null,
    [trainers, effectiveSelectedId],
  );

  const activeCount   = trainers.filter((t) => t.is_active).length;
  const totalAssigned = trainers.reduce((s, t) => s + t.assignments.length, 0);

  // ── Search + filter state ──
  type StatusFilter = "all" | "active" | "inactive";
  const DEFAULT_STATUS: StatusFilter = "all";

  const [query,              setQuery]              = useState("");
  const [statusFilter,       setStatusFilter]       = useState<StatusFilter>(DEFAULT_STATUS);
  const [isFilterSheetOpen,  setIsFilterSheetOpen]  = useState(false);
  const [pendingStatus,      setPendingStatus]      = useState<StatusFilter>(DEFAULT_STATUS);

  // Counts per status bucket (for filter-tab badges)
  const counts = useMemo(() => ({
    all:      trainers.length,
    active:   trainers.filter((t) => t.is_active).length,
    inactive: trainers.filter((t) => !t.is_active).length,
  }), [trainers]);

  // Filtered list: applies query + statusFilter together
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return trainers.filter((t) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? t.is_active : !t.is_active);
      const matchesQuery =
        !q ||
        t.full_name.toLowerCase().includes(q) ||
        (t.specialization ?? "").toLowerCase().includes(q) ||
        (t.phone ?? "").includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [trainers, statusFilter, query]);

  // Data-driven filter sheet config — add a new object here to extend filters.
  const filterSections = [
    {
      key: "status" as const,
      label: "Duty Status",
      options: [
        { value: "all",      label: "All trainers",  count: counts.all },
        { value: "active",   label: "On duty",       count: counts.active },
        { value: "inactive", label: "Off duty",      count: counts.inactive },
      ] as { value: StatusFilter; label: string; count: number }[],
    },
  ];

  const hasActiveFilter   = statusFilter !== "all";

  const openFilterSheet = () => { setPendingStatus(statusFilter); setIsFilterSheetOpen(true); };
  const applyFilters    = () => { setStatusFilter(pendingStatus); setIsFilterSheetOpen(false); };
  const resetFilters    = () => setPendingStatus(DEFAULT_STATUS);


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
          <button
            className="btn-solid trainers-add-btn"
            onClick={() => setIsAddOpen(true)}
            id="trainers-add-btn"
          >
            <Plus size={14} />
            Add trainer
          </button>
        </div>

        {/* Toolbar — search + filters */}
        <div className="toolbar">
          <div className="search-wrap">
            <Search size={15} className="search-icon" />
            <input
              id="trainers-search"
              className="search-input"
              placeholder="Search by name, specialization…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Mobile: filter chip → bottom sheet */}
          <button
            id="trainers-filter-chip"
            className={`filter-chip${hasActiveFilter ? " has-filters" : ""}`}
            onClick={openFilterSheet}
            aria-label="Open filter options"
          >
            <SlidersHorizontal size={14} />
            {statusFilter === "all" ? "All trainers" : statusFilter === "active" ? "On duty" : "Off duty"}
            {hasActiveFilter && <span className="filter-chip-badge">1</span>}
          </button>

          {/* Desktop: inline filter tabs (hidden at ≤640px via trainers.css) */}
          <div className="trainers-filter-tabs-group filter-tabs">
            {[
              { value: "all",      label: "All" },
              { value: "active",   label: "On duty" },
              { value: "inactive", label: "Off duty" },
            ].map((opt) => (
              <button
                key={opt.value}
                className={`filter-tab${statusFilter === opt.value ? " active" : ""}`}
                onClick={() => setStatusFilter(opt.value as StatusFilter)}
              >
                {opt.label}
                <span className="filter-count">
                  {counts[opt.value as StatusFilter]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="trainers-layout">
          {/* Trainer cards */}
          <div className="trainer-cards">
            {filtered.length === 0 ? (
              <div className="panel-empty">
                {query || hasActiveFilter ? "No trainers match your search." : "No trainers yet."}
              </div>
            ) : (
              filtered.map((t) => (
              <TrainerCard
                key={t.id}
                trainer={t}
                isSelected={t.id === effectiveSelectedId}
                onClick={() => {
                  setSelectedId(t.id);
                  if (window.innerWidth <= 640) { setDrawerTab("profile"); setIsDrawerOpen(true); }
                }}
                onProfile={() => {
                  setSelectedId(t.id);
                  if (window.innerWidth <= 640) { setDrawerTab("profile"); setIsDrawerOpen(true); }
                }}
                onMembers={() => {
                  setSelectedId(t.id);
                  if (window.innerWidth <= 640) { setDrawerTab("members"); setIsDrawerOpen(true); }
                }}
              />
              ))
            )}
          </div>

          {/* Assignment panel */}
          {selected ? (
            <AssignmentPanel
              trainer={selected}
              onAssign={() => setIsAssignOpen(true)}
              onEdit={() => setIsEditOpen(true)}
            />
          ) : (
            <div className="panel-empty">Select a trainer to view details.</div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet — data-driven: append to filterSections to extend */}
      {isFilterSheetOpen && (
        <>
          <div className="filter-sheet-overlay" onClick={() => setIsFilterSheetOpen(false)} />
          <div className="filter-sheet" role="dialog" aria-label="Filter trainers">
            <div className="filter-sheet-handle" />
            <div className="filter-sheet-title">Filter Trainers</div>

            {filterSections.map((section, sIdx) => (
              <div key={section.key}>
                {sIdx > 0 && <div className="filter-sheet-divider" />}
                <div className="filter-sheet-section-label">{section.label}</div>
                {section.options.map((opt) => {
                  const isSel = pendingStatus === opt.value;
                  return (
                    <div
                      key={opt.value}
                      id={`trainers-filter-${opt.value}`}
                      className={`filter-sheet-row${isSel ? " selected" : ""}`}
                      onClick={() => setPendingStatus(opt.value)}
                      role="radio"
                      aria-checked={isSel}
                    >
                      <span className="filter-sheet-row-label">{opt.label}</span>
                      <span className="filter-sheet-row-count">{opt.count}</span>
                      {isSel && <Check size={16} className="filter-sheet-check" />}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="filter-sheet-footer">
              <button className="filter-sheet-reset" onClick={resetFilters}>Reset</button>
              <button className="filter-sheet-apply" onClick={applyFilters}>Apply Filters</button>
            </div>
          </div>
        </>
      )}

      {/* FAB — mobile only; add trainer; sits above the bottom tab bar */}
      <button
        id="trainers-fab"
        className="fab"
        aria-label="Add trainer"
        onClick={() => setIsAddOpen(true)}
      >
        <Plus size={22} />
      </button>

      {/* Trainer detail drawer — mobile only */}
      {isDrawerOpen && selected && (
        <TrainerDrawer
          trainer={selected}
          defaultTab={drawerTab}
          onClose={() => setIsDrawerOpen(false)}
          onAssign={() => { setIsDrawerOpen(false); setIsAssignOpen(true); }}
          onEdit={() => { setIsDrawerOpen(false); setIsEditOpen(true); }}
        />
      )}

      {/* FEAT-007 — Trainer action modals */}
      <AddTrainerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {selected && (
        <>
          <EditTrainerModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            trainer={selected}
          />
          <AssignMemberModal
            isOpen={isAssignOpen}
            onClose={() => setIsAssignOpen(false)}
            trainer={selected}
          />
        </>
      )}
    </>
  );
}
