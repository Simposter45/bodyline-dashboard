"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import { Modal } from "@/components/ui/Modal";
import { useRenewMembership } from "@/hooks/useRenewMembership";
import { usePlans } from "@/hooks/usePlans";
import { useGymSettings } from "@/hooks/useGymSettings";
import { renewMembershipSchema, type RenewMembershipFormData } from "@/lib/validations/member";

interface RenewMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
}

export function RenewMembershipModal({ isOpen, onClose, memberId }: RenewMembershipModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { data: plans = [] } = usePlans();
  const { data: settings } = useGymSettings();
  const { mutateAsync: renewMembership, isPending } = useRenewMembership();

  const {
    handleSubmit,
    reset,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<RenewMembershipFormData>({
    resolver: zodResolver(renewMembershipSchema),
    defaultValues: {
      plan_id: "",
      payment_method: undefined as any,
    },
  });

  const selectedPlanId = watch("plan_id");
  const selectedPayment = watch("payment_method");
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleClose = () => {
    reset();
    setStep(1);
    onClose();
  };

  const onNextToPayment = async () => {
    const isValid = await trigger(["plan_id"]);
    if (isValid) setStep(2);
  };

  const onSubmitFinal = async (data: RenewMembershipFormData) => {
    if (!selectedPlan) return;
    try {
      await renewMembership({
        ...data,
        member_id: memberId,
        plan_price: selectedPlan.price,
        plan_duration: selectedPlan.duration_days,
      });
      setStep(3);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to renew membership";
      toast.error(msg);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={step === 1 ? "Renew Membership" : step === 2 ? "Checkout & Payment" : "Success"}
    >
      <form onSubmit={handleSubmit(onSubmitFinal)} className="multi-step-form">
        
        {/* STEP 1: PLAN */}
        {step === 1 && (
          <div className="step-content">
            <div className="form-group">
              <label>Select New Plan <span className="required">*</span></label>
              <Controller
                name="plan_id"
                control={control}
                render={({ field }) => (
                  <div className="plan-grid">
                    {plans.map((p) => (
                      <div
                        key={p.id}
                        className={`plan-card ${field.value === p.id ? "selected" : ""}`}
                        onClick={() => field.onChange(p.id)}
                      >
                        <div className="plan-name">{p.name}</div>
                        <div className="plan-price">₹{p.price}</div>
                        <div className="plan-dur">{p.duration_days} days</div>
                      </div>
                    ))}
                  </div>
                )}
              />
              {errors.plan_id && <span className="error-text">{errors.plan_id.message}</span>}
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleClose} className="btn-cancel">Cancel</button>
              <button type="button" onClick={onNextToPayment} className="btn-solid">Continue to Payment</button>
            </div>
          </div>
        )}

        {/* STEP 2: PAYMENT */}
        {step === 2 && (
          <div className="step-content">
            <div className="summary-banner">
              <span className="summary-label">Amount to Pay</span>
              <span className="summary-val">₹{selectedPlan?.price}</span>
            </div>

            <div className="form-group">
              <label>Select Payment Method <span className="required">*</span></label>
              <Controller
                name="payment_method"
                control={control}
                render={({ field }) => (
                  <div className="pay-methods">
                    <label className={`pay-opt ${field.value === "upi" ? "selected" : ""}`}>
                      <input type="radio" value="upi" onChange={() => field.onChange("upi")} checked={field.value === "upi"} className="hidden" />
                      <div className="pay-radio" />
                      <div>
                        <div className="pay-name">UPI / QR Code</div>
                        <div className="pay-desc">Generate QR for instant scan</div>
                      </div>
                    </label>
                    <label className={`pay-opt ${field.value === "cash" ? "selected" : ""}`}>
                      <input type="radio" value="cash" onChange={() => field.onChange("cash")} checked={field.value === "cash"} className="hidden" />
                      <div className="pay-radio" />
                      <div>
                        <div className="pay-name">Cash</div>
                        <div className="pay-desc">Collect payment over the counter</div>
                      </div>
                    </label>
                    <label className={`pay-opt ${field.value === "card" ? "selected" : ""}`}>
                      <input type="radio" value="card" onChange={() => field.onChange("card")} checked={field.value === "card"} className="hidden" />
                      <div className="pay-radio" />
                      <div>
                        <div className="pay-name">Card / POS</div>
                        <div className="pay-desc">External machine transaction</div>
                      </div>
                    </label>
                  </div>
                )}
              />
              {errors.payment_method && <span className="error-text">{errors.payment_method.message}</span>}
            </div>

            {selectedPayment === "upi" && settings?.upi_id && (
              <div className="qr-container">
                <p className="qr-guide">Scan to pay <strong>₹{selectedPlan?.price}</strong></p>
                <div className="qr-box">
                  <div className="qr-pattern" />
                </div>
                <p className="qr-upi-id">{settings.upi_id}</p>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={() => setStep(1)} className="btn-cancel" disabled={isPending}>Back</button>
              <button type="submit" className="btn-solid" disabled={isPending}>
                {isPending ? "Processing..." : "Confirm Renewal"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 3 && (
          <div className="step-content success-view">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Membership Renewed!</h3>
            <p className="success-sub">
              The plan has been successfully extended. The start date was automatically adjusted based on their current plan.
            </p>

            <div className="success-actions">
              <button type="button" className="action-btn outline" onClick={handleClose}>
                 Close & Return
              </button>
            </div>
          </div>
        )}

      </form>

      <style>{`
        .multi-step-form { display: flex; flex-direction: column; }
        .step-content { display: flex; flex-direction: column; gap: 16px; animation: slideIn 0.25s ease-out; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .required { color: var(--accent-red); }
        .error-text { font-size: 12px; color: var(--accent-red); }

        /* Plan Grid */
        .plan-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .plan-card {
          background: var(--bg3); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 12px; cursor: pointer; transition: all 0.2s;
        }
        .plan-card:hover { border-color: var(--border-hi); }
        .plan-card.selected { border-color: var(--accent-green); background: var(--accent-green-dim); }
        .plan-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .plan-price { font-size: 18px; font-weight: 700; margin: 4px 0; color: var(--text-primary); font-family: var(--font-display); }
        .plan-dur { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

        /* Payment */
        .summary-banner {
          display: flex; justify-content: space-between; align-items: center;
          background: var(--bg3); padding: 16px; border-radius: var(--radius-sm);
          border: 1px dashed var(--border-hi); margin-bottom: 8px;
        }
        .summary-label { color: var(--text-secondary); font-size: 14px; }
        .summary-val { font-size: 20px; font-weight: 700; color: var(--accent-green); font-family: var(--font-display); }

        .pay-methods { display: flex; flex-direction: column; gap: 8px; }
        .pay-opt {
          display: flex; align-items: center; gap: 12px; background: var(--bg3);
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          padding: 12px 14px; cursor: pointer; transition: all 0.2s;
        }
        .pay-opt:hover { border-color: var(--border-hi); }
        .pay-opt.selected { border-color: var(--accent-green); background: var(--bg2); }
        .hidden { display: none; }
        .pay-radio { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--text-muted); position: relative; }
        .pay-opt.selected .pay-radio { border-color: var(--accent-green); }
        .pay-opt.selected .pay-radio::after { content: ""; position: absolute; inset: 3px; background: var(--accent-green); border-radius: 50%; }
        .pay-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .pay-desc { font-size: 12px; color: var(--text-muted); }

        /* QR Code */
        .qr-container {
          background: #fff; border-radius: var(--radius-sm); padding: 24px;
          display: flex; flex-direction: column; align-items: center; margin-top: 8px;
        }
        .qr-guide { color: #000; font-size: 14px; margin-bottom: 16px; }
        .qr-box {
          width: 140px; height: 140px; background: #f0f0f0; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 12px;
        }
        .qr-pattern {
          width: 100%; height: 100%; opacity: 0.5;
          background-image: repeating-linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                            repeating-linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
          background-position: 0 0, 10px 10px; background-size: 20px 20px;
        }
        .qr-upi-id { color: #555; font-family: monospace; font-size: 12px; }

        /* Actions */
        .form-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--border); }
        .btn-cancel { background: transparent; border: none; color: var(--text-secondary); font-family: var(--font-ui); font-size: 13px; font-weight: 600; cursor: pointer; padding: 10px 16px; border-radius: var(--radius-sm); transition: all 0.15s; }
        .btn-cancel:hover:not(:disabled) { background: var(--bg3); color: var(--text-primary); }
        .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Success */
        .success-view { text-align: center; padding: 16px 0; }
        .success-icon { width: 64px; height: 64px; border-radius: 50%; background: var(--accent-green-dim); color: var(--accent-green); display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px; }
        .success-title { font-family: var(--font-display); font-size: 20px; color: var(--text-primary); margin-bottom: 8px; }
        .success-sub { font-size: 14px; color: var(--text-muted); line-height: 1.6; margin-bottom: 24px; padding: 0 16px; }
        
        .success-actions { display: flex; flex-direction: column; gap: 10px; }
        .action-btn { width: 100%; border: none; border-radius: var(--radius-sm); padding: 12px; font-family: var(--font-ui); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .action-btn.outline { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
        .action-btn.outline:hover { color: var(--text-primary); border-color: var(--border-hi); }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </Modal>
  );
}
