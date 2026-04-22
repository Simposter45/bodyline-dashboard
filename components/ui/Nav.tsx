"use client";

// ============================================================
// components/ui/Nav.tsx
// Global navigation bar — works for owner, trainer, and member roles.
//
// CSS: all styles live in app/globals.css (/* Navigation */ section).
// Fetches: gym name from useGymSettings, user name from Supabase auth.
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGymSettings } from "@/hooks/useGymSettings";

// Module-level — createClient() is not recreated on every render.
const supabase = createClient();

// Links are role-scoped — trainers and members see their own portals only.
const ROLE_LINKS: Record<NavProps["role"], { href: string; label: string }[]> = {
  owner: [
    { href: "/dashboard",           label: "Dashboard" },
    { href: "/dashboard/members",   label: "Members"   },
    { href: "/dashboard/payments",  label: "Payments"  },
    { href: "/dashboard/trainers",  label: "Trainers"  },
  ],
  trainer: [{ href: "/trainer", label: "My Portal"  }],
  member:  [{ href: "/member",  label: "My Profile" }],
};

interface NavProps {
  role: "owner" | "trainer" | "member";
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

  return (
    <nav className="nav">
      <div className="nav-logo">
        {settings?.gym_display_name ?? "Gym"}<span>.</span>
      </div>

      <div className="nav-links">
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
        <button onClick={handleSignOut} className="sign-out-link">
          Sign out
        </button>
      </div>
    </nav>
  );
}
