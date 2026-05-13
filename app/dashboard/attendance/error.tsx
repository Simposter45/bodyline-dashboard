"use client";

// ============================================================
// app/dashboard/attendance/error.tsx
// Error boundary for the attendance route (/dashboard/attendance).
// Next.js requires this to be a Client Component.
// Delegates all UI to the shared ErrorFallback component.
// ============================================================

import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function AttendanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
