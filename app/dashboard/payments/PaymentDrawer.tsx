"use client";

// ============================================================
// app/dashboard/payments/PaymentDrawer.tsx
// Slide-in detail panel for a single payment record.
// Extracted from payments/page.tsx for modularity (REFACT-005).
// ============================================================

import "./PaymentDrawer.css";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { STATUS_CONFIG } from "@/lib/constants/status";
import { formatINR, formatDate } from "@/lib/utils/format";
import type { PaymentRecord } from "@/hooks/usePayments";
import type { PaymentStatus } from "@/types";

interface PaymentDrawerProps {
  record: PaymentRecord;
  onClose: () => void;
}

export function PaymentDrawer({ record, onClose }: PaymentDrawerProps) {
  // Narrow to the statuses STATUS_CONFIG supports; fall back to superseded
  const statusKey = (["paid", "pending", "overdue", "superseded"] as PaymentStatus[]).includes(
    record.payment_status
  )
    ? record.payment_status
    : "superseded";

  const cfg = STATUS_CONFIG[statusKey];
  const planPrice = record.plan?.price ?? 0;
  const amountPaid = record.amount_paid ?? 0;
  const due = Math.max(0, planPrice - amountPaid);

  return (
    <>
      <div className="payment-drawer-overlay" onClick={onClose} />

      <div className="payment-drawer">
        {/* Header */}
        <div className="payment-drawer-header">
          <button className="payment-drawer-close" onClick={onClose} aria-label="Close drawer">
            <X size={16} />
          </button>
        </div>

        {/* Member identity */}
        <div className="payment-drawer-identity">
          <Avatar
            name={record.member.full_name}
            src={record.member.profile_photo_url}
            href={record.member.profile_photo_url}
            size={52}
          />
          <div>
            <div className="payment-drawer-name">{record.member.full_name}</div>
            <div className="payment-drawer-sub">{record.member.phone}</div>
          </div>
        </div>

        {/* Status pill */}
        <span
          className="payment-drawer-status"
          style={{
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.label}
        </span>

        <div className="payment-drawer-divider" />

        {/* Amount breakdown */}
        <div className="payment-drawer-section">
          <p className="payment-drawer-section-label">Payment breakdown</p>
          <div className="payment-breakdown">
            <div className="payment-breakdown-row">
              <span className="payment-breakdown-key">Plan price</span>
              <span className="payment-breakdown-val">{formatINR(planPrice)}</span>
            </div>
            <div className="payment-breakdown-row">
              <span className="payment-breakdown-key">Amount paid</span>
              <span className="payment-breakdown-val" style={{ color: "var(--accent-green)" }}>
                {formatINR(amountPaid)}
              </span>
            </div>
            {due > 0 && (
              <div className="payment-breakdown-row payment-breakdown-row-due">
                <span className="payment-breakdown-key">Balance due</span>
                <span className="payment-breakdown-val" style={{ color: "var(--accent-red)" }}>
                  {formatINR(due)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="payment-drawer-divider" />

        {/* Membership details */}
        <div className="payment-drawer-section">
          <p className="payment-drawer-section-label">Membership details</p>
          <div className="payment-drawer-info-grid">
            <div className="payment-drawer-info-item">
              <span className="payment-drawer-info-key">Plan</span>
              <span className="payment-drawer-info-val">{record.plan?.name ?? "—"}</span>
            </div>
            <div className="payment-drawer-info-item">
              <span className="payment-drawer-info-key">Duration</span>
              <span className="payment-drawer-info-val">
                {record.plan?.duration_days ?? "—"} days
              </span>
            </div>
            <div className="payment-drawer-info-item">
              <span className="payment-drawer-info-key">Start date</span>
              <span className="payment-drawer-info-val">{formatDate(record.start_date)}</span>
            </div>
            <div className="payment-drawer-info-item">
              <span className="payment-drawer-info-key">End date</span>
              <span className="payment-drawer-info-val">{formatDate(record.end_date)}</span>
            </div>
            <div className="payment-drawer-info-item">
              <span className="payment-drawer-info-key">Method</span>
              <span
                className="payment-drawer-info-val"
                style={{ textTransform: "capitalize" }}
              >
                {record.payment_method ?? "—"}
              </span>
            </div>
            <div className="payment-drawer-info-item">
              <span className="payment-drawer-info-key">Recorded on</span>
              <span className="payment-drawer-info-val">{formatDate(record.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="payment-drawer-actions">
          {record.payment_status !== "paid" && (
            <button className="payment-drawer-btn payment-drawer-btn-primary">
              Mark as paid
            </button>
          )}
          <button className="payment-drawer-btn payment-drawer-btn-secondary">
            Send reminder
          </button>
        </div>
      </div>
    </>
  );
}
