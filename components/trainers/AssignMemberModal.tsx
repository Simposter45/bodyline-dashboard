"use client";

// ============================================================
// components/trainers/AssignMemberModal.tsx
// FEAT-007 — Modal to assign / reassign members to a trainer.
//
// Three member states:
//   • Free      — no current trainer → can select normally
//   • Reassign  — has a different trainer → shown with
//                 "Assigned to X" badge; selecting triggers
//                 a reassign (previous assignment deactivated)
//   • Current   — already on THIS trainer → filtered out
//
// Multi-select: toggle rows freely across both categories.
// Avatar photos shown; falls back to initials via <Avatar />.
// ============================================================

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { useAssignMember } from "@/hooks/useTrainerMutations";
import { useMembers } from "@/hooks/useMembers";
import { useTrainers } from "@/hooks/useTrainers";
import type { TrainerWithAssignments } from "@/hooks/useTrainers";

interface AssignMemberModalProps {
  isOpen:  boolean;
  onClose: () => void;
  trainer: TrainerWithAssignments;
}

export function AssignMemberModal({ isOpen, onClose, trainer }: AssignMemberModalProps) {
  const { mutateAsync: assignMember, isPending } = useAssignMember();
  const { data: allMembers   = [] } = useMembers();
  const { data: allTrainers  = [] } = useTrainers(); // already cached — zero extra fetch

  const [query,       setQuery]       = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Build a map: member_id → trainer name (for the CURRENT trainer's roster, skip — they're excluded)
  const memberTrainerMap = useMemo(() => {
    const map = new Map<string, string>(); // member_id → trainer full_name
    for (const t of allTrainers) {
      if (t.id === trainer.id) continue; // skip current trainer's own roster
      for (const a of t.assignments) {
        map.set(a.member_id, t.full_name);
      }
    }
    return map;
  }, [allTrainers, trainer.id]);

  // Members on the CURRENT trainer's roster (excluded from the list)
  const currentRosterIds = useMemo(
    () => new Set(trainer.assignments.map((a) => a.member_id)),
    [trainer.assignments],
  );

  // ── Partition active members into free / reassignable
  const { freeMembers, reassignMembers } = useMemo(() => {
    const q = query.toLowerCase();
    const free: typeof allMembers     = [];
    const reassign: typeof allMembers = [];

    for (const m of allMembers) {
      if (!m.is_active) continue;
      if (currentRosterIds.has(m.id)) continue; // already on this trainer

      const matchesQuery =
        !q ||
        m.full_name.toLowerCase().includes(q) ||
        m.phone.includes(q);
      if (!matchesQuery) continue;

      if (memberTrainerMap.has(m.id)) {
        reassign.push(m);
      } else {
        free.push(m);
      }
    }
    return { freeMembers: free, reassignMembers: reassign };
  }, [allMembers, currentRosterIds, memberTrainerMap, query]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setQuery("");
    setSelectedIds(new Set());
    onClose();
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;
    await assignMember({ trainerId: trainer.id, memberIds: Array.from(selectedIds) });
    handleClose();
  };

  const selectedCount  = selectedIds.size;
  const reassignCount  = Array.from(selectedIds).filter((id) => memberTrainerMap.has(id)).length;
  const totalAvailable = freeMembers.length + reassignMembers.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Assign Members — ${trainer.full_name}`}
    >
      <div className="am-container">

        {/* Search */}
        <div className="am-search-wrap">
          <Search size={14} className="am-search-icon" />
          <input
            id="assign-member-search"
            type="text"
            className="am-search-input"
            placeholder="Search by name or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Member list */}
        <div className="am-list" role="listbox" aria-multiselectable="true" aria-label="Select members to assign">
          {totalAvailable === 0 ? (
            <div className="am-empty">
              {query
                ? `No members match "${query}"`
                : "No available members to assign"}
            </div>
          ) : (
            <>
              {/* ── Free members ── */}
              {freeMembers.length > 0 && (
                <>
                  {reassignMembers.length > 0 && (
                    <div className="am-section-label">Available</div>
                  )}
                  {freeMembers.map((m) => {
                    const isSelected = selectedIds.has(m.id);
                    return (
                      <MemberRow
                        key={m.id}
                        member={m}
                        isSelected={isSelected}
                        onToggle={() => toggleMember(m.id)}
                        reassignFrom={null}
                      />
                    );
                  })}
                </>
              )}

              {/* ── Members assigned to another trainer ── */}
              {reassignMembers.length > 0 && (
                <>
                  <div className="am-section-label am-section-label--warn">
                    Reassign from another trainer
                  </div>
                  {reassignMembers.map((m) => {
                    const isSelected = selectedIds.has(m.id);
                    const currentTrainerName = memberTrainerMap.get(m.id) ?? "";
                    return (
                      <MemberRow
                        key={m.id}
                        member={m}
                        isSelected={isSelected}
                        onToggle={() => toggleMember(m.id)}
                        reassignFrom={currentTrainerName}
                      />
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* Summary banner */}
        <div className={`am-summary${selectedCount > 0 ? " am-summary--active" : ""}`}>
          {selectedCount === 0
            ? "Tap members above to select"
            : reassignCount > 0
              ? `${selectedCount} selected · ${reassignCount} will be reassigned`
              : `${selectedCount} member${selectedCount > 1 ? "s" : ""} selected`}
        </div>

        {/* Actions */}
        <div className="am-actions">
          <button
            type="button"
            className="tf-btn-cancel"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            id="assign-member-confirm"
            className="btn-solid"
            disabled={selectedCount === 0 || isPending}
            onClick={handleConfirm}
          >
            {isPending
              ? "Assigning…"
              : selectedCount === 0
                ? "Select Members"
                : reassignCount > 0
                  ? `Assign & Reassign ${selectedCount}`
                  : `Assign ${selectedCount} Member${selectedCount > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>

      <style>{`
        .am-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Search */
        .am-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .am-search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .am-search-input {
          width: 100%;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 14px 10px 36px;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .am-search-input:focus { border-color: var(--accent-green); }
        .am-search-input::placeholder { color: var(--text-muted); }

        /* Member list */
        .am-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--bg3);
          padding: 6px;
        }
        .am-list::-webkit-scrollbar { display: none; }

        .am-empty {
          padding: 24px 12px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        }

        /* Section headers */
        .am-section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 8px 10px 4px;
        }
        .am-section-label--warn {
          color: var(--accent-amber);
          opacity: 0.8;
        }

        /* Member rows */
        .am-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: calc(var(--radius-sm) - 2px);
          cursor: pointer;
          transition: background 0.15s;
          min-height: 48px;
          border: 1px solid transparent;
        }
        .am-row:hover { background: var(--bg2); }
        .am-row--selected {
          background: var(--accent-green-dim);
          border-color: rgba(74,222,128,0.2);
        }
        .am-row--reassign.am-row--selected {
          background: var(--accent-amber-dim);
          border-color: rgba(251,191,36,0.25);
        }

        /* Checkbox */
        .am-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 1.5px solid var(--border-hi);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          transition: all 0.15s;
          background: var(--bg2);
          color: transparent;
        }
        .am-row--selected .am-checkbox {
          background: var(--accent-green);
          border-color: var(--accent-green);
          color: #0d0d0f;
        }
        .am-row--reassign.am-row--selected .am-checkbox {
          background: var(--accent-amber);
          border-color: var(--accent-amber);
          color: #0d0d0f;
        }

        .am-info { flex: 1; min-width: 0; }
        .am-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .am-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .am-phone {
          font-size: 12px;
          color: var(--text-muted);
        }
        .am-reassign-badge {
          font-size: 10px;
          font-weight: 600;
          color: var(--accent-amber);
          background: var(--accent-amber-dim);
          border: 1px solid rgba(251,191,36,0.2);
          border-radius: 99px;
          padding: 1px 7px;
          white-space: nowrap;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Summary banner */
        .am-summary {
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-family: var(--font-body);
          text-align: center;
          transition: all 0.2s;
          background: var(--bg3);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        .am-summary--active {
          background: var(--accent-green-dim);
          border-color: rgba(74,222,128,0.25);
          color: var(--accent-green);
          font-weight: 500;
        }

        /* Actions */
        .am-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .tf-btn-cancel {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-ui);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 10px 16px;
          border-radius: var(--radius-sm);
          transition: all 0.15s;
          min-height: 44px;
        }
        .tf-btn-cancel:hover:not(:disabled) {
          background: var(--bg3);
          color: var(--text-primary);
        }
        .tf-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-solid:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>
    </Modal>
  );
}

// ------------------------------------------------------------------
// MemberRow — extracted sub-component for clean rendering
// ------------------------------------------------------------------

interface MemberRowProps {
  member:       { id: string; full_name: string; phone: string; profile_photo_url: string | null };
  isSelected:   boolean;
  onToggle:     () => void;
  reassignFrom: string | null; // null = free; string = trainer name
}

function MemberRow({ member, isSelected, onToggle, reassignFrom }: MemberRowProps) {
  const isReassign = reassignFrom !== null;
  const rowClass = [
    "am-row",
    isReassign   ? "am-row--reassign" : "",
    isSelected   ? "am-row--selected" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      id={`assign-member-row-${member.id}`}
      className={rowClass}
      onClick={onToggle}
      role="option"
      aria-selected={isSelected}
    >
      {/* Checkbox */}
      <div className="am-checkbox">✓</div>

      {/* Avatar — photo if available, initials fallback */}
      <Avatar
        name={member.full_name}
        src={member.profile_photo_url}
        size={34}
        accent={isReassign ? "amber" : "neutral"}
      />

      {/* Name + meta */}
      <div className="am-info">
        <div className="am-name">{member.full_name}</div>
        <div className="am-meta">
          <span className="am-phone">{member.phone}</span>
          {isReassign && (
            <span className="am-reassign-badge" title={`Currently: ${reassignFrom}`}>
              ↩ {reassignFrom}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
