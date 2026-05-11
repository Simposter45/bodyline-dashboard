"use client";

// ============================================================
// components/ui/ErrorFallback.tsx
// Shared UI for all route-level error boundaries (error.tsx files).
//
// Props mirror Next.js error.tsx contract:
//   error — the thrown Error (includes optional .digest for server errors)
//   reset — retry callback provided by Next.js (re-renders the segment)
//
// CSS: all styles live in app/globals.css (/* Global Error State */ section).
//      .error-screen · .error-card · .error-icon · .error-title
//      .error-message · .error-detail · .error-actions · .btn-retry · .btn-ghost-sm
// ============================================================

import Link from "next/link";
import { RotateCcw, AlertTriangle, Home } from "lucide-react";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  // Show technical detail only in development; in production show generic copy.
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="error-screen">
      <div className="error-card">
        {/* Icon */}
        <div className="error-icon">
          <AlertTriangle size={24} />
        </div>

        {/* Heading */}
        <p className="error-title">Something went wrong</p>

        {/* Human-readable message */}
        <p className="error-message">
          This page ran into an unexpected error. You can try again or head back
          to the dashboard.
        </p>

        {/* Dev-only: raw error message for debugging */}
        {isDev && error.message && (
          <p className="error-detail">{error.message}</p>
        )}

        {/* Actions */}
        <div className="error-actions">
          <button className="btn-retry" onClick={reset}>
            <RotateCcw size={14} />
            Try again
          </button>

          <Link href="/dashboard" className="btn-ghost-sm">
            <Home size={14} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
