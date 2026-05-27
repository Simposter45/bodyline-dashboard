"use client";

import "./BottomTabBar.css";
import {
  Home,
  Users,
  ClipboardList,
  Settings,
} from "lucide-react";

export type TrainerTab = "home" | "members" | "sessions" | "settings";

interface Tab {
  id: TrainerTab;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}

const TABS: Tab[] = [
  { id: "home",       label: "Home",       Icon: Home },
  { id: "members",    label: "Members",    Icon: Users },
  { id: "sessions",   label: "Sessions",   Icon: ClipboardList },
  { id: "settings",   label: "Settings",   Icon: Settings },
];

interface BottomTabBarProps {
  activeTab: TrainerTab;
  onTabChange: (tab: TrainerTab) => void;
  /** Number badge on Members tab — count of assigned members with overdue dues */
  overdueCount?: number;
}

export default function BottomTabBar({
  activeTab,
  onTabChange,
  overdueCount = 0,
}: BottomTabBarProps) {
  return (
    <nav className="trainer-tab-bar" role="tablist" aria-label="Trainer portal navigation">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        const showBadge = id === "members" && overdueCount > 0;

        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            className={`trainer-tab${isActive ? " active" : ""}`}
            onClick={() => onTabChange(id)}
          >
            {showBadge && (
              <span className="trainer-tab-badge" aria-label={`${overdueCount} overdue`}>
                {overdueCount > 9 ? "9+" : overdueCount}
              </span>
            )}
            <Icon size={20} />
            <span className="trainer-tab-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
