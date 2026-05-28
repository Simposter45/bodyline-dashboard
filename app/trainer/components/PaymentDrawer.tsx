"use client";

import "./PaymentDrawer.css";
import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, IndianRupee, Banknote, QrCode } from "lucide-react";
import { useRecordPaymentAsTrainer } from "@/hooks/useTrainerPaymentMutation";
import type { AssignedMemberWithDues } from "@/types";

interface PaymentDrawerProps {
  trainerId: string;
  memberInfo: AssignedMemberWithDues;
  onClose: () => void;
}

export default function PaymentDrawer({ trainerId, memberInfo, onClose }: PaymentDrawerProps) {
  const [method, setMethod] = useState<"cash" | "upi">("upi");
  
  const recordPayment = useRecordPaymentAsTrainer();

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const membership = memberInfo.current_membership;
  if (!membership) return null;

  const totalPlanPrice = membership.plan?.price || 0;
  const amountPaidSoFar = membership.amount_paid || 0;
  const amountDue = Math.max(0, totalPlanPrice - amountPaidSoFar);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;

    recordPayment.mutate(
      {
        membership_id: membership.id,
        member_id: memberInfo.member.id,
        trainer_id: trainerId,
        payment_method: method,
        amount_paid: amountDue, // For now, we assume they pay the full remaining due amount
      },
      {
        onSuccess: () => {
          setTimeout(() => {
            onClose();
          }, 600);
        },
      }
    );
  }

  return (
    <>
      <div className="pay-drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="pay-drawer" role="dialog" aria-modal="true" aria-labelledby="pay-title">
        <div className="pay-drawer-handle" />
        
        <div className="pay-drawer-header">
          <h2 id="pay-title" className="pay-drawer-title">Record Payment</h2>
          <button className="pay-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="pay-info-banner">
          <div className="pay-info-row">
            <span className="pay-info-label">Member</span>
            <span className="pay-info-value">{memberInfo.member.full_name}</span>
          </div>
          <div className="pay-info-row">
            <span className="pay-info-label">Plan</span>
            <span className="pay-info-value">{membership.plan?.name}</span>
          </div>
          <hr style={{ border: "none", borderTop: "1px dashed var(--border)", margin: "4px 0" }} />
          <div className="pay-info-row">
            <span className="pay-info-label">Total Due Amount</span>
            <span className="pay-info-value amount-due">
              ₹ {amountDue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <form className="pay-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Amount Collected</label>
            <div style={{ position: "relative" }}>
              <IndianRupee size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
              <input
                type="number"
                className="log-input form-input-readonly"
                value={amountDue}
                readOnly
                style={{ paddingLeft: 36, color: "var(--text-primary)" }}
              />
            </div>
            <p className="form-hint" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
              Currently capturing full dues settlement only.
            </p>
          </div>

          <div className="form-field">
            <label className="form-label">Payment Method Collected</label>
            <div className="pay-methods">
              <button
                type="button"
                className={`pay-method-btn ${method === "upi" ? "selected" : ""}`}
                onClick={() => setMethod("upi")}
              >
                <QrCode size={18} /> UPI
              </button>
              <button
                type="button"
                className={`pay-method-btn ${method === "cash" ? "selected" : ""}`}
                onClick={() => setMethod("cash")}
              >
                <Banknote size={18} /> Cash
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="pay-submit-btn"
            disabled={amountDue <= 0 || recordPayment.isPending || recordPayment.isSuccess}
          >
            {recordPayment.isPending ? (
              <Loader2 size={18} className="spin" />
            ) : recordPayment.isSuccess ? (
              <>
                <CheckCircle2 size={18} /> Recorded
              </>
            ) : (
              `Record ₹ ${amountDue.toLocaleString('en-IN')}`
            )}
          </button>
        </form>
      </div>
    </>
  );
}
