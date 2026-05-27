"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { planSchema, type PlanFormData } from "@/lib/validations/plan";
import { useCreatePlan, useUpdatePlan } from "@/hooks/usePlanMutations";
import type { MembershipPlan } from "@/types";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: MembershipPlan | null;
}

export function PlanModal({ isOpen, onClose, initialPlan }: PlanModalProps) {
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      price: 0,
      duration_days: 30,
      max_freeze_days: 0,
      description: "",
    },
  });

  // Reset form when modal opens/closes or initialPlan changes
  useEffect(() => {
    if (isOpen) {
      if (initialPlan) {
        reset({
          name: initialPlan.name,
          price: initialPlan.price,
          duration_days: initialPlan.duration_days,
          max_freeze_days: initialPlan.max_freeze_days ?? 0,
          description: initialPlan.description ?? "",
        });
      } else {
        reset({
          name: "",
          price: 1500, // Reasonable default
          duration_days: 30,
          max_freeze_days: 0,
          description: "",
        });
      }
    }
  }, [isOpen, initialPlan, reset]);

  const onSubmit = async (data: PlanFormData) => {
    if (initialPlan) {
      await updatePlan.mutateAsync({ id: initialPlan.id, data });
    } else {
      await createPlan.mutateAsync(data);
    }
    onClose();
  };

  const isPending = createPlan.isPending || updatePlan.isPending || isSubmitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialPlan ? "Edit Membership Plan" : "Create Membership Plan"}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Plan Name</label>
            <input
              {...register("name")}
              className="form-input"
              placeholder="e.g. Monthly Standard"
              autoFocus
            />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          <div className="form-field">
            <label className="form-label">Price (₹)</label>
            <input
              {...register("price", { valueAsNumber: true })}
              className="form-input"
              placeholder="0"
              type="number"
              min={0}
            />
            {errors.price && <span className="form-error">{errors.price.message}</span>}
          </div>
          
          <div className="form-field">
            <label className="form-label">Duration (Days)</label>
            <input
              {...register("duration_days", { valueAsNumber: true })}
              className="form-input"
              placeholder="30"
              type="number"
              min={1}
            />
            <span className="form-hint">e.g. 30 (1 month), 90 (3 months), 365 (1 year)</span>
            {errors.duration_days && <span className="form-error">{errors.duration_days.message}</span>}
          </div>

          <div className="form-field">
            <label className="form-label">Max Freeze Days</label>
            <input
              {...register("max_freeze_days", { valueAsNumber: true })}
              className="form-input"
              placeholder="0"
              type="number"
              min={0}
            />
            <span className="form-hint">Maximum days this plan can be paused</span>
            {errors.max_freeze_days && <span className="form-error">{errors.max_freeze_days.message}</span>}
          </div>

          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Description (Optional)</label>
            <input
              {...register("description")}
              className="form-input"
              placeholder="Visible to staff when selecting plans"
            />
            {errors.description && <span className="form-error">{errors.description.message}</span>}
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="btn-ghost-sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button type="submit" className="btn-solid" disabled={isPending}>
            {isPending ? "Saving..." : initialPlan ? "Save Changes" : "Create Plan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
