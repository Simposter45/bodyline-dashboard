"use client";

import "./BookSessionModal.css";
import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, CalendarPlus, Check } from "lucide-react";
import toast from "react-hot-toast";

import { useTrainers } from "@/hooks/useTrainers";
import { useCreateBooking } from "@/hooks/useCreateBooking";
import type { MemberProfilePortal } from "@/types";

// ── Props ─────────────────────────────────────────────────────────────

interface BookSessionModalProps {
  member: MemberProfilePortal;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────

export default function BookSessionModal({
  member,
  onClose,
}: BookSessionModalProps) {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  
  // Default to tomorrow
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  const [date, setDate] = useState(minDate);
  const [time, setTime] = useState("07:00");
  const [notes, setNotes] = useState("");

  const { data: trainers = [], isLoading: trainersLoading } = useTrainers();
  const createBooking = useCreateBooking();

  // Filter to only active trainers
  const activeTrainers = trainers.filter((t) => t.is_active);

  // Auto-select first trainer on load
  useEffect(() => {
    if (activeTrainers.length > 0 && !selectedTrainerId) {
      setSelectedTrainerId(activeTrainers[0].id);
    }
  }, [activeTrainers, selectedTrainerId]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrainerId || !date || !time) return;

    createBooking.mutate(
      {
        memberId: member.id,
        gymId: member.gym_id,
        trainerId: selectedTrainerId,
        sessionDate: date,
        sessionTime: time,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Session requested! Waiting for trainer confirmation.");
          setTimeout(onClose, 800);
        },
        onError: (err: Error) => {
          toast.error(err.message ?? "Failed to request session.");
        },
      }
    );
  }

  const canSubmit =
    selectedTrainerId !== null &&
    date !== "" &&
    time !== "" &&
    !createBooking.isPending &&
    !createBooking.isSuccess;

  return (
    <>
      {/* Backdrop */}
      <div className="book-overlay" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        className="book-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-title"
      >
        <div className="book-handle" />

        <div className="book-header">
          <h2 id="book-title" className="book-title">
            Request PT Session
          </h2>
          <button
            className="book-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form className="book-form" onSubmit={handleSubmit}>
          {/* Trainer Selector */}
          <div className="book-form-field">
            <label className="book-form-label">Select Trainer</label>
            <div className="book-trainer-options">
              {trainersLoading ? (
                <div style={{ padding: "16px", textAlign: "center" }}>
                  <Loader2 size={20} className="spin" style={{ color: "var(--text-muted)", margin: "0 auto" }} />
                </div>
              ) : activeTrainers.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "8px" }}>
                  No active trainers available.
                </p>
              ) : (
                activeTrainers.map((trainer) => (
                  <button
                    key={trainer.id}
                    type="button"
                    className={`book-trainer-option${
                      selectedTrainerId === trainer.id ? " selected" : ""
                    }`}
                    onClick={() => setSelectedTrainerId(trainer.id)}
                  >
                    <div className="book-trainer-avatar">
                      {getInitials(trainer.full_name)}
                    </div>
                    <div className="book-trainer-info">
                      <span className="book-trainer-name">{trainer.full_name}</span>
                      <span className="book-trainer-spec">
                        {trainer.specialization || "General Training"}
                      </span>
                    </div>
                    <div className="book-trainer-check">
                      {selectedTrainerId === trainer.id && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="book-form-field">
              <label className="book-form-label">Date</label>
              <input
                type="date"
                className="book-input"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="book-form-field">
              <label className="book-form-label">Time</label>
              <input
                type="time"
                className="book-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="book-form-field">
            <label className="book-form-label">Notes (Optional)</label>
            <textarea
              className="book-input"
              rows={2}
              placeholder="E.g., focus on upper body..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: "none" }}
            />
          </div>

          <button
            type="submit"
            className="book-submit-btn"
            disabled={!canSubmit}
          >
            {createBooking.isPending ? (
              <Loader2 size={18} className="spin" />
            ) : createBooking.isSuccess ? (
              <>
                <CheckCircle2 size={18} />
                Requested
              </>
            ) : (
              <>
                <CalendarPlus size={18} />
                Request Session
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
