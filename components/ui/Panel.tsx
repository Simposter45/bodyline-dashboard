"use client";

import React from "react";

interface PanelProps {
  title: string;
  badge?: string | number;
  children: React.ReactNode;
}

export function Panel({ title, badge, children }: PanelProps) {
  return (
    <div className="original-panel">
      <style>{`
        .original-panel {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }
        .panel-title {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--text-primary);
        }
        .panel-badge {
          font-size: 12px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 99px;
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }
      `}</style>
      <div className="panel-header">
        <span className="panel-title">{title}</span>
        {badge !== undefined && (
          <span className="panel-badge">{badge} total</span>
        )}
      </div>
      <div className="panel-body">
        {children}
      </div>
    </div>
  );
}
