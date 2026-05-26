"use client";

// ============================================================
// components/members/SubscriptionActionModals.tsx
// Three lightweight modals for subscription operations:
//   - PauseModal     — pick a paused_until date
//   - ExtendModal    — pick number of days to add
//   - CancelModal    — destructive confirmation
// ============================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle } from "lucide-react";
import { todayISO, addDays } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────
// PAUSE MODAL
// ─────────────────────────────────────────────────────────────

const pauseSchema = z.object({
  paused_until: z
    .string()
    .min(1, "Please select a resume date")
    .refine((d) => d > todayISO(), "Resume date must be in the future"),
});
type PauseFormData = z.infer<typeof pauseSchema>;

interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pausedUntil: string) => void;
  isPending: boolean;
  maxFreezeDays: number; // from the plan — 0 means no limit configured
}

export function PauseModal({ isOpen, onClose, onConfirm, isPending, maxFreezeDays }: PauseModalProps) {
  const maxDate = maxFreezeDays > 0 ? addDays(maxFreezeDays) : addDays(365);
  const minDate = addDays(1); // Tomorrow at earliest

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PauseFormData>({ resolver: zodResolver(pauseSchema) });

  const onSubmit = (data: PauseFormData) => {
    onConfirm(data.paused_until);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pause Membership">
      <form onSubmit={handleSubmit(onSubmit)}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
          The membership will be paused. The end date will automatically extend when the owner resumes it.
          {maxFreezeDays > 0 && (
            <span style={{ display: "block", marginTop: 8, color: "var(--accent-amber)" }}>
              This plan allows a maximum of <strong>{maxFreezeDays} freeze days</strong>.
            </span>
          )}
        </p>

        <div className="form-field">
          <label className="form-label">Resume Date</label>
          <input
            {...register("paused_until")}
            type="date"
            className="form-input"
            min={minDate}
            max={maxDate}
          />
          <span className="form-hint">Membership will resume automatically on this date</span>
          {errors.paused_until && (
            <span className="form-error">{errors.paused_until.message}</span>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: 24 }}>
          <button type="button" className="btn-ghost-sm" onClick={handleClose} disabled={isPending}>
            Cancel
          </button>
          <button type="submit" className="btn-solid" disabled={isPending}>
            {isPending ? "Pausing..." : "Confirm Pause"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// EXTEND MODAL
// ─────────────────────────────────────────────────────────────

const extendSchema = z.object({
  days_to_add: z
    .number()
    .int()
    .min(1, "Must add at least 1 day")
    .max(365, "Cannot extend by more than 365 days at once"),
});
type ExtendFormData = z.infer<typeof extendSchema>;

interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (days: number) => void;
  isPending: boolean;
  currentEndDate: string; // ISO date — shown for context
}

export function ExtendModal({ isOpen, onClose, onConfirm, isPending, currentEndDate }: ExtendModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExtendFormData>({ resolver: zodResolver(extendSchema), defaultValues: { days_to_add: 30 } });

  const daysToAdd = watch("days_to_add");
  const newEndDate = daysToAdd > 0 ? addDays(daysToAdd, currentEndDate) : currentEndDate;

  const onSubmit = (data: ExtendFormData) => {
    onConfirm(data.days_to_add);
  };

  const handleClose = () => {
    reset({ days_to_add: 30 });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Extend Membership">
      <form onSubmit={handleSubmit(onSubmit)}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
          Current expiry: <strong style={{ color: "var(--text-primary)" }}>{currentEndDate}</strong>
        </p>

        <div className="form-field">
          <label className="form-label">Days to Add</label>
          <input
            {...register("days_to_add", { valueAsNumber: true })}
            type="number"
            className="form-input"
            min={1}
            max={365}
          />
          {daysToAdd > 0 && (
            <span className="form-hint">
              New expiry: <strong>{newEndDate}</strong>
            </span>
          )}
          {errors.days_to_add && (
            <span className="form-error">{errors.days_to_add.message}</span>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: 24 }}>
          <button type="button" className="btn-ghost-sm" onClick={handleClose} disabled={isPending}>
            Cancel
          </button>
          <button type="submit" className="btn-solid" disabled={isPending}>
            {isPending ? "Extending..." : "Confirm Extension"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// CANCEL MODAL
// ─────────────────────────────────────────────────────────────

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  memberName: string;
}

export function CancelModal({ isOpen, onClose, onConfirm, isPending, memberName }: CancelModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleClose = () => {
    setAcknowledged(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!acknowledged) return;
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cancel Membership">
      <div style={{ display: "flex", gap: 12, padding: "16px", background: "var(--accent-red-dim)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
        <AlertTriangle size={18} style={{ color: "var(--accent-red)", flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          This will <strong style={{ color: "var(--accent-red)" }}>cancel the active membership</strong> for{" "}
          <strong style={{ color: "var(--text-primary)" }}>{memberName}</strong> and mark them as{" "}
          <strong style={{ color: "var(--accent-red)" }}>inactive</strong>. This action cannot be undone automatically — a new membership must be created to reactivate them.
        </div>
      </div>

      <label
        style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 24 }}
      >
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          style={{ marginTop: 2, accentColor: "var(--accent-red)", width: 16, height: 16, flexShrink: 0 }}
        />
        I understand this will deactivate {memberName}&apos;s account and cancel their membership.
      </label>

      <div className="form-actions">
        <button type="button" className="btn-ghost-sm" onClick={handleClose} disabled={isPending}>
          Keep Membership
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={handleConfirm}
          disabled={!acknowledged || isPending}
          style={{ flex: 1, justifyContent: "center" }}
        >
          {isPending ? "Cancelling..." : "Cancel Membership"}
        </button>
      </div>
    </Modal>
  );
}
