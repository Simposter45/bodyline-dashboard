"use client";

import "./AttendanceTab.css";
import { useTrainerAttendanceHistory } from "@/hooks/useTrainerAttendance";
import { formatDateIST } from "@/lib/utils/date";
import type { Trainer } from "@/types";

interface AttendanceTabProps {
  trainer: Trainer;
}

export default function AttendanceTab({ trainer }: AttendanceTabProps) {
  const { data: history = [], isLoading } = useTrainerAttendanceHistory(trainer.id);

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function calculateDuration(clockIn: string, clockOut: string | null) {
    if (!clockOut) return null;
    const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  return (
    <div className="attendance-tab">
      <div className="attendance-header">
        <h1 className="attendance-title">Attendance</h1>
        <p className="attendance-sub">Last 30 days history</p>
      </div>

      {isLoading ? (
        <div className="attendance-empty">
          <div className="spin" style={{ display: "inline-block", margin: "0 auto 12px", width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--accent-blue)", borderRadius: "50%" }} />
          <p>Loading attendance history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="attendance-empty">
          <div className="attendance-empty-icon">🗓️</div>
          <p>No attendance records found.</p>
        </div>
      ) : (
        <div className="attendance-list">
          {history.map((record) => {
            const isActive = !record.clock_out;
            const duration = calculateDuration(record.clock_in, record.clock_out);

            return (
              <div key={record.id} className="att-card">
                <div className="att-card-left">
                  <div className="att-date">{formatDateIST(record.date)}</div>
                  <div className="att-times">
                    <span className="att-time-badge">
                      In: {formatTime(record.clock_in)}
                    </span>
                    {record.clock_out && (
                      <span className="att-time-badge">
                        Out: {formatTime(record.clock_out)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="att-card-right">
                  {isActive ? (
                    <span className="att-status-badge">Clocked In</span>
                  ) : (
                    <>
                      <span className="att-duration">{duration}</span>
                      <span className="att-duration-label">Duration</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
