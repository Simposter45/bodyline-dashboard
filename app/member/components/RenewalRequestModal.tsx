"use client";

import "./RenewalRequestModal.css";
import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import { usePlans } from "@/hooks/usePlans";
import { useRenewalRequestMutation } from "@/hooks/useRenewalRequestMutation";
import type { MemberProfilePortal } from "@/types";

// ── Props ─────────────────────────────────────────────────────────────

interface RenewalRequestModalProps {
  member: MemberProfilePortal;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────

export default function RenewalRequestModal({
  member,
  onClose,
}: RenewalRequestModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Fetch active plans scoped to this member's gym via RLS
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const renewalMutation = useRenewalRequestMutation();

  // Auto-select first plan when plans load
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit() {
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    renewalMutation.mutate(
      {
        memberId: member.id,
        gymId: member.gym_id,
        planId: plan.id,
        planDurationDays: plan.duration_days,
      },
      {
        onSuccess: () => {
          toast.success("Renewal request submitted! The gym will confirm shortly.");
          setTimeout(onClose, 800);
        },
        onError: (err: Error) => {
          toast.error(err.message ?? "Failed to submit renewal request.");
        },
      },
    );
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const canSubmit =
    selectedPlanId !== null &&
    !renewalMutation.isPending &&
    !renewalMutation.isSuccess;

  return (
    <>
      {/* Backdrop */}
      <div className="renewal-overlay" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        className="renewal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="renewal-title"
      >
        <div className="renewal-handle" />

        {/* Header */}
        <div className="renewal-header">
          <h2 id="renewal-title" className="renewal-title">
            Request Renewal
          </h2>
          <button
            className="renewal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="renewal-subtitle">
          Choose a plan below. The gym will contact you to confirm payment and
          activate your membership.
        </p>

        {/* Plan List */}
        <div className="renewal-plan-grid">
          {plansLoading ? (
            <div className="renewal-no-plans">
              <Loader2 size={20} className="spin" style={{ margin: "0 auto" }} />
            </div>
          ) : plans.length === 0 ? (
            <p className="renewal-no-plans">No plans available right now.</p>
          ) : (
            plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`renewal-plan-option${
                  selectedPlanId === plan.id ? " selected" : ""
                }`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <div className="renewal-plan-left">
                  <span className="renewal-plan-name">{plan.name}</span>
                  <span className="renewal-plan-duration">
                    {plan.duration_days} days
                    {plan.description ? ` · ${plan.description}` : ""}
                  </span>
                </div>
                <span className="renewal-plan-price">
                  ₹{plan.price.toLocaleString("en-IN")}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Disclaimer */}
        <p className="renewal-disclaimer">
          💡 This submits a renewal request only. No payment is collected here.
          The gym team will reach out to confirm your plan and collect payment.
        </p>

        {/* Submit */}
        <button
          className="renewal-submit-btn"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {renewalMutation.isPending ? (
            <Loader2 size={18} className="spin" />
          ) : renewalMutation.isSuccess ? (
            <>
              <CheckCircle2 size={18} />
              Request Sent!
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              {selectedPlan
                ? `Request ${selectedPlan.name} (₹${selectedPlan.price.toLocaleString("en-IN")})`
                : "Select a plan"}
            </>
          )}
        </button>
      </div>
    </>
  );
}
