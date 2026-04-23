"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import { Modal } from "@/components/ui/Modal";
import { useCreateMember } from "@/hooks/useCreateMember";
import { usePlans } from "@/hooks/usePlans";
import { useGymSettings } from "@/hooks/useGymSettings";
import { createMemberSchema, type CreateMemberFormData } from "@/lib/validations/member";
import { todayISO } from "@/lib/utils/date";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddMemberModal({ isOpen, onClose }: AddMemberModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { data: plans = [] } = usePlans();
  const { data: settings } = useGymSettings();
  const { mutateAsync: createMember, isPending } = useCreateMember();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<CreateMemberFormData>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      date_of_birth: "",
      branch: "",
      plan_id: "",
      payment_method: undefined,
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
    // Validate step 1 fields before proceeding
    const isStep1Valid = await trigger([
      "full_name",
      "phone",
      "email",
      "date_of_birth",
      "branch",
      "plan_id",
    ]);

    if (isStep1Valid) {
      setStep(2);
    }
  };

  const onSubmitFinal = async (data: CreateMemberFormData) => {
    if (!selectedPlan) return;

    try {
      await createMember({
        ...data,
        plan_price: selectedPlan.price,
        plan_duration: selectedPlan.duration_days,
      });
      setStep(3);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to add member";
      toast.error(msg);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={step === 1 ? "Add New Member" : step === 2 ? "Checkout & Payment" : "All Set!"}
    >
      <form onSubmit={handleSubmit(onSubmitFinal)} className="multi-step-form">
        
        {/* ==========================================
            STEP 1: DETAILS & PLAN
           ========================================== */}
        {step === 1 && (
          <div className="step-content">
            <div className="form-row">
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <input
                  {...register("full_name")}
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe"
                />
                {errors.full_name && <span className="error-text">{errors.full_name.message}</span>}
              </div>

              <div className="form-group">
                <label>Phone Number <span className="required">*</span></label>
                <input
                  {...register("phone")}
                  type="tel"
                  className="form-input"
                  placeholder="10 digit number"
                  maxLength={10}
                />
                {errors.phone && <span className="error-text">{errors.phone.message}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth <span className="required">*</span></label>
                <input
                  {...register("date_of_birth")}
                  type="date"
                  className="form-input"
                  max={todayISO()}
                />
                {errors.date_of_birth && <span className="error-text">{errors.date_of_birth.message}</span>}
              </div>

              <div className="form-group">
                <label>Branch <span className="required">*</span></label>
                <select {...register("branch")} className="form-input">
                  <option value="">Select branch</option>
                  {settings?.branches?.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {errors.branch && <span className="error-text">{errors.branch.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Email Address <span className="optional">(Optional)</span></label>
              <input
                {...register("email")}
                type="email"
                className="form-input"
                placeholder="john@example.com"
              />
              {errors.email && <span className="error-text">{errors.email.message}</span>}
            </div>

            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Membership Plan <span className="required">*</span></label>
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
              <button type="button" onClick={handleClose} className="btn-cancel">
                Cancel
              </button>
              <button type="button" onClick={onNextToPayment} className="btn-solid">
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 2: PAYMENT METHOD
           ========================================== */}
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
              <button type="button" onClick={() => setStep(1)} className="btn-cancel" disabled={isPending}>
                Back
              </button>
              <button type="submit" className="btn-solid" disabled={isPending}>
                {isPending ? "Processing..." : "Confirm & Create Member"}
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 3: SUCCESS & HANDOFF
           ========================================== */}
        {step === 3 && (
          <div className="step-content success-view">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Member Successfully Added!</h3>
            <p className="success-sub">
              They are now active in the system. Send them a setup link or upload their documents now.
            </p>

            <div className="success-actions">
              <button type="button" className="action-btn primary" onClick={() => toast.success("SMS feature coming soon!")}>
                 Send SMS Setup Link
              </button>
              <button type="button" className="action-btn secondary" onClick={() => toast.success("Upload feature coming soon!")}>
                 Upload Photo & ID Now
              </button>
              <button type="button" className="action-btn outline" onClick={handleClose}>
                 Close & Return to Dashboard
              </button>
            </div>
          </div>
        )}

      </form>

      <style>{`
        .multi-step-form {
          display: flex;
          flex-direction: column;
        }

        .step-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: slideIn 0.25s ease-out;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .required { color: var(--accent-red); }
        .optional { color: var(--text-muted); font-weight: 400; }

        .form-input {
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
        }
        .form-input:focus { border-color: var(--accent-green); }
        .form-input:disabled { opacity: 0.5; cursor: not-allowed; color: var(--text-muted); }
        /* For date/select inputs */
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; cursor: pointer; }

        .error-text { font-size: 12px; color: var(--accent-red); }

        /* Plan Grid */
        .plan-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .plan-card {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .plan-card:hover { border-color: var(--border-hi); }
        .plan-card.selected {
          border-color: var(--accent-green);
          background: var(--accent-green-dim);
        }
        .plan-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .plan-price { font-size: 18px; font-weight: 700; margin: 4px 0; color: var(--text-primary); font-family: var(--font-display); }
        .plan-dur { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

        /* Payment Step */
        .summary-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg3);
          padding: 16px;
          border-radius: var(--radius-sm);
          border: 1px dashed var(--border-hi);
          margin-bottom: 8px;
        }
        .summary-label { color: var(--text-secondary); font-size: 14px; }
        .summary-val { font-size: 20px; font-weight: 700; color: var(--accent-green); font-family: var(--font-display); }

        .pay-methods { display: flex; flex-direction: column; gap: 8px; }
        .pay-opt {
          display: flex; align-items: center; gap: 12px;
          background: var(--bg3); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 12px 14px;
          cursor: pointer; transition: all 0.2s;
        }
        .pay-opt:hover { border-color: var(--border-hi); }
        .pay-opt.selected { border-color: var(--accent-green); background: var(--bg2); }
        .hidden { display: none; }
        .pay-radio {
          width: 16px; height: 16px; border-radius: 50%;
          border: 1px solid var(--text-muted);
          position: relative;
        }
        .pay-opt.selected .pay-radio { border-color: var(--accent-green); }
        .pay-opt.selected .pay-radio::after {
          content: ""; position: absolute; inset: 3px;
          background: var(--accent-green); border-radius: 50%;
        }
        .pay-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .pay-desc { font-size: 12px; color: var(--text-muted); }

        /* QR Code Placeholder */
        .qr-container {
          background: #fff;
          border-radius: var(--radius-sm);
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 8px;
        }
        .qr-guide { color: #000; font-size: 14px; margin-bottom: 16px; }
        .qr-box {
          width: 140px; height: 140px;
          background: #f0f0f0;
          display: flex; align-items: center; justify-content: center;
          position: relative; border-radius: 8px; overflow: hidden; margin-bottom: 12px;
        }
        .qr-pattern {
          width: 100%; height: 100%;
          background-image: repeating-linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), repeating-linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
          background-position: 0 0, 10px 10px;
          background-size: 20px 20px;
          opacity: 0.5;
        }
        .qr-upi-id { color: #555; font-family: monospace; font-size: 12px; }

        /* Actions */
        .form-actions {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 12px; margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--border);
        }
        .btn-cancel {
          background: transparent; border: none; color: var(--text-secondary);
          font-family: var(--font-ui); font-size: 13px; font-weight: 600;
          cursor: pointer; padding: 10px 16px; border-radius: var(--radius-sm);
          transition: all 0.15s;
        }
        .btn-cancel:hover:not(:disabled) { background: var(--bg3); color: var(--text-primary); }
        .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Success Step */
        .success-view { text-align: center; padding: 16px 0; }
        .success-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--accent-green-dim); color: var(--accent-green);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; margin: 0 auto 16px;
        }
        .success-title { font-family: var(--font-display); font-size: 20px; color: var(--text-primary); margin-bottom: 8px; }
        .success-sub { font-size: 14px; color: var(--text-muted); line-height: 1.6; margin-bottom: 24px; padding: 0 16px; }
        
        .success-actions { display: flex; flex-direction: column; gap: 10px; }
        .action-btn {
          width: 100%; border: none; border-radius: var(--radius-sm);
          padding: 12px; font-family: var(--font-ui); font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .action-btn.primary { background: var(--accent-green); color: #0d0d0f; }
        .action-btn.primary:hover { opacity: 0.9; }
        .action-btn.secondary { background: var(--bg3); color: var(--text-primary); }
        .action-btn.secondary:hover { background: var(--border-hi); }
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
