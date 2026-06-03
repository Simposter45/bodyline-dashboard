"use client";

import { useState } from "react";
import "./tabs.css";
import { CreditCard, Dumbbell, ChevronRight } from "lucide-react";
import MembershipCard from "../components/MembershipCard";
import RenewalRequestModal from "../components/RenewalRequestModal";
import BookSessionModal from "../components/BookSessionModal";
import type { MemberProfilePortal, MemberCurrentMembership } from "@/types";

interface CardTabProps {
  member: MemberProfilePortal;
  membership: MemberCurrentMembership | null;
}

export default function CardTab({ member, membership }: CardTabProps) {
  const [showRenewal, setShowRenewal] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  return (
    <div className="member-tab-content">
      <div>
        <div className="tab-header-row">
          <h1 className="tab-title">My Card</h1>
        </div>
        <p className="tab-subtitle">Present this QR code at the front desk to check in.</p>
      </div>

      <MembershipCard member={member} membership={membership} />

      <div className="card-actions-grid">
        <button
          className="btn-primary-action"
          onClick={() => setShowRenewal(true)}
        >
          <div className="action-left">
            <CreditCard className="action-icon" size={20} />
            <span>Renew Membership</span>
          </div>
          <ChevronRight className="action-arrow" size={18} />
        </button>

        <button
          className="btn-primary-action"
          onClick={() => setShowBooking(true)}
        >
          <div className="action-left">
            <Dumbbell className="action-icon" size={20} />
            <span>Book PT Session</span>
          </div>
          <ChevronRight className="action-arrow" size={18} />
        </button>
      </div>

      {showRenewal && (
        <RenewalRequestModal
          member={member}
          onClose={() => setShowRenewal(false)}
        />
      )}

      {showBooking && (
        <BookSessionModal
          member={member}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  );
}
