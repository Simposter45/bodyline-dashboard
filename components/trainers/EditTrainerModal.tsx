"use client";

// ============================================================
// components/trainers/EditTrainerModal.tsx
// FEAT-007 — Modal to edit an existing trainer.
//
// Pre-populated from the trainer prop. Same field layout as
// AddTrainerModal. Calls useEditTrainer mutation on submit.
// ============================================================

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { useEditTrainer } from "@/hooks/useTrainerMutations";
import { useGymSettings } from "@/hooks/useGymSettings";
import { editTrainerSchema, type EditTrainerFormData } from "@/lib/validations/trainer";
import type { TrainerWithAssignments } from "@/hooks/useTrainers";

interface EditTrainerModalProps {
  isOpen:  boolean;
  onClose: () => void;
  trainer: TrainerWithAssignments;
}

export function EditTrainerModal({ isOpen, onClose, trainer }: EditTrainerModalProps) {
  const { mutateAsync: editTrainer, isPending } = useEditTrainer();
  const { data: settings } = useGymSettings();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditTrainerFormData>({
    resolver: zodResolver(editTrainerSchema),
    defaultValues: {
      full_name:      trainer.full_name,
      phone:          trainer.phone          ?? "",
      email:          trainer.email          ?? "",
      specialization: trainer.specialization ?? "",
      branch:         trainer.branch         ?? "",
      is_active:      trainer.is_active,
    },
  });

  const isActive = watch("is_active");

  // Re-populate form whenever the trainer prop changes
  // (e.g. user selects a different trainer card)
  useEffect(() => {
    if (isOpen) {
      reset({
        full_name:      trainer.full_name,
        phone:          trainer.phone          ?? "",
        email:          trainer.email          ?? "",
        specialization: trainer.specialization ?? "",
        branch:         trainer.branch         ?? "",
        is_active:      trainer.is_active,
      });
    }
  }, [trainer, isOpen, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: EditTrainerFormData) => {
    await editTrainer({ id: trainer.id, ...data });
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Trainer">
      <form onSubmit={handleSubmit(onSubmit)} className="trainer-form">

        {/* Row 1: Name + Phone */}
        <div className="tf-row">
          <div className="tf-group">
            <label>Full Name <span className="tf-required">*</span></label>
            <input
              {...register("full_name")}
              type="text"
              className="tf-input"
              placeholder="e.g. Ravi Kumar"
              disabled={isPending}
            />
            {errors.full_name && (
              <span className="tf-error">{errors.full_name.message}</span>
            )}
          </div>

          <div className="tf-group">
            <label>Phone <span className="tf-optional">(Optional)</span></label>
            <input
              {...register("phone")}
              type="tel"
              className="tf-input"
              placeholder="10-digit number"
              maxLength={10}
              disabled={isPending}
            />
            {errors.phone && (
              <span className="tf-error">{errors.phone.message}</span>
            )}
          </div>
        </div>

        {/* Row 2: Email + Specialization */}
        <div className="tf-row">
          <div className="tf-group">
            <label>Email <span className="tf-optional">(Optional)</span></label>
            <input
              {...register("email")}
              type="email"
              className="tf-input"
              placeholder="trainer@email.com"
              disabled={isPending}
            />
            {errors.email && (
              <span className="tf-error">{errors.email.message}</span>
            )}
          </div>

          <div className="tf-group">
            <label>Specialization <span className="tf-optional">(Optional)</span></label>
            <input
              {...register("specialization")}
              type="text"
              className="tf-input"
              placeholder="e.g. Strength, Cardio"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Row 3: Branch + Status toggle */}
        <div className="tf-row">
          <div className="tf-group">
            <label>Branch <span className="tf-optional">(Optional)</span></label>
            <select {...register("branch")} className="tf-input" disabled={isPending}>
              <option value="">Select branch</option>
              {(settings?.branches ?? []).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="tf-group">
            <label>Status</label>
            <button
              type="button"
              id="edit-trainer-status-toggle"
              className={`tf-toggle${isActive ? " tf-toggle--on" : ""}`}
              onClick={() => setValue("is_active", !isActive)}
              disabled={isPending}
              aria-pressed={isActive}
            >
              <span className="tf-toggle-dot" />
              <span className="tf-toggle-label">
                {isActive ? "On duty" : "Off duty"}
              </span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="tf-actions">
          <button
            type="button"
            className="tf-btn-cancel"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            id="edit-trainer-submit"
            className="btn-solid"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>

      <style>{`
        .trainer-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .tf-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 480px) {
          .tf-row { grid-template-columns: 1fr; }
        }

        .tf-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tf-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .tf-required { color: var(--accent-red); }
        .tf-optional { color: var(--text-muted); font-weight: 400; }

        .tf-input {
          width: 100%;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .tf-input:focus   { border-color: var(--accent-green); }
        .tf-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .tf-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          cursor: pointer;
          min-height: 44px;
          transition: all 0.2s;
          font-family: var(--font-body);
        }
        .tf-toggle--on  { border-color: var(--accent-green); background: var(--accent-green-dim); }
        .tf-toggle:disabled { opacity: 0.5; cursor: not-allowed; }

        .tf-toggle-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--text-muted);
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .tf-toggle--on .tf-toggle-dot { background: var(--accent-green); }

        .tf-toggle-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .tf-toggle--on .tf-toggle-label { color: var(--accent-green); }

        .tf-error {
          font-size: 12px;
          color: var(--accent-red);
        }

        .tf-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
          margin-top: 4px;
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
      `}</style>
    </Modal>
  );
}
