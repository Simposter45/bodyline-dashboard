"use client";

import "./SessionsTab.css";
import { useState, useMemo } from "react";
import { Plus, Clock, FileText, Check, X } from "lucide-react";
import { useSessionLogs } from "@/hooks/useSessionLogs";
import { useTrainerBookings } from "@/hooks/useTrainerBookings";
import { useBookingMutations } from "@/hooks/useBookingMutations";
import { formatDateIST } from "@/lib/utils/date";
import type { Trainer, AssignedMemberWithDues } from "@/types";
import SessionLogSheet from "../components/SessionLogSheet";

interface SessionsTabProps {
  trainer: Trainer;
  assignedMembers: AssignedMemberWithDues[];
}

export default function SessionsTab({ trainer, assignedMembers }: SessionsTabProps) {
  const { data: logs = [], isLoading } = useSessionLogs(trainer.id);
  const { data: bookings = [], isLoading: isBookingsLoading } = useTrainerBookings(trainer.id);
  const { updateStatus } = useBookingMutations();

  const [isLogSheetOpen, setIsLogSheetOpen] = useState(false);

  const pendingBookings = bookings.filter(b => b.status === "pending");

  // Group logs by date (YYYY-MM-DD)
  const groupedLogs = useMemo(() => {
    const groups: Record<string, typeof logs> = {};
    for (const log of logs) {
      if (!groups[log.session_date]) {
        groups[log.session_date] = [];
      }
      groups[log.session_date].push(log);
    }
    
    // Return array of entries sorted descending by date
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [logs]);

  function formatType(type: string) {
    if (type === "personal_training") return "PT Session";
    if (type === "group") return "Group";
    if (type === "rehab") return "Rehab";
    if (type === "open_gym") return "Open Gym";
    return type;
  }

  return (
    <div className="sessions-tab">
      {pendingBookings.length > 0 && (
        <div className="pending-requests-section">
          <div className="sessions-header" style={{ marginBottom: 16 }}>
            <div>
              <h2 className="sessions-title" style={{ fontSize: '1.25rem' }}>Pending Requests</h2>
              <p className="sessions-sub">{pendingBookings.length} member {pendingBookings.length === 1 ? 'request' : 'requests'} waiting</p>
            </div>
          </div>
          <div className="sessions-list" style={{ marginBottom: 32 }}>
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="session-card request-card">
                <div className="session-card-top">
                  <div className="session-card-member">
                    {booking.member?.profile_photo_url ? (
                      <div className="avatar" style={{ width: 32, height: 32 }}>
                        <img 
                          src={booking.member.profile_photo_url} 
                          alt={booking.member.full_name} 
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        />
                      </div>
                    ) : (
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {booking.member?.full_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="session-card-name">{booking.member?.full_name}</span>
                  </div>
                  <span className="session-card-type pt">
                    PT Session
                  </span>
                </div>

                <div className="session-card-meta">
                  <div className="session-meta-item">
                    <Clock size={14} />
                    <span>{formatDateIST(booking.session_date)} at {booking.session_time.substring(0, 5)}</span>
                  </div>
                </div>

                {booking.notes && (
                  <div className="session-card-notes">
                    "{booking.notes}"
                  </div>
                )}

                <div className="request-actions">
                  <button 
                    className="btn-solid request-confirm" 
                    onClick={() => updateStatus.mutate({ id: booking.id, status: "confirmed" })}
                    disabled={updateStatus.isPending}
                  >
                    <Check size={16} /> Confirm
                  </button>
                  <button 
                    className="btn-ghost-sm request-cancel" 
                    onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled" })}
                    disabled={updateStatus.isPending}
                  >
                    <X size={16} /> Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sessions-header">
        <div>
          <h1 className="sessions-title">Session Logs</h1>
          <p className="sessions-sub">Last 30 days history</p>
        </div>
      </div>

      {isLoading ? (
        <div className="sessions-empty">
          <div className="spin" style={{ display: "inline-block", margin: "0 auto 12px", width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--accent-blue)", borderRadius: "50%" }} />
          <p>Loading session history...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="sessions-empty">
          <div className="sessions-empty-icon">📝</div>
          <p>You haven't logged any sessions yet.</p>
        </div>
      ) : (
        <div className="sessions-list">
          {groupedLogs.map(([date, dayLogs]) => (
            <div key={date} className="session-day-group">
              <div className="session-day-label">{formatDateIST(date)}</div>
              
              {dayLogs.map((log) => (
                <div key={log.id} className="session-card">
                  <div className="session-card-top">
                    <div className="session-card-member">
                      {log.member?.profile_photo_url ? (
                        <div className="avatar" style={{ width: 32, height: 32 }}>
                          <img 
                            src={log.member.profile_photo_url} 
                            alt={log.member.full_name} 
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                          />
                        </div>
                      ) : (
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {log.member?.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="session-card-name">{log.member?.full_name}</span>
                    </div>
                    <span className={`session-card-type ${log.session_type === 'personal_training' ? 'pt' : ''}`}>
                      {formatType(log.session_type)}
                    </span>
                  </div>

                  <div className="session-card-meta">
                    {log.duration_mins && (
                      <div className="session-meta-item">
                        <Clock size={14} />
                        <span>{log.duration_mins} mins</span>
                      </div>
                    )}
                    <div className="session-meta-item">
                      <FileText size={14} />
                      <span>{new Date(log.created_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                  </div>

                  {log.notes && (
                    <div className="session-card-notes">
                      "{log.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button 
        className="fab log-fab" 
        onClick={() => setIsLogSheetOpen(true)}
        aria-label="Log Session"
      >
        <Plus size={24} color="#0d0d0f" />
      </button>

      {/* Log Sheet Overlay */}
      {isLogSheetOpen && (
        <SessionLogSheet
          trainerId={trainer.id}
          gymId={trainer.gym_id}
          assignedMembers={assignedMembers}
          onClose={() => setIsLogSheetOpen(false)}
        />
      )}
    </div>
  );
}
