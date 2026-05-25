"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Nav } from "@/components/ui/Nav";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUpdateDisplayName, useChangePassword } from "@/hooks/useOwnerProfileMutation";
import { profileSchema, passwordSchema, type ProfileFormData, type PasswordFormData } from "@/lib/validations/profile";
import { Pen, Wrench, Lock } from "lucide-react";
import "./settings.css";

type Tab = "account" | "gym";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const { data: userInfo, isLoading, error } = useCurrentUser();

  return (
    <>
      <Nav role="owner" />

      {isLoading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading settings...
        </div>
      )}

      {error && (
        <div className="error-screen">Failed to load settings: {error.message}</div>
      )}

      {!isLoading && !error && userInfo && (
        <div className="page dashboard-width">
          <div className="page-header">
            <div>
              <h1 className="page-title">Profile & Settings</h1>
              <p className="page-sub">Manage your account and gym configuration</p>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="settings-tabs">
            <button
              className={`settings-tab ${activeTab === "account" ? "active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              Account
            </button>
            <button
              className={`settings-tab ${activeTab === "gym" ? "active" : ""}`}
              onClick={() => setActiveTab("gym")}
            >
              Gym Settings
            </button>
          </div>

          <div className="settings-content">
            {activeTab === "account" && <AccountTab userInfo={userInfo} />}
            {activeTab === "gym" && <GymSettingsTab />}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// ACCOUNT TAB
// ============================================================================

function AccountTab({ userInfo }: { userInfo: { userName: string; email: string } }) {
  const [editingProfile, setEditingProfile] = useState(false);

  // ── Profile Form ──
  const { register: regProfile, handleSubmit: submitProfile, formState: { errors: profileErrs } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: userInfo.userName },
  });
  
  const updateName = useUpdateDisplayName();
  const onProfileSubmit = (data: ProfileFormData) => {
    updateName.mutate(data.full_name, {
      onSuccess: () => setEditingProfile(false),
    });
  };

  // ── Password Form ──
  const { register: regPass, handleSubmit: submitPass, reset: resetPass, formState: { errors: passErrs } } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });
  
  const changePass = useChangePassword();
  const onPassSubmit = (data: PasswordFormData) => {
    changePass.mutate(data.new_password, {
      onSuccess: () => resetPass(),
    });
  };

  return (
    <>
      {/* ── Personal Profile Card ── */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">Personal Profile</h2>
          <p className="settings-card-sub">Update your display name and personal details</p>
        </div>

        {!editingProfile ? (
          <div className="profile-view">
            <div className="profile-avatar-block">
              <Avatar name={userInfo.userName} size={72} />
              <div className="profile-meta">
                <div className="profile-name">{userInfo.userName}</div>
                <div className="profile-email">{userInfo.email || "No email provided"}</div>
              </div>
            </div>
            <button className="btn-ghost-sm" onClick={() => setEditingProfile(true)}>
              <Pen size={14} />
              Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={submitProfile(onProfileSubmit)} className="profile-edit-form">
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Full Name</label>
                <input
                  {...regProfile("full_name")}
                  className="form-input"
                  placeholder="Your name"
                />
                {profileErrs.full_name && <span className="form-error">{profileErrs.full_name.message}</span>}
              </div>
              
              <div className="form-field">
                <label className="form-label">Email Address (Read-only)</label>
                <input
                  type="text"
                  value={userInfo.email}
                  readOnly
                  className="form-input form-input-readonly"
                  title="Email cannot be changed directly"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-solid" disabled={updateName.isPending}>
                {updateName.isPending ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" className="btn-ghost-sm" onClick={() => setEditingProfile(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Security Card ── */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">Change Password</h2>
          <p className="settings-card-sub">Ensure your account is using a long, random password to stay secure</p>
        </div>

        <form onSubmit={submitPass(onPassSubmit)}>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Current Password</label>
              <input
                {...regPass("current_password")}
                type="password"
                className="form-input"
                placeholder="••••••••"
              />
              {passErrs.current_password && <span className="form-error">{passErrs.current_password.message}</span>}
            </div>
          </div>
          
          <div className="form-grid" style={{ marginTop: 20 }}>
            <div className="form-field">
              <label className="form-label">New Password</label>
              <input
                {...regPass("new_password")}
                type="password"
                className="form-input"
                placeholder="Min. 8 characters"
              />
              {passErrs.new_password && <span className="form-error">{passErrs.new_password.message}</span>}
            </div>
            
            <div className="form-field">
              <label className="form-label">Confirm New Password</label>
              <input
                {...regPass("confirm_password")}
                type="password"
                className="form-input"
                placeholder="Must match new password"
              />
              {passErrs.confirm_password && <span className="form-error">{passErrs.confirm_password.message}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-solid" disabled={changePass.isPending}>
              <Lock size={14} />
              {changePass.isPending ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ============================================================================
// GYM SETTINGS TAB (Under Development Placeholder)
// ============================================================================

function GymSettingsTab() {
  return (
    <div className="settings-coming-soon">
      <div className="coming-soon-icon">
        <Wrench size={24} />
      </div>
      <h2 className="coming-soon-title">Gym Settings & Configuration</h2>
      <p className="coming-soon-desc">
        We are building a unified interface to manage all your gym-level branding, notifications, and subscription configurations.
      </p>
      
      <div className="coming-soon-list">
        <div className="coming-soon-row">
          <span className="coming-soon-row-label">Branding & Identity (Logo, Colors)</span>
          <span className="tag">Coming Soon</span>
        </div>
        <div className="coming-soon-row">
          <span className="coming-soon-row-label">Contact & Notifications (WhatsApp, Email)</span>
          <span className="tag">Coming Soon</span>
        </div>
        <div className="coming-soon-row">
          <span className="coming-soon-row-label">Membership Plans Config</span>
          <span className="tag">Coming Soon</span>
        </div>
        <div className="coming-soon-row">
          <span className="coming-soon-row-label">Payment Settings (UPI Integration)</span>
          <span className="tag">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}
