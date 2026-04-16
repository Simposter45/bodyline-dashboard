"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
import { useRouter } from "next/navigation";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface MemberProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  joined_date: string;
}

interface ActiveMembership {
  id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  payment_status: "paid" | "pending" | "overdue";
  amount_paid: number;
  plan_price: number;
}

interface CheckIn {
  id: string;
  check_in: string;
  check_out: string | null;
}

interface Trainer {
  id: string;
  full_name: string;
  specialization: string | null;
}

interface Booking {
  id: string;
  session_date: string;
  session_time: string;
  status: "pending" | "confirmed" | "cancelled";
  trainer: { full_name: string };
  notes: string | null;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function daysUntil(dateStr: string) {
  const diff =
    new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function MemberPage() {
  const router = useRouter();

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [membership, setMembership] = useState<ActiveMembership | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking form state
  const [showBooking, setShowBooking] = useState(false);
  const [bookTrainer, setBookTrainer] = useState("");
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("07:00");
  const [bookNotes, setBookNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);

    // 1. Get current auth user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const params = new URLSearchParams(window.location.search);
    const guestMemberId = !user ? (params.get("guest") ?? null) : null;

    if (!user && !guestMemberId) {
      router.push("/login");
      return;
    }

    /// 2. Find member record — auth user takes priority, guest fallback for onboarding
    const memberQuery = guestMemberId
      ? supabase
          .from("members")
          .select("id, full_name, email, phone, joined_date")
          .eq("id", guestMemberId)
          .single()
      : supabase
          .from("members")
          .select("id, full_name, email, phone, joined_date")
          .eq("email", user!.email)
          .single();

    const { data: memberData, error: memberErr } = await memberQuery;
    if (memberErr || !memberData) {
      setError("Member profile not found. Please contact the gym.");
      setLoading(false);
      return;
    }

    setMember(memberData);

    // 3. Active membership
    const today = new Date().toISOString().split("T")[0];
    const { data: memData } = await supabase
      .from("member_memberships")
      .select(
        "id, start_date, end_date, amount_paid, payment_status, plan:membership_plans(name, price)",
      )
      .eq("member_id", memberData.id)
      .gte("end_date", today)
      .order("end_date", { ascending: false })
      .limit(1)
      .single();

    if (memData) {
      const plan = memData.plan as { name: string; price: number };
      setMembership({
        id: memData.id,
        plan_name: plan.name,
        start_date: memData.start_date,
        end_date: memData.end_date,
        payment_status: memData.payment_status,
        amount_paid: memData.amount_paid ?? 0,
        plan_price: plan.price,
      });
    }

    // 4. Check-in history (last 10)
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("id, check_in, check_out")
      .eq("member_id", memberData.id)
      .order("check_in", { ascending: false })
      .limit(10);

    setCheckins(attendanceData ?? []);

    // 5. Trainers
    const { data: trainersData } = await supabase
      .from("trainers")
      .select("id, full_name, specialization")
      .eq("is_active", true);

    setTrainers(trainersData ?? []);
    if (trainersData && trainersData.length > 0) {
      setBookTrainer(trainersData[0].id);
    }

    // 6. Upcoming bookings
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select(
        "id, session_date, session_time, status, notes, trainer:trainers(full_name)",
      )
      .eq("member_id", memberData.id)
      .gte("session_date", today)
      .order("session_date", { ascending: true })
      .limit(5);

    setBookings((bookingsData ?? []) as Booking[]);

    setLoading(false);
  }

  async function handleBook() {
    if (!member || !bookTrainer || !bookDate || !bookTime) return;
    setBooking(true);

    const { error: bookErr } = await supabase.from("bookings").insert({
      member_id: member.id,
      trainer_id: bookTrainer,
      session_date: bookDate,
      session_time: bookTime,
      status: "pending",
      notes: bookNotes || null,
    });

    setBooking(false);

    if (bookErr) {
      alert("Failed to book: " + bookErr.message);
      return;
    }

    setBookSuccess(true);
    setShowBooking(false);
    setBookNotes("");

    // Refresh bookings
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, session_date, session_time, status, notes, trainer:trainers(full_name)",
      )
      .eq("member_id", member.id)
      .gte("session_date", today)
      .order("session_date", { ascending: true })
      .limit(5);
    setBookings((data ?? []) as Booking[]);

    setTimeout(() => setBookSuccess(false), 4000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Min date for booking = tomorrow
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  const daysLeft = membership ? daysUntil(membership.end_date) : null;
  const expiryUrgent = daysLeft !== null && daysLeft <= 7;

  const statusColor = {
    paid: "var(--accent-green)",
    pending: "var(--accent-amber)",
    overdue: "var(--accent-red)",
  };
  const statusBg = {
    paid: "var(--accent-green-dim)",
    pending: "var(--accent-amber-dim)",
    overdue: "var(--accent-red-dim)",
  };
  const bookingStatusColor = {
    pending: "var(--accent-amber)",
    confirmed: "var(--accent-green)",
    cancelled: "var(--accent-red)",
  };
  const bookingStatusBg = {
    pending: "var(--accent-amber-dim)",
    confirmed: "var(--accent-green-dim)",
    cancelled: "var(--accent-red-dim)",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:             #0d0d0f;
          --bg2:            #141417;
          --bg3:            #1c1c21;
          --border:         rgba(255,255,255,0.07);
          --border-hi:      rgba(255,255,255,0.13);
          --text-primary:   #f0efe8;
          --text-secondary: #8a8987;
          --text-muted:     #555450;
          --accent-green:   #4ade80;
          --accent-amber:   #fbbf24;
          --accent-red:     #f87171;
          --accent-blue:    #60a5fa;
          --accent-green-dim:  rgba(74,222,128,0.12);
          --accent-amber-dim:  rgba(251,191,36,0.12);
          --accent-red-dim:    rgba(248,113,113,0.12);
          --accent-blue-dim:   rgba(96,165,250,0.12);
          --font-display:   'Syne', sans-serif;
          --font-body:      'DM Sans', sans-serif;
          --radius:         14px;
          --radius-sm:      8px;
        }

        body {
          background: var(--bg);
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 15px;
          line-height: 1.6;
          min-height: 100vh;
        }

        ::-webkit-scrollbar {
          display: none;
        }

        /* ── Nav ── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 32px;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .nav-logo {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          text-decoration: none;
        }
        .nav-logo span { color: var(--accent-green); }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .nav-member-name {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .nav-member-name strong {
          color: var(--text-primary);
          font-weight: 500;
        }
        .btn-logout {
          font-size: 12px;
          color: var(--text-muted);
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 6px 14px;
          cursor: pointer;
          font-family: var(--font-body);
          transition: all 0.15s;
        }
        .btn-logout:hover {
          border-color: var(--border-hi);
          color: var(--text-secondary);
        }

        /* ── Page ── */
        .page {
          max-width: 62vw;
          width: 100%;
          margin: 0 auto;
          padding: 40px 32px 80px;
        }

        /* ── Welcome ── */
        .welcome {
          margin-bottom: 40px;
        }
        .welcome-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .welcome-name {
          font-family: var(--font-display);
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.05;
          color: var(--text-primary);
        }
        .welcome-name span { color: var(--accent-amber); }

        /* ── Section label ── */
        .section-label {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 14px;
          margin-top: 36px;
        }

        /* ── Membership card ── */
        .membership-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 28px 32px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: start;
          position: relative;
          overflow: hidden;
        }
        .membership-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--accent-green);
          border-radius: var(--radius) var(--radius) 0 0;
        }
        .membership-card.urgent::before {
          background: var(--accent-amber);
        }
        .membership-card.overdue-card::before {
          background: var(--accent-red);
        }
        .plan-name {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .plan-dates {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 300;
        }
        .plan-dates strong {
          color: var(--text-primary);
          font-weight: 500;
        }
        .plan-meta {
          display: flex;
          gap: 24px;
          margin-top: 20px;
        }
        .plan-meta-item {}
        .plan-meta-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .plan-meta-val {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }
        .expiry-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 99px;
          white-space: nowrap;
        }
        .expiry-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
        }
        .status-badge {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 99px;
          display: inline-block;
          margin-top: 8px;
        }
        .no-membership {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 32px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        .no-membership a {
          color: var(--accent-green);
          text-decoration: none;
          font-weight: 500;
        }

        /* ── Main grid ── */
        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          
        }
        @media (max-width: 700px) {
          .main-grid { grid-template-columns: 1fr; }
        }

        /* ── Panel ── */
        .panel {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border);
          min-height: 4.9rem;
        }
        .panel-title {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .panel-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 99px;
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .panel-empty {
          display: flex;
          gap: 0.5rem;
          padding: 28px 24px;
          color: var(--text-muted);
          font-size: 13px;
        }

        /* ── Check-in rows ── */
        .checkin-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 24px;
          border-bottom: 1px solid var(--border);
        }
        .checkin-row:last-child { border-bottom: none; }
        .checkin-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--border-hi);
          flex-shrink: 0;
        }
        .checkin-dot.today { background: var(--accent-green); }
        .checkin-info { flex: 1; }
        .checkin-date {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .checkin-time {
          font-size: 11px;
          color: var(--text-muted);
        }
        .checkin-duration {
          font-size: 12px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        /* ── Booking rows ── */
        .booking-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border);
        }
        .booking-row:last-child { border-bottom: none; }
        .booking-info { flex: 1; min-width: 0; }
        .booking-trainer {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .booking-when {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .booking-status {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 3px 10px;
          border-radius: 99px;
          flex-shrink: 0;
          text-transform: capitalize;
        }

        /* ── Book session button ── */
        .btn-book {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--accent-amber);
          color: #0d0d0f;
          border: none;
          border-radius: var(--radius-sm);
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: -0.01em;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn-book:hover { opacity: 0.88; }
        .btn-book-plus {
          font-size: 18px;
          line-height: 1;
          font-weight: 400;
        }

        /* ── Booking modal overlay ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal {
          background: var(--bg2);
          border: 1px solid var(--border-hi);
          border-radius: var(--radius);
          width: 100%;
          max-width: 440px;
          max-height: calc(100vh - 80px);
          overflow-y: auto;
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }
        .modal-title {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .modal-close {
          width: 32px; height: 32px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: none;
          color: var(--text-secondary);
          font-size: 18px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
          line-height: 1;
        }
        .modal-close:hover {
          background: var(--bg3);
          color: var(--text-primary);
        }
        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Trainer selector ── */
        .trainer-options {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .trainer-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
        }
        .trainer-option:hover { border-color: var(--border-hi); }
        .trainer-option.selected {
          border-color: var(--accent-amber);
          background: rgba(251,191,36,0.06);
        }
        .trainer-option-avatar {
          width: 34px; height: 34px;
          border-radius: var(--radius-sm);
          background: var(--bg2);
          border: 1px solid var(--border-hi);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 700;
          color: var(--accent-blue);
          flex-shrink: 0;
        }
        .trainer-option-info { flex: 1; }
        .trainer-option-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .trainer-option-spec {
          font-size: 11px;
          color: var(--text-muted);
        }
        .trainer-option-check {
          width: 18px; height: 18px;
          border-radius: 50%;
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px;
          transition: all 0.15s;
        }
        .trainer-option.selected .trainer-option-check {
          background: var(--accent-amber);
          border-color: var(--accent-amber);
          color: #0d0d0f;
        }

        /* ── Form fields ── */
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .field {}
        .field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 7px;
        }
        .field-input, .field-select {
          width: 100%;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
          -webkit-appearance: none;
        }
        .field-input::placeholder { color: var(--text-muted); }
        .field-input:focus, .field-select:focus {
          border-color: var(--accent-amber);
        }
        .field-select option {
          background: var(--bg3);
        }

        /* ── Time slots ── */
        .time-slots {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .time-slot {
          padding: 8px 4px;
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--text-secondary);
          background: var(--bg3);
          transition: all 0.15s;
        }
        .time-slot:hover { border-color: var(--border-hi); color: var(--text-primary); }
        .time-slot.selected {
          border-color: var(--accent-amber);
          background: rgba(251,191,36,0.08);
          color: var(--accent-amber);
          font-weight: 600;
        }

        /* ── Modal footer ── */
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .btn-cancel {
          padding: 10px 20px;
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-cancel:hover {
          border-color: var(--border-hi);
          color: var(--text-primary);
        }
        .btn-confirm {
          padding: 10px 24px;
          background: var(--accent-amber);
          border: none;
          border-radius: var(--radius-sm);
          color: #0d0d0f;
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-confirm:hover { opacity: 0.88; }
        .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #0d0d0f;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Success toast ── */
        .toast {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg2);
          border: 1px solid rgba(74,222,128,0.3);
          border-radius: 99px;
          padding: 12px 24px;
          font-size: 13px;
          font-weight: 500;
          color: var(--accent-green);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 100;
          animation: toastIn 0.3s ease;
          white-space: nowrap;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        @keyframes toastIn {
          from { transform: translateX(-50%) translateY(16px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        .toast-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--accent-green);
        }

        /* ── Loading / Error ── */
        .loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 1rem;
          color: var(--text-secondary);
          gap: 12px;
        }
        .loading-spinner {
          width: 20px; height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--accent-amber);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .error-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-red);
          font-family: var(--font-display);
          text-align: center;
          padding: 32px;
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          Bodyline<span>.</span>
        </a>
        <div className="nav-right">
          {member && (
            <span className="nav-member-name">
              <strong>{member.full_name.split(" ")[0]}</strong> · Member
            </span>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Loading ── */}
      {loading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading your profile…
        </div>
      )}

      {/* ── Error ── */}
      {error && <div className="error-screen">{error}</div>}

      {/* ── Main ── */}
      {!loading && !error && member && (
        <div className="page">
          {/* Welcome */}
          <div className="welcome">
            <p className="welcome-eyebrow">Member portal</p>
            <h1 className="welcome-name">
              Hey, <span>{member.full_name.split(" ")[0]}.</span>
            </h1>
          </div>

          {/* Membership card */}
          <p className="section-label">Your membership</p>
          {membership ? (
            <div
              className={`membership-card ${expiryUrgent ? "urgent" : ""} ${membership.payment_status === "overdue" ? "overdue-card" : ""}`}
            >
              <div>
                <div className="plan-name">{membership.plan_name}</div>
                <div className="plan-dates">
                  {formatDate(membership.start_date)} →{" "}
                  <strong>{formatDate(membership.end_date)}</strong>
                </div>
                <div className="plan-meta">
                  <div className="plan-meta-item">
                    <div className="plan-meta-label">Member since</div>
                    <div className="plan-meta-val">
                      {formatDate(member.joined_date)}
                    </div>
                  </div>
                  <div className="plan-meta-item">
                    <div className="plan-meta-label">Amount paid</div>
                    <div className="plan-meta-val">
                      ₹{membership.amount_paid.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="plan-meta-item">
                    <div className="plan-meta-label">Payment</div>
                    <div>
                      <span
                        className="status-badge"
                        style={{
                          background: statusBg[membership.payment_status],
                          color: statusColor[membership.payment_status],
                        }}
                      >
                        {membership.payment_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                {daysLeft !== null && (
                  <div
                    className="expiry-badge"
                    style={{
                      background: expiryUrgent
                        ? "var(--accent-amber-dim)"
                        : "var(--bg3)",
                      color: expiryUrgent
                        ? "var(--accent-amber)"
                        : "var(--text-secondary)",
                      border: `1px solid ${expiryUrgent ? "rgba(251,191,36,0.25)" : "var(--border)"}`,
                    }}
                  >
                    <div
                      className="expiry-dot"
                      style={{
                        background: expiryUrgent
                          ? "var(--accent-amber)"
                          : "var(--text-muted)",
                      }}
                    />
                    {daysLeft === 0
                      ? "Expires today"
                      : daysLeft === 1
                        ? "1 day left"
                        : `${daysLeft} days left`}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="no-membership">
              No active membership. <a href="/onboarding">Join a plan →</a>
            </div>
          )}

          {/* Sessions + Check-ins */}
          <p className="section-label">Sessions & activity</p>
          <div className="main-grid">
            {/* Upcoming bookings */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Upcoming sessions</span>
                <button
                  className="btn-book"
                  onClick={() => setShowBooking(true)}
                >
                  <span className="btn-book-plus">+</span>
                  Book session
                </button>
              </div>
              {bookings.length === 0 ? (
                <div className="panel-empty">
                  No sessions booked yet.{" "}
                  <span
                    style={{ color: "var(--accent-amber)", cursor: "pointer" }}
                    onClick={() => setShowBooking(true)}
                  >
                    Book your first →
                  </span>
                </div>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} className="booking-row">
                    <div className="booking-info">
                      <div className="booking-trainer">
                        with {b.trainer.full_name}
                      </div>
                      <div className="booking-when">
                        {formatDate(b.session_date)} ·{" "}
                        {b.session_time.slice(0, 5)}
                        {b.notes && ` · ${b.notes}`}
                      </div>
                    </div>
                    <span
                      className="booking-status"
                      style={{
                        background: bookingStatusBg[b.status],
                        color: bookingStatusColor[b.status],
                      }}
                    >
                      {b.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Check-in history */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Check-in history</span>
                <span className="panel-badge">{checkins.length} visits</span>
              </div>
              {checkins.length === 0 ? (
                <div className="panel-empty">No check-ins recorded yet.</div>
              ) : (
                checkins.map((c) => {
                  const isToday =
                    new Date(c.check_in).toDateString() ===
                    new Date().toDateString();
                  let duration = "";
                  if (c.check_out) {
                    const mins = Math.round(
                      (new Date(c.check_out).getTime() -
                        new Date(c.check_in).getTime()) /
                        60000,
                    );
                    duration =
                      mins >= 60
                        ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                        : `${mins}m`;
                  }
                  return (
                    <div key={c.id} className="checkin-row">
                      <div
                        className={`checkin-dot ${isToday ? "today" : ""}`}
                      />
                      <div className="checkin-info">
                        <div className="checkin-date">
                          {isToday ? "Today" : formatDate(c.check_in)}
                        </div>
                        <div className="checkin-time">
                          In {formatTime(c.check_in)}
                          {c.check_out
                            ? ` · Out ${formatTime(c.check_out)}`
                            : " · Still in gym"}
                        </div>
                      </div>
                      {duration && (
                        <span className="checkin-duration">{duration}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Book Session Modal ── */}
      {showBooking && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBooking(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Book a session</span>
              <button
                className="modal-close"
                onClick={() => setShowBooking(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Trainer */}
              <div>
                <div className="field-label">Choose trainer</div>
                <div className="trainer-options">
                  {trainers.map((t) => (
                    <div
                      key={t.id}
                      className={`trainer-option ${bookTrainer === t.id ? "selected" : ""}`}
                      onClick={() => setBookTrainer(t.id)}
                    >
                      <div className="trainer-option-avatar">
                        {getInitials(t.full_name)}
                      </div>
                      <div className="trainer-option-info">
                        <div className="trainer-option-name">{t.full_name}</div>
                        <div className="trainer-option-spec">
                          {t.specialization ?? "General"}
                        </div>
                      </div>
                      <div className="trainer-option-check">
                        {bookTrainer === t.id && "✓"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="field">
                <label className="field-label">Session date</label>
                <input
                  type="date"
                  className="field-input"
                  value={bookDate}
                  min={minDate}
                  onChange={(e) => setBookDate(e.target.value)}
                />
              </div>

              {/* Time slots */}
              <div>
                <div className="field-label">Preferred time</div>
                <div className="time-slots">
                  {[
                    "06:00",
                    "07:00",
                    "08:00",
                    "09:00",
                    "17:00",
                    "18:00",
                    "19:00",
                    "20:00",
                  ].map((t) => (
                    <div
                      key={t}
                      className={`time-slot ${bookTime === t ? "selected" : ""}`}
                      onClick={() => setBookTime(t)}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="field">
                <label className="field-label">Notes (optional)</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Focus on upper body"
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowBooking(false)}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={handleBook}
                disabled={booking || !bookDate || !bookTrainer}
              >
                {booking && <div className="btn-spinner" />}
                {booking ? "Booking…" : "Confirm booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success toast ── */}
      {bookSuccess && (
        <div className="toast">
          <div className="toast-dot" />
          Session booked! Your trainer will confirm shortly.
        </div>
      )}
    </>
  );
}
