"use client";

import "./tabs.css";
import { useState } from "react";
import { Dumbbell, Loader2, Info, Plus } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import BookSessionModal from "../components/BookSessionModal";
import { formatDateIST } from "@/lib/utils/date";
import type { MemberProfilePortal } from "@/types";

interface SessionsTabProps {
  member: MemberProfilePortal;
}

export default function SessionsTab({ member }: SessionsTabProps) {
  const { data: bookings = [], isLoading } = useBookings(member.id);
  const [showBooking, setShowBooking] = useState(false);

  // Parse HH:mm to 12h format
  function formatTime(timeStr: string) {
    const [h, m] = timeStr.split(":");
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${m} ${ampm}`;
  }

  return (
    <div className="member-tab-content">
      <div className="tab-header-row">
        <div>
          <h1 className="tab-title">PT Sessions</h1>
          <p className="tab-subtitle">Your upcoming personal training requests.</p>
        </div>
        <button 
          onClick={() => setShowBooking(true)}
          style={{
            background: "var(--accent-amber)",
            color: "#000",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0
          }}
          aria-label="Request Session"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="list-container">
        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={24} style={{ color: "var(--text-muted)" }} />
            <p>Loading sessions...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <Info size={24} style={{ opacity: 0.5 }} />
            <p>No upcoming sessions booked.</p>
          </div>
        ) : (
          bookings.map((booking) => {
            const dateStr = formatDateIST(booking.session_date);
            const timeStr = formatTime(booking.session_time);

            return (
              <div key={booking.id} className="list-row">
                <div className="list-icon-col">
                  <Dumbbell size={18} />
                </div>
                <div className="list-info-col">
                  <span className="list-title">
                    {dateStr} at {timeStr}
                  </span>
                  <span className="list-desc">
                    Trainer: {booking.trainer.full_name}
                  </span>
                </div>
                <div className="list-status-col">
                  <span className={`status-pill ${booking.status}`} style={{ textTransform: "capitalize", fontSize: "11px" }}>
                    {booking.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showBooking && (
        <BookSessionModal
          member={member}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  );
}
