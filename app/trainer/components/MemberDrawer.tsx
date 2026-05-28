"use client";

import "./MemberDrawer.css";
import { useEffect } from "react";
import { X, ClipboardEdit, IndianRupee, MessageCircle } from "lucide-react";
import { formatDateIST } from "@/lib/utils/date";
import type { AssignedMemberWithDues } from "@/types";

interface MemberDrawerProps {
  memberInfo: AssignedMemberWithDues | null;
  onClose: () => void;
  onLogSession: (memberId: string) => void;
  onRecordPayment: (memberId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function MemberDrawer({
  memberInfo,
  onClose,
  onLogSession,
  onRecordPayment,
}: MemberDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!memberInfo) return null;

  const { member, current_membership, is_checked_in_today } = memberInfo;
  
  const paymentStatus = current_membership?.payment_status || "unknown";
  const isOverdue = paymentStatus === "overdue" || paymentStatus === "pending";

  return (
    <>
      <div className="member-drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="member-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-name"
      >
        <div className="member-drawer-handle" />
        
        <div className="member-drawer-content">
          {/* Header */}
          <div className="md-header">
            <div className="md-avatar">
              {member.profile_photo_url ? (
                <img src={member.profile_photo_url} alt={member.full_name} />
              ) : (
                getInitials(member.full_name)
              )}
            </div>
            <div className="md-info">
              <h2 id="md-name" className="md-name">{member.full_name}</h2>
              <div className="md-status">
                <span className={`roster-dot ${is_checked_in_today ? "active" : "inactive"}`} />
                {is_checked_in_today ? "In Gym Now" : "Not Checked In"}
              </div>
            </div>
            <button className="sign-out-icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          {/* Membership Details */}
          <div className="md-card">
            <div className="md-card-title">Membership Status</div>
            
            <div className="md-detail-row">
              <span className="md-detail-label">Plan</span>
              <span className="md-detail-value">
                {current_membership?.plan?.name || "No Active Plan"}
              </span>
            </div>
            
            {current_membership?.end_date && (
              <div className="md-detail-row">
                <span className="md-detail-label">Expires</span>
                <span className="md-detail-value">
                  {formatDateIST(current_membership.end_date)}
                </span>
              </div>
            )}
            
            <div className="md-detail-row">
              <span className="md-detail-label">Payment</span>
              <span className={`md-detail-value ${isOverdue ? "md-value-danger" : ""}`}>
                {paymentStatus === "paid" ? "Paid ✓" : 
                 paymentStatus === "overdue" ? "Overdue" : 
                 paymentStatus === "pending" ? "Pending" : "Unknown"}
              </span>
            </div>
            
            {isOverdue && current_membership?.amount_paid !== undefined && current_membership?.plan?.price !== undefined && (
              <div className="md-detail-row">
                <span className="md-detail-label">Balance</span>
                <span className="md-detail-value md-value-alert">
                  ₹{(current_membership.plan.price || 0) - (current_membership.amount_paid || 0)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="md-actions">
            <button 
              className="md-btn md-btn-primary"
              onClick={() => {
                onClose();
                onLogSession(member.id);
              }}
            >
              <ClipboardEdit size={18} />
              Log Session
            </button>
            
            {isOverdue && (
              <button 
                className="md-btn md-btn-amber"
                onClick={() => {
                  onClose();
                  onRecordPayment(member.id);
                }}
              >
                <IndianRupee size={18} />
                Record Payment
              </button>
            )}

            <a 
              href={`https://wa.me/91${member.phone}?text=Hi%20${member.full_name},%20`}
              target="_blank"
              rel="noreferrer"
              className="md-btn md-btn-outline"
              style={{ textDecoration: 'none' }}
            >
              <MessageCircle size={18} />
              Message on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
