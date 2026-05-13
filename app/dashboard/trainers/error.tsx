"use client";

// ============================================================
// app/dashboard/trainers/error.tsx
// Error boundary for the trainers route (/dashboard/trainers).
// Next.js requires this to be a Client Component.
// Delegates all UI to the shared ErrorFallback component.
// ============================================================

import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function TrainersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
