"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGymSettings } from "@/hooks/useGymSettings";
import { LogOut } from "lucide-react";

interface NavProps {
  role: "owner" | "trainer" | "member";
  userName?: string;
}

export function Nav({ role, userName }: NavProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const { data: settings } = useGymSettings();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const links = role === "owner" 
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/members", label: "Members" },
        { href: "/dashboard/payments", label: "Payments" },
        { href: "/dashboard/trainers", label: "Trainers" },
      ]
    : role === "trainer" ? [{ href: "/trainer", label: "My Portal" }] : [{ href: "/member", label: "My Profile" }];

  return (
    <nav className="nav">
      <style>{`
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 32px;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .nav-logo {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }
        .nav-logo span { color: var(--accent-green); }
        .nav-links {
          display: flex;
          gap: 4px;
        }
        .nav-link {
          font-size: 13px;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          transition: all 0.15s;
          font-weight: 400;
        }
        .nav-link:hover { background: var(--bg3); color: var(--text-primary); }
        .nav-link.active {
          background: var(--bg3);
          color: var(--text-primary);
          font-weight: 500;
        }
        .nav-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .nav-owner-text {
          font-size: 13px;
          color: var(--text-muted);
        }
        .sign-out-link {
          font-size: 12px;
          color: var(--text-muted);
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 5px 12px;
          cursor: pointer;
          font-family: var(--font-body);
        }
      `}</style>

      <div className="nav-logo">
        {settings?.gym_display_name || "Bodyline"}<span>.</span>
      </div>
      
      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={`nav-link ${pathname === link.href ? "active" : ""}`}>
            {link.label}
          </Link>
        ))}
      </div>

      <div className="nav-meta">
        <span className="nav-owner-text">{userName} · {role}</span>
        <button onClick={handleSignOut} className="sign-out-link">
          Sign out
        </button>
      </div>
    </nav>
  );
}
