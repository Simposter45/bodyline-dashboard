"use client";

import "./tabs.css";
import { LogIn, Loader2, Info } from "lucide-react";
import { useMemberAttendance } from "@/hooks/useMemberAttendance";
import { formatDateIST, formatTimeIST } from "@/lib/utils/date";

interface HistoryTabProps {
  memberId: string;
}

export default function HistoryTab({ memberId }: HistoryTabProps) {
  const { data: attendance = [], isLoading } = useMemberAttendance(memberId);

  return (
    <div className="member-tab-content">
      <div>
        <div className="tab-header-row">
          <h1 className="tab-title">History</h1>
        </div>
        <p className="tab-subtitle">Your recent gym check-ins.</p>
      </div>

      <div className="list-container">
        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={24} style={{ color: "var(--text-muted)" }} />
            <p>Loading history...</p>
          </div>
        ) : attendance.length === 0 ? (
          <div className="empty-state">
            <Info size={24} style={{ opacity: 0.5 }} />
            <p>No check-ins yet.</p>
          </div>
        ) : (
          attendance.map((record) => {
            const dateStr = formatDateIST(record.check_in);
            const timeIn = formatTimeIST(record.check_in);
            const timeOut = record.check_out
              ? formatTimeIST(record.check_out)
              : "Active";

            // If check_in is today and no checkout, highlight the dot
            const isToday =
              dateStr === formatDateIST(new Date().toISOString()) && !record.check_out;

            return (
              <div key={record.id} className="list-row">
                <div className="list-icon-col" style={{ borderColor: isToday ? 'var(--accent-green)' : undefined }}>
                  <LogIn size={18} style={{ color: isToday ? 'var(--accent-green)' : undefined }} />
                </div>
                <div className="list-info-col">
                  <span className="list-title">{dateStr}</span>
                  <span className="list-desc">
                    In: {timeIn} {record.check_out && `· Out: ${timeOut}`}
                  </span>
                </div>
                <div className="list-status-col">
                  {isToday ? (
                    <span className="status-badge" style={{ color: "var(--accent-green)", fontSize: "11px", fontWeight: 600 }}>Active Now</span>
                  ) : record.check_out ? (
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {timeOut}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
