"use client";

import "./MembersTab.css";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { AssignedMemberWithDues, Trainer } from "@/types";
import MemberDrawer from "../components/MemberDrawer";
import SessionLogSheet from "../components/SessionLogSheet";

interface MembersTabProps {
  trainer: Trainer;
  assignedMembers: AssignedMemberWithDues[];
  isLoading: boolean;
}

type FilterMode = "all" | "active" | "due";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function MembersTab({
  trainer,
  assignedMembers,
  isLoading,
}: MembersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedMember, setSelectedMember] = useState<AssignedMemberWithDues | null>(null);
  const [isLogSheetOpen, setIsLogSheetOpen] = useState(false);
  const [logSheetMemberId, setLogSheetMemberId] = useState<string>("");

  // ── Derived counts ──────────────────────────────────────────
  const counts = useMemo(() => {
    return {
      all: assignedMembers.length,
      active: assignedMembers.filter((m) => m.is_checked_in_today).length,
      due: assignedMembers.filter((m) => {
        const s = m.current_membership?.payment_status;
        return s === "overdue" || s === "pending";
      }).length,
    };
  }, [assignedMembers]);

  // ── Filter & Search ─────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    let list = assignedMembers;

    // Filter by mode
    if (filterMode === "active") {
      list = list.filter((m) => m.is_checked_in_today);
    } else if (filterMode === "due") {
      list = list.filter((m) => {
        const s = m.current_membership?.payment_status;
        return s === "overdue" || s === "pending";
      });
    }

    // Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) =>
        m.member.full_name.toLowerCase().includes(q) ||
        (m.member.phone && m.member.phone.includes(q))
      );
    }

    // Sort: In gym first, then alphabetical by name
    return list.sort((a, b) => {
      if (a.is_checked_in_today && !b.is_checked_in_today) return -1;
      if (!a.is_checked_in_today && b.is_checked_in_today) return 1;
      return a.member.full_name.localeCompare(b.member.full_name);
    });
  }, [assignedMembers, filterMode, searchQuery]);

  return (
    <div className="members-tab">
      {/* ── Toolbar ────────────────────────────────────────── */}
      <div className="members-toolbar">
        <div className="members-search-wrap">
          <Search size={18} className="members-search-icon" />
          <input
            type="text"
            className="members-search-input"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="members-filters">
          <button
            className={`members-filter-chip ${filterMode === "all" ? "active" : ""}`}
            onClick={() => setFilterMode("all")}
          >
            All Members
            <span className="members-filter-badge">{counts.all}</span>
          </button>
          
          <button
            className={`members-filter-chip ${filterMode === "active" ? "active" : ""}`}
            onClick={() => setFilterMode("active")}
          >
            In Gym Now
            {counts.active > 0 && <span className="members-filter-badge">{counts.active}</span>}
          </button>
          
          <button
            className={`members-filter-chip ${filterMode === "due" ? "active" : ""}`}
            onClick={() => setFilterMode("due")}
          >
            Outstanding Dues
            {counts.due > 0 && <span className="members-filter-badge">{counts.due}</span>}
          </button>
        </div>
      </div>

      {/* ── Roster List ────────────────────────────────────── */}
      <div className="roster-list">
        {isLoading ? (
          <div className="roster-empty">
            <div className="spin" style={{ display: "inline-block", margin: "0 auto 12px", width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--accent-blue)", borderRadius: "50%" }} />
            <p>Loading your members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="roster-empty">
            <div className="roster-empty-icon">
              {filterMode === "active" ? "🏋️" : filterMode === "due" ? "✨" : "🔍"}
            </div>
            <p>
              {filterMode === "active"
                ? "None of your members are in the gym right now."
                : filterMode === "due"
                ? "All caught up! No outstanding dues."
                : searchQuery
                ? "No members match your search."
                : "You have no assigned members."}
            </p>
          </div>
        ) : (
          filteredMembers.map((info) => {
            const { member, current_membership, is_checked_in_today } = info;
            const pStatus = current_membership?.payment_status;
            const isOverdue = pStatus === "overdue" || pStatus === "pending";

            return (
              <div 
                key={member.id} 
                className="roster-item"
                onClick={() => setSelectedMember(info)}
              >
                {/* Avatar */}
                <div className="avatar">
                  {member.profile_photo_url ? (
                    <img
                      src={member.profile_photo_url}
                      alt={member.full_name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                    />
                  ) : (
                    getInitials(member.full_name)
                  )}
                </div>

                {/* Info */}
                <div className="roster-item-info">
                  <div className="roster-item-name">
                    {member.full_name}
                    {/* Status dot next to name on mobile/desktop */}
                    <span className="roster-status" title={is_checked_in_today ? "In Gym" : "Not Checked In"}>
                      <span className={`roster-dot ${is_checked_in_today ? "active" : "inactive"}`} />
                    </span>
                  </div>
                  <div className="roster-item-sub">
                    <span>{current_membership?.plan?.name || "No Plan"}</span>
                  </div>
                </div>

                {/* Right Badges */}
                <div className="roster-item-badges">
                  {is_checked_in_today && (
                    <span className="roster-badge in-gym">In Gym</span>
                  )}
                  {isOverdue && (
                    <span className={`roster-badge ${pStatus === "overdue" ? "overdue" : "due"}`}>
                      {pStatus === "overdue" ? "Overdue" : "Due"}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Member Drawer ──────────────────────────────────── */}
      <MemberDrawer
        memberInfo={selectedMember}
        onClose={() => setSelectedMember(null)}
        onLogSession={(id) => {
          setLogSheetMemberId(id);
          setIsLogSheetOpen(true);
        }}
        onRecordPayment={(id) => {
          // Wiring up to Phase 9
          console.log("Record payment for:", id);
        }}
      />

      {/* ── Log Session Sheet (Triggered from Drawer) ─────── */}
      {isLogSheetOpen && (
        <SessionLogSheet
          trainerId={trainer.id}
          gymId={trainer.gym_id}
          assignedMembers={assignedMembers}
          preselectedMemberId={logSheetMemberId}
          onClose={() => {
            setIsLogSheetOpen(false);
            setLogSheetMemberId("");
          }}
        />
      )}
    </div>
  );
}
