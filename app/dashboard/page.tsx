"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGymSettings } from "@/hooks/useGymSettings";
import { Nav } from "@/components/ui/Nav";
import { StatCard } from "@/components/ui/StatCard";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import type {
  Member,
  MemberMembership,
  MembershipPlan,
  Attendance,
  Trainer,
} from "@/types";

const supabase = createClient();

interface DashboardData {
  totalActive: number;
  newThisMonth: number;
  expiringThisWeek: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  overdueMembers: (MemberMembership & {
    member: Member;
    plan: MembershipPlan;
  })[];
  todayCheckins: number;
  currentlyInGym: number;
  todayAttendance: (Attendance & { member: Member })[];
  trainers: Trainer[];
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Good morning");
  const [userName, setUserName] = useState("");
  
  const { data: settings } = useGymSettings();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17) setGreeting("Good evening");
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Pradeep");
      }
    });

    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
        const todayStart = `${today}T00:00:00.000Z`;
        const todayEnd = `${today}T23:59:59.999Z`;

        const [activeRes, newRes, mmRes, attRes, trainerRes] = await Promise.all([
          supabase.from("members").select("id").eq("is_active", true),
          supabase.from("members").select("id").eq("is_active", true).gte("joined_date", monthStart),
          supabase.from("member_memberships").select("*, member:members(*), plan:membership_plans(*)"),
          supabase.from("attendance").select("*, member:members(*)").gte("check_in", todayStart).lte("check_in", todayEnd),
          supabase.from("trainers").select("*").eq("is_active", true),
        ]);

        const allMM = (mmRes.data ?? []) as any[];
        const overdueMembers = allMM.filter(m => m.payment_status === "overdue");
        const totalCollected = allMM.filter(m => m.payment_status === "paid").reduce((s, m) => s + (m.amount_paid || 0), 0);
        const totalPending = allMM.filter(m => m.payment_status === "pending").reduce((s, m) => s + (m.plan?.price || 0), 0);
        const totalOverdue = overdueMembers.reduce((s, m) => s + ((m.plan?.price || 0) - (m.amount_paid || 0)), 0);

        setData({
          totalActive: activeRes.data?.length ?? 0,
          newThisMonth: newRes.data?.length ?? 0,
          expiringThisWeek: 0, 
          totalCollected,
          totalPending,
          totalOverdue,
          overdueMembers,
          todayCheckins: attRes.data?.length ?? 0,
          currentlyInGym: (attRes.data ?? []).filter((a: any) => !a.check_out).length,
          todayAttendance: attRes.data as any,
          trainers: trainerRes.data ?? []
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        .page {
          width: 100%;
          max-width: 62vw;
          margin: 0 auto;
          padding: 40px 32px 80px;
        }
        .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 48px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .greeting {
          font-family: var(--font-display);
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.1;
          color: var(--text-primary);
        }
        .greeting span { color: var(--accent-green); }
        .date-pill {
          display: inline-block;
          margin-top: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: 99px;
          padding: 6px 14px;
        }
        .live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--accent-green);
        }
        .section-label {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 16px;
          margin-top: 40px;
        }
        .stats-grid {
          display: grid;
          gap: 2px;
          border-radius: var(--radius);
          overflow: hidden;
          border: 10px solid transparent; /* Mimics the old spacing feeling */
          margin: -10px;
        }
        .stats-grid-members { grid-template-columns: repeat(4, 1fr); }
        .stats-grid-revenue { grid-template-columns: repeat(3, 1fr); }

        .stats-grid > div:first-child { border-radius: var(--radius) 0 0 var(--radius) !important; }
        .stats-grid > div:last-child  { border-radius: 0 var(--radius) var(--radius) 0 !important; }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        /* Loading / Error styles precisely from members page */
        .loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 1.1rem;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
          gap: 12px;
        }
        .loading-spinner {
          width: 20px; height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--accent-green);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .error-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-red);
          font-family: var(--font-display);
        }

        .row-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border);
        }
        .row-item:last-child { border-bottom: none; }
      `}</style>

      <Nav role="owner" userName={userName} />

      {loading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          Loading dashboard...
        </div>
      )}

      {error && <div className="error-screen">Failed to load: {error}</div>}

      {!loading && !error && data && (
        <div className="page">
          <div className="header">
            <div>
              <h1 className="greeting">
                {greeting},<br />
                <span>{userName.split(' ')[0]}</span>
              </h1>
              <span className="date-pill">{todayStr}</span>
            </div>
            <div className="live-badge">
              <div className="live-dot" />
              Live data
            </div>
          </div>

          <p className="section-label">Members</p>
          <div className="stats-grid stats-grid-members">
            <StatCard label="Active members" value={data.totalActive} accent="green" />
            <StatCard label="New this month" value={data.newThisMonth} sub="joined recently" />
            <StatCard label="Expiring week" value={data.expiringThisWeek} sub="need renewal" />
            <StatCard label="In gym right now" value={data.currentlyInGym} sub={`${data.todayCheckins} check-ins today`} />
          </div>

          <p className="section-label">Revenue</p>
          <div className="stats-grid stats-grid-revenue">
            <StatCard label="Total collected" value={formatINR(data.totalCollected)} accent="green" />
            <StatCard label="Pending" value={formatINR(data.totalPending)} sub="awaiting payment" />
            <StatCard label="Overdue" value={formatINR(data.totalOverdue)} accent="red" sub={`${data.overdueMembers.length} members`} />
          </div>

          <p className="section-label">Today</p>
          <div className="bottom-grid">
            <Panel title="Check-ins today" badge={data.todayCheckins}>
              {data.todayAttendance.length === 0 ? (
                <div style={{ padding: 32, fontSize: 14, color: 'var(--text-muted)' }}>No check-ins today.</div>
              ) : (
                data.todayAttendance.map((a: any) => (
                  <div key={a.id} className="row-item">
                    <Avatar name={a.member.full_name} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{a.member.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>In {formatTime(a.check_in)}</div>
                    </div>
                    <StatusPill label={a.check_out ? "Left" : "In gym"} type={a.check_out ? "neutral" : "success"} />
                  </div>
                ))
              )}
            </Panel>

            <Panel title="Active Trainers" badge={data.trainers.length}>
              {data.trainers.slice(0, 5).map((t: any) => (
                <div key={t.id} className="row-item">
                  <Avatar name={t.full_name} size={40} accent="blue" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{t.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.specialization}</div>
                  </div>
                  <StatusPill label="Available" type="info" />
                </div>
              ))}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
