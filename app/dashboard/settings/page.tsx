"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/ui/Nav";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  useUpdateProfile,
  useChangePassword,
} from "@/hooks/useOwnerProfileMutation";
import { useGym } from "@/hooks/useGym";
import { useGymSettings } from "@/hooks/useGymSettings";
import { useUpdateGymSettings } from "@/hooks/useGymSettingsMutation";
import {
  profileSchema,
  passwordSchema,
  type ProfileFormData,
  type PasswordFormData,
} from "@/lib/validations/profile";
import {
  gymSettingsSchema,
  ALLOWED_PRIMARY_COLORS,
  type GymSettingsFormData,
} from "@/lib/validations/gym";
import { Pen, LogOut, Lock, Check, Globe, Mail, MessageSquare, Copy, Camera, ImagePlus, Plus, X, RotateCcw, PenSquare } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateIST } from "@/lib/utils/date";
import { formatINR } from "@/lib/utils/format";
import { uploadAvatar, uploadGymLogo } from "@/lib/utils/upload";
import { useAllPlans } from "@/hooks/usePlans";
import { useDeactivatePlan, useRestorePlan } from "@/hooks/usePlanMutations";
import { PlanModal } from "@/components/plans/PlanModal";
import type { MembershipPlan } from "@/types";
import "./settings.css";

const supabase = createClient();

type Tab = "account" | "gym" | "plans";

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
            <button
              className={`settings-tab ${activeTab === "plans" ? "active" : ""}`}
              onClick={() => setActiveTab("plans")}
            >
              Plans
            </button>
          </div>

          <div className="settings-content">
            {activeTab === "account" && <AccountTab userInfo={{ ...userInfo, avatarUrl: userInfo.avatarUrl }} />}
            {activeTab === "gym" && <GymSettingsTab />}
            {activeTab === "plans" && <PlansTab />}
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
  avatarUrl: string | null;
}

