"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Role = "member" | "trainer" | "owner";

const ROLE_CONFIG: Record<
  Role,
  { label: string; placeholder: string; hint: string; accent: string }
> = {
  owner: {
    label: "Owner",
    placeholder: "pradeep@bodyline.in",
    hint: "Full dashboard access",
    accent: "#4ade80",
  },
  trainer: {
    label: "Trainer",
    placeholder: "trainer@bodyline.in",
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

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const userEmail = data.user.email ?? "";

    // Route by email identity
    if (userEmail === "pradeep@bodyline.in") {
      router.push("/dashboard");
    } else if (
      [
        "karthik@bodyline.in",
        "divya@bodyline.in",
        "suresh@bodyline.in",
      ].includes(userEmail)
    ) {
      router.push("/trainer");
    } else {
      router.push("/member");
    }
  }

  // Pre-fill demo credentials on role switch
  function switchRole(r: Role) {
    setRole(r);
    setEmail("");
    setPassword("");
    setError(null);
  }

  const accentColor = cfg.accent;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:             #0d0d0f;
          --bg2:            #141417;
          --bg3:            #1c1c21;
          --border:         rgba(255,255,255,0.07);
          --border-hi:      rgba(255,255,255,0.13);
          --text-primary:   #f0efe8;
          --text-secondary: #8a8987;
          --text-muted:     #555450;
          --accent-green:   #4ade80;
          --accent-amber:   #fbbf24;
          --accent-red:     #f87171;
          --accent-blue:    #60a5fa;
          --font-display:   'Syne', sans-serif;
          --font-body:      'DM Sans', sans-serif;
          --radius:         14px;
          --radius-sm:      8px;
          --accent-current: ${accentColor};
        }

        body {
          background: var(--bg);
          color: var(--text-primary);
          font-family: var(--font-body);
          min-height: 100vh;
        }

        ::-webkit-scrollbar {
          display: none;
        }

        /* ── Layout ── */
        .login-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 768px) {
          .login-root { grid-template-columns: 1fr; }
          .login-left  { display: none; }
        }

        /* ── Left panel (decorative) ── */
        .login-left {
          background: var(--bg2);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }
        .left-logo {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          text-decoration: none;
        }
        .left-logo span { color: var(--accent-green); }

        .left-visual {
          margin: 1.5rem 0rem;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .left-rings {
          position: relative;
          width: 320px;
          height: 320px;
        }
        .left-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid var(--border);
          animation: breathe 4s ease-in-out infinite;
        }
        .left-ring:nth-child(1) { inset: 0; animation-delay: 0s; }
        .left-ring:nth-child(2) { inset: 28px; animation-delay: 0.4s; border-color: rgba(255,255,255,0.05); }
        .left-ring:nth-child(3) { inset: 56px; animation-delay: 0.8s; }
        .left-ring:nth-child(4) { inset: 84px; animation-delay: 1.2s; border-color: rgba(255,255,255,0.05); }
        .left-ring:nth-child(5) { inset: 112px; animation-delay: 1.6s; }
        .left-ring-center {
          position: absolute;
          inset: 140px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(74,222,128,0.15) 0%, transparent 70%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .left-ring-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: var(--accent-green);
          box-shadow: 0 0 24px rgba(74,222,128,0.5);
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); box-shadow: 0 0 24px rgba(74,222,128,0.5); }
          50% { transform: scale(1.3); box-shadow: 0 0 40px rgba(74,222,128,0.7); }
        }

        .left-copy {
          position: relative;
          z-index: 1;
        }
        .left-quote {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.1;
          color: var(--text-primary);
          margin-bottom: 16px;
        }
        .left-quote span { color: var(--accent-green); }
        .left-sub {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 300;
          line-height: 1.6;
          max-width: 340px;
        }
        .left-stats {
          display: flex;
          gap: 32px;
          margin-top: 40px;
        }
        .left-stat-val {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .left-stat-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 0.4rem;
        }

        /* ── Right panel (form) ── */
        .login-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
        }
        .login-form-wrap {
          width: 100%;
          max-width: 380px;
        }

        .form-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .form-heading {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.05;
          color: var(--text-primary);
          margin-bottom: 32px;
        }
        .form-heading span {
          color: var(--accent-current);
          transition: color 0.3s ease;
        }

        /* ── Role tabs ── */
        .role-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 4px;
          margin-bottom: 28px;
        }
        .role-tab {
          padding: 9px 8px;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 400;
          color: var(--text-muted);
          transition: all 0.2s ease;
          text-align: center;
          outline: none;
        }
        .role-tab:hover { color: var(--text-secondary); }
        .role-tab.active {
          background: var(--bg2);
          border: 1px solid var(--border-hi);
          color: var(--text-primary);
          font-weight: 500;
        }
        .role-tab-dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          margin-right: 6px;
          vertical-align: middle;
          margin-bottom: 1px;
        }

        /* ── Inputs ── */
        .field {
          margin-bottom: 14px;
        }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 8px;
          letter-spacing: 0.02em;
        }
        .field-input {
          width: 100%;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
          -webkit-appearance: none;
        }
        .field-input::placeholder { color: var(--text-muted); }
        .field-input:focus {
          border-color: var(--accent-current);
        }

        .role-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 20px;
          padding: 10px 14px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .role-hint-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ── Submit button ── */
        .btn-login {
          width: 100%;
          padding: 14px;
          border-radius: var(--radius-sm);
          border: none;
          background: var(--bg3);
          border: 1px solid var(--border-hi);
          color: var(--text-primary);
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
          position: relative;
          overflow: hidden;
        }
        .btn-login::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--accent-current);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .btn-login:hover::before { opacity: 0.08; }
        .btn-login:active::before { opacity: 0.14; }
        .btn-login:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-login-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: var(--text-primary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Error ── */
        .error-box {
          margin-top: 14px;
          padding: 11px 14px;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--accent-red);
          line-height: 1.4;
        }

        /* ── Footer ── */
        .form-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
        }
        .form-footer a {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.15s;
        }
        .form-footer a:hover { color: var(--text-primary); }

        /* ── Mobile logo ── */
        .mobile-logo {
          display: none;
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          text-decoration: none;
          margin-bottom: 40px;
        }
        .mobile-logo span { color: var(--accent-green); }
        @media (max-width: 768px) {
          .mobile-logo { display: block; }
        }
      `}</style>

      <div className="login-root">
        {/* ── Left decorative panel ── */}
        <div className="login-left">
          <a href="/" className="left-logo">
            Bodyline<span>.</span>
          </a>

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
              built for Bodyline.
            </p>
            <div className="left-stats">
              <div>
                <div className="left-stat-val">3</div>
                <div className="left-stat-label">Locations</div>
              </div>
              <div>
                <div className="left-stat-val">20+</div>
                <div className="left-stat-label">Members</div>
              </div>
              <div>
                <div className="left-stat-val">3</div>
                <div className="left-stat-label">Trainers</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="login-right">
          <div className="login-form-wrap">
            <a href="/" className="mobile-logo">
              Bodyline<span>.</span>
            </a>

            <p className="form-eyebrow">Welcome back</p>
            <h1 className="form-heading">
              Sign in as
              <br />
              <span>{cfg.label}</span>
            </h1>

            {/* Role tabs */}
            <div className="role-tabs">
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
                style={
                  { "--accent-current": accentColor } as React.CSSProperties
                }
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
                style={
                  { "--accent-current": accentColor } as React.CSSProperties
                }
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
                {loading && <div className="btn-spinner" />}
                {loading ? "Signing in…" : `Sign in as ${cfg.label}`}
              </div>
            </button>

            {/* Footer */}
            <div className="form-footer">
              <a href="/">← Back to bodyline.in</a>
              &nbsp;·&nbsp;
              <a href="/onboarding">New member? Join now</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
