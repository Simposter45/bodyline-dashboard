"use client";

import "./tabs.css";
import { User, Phone, Mail, Calendar, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateIST } from "@/lib/utils/date";
import type { MemberProfilePortal } from "@/types";

interface AccountTabProps {
  member: MemberProfilePortal;
}

export default function AccountTab({ member }: AccountTabProps) {
  
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="member-tab-content">
      <div>
        <div className="tab-header-row">
          <h1 className="tab-title">Account</h1>
        </div>
        <p className="tab-subtitle">Your personal details and app settings.</p>
      </div>

      <div className="account-section">
        <div className="account-row" style={{ flexDirection: "row", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
          <div style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "var(--accent-amber-dim)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--accent-amber)",
            overflow: "hidden"
          }}>
            {member.profile_photo_url ? (
              <img src={member.profile_photo_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              member.full_name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{member.full_name}</h2>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Member</span>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          <div className="account-row">
            <span className="account-label">
              <Phone size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} /> Phone
            </span>
            <span className="account-value">{member.phone || "Not provided"}</span>
          </div>

          <div className="account-row">
            <span className="account-label">
              <Mail size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} /> Email
            </span>
            <span className="account-value">{member.email || "Not provided"}</span>
          </div>

          <div className="account-row">
            <span className="account-label">
              <Calendar size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} /> Joined
            </span>
            <span className="account-value">{formatDateIST(member.joined_date)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          width: "100%",
          padding: "16px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: "15px",
          cursor: "pointer",
          transition: "all 0.2s"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = "var(--border-hi)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <LogOut size={18} />
        Sign out
      </button>
    </div>
  );
}
