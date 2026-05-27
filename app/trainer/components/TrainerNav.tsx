"use client";

import "./TrainerNav.css";
import { createClient } from "@/lib/supabase/client";
import type { Trainer } from "@/types";
import type { GymSettings } from "@/types";

const supabase = createClient();

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

interface TrainerNavProps {
  trainer: Trainer;
  gymSettings: GymSettings | null;
  /** Called when the avatar is clicked — navigates to the Settings tab */
  onAvatarClick?: () => void;
}

export default function TrainerNav({
  trainer,
  gymSettings,
  onAvatarClick,
}: TrainerNavProps) {
  const gymName = gymSettings?.gym_display_name ?? "Bodyline";
  const logoUrl = gymSettings?.logo_url ?? null;
  const initials = getInitials(trainer.full_name);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <nav className="trainer-nav">
      {/* Left: gym brand */}
      <div className="trainer-nav-brand">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={gymName}
            className="trainer-nav-logo-img"
          />
        ) : (
          <div className="trainer-nav-logo-fallback">
            {gymName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="trainer-nav-gym-name">{gymName}</span>
      </div>

      {/* Center: role pill */}
      <span className="trainer-nav-role-pill">Trainer Portal</span>

      {/* Right: trainer identity + sign-out */}
      <div className="trainer-nav-right">
        <span className="trainer-nav-name">{trainer.full_name}</span>

        {/* Avatar — tappable on mobile to reach Settings */}
        <button
          className="trainer-nav-avatar"
          onClick={onAvatarClick}
          title="Settings"
          aria-label="Open Settings"
        >
          {initials}
        </button>

        <button className="trainer-nav-signout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
