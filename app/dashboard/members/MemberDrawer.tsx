"use client";

// ============================================================
// app/dashboard/members/MemberDrawer.tsx
// Slide-in detail panel for a single member.
// Extracted from page.tsx for modularity (Step A5).
// ============================================================

import "./MemberDrawer.css";
import type { Member } from "@/types";
import { formatINR, formatDate } from "@/lib/utils/format";
import { daysUntil } from "@/lib/utils/date";
import { STATUS_CONFIG } from "@/lib/constants/status";
import { getMemberStatus } from "@/lib/members/status";
import type { MemberWithMembership } from "@/hooks/useMembers";
import { ACCENT } from "@/lib/constants/design";
import { Avatar } from "@/components/ui/Avatar";

interface MemberDrawerProps {
  member: MemberWithMembership;
  onClose: () => void;
}

export function MemberDrawer({ member, onClose }: MemberDrawerProps) {
  const status = getMemberStatus(member);
  const cfg = STATUS_CONFIG[status];
  const ms = member.membership;
  const plan = ms?.plan;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        {/* Header */}
        <div className="drawer-header">
          <button className="drawer-close" onClick={onClose}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Member identity */}
        <div className="drawer-identity">
          <Avatar
            name={member.full_name}
            src={member.profile_photo_url}
            href={member.profile_photo_url}
            size={56}
          />
          <div>
            <h2 className="drawer-name">{member.full_name}</h2>
            <p className="drawer-phone">{member.phone}</p>
            {member.email && <p className="drawer-email">{member.email}</p>}
          </div>
        </div>

        {/* Status pill */}
        <div
          className="drawer-status-pill"
          style={{
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.label}
        </div>

        {/* Divider */}
        <div className="drawer-divider" />

        {/* Membership info */}
        {ms && plan ? (
          <div className="drawer-section">
            <p className="drawer-section-label">Current Membership</p>
            <div className="drawer-info-grid">
              <div className="drawer-info-item">
                <span className="drawer-info-key">Plan</span>
                <span className="drawer-info-val">{plan.name}</span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Branch</span>
                <span className="drawer-info-val">
                  {(member as Member & { branch: string }).branch ?? "—"}
                </span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Price</span>
                <span className="drawer-info-val">{formatINR(plan.price)}</span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Start date</span>
                <span className="drawer-info-val">
                  {formatDate(ms.start_date)}
                </span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Expiry</span>
                <span
                  className="drawer-info-val"
                  style={{
                    color:
                      status === "expiring"
                        ? ACCENT.amber
                        : status === "overdue"
                          ? ACCENT.red
                          : "inherit",
                  }}
                >
                  {formatDate(ms.end_date)}
                  {status === "expiring" && (
                    <span
                      style={{ color: ACCENT.amber, marginLeft: 6, fontSize: 12 }}
                    >
                      ({daysUntil(ms.end_date)}d left)
                    </span>
                  )}
                </span>
              </div>
              <div className="drawer-info-item">
                <span className="drawer-info-key">Paid</span>
                <span className="drawer-info-val" style={{ color: ACCENT.green }}>
                  {formatINR(ms.amount_paid ?? 0)}
                </span>
              </div>
              {ms.payment_status !== "paid" && (
                <div className="drawer-info-item">
                  <span className="drawer-info-key">Due</span>
                  <span
                    className="drawer-info-val"
                    style={{ color: ACCENT.red }}
                  >
                    {formatINR(plan.price - (ms.amount_paid ?? 0))}
                  </span>
                </div>
              )}
              <div className="drawer-info-item">
                <span className="drawer-info-key">Method</span>
                <span
                  className="drawer-info-val"
                  style={{ textTransform: "capitalize" }}
                >
                  {ms.payment_method ?? "—"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "20px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No membership record found.
          </div>
        )}

        <div className="drawer-divider" />

        {/* Personal info */}
        <div className="drawer-section">
          <p className="drawer-section-label">Personal Details</p>
          <div className="drawer-info-grid">
            <div className="drawer-info-item">
              <span className="drawer-info-key">Joined</span>
              <span className="drawer-info-val">
                {formatDate(member.joined_date)}
              </span>
            </div>
            {member.date_of_birth && (
              <div className="drawer-info-item">
                <span className="drawer-info-key">DOB</span>
                <span className="drawer-info-val">
                  {formatDate(member.date_of_birth)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Identity document */}
        {member.id_proof_url && (
          <>
            <div className="drawer-divider" />
            <div className="drawer-section">
              <p className="drawer-section-label">Identity Document</p>
              <a
                href={member.id_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--bg3)",
                  border: "1px solid var(--border-hi)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 14px",
                  textDecoration: "none",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 500,
                  transition: "border-color 0.15s",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-blue)"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Aadhaar / ID Proof
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="2"
                  style={{ marginLeft: "auto" }}
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="drawer-actions">
          <button className="drawer-btn drawer-btn-primary">
            Renew membership
          </button>
          <button className="drawer-btn drawer-btn-secondary">
            Record payment
          </button>
        </div>
      </div>
    </>
  );
}
