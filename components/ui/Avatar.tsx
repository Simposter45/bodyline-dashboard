"use client";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  accent?: "green" | "amber" | "red" | "blue" | "neutral";
}

export function Avatar({ name, src, size = 40, accent = "neutral" }: AvatarProps) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const accentColors: any = {
    green: "var(--accent-green)",
    amber: "var(--accent-amber)",
    red: "var(--accent-red)",
    blue: "var(--accent-blue)",
    neutral: "var(--text-secondary)",
  };

  const color = accentColors[accent];

  return (
    <div className="avatar-icon" style={{ width: size, height: size }}>
      <style>{`
        .avatar-icon {
          border-radius: 50%;
          background: var(--bg3);
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
          font-family: var(--font-display);
          font-weight: 700;
        }
      `}</style>
      {src ? (
        <img src={src} alt={name} className="avatar-img" />
      ) : (
        <div className="avatar-initials" style={{ color, fontSize: size * 0.35 }}>
          {initials}
        </div>
      )}
    </div>
  );
}