function AccountTab({ userInfo }: { userInfo: UserInfo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userInfo.avatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | undefined>(undefined);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  // Upload avatar immediately on file selection (before save)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show local preview instantly
    setAvatarPreview(URL.createObjectURL(file));
    setIsUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const url = await uploadAvatar(user.id, file);
      setPendingAvatarUrl(url);
    } catch {
      setAvatarPreview(userInfo.avatarUrl); // revert preview on error
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(
      { fullName: data.full_name, phone: data.phone, avatarUrl: pendingAvatarUrl },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  const handleCancel = () => {
    resetProfile({ full_name: userInfo.userName, phone: userInfo.phone });
    setAvatarPreview(userInfo.avatarUrl);
    setPendingAvatarUrl(undefined);
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
          {/* Clickable avatar with camera overlay */}
          <div
            className={`avatar-upload-wrapper ${isEditing ? "is-editing" : ""}`}
            onClick={() => isEditing && avatarInputRef.current?.click()}
            title={isEditing ? "Click to change photo" : undefined}
          >
            <Avatar name={userInfo.userName} src={avatarPreview} size={72} />
            <div className="avatar-upload-overlay">
              {isUploadingAvatar ? (
                <div className="avatar-upload-spinner" />
              ) : (
                <Camera size={16} />
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </div>
          <div className="profile-meta">
            <div className="profile-name">{userInfo.userName}</div>
            <div className="profile-email">{userInfo.email || "—"}</div>
            {(pendingAvatarUrl !== undefined || isUploadingAvatar) && (
              <div className="avatar-upload-status">
                {isUploadingAvatar ? "Uploading photo..." : "✓ Photo ready — save to apply"}
              </div>
            )}
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
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={handleCancel}
                disabled={updateProfile.isPending}
              >
                Cancel
              </button>
              <button type="submit" className="btn-solid" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>

      <AccountInfoCard />
      <SupportCard />
      
      <SecurityAccessCard />
    </>
  );
}

// ============================================================================
// ACCOUNT INFO CARD
// ============================================================================

function AccountInfoCard() {
  const { data: gym, isLoading } = useGym();

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h2 className="settings-card-title">Account &amp; Platform Info</h2>
        <p className="settings-card-sub">Your Bodyline SaaS tenant details</p>
      </div>

      <div className="profile-fields-view">
        <div className="profile-field-row">
          <span className="profile-field-label">Gym Subdomain</span>
          <span className="profile-field-value">
            {isLoading ? "Loading..." : gym ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Globe size={14} className="text-muted" />
                <a href={`http://${gym.slug}.localhost:3000`} target="_blank" rel="noreferrer" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
                  {gym.slug}.bodyline.in
                </a>
                <button
                  type="button"
                  className="btn-ghost-sm"
                  style={{ padding: "4px", minWidth: "auto", minHeight: "auto", border: "none" }}
                  onClick={() => {
                    navigator.clipboard.writeText(`${gym.slug}.bodyline.in`);
                  }}
                  title="Copy URL"
                >
                  <Copy size={12} />
                </button>
              </span>
            ) : "—"}
          </span>
        </div>
        <div className="profile-field-row">
          <span className="profile-field-label">Member Since</span>
          <span className="profile-field-value">
            {isLoading ? "Loading..." : gym ? formatDateIST(gym.created_at) : "—"}
          </span>
        </div>
        <div className="profile-field-row">
          <span className="profile-field-label">Account Status</span>
          <span className="profile-field-value">
            {isLoading ? "Loading..." : gym ? (
              <StatusPill
                type={gym.is_active ? "active" : "inactive"}
                label={gym.is_active ? "Active" : "Inactive"}
              />
            ) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUPPORT CARD
// ============================================================================

function SupportCard() {
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h2 className="settings-card-title">Support &amp; Help</h2>
        <p className="settings-card-sub">Get assistance with your Bodyline platform</p>
      </div>
      
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <a 
          href="https://wa.me/919876543210?text=Hi+Bodyline+Support" 
          target="_blank" 
          rel="noreferrer"
          className="btn-solid"
          style={{ display: "flex", justifyContent: "center", textDecoration: "none", background: "var(--accent-green)", color: "#000" }}
        >
          <MessageSquare size={16} />
          WhatsApp Support
        </a>
        <a 
          href="mailto:support@bodyline.in" 
          className="btn-ghost-sm"
          style={{ display: "flex", justifyContent: "center", textDecoration: "none", border: "1px solid var(--border)" }}
        >
          <Mail size={16} />
          Email Support
        </a>
      </div>
      
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
        Bodyline SaaS v1.0.0
      </div>
    </div>
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

      <div className="security-section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 className="security-section-title">Sign Out</h3>
          <p className="security-section-desc" style={{ marginBottom: 0 }}>You will be redirected to the login page.</p>
        </div>
        <button className="btn-danger" onClick={handleSignOut}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// GYM SETTINGS TAB
// ============================================================================

const COLOR_LABELS: Record<string, string> = {
  "#3b82f6": "Ocean Blue",
  "#8b5cf6": "Amethyst Purple",
  "#10b981": "Emerald Green",
  "#f97316": "Sunset Orange",
  "#64748b": "Graphite Slate",
};

function GymSettingsTab() {
  const { data: gymSettings, isLoading, error } = useGymSettings();
  const { data: gym } = useGym();
  const updateGymSettings = useUpdateGymSettings();

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | undefined>(undefined);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<GymSettingsFormData>({
    resolver: zodResolver(gymSettingsSchema),
    defaultValues: {
      gym_display_name: "",
      tagline: "",
      primary_color: "#3b82f6",
      whatsapp_number: "",
      upi_id: "",
      logo_url: "",
    },
  });

  // Populate form once gym settings are loaded
  useEffect(() => {
    if (gymSettings) {
      setLogoPreview(gymSettings.logo_url ?? null);
      reset({
        gym_display_name: gymSettings.gym_display_name ?? "",
        tagline: gymSettings.tagline ?? "",
        primary_color: (gymSettings.primary_color as GymSettingsFormData["primary_color"]) ?? "#3b82f6",
        whatsapp_number: gymSettings.whatsapp_number ?? "",
        upi_id: gymSettings.upi_id ?? "",
        logo_url: gymSettings.logo_url ?? "",
      });
    }
  }, [gymSettings, reset]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setIsUploadingLogo(true);
    try {
      if (!gym?.id) throw new Error("Gym ID not found");
      const url = await uploadGymLogo(gym.id, file);
      setPendingLogoUrl(url);
      setValue("logo_url", url, { shouldDirty: true });
    } catch {
      setLogoPreview(gymSettings?.logo_url ?? null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = (data: GymSettingsFormData) => {
    // Always merge the pendingLogoUrl if we just uploaded one.
    // We add a cache-busting timestamp so the CDN always serves the fresh image.
    const logoUrl = pendingLogoUrl
      ? `${pendingLogoUrl.split("?")[0]}?t=${Date.now()}`
      : data.logo_url;

    updateGymSettings.mutate(
      { ...data, logo_url: logoUrl },
      {
        onSuccess: () => {
          setPendingLogoUrl(undefined);
        },
      }
    );
  };

  // Has the user made any changes — either to text fields or uploaded a new logo?
  const hasChanges = isDirty || pendingLogoUrl !== undefined;

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        Loading gym settings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        Failed to load gym settings: {error.message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Hidden input ensures RHF tracks this field for isDirty computation */}
      <input type="hidden" {...register("logo_url")} />

      {/* ── Branding & Identity ── */}
      <div className="settings-card" style={{ marginBottom: 24 }}>
        <div className="settings-card-header">
          <h2 className="settings-card-title">Branding &amp; Identity</h2>
          <p className="settings-card-sub">
            Customize how your gym appears across the platform
          </p>
        </div>

        {/* ── Gym Logo Upload ── */}
        <div className="gym-logo-upload-row">
          <div
            className="gym-logo-upload-zone"
            onClick={() => logoInputRef.current?.click()}
            title="Click to upload gym logo"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Gym Logo" className="gym-logo-preview-img" />
            ) : (
              <div className="gym-logo-placeholder">
                <ImagePlus size={24} style={{ opacity: 0.5 }} />
              </div>
            )}
            <div className="gym-logo-overlay">
              {isUploadingLogo ? (
                <div className="avatar-upload-spinner" />
              ) : (
                <Camera size={14} />
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              style={{ display: "none" }}
              onChange={handleLogoChange}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
              Gym Logo
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              PNG, JPG, SVG or WEBP — used on the member portal and invoices.<br />
              Recommended: square, min 200×200px.
            </div>
            {pendingLogoUrl !== undefined && !isUploadingLogo && (
              <div style={{ fontSize: 12, color: "var(--accent-green)", marginTop: 6 }}>
                ✓ Logo ready — save to apply
              </div>
            )}
            {isUploadingLogo && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                Uploading...
              </div>
            )}
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Gym Display Name</label>
            <input
              {...register("gym_display_name")}
              className="form-input"
              placeholder="e.g. Bodyline Fitness"
            />
            {errors.gym_display_name && (
              <span className="form-error">{errors.gym_display_name.message}</span>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">Tagline</label>
            <input
              {...register("tagline")}
              className="form-input"
              placeholder="e.g. Stronger Every Day"
            />
            {errors.tagline && (
              <span className="form-error">{errors.tagline.message}</span>
            )}
          </div>
        </div>

        {/* ── Color Swatch Picker ── */}
        <div className="form-field" style={{ marginTop: 20 }}>
          <label className="form-label">Accent Color</label>
          <Controller
            name="primary_color"
            control={control}
            render={({ field }) => (
              <div className="gym-color-swatches">
                {ALLOWED_PRIMARY_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`gym-color-swatch ${field.value === hex ? "selected" : ""}`}
                    style={{ "--swatch-color": hex } as React.CSSProperties}
                    onClick={() => field.onChange(hex)}
                    title={COLOR_LABELS[hex]}
                    aria-label={`Select ${COLOR_LABELS[hex]} accent color`}
                    aria-pressed={field.value === hex}
                  >
                    {field.value === hex && <Check size={14} strokeWidth={3} />}
                  </button>
                ))}
                <span className="gym-color-label">
                  {COLOR_LABELS[field.value] ?? field.value}
                </span>
              </div>
            )}
          />
          {errors.primary_color && (
            <span className="form-error">{errors.primary_color.message}</span>
          )}
        </div>
      </div>

      {/* ── Contact & Payments ── */}
      <div className="settings-card" style={{ marginBottom: 24 }}>
        <div className="settings-card-header">
          <h2 className="settings-card-title">Contact &amp; Payments</h2>
          <p className="settings-card-sub">
            WhatsApp reminder channel and UPI collection details
          </p>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">WhatsApp Number</label>
            <input
              {...register("whatsapp_number")}
              className="form-input"
              placeholder="e.g. 9876543210"
              inputMode="tel"
            />
            <span className="form-hint">
              Digits only — used to send payment reminders via WhatsApp
            </span>
            {errors.whatsapp_number && (
              <span className="form-error">{errors.whatsapp_number.message}</span>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">UPI ID</label>
            <input
              {...register("upi_id")}
              className="form-input"
              placeholder="e.g. gymname@upi"
            />
            <span className="form-hint">
              Displayed to members when recording payments
            </span>
            {errors.upi_id && (
              <span className="form-error">{errors.upi_id.message}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Save Actions ── */}
      <div className="form-actions">
        {hasChanges && (
          <span className="form-unsaved-hint">You have unsaved changes</span>
        )}
        <button
          type="submit"
          className="btn-solid"
          disabled={updateGymSettings.isPending || !hasChanges}
        >
          {updateGymSettings.isPending ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// PLANS TAB
// ============================================================================

function PlansTab() {
  const { data: plans, isLoading, error } = useAllPlans();
  const deactivatePlan = useDeactivatePlan();
  const restorePlan = useRestorePlan();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        Loading plans...
      </div>
    );
  }

  if (error) {
    return <div className="error-screen">Failed to load plans: {error.message}</div>;
  }

  const activePlans = plans?.filter((p) => p.is_active) ?? [];
  const inactivePlans = plans?.filter((p) => !p.is_active) ?? [];

  const handleEdit = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const handleDeactivateConfirm = (id: string) => {
    deactivatePlan.mutate(id, {
      onSuccess: () => setConfirmDeactivateId(null),
    });
  };

  return (
    <>
      <div className="settings-card">
        <div
          className="settings-card-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}
        >
          <div>
            <h2 className="settings-card-title">Membership Plans</h2>
            <p className="settings-card-sub">Configure pricing packages for your gym</p>
          </div>
          <button className="btn-solid" onClick={handleAdd}>
            <Plus size={14} />
            <span className="text-desktop">Add Plan</span>
          </button>
        </div>

        {/* ── Active Plans ── */}
        <div className="plans-section">
          <h3 className="plans-section-title">Active Plans</h3>
          {activePlans.length === 0 ? (
            <div className="plans-empty">
              No active plans. Add your first plan to get started.
            </div>
          ) : (
            <div className="plans-list">
              {activePlans.map((plan) => (
                <div key={plan.id}>
                  <div className="plan-row">
                    <div className="plan-info">
                      <div className="plan-name">{plan.name}</div>
                      <div className="plan-meta">
                        {plan.duration_days} days
                        <span className="plan-meta-dot">·</span>
                        {formatINR(plan.price)}
                        {plan.max_freeze_days > 0 && (
                          <>
                            <span className="plan-meta-dot">·</span>
                            Freeze: {plan.max_freeze_days}d
                          </>
                        )}
                        {plan.description && (
                          <>
                            <span className="plan-meta-dot">·</span>
                            <span className="plan-description">{plan.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="plan-actions">
                      <button
                        className="btn-ghost-sm"
                        onClick={() => handleEdit(plan)}
                        title="Edit plan"
                      >
                        <PenSquare size={14} />
                      </button>
                      <button
                        className="btn-ghost-sm plan-deactivate-btn"
                        onClick={() => setConfirmDeactivateId(plan.id)}
                        title="Deactivate plan"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Inline deactivation confirmation */}
                  {confirmDeactivateId === plan.id && (
                    <div className="plan-confirm-strip">
                      <span>Deactivate &ldquo;{plan.name}&rdquo;? Members already on this plan are unaffected.</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn-ghost-sm"
                          onClick={() => setConfirmDeactivateId(null)}
                          disabled={deactivatePlan.isPending}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: "7px 14px", minHeight: 36 }}
                          onClick={() => handleDeactivateConfirm(plan.id)}
                          disabled={deactivatePlan.isPending}
                        >
                          {deactivatePlan.isPending ? "Deactivating..." : "Confirm"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Deactivated Plans ── */}
        {inactivePlans.length > 0 && (
          <>
            <div className="security-divider" />
            <div className="plans-section">
              <h3 className="plans-section-title" style={{ color: "var(--text-muted)" }}>Deactivated Plans</h3>
              <div className="plans-list">
                {inactivePlans.map((plan) => (
                  <div key={plan.id} className="plan-row inactive">
                    <div className="plan-info">
                      <div className="plan-name">{plan.name}</div>
                      <div className="plan-meta">
                        {plan.duration_days} days
                        <span className="plan-meta-dot">·</span>
                        {formatINR(plan.price)}
                      </div>
                    </div>
                    <div className="plan-actions">
                      <button
                        className="btn-ghost-sm"
                        onClick={() => restorePlan.mutate(plan.id)}
                        disabled={restorePlan.isPending}
                        title="Restore plan"
                      >
                        <RotateCcw size={14} />
                        <span className="text-desktop">Restore</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Footer hint ── */}
        <div className="plans-hint">
          <span style={{ fontSize: 16 }}>ⓘ</span>
          Deactivated plans are hidden and cannot be assigned to new members. Existing memberships on deactivated plans remain unaffected.
        </div>
      </div>

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPlan={selectedPlan}
      />
    </>
  );
}
