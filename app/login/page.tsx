"use client";

import "./login.css";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useGymSettings } from "@/hooks/useGymSettings";
import { usePublicGymStats } from "@/hooks/usePublicGymStats";

const supabase = createClient();

type Role = "member" | "trainer" | "owner";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gymSlug, setGymSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    // 1. Check if the landing page passed a specific gym in the URL (?gym=xyz)
    const paramSlug = searchParams.get("gym");

    if (paramSlug) {
      setGymSlug(paramSlug);
    } else if (typeof window !== "undefined") {
      // 2. Otherwise detect subdomain (e.g., gym1.localhost:3000)
      const parts = window.location.hostname.split(".");
      if (parts.length > 1 && parts[0] !== "www" && parts[0] !== "localhost") {
        setGymSlug(parts[0]);
      } else {
        setGymSlug(undefined); // Unscoped global portal
      }
    }
  }, [searchParams]);

  const { data: settings, isLoading: isSettingsLoading } = useGymSettings(gymSlug ? { gymSlug } : undefined);

  // Micro-cache for fast reload
  const [cachedName, setCachedName] = useState<string | null>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("pwa_gym_name");
    return null;
  });
  const [cachedColor, setCachedColor] = useState<string | null>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("pwa_gym_color");
    return null;
  });

  useEffect(() => {
    if (settings) {
      if (settings.gym_display_name) sessionStorage.setItem("pwa_gym_name", settings.gym_display_name);
      if (settings.primary_color) sessionStorage.setItem("pwa_gym_color", settings.primary_color);
      setCachedName(settings.gym_display_name);
      setCachedColor(settings.primary_color);
    }
  }, [settings]);

  const displayName = settings?.gym_display_name || cachedName;
  const displayColor = settings?.primary_color || cachedColor;
  const isBrandingLoading = !displayName && isSettingsLoading;

  // null = settings still loading (query held); string = ready to fetch
  const { data: gymStats } = usePublicGymStats(settings?.gym_id ?? null);

  const ROLE_CONFIG: Record<
    Role,
    { label: string; placeholder: string; hint: string; accent: string }
  > = {
    owner: {
      label: "Owner",
      placeholder: `owner@${displayName?.toLowerCase().replace(/\s+/g, "") || "example"}.in`,
      hint: "Full dashboard access",
      accent: displayColor || "#4ade80",
    },
    trainer: {
      label: "Trainer",
      placeholder: `trainer@${displayName?.toLowerCase().replace(/\s+/g, "") || "example"}.in`,
      hint: "View your schedule & members",
      accent: "#60a5fa",
    },
    member: {
      label: "Member",
      placeholder: "you@example.com",
      hint: "Check plans & book sessions",
      accent: "#fbbf24",
    },
  };

  const cfg = ROLE_CONFIG[role];

  async function handleLogin() {
    setError(null);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError(authError?.message ?? "Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const user = data.user;
    const rawRole = (user.app_metadata?.role as string) || (user.user_metadata?.role as string);
    const resolvedRole = ["owner", "trainer", "member"].includes(rawRole) ? rawRole : "member";

    if (resolvedRole === "owner") router.push("/dashboard");
    else if (resolvedRole === "trainer") router.push("/trainer");
    else router.push("/member");
  }

  function switchRole(r: Role) {
    setRole(r);
    setEmail("");
    setPassword("");
    setError(null);
  }

  const accentColor = cfg.accent;

  if (isBrandingLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div
      className="login-root"
      style={{"--accent-current": accentColor} as React.CSSProperties}
    >
      {/* ── Left decorative panel ── */}
      <div className="login-left">
        <Link href="/" className="left-logo">
          <>{displayName ? displayName.split(" ")[0] : "Gym"}<span>.</span></>
        </Link>

        <div className="left-visual">
          <div className="left-rings">
            <div className="left-ring" />
            <div className="left-ring" />
            <div className="left-ring" />
            <div className="left-ring" />
            <div className="left-ring" />
            <div className="left-ring-center">
              <div className="left-ring-dot" />
            </div>
          </div>
        </div>

        <div className="left-copy">
          <p className="left-quote">
            Your gym.
            <br />
            <span>Fully in control.</span>
          </p>
          <p className="left-sub">
            Manage members, trainers, payments and bookings from one place —
            built for {displayName || "your gym"}.
          </p>
          <div className="left-stats">
            <div>
              <div className="left-stat-val">
                {settings?.branches?.length ?? "—"}
              </div>
              <div className="left-stat-label">
                {(settings?.branches?.length ?? 0) === 1 ? "Location" : "Locations"}
              </div>
            </div>
            <div>
              <div className="left-stat-val">
                {gymStats ? gymStats.memberCount : "—"}
              </div>
              <div className="left-stat-label">Members</div>
            </div>
            <div>
              <div className="left-stat-val">
                {gymStats ? gymStats.trainerCount : "—"}
              </div>
              <div className="left-stat-label">Trainers</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          <Link href="/" className="mobile-logo">
            <>{displayName ? displayName.split(" ")[0] : "Gym"}<span>.</span></>
          </Link>

          <p className="form-eyebrow">Welcome back</p>
          <h1 className="form-heading">
            Sign in as
            <br />
            <span>{cfg.label}</span>
          </h1>

          {/* Role tabs */}
          <div className="role-tabs">
            <div 
              className="role-tab-active-bg" 
              style={{
                transform: `translateX(${["owner", "trainer", "member"].indexOf(role) * 100}%)`
              }}
            />
            {(["owner", "trainer", "member"] as Role[]).map((r) => (
              <button
                key={r}
                className={`role-tab ${role === r ? "active" : ""}`}
                onClick={() => switchRole(r)}
              >
                <span
                  className="role-tab-dot"
                  style={{ background: ROLE_CONFIG[r].accent }}
                />
                {ROLE_CONFIG[r].label}
              </button>
            ))}
          </div>

          {/* Role hint */}
          <div className="role-hint">
            <div
              className="role-hint-dot"
              style={{ background: accentColor }}
            />
            {cfg.hint}
          </div>

          {/* Email */}
          <div className="field">
            <label className="field-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="field-input"
              placeholder={cfg.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="field">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) handleLogin();
              }}
            />
          </div>

          {/* Error */}
          {error && <div className="error-box">{error}</div>}

          {/* Submit */}
          <button
            className="btn-login"
            onClick={handleLogin}
            disabled={loading || !email || !password}
          >
            <div className="btn-login-inner">
              {loading && <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
              {loading ? "Signing in…" : `Sign in as ${cfg.label}`}
            </div>
          </button>

          {/* Footer */}
          <div className="form-footer">
            <Link href="/">← Back to {displayName ? displayName.toLowerCase().replace(/\s+/g, "") + ".in" : "gym website"}</Link>
            &nbsp;·&nbsp;
            <Link href="/onboarding">New member? Join now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="loading-screen"><div className="loading-spinner"/></div>}>
      <LoginContent />
    </Suspense>
  );
}
