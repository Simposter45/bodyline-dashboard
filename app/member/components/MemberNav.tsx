"use client";

import "./MemberNav.css";
import { createClient } from "@/lib/supabase/client";
import type { GymSettings, MemberProfilePortal } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Props ─────────────────────────────────────────────────────────────

interface MemberNavProps {
  member: MemberProfilePortal;
  gymSettings: GymSettings | null;
}

// ── Component ─────────────────────────────────────────────────────────

export default function MemberNav({ member, gymSettings }: MemberNavProps) {
  const gymName = gymSettings?.gym_display_name ?? "Bodyline";
  const logoUrl = gymSettings?.logo_url ?? null;
  const firstName = member.full_name.split(" ")[0];
  const initials = getInitials(member.full_name);
  const avatarUrl = member.profile_photo_url ?? null;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <nav className="member-nav">
      {/* Left: gym brand */}
      <div className="member-nav-brand">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={gymName}
            className="member-nav-logo-img"
          />
        ) : (
          <div className="member-nav-logo-fallback">
            {gymName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="member-nav-gym-name">{gymName}</span>
      </div>

      {/* Center: role pill */}
      <span className="member-nav-role-pill">Member Portal</span>

      {/* Right: member identity + sign-out */}
      <div className="member-nav-right">
        <span className="member-nav-name">{firstName}</span>

        {/* Avatar — initials or profile photo */}
        <div className="member-nav-avatar" aria-label={member.full_name}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={member.full_name} />
          ) : (
            initials
          )}
        </div>

        <button
          className="member-nav-signout"
          onClick={handleSignOut}
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
