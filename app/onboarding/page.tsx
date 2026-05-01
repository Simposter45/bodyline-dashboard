"use client";

import "./onboarding.css";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGymSettings } from "@/hooks/useGymSettings";
import { usePlans } from "@/hooks/usePlans";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/utils/format";
import { addDays, todayISO } from "@/lib/utils/date";

const supabase = createClient();

// --- Types --------------------------------------------------------------------

type PaymentMethod = "cash" | "upi" | "card";

interface FormData {
  full_name: string;
  phone: string;
  email: string;
  branch: string;
  date_of_birth: string;
  plan_id: string;
  payment_method: PaymentMethod | "";
  photo_url: string;
  id_proof_url: string;
}

// --- Helpers ------------------------------------------------------------------

function durationLabel(days: number) {
  if (days <= 31) return "1 Month";
  if (days <= 92) return "3 Months";
  if (days <= 185) return "6 Months";
  if (days <= 366) return "1 Year";
  return "Per Session";
}

// --- Step indicator -----------------------------------------------------------

function StepBar({ step }: { step: number }) {
  const steps = ["Your Details", "Choose Plan", "Payment", "Confirm"];
  return (
    <div className="stepbar">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <div key={label} className="step-item">
            <div
              className={`step-circle ${done ? "done" : active ? "active" : ""}`}
            >
              {done ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span>{idx}</span>
              )}
            </div>
            <div
              className={`step-label ${active ? "active" : done ? "done" : ""}`}
            >
              {label}
            </div>
            {i < steps.length - 1 && (
              <div className={`step-line ${done ? "done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Main Page ----------------------------------------------------------------

function OnboardingContent() {
  const searchParams = useSearchParams();
  const [gymSlug, setGymSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    const paramSlug = searchParams.get("gym");
    if (paramSlug) {
      setGymSlug(paramSlug);
    } else if (typeof window !== "undefined") {
      const parts = window.location.hostname.split(".");
      if (parts.length > 1 && parts[0] !== "www" && parts[0] !== "localhost") {
        setGymSlug(parts[0]);
      } else {
        setGymSlug(undefined);
      }
    }
  }, [searchParams]);

  const { data: settings } = useGymSettings(gymSlug ? { gymSlug } : undefined);

  const [step, setStep] = useState(1);
  // Plans are scoped to this gym_id; null = settings still loading (query held)
  const { data: plans = [] } = usePlans(settings?.gym_id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrPaid, setQrPaid] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<FormData>({
    full_name: "",
    phone: "",
    email: "",
    branch: "",
    date_of_birth: "",
    plan_id: "",
    payment_method: "",
    photo_url: "",
    id_proof_url: "",
  });

  // Countdown on success
  useEffect(() => {
    if (step !== 5) return;
    if (countdown <= 0) {
      window.location.href = `/member?guest=${memberId}`;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  const selectedPlan = plans.find((p) => p.id === form.plan_id);

  function set(key: keyof FormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // -- Validation --
  function step1Valid() {
    return (
      form.full_name.trim().length >= 2 &&
      /^[6-9]\d{9}$/.test(form.phone) &&
      form.date_of_birth !== "" &&
      form.branch !== "" &&
      photoFile !== null &&
      idFile !== null
    );
  }

  function step2Valid() {
    return form.plan_id !== "";
  }

  function step3Valid() {
    return form.payment_method !== "";
  }

  // -- Upload files to Supabase Storage --
  async function uploadFiles(memberId: string) {
    const ext = (f: File) => f.name.split(".").pop();
    const [photoRes, idRes] = await Promise.all([
      photoFile
        ? supabase.storage
            .from("member-docs")
            .upload(`photos/${memberId}.${ext(photoFile)}`, photoFile, {
              upsert: true,
            })
        : Promise.resolve({ data: null, error: null }),
      idFile
        ? supabase.storage
            .from("member-docs")
            .upload(`id-proofs/${memberId}.${ext(idFile)}`, idFile, {
              upsert: true,
            })
        : Promise.resolve({ data: null, error: null }),
    ]);
    const base =
      process.env.NEXT_PUBLIC_SUPABASE_URL +
      "/storage/v1/object/public/member-docs/";
    return {
      photo_url: photoRes.data ? base + photoRes.data.path : null,
      id_proof_url: idRes.data ? base + idRes.data.path : null,
    };
  }

  // -- Submit to Supabase --
  async function handleSubmit() {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      const today = todayISO();
      const endDate = addDays(selectedPlan.duration_days);

      // Insert member
      const { data: memberData, error: memberErr } = await supabase
        .from("members")
        .insert({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          branch: form.branch,
          date_of_birth: form.date_of_birth || null,
          joined_date: today,
          is_active: true,
          gym_id: settings?.gym_id,
        })
        .select("id")
        .single();

      if (memberErr) throw memberErr;

      // Upload documents
      setUploading(true);
      const { photo_url, id_proof_url } = await uploadFiles(memberData.id);
      if (photo_url || id_proof_url) {
        await supabase
          .from("members")
          .update({ profile_photo_url: photo_url, id_proof_url })
          .eq("id", memberData.id);
      }
      setUploading(false);

      // Insert membership
      const { error: mmErr } = await supabase
        .from("member_memberships")
        .insert({
          member_id: memberData.id,
          plan_id: form.plan_id,
          start_date: today,
          end_date: endDate,
          amount_paid: form.payment_method === "upi" ? selectedPlan.price : 0,
          payment_status: form.payment_method === "upi" ? "paid" : "pending",
          payment_method: form.payment_method,
          gym_id: settings?.gym_id,
        });

      if (mmErr) throw mmErr;

      setMemberId(memberData.id);
      // Store for session-less member portal access
      // localStorage.setItem("gym_guest_member_id", memberData.id);
      setStep(5);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const accentColor = settings?.primary_color || "#4ade80";
  // Convert hex to rgba for --gd (10% opacity)
  const hexToRgb = (h: string) => {
    let r = 0, g = 0, b = 0;
    if (h.length === 4) {
      r = parseInt(h[1] + h[1], 16);
      g = parseInt(h[2] + h[2], 16);
      b = parseInt(h[3] + h[3], 16);
    } else if (h.length === 7) {
      r = parseInt(h[1] + h[2], 16);
      g = parseInt(h[3] + h[4], 16);
      b = parseInt(h[5] + h[6], 16);
    }
    return `${r},${g},${b}`;
  };
  const accentColorDim = `rgba(${hexToRgb(accentColor)}, 0.1)`;

  return (
    <div style={{"--green": accentColor, "--gd": accentColorDim} as React.CSSProperties}>



      {/* -- UPI QR Modal -- */}
      {showQR && (
        <div
          className="qr-backdrop"
          onClick={() => !qrPaid && setShowQR(false)}
        >
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            {!qrPaid ? (
              <>
                <div className="qr-title">Scan & Pay</div>
                <div className="qr-sub">
                  Use any UPI app to complete payment
                </div>
                {selectedPlan && (
                  <div className="qr-amount">
                    {formatINR(selectedPlan.price)}
                  </div>
                )}
                <div className="qr-box">
                  {/* Realistic-looking fake QR grid */}
                  <div className="qr-inner">
                    {(() => {
                      // 7x7 grid with QR-like pattern (corner squares + random fill)
                      const pattern = [
                        1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1,
                        0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0,
                        1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
                      ];
                      return pattern.map((v, i) => (
                        <div
                          key={i}
                          className="qr-cell"
                          style={{ opacity: v ? 1 : 0 }}
                        />
                      ));
                    })()}
                  </div>
                </div>
                <div className="qr-upi-id">{settings?.upi_id || "gym@upi"}</div>
                <button className="qr-paid-btn" onClick={() => setQrPaid(true)}>
                  I've Paid âœ“
                </button>
                <button className="qr-cancel" onClick={() => setShowQR(false)}>
                  Cancel - pay later
                </button>
              </>
            ) : (
              <div className="qr-paid-state">
                <div className="qr-paid-icon">âœ“</div>
                <div className="qr-title">Payment Received</div>
                <div className="qr-sub" style={{ marginBottom: 24 }}>
                  {selectedPlan && formatINR(selectedPlan.price)} via UPI. Your
                  membership is active.
                </div>
                <button
                  className="qr-paid-btn"
                  onClick={() => {
                    setShowQR(false);
                  }}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- Success Screen -- */}
      {step === 5 ? (
        <div className="success-page">
          <div className="success-card">
            <div className="success-icon">ðŸŽ‰</div>
            <div className="success-label">Welcome to {settings?.gym_display_name || "our Gym"}</div>
            <h1 className="success-h1">
              You're In,
              <br />
              {form.full_name.split(" ")[0]}.
            </h1>
            <p className="success-sub">
              Your membership is confirmed. Head to any {settings?.gym_display_name || "Gym"} branch and tell
              them your name - you're good to go.
            </p>
            <div className="success-details">
              <div className="sd-row">
                <span className="sd-key">Plan</span>
                <span className="sd-val">{selectedPlan?.name}</span>
              </div>
              <div className="sd-row">
                <span className="sd-key">Valid Until</span>
                <span className="sd-val">
                  {selectedPlan ? addDays(selectedPlan.duration_days) : "-"}
                </span>
              </div>
              <div className="sd-row">
                <span className="sd-key">Payment</span>
                <span
                  className="sd-val"
                  style={{ textTransform: "capitalize" }}
                >
                  {form.payment_method === "upi" && qrPaid
                    ? "Paid via UPI âœ“"
                    : form.payment_method === "cash"
                      ? "Cash (pay at counter)"
                      : form.payment_method}
                </span>
              </div>
              <div className="sd-row">
                <span className="sd-key">Phone</span>
                <span className="sd-val">{form.phone}</span>
              </div>
              <div className="sd-row">
                <span className="sd-key">Branch</span>
                <span className="sd-val">{form.branch}</span>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" />
            </div>
            <p className="success-redirect">
              Redirecting to your portal in <span>{countdown}s</span>...
            </p>
            <a href={`/member?guest=${memberId}`} className="btn-portal">
              Go to Member Portal
            </a>
          </div>
        </div>
      ) : (
        /* -- Main Onboarding Layout -- */
        <div className="ob-page">
          {/* LEFT SIDE PANEL */}
          <div className="side">
            <a href="/" className="side-logo">
              {settings?.gym_display_name ? settings.gym_display_name.split(' ')[0] : 'Gym'}<span>.</span>
            </a>
            <div className="side-center">
              <div className="side-tag">
                <div className="side-tag-line" />
                New Member
              </div>
              <h2 className="side-headline">
                Start Your
                <br />
                <em>Journey.</em>
              </h2>
              <p className="side-body">
                Join {settings?.city ? `${settings.city}'s` : "our"} performance gym. Takes 2 minutes. Walk in
                tomorrow.
              </p>
              <div className="side-features">
                {[
                  `Access all ${settings?.branches?.length || 1} ${settings?.city || ''} branches`,
                  "Expert trainers from day one",
                  "Digital check-in & session tracking",
                  "Flexible plans - monthly to annual",
                ].map((f) => (
                  <div key={f} className="side-feat">
                    <div className="feat-dot" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="side-bottom">
              (c) {new Date().getFullYear()} {settings?.gym_display_name || "Gym"} {settings?.city ? `. ${settings.city}` : ""}
            </div>
            <div className="side-bg-num">{step}</div>
          </div>

          {/* RIGHT FORM PANEL */}
          <div className="form-panel">
            <div className="form-top">
              <a href="/" className="back-link">
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 12H5M12 19l-7-7 7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to site
              </a>
              <div className="step-count">Step {step} of 4</div>
            </div>

            <StepBar step={step} />

            <div className="form-body">
              {/* --- STEP 1: Personal Info --- */}
              {step === 1 && (
                <>
                  <h2 className="form-heading">Tell us about yourself</h2>
                  <p className="form-sub">
                    We need a few details to set up your membership.
                  </p>

                  <div className="field" style={{ animationDelay: "0.1s" }}>
                    <label className="label">Full Name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Rahul Sharma"
                      value={form.full_name}
                      onChange={(e) => set("full_name", e.target.value)}
                    />
                  </div>

                  <div className="field-row">
                    <div className="field" style={{ animationDelay: "0.15s" }}>
                      <label className="label">Phone Number *</label>
                      <input
                        className="input"
                        placeholder="98765 43210"
                        value={form.phone}
                        onChange={(e) =>
                          set(
                            "phone",
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        inputMode="numeric"
                      />
                      <div className="input-hint">10-digit mobile number</div>
                    </div>
                    <div className="field" style={{ animationDelay: "0.18s" }}>
                      <label className="label">Date of Birth *</label>
                      <input
                        className="input"
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) => set("date_of_birth", e.target.value)}
                        max={todayISO()}
                      />
                    </div>
                  </div>

                  <div className="field" style={{ animationDelay: "0.2s" }}>
                    <label className="label">
                      Email{" "}
                      <span style={{ color: "var(--dim)" }}>(optional)</span>
                    </label>
                    <input
                      className="input"
                      type="email"
                      placeholder="rahul@gmail.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </div>
                  <div
                    className="field-row"
                    style={{ animationDelay: "0.22s" }}
                  >
                    <div className="upload-field">
                      <label className="label">Passport Photo *</label>
                      <div
                        className={`upload-zone ${photoFile ? "has-file" : ""}`}
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setPhotoFile(f);
                            if (f) setPhotoPreview(URL.createObjectURL(f));
                          }}
                        />
                        <div className="upload-icon">
                          {photoPreview ? (
                            <img
                              src={photoPreview}
                              className="upload-preview"
                              alt="preview"
                            />
                          ) : (
                            "ðŸ“·"
                          )}
                        </div>
                        <div className="upload-info">
                          <div className="upload-name">
                            {photoFile ? photoFile.name : "Upload photo"}
                          </div>
                          <div className="upload-hint">JPG, PNG, WEBP</div>
                        </div>
                        {photoFile && (
                          <div className="upload-check">
                            <svg
                              width="10"
                              height="10"
                              fill="none"
                              stroke="#000"
                              strokeWidth="3"
                              viewBox="0 0 24 24"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="upload-field">
                      <label className="label">Aadhaar Card / Id Proof *</label>
                      <div
                        className={`upload-zone ${idFile ? "has-file" : ""}`}
                      >
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) =>
                            setIdFile(e.target.files?.[0] ?? null)
                          }
                        />
                        <div className="upload-icon">ðŸ“„</div>
                        <div className="upload-info">
                          <div className="upload-name">
                            {idFile ? idFile.name : "Upload Aadhaar"}
                          </div>
                          <div className="upload-hint">PDF only</div>
                        </div>
                        {idFile && (
                          <div className="upload-check">
                            <svg
                              width="10"
                              height="10"
                              fill="none"
                              stroke="#000"
                              strokeWidth="3"
                              viewBox="0 0 24 24"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="field" style={{ animationDelay: "0.22s" }}>
                    <label className="label">Your Branch *</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {(settings?.branches ?? []).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => set("branch", b)}
                          style={{
                            padding: "10px 18px",
                            borderRadius: "var(--rsm)",
                            border: `1px solid ${form.branch === b ? "var(--green)" : "var(--bdr)"}`,
                            background:
                              form.branch === b ? "var(--gd)" : "var(--bg2)",
                            color:
                              form.branch === b
                                ? "var(--green)"
                                : "var(--muted)",
                            fontSize: 14,
                            fontFamily: "var(--fb)",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* --- STEP 2: Choose Plan --- */}
              {step === 2 && (
                <>
                  <h2 className="form-heading">Pick your plan</h2>
                  <p className="form-sub">
                    {settings?.branches?.length
                      ? `Access to all ${settings.branches.length} branch${settings.branches.length > 1 ? 'es' : ''}. No hidden fees.`
                      : 'Choose a plan below. No hidden fees.'}
                  </p>
                  <div className="plans-grid">
                    {plans.map((plan, i) => {
                      const isPopular =
                        plan.duration_days > 92 && plan.duration_days <= 185;
                      const selected = form.plan_id === plan.id;
                      return (
                        <div
                          key={plan.id}
                          className={`plan-card${selected ? " selected" : ""}${isPopular ? " popular" : ""}`}
                          onClick={() => set("plan_id", plan.id)}
                          style={{ animationDelay: `${0.05 * i}s` }}
                        >
                          <div className="plan-check">
                            <svg
                              width="10"
                              height="10"
                              fill="none"
                              stroke="#000"
                              strokeWidth="3"
                              viewBox="0 0 24 24"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <div className="plan-dur">
                            {durationLabel(plan.duration_days)}
                          </div>
                          <div className="plan-name">{plan.name}</div>
                          <div className="plan-price">
                            {formatINR(plan.price)}
                            <span>
                              {" "}
                              /{" "}
                              {durationLabel(plan.duration_days).toLowerCase()}
                            </span>
                          </div>
                          {plan.description && (
                            <div className="plan-desc">{plan.description}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* --- STEP 3: Payment --- */}
              {step === 3 && (
                <>
                  <h2 className="form-heading">How would you like to pay?</h2>
                  <p className="form-sub">
                    {selectedPlan
                      ? `${selectedPlan.name} . ${formatINR(selectedPlan.price)}`
                      : "Select a payment method."}
                  </p>
                  <div className="pay-methods">
                    {[
                      {
                        id: "upi" as PaymentMethod,
                        icon: "ðŸ“±",
                        name: "UPI",
                        desc: "PhonePe, GPay, Paytm - scan & pay instantly",
                      },
                      {
                        id: "cash" as PaymentMethod,
                        icon: "ðŸ’µ",
                        name: "Cash",
                        desc: "Pay at the counter when you arrive",
                      },
                      {
                        id: "card" as PaymentMethod,
                        icon: "ðŸ’³",
                        name: "Card",
                        desc: "Debit or credit card at the front desk",
                      },
                    ].map((m, i) => (
                      <div
                        key={m.id}
                        className={`pay-opt${form.payment_method === m.id ? " selected" : ""}`}
                        onClick={() => {
                          set("payment_method", m.id);
                          if (m.id === "upi") setShowQR(true);
                        }}
                        style={{ animationDelay: `${0.07 * i}s` }}
                      >
                        <div className="pay-icon">{m.icon}</div>
                        <div className="pay-info">
                          <div className="pay-name">{m.name}</div>
                          <div className="pay-desc">{m.desc}</div>
                        </div>
                        <div className="pay-radio" />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* --- STEP 4: Confirm --- */}
              {step === 4 && (
                <>
                  <h2 className="form-heading">Confirm your details</h2>
                  <p className="form-sub">
                    Double-check everything before we lock in your membership.
                  </p>
                  <div className="summary-card">
                    <div className="sum-header">Your Information</div>
                    <div className="sum-row">
                      <span className="sum-key">Name</span>
                      <span className="sum-val">{form.full_name}</span>
                    </div>
                    <div className="sum-row">
                      <span className="sum-key">Phone</span>
                      <span className="sum-val">{form.phone}</span>
                    </div>
                    {form.email && (
                      <div className="sum-row">
                        <span className="sum-key">Email</span>
                        <span className="sum-val">{form.email}</span>
                      </div>
                    )}
                    <div className="sum-row">
                      <span className="sum-key">Date of Birth</span>
                      <span className="sum-val">{form.date_of_birth}</span>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="sum-header">Membership</div>
                    <div className="sum-row">
                      <span className="sum-key">Plan</span>
                      <span className="sum-val">{selectedPlan?.name}</span>
                    </div>
                    <div className="sum-row">
                      <span className="sum-key">Duration</span>
                      <span className="sum-val">
                        {selectedPlan
                          ? durationLabel(selectedPlan.duration_days)
                          : "-"}
                      </span>
                    </div>
                    <div className="sum-row">
                      <span className="sum-key">Start Date</span>
                      <span className="sum-val">
                        {new Date().toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <div className="sum-row">
                      <span className="sum-key">Expires</span>
                      <span className="sum-val">
                        {selectedPlan
                          ? addDays(selectedPlan.duration_days)
                          : "-"}
                      </span>
                    </div>
                    <div className="sum-row">
                      <span className="sum-key">Payment</span>
                      <div>
                        <span
                          className={`payment-badge ${form.payment_method}`}
                        >
                          {form.payment_method === "upi" && qrPaid
                            ? "âœ“ Paid via UPI"
                            : form.payment_method === "cash"
                              ? "Cash at counter"
                              : "Card at counter"}
                        </span>
                      </div>
                    </div>
                    <div className="sum-total">
                      <span className="sum-total-key">Total</span>
                      <span className="sum-total-val">
                        {selectedPlan ? formatINR(selectedPlan.price) : "-"}
                      </span>
                    </div>
                  </div>
                  {error && <div className="err-box">{error}</div>}
                </>
              )}

              {/* --- NAV BUTTONS --- */}
              <div className="btn-row">
                {step > 1 && (
                  <button
                    className="btn-back"
                    onClick={() => setStep((s) => s - 1)}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M19 12H5M12 19l-7-7 7-7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Back
                  </button>
                )}
                {step < 4 ? (
                  <button
                    className="btn-next"
                    disabled={
                      step === 1
                        ? !step1Valid()
                        : step === 2
                          ? !step2Valid()
                          : !step3Valid()
                    }
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Continue
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ) : (
                  <button
                    className={`btn-next${loading ? " loading" : ""}`}
                    disabled={loading}
                    onClick={handleSubmit}
                  >
                    {loading ? (
                      <>
                        <div className="ob-spinner" />{" "}
                        {uploading ? "Uploading docs..." : "Saving..."}
                      </>
                    ) : (
                      <>Confirm & Join {settings?.gym_display_name ? settings.gym_display_name.split(' ')[0] : 'Gym'}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="loading-screen"><div className="loading-spinner"/></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
