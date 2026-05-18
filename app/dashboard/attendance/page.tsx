"use client";

import "./attendance.css";
import "../dashboard.css";
import { useState, useMemo, useEffect } from "react";
import {
  LogIn, LogOut, Search, UserRound, Download,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Nav }        from "@/components/ui/Nav";
import { Avatar }     from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAttendance } from "@/hooks/useAttendance";
import type { AttendanceDateRange } from "@/hooks/useAttendance";
import { useCheckIn, useCheckOut } from "@/hooks/useCheckin";
import { useMembers } from "@/hooks/useMembers";
import { useMember }  from "@/hooks/useMember";
import { MemberDrawer } from "@/app/dashboard/members/MemberDrawer";
import { formatTime, formatDuration, formatShortDate } from "@/lib/utils/format";
import {
  todayFormatted, todayISO, todayRangeIST,
  yesterdayRangeIST, lastNDaysRangeIST,
} from "@/lib/utils/date";

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const PAGE_SIZE = 25;

type RangePreset = "today" | "yesterday" | "7days" | "30days" | "custom";
const RANGE_LABELS: Record<RangePreset, string> = {
  today:     "Today",
  yesterday: "Yesterday",
  "7days":   "Last 7 days",
  "30days":  "Last 30 days",
  custom:    "Custom",
};

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function AttendancePage() {

  // ── State ──────────────────────────────────────────────────────────
  const [search,           setSearch]           = useState("");
  const [logSearch,        setLogSearch]        = useState("");
  const [pmtFilter,        setPmtFilter]        = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [rangePreset,      setRangePreset]      = useState<RangePreset>("today");
  const [customFrom,       setCustomFrom]       = useState("");
  const [customTo,         setCustomTo]         = useState("");
  const [page,             setPage]             = useState(1);

  const isToday = rangePreset === "today";

  // ── Active range (memoised so it only recomputes on state change) ──
  const activeRange = useMemo((): AttendanceDateRange => {
    switch (rangePreset) {
      case "yesterday": return yesterdayRangeIST();
      case "7days":     return lastNDaysRangeIST(7);
      case "30days":    return lastNDaysRangeIST(30);
      case "custom":
        if (customFrom && customTo) {
          return {
            start: new Date(`${customFrom}T00:00:00+05:30`).toISOString(),
            end:   new Date(`${customTo}T23:59:59.999+05:30`).toISOString(),
          };
        }
        return todayRangeIST(); // hold until both dates chosen
      default: return todayRangeIST();
    }
  }, [rangePreset, customFrom, customTo]);

  // ── Data ──────────────────────────────────────────────────────────
  const { data: attendance = [], isLoading: attLoading, error: attError } =
    useAttendance(activeRange, isToday);

  const { data: members = [] } = useMembers();
  const checkIn  = useCheckIn();
  const checkOut = useCheckOut();
  const { data: drawerMember, isLoading: drawerLoading } = useMember(selectedMemberId);

  // ── Reset page whenever filters or range changes ───────────────────
  useEffect(() => { setPage(1); }, [rangePreset, customFrom, customTo, logSearch, pmtFilter]);

  // ── Derived stats (today-only chips) ──────────────────────────────
  const totalToday     = attendance.length;
  const currentlyInGym = useMemo(() => attendance.filter((a) => !a.check_out).length, [attendance]);
  const inGymMemberIds = useMemo(
    () => new Set(attendance.filter((a) => !a.check_out).map((a) => a.member_id)),
    [attendance],
  );

  // ── Check-in panel search ─────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter((m) => m.is_active)
      .filter((m) => m.full_name.toLowerCase().includes(q) || m.phone.includes(q))
      .slice(0, 5);
  }, [members, search]);

  // ── Payment status map (zero extra DB calls) ──────────────────────
  const paymentStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.membership) map.set(m.id, m.membership.payment_status);
    }
    return map;
  }, [members]);

  // ── 3-stage log filter ────────────────────────────────────────────
  const searchFiltered = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return attendance;
    return attendance.filter(
      (a) => a.member.full_name.toLowerCase().includes(q) || a.member.phone.includes(q),
    );
  }, [attendance, logSearch]);

  const pmtCounts = useMemo(() => {
    const c = { all: searchFiltered.length, paid: 0, pending: 0, overdue: 0 };
    for (const a of searchFiltered) {
      const s = paymentStatusMap.get(a.member_id);
      if (s === "paid")    c.paid++;
      else if (s === "pending")  c.pending++;
      else if (s === "overdue")  c.overdue++;
    }
    return c;
  }, [searchFiltered, paymentStatusMap]);

  const filteredLog = useMemo(() => {
    if (pmtFilter === "all") return searchFiltered;
    return searchFiltered.filter((a) => paymentStatusMap.get(a.member_id) === pmtFilter);
  }, [searchFiltered, pmtFilter, paymentStatusMap]);

  // ── Pagination ────────────────────────────────────────────────────
  const totalPages   = Math.max(1, Math.ceil(filteredLog.length / PAGE_SIZE));
  const safePage     = Math.min(page, totalPages);
  const paginatedLog = filteredLog.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── CSV export ────────────────────────────────────────────────────
  function handleExportCSV() {
    const headers = [
      ...(!isToday ? ["Date"] : []),
      "Name", "Phone", "Checked In", "Checked Out", "Duration", "Payment", "Status",
    ];
    const rows = filteredLog.map((a) => {
      const pmt = paymentStatusMap.get(a.member_id) ?? "unknown";
      const cols: string[] = [
        ...(!isToday ? [formatShortDate(a.check_in)] : []),
        a.member.full_name,
        a.member.phone,
        formatTime(a.check_in),
        a.check_out ? formatTime(a.check_out) : "—",
        formatDuration(a.check_in, a.check_out),
        pmt,
        a.check_out ? "Left" : "In gym",
      ];
      return cols.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `attendance-${rangePreset}-${todayISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function pmtPillProps(memberId: string): { label: string; type: "success" | "warning" | "error" | "neutral" } {
    const s = paymentStatusMap.get(memberId);
    if (s === "paid")    return { label: "Paid",    type: "success" };
    if (s === "pending") return { label: "Pending", type: "warning" };
    if (s === "overdue") return { label: "Overdue", type: "error"   };
    return { label: "—", type: "neutral" };
  }

  // ── Render ────────────────────────────────────────────────────────
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
        <div className="error-screen">Failed to load: {attError.message}</div>
      )}

      {!attLoading && !attError && (
        <div className="page">

          {/* ── Header ── */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Attendance</h1>
              <p className="page-sub">{todayFormatted()}</p>
              {isToday && (
                <div className="att-stats">
                  <div className="att-stat-chip">
                    <span className="att-stat-dot" style={{ background: "var(--accent-green)" }} />
                    <span className="att-stat-num">{totalToday}</span>
                    checked in today
                  </div>
                  <div className="att-stat-chip">
                    <span className="att-stat-dot" style={{ background: "var(--accent-blue)" }} />
                    <span className="att-stat-num">{currentlyInGym}</span>
                    currently in gym
                  </div>
                </div>
              )}
            </div>
            <div className="live-badge">
              <div className="live-dot" />
              {isToday ? "Live · updates every 30s" : "Historical data"}
            </div>
          </div>

          {/* ── Check-In Panel (today only) ── */}
          {isToday && (
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
                          <Avatar name={m.full_name} src={m.profile_photo_url ?? undefined} size={36} />
                          <div className="member-result-info">
                            <div className="member-result-name">{m.full_name}</div>
                            <div className="member-result-phone">{m.phone}</div>
                          </div>
                          {alreadyIn ? (
                            <span className="already-in-badge">✔ In gym</span>
                          ) : (
                            <button
                              className="checkin-btn"
                              disabled={checkIn.isPending}
                              onClick={() =>
                                checkIn.mutate({ memberId: m.id }, { onSuccess: () => setSearch("") })
                              }
                            >
                              <LogIn size={14} /> Check In
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Section label ── */}
          <p className="section-label">{isToday ? "Today's Log" : "Attendance Log"}</p>

          {/* ── Range selector ── */}
          <div className="range-row">
            <div className="filter-tabs">
              {(Object.keys(RANGE_LABELS) as RangePreset[]).map((preset) => (
                <button
                  key={preset}
                  className={`filter-tab ${rangePreset === preset ? "active" : ""}`}
                  onClick={() => setRangePreset(preset)}
                >
                  {RANGE_LABELS[preset]}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date inputs */}
          {rangePreset === "custom" && (
            <div className="date-range-inputs">
              <input
                type="date" id="custom-from" className="date-range-input"
                value={customFrom}
                max={customTo || todayISO()}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="date-range-sep">→</span>
              <input
                type="date" id="custom-to" className="date-range-input"
                value={customTo}
                min={customFrom}
                max={todayISO()}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}

          {/* ── Search + payment filter toolbar ── */}
          <div className="toolbar">
            <div className="search-wrap">
              <Search className="search-icon" size={15} />
              <input
                id="log-search" className="search-input"
                placeholder="Filter by name or phone…"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="filter-tabs">
              {(["all", "paid", "pending", "overdue"] as const).map((f) => (
                <button
                  key={f}
                  className={`filter-tab ${pmtFilter === f ? "active" : ""}`}
                  onClick={() => setPmtFilter(f)}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="filter-count">{pmtCounts[f]}</span>
                </button>
              ))}
            </div>
            {(logSearch.trim() || pmtFilter !== "all") && filteredLog.length !== attendance.length && (
              <span className="log-count">{filteredLog.length} of {attendance.length} shown</span>
            )}
            {filteredLog.length > 0 && (
              <button className="checkin-btn" style={{ marginLeft: "auto" }} onClick={handleExportCSV}>
                <Download size={13} /> Export CSV
              </button>
            )}
          </div>

          {/* ── Table ── */}
          <div className="table-wrap">
            <div className="table-meta">
              {attendance.length === 0
                ? "No check-ins for this period"
                : `${attendance.length} check-in${attendance.length !== 1 ? "s" : ""} · ${RANGE_LABELS[rangePreset].toLowerCase()}`}
            </div>

            {attendance.length === 0 ? (
              <div className="empty-state">
                {isToday
                  ? "No one has checked in yet. Use the search above to check in a member."
                  : "No attendance records found for the selected period."}
              </div>
            ) : filteredLog.length === 0 ? (
              <div className="empty-state">No check-ins match your current filters.</div>
            ) : (
              <>
                <table className="responsive-table att-table">
                  <thead>
                    <tr>
                      {!isToday && <th>Date</th>}
                      <th>Member</th>
                      <th>Checked In</th>
                      <th>Checked Out</th>
                      <th>Duration</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th style={{ width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLog.map((a) => {
                      const pill        = pmtPillProps(a.member_id);
                      const isOpenToday = isToday && !a.check_out;
                      return (
                        <tr key={a.id} onClick={() => setSelectedMemberId(a.member_id)}>

                          {!isToday && (
                            <td data-label="Date"><span className="log-time">{formatShortDate(a.check_in)}</span></td>
                          )}

                          <td data-label="Member">
                            <div className="log-member-cell">
                              <Avatar name={a.member.full_name} src={a.member.profile_photo_url ?? undefined} size={34} />
                              <div className="log-member-info">
                                <div className="log-member-name">{a.member.full_name}</div>
                                <div className="log-member-phone">{a.member.phone}</div>
                              </div>
                            </div>
                          </td>

                          <td data-label="Checked In"><span className="log-time">{formatTime(a.check_in)}</span></td>

                          <td data-label="Checked Out" onClick={(e) => e.stopPropagation()}>
                            {a.check_out ? (
                              <span className="log-time-muted">{formatTime(a.check_out)}</span>
                            ) : isOpenToday ? (
                              <button
                                className="checkout-btn"
                                disabled={checkOut.isPending}
                                onClick={() => checkOut.mutate({ attendanceId: a.id })}
                              >
                                <LogOut size={13} /> Check Out
                              </button>
                            ) : (
                              <span className="log-time-muted">—</span>
                            )}
                          </td>

                          <td data-label="Duration">
                            <span className={isOpenToday ? "log-time-live" : "log-time-muted"}>
                              {formatDuration(a.check_in, a.check_out)}
                            </span>
                          </td>

                          <td data-label="Payment"><StatusPill label={pill.label} type={pill.type} /></td>

                          <td data-label="Status">
                            <StatusPill
                              label={a.check_out ? "Left" : "In gym"}
                              type={a.check_out ? "neutral" : "success"}
                            />
                          </td>

                          <td style={{ width: 32, textAlign: "center" }}>
                            <UserRound size={14} style={{ color: "var(--text-muted)" }} />
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="pagination">
                    <span className="pagination-info">
                      Rows {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredLog.length)} of {filteredLog.length}
                    </span>
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        disabled={safePage === 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <span className="pagination-btn active" style={{ cursor: "default" }}>
                        {safePage} / {totalPages}
                      </span>
                      <button
                        className="pagination-btn"
                        disabled={safePage === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}

      {/* ── Member Drawer ── */}
      {selectedMemberId && drawerLoading && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedMemberId(null)} />
          <div className="drawer" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="loading-spinner" />
          </div>
        </>
      )}
      {selectedMemberId && drawerMember && !drawerLoading && (
        <MemberDrawer member={drawerMember} onClose={() => setSelectedMemberId(null)} />
      )}
    </>
  );
}
