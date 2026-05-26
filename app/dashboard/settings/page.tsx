"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/ui/Nav";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  useUpdateProfile,
  useChangePassword,
} from "@/hooks/useOwnerProfileMutation";
import {
  profileSchema,
  passwordSchema,
  type ProfileFormData,
  type PasswordFormData,
} from "@/lib/validations/profile";
import { Pen, Wrench, LogOut, Lock } from "lucide-react";
import "./settings.css";

const supabase = createClient();

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
        <div className="error-screen">Failed to load: {error.message}</div>
      )}

      {!isLoading && !error && userInfo && (
        <div className="page dashboard-width">
          <div className="page-header">
            <div>
              <h1 className="page-title">Profile & Settings</h1>
              <p className="page-sub">Manage your account and gym configuration</p>
            </div>
          </div>

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

interface UserInfo {
  userName: string;
  email: string;
  phone: string;
}

function AccountTab({ userInfo }: { userInfo: UserInfo }) {
  const [isEditing, setIsEditing] = useState(false);

  const updateProfile = useUpdateProfile();

  const {
    register: regProfile,
    handleSubmit: submitProfile,
    formState: { errors: profileErrs },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: userInfo.userName, phone: userInfo.phone },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(
      { fullName: data.full_name, phone: data.phone },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  const handleCancel = () => {
    resetProfile({ full_name: userInfo.userName, phone: userInfo.phone });
    setIsEditing(false);
  };

  return (
    <>
      {/* ── Personal Profile Card ── */}
      <div className="settings-card">
        <div className="settings-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <h2 className="settings-card-title">Personal Profile</h2>
            <p className="settings-card-sub">Your identity on the Bodyline platform</p>
          </div>
          {!isEditing && (
            <button className="btn-ghost-sm edit-profile-btn" onClick={() => setIsEditing(true)} title="Edit Profile">
              <Pen size={14} />
              <span className="text-desktop">Edit Profile</span>
            </button>
          )}
        </div>

        {/* Avatar block */}
        <div className="profile-header">
          <Avatar name={userInfo.userName} size={72} />
          <div className="profile-meta">
            <div className="profile-name">{userInfo.userName}</div>
            <div className="profile-email">{userInfo.email || "—"}</div>
          </div>
        </div>

        {!isEditing ? (
          <div className="profile-fields-view">
            <div className="profile-field-row">
              <span className="profile-field-label">Full Name</span>
              <span className="profile-field-value">{userInfo.userName}</span>
            </div>
            <div className="profile-field-row">
              <span className="profile-field-label">Email</span>
              <span className="profile-field-readonly">{userInfo.email || "—"}</span>
            </div>
            <div className="profile-field-row">
              <span className="profile-field-label">Phone</span>
              <span className={`profile-field-value ${!userInfo.phone ? "muted" : ""}`}>
                {userInfo.phone || "Not set"}
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={submitProfile(onProfileSubmit)}>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Full Name</label>
                <input
                  {...regProfile("full_name")}
                  className="form-input"
                  placeholder="Your full name"
                />
                {profileErrs.full_name && (
                  <span className="form-error">{profileErrs.full_name.message}</span>
                )}
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

              <div className="form-field">
                <label className="form-label">Phone</label>
                <input
                  {...regProfile("phone")}
                  className="form-input"
                  placeholder="10-digit mobile number"
                  inputMode="tel"
                />
                {profileErrs.phone && (
                  <span className="form-error">{profileErrs.phone.message}</span>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-solid" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={handleCancel}
                disabled={updateProfile.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <SecurityAccessCard />
    </>
  );
}

// ============================================================================
// SECURITY & ACCESS CARD
// ============================================================================

function SecurityAccessCard() {
  const {
    register: regPass,
    handleSubmit: submitPass,
    reset: resetPass,
    formState: { errors: passErrs },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });

  const changePass = useChangePassword();
  const onPassSubmit = (data: PasswordFormData) => {
    changePass.mutate(data.new_password, {
      onSuccess: () => {
        resetPass();
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="settings-card danger-zone">
      <div className="settings-card-header">
        <h2 className="settings-card-title">Security & Access</h2>
        <p className="settings-card-sub">Manage your password and active sessions</p>
      </div>

      <div className="security-section">
        <h3 className="security-section-title">Change Password</h3>
        <form onSubmit={submitPass(onPassSubmit)} className="password-form-full">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Current Password</label>
              <input
                {...regPass("current_password")}
                type="password"
                className="form-input"
                placeholder="••••••••"
              />
              {passErrs.current_password && (
                <span className="form-error">{passErrs.current_password.message}</span>
              )}
            </div>
          </div>
          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="form-field">
              <label className="form-label">New Password</label>
              <input
                {...regPass("new_password")}
                type="password"
                className="form-input"
                placeholder="Min. 8 characters"
              />
              {passErrs.new_password && (
                <span className="form-error">{passErrs.new_password.message}</span>
              )}
            </div>
            <div className="form-field">
              <label className="form-label">Confirm New Password</label>
              <input
                {...regPass("confirm_password")}
                type="password"
                className="form-input"
                placeholder="Must match"
              />
              {passErrs.confirm_password && (
                <span className="form-error">{passErrs.confirm_password.message}</span>
              )}
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

      <div className="security-divider" />

      <div className="security-section">
        <h3 className="security-section-title">Sign Out</h3>
        <p className="security-section-desc">You will be redirected to the login page.</p>
        <button className="btn-danger" onClick={handleSignOut}>
          <LogOut size={15} />
          Sign out of your account
        </button>
      </div>
    </div>
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
        We&apos;re building a unified interface to manage all your gym-level branding,
        notifications, and subscription configurations.
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
