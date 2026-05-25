"use client";

// ============================================================
// components/ui/Nav.tsx
// Global navigation bar — works for owner, trainer, and member roles.
//
// CSS: all styles live in app/globals.css (/* Navigation */ section).
// Fetches: gym name from useGymSettings, user name from Supabase auth.
// Mobile (≤640px): top bar shows logo + LogOut icon only.
//   Owner role gets a fixed bottom tab bar (5 Lucide-icon tabs).
//   Tab label is visible only on the active tab.
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGymSettings } from "@/hooks/useGymSettings";
import {
  LayoutDashboard, Users, CreditCard, CalendarCheck, Dumbbell, LogOut, Settings
} from "lucide-react";

// Module-level — createClient() is not recreated on every render.
const supabase = createClient();

// Links are role-scoped — trainers and members see their own portals only.
const ROLE_LINKS: Record<NavProps["role"], { href: string; label: string }[]> = {
  owner: [
    { href: "/dashboard",            label: "Dashboard"  },
    { href: "/dashboard/members",    label: "Members"    },
    { href: "/dashboard/payments",   label: "Payments"   },
    { href: "/dashboard/attendance", label: "Attendance" },
    { href: "/dashboard/trainers",   label: "Trainers"   },
    { href: "/dashboard/settings",   label: "Settings"   },
  ],
  trainer: [{ href: "/trainer", label: "My Portal"  }],
  member:  [{ href: "/member",  label: "My Profile" }],
};

// Lucide icon for each owner route — used by the mobile bottom tab bar.
const OWNER_TAB_ICONS: Record<string, React.ReactNode> = {
  "/dashboard":            <LayoutDashboard size={20} />,
  "/dashboard/members":    <Users           size={20} />,
  "/dashboard/payments":   <CreditCard      size={20} />,
  "/dashboard/attendance": <CalendarCheck   size={20} />,
  "/dashboard/trainers":   <Dumbbell        size={20} />,
  "/dashboard/settings":   <Settings        size={20} />,
};

interface NavProps {
  role: "owner" | "trainer" | "member";
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "");
  let r = 74, g = 222, b = 128; // Default to #4ade80 green
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex.substring(0, 1).repeat(2), 16);
    g = parseInt(cleanHex.substring(1, 2).repeat(2), 16);
    b = parseInt(cleanHex.substring(2, 3).repeat(2), 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function Nav({ role }: NavProps) {
  const pathname = usePathname();
  const { data: settings } = useGymSettings();
  const [displayName, setDisplayName] = useState<string>("");

  // Self-contained user name fetch — no prop needed from parent pages.
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name =
        user?.user_metadata?.full_name ??
        user?.email?.split("@")[0] ??
        "";
      setDisplayName(name);
    });
  }, []);

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const links = ROLE_LINKS[role];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const primaryColor = settings?.primary_color || "#4ade80";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --accent-green: ${primaryColor};
          --accent-green-dim: ${hexToRgba(primaryColor, 0.12)};
          --accent-green-border: ${hexToRgba(primaryColor, 0.2)};
        }
      `}} />
      <nav className="nav">
        <div className="nav-logo">
          {settings?.gym_display_name ?? "Gym"}<span>.</span>
        </div>

        {/* Desktop horizontal nav links — hidden on ≤640px (bottom tab bar takes over) */}
        <div className="nav-links" aria-label="Navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="nav-meta">
          <span className="nav-owner-text">
            {displayName} · {roleLabel}
          </span>
          {role === "owner" && (
            <Link
              href="/dashboard/settings"
              className={`sign-out-icon-btn ${pathname === "/dashboard/settings" ? "active" : ""}`}
              style={{ display: "flex", marginLeft: 4 }}
              title="Profile & Settings"
              aria-label="Settings"
            >
              <Settings size={16} />
            </Link>
          )}
          {/* Desktop: text sign-out button */}
          <button onClick={handleSignOut} className="sign-out-link sign-out-text">
            Sign out
          </button>
          {/* Mobile: icon-only sign-out button */}
          <button
            onClick={handleSignOut}
            className="sign-out-icon-btn"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar — owner only, visible at ≤640px ── */}
      {role === "owner" && (
        <nav className="mobile-tab-bar" aria-label="Mobile navigation">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-tab ${isActive ? "active" : ""}`}
                aria-label={link.label}
              >
                {OWNER_TAB_ICONS[link.href]}
                {isActive && (
                  <span className="mobile-tab-label">{link.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
