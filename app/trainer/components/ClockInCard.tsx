"use client";

import "./ClockInCard.css";
import { useState, useEffect, useCallback } from "react";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { useClockIn, useClockOut } from "@/hooks/useTrainerAttendanceMutation";
import { todayFormatted } from "@/lib/utils/date";
import type { TrainerAttendance, Trainer } from "@/types";

// ── Helpers ────────────────────────────────────────────────────

/** Formats elapsed seconds as HH:MM:SS */
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Formats an ISO timestamp as "h:mm AM/PM" in IST */
function formatTimeIST(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

// ── Component ──────────────────────────────────────────────────

interface ClockInCardProps {
  trainer: Trainer;
  /** Today's open attendance row. null = not clocked in yet. */
  todayAttendance: TrainerAttendance | null | undefined;
  isAttendanceLoading: boolean;
}

export default function ClockInCard({
  trainer,
  todayAttendance,
  isAttendanceLoading,
}: ClockInCardProps) {
  const isClockedIn = !!todayAttendance && !todayAttendance.clock_out;
  const clockInTime = todayAttendance?.clock_in ?? null;

  // ── Live elapsed timer ─────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);

  const computeElapsed = useCallback(() => {
    if (!clockInTime || !isClockedIn) return 0;
    return Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000);
  }, [clockInTime, isClockedIn]);

  useEffect(() => {
    setElapsed(computeElapsed());
    if (!isClockedIn) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isClockedIn, computeElapsed]);

  // ── Mutations ──────────────────────────────────────────────
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const isMutating = clockIn.isPending || clockOut.isPending;

  function handleClockIn() {
    clockIn.mutate({
      trainer_id: trainer.id,
      gym_id: trainer.gym_id,
    });
  }

  function handleClockOut() {
    if (!todayAttendance) return;
    clockOut.mutate({
      attendance_id: todayAttendance.id,
      trainer_id: trainer.id,
    });
  }

  // ── Render ─────────────────────────────────────────────────
  const timerDisplay = isClockedIn ? formatElapsed(elapsed) : "00:00:00";
  const dateLabel = todayFormatted();

  return (
    <div className={`clock-card${isClockedIn ? " clocked-in" : ""}`}>
      {/* Ambient glow — visible only when clocked in */}
      <div className="clock-card-glow" aria-hidden />

      {/* Top row */}
      <div className="clock-card-top">
        <span className="clock-card-date">{dateLabel}</span>
        <span className={`clock-status-pill${isClockedIn ? " in" : " out"}`}>
          <span className="clock-status-dot" />
          {isAttendanceLoading ? "Checking…" : isClockedIn ? "Clocked In" : "Off Duty"}
        </span>
      </div>

      {/* Timer */}
      <div className="clock-timer-wrap">
        <div className="clock-timer" aria-live="polite" aria-label="Elapsed time">
          {timerDisplay}
        </div>
        <div className="clock-timer-label">
          {isClockedIn ? "Time elapsed today" : "Ready to start your shift?"}
        </div>
      </div>

      {/* CTA */}
      {isClockedIn ? (
        <>
          <button
            className="clock-btn clock-out"
            onClick={handleClockOut}
            disabled={isMutating || isAttendanceLoading}
            aria-label="Clock out"
          >
            {isMutating ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <LogOut size={18} />
            )}
            Clock Out
          </button>
          {clockInTime && (
            <p className="clock-in-since">
              Clocked in at <strong>{formatTimeIST(clockInTime)}</strong>
            </p>
          )}
        </>
      ) : (
        <button
          className="clock-btn clock-in"
          onClick={handleClockIn}
          disabled={isMutating || isAttendanceLoading || !!todayAttendance?.clock_out}
          aria-label="Clock in"
        >
          {isMutating ? (
            <Loader2 size={18} className="spin" />
          ) : (
            <LogIn size={18} />
          )}
          {todayAttendance?.clock_out ? "Shift Complete ✓" : "Clock In"}
        </button>
      )}
    </div>
  );
}
