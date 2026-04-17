"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface TrainerProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  specialization: string | null;
  is_active: boolean;
}

interface AssignedMember {
  id: string;
  member_id: string;
  assigned_date: string;
  is_current: boolean;
  member: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    profile_photo_url: string;
    is_active: boolean;
    joined_date: string;
  };
}

interface Booking {
  id: string;
  member_id: string;
  trainer_id: string;
  session_date: string;
  session_time: string;
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  created_at: string;
  member: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    profile_photo_url: string;
  };
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function TrainerPage() {
  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"schedule" | "members">(
    "schedule",
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [greeting, setGreeting] = useState("Good morning");

  const today = todayISO();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17) setGreeting("Good evening");
  }, []);

  useEffect(() => {
    async function load() {
      try {
        // Get current user — getUser() validates the JWT server-side (safe)
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email;
        if (!userEmail) {
          setError("Not signed in. Please log in.");
          return;
        }

        // Fetch trainer profile by email
        const { data: trainerData, error: trainerErr } = await supabase
          .from("trainers")
          .select("*")
          .eq("email", userEmail)
          .single();

        if (trainerErr || !trainerData) {
          setError("Trainer profile not found.");
          return;
        }

        setTrainer(trainerData);

        // Fetch assigned members and bookings in parallel
        const [assignmentsRes, bookingsRes] = await Promise.all([
          supabase
            .from("trainer_assignments")
            .select("*, member:members(*)")
            .eq("trainer_id", trainerData.id)
            .eq("is_current", true)
            .order("assigned_date", { ascending: false }),
          supabase
            .from("bookings")
            .select("*, member:members(*)")
            .eq("trainer_id", trainerData.id)
            .neq("status", "cancelled")
            .gte("session_date", today)
            .order("session_date", { ascending: true })
            .order("session_time", { ascending: true }),
        ]);

        setAssignedMembers((assignmentsRes.data as AssignedMember[]) ?? []);
        setBookings((bookingsRes.data as Booking[]) ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [today]);

  async function updateBookingStatus(
    bookingId: string,
    newStatus: "confirmed" | "cancelled",
  ) {
    setUpdatingId(bookingId);
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (updateErr) {
      showToast("Failed to update booking.", "error");
    } else {
      setBookings((prev) =>
        newStatus === "cancelled"
          ? prev.filter((b) => b.id !== bookingId)
          : prev.map((b) =>
              b.id === bookingId ? { ...b, status: newStatus } : b,
            ),
      );
      showToast(
        newStatus === "confirmed" ? "Session confirmed!" : "Session cancelled.",
        newStatus === "confirmed" ? "success" : "error",
      );
    }
    setUpdatingId(null);
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const todayBookings = bookings.filter((b) => b.session_date === today);
  const upcomingBookings = bookings.filter((b) => b.session_date > today);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <>
        <style>{baseStyles}</style>
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading your portal...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{baseStyles}</style>
        <div className="error-screen">{error}</div>
      </>
    );
  }

  return (
    <>
      <style>{baseStyles}</style>

      {/* Toast */}
      {toast && (
        <div
          className="toast"
          style={{
            background:
              toast.type === "success"
                ? "var(--accent-green-dim)"
                : "var(--accent-red-dim)",
            borderColor:
              toast.type === "success"
                ? "rgba(74,222,128,0.3)"
                : "rgba(248,113,113,0.3)",
            color:
              toast.type === "success"
                ? "var(--accent-green)"
                : "var(--accent-red)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">
          Gym<span>.</span>
        </div>
        <div className="nav-center">
          <span className="nav-role-pill">Trainer Portal</span>
        </div>
        <div className="nav-right">
          <span className="nav-trainer-name">
            {trainer?.full_name ?? "Trainer"}
          </span>
          <button
            className="nav-logout"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="trainer-hero">
              <div className="trainer-hero-avatar">
                {trainer ? getInitials(trainer.full_name) : "—"}
              </div>
              <div>
                <h1 className="greeting">
                  {greeting},<br />
                  <span>{trainer?.full_name.split(" ")[0]}.</span>
                </h1>
                <span className="date-pill">{todayFormatted}</span>
              </div>
            </div>
          </div>
          <div className="header-stats">
            <div className="header-stat">
              <span
                className="header-stat-val"
                style={{ color: "var(--accent-blue)" }}
              >
                {todayBookings.length}
              </span>
              <span className="header-stat-label">Today</span>
            </div>
            <div className="header-stat-divider" />
            <div className="header-stat">
              <span
                className="header-stat-val"
                style={{ color: "var(--accent-green)" }}
              >
                {assignedMembers.length}
              </span>
              <span className="header-stat-label">Members</span>
            </div>
            <div className="header-stat-divider" />
            <div className="header-stat">
              <span
                className="header-stat-val"
                style={{
                  color:
                    pendingCount > 0
                      ? "var(--accent-amber)"
                      : "var(--text-secondary)",
                }}
              >
                {pendingCount}
              </span>
              <span className="header-stat-label">Pending</span>
            </div>
          </div>
        </div>

        {/* Specialization tag */}
        {trainer?.specialization && (
          <div className="spec-tag">
            <span className="spec-dot" />
            {trainer.specialization}
          </div>
        )}

        {/* Tab bar */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === "schedule" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("schedule")}
          >
            Schedule
            {pendingCount > 0 && (
              <span className="tab-badge">{pendingCount}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === "members" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            My Members
            <span className="tab-count">{assignedMembers.length}</span>
          </button>
        </div>

        {/* ── SCHEDULE TAB ── */}
        {activeTab === "schedule" && (
          <div className="tab-content">
            {/* Today's sessions */}
            <div className="section-label">Today&apos;s Sessions</div>
            {todayBookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <div className="empty-title">No sessions today</div>
                <div className="empty-sub">
                  Enjoy the rest day or check upcoming bookings below.
                </div>
              </div>
            ) : (
              <div className="booking-list">
                {todayBookings.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isUpdating={updatingId === b.id}
                    onConfirm={() => updateBookingStatus(b.id, "confirmed")}
                    onCancel={() => updateBookingStatus(b.id, "cancelled")}
                    highlight
                  />
                ))}
              </div>
            )}

            {/* Upcoming */}
            <div className="section-label" style={{ marginTop: 40 }}>
              Upcoming Sessions
            </div>
            {upcomingBookings.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px" }}>
                <div className="empty-sub">No upcoming sessions scheduled.</div>
              </div>
            ) : (
              <div className="booking-list">
                {upcomingBookings.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isUpdating={updatingId === b.id}
                    onConfirm={() => updateBookingStatus(b.id, "confirmed")}
                    onCancel={() => updateBookingStatus(b.id, "cancelled")}
                    highlight={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {activeTab === "members" && (
          <div className="tab-content">
            <div className="section-label">Assigned Members</div>
            {assignedMembers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <div className="empty-title">No members assigned yet</div>
                <div className="empty-sub">
                  The gym owner will assign members to you.
                </div>
              </div>
            ) : (
              <div className="member-grid">
                {assignedMembers.map((a) => (
                  <div key={a.id} className="member-card">
                    <div className="member-card-top">
                      <div
                        className="member-avatar-lg"
                        style={{ padding: 0, overflow: "hidden" }}
                      >
                        {a.member.profile_photo_url ? (
                          <img
                            src={a.member.profile_photo_url}
                            alt={a.member.full_name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: "50%",
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        <span
                          style={{
                            display: a.member.profile_photo_url
                              ? "none"
                              : "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          {getInitials(a.member.full_name)}
                        </span>
                      </div>
                      <div className="member-card-info">
                        <div className="member-card-name">
                          {a.member.full_name}
                        </div>
                        <div className="member-card-email">
                          {a.member.email}
                        </div>
                      </div>
                      <span
                        className="status-pill"
                        style={{
                          background: a.member.is_active
                            ? "var(--accent-green-dim)"
                            : "var(--bg3)",
                          color: a.member.is_active
                            ? "var(--accent-green)"
                            : "var(--text-muted)",
                        }}
                      >
                        {a.member.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="member-card-meta">
                      <div className="member-meta-item">
                        <span className="member-meta-label">Phone</span>
                        <span className="member-meta-val">
                          {a.member.phone}
                        </span>
                      </div>
                      <div className="member-meta-item">
                        <span className="member-meta-label">Joined</span>
                        <span className="member-meta-val">
                          {formatJoined(a.member.joined_date)}
                        </span>
                      </div>
                      <div className="member-meta-item">
                        <span className="member-meta-label">Assigned</span>
                        <span className="member-meta-val">
                          {formatJoined(a.assigned_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ------------------------------------------------------------------
// Booking Card sub-component
// ------------------------------------------------------------------

function BookingCard({
  booking,
  isUpdating,
  onConfirm,
  onCancel,
  highlight,
}: {
  booking: Booking;
  isUpdating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  highlight: boolean;
}) {
  const isPending = booking.status === "pending";
  const isConfirmed = booking.status === "confirmed";

  const statusColor = isPending
    ? "var(--accent-amber)"
    : isConfirmed
      ? "var(--accent-green)"
      : "var(--text-muted)";

  const statusBg = isPending
    ? "var(--accent-amber-dim)"
    : isConfirmed
      ? "var(--accent-green-dim)"
      : "var(--bg3)";

  return (
    <div className={`booking-card ${highlight ? "booking-card-today" : ""}`}>
      <div className="booking-card-left">
        <div className="booking-time-block">
          <span className="booking-time">
            {formatTime(booking.session_time)}
          </span>
          <span className="booking-date">
            {formatDate(booking.session_date)}
          </span>
        </div>
      </div>
      <div className="booking-card-body">
        <div className="booking-member-row">
          <div
            className="booking-avatar"
            style={{ overflow: "hidden", padding: 0 }}
          >
            {booking.member.profile_photo_url ? (
              <img
                src={booking.member.profile_photo_url}
                alt={booking.member.full_name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  target.parentElement
                    ?.querySelector("span")
                    ?.removeAttribute("style");
                }}
              />
            ) : null}

            <span
              style={{
                display: booking.member.profile_photo_url ? "none" : "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
              }}
            >
              {getInitials(booking.member.full_name)}
            </span>
          </div>
          <div>
            <div className="booking-member-name">
              {booking.member.full_name}
            </div>
            <div className="booking-member-phone">{booking.member.phone}</div>
          </div>
        </div>
        {booking.notes && <div className="booking-notes">{booking.notes}</div>}
      </div>
      <div className="booking-card-right">
        <span
          className="status-pill"
          style={{ background: statusBg, color: statusColor }}
        >
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
        {isPending && (
          <div className="booking-actions">
            <button
              className="btn-confirm"
              onClick={onConfirm}
              disabled={isUpdating}
            >
              {isUpdating ? "..." : "Confirm"}
            </button>
            <button
              className="btn-cancel"
              onClick={onCancel}
              disabled={isUpdating}
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const baseStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:           #0d0d0f;
    --bg2:          #141417;
    --bg3:          #1c1c21;
    --border:       rgba(255,255,255,0.07);
    --border-hi:    rgba(255,255,255,0.13);
    --text-primary: #f0efe8;
    --text-secondary: #8a8987;
    --text-muted:   #555450;
    --accent-green: #4ade80;
    --accent-amber: #fbbf24;
    --accent-red:   #f87171;
    --accent-blue:  #60a5fa;
    --accent-green-dim: rgba(74,222,128,0.12);
    --accent-amber-dim: rgba(251,191,36,0.12);
    --accent-red-dim:   rgba(248,113,113,0.12);
    --accent-blue-dim:  rgba(96,165,250,0.12);
    --font-display: var(--font-syne), sans-serif;
    --font-body:    var(--font-dm-sans), sans-serif;
    --radius:       14px;
    --radius-sm:    8px;
  }

  body {
    background: var(--bg);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 1.6;
  }

  /* ── Nav ── */
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 32px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .nav-logo {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }
  .nav-logo span { color: var(--accent-green); }
  .nav-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }
  .nav-role-pill {
    font-size: 12px;
    font-weight: 500;
    padding: 4px 14px;
    border-radius: 99px;
    border: 1px solid var(--border-hi);
    color: var(--text-secondary);
    letter-spacing: 0.04em;
  }
  .nav-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .nav-trainer-name {
    font-size: 13px;
    color: var(--text-muted);
  }
  .nav-logout {
    font-size: 12px;
    color: var(--text-muted);
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 5px 12px;
    cursor: pointer;
    font-family: var(--font-body);
    transition: all 0.15s;
  }
  .nav-logout:hover {
    border-color: var(--border-hi);
    color: var(--text-primary);
  }

  /* ── Page ── */
  .page {
    max-width: 65vw;
    width: 100%;
    margin: 0 auto;
    padding: 40px 32px 80px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 16px;
    flex-wrap: wrap;
  }
  .trainer-hero {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .trainer-hero-avatar {
    width: 64px; height: 64px;
    border-radius: var(--radius);
    background: var(--bg3);
    border: 1px solid var(--border-hi);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    color: var(--accent-blue);
    flex-shrink: 0;
  }
  .greeting {
    font-family: var(--font-display);
    font-size: 2.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .greeting span { color: var(--accent-green); }
  .date-pill {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 300;
    letter-spacing: 0.02em;
  }

  /* ── Header stats ── */
  .header-stats {
    display: flex;
    align-items: center;
    gap: 0;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 28px;
    gap: 28px;
  }
  .header-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .header-stat-val {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .header-stat-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 500;
  }
  .header-stat-divider {
    width: 1px;
    height: 36px;
    background: var(--border);
  }

  /* ── Spec tag ── */
  .spec-tag {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: 5px 14px;
    margin-bottom: 32px;
  }
  .spec-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent-blue);
  }

  /* ── Section label ── */
  .section-label {
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 14px;
  }

  /* ── Tab bar ── */
  .tab-bar {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 32px;
  }
  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 400;
    color: var(--text-muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 10px 16px 12px;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: -1px;
  }
  .tab-btn:hover { color: var(--text-secondary); }
  .tab-active {
    color: var(--text-primary) !important;
    border-bottom-color: var(--accent-green) !important;
    font-weight: 500 !important;
  }
  .tab-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 99px;
    background: var(--accent-amber-dim);
    color: var(--accent-amber);
  }
  .tab-count {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--bg3);
    color: var(--text-muted);
  }

  /* ── Tab content ── */
  .tab-content { animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

  /* ── Booking list ── */
  .booking-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .booking-card {
    display: flex;
    align-items: center;
    gap: 20px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 22px;
    transition: border-color 0.15s;
  }
  .booking-card:hover { border-color: var(--border-hi); }
  .booking-card-today {
    border-color: rgba(96,165,250,0.2);
    background: linear-gradient(135deg, rgba(96,165,250,0.04) 0%, var(--bg2) 60%);
  }
  .booking-card-left {
    flex-shrink: 0;
    min-width: 90px;
  }
  .booking-time-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .booking-time {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }
  .booking-date {
    font-size: 11px;
    color: var(--text-muted);
  }
  .booking-card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .booking-member-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .booking-avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    background: var(--bg3);
    border: 1px solid var(--border-hi);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
  .booking-member-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }
  .booking-member-phone {
    font-size: 12px;
    color: var(--text-muted);
  }
  .booking-notes {
    font-size: 12px;
    color: var(--text-secondary);
    font-style: italic;
    padding: 6px 10px;
    background: var(--bg3);
    border-radius: var(--radius-sm);
    border-left: 2px solid var(--border-hi);
    margin-left: 46px;
  }
  .booking-card-right {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }
  .status-pill {
    font-size: 11px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 99px;
    flex-shrink: 0;
  }
  .booking-actions {
    display: flex;
    gap: 6px;
  }
  .btn-confirm {
    font-size: 12px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    background: var(--accent-green-dim);
    color: var(--accent-green);
    border: 1px solid rgba(74,222,128,0.25);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all 0.15s;
  }
  .btn-confirm:hover { background: rgba(74,222,128,0.2); }
  .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-cancel {
    font-size: 12px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-muted);
    border: 1px solid var(--border);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all 0.15s;
  }
  .btn-cancel:hover {
    background: var(--accent-red-dim);
    color: var(--accent-red);
    border-color: rgba(248,113,113,0.25);
  }
  .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Member cards grid ── */
  .member-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  @media (max-width: 700px) {
    .member-grid { grid-template-columns: 1fr; }
  }
  .member-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    transition: border-color 0.15s;
  }
  .member-card:hover { border-color: var(--border-hi); }
  .member-card-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .member-avatar-lg {
    width: 42px; height: 42px;
    border-radius: var(--radius-sm);
    background: var(--bg3);
    border: 1px solid var(--border-hi);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    color: var(--accent-green);
    flex-shrink: 0;
  }
  .member-card-info { flex: 1; min-width: 0; }
  .member-card-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .member-card-email {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .member-card-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }
  .member-meta-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .member-meta-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted);
    font-weight: 500;
  }
  .member-meta-val {
    font-size: 13px;
    color: var(--text-secondary);
  }

  /* ── Empty state ── */
  .empty-state {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 48px 24px;
    text-align: center;
  }
  .empty-icon { font-size: 2rem; margin-bottom: 12px; }
  .empty-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 6px;
  }
  .empty-sub { font-size: 13px; color: var(--text-muted); }

  /* ── Loading / Error ── */
  .loading-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 1.1rem;
    color: var(--text-secondary);
    letter-spacing: 0.05em;
    gap: 12px;
  }
  .loading-spinner {
    width: 20px; height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--accent-green);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-red);
    font-family: var(--font-display);
    font-size: 1.1rem;
  }

  /* ── Toast ── */
  .toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    font-size: 13px;
    font-weight: 500;
    padding: 10px 22px;
    border-radius: 99px;
    border: 1px solid;
    font-family: var(--font-body);
    animation: toastIn 0.25s ease;
    white-space: nowrap;
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
