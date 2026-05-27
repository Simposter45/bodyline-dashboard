"use client";

import "./trainer.css";
import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import TrainerNav from "./components/TrainerNav";
import BottomTabBar, { type TrainerTab } from "./components/BottomTabBar";
import HomeTab from "./tabs/HomeTab";
import MembersTab from "./tabs/MembersTab";
import SessionsTab from "./tabs/SessionsTab";

import { useTrainerSelf } from "@/hooks/useTrainerSelf";
import { useGymSettings } from "@/hooks/useGymSettings";
import { useAssignedMembers } from "@/hooks/useAssignedMembers";

// Tab content components — imported lazily via normal imports for now.
// Will be replaced with next/dynamic if bundle size warrants it.
// Each tab is built in subsequent phases (FEAT-010e through FEAT-010i).

// Placeholder stubs — replaced one-by-one as each phase lands
function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "40vh",
      gap: 12,
      color: "var(--text-muted)",
      textAlign: "center",
    }}>
      <span style={{ fontSize: "2rem", opacity: 0.3 }}>🔨</span>
      <p style={{ fontSize: 14, fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Coming in the next phase</p>
    </div>
  );
}
export default function TrainerPortal() {
  const [activeTab, setActiveTab] = useState<TrainerTab>("home");

  // ── Identity ────────────────────────────────────────────────
  const { data: trainer, isLoading: trainerLoading, error: trainerError } = useTrainerSelf();
  const { data: gymSettings } = useGymSettings();

  // ── Roster (needed for badge + Home stats + Members Tab) ──
  const { data: assignedMembers = [], isLoading: isMembersLoading } = useAssignedMembers(trainer?.id);

  // ── Overdue badge count for Members tab ─────────────────────
  const overdueCount = useMemo(
    () =>
      assignedMembers.filter(
        (m) =>
          m.current_membership?.payment_status === "overdue" ||
          m.current_membership?.payment_status === "pending",
      ).length,
    [assignedMembers],
  );

  // ── Loading ──────────────────────────────────────────────────
  if (trainerLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        Loading your portal...
      </div>
    );
  }

  // ── Error / no profile ───────────────────────────────────────
  if (trainerError || !trainer) {
    const msg =
      trainerError instanceof Error
        ? trainerError.message
        : "Trainer profile not found for this account.";

    return (
      <div className="error-screen">
        <div className="error-card">
          <div className="error-icon">
            <AlertTriangle size={22} />
          </div>
          <p className="error-title">Portal Access Error</p>
          <p className="error-message">{msg}</p>
          <p className="error-message" style={{ fontSize: 12 }}>
            Ask the gym owner to provision your portal login.
          </p>
        </div>
      </div>
    );
  }

  // ── Tab routing ──────────────────────────────────────────────
  function renderTab() {
    switch (activeTab) {
      case "home":
        return (
          <HomeTab
            trainer={trainer!}
            assignedMembers={assignedMembers}
            isMembersLoading={false}
            onNavigateToMembers={() => setActiveTab("members")}
          />
        );
      case "members":
        return (
          <MembersTab
            trainer={trainer!}
            assignedMembers={assignedMembers}
            isLoading={isMembersLoading}
          />
        );
      case "sessions":
        return (
          <SessionsTab
            trainer={trainer!}
            assignedMembers={assignedMembers}
          />
        );
      case "settings":
        return <ComingSoon label="Settings Tab — Phase 8 (FEAT-010i)" />;
      default:
        return null;
    }
  }

  return (
    <>
      <TrainerNav
        trainer={trainer}
        gymSettings={gymSettings ?? null}
        onAvatarClick={() => setActiveTab("settings")}
      />

      <main className="trainer-page">
        <div className="trainer-tab-content" key={activeTab}>
          {renderTab()}
        </div>
      </main>

      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        overdueCount={overdueCount}
      />
    </>
  );
}
