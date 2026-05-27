"use client";

import "./SessionLogSheet.css";
import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { useLogSession } from "@/hooks/useSessionLogs";
import type { AssignedMemberWithDues } from "@/types";

interface SessionLogSheetProps {
  trainerId: string;
  gymId: string;
  assignedMembers: AssignedMemberWithDues[];
  /** Optional: if opened from MemberDrawer, this is already set */
  preselectedMemberId?: string;
  onClose: () => void;
}

type SessionType = "personal_training" | "group" | "rehab" | "open_gym";

const TYPES: { id: SessionType; label: string; desc: string }[] = [
  { id: "personal_training", label: "PT Session", desc: "1-on-1 personal training" },
  { id: "group", label: "Group Class", desc: "Multiple members" },
  { id: "rehab", label: "Rehab / Mobility", desc: "Injury recovery or stretching" },
  { id: "open_gym", label: "Open Gym Check-in", desc: "General guidance only" },
];

export default function SessionLogSheet({
  trainerId,
  gymId,
  assignedMembers,
  preselectedMemberId,
  onClose,
}: SessionLogSheetProps) {
  const [memberId, setMemberId] = useState(preselectedMemberId || "");
  const [sessionType, setSessionType] = useState<SessionType>("personal_training");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");

  const logSession = useLogSession();

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) return;

    logSession.mutate(
      {
        trainer_id: trainerId,
        gym_id: gymId,
        member_id: memberId,
        session_date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), // YYYY-MM-DD format
        session_type: sessionType,
        duration_mins: parseInt(duration, 10) || 60,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          // Add a tiny delay to show the success checkmark before closing
          setTimeout(() => {
            onClose();
          }, 600);
        },
      }
    );
  }

  return (
    <>
      <div className="log-sheet-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="log-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ls-title"
      >
        <div className="log-sheet-handle" />
        
        <div className="log-sheet-content">
          <div className="log-sheet-header">
            <h2 id="ls-title" className="log-sheet-title">Log Session</h2>
            <button className="sign-out-icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <form className="log-sheet-form" onSubmit={handleSubmit}>
            {/* Member Selection */}
            <div className="form-field">
              <label className="form-label">Member</label>
              {preselectedMemberId ? (
                // Read-only if passed in from drawer
                <input
                  type="text"
                  className="log-input form-input-readonly"
                  readOnly
                  value={
                    assignedMembers.find((m) => m.member.id === memberId)?.member.full_name ||
                    "Unknown Member"
                  }
                />
              ) : (
                <select
                  className="log-select"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a member...</option>
                  {assignedMembers.map((m) => (
                    <option key={m.member.id} value={m.member.id}>
                      {m.member.full_name} {m.is_checked_in_today ? "(In Gym)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Type Grid */}
            <div className="form-field">
              <label className="form-label">Session Type</label>
              <div className="type-grid">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`type-card ${sessionType === t.id ? "selected" : ""}`}
                    onClick={() => setSessionType(t.id)}
                  >
                    <span className="type-card-title">{t.label}</span>
                    <span className="type-card-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="form-field">
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                className="log-input"
                min="15"
                max="240"
                step="15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>

            {/* Notes */}
            <div className="form-field">
              <label className="form-label">Trainer Notes (Optional)</label>
              <textarea
                className="log-textarea"
                placeholder="How did the session go? Any specific exercises or pain points?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="log-submit"
              disabled={!memberId || logSession.isPending || logSession.isSuccess}
            >
              {logSession.isPending ? (
                <Loader2 size={18} className="spin" />
              ) : logSession.isSuccess ? (
                <>
                  <CheckCircle2 size={18} /> Logged
                </>
              ) : (
                "Save Session"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
