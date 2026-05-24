"use client";

// ============================================================
// components/trainers/AssignMemberModal.tsx
// FEAT-007 — Modal to assign a member to a trainer.
//
// Loads all active members (useMembers), displays them as
// selectable card rows with live search. On confirm, calls
// useAssignMember which deactivates any prior assignment
// for that member and creates a new one.
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

  const [query,      setQuery]      = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Active members only — filter out already-assigned ones to this trainer
  // so the owner doesn't re-assign someone already on the roster.
  const alreadyAssignedIds = useMemo(
    () => new Set(trainer.assignments.map((a) => a.member_id)),
    [trainer.assignments],
  );

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

  const handleClose = () => {
    setQuery("");
    setSelectedId(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedId) return;
    await assignMember({ trainerId: trainer.id, memberId: selectedId });
    handleClose();
  };

  const selectedMember = filtered.find((m) => m.id === selectedId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Assign Member — ${trainer.full_name}`}
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
        <div className="am-list" role="listbox" aria-label="Select a member">
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
              const isSelected = m.id === selectedId;
              return (
                <div
                  key={m.id}
                  id={`assign-member-row-${m.id}`}
                  className={`am-row${isSelected ? " am-row--selected" : ""}`}
                  onClick={() => setSelectedId(isSelected ? null : m.id)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="am-avatar">{getInitials(m.full_name)}</div>
                  <div className="am-info">
                    <div className="am-name">{m.full_name}</div>
                    <div className="am-phone">{m.phone}</div>
                  </div>
                  {isSelected && (
                    <UserCheck size={16} className="am-check-icon" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Confirm banner + actions */}
        {selectedMember && (
          <div className="am-confirm-banner">
            <span className="am-confirm-text">
              Assign <strong>{selectedMember.full_name}</strong> to this trainer?
            </span>
          </div>
        )}

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
            disabled={!selectedId || isPending}
            onClick={handleConfirm}
          >
            {isPending ? "Assigning…" : "Confirm Assignment"}
          </button>
        </div>
      </div>

      <style>{`
        .am-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
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
          gap: 4px;
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

        .am-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: calc(var(--radius-sm) - 2px);
          cursor: pointer;
          transition: background 0.15s;
          min-height: 44px;
          border: 1px solid transparent;
        }
        .am-row:hover { background: var(--bg2); }
        .am-row--selected {
          background: var(--accent-green-dim);
          border-color: var(--accent-green);
        }

        .am-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .am-row--selected .am-avatar {
          background: var(--accent-green-dim);
          border-color: var(--accent-green);
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

        .am-check-icon { color: var(--accent-green); flex-shrink: 0; }

        /* Confirm banner */
        .am-confirm-banner {
          background: var(--accent-green-dim);
          border: 1px solid rgba(74,222,128,0.2);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          font-size: 13px;
          color: var(--text-secondary);
          animation: slideIn 0.2s ease-out;
        }
        .am-confirm-banner strong { color: var(--text-primary); }

        /* Actions */
        .am-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 14px;
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

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Modal>
  );
}
