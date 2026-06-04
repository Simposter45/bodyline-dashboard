"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

import MemberNav from "./components/MemberNav";
import MemberBottomTabBar from "./components/MemberBottomTabBar";
import CardTab from "./tabs/CardTab";
import HistoryTab from "./tabs/HistoryTab";
import SessionsTab from "./tabs/SessionsTab";
import AccountTab from "./tabs/AccountTab";

import { useMemberProfile } from "@/hooks/useMemberProfile";
import { useMemberMembership } from "@/hooks/useMemberMembership";
import { useGymSettings } from "@/hooks/useGymSettings";

// Global reset styles are managed via Next.js global layout or layout.tsx.
// We just scope our internal layout classes here.
const pageLayoutStyles = `
  .member-portal-layout {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text-primary);
    padding-bottom: 90px; /* Room for BottomTabBar */
  }

  .member-portal-content {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
  }
`;

export default function MemberPortalOrchestrator() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"card" | "history" | "sessions" | "account">("card");
  const [guestId, setGuestId] = useState<string | null>(null);

  // Extract ?guest=<id> from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guest = params.get("guest");
    if (guest) setGuestId(guest);
  }, []);

  // Fetch Member Profile
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useMemberProfile(guestId);

  // Fetch Active Membership (only if profile exists)
  const { data: membership } = useMemberMembership(profile?.id ?? null);

  const { data: gymSettings } = useGymSettings();

  // Authentication Enforcement
  useEffect(() => {
    // If not loading, and no profile found, redirect to login
    if (!isProfileLoading && !profile && !guestId) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user) {
          router.replace("/login");
        }
      });
    }
  }, [isProfileLoading, profile, guestId, router]);

  // Loading State
  if (isProfileLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <Loader2 className="spin" size={32} style={{ color: "var(--accent-amber)" }} />
      </div>
    );
  }

  // Error State (e.g., profile not found)
  if (profileError || !profile) {
    const handleForceSignOut = async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
    };

    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: "16px", padding: "24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-primary)", fontSize: "16px" }}>
          Member profile not found.
        </p>
        <button
          onClick={handleForceSignOut}
          style={{ background: "var(--bg2)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}
        >
          Sign Out & Return to Login
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{pageLayoutStyles}</style>

      <div className="member-portal-layout">
        {/* Top Navigation */}
        <MemberNav member={profile} gymSettings={gymSettings ?? null} />

        {/* Tab Content */}
        <main className="member-portal-content">
          {activeTab === "card" && (
            <CardTab member={profile} membership={membership ?? null} />
          )}

          {activeTab === "history" && (
            <HistoryTab memberId={profile.id} />
          )}

          {activeTab === "sessions" && (
            <SessionsTab member={profile} />
          )}

          {activeTab === "account" && (
            <AccountTab member={profile} />
          )}
        </main>

        {/* Bottom Tab Bar */}
        <MemberBottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
}
