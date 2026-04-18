"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGymSettings } from "@/hooks/useGymSettings";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string | null;
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function durationLabel(days: number) {
  if (days <= 31) return "1 Month";
  if (days <= 92) return "3 Months";
  if (days <= 185) return "6 Months";
  if (days <= 366) return "1 Year";
  return "Per Session";
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Step indicator ───────────────────────────────────────────────────────────

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

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const [plans, setPlans] = useState<Plan[]>([]);
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

  // Load plans
  useEffect(() => {
    supabase
      .from("membership_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true })
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

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

  // ── Validation ──
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

  // ── Upload files to Supabase Storage ──
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

  // ── Submit to Supabase ──
  async function handleSubmit() {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
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
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:     #0d0d0f;
          --bg2:    #141417;
          --bg3:    #1c1c21;
          --bdr:    rgba(255,255,255,0.07);
          --bdr2:   rgba(255,255,255,0.13);
          --tx:     #f0efe8;
          --muted:  #8a8987;
          --dim:    #3a3a3a;
          --green:  #4ade80;
          --gd:     rgba(74,222,128,0.1);
          --amber:  #fbbf24;
          --red:    #f87171;
          --fd:     var(--font-syne), sans-serif;
          --fb:     var(--font-dm-sans), sans-serif;
          --r:      14px;
          --rsm:    8px;
        }

        body {
          background: var(--bg); color: var(--tx);
          font-family: var(--fb); font-size: 15px; line-height: 1.6;
        }

        ::-webkit-scrollbar {
          display: none;
        }

        /* ─── LAYOUT ─── */
        .page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        @media(max-width: 900px) {
          .page { grid-template-columns: 1fr; }
          .side { display: none; }
        }

        /* ─── LEFT SIDE PANEL ─── */
        .side {
          position: sticky; top: 0; height: 100vh;
          background: var(--bg2);
          border-right: 1px solid var(--bdr);
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          overflow: hidden;
        }
        .side-logo {
          font-family: var(--fd); font-size: 26px; font-weight: 800;
          letter-spacing: -0.02em; color: var(--tx); text-decoration: none;
        }
        .side-logo span { color: var(--green); }
        .side-center {}
        .side-tag {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--green);
          margin-bottom: 20px;
        }
        .side-tag-line { width: 20px; height: 1px; background: var(--green); }
        .side-headline {
          font-family: var(--fd); font-size: 3rem; font-weight: 800;
          letter-spacing: -0.03em; line-height: 1.05;
          color: var(--tx); margin-bottom: 20px;
        }
        .side-headline em { color: var(--green); font-style: normal; display: block; }
        .side-body { font-size: 14px; font-weight: 300; color: var(--muted); line-height: 1.8; max-width: 320px; }
        .side-features { display: flex; flex-direction: column; gap: 16px; margin-top: 40px; }
        .side-feat {
          display: flex; align-items: center; gap: 12px;
          font-size: 13px; color: var(--muted);
        }
        .feat-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--green); flex-shrink: 0;
        }
        .side-bg-num {
          position: absolute; bottom: -20px; right: -10px;
          font-family: var(--fd); font-size: 200px; font-weight: 800;
          color: rgba(255,255,255,0.02); line-height: 1;
          pointer-events: none; user-select: none;
        }
        .side-bottom { font-size: 12px; color: var(--dim); }

        /* ─── RIGHT FORM PANEL ─── */
        .form-panel {
          display: flex; flex-direction: column;
          min-height: 100vh; padding: 48px;
          background: var(--bg);
        }
        @media(max-width:600px){ .form-panel { padding: 28px 20px; } }

        .form-top {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 48px;
        }
        .back-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--muted); text-decoration: none;
          transition: color 0.2s;
        }
        .back-link:hover { color: var(--tx); }
        .step-count { font-size: 13px; color: var(--dim); }

        /* ─── STEP BAR ─── */
        .stepbar {
          display: flex; align-items: center;
          gap: 0; margin-bottom: 48px; overflow: hidden;
        }
        .step-item {
          display: flex; align-items: center; gap: 10px; flex: 1;
        }
        .step-item:last-child { flex: 0; }
        .step-circle {
          width: 30px; height: 30px; border-radius: 50%;
          border: 1px solid var(--dim);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; color: var(--muted);
          flex-shrink: 0; transition: all 0.3s ease;
          background: var(--bg);
        }
        .step-circle.active {
          border-color: var(--green); color: var(--green);
          background: var(--gd); box-shadow: 0 0 0 4px rgba(74,222,128,0.08);
        }
        .step-circle.done {
          border-color: var(--green); background: var(--green); color: #000;
        }
        .step-label {
          font-size: 11px; font-weight: 500; letter-spacing: 0.04em;
          color: var(--dim); white-space: nowrap; transition: color 0.3s;
        }
        .step-label.active { color: var(--tx); }
        .step-label.done { color: var(--muted); }
        .step-line {
          flex: 1; height: 1px; background: var(--dim);
          margin: 0 8px; transition: background 0.3s;
        }
        .step-line.done { background: var(--green); }

        /* ─── FORM BODY ─── */
        .form-body { flex: 1; }
        .form-heading {
          font-family: var(--fd); font-size: 2rem; font-weight: 700;
          letter-spacing: -0.02em; margin-bottom: 6px;
          animation: stepIn 0.35s ease forwards;
        }
        .form-sub {
          font-size: 14px; font-weight: 300; color: var(--muted);
          margin-bottom: 36px;
          animation: stepIn 0.35s ease 0.05s both;
        }
        @keyframes stepIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* ─── INPUTS ─── */
        .field { margin-bottom: 20px; animation: stepIn 0.35s ease both; }
        .label {
          display: block; font-size: 12px; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--muted); margin-bottom: 8px;
        }
        .input {
          width: 100%; background: var(--bg2); border: 1px solid var(--bdr);
          border-radius: var(--rsm); padding: 13px 16px;
          color: var(--tx); font-family: var(--fb); font-size: 15px;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
        }
        .input:focus {
          border-color: rgba(74,222,128,0.4);
          box-shadow: 0 0 0 3px rgba(74,222,128,0.06);
        }
        .input::placeholder { color: var(--dim); }
        .input-hint { font-size: 12px; color: var(--dim); margin-top: 6px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media(max-width:500px){ .field-row { grid-template-columns: 1fr; } }

        /* ─── PLAN CARDS ─── */
        .plans-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px; margin-bottom: 32px;
          animation: stepIn 0.35s ease both;
        }
        .plan-card {
          background: var(--bg2); border: 1px solid var(--bdr);
          border-radius: var(--r); padding: 22px 20px;
          cursor: pointer; transition: all 0.2s; position: relative;
        }
        .plan-card:hover { border-color: var(--bdr2); background: var(--bg3); }
        .plan-card.selected {
          border-color: var(--green);
          background: var(--gd);
          box-shadow: 0 0 0 1px rgba(74,222,128,0.2);
        }
        .plan-card.popular::before {
          content: 'Popular';
          position: absolute; top: -1px; right: 14px;
          font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; background: var(--green); color: #000;
          padding: 3px 10px; border-radius: 0 0 6px 6px;
        }
        .plan-dur {
          font-size: 11px; font-weight: 500; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
        }
        .plan-name { font-family: var(--fd); font-size: 17px; font-weight: 700; margin-bottom: 12px; }
        .plan-price { font-family: var(--fd); font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
        .plan-price span { font-size: 14px; color: var(--muted); font-weight: 400; }
        .plan-desc { font-size: 12px; color: var(--muted); margin-top: 8px; line-height: 1.5; }
        .plan-check {
          position: absolute; top: 14px; right: 14px;
          width: 20px; height: 20px; border-radius: 50%;
          background: var(--green); display: none;
          align-items: center; justify-content: center;
        }
        .plan-card.selected .plan-check { display: flex; }

        /* ─── PAYMENT METHOD ─── */
        .pay-methods { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; animation: stepIn 0.35s ease both; }
        .pay-opt {
          display: flex; align-items: center; gap: 16px;
          background: var(--bg2); border: 1px solid var(--bdr);
          border-radius: var(--r); padding: 18px 20px;
          cursor: pointer; transition: all 0.2s;
        }
        .pay-opt:hover { border-color: var(--bdr2); }
        .pay-opt.selected { border-color: var(--green); background: var(--gd); }
        .pay-icon {
          width: 40px; height: 40px; border-radius: var(--rsm);
          background: var(--bg3); display: flex; align-items: center;
          justify-content: center; font-size: 20px; flex-shrink: 0;
        }
        .pay-info { flex: 1; }
        .pay-name { font-size: 15px; font-weight: 500; }
        .pay-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .pay-radio {
          width: 18px; height: 18px; border-radius: 50%;
          border: 1px solid var(--dim); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .pay-opt.selected .pay-radio {
          border-color: var(--green);
          background: var(--green);
        }
        .pay-opt.selected .pay-radio::after {
          content: ''; width: 6px; height: 6px;
          border-radius: 50%; background: #000;
        }

        /* ─── UPI QR MODAL ─── */
        .qr-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .qr-modal {
          background: var(--bg2); border: 1px solid var(--bdr);
          border-radius: 20px; padding: 40px 36px;
          max-width: 380px; width: 100%;
          text-align: center;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .qr-title { font-family: var(--fd); font-size: 1.4rem; font-weight: 700; margin-bottom: 6px; }
        .qr-sub { font-size: 13px; color: var(--muted); margin-bottom: 28px; }
        .qr-amount {
          font-family: var(--fd); font-size: 2.5rem; font-weight: 700;
          color: var(--green); margin-bottom: 24px; letter-spacing: -0.02em;
        }
        .qr-box {
          background: #fff; border-radius: 12px;
          padding: 20px; margin: 0 auto 20px;
          width: 200px; height: 200px;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }
        /* Fake QR pattern using CSS */
        .qr-pattern {
          width: 160px; height: 160px;
          background-image:
            repeating-linear-gradient(0deg, #000 0px, #000 8px, transparent 8px, transparent 16px),
            repeating-linear-gradient(90deg, #000 0px, #000 8px, transparent 8px, transparent 16px);
          background-size: 16px 16px;
          opacity: 0.15;
          position: absolute;
        }
        .qr-inner {
          position: relative; z-index: 1;
          display: grid; grid-template-columns: repeat(7,1fr);
          gap: 3px; width: 140px;
        }
        .qr-cell {
          width: 16px; height: 16px; border-radius: 2px;
          background: #000;
        }
        .qr-upi-id {
          font-size: 13px; color: var(--muted);
          margin-bottom: 24px; font-family: monospace;
        }
        .qr-paid-btn {
          width: 100%; padding: 14px;
          background: var(--green); color: #000;
          border: none; border-radius: var(--rsm);
          font-family: var(--fd); font-size: 15px; font-weight: 700;
          letter-spacing: 0.06em; cursor: pointer;
          transition: opacity 0.15s;
        }
        .qr-paid-btn:hover { opacity: 0.88; }
        .qr-cancel {
          display: block; margin-top: 14px;
          font-size: 13px; color: var(--muted); cursor: pointer;
          background: none; border: none; font-family: var(--fb);
          transition: color 0.2s;
        }
        .qr-cancel:hover { color: var(--tx); }

        /* QR paid state */
        .qr-paid-state { animation: stepIn 0.3s ease; }
        .qr-paid-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--gd); border: 1px solid rgba(74,222,128,0.3);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px; font-size: 28px;
        }

        /* ─── SUMMARY ─── */
        .summary-card {
          background: var(--bg2); border: 1px solid var(--bdr);
          border-radius: var(--r); overflow: hidden;
          margin-bottom: 28px;
          animation: stepIn 0.35s ease both;
        }
        .sum-header {
          padding: 18px 22px; border-bottom: 1px solid var(--bdr);
          font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--muted);
        }
        .sum-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 22px; border-bottom: 1px solid var(--bdr);
          font-size: 14px;
        }
        .sum-row:last-child { border-bottom: none; }
        .sum-key { color: var(--muted); }
        .sum-val { font-weight: 500; }
        .sum-total {
          display: flex; justify-content: space-between; align-items: center;
          padding: 18px 22px; background: var(--gd);
          border-top: 1px solid rgba(74,222,128,0.15);
        }
        .sum-total-key { font-size: 14px; font-weight: 600; color: var(--green); }
        .sum-total-val { font-family: var(--fd); font-size: 22px; font-weight: 700; color: var(--green); }
        .payment-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 500; padding: 4px 12px;
          border-radius: 99px; margin-top: 4px;
        }
        .payment-badge.upi { background: rgba(74,222,128,0.12); color: var(--green); }
        .payment-badge.cash { background: rgba(251,191,36,0.12); color: var(--amber); }
        .payment-badge.card { background: rgba(96,165,250,0.12); color: #60a5fa; }

        /* ─── BUTTONS ─── */
        .btn-row { display: flex; gap: 12px; margin-top: 32px; }
        .btn-back {
          flex: 0 0 auto; padding: 14px 22px;
          background: transparent; border: 1px solid var(--dim);
          border-radius: var(--rsm); color: var(--muted);
          font-family: var(--fb); font-size: 14px; font-weight: 500;
          cursor: pointer; transition: all 0.2s; display: flex;
          align-items: center; gap: 8px;
        }
        .btn-back:hover { border-color: var(--bdr2); color: var(--tx); }
        .btn-next {
          flex: 1; padding: 14px 28px;
          background: var(--green); border: none;
          border-radius: var(--rsm); color: #000;
          font-family: var(--fd); font-size: 16px; font-weight: 700;
          letter-spacing: 0.04em; cursor: pointer;
          transition: all 0.15s; display: flex;
          align-items: center; justify-content: center; gap: 10px;
        }
        .btn-next:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .btn-next:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .btn-next.loading { pointer-events: none; }

        /* Spinner */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(0,0,0,0.3);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        /* ─── UPLOAD FIELDS ─── */
        .upload-field { margin-bottom: 20px; animation: stepIn 0.35s ease both; }
        .upload-zone {
          width: 100%; background: var(--bg2); border: 1px dashed var(--bdr);
          border-radius: var(--rsm); padding: 20px;
          display: flex; align-items: center; gap: 16px;
          cursor: pointer; transition: all 0.2s; position: relative;
          overflow: hidden;
        }
        .upload-zone:hover { border-color: rgba(74,222,128,0.4); background: var(--bg3); }
        .upload-zone.has-file { border-color: rgba(74,222,128,0.4); background: var(--gd); }
        .upload-zone input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .upload-icon {
          width: 40px; height: 40px; border-radius: var(--rsm);
          background: var(--bg3); display: flex; align-items: center;
          justify-content: center; flex-shrink: 0; font-size: 18px;
        }
        .upload-info { flex: 1; }
        .upload-name { font-size: 14px; font-weight: 500; color: var(--tx); }
        .upload-hint { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .upload-preview {
          width: 40px; height: 40px; border-radius: var(--rsm);
          object-fit: cover; border: 1px solid var(--bdr2); flex-shrink: 0;
        }
        .upload-check {
          width: 20px; height: 20px; border-radius: 50%;
          background: var(--green); display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }

        /* ─── ERROR ─── */
        .err-box {
          background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2);
          border-radius: var(--rsm); padding: 14px 16px;
          font-size: 13px; color: var(--red); margin-top: 16px;
        }

        /* ─── SUCCESS ─── */
        .success-page {
          min-height: 100vh; display: flex; align-items: center;
          justify-content: center; background: var(--bg);
          padding: 40px 20px;
        }
        .success-card {
          background: var(--bg2); border: 1px solid var(--bdr);
          border-radius: 20px; padding: 56px 48px;
          max-width: 480px; width: 100%; text-align: center;
          animation: slideUp 0.5s ease;
        }
        .success-icon {
          width: 80px; height: 80px; border-radius: 50%;
          background: var(--gd); border: 1px solid rgba(74,222,128,0.25);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 28px; font-size: 36px;
          animation: popIn 0.5s ease 0.2s both;
        }
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .success-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--green); margin-bottom: 12px;
        }
        .success-h1 {
          font-family: var(--fd); font-size: 2.2rem; font-weight: 800;
          letter-spacing: -0.02em; margin-bottom: 12px;
        }
        .success-sub {
          font-size: 15px; font-weight: 300; color: var(--muted);
          line-height: 1.7; margin-bottom: 36px;
        }
        .success-details {
          background: var(--bg3); border-radius: var(--rsm);
          padding: 20px 24px; margin-bottom: 32px; text-align: left;
        }
        .sd-row {
          display: flex; justify-content: space-between;
          font-size: 13px; padding: 6px 0;
          border-bottom: 1px solid var(--bdr);
        }
        .sd-row:last-child { border-bottom: none; }
        .sd-key { color: var(--muted); }
        .sd-val { font-weight: 500; }
        .success-redirect {
          font-size: 13px; color: var(--muted); margin-bottom: 20px;
        }
        .success-redirect span { color: var(--green); font-weight: 600; }
        .progress-bar {
          height: 3px; background: var(--bg3); border-radius: 99px;
          overflow: hidden; margin-bottom: 20px;
        }
        .progress-fill {
          height: 100%; background: var(--green); border-radius: 99px;
          animation: progress 5s linear forwards;
        }
        @keyframes progress { from{width:0%} to{width:100%} }
        .btn-portal {
          display: block; width: 100%; padding: 14px;
          background: var(--green); color: #000; border: none;
          border-radius: var(--rsm); font-family: var(--fd); font-size: 16px;
          font-weight: 700; letter-spacing: 0.04em; cursor: pointer;
          text-decoration: none; text-align: center;
          transition: opacity 0.15s;
        }
        .btn-portal:hover { opacity: 0.88; }
      `}</style>

      {/* ── UPI QR Modal ── */}
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
                  I've Paid ✓
                </button>
                <button className="qr-cancel" onClick={() => setShowQR(false)}>
                  Cancel — pay later
                </button>
              </>
            ) : (
              <div className="qr-paid-state">
                <div className="qr-paid-icon">✓</div>
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
                  Continue →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Success Screen ── */}
      {step === 5 ? (
        <div className="success-page">
          <div className="success-card">
            <div className="success-icon">🎉</div>
            <div className="success-label">Welcome to {settings?.gym_display_name || "our Gym"}</div>
            <h1 className="success-h1">
              You're In,
              <br />
              {form.full_name.split(" ")[0]}.
            </h1>
            <p className="success-sub">
              Your membership is confirmed. Head to any {settings?.gym_display_name || "Gym"} branch and tell
              them your name — you're good to go.
            </p>
            <div className="success-details">
              <div className="sd-row">
                <span className="sd-key">Plan</span>
                <span className="sd-val">{selectedPlan?.name}</span>
              </div>
              <div className="sd-row">
                <span className="sd-key">Valid Until</span>
                <span className="sd-val">
                  {selectedPlan ? addDays(selectedPlan.duration_days) : "—"}
                </span>
              </div>
              <div className="sd-row">
                <span className="sd-key">Payment</span>
                <span
                  className="sd-val"
                  style={{ textTransform: "capitalize" }}
                >
                  {form.payment_method === "upi" && qrPaid
                    ? "Paid via UPI ✓"
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
              Redirecting to your portal in <span>{countdown}s</span>…
            </p>
            <a href={`/member?guest=${memberId}`} className="btn-portal">
              Go to Member Portal →
            </a>
          </div>
        </div>
      ) : (
        /* ── Main Onboarding Layout ── */
        <div className="page">
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
                  "Flexible plans — monthly to annual",
                ].map((f) => (
                  <div key={f} className="side-feat">
                    <div className="feat-dot" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="side-bottom">
              © {new Date().getFullYear()} {settings?.gym_display_name || "Gym"} {settings?.city ? `· ${settings.city}` : ""}
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
              {/* ─── STEP 1: Personal Info ─── */}
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
                        max={new Date().toISOString().split("T")[0]}
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
                            "📷"
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
                        <div className="upload-icon">📄</div>
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
                      {["Sector 14", "DLF Phase 1", "Sohna Road"].map((b) => (
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

              {/* ─── STEP 2: Choose Plan ─── */}
              {step === 2 && (
                <>
                  <h2 className="form-heading">Pick your plan</h2>
                  <p className="form-sub">
                    All plans include access to all 3 branches. No hidden fees.
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

              {/* ─── STEP 3: Payment ─── */}
              {step === 3 && (
                <>
                  <h2 className="form-heading">How would you like to pay?</h2>
                  <p className="form-sub">
                    {selectedPlan
                      ? `${selectedPlan.name} · ${formatINR(selectedPlan.price)}`
                      : "Select a payment method."}
                  </p>
                  <div className="pay-methods">
                    {[
                      {
                        id: "upi" as PaymentMethod,
                        icon: "📱",
                        name: "UPI",
                        desc: "PhonePe, GPay, Paytm — scan & pay instantly",
                      },
                      {
                        id: "cash" as PaymentMethod,
                        icon: "💵",
                        name: "Cash",
                        desc: "Pay at the counter when you arrive",
                      },
                      {
                        id: "card" as PaymentMethod,
                        icon: "💳",
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

              {/* ─── STEP 4: Confirm ─── */}
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
                          : "—"}
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
                          : "—"}
                      </span>
                    </div>
                    <div className="sum-row">
                      <span className="sum-key">Payment</span>
                      <div>
                        <span
                          className={`payment-badge ${form.payment_method}`}
                        >
                          {form.payment_method === "upi" && qrPaid
                            ? "✓ Paid via UPI"
                            : form.payment_method === "cash"
                              ? "Cash at counter"
                              : "Card at counter"}
                        </span>
                      </div>
                    </div>
                    <div className="sum-total">
                      <span className="sum-total-key">Total</span>
                      <span className="sum-total-val">
                        {selectedPlan ? formatINR(selectedPlan.price) : "—"}
                      </span>
                    </div>
                  </div>
                  {error && <div className="err-box">{error}</div>}
                </>
              )}

              {/* ─── NAV BUTTONS ─── */}
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
                        <div className="spinner" />{" "}
                        {uploading ? "Uploading docs…" : "Saving…"}
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
