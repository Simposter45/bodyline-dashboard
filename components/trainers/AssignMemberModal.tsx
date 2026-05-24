"use client";

// ============================================================
// components/trainers/AssignMemberModal.tsx
// FEAT-007 — Modal to assign one or more members to a trainer.
//
// Multi-select: click any row to toggle selection. A summary
// bar shows how many are selected. On confirm, bulk-assigns
// all selected members via useAssignMember (which deactivates
// any prior trainer assignment for each member first).
// ============================================================

import { useState, useMemo } from "react";
import { Search, UserCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAssignMember } from "@/hooks/useTrainerMutations";
import { useMembers } from "@/hooks/useMembers";
import { getInitials } from "@/lib/utils/format";
import type { TrainerWithAssignments } from "@/hooks/useTrainers";

interface AssignMemberModalProps {
  isOpen:  boolean;
  onClose: () => void;
  trainer: TrainerWithAssignments;
}

export function AssignMemberModal({ isOpen, onClose, trainer }: AssignMemberModalProps) {
  const { mutateAsync: assignMember, isPending } = useAssignMember();
  const { data: allMembers = [], isLoading: membersLoading } = useMembers();

  const [query,       setQuery]       = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Members already on this trainer's current roster
  const alreadyAssignedIds = useMemo(
    () => new Set(trainer.assignments.map((a) => a.member_id)),
    [trainer.assignments],
  );

  // Active members not yet assigned to this trainer
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allMembers.filter((m) => {
      if (!m.is_active) return false;
      if (alreadyAssignedIds.has(m.id)) return false;
      if (!q) return true;
      return (
        m.full_name.toLowerCase().includes(q) ||
        m.phone.includes(q)
      );
    });
  }, [allMembers, alreadyAssignedIds, query]);

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

  const selectedCount = selectedIds.size;

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

        {/* Member list — multi-select */}
        <div className="am-list" role="listbox" aria-multiselectable="true" aria-label="Select members to assign">
          {membersLoading ? (
            <div className="am-empty">Loading members…</div>
          ) : filtered.length === 0 ? (
            <div className="am-empty">
              {query
                ? `No active members match "${query}"`
                : alreadyAssignedIds.size > 0
                  ? "All active members are already assigned to this trainer"
                  : "No active members available"}
            </div>
          ) : (
            filtered.map((m) => {
              const isSelected = selectedIds.has(m.id);
              return (
                <div
                  key={m.id}
                  id={`assign-member-row-${m.id}`}
                  className={`am-row${isSelected ? " am-row--selected" : ""}`}
                  onClick={() => toggleMember(m.id)}
                  role="option"
                  aria-selected={isSelected}
                >
                  {/* Checkbox indicator */}
                  <div className={`am-checkbox${isSelected ? " am-checkbox--checked" : ""}`}>
                    {isSelected && <UserCheck size={11} />}
                  </div>
                  <div className="am-avatar">{getInitials(m.full_name)}</div>
                  <div className="am-info">
                    <div className="am-name">{m.full_name}</div>
                    <div className="am-phone">{m.phone}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selection summary banner */}
        <div className={`am-summary${selectedCount > 0 ? " am-summary--active" : ""}`}>
          {selectedCount === 0
            ? "Tap members above to select them"
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

        /* Member list */
        .am-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          max-height: 280px;
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

        .am-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 10px;
          border-radius: calc(var(--radius-sm) - 2px);
          cursor: pointer;
          transition: background 0.15s;
          min-height: 44px;
          border: 1px solid transparent;
        }
        .am-row:hover { background: var(--bg2); }
        .am-row--selected {
          background: var(--accent-green-dim);
          border-color: rgba(74,222,128,0.2);
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
          transition: all 0.15s;
          background: var(--bg2);
        }
        .am-checkbox--checked {
          background: var(--accent-green);
          border-color: var(--accent-green);
          color: #0d0d0f;
        }

        .am-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--bg2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .am-row--selected .am-avatar {
          background: var(--accent-green-dim);
          border-color: rgba(74,222,128,0.3);
          color: var(--accent-green);
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
        .am-phone { font-size: 12px; color: var(--text-muted); }

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
