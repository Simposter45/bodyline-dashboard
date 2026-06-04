"use client";

import "./MemberBottomTabBar.css";
import {
  CreditCard,
  CalendarDays,
  Dumbbell,
  User,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

export type MemberTab = "card" | "history" | "sessions" | "account";

interface Tab {
  id: MemberTab;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}

const TABS: Tab[] = [
  { id: "card",     label: "My Card",  Icon: CreditCard },
  { id: "history",  label: "History",  Icon: CalendarDays },
  { id: "sessions", label: "Sessions", Icon: Dumbbell },
  { id: "account",  label: "Account",  Icon: User },
];

// ── Props ─────────────────────────────────────────────────────────────

interface MemberBottomTabBarProps {
  activeTab: MemberTab;
  onTabChange: (tab: MemberTab) => void;
}

// ── Component ─────────────────────────────────────────────────────────

export default function MemberBottomTabBar({
  activeTab,
  onTabChange,
}: MemberBottomTabBarProps) {
  return (
    <nav
      className="member-tab-bar"
      role="tablist"
      aria-label="Member portal navigation"
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            className={`member-tab${isActive ? " active" : ""}`}
            onClick={() => onTabChange(id)}
          >
            <Icon size={20} />
            <span className="member-tab-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
