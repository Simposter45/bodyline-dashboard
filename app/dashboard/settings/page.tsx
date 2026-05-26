"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/ui/Nav";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  useUpdateDisplayName,
  useUpdatePhone,
  useChangePassword,
} from "@/hooks/useOwnerProfileMutation";
import {
  profileSchema,
  phoneSchema,
  passwordSchema,
  type ProfileFormData,
  type PhoneFormData,
  type PasswordFormData,
} from "@/lib/validations/profile";
import { Pen, Check, X, Wrench, LogOut, Lock, ChevronDown, ChevronUp } from "lucide-react";
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
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const updateName = useUpdateDisplayName();
  const updatePhone = useUpdatePhone();

  // ── Password Form ──
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
        setShowPasswordForm(false);
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      {/* ── Personal Profile Card ── */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">Personal Profile</h2>
          <p className="settings-card-sub">Your identity on the Bodyline platform</p>
        </div>

        {/* Avatar + name identity block */}
        <div className="profile-header">
          <Avatar name={userInfo.userName} size={72} />
          <div className="profile-meta">
            <div className="profile-name">{userInfo.userName}</div>
            <div className="profile-email">{userInfo.email || "—"}</div>
          </div>
        </div>

        {/* Always-visible field rows with per-field inline pencil edit */}
        <InlineField
          label="Full Name"
          value={userInfo.userName}
          schema={profileSchema}
          schemaKey="full_name"
          placeholder="Your full name"
          onSave={(val) => updateName.mutate(val)}
          isSaving={updateName.isPending}
        />

        <div className="profile-field-row">
          <span className="profile-field-label">Email</span>
          <span className="profile-field-readonly">{userInfo.email || "—"}</span>
          {/* Email is read-only — Supabase requires two-step email confirmation */}
        </div>

        <InlineField
          label="Phone"
          value={userInfo.phone}
          schema={phoneSchema}
          schemaKey="phone"
          placeholder="+91 98765 43210 (optional)"
          emptyLabel="Not set"
          onSave={(val) => updatePhone.mutate(val)}
          isSaving={updatePhone.isPending}
          inputMode="tel"
        />

        {/* Change Password — collapsible */}
        <div className="password-toggle-row">
          <button
            className="password-toggle-btn"
            onClick={() => setShowPasswordForm((v) => !v)}
            type="button"
          >
            <Lock size={13} />
            Change password
            {showPasswordForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={submitPass(onPassSubmit)} className="password-form">
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
                {changePass.isPending ? "Updating..." : "Update Password"}
              </button>
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={() => { resetPass(); setShowPasswordForm(false); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Sign Out ── */}
      <div className="settings-card danger-zone">
        <div className="settings-card-header" style={{ marginBottom: 16 }}>
          <h2 className="settings-card-title">Sign Out</h2>
          <p className="settings-card-sub">You will be redirected to the login page</p>
        </div>
        <button className="btn-danger" onClick={handleSignOut}>
          <LogOut size={15} />
          Sign out of your account
        </button>
      </div>
    </>
  );
}

// ============================================================================
// INLINE FIELD — generic reusable per-field inline edit row
// ============================================================================

import { z } from "zod";

interface InlineFieldProps {
  label: string;
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodObject<any>;
  schemaKey: string;
  placeholder?: string;
  emptyLabel?: string;
  onSave: (value: string) => void;
  isSaving: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

function InlineField({
  label,
  value,
  schema,
  schemaKey,
  placeholder,
  emptyLabel = "—",
  onSave,
  isSaving,
  inputMode,
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { [schemaKey]: value },
  });

  const onSubmit = handleSubmit((data) => {
    const val = data[schemaKey] as string;
    // Validate locally before firing mutation
    const result = schema.safeParse({ [schemaKey]: val });
    if (!result.success) {
      setLocalError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLocalError(null);
    onSave(val);
    setEditing(false);
  });

  const handleCancel = () => {
    reset({ [schemaKey]: value });
    setLocalError(null);
    setEditing(false);
  };

  const errorMsg = (errors[schemaKey]?.message as string | undefined) ?? localError;

  return (
    <div className="profile-field-row">
      <span className="profile-field-label">{label}</span>

      {editing ? (
        <form onSubmit={onSubmit} className="profile-field-input-wrap" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <input
              {...register(schemaKey)}
              className="profile-field-input"
              placeholder={placeholder}
              inputMode={inputMode}
              autoFocus
            />
            <button type="submit" className="profile-field-confirm-btn" disabled={isSaving}>
              <Check size={14} />
            </button>
            <button type="button" className="profile-field-cancel-btn" onClick={handleCancel}>
              <X size={14} />
            </button>
          </div>
          {errorMsg && <span className="profile-field-error">{errorMsg}</span>}
        </form>
      ) : (
        <>
          <span className={`profile-field-value ${!value ? "muted" : ""}`}>
            {value || emptyLabel}
          </span>
          <button
            className="profile-field-edit-btn"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
          >
            <Pen size={13} />
          </button>
        </>
      )}
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
