"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import { Modal } from "@/components/ui/Modal";
import { useRecordPayment } from "@/hooks/useRecordPayment";
import { useGymSettings } from "@/hooks/useGymSettings";
import { createPaymentSchema, type RecordPaymentFormData } from "@/lib/validations/member";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  membershipId: string;
  remainingBalance: number;
  planPrice: number;
  currentAmountPaid: number;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  membershipId,
  remainingBalance,
  planPrice,
  currentAmountPaid,
}: RecordPaymentModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const { data: settings } = useGymSettings();
  const { mutateAsync: recordPayment, isPending } = useRecordPayment();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<RecordPaymentFormData>({
    resolver: zodResolver(createPaymentSchema(remainingBalance)),
    defaultValues: {
      amount_paid: remainingBalance,
      payment_method: undefined,
    },
  });

  const selectedPayment = watch("payment_method");
  const enteredAmount = watch("amount_paid") || 0;

  const handleClose = () => {
    reset();
    setStep(1);
    onClose();
  };

  const onSubmit = async (data: RecordPaymentFormData) => {
    try {
      await recordPayment({
        ...data,
        membership_id: membershipId,
        current_amount_paid: currentAmountPaid,
        plan_price: planPrice,
      });
      setStep(2);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to record payment";
      toast.error(msg);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={step === 1 ? "Record Payment" : "Success"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="multi-step-form">
        
        {/* STEP 1: PAYMENT */}
        {step === 1 && (
          <div className="step-content">
            <div className="summary-banner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span className="summary-label">Total Plan Price</span>
                <span className="summary-label">₹{planPrice}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span className="summary-label">Amount Paid So Far</span>
                <span className="summary-label" style={{ color: 'var(--accent-green)' }}>₹{currentAmountPaid}</span>
              </div>
              <div style={{ width: '100%', height: 1, background: 'var(--border-hi)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span className="summary-label" style={{ color: 'var(--text-primary)' }}>Remaining Balance Due</span>
                <span className="summary-val" style={{ color: 'var(--accent-red)' }}>₹{remainingBalance}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Amount Being Paid <span className="required">*</span></label>
              <input
                {...register("amount_paid")}
                type="number"
                className="form-input"
                placeholder={`e.g. ${remainingBalance}`}
                max={remainingBalance}
                min={1}
              />
              {errors.amount_paid && <span className="error-text">{errors.amount_paid.message}</span>}
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
                <p className="qr-guide">Scan to pay <strong>₹{enteredAmount}</strong></p>
                <div className="qr-box">
                  <div className="qr-pattern" />
                </div>
                <p className="qr-upi-id">{settings.upi_id}</p>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={handleClose} className="btn-cancel" disabled={isPending}>Cancel</button>
              <button type="submit" className="btn-solid" disabled={isPending}>
                {isPending ? "Processing..." : "Record Payment"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SUCCESS */}
        {step === 2 && (
          <div className="step-content success-view">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Payment Recorded!</h3>
            <p className="success-sub">
              The payment has been successfully recorded against the member's account.
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
        
        .form-input {
          width: 100%; background: var(--bg3); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 10px 14px; color: var(--text-primary);
          font-family: var(--font-body); font-size: 14px; outline: none; transition: border-color 0.15s;
        }
        .form-input:focus { border-color: var(--accent-green); }

        /* Payment */
        .summary-banner {
          background: var(--bg3); padding: 16px; border-radius: var(--radius-sm);
          border: 1px dashed var(--border-hi); margin-bottom: 8px;
        }
        .summary-label { color: var(--text-secondary); font-size: 14px; }
        .summary-val { font-size: 20px; font-weight: 700; font-family: var(--font-display); }

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
