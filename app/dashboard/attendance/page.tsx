"use client";

import "./attendance.css";
import "../dashboard.css"; // .section-label, .live-badge, .live-dot, .row-info
import { useState, useMemo } from "react";
import { LogIn, LogOut, Search } from "lucide-react";
import { Nav } from "@/components/ui/Nav";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAttendance } from "@/hooks/useAttendance";
import { useCheckIn, useCheckOut } from "@/hooks/useCheckin";
import { useMembers } from "@/hooks/useMembers";
import { formatTime } from "@/lib/utils/format";
import { todayFormatted } from "@/lib/utils/date";

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function AttendancePage() {
  const [search, setSearch] = useState("");

  const {
    data: attendance = [],
    isLoading: attLoading,
    error: attError,
  } = useAttendance();

  const { data: members = [] } = useMembers();

  const checkIn  = useCheckIn();
  const checkOut = useCheckOut();

  // ── Derived stats ───────────────────────────────────────────────
  const totalToday = attendance.length;

  const currentlyInGym = useMemo(
    () => attendance.filter((a) => !a.check_out).length,
    [attendance],
  );

  // Set of member_ids with an open check-in (no check_out yet)
  // Used to show "In gym" badge instead of the check-in button
  const inGymMemberIds = useMemo(
    () => new Set(attendance.filter((a) => !a.check_out).map((a) => a.member_id)),
    [attendance],
  );

  // ── Member search results ────────────────────────────────────────
  // Only shown when the search box is non-empty.
  // Active members only, max 5 results, name OR phone match.
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter((m) => m.is_active)
      .filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) || m.phone.includes(q),
      )
      .slice(0, 5);
  }, [members, search]);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      <Nav role="owner" />

      {attLoading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading attendance...
        </div>
      )}

      {attError && (
        <div className="error-screen">
          Failed to load: {attError.message}
        </div>
      )}

      {!attLoading && !attError && (
        <div className="page">

          {/* ── Header ── */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Attendance</h1>
              <p className="page-sub">{todayFormatted()}</p>
              <div className="att-stats">
                <div className="att-stat-chip">
                  <span
                    className="att-stat-dot"
                    style={{ background: "var(--accent-green)" }}
                  />
                  <span className="att-stat-num">{totalToday}</span>
                  checked in today
                </div>
                <div className="att-stat-chip">
                  <span
                    className="att-stat-dot"
                    style={{ background: "var(--accent-blue)" }}
                  />
                  <span className="att-stat-num">{currentlyInGym}</span>
                  currently in gym
                </div>
              </div>
            </div>
            <div className="live-badge">
              <div className="live-dot" />
              Live · updates every 30s
            </div>
          </div>

          {/* ── Check-In Panel ── */}
          <div className="checkin-panel">
            <p className="checkin-panel-title">Check In a Member</p>

            <div className="search-wrap">
              <Search className="search-icon" size={15} />
              <input
                id="checkin-search"
                className="search-input"
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </div>

            {search.trim().length > 0 && (
              <div className="member-results">
                {filteredMembers.length === 0 ? (
                  <div className="no-results">
                    No active members match &quot;{search}&quot;
                  </div>
                ) : (
                  filteredMembers.map((m) => {
                    const alreadyIn = inGymMemberIds.has(m.id);
                    return (
                      <div key={m.id} className="member-result">
                        <Avatar
                          name={m.full_name}
                          src={m.profile_photo_url ?? undefined}
                          size={36}
                        />
                        <div className="member-result-info">
                          <div className="member-result-name">
                            {m.full_name}
                          </div>
                          <div className="member-result-phone">
                            {m.phone}
                          </div>
                        </div>
                        {alreadyIn ? (
                          <span className="already-in-badge">✔ In gym</span>
                        ) : (
                          <button
                            className="checkin-btn"
                            disabled={checkIn.isPending}
                            onClick={() =>
                              checkIn.mutate(
                                { memberId: m.id },
                                { onSuccess: () => setSearch("") },
                              )
                            }
                          >
                            <LogIn size={14} />
                            Check In
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Today's Log ── */}
          <p className="section-label">Today&apos;s Log</p>

          <div className="table-wrap">
            <div className="table-meta">
              {attendance.length === 0
                ? "No check-ins yet today"
                : `${attendance.length} check-in${attendance.length !== 1 ? "s" : ""} today`}
            </div>

            {attendance.length === 0 ? (
              <div className="empty-state">
                No one has checked in yet. Use the search above to check in a member.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Checked In</th>
                    <th>Checked Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.id}>

                      {/* Member */}
                      <td>
                        <div className="log-member-cell">
                          <Avatar
                            name={a.member.full_name}
                            src={a.member.profile_photo_url ?? undefined}
                            size={34}
                          />
                          <div className="log-member-info">
                            <div className="log-member-name">
                              {a.member.full_name}
                            </div>
                            <div className="log-member-phone">
                              {a.member.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Check-in time */}
                      <td>
                        <span className="log-time">
                          {formatTime(a.check_in)}
                        </span>
                      </td>

                      {/* Check-out — button if still in, time if left */}
                      <td>
                        {a.check_out ? (
                          <span className="log-time-muted">
                            {formatTime(a.check_out)}
                          </span>
                        ) : (
                          <button
                            className="checkout-btn"
                            disabled={checkOut.isPending}
                            onClick={() =>
                              checkOut.mutate({ attendanceId: a.id })
                            }
                          >
                            <LogOut size={13} />
                            Check Out
                          </button>
                        )}
                      </td>

                      {/* Status pill */}
                      <td>
                        <StatusPill
                          label={a.check_out ? "Left" : "In gym"}
                          type={a.check_out ? "neutral" : "success"}
                        />
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}
    </>
  );
}
