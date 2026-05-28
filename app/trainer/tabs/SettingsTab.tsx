"use client";

import "./SettingsTab.css";
import { LogOut, Phone, Mail, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Trainer } from "@/types";

interface SettingsTabProps {
  trainer: Trainer;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function SettingsTab({ trainer }: SettingsTabProps) {
  const router = useRouter();

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err: unknown) {
      toast.error("Failed to sign out.");
    }
  }

  return (
    <div className="settings-tab">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
      </div>

      {/* Profile Card */}
      <div className="settings-profile-card">
        <div className="settings-avatar">
          {getInitials(trainer.full_name)}
        </div>
        <div className="settings-profile-info">
          <h2>{trainer.full_name}</h2>
          <p>{trainer.specialization || "Fitness Trainer"}</p>
        </div>
      </div>

      {/* Account Details */}
      <div className="settings-group">
        <span className="settings-group-title">Account Details</span>
        <div className="settings-list">
          <div className="settings-item">
            <div className="settings-item-left">
              <Mail size={18} className="settings-item-icon" />
              <span>Email</span>
            </div>
            <div className="settings-item-value">{trainer.email || "—"}</div>
          </div>
          
          <div className="settings-item">
            <div className="settings-item-left">
              <Phone size={18} className="settings-item-icon" />
              <span>Phone</span>
            </div>
            <div className="settings-item-value">
              {trainer.phone ? `+91 ${trainer.phone}` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to push sign out to bottom if needed, or just normal flow */}
      <div style={{ marginTop: "12px" }}>
        <button className="settings-signout-btn" onClick={handleSignOut}>
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
