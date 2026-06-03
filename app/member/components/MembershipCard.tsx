"use client";

import "./MembershipCard.css";
import { QRCodeSVG } from "qrcode.react";
import { CreditCard, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { daysUntil, formatDateIST } from "@/lib/utils/date";
import type { MemberProfilePortal, MemberCurrentMembership } from "@/types";

// ── Props ─────────────────────────────────────────────────────────────

interface MembershipCardProps {
  member: MemberProfilePortal;
  membership: MemberCurrentMembership | null;
}

// ── Component ─────────────────────────────────────────────────────────

export default function MembershipCard({ member, membership }: MembershipCardProps) {
  // Empty State: No active/pending/overdue membership found
  if (!membership) {
    return (
      <div className="membership-card-wrapper">
        <div className="membership-card-empty">
          <CreditCard className="membership-card-empty-icon" size={32} />
          <h3 className="membership-card-empty-title">No Active Membership</h3>
          <p className="membership-card-empty-desc">
            You don't have a current membership plan. Request a renewal to get started.
          </p>
        </div>
      </div>
    );
  }

  // Active State Calculations
  const daysLeft = daysUntil(membership.end_date);
  const isOverdue = membership.payment_status === "overdue" || daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 7;
  
  // Visual classes based on urgency
  let barClass = "active";
  let badgeClass = "";
  let badgeIcon = <CheckCircle2 size={12} />;

  if (isOverdue) {
    barClass = "urgent";
    badgeClass = "critical";
    badgeIcon = <AlertCircle size={12} />;
  } else if (isUrgent) {
    barClass = "urgent";
    badgeClass = "warning";
    badgeIcon = <Clock size={12} />;
  } else if (membership.payment_status === "pending") {
    barClass = "urgent";
    badgeClass = "warning";
    badgeIcon = <Clock size={12} />;
  }

  // Format badge text
  let badgeText = `${daysLeft} days left`;
  if (membership.payment_status === "pending") badgeText = "Renewal Pending";
  if (membership.payment_status === "overdue") badgeText = "Payment Overdue";
  else if (daysLeft < 0) badgeText = "Expired";

  return (
    <div className="membership-card-wrapper">
      <div className="membership-card">
        {/* Dynamic colored accent bar at top */}
        <div className={`membership-card-accent-bar ${barClass}`} />

        {/* Left Column: Member details & dates */}
        <div className="membership-card-details">
          <div className="membership-card-header">
            <h2 className="membership-card-member-name">{member.full_name}</h2>
            <span className="membership-card-plan-name">{membership.plan.name}</span>
          </div>

          <div className="membership-card-dates">
            <span className="membership-card-date-label">Valid Thru</span>
            <span className="membership-card-date-val">
              {formatDateIST(membership.end_date)}
            </span>
          </div>

          <div className="membership-card-status-row">
            <div className={`membership-card-days-badge ${badgeClass}`}>
              {badgeIcon}
              <span>{badgeText}</span>
            </div>
            {/* Standard global UI status pill for payment status */}
            <span className={`status-pill ${membership.payment_status}`}>
              {membership.payment_status}
            </span>
          </div>
        </div>

        {/* Right Column: QR Code for scanner check-in */}
        <div className="membership-card-qr-section">
          <div className="membership-card-qr-wrapper">
            <QRCodeSVG
              value={member.id} /* Scanner reads member UUID */
              size={80}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"M"}
            />
          </div>
          <span className="membership-card-qr-label">Scan ID</span>
        </div>
      </div>
    </div>
  );
}
