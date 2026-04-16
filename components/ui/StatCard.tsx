"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "amber" | "red" | "blue";
  large?: boolean;
}

export function StatCard({ label, value, sub, accent, large }: StatCardProps) {
  const accentMap: Record<string, string> = {
    green: "var(--accent-green)",
    amber: "var(--accent-amber)",
    red: "var(--accent-red)",
    blue: "var(--accent-blue)",
  };
  const color = accent ? accentMap[accent] : "var(--text-primary)";

  return (
    <div className="summary-card">
      <style>{`
        .summary-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          padding: 24px;
          transition: border-color 0.2s;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .summary-card:hover { border-color: var(--border-hi); }
        
        .summary-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .summary-value {
          font-family: var(--font-display);
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 6px;
        }
        .summary-sub {
          font-size: 12px;
          color: var(--text-secondary);
        }
      `}</style>
      <p className="summary-label">{label}</p>
      <p className="summary-value" style={{ color }}>
        {value}
      </p>
      {sub && <p className="summary-sub">{sub}</p>}
    </div>
  );
}
