"use client";

type StatusType = "success" | "warning" | "error" | "info" | "neutral" | "active" | "inactive";

interface StatusPillProps {
  label: string;
  type?: StatusType;
}

export function StatusPill({ label, type = "neutral" }: StatusPillProps) {
  const styles: Record<StatusType, { bg: string; color: string }> = {
    success: { bg: "var(--accent-green-dim)", color: "var(--accent-green)" },
    active: { bg: "var(--accent-green-dim)", color: "var(--accent-green)" },
    warning: { bg: "var(--accent-amber-dim)", color: "var(--accent-amber)" },
    error: { bg: "var(--accent-red-dim)", color: "var(--accent-red)" },
    info: { bg: "var(--accent-blue-dim)", color: "var(--accent-blue)" },
    neutral: { bg: "var(--bg3)", color: "var(--text-secondary)" },
    inactive: { bg: "var(--bg3)", color: "var(--text-muted)" },
  };

  const { bg, color } = styles[type];

  return (
    <span className="bodyline-status-pill" style={{ background: bg, color }}>
      <style>{`
        .bodyline-status-pill {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 99px;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
      `}</style>
      {label}
    </span>
  );
}
