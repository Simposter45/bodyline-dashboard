"use client";

// ============================================================
// components/ui/Avatar.tsx
// Circular identity display — initials fallback with accent tinting.
// ── Font matches globals.css .avatar class: var(--font-ui) / DM Sans
// ── Accent applies both text color AND dim background tint
//    so trainer (blue) / owner (green) avatars are visually distinct.
// ============================================================

interface AvatarProps {
  name: string;
  src?: string | null;
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
  neutral: "var(--bg3)",           // Neutral falls back to the standard surface colour
};

export function Avatar({ name, src, size = 40, accent = "neutral" }: AvatarProps) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
        }
        .avatar-initials {
          font-family: var(--font-ui);
          font-weight: 700;
        }
      `}</style>
      {src ? (
        <img src={src} alt={name} className="avatar-img" />
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
