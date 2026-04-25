"use client";

// ============================================================
// components/ui/Avatar.tsx
// Circular identity display — photo with initials fallback.
//
// ── Font: var(--font-ui) / DM Sans — matches .avatar in globals.css
// ── Accent: applies both text color AND dim background tint
//    so trainer (blue) / owner (green) avatars are visually distinct
// ── href: when provided, the photo is wrapped in a clickable link
//    (e.g. full-size photo preview in drawers)
// ── onError: broken images fall back to initials automatically
// ============================================================

import { useState } from "react";

interface AvatarProps {
  name: string;
  src?: string | null;
  href?: string | null;   // Makes the photo clickable (e.g. full-size preview)
  size?: number;
  accent?: "green" | "amber" | "red" | "blue" | "neutral";
}

type AccentKey = NonNullable<AvatarProps["accent"]>;

const ACCENT_TEXT: Record<AccentKey, string> = {
  green:   "var(--accent-green)",
  amber:   "var(--accent-amber)",
  red:     "var(--accent-red)",
  blue:    "var(--accent-blue)",
  neutral: "var(--text-secondary)",
};

const ACCENT_BG: Record<AccentKey, string> = {
  green:   "var(--accent-green-dim)",
  amber:   "var(--accent-amber-dim)",
  red:     "var(--accent-red-dim)",
  blue:    "var(--accent-blue-dim)",
  neutral: "var(--bg3)",
};

export function Avatar({
  name,
  src,
  href,
  size = 40,
  accent = "neutral",
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const showPhoto = src && !imgError;

  const photo = (
    <img
      src={src ?? ""}
      alt={name}
      className="avatar-img"
      onError={() => setImgError(true)}
    />
  );

  return (
    <div
      className="avatar-icon"
      style={{
        width:      size,
        height:     size,
        background: ACCENT_BG[accent],
      }}
    >
      <style>{`
        .avatar-icon {
          border-radius: 50%;
          border: 1px solid var(--border-hi);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .avatar-link {
          display: block;
          width: 100%;
          height: 100%;
        }
        .avatar-initials {
          font-family: var(--font-ui);
          font-weight: 700;
        }
      `}</style>

      {showPhoto ? (
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="avatar-link"
          >
            {photo}
          </a>
        ) : (
          photo
        )
      ) : (
        <div
          className="avatar-initials"
          style={{ color: ACCENT_TEXT[accent], fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
