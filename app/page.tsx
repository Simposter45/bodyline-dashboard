"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string | null;
}

// ─── SWAP THESE WITH REAL ASSETS WHEN PRADEEP PROVIDES THEM ─────────────────
// Hero: muted autoplay MP4 — gym/workout footage from Pexels (free)
const HERO_VIDEO =
  "https://assets.mixkit.co/videos/preview/mixkit-people-working-out-in-a-gym-40829-large.mp4";
// Hero fallback image shown while video loads
const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=85";

const BRANCHES = [
  {
    name: "Sector 14",
    area: "Sector 14, Gurugram",
    address: "Plot 12, Main Market Road, Sector 14",
    hours: "5:00 AM – 11:00 PM",
    phone: "+91 98100 11001",
    tag: "Flagship",
    image:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80", // SWAP: branch interior
    maps: "https://www.google.com/maps/search/?api=1&query=Sector+14+Gurugram+Gym",
  },
  {
    name: "DLF Phase 1",
    area: "DLF Phase 1, Gurugram",
    address: "B-47, DLF Phase 1, near Galleria Market",
    hours: "5:30 AM – 10:30 PM",
    phone: "+91 98100 11002",
    tag: "Premium",
    image:
      "https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?w=800&q=80", // SWAP: branch interior
    maps: "https://www.google.com/maps/search/?api=1&query=Sector+14+Gurugram+Gym",
  },
  {
    name: "Sohna Road",
    area: "Sohna Road, Gurugram",
    address: "SCO 88, Omaxe City Centre, Sohna Road",
    hours: "6:00 AM – 10:00 PM",
    phone: "+91 98100 11003",
    tag: "Express",
    image:
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80", // SWAP: branch interior
    maps: "https://www.google.com/maps/search/?api=1&query=Sector+14+Gurugram+Gym",
  },
];

const TRAINERS = [
  {
    name: "Karthik Rajan",
    spec: "Strength & Powerlifting",
    exp: "8 yrs",
    bio: "Former national-level powerlifter. Specialises in progressive overload and body recomposition.",
    color: "#b5ff4d",
    image:
      "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=80", // SWAP: Karthik's photo
  },
  {
    name: "Divya Nair",
    spec: "Cardio & HIIT",
    exp: "6 yrs",
    bio: "Certified Zumba & HIIT coach. High-energy sessions focused on fat loss and endurance.",
    color: "#ff6b6b",
    image:
      "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80", // SWAP: Divya's photo
  },
  {
    name: "Suresh Babu",
    spec: "Functional Fitness",
    exp: "10 yrs",
    bio: "Movement specialist trained in corrective exercise. Works with all fitness levels.",
    color: "#60a5fa",
    image:
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80", // SWAP: Suresh's photo
  },
];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
function durationLabel(days: number) {
  if (days <= 31) return "/ month";
  if (days <= 92) return "/ quarter";
  if (days <= 185) return "/ 6 months";
  if (days <= 366) return "/ year";
  return "/ session";
}
function durationTag(days: number) {
  if (days <= 31) return "Monthly";
  if (days <= 92) return "3 Months";
  if (days <= 185) return "6 Months";
  if (days <= 366) return "Annual";
  return "PT";
}

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    supabase
      .from("membership_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true })
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const bestPlan = plans.find(
    (p) => p.duration_days > 92 && p.duration_days <= 185,
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500&family=Barlow+Condensed:wght@400;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:    #080808;
          --bg2:   #0e0e0e;
          --bg3:   #161616;
          --bdr:   rgba(255,255,255,0.07);
          --bdr2:  rgba(255,255,255,0.13);
          --tx:    #f0ede4;
          --muted: #5a5a5a;
          --dim:   #272727;
          --green: #b5ff4d;
          --gd:    rgba(181,255,77,0.12);
          --fd:    'Bebas Neue', sans-serif;
          --fc:    'Barlow Condensed', sans-serif;
          --fb:    'Barlow', sans-serif;
        }

        html { scroll-behavior: smooth; }
        body {
          background: var(--bg); color: var(--tx);
          font-family: var(--fb); font-size: 16px;
          line-height: 1.6; overflow-x: hidden;
        }

        ::-webkit-scrollbar {
          display: none;
        }

        /* NAV */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 48px; height: 68px;
          transition: background 0.4s, backdrop-filter 0.4s, border-color 0.4s;
          border-bottom: 1px solid transparent;
        }
        .nav.on {
          background: rgba(8,8,8,0.93);
          backdrop-filter: blur(16px);
          border-color: var(--bdr);
        }
        .logo { font-family: var(--fd); font-size: 28px; letter-spacing: 0.06em; color: var(--tx); text-decoration: none; }
        .logo span { color: var(--green); }
        .nav-links { display: flex; gap: 32px; list-style: none; }
        .nav-links a {
          font-family: var(--fc); font-size: 13px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(240,237,228,0.55); text-decoration: none; transition: color 0.2s;
        }
        .nav-links a:hover { color: var(--tx); }
        .nav-r { display: flex; align-items: center; gap: 10px; }
        .bg { font-family: var(--fc); font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(240,237,228,0.5); text-decoration: none; padding: 7px 16px; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; transition: all 0.2s; }
        .bg:hover { color: var(--tx); border-color: rgba(255,255,255,0.22); }
        .bgreen { font-family: var(--fc); font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #000; text-decoration: none; padding: 8px 20px; background: var(--green); border-radius: 3px; transition: opacity 0.15s; }
        .bgreen:hover { opacity: 0.88; }
        @media (max-width: 768px) { .nav-links { display: none; } .nav { padding: 0 20px; } }

        /* HERO */
        .hero { position: relative; min-height: 100vh; display: flex; align-items: flex-end; overflow: hidden; }
        .hero-media { position: absolute; inset: 0; }
        .hero-fallback {
          position: absolute; inset: 0;
          background: url('${HERO_FALLBACK}') center/cover no-repeat;
          transition: opacity 1s ease;
        }
         .hero-fallback::after {
          content: '';
          position: absolute; inset: 0;
          background: rgba(8,8,8,0.55);
        }
        .hero-fallback.gone { opacity: 0; pointer-events: none; }
        .hero-video {
          width: 100%; height: 100%; object-fit: cover; object-position: center;
          opacity: 0; transition: opacity 1.2s ease;
        }
        .hero-video.on { opacity: 1; }
        .hero-ov {
          position: absolute; inset: 0; z-index: 1;
          background:
            linear-gradient(to top, rgba(8,8,8,1) 0%, rgba(8,8,8,0.72) 28%, rgba(8,8,8,0.22) 60%, rgba(8,8,8,0.45) 100%),
            radial-gradient(ellipse at 70% 50%, transparent 30%, rgba(8,8,8,0.6) 100%);
        }
        .hero-c {
          position: relative; z-index: 2;
          padding: 0 48px 80px;
          max-width: 1200px; margin: 0 auto; width: 100%;
        }
        .eyebrow-hero {
          display: inline-flex; align-items: center; gap: 12px;
          font-family: var(--fc); font-size: 12px; font-weight: 600;
          letter-spacing: 0.18em; text-transform: uppercase; color: var(--green);
          margin-bottom: 20px;
          opacity: 0; animation: fu 0.7s ease 0.3s forwards;
        }
        .eline { width: 36px; height: 1px; background: var(--green); }
        .hero-h1 {
          margin-top: 3rem;
          font-family: var(--fd);
          font-size: clamp(80px, 13vw, 190px);
          line-height: 0.85; letter-spacing: 0.02em; text-transform: uppercase;
          opacity: 0; animation: fu 0.8s ease 0.45s forwards;
        }
        .hero-h1 em { color: var(--green); font-style: normal; display: block; }
        .hero-row {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 40px; margin-top: 36px; flex-wrap: wrap;
        }
        .hero-sub {
          font-size: 17px; font-weight: 300; color: rgba(240,237,228,0.58);
          max-width: 400px; line-height: 1.75;
          opacity: 0; animation: fu 0.7s ease 0.6s forwards;
        }
        .hero-acts {
          display: flex; 
          align-items: center; 
          gap: 2rem;
          opacity: 0; 
          animation: fu 0.7s ease 0.75s forwards;
        }
        .btn-hero {
          display: inline-flex; align-items: center; gap: 10px;
          font-family: var(--fc); font-size: 15px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #000; text-decoration: none;
          padding: 16px 34px; background: var(--green); border-radius: 3px;
          transition: all 0.15s;
        }
        .btn-hero:hover { opacity: 0.88; transform: translateY(-2px); }
        .btn-hero svg { transition: transform 0.2s; }
        .btn-hero:hover svg { transform: translateX(4px); }
        .btn-ghost2 {
          font-family: var(--fc); font-size: 14px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(240,237,228,0.45); text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.18);
          padding-bottom: 2px; transition: all 0.2s;
        }
        .btn-ghost2:hover { color: var(--tx); border-color: rgba(255,255,255,0.45); }

        /* Hero stats */
        .hero-stats {
          display: flex; border-top: 1px solid rgba(255,255,255,0.08);
          margin-top: 64px;
          opacity: 0; animation: fu 0.7s ease 0.9s forwards;
        }
        .hstat { flex: 1; padding: 28px 18px; border-right: 1px solid rgba(255,255,255,0.08); }
        .hstat:last-child { border-right: none; }
        .hstat-n { font-family: var(--fd); font-size: 46px; line-height: 1; color: var(--tx); }
        .hstat-n span { color: var(--green); }
        .hstat-l { font-family: var(--fc); font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-top: 4px; }

        /* Scroll hint */
        .scroll-cue {
          position: absolute; bottom: 36px; right: 48px; z-index: 3;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          opacity: 0; animation: fi 1s ease 1.4s forwards;
        }
        .sc-txt { font-family: var(--fc); font-size: 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); writing-mode: vertical-rl; }
        .sc-line { width: 1px; height: 48px; background: var(--muted); transform-origin: top; animation: scl 2s ease-in-out 1.6s infinite; }
        @keyframes scl { 0%,100%{transform:scaleY(1);opacity:1} 50%{transform:scaleY(0.3);opacity:0.3} }

        @keyframes fu { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fi { from{opacity:0} to{opacity:1} }

        /* TICKER */
        .ticker { background: var(--green); overflow: hidden; padding: 15px 0; }
        .ticker-t { display: flex; width: max-content; animation: tk 28s linear infinite; }
        .t-item {
          font-family: var(--fd); font-size: 18px; letter-spacing: 0.08em; color: #000;
          padding: 0 48px; white-space: nowrap;
          display: flex; align-items: center; gap: 48px;
        }
        .t-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(0,0,0,0.22); }
        @keyframes tk { from{transform:translateX(0)} to{transform:translateX(-50%)} }

        /* LAYOUT */
        .wrap { max-width: 1200px; margin: 0 auto; padding: 0 48px; }
        @media(max-width:600px){ .wrap{padding:0 20px;} }
        .sec { padding: 108px 0; }
        .sec-alt { background: var(--bg2); border-top: 1px solid var(--bdr); border-bottom: 1px solid var(--bdr); }
        .ey {
          display: inline-flex; align-items: center; gap: 10px;
          font-family: var(--fc); font-size: 11px; font-weight: 600;
          letter-spacing: 0.18em; text-transform: uppercase; color: var(--green);
          margin-bottom: 16px;
        }
        .ey::before { content:''; width: 22px; height: 1px; background: var(--green); }
        .sh2 {
          font-family: var(--fd); font-size: clamp(52px,7vw,100px);
          line-height: 0.88; letter-spacing: 0.02em; text-transform: uppercase;
          margin-bottom: 18px;
        }
        .sbody { font-size: 16px; font-weight: 300; color: var(--muted); max-width: 460px; line-height: 1.8; }

        /* SPLIT (Why section) */
        .split { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-top: 60px; }
        @media(max-width:900px){ .split{grid-template-columns:1fr;} }
        .split-img { position: relative; height: 500px; overflow: hidden; }
        .split-img img { width:100%;height:100%;object-fit:cover;object-position:center;filter:brightness(0.72) saturate(0.85);transition:transform 0.6s ease; }
        .split-img:hover img { transform:scale(1.04); }
        .split-ov { position:absolute;inset:0;background:linear-gradient(135deg,rgba(8,8,8,0.55) 0%,transparent 60%); }
        .split-lbl { position:absolute;bottom:20px;left:20px;font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--green);background:rgba(8,8,8,0.75);padding:4px 12px;border-radius:2px; }
        .split-txt { background:var(--bg3);padding:52px 48px;display:flex;flex-direction:column;justify-content:center; }
        .why-items { display:flex;flex-direction:column;gap:26px; }
        .wi { display:flex;gap:20px;align-items:flex-start; }
        .wi-n { font-family:var(--fd);font-size:30px;color:var(--green);line-height:1;flex-shrink:0;width:28px; }
        .wi-title { font-family:var(--fc);font-size:14px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:3px; }
        .wi-body { font-size:13px;font-weight:300;color:var(--muted);line-height:1.7; }

        /* LOCATIONS */
        .locs { display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:60px; }
        @media(max-width:900px){ .locs{grid-template-columns:1fr;} }
        .loc { position:relative;overflow:hidden;height:500px;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid var(--bdr); }
        .loc-bg { position:absolute;inset:0;background-size:cover;background-position:center;filter:brightness(0.45) saturate(0.75);transition:transform 0.6s ease,filter 0.4s ease; }
        .loc:hover .loc-bg { transform:scale(1.05);filter:brightness(0.38) saturate(0.75); }
        .loc-ov { position:absolute;inset:0;background:linear-gradient(to top,rgba(8,8,8,0.97) 0%,rgba(8,8,8,0.5) 50%,rgba(8,8,8,0.08) 100%); }
        .loc-c { position:relative;z-index:2;padding:26px 26px 30px; }
        .loc-tag { display:inline-block;font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#000;background:var(--green);padding:3px 10px;border-radius:2px;margin-bottom:14px; }
        .loc-name { font-family:var(--fd);font-size:36px;letter-spacing:0.02em;line-height:1;margin-bottom:4px; }
        .loc-area { font-family:var(--fc);font-size:12px;font-weight:600;letter-spacing:0.07em;color:var(--green);margin-bottom:18px; }
        .loc-row { display:flex;align-items:flex-start;gap:10px;font-size:13px;font-weight:300;color:rgba(240,237,228,0.55);margin-bottom:7px; }
        .loc-actions { display:flex; justify-content: space-between; align-items: center; padding-top: 1rem;}
        .loc-cta { font-family:var(--fc);font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--green);opacity:0;transform:translateY(8px);transition:all 0.3s ease;display:inline-block;text-decoration:none; }
        .loc:hover .loc-cta { opacity:1;transform:translateY(0); }
        .loc-directions { display:inline-flex;align-items:center;gap:6px; font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(240,237,228,0.35);text-decoration:none;transition:color 0.2s; }
        .loc-directions:hover { color:rgba(240,237,228,0.7); }

        /* PLANS */
        .plans { display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:2px;margin-top:60px; }
        .plan {display: flex; flex-direction: column; align-items: flex-start; background:var(--bg2);border:1px solid var(--bdr);padding:36px 26px;position:relative;transition:all 0.2s; }
        .plan:not(.pf):hover { border-color:var(--bdr2);background:var(--bg3); }
        .pf { background:var(--green);border-color:var(--green); }
        .p-top { position:absolute;top:-1px;right:18px;font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:#000;color:var(--green);padding:4px 12px;border-radius:0 0 6px 6px; }
        .p-dur { display:inline-block;font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:3px 10px;border-radius:2px;margin-bottom:18px; }
        .p-dur.l { color:var(--muted);border:1px solid var(--dim); }
        .p-dur.d { color:rgba(0,0,0,0.55);background:rgba(0,0,0,0.12); }
        .p-name { font-family:var(--fd);font-size:26px;letter-spacing:0.02em; }
        .pf .p-name { color:#000; }
        .p-price { font-family:var(--fd);font-size:54px;line-height:1;letter-spacing:-0.01em;margin:18px 0 4px; }
        .pf .p-price { color:#000; }
        .p-per { font-family:var(--fc);font-size:13px;color:var(--muted);letter-spacing:0.05em; }
        .pf .p-per { color:rgba(0,0,0,0.5); }
        .p-desc { margin-bottom:2rem; font-size:13px;font-weight:300;color:var(--muted);margin-top:14px;line-height:1.6; }
        .pf .p-desc { color:rgba(0,0,0,0.55); }
        .p-btn { display:block; width: 100%;box-sizing: border-box; text-align:center; margin-top:auto;font-family:var(--fc);font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;padding:12px;border-radius:3px;transition:all 0.15s; }
        .p-btn.l { color:var(--tx);border:1px solid var(--dim); }
        .p-btn.l:hover { border-color:var(--green);color:var(--green); }
        .p-btn.d { color:var(--green);background:#000; }
        .p-btn.d:hover { background:#111; }

        /* TRAINERS */
        .trainers { display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:60px; }
        @media(max-width:900px){ .trainers{grid-template-columns:1fr;} }
        .trainer { position:relative;overflow:hidden;border-radius:10px;height:540px;border:1px solid var(--bdr); }
        .tr-img { position:absolute;inset:0;background-size:cover;background-position:center top;filter:brightness(0.5) saturate(0.8);transition:transform 0.5s ease; }
        .trainer:hover .tr-img { transform:scale(1.04); }
        .tr-grad { position:absolute;inset:0;background:linear-gradient(to top,rgba(8,8,8,0.98) 0%,rgba(8,8,8,0.5) 45%,transparent 100%); }
        .tr-c { position:absolute;bottom:0;left:0;right:0;padding:26px 26px 30px;z-index:2; }
        .tr-pill { display:inline-block;font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:2px;margin-bottom:14px; }
        .tr-name { font-family:var(--fd);font-size:36px;letter-spacing:0.02em;line-height:1;margin-bottom:6px; }
        .tr-exp { font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:12px; }
        .tr-bio { font-size:13px;font-weight:300;color:rgba(240,237,228,0.6);line-height:1.7;max-height:0;overflow:hidden;opacity:0;transition:max-height 0.4s ease,opacity 0.35s ease; }
        .trainer:hover .tr-bio { max-height:100px;opacity:1; }

        /* CTA BAND */
        .cband { position:relative;overflow:hidden; }
        .cband-bg { position:absolute;inset:0;background:url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80') center/cover no-repeat;filter:brightness(0.15) saturate(0.5); }
        .cband-ov { position:absolute;inset:0;background:linear-gradient(135deg,rgba(8,8,8,0.92) 0%,rgba(8,8,8,0.65) 100%); }
        .cband-inner { position:relative;z-index:2;max-width:1200px;margin:0 auto;padding:120px 48px;display:flex;align-items:center;justify-content:space-between;gap:60px;flex-wrap:wrap; }
        .cband-h2 { font-family:var(--fd);font-size:clamp(56px,8vw,112px);line-height:0.86;letter-spacing:0.02em;text-transform:uppercase; }
        .cband-h2 span { color:var(--green);display:block; }
        .cband-r { display:flex;flex-direction:column;gap:20px;max-width:360px; }
        .cband-sub { font-size:17px;font-weight:300;color:var(--muted);line-height:1.75; }
        .btn-cta { display:inline-flex;align-items:center;gap:12px;font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#000;text-decoration:none;padding:18px 40px;background:var(--green);border-radius:3px;align-self:flex-start;transition:all 0.15s; }
        .btn-cta:hover { opacity:0.88;transform:translateY(-2px); }

        /* FOOTER */
        .footer { background:var(--bg);border-top:1px solid var(--bdr);padding:64px 48px 40px; }
        .footer-inner { max-width:1200px;margin:0 auto; }
        .f-top { display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;padding-bottom:48px;border-bottom:1px solid var(--bdr); }
        @media(max-width:900px){ .f-top{grid-template-columns:1fr 1fr;} }
        .f-logo { font-family:var(--fd);font-size:40px;letter-spacing:0.05em; }
        .f-logo span { color:var(--green); }
        .f-tag { font-size:14px;font-weight:300;color:var(--muted);margin-top:10px;max-width:220px;line-height:1.7; }
        .f-ct { font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--dim);margin-bottom:18px; }
        .f-a { display:block;font-size:14px;font-weight:300;color:var(--muted);text-decoration:none;margin-bottom:10px;transition:color 0.15s; }
        .f-a:hover { color:var(--tx); }
        .f-bot { display:flex;justify-content:space-between;align-items:center;padding-top:28px;flex-wrap:wrap;gap:12px; }
        .f-copy { font-size:13px;font-weight:300;color:var(--dim); }
        .f-portals { display:flex;gap:24px; }
        .f-port { font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--dim);text-decoration:none;transition:color 0.15s; }
        .f-port:hover { color:var(--green); }

        @media(max-width:600px){
          .hero-c{padding:0 20px 60px;}
          .hero-h1{font-size:80px;}
          .cband-inner{padding:80px 20px;}
          .footer{padding:48px 20px 32px;}
          .locs,.trainers{grid-template-columns:1fr;}
          .plans{grid-template-columns:1fr 1fr;}
          .hero-stats{gap:0;}
        }
        /* ── WhatsApp Button ── */
        .wa-btn {
          position: fixed; bottom: 32px; right: 32px; z-index: 300;
          width: 56px; height: 56px; border-radius: 50%;
          background: #25D366; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(37,211,102,0.4), 0 2px 8px rgba(0,0,0,0.35);
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .wa-btn:hover {
          transform: scale(1.1) translateY(-2px);
          box-shadow: 0 8px 32px rgba(37,211,102,0.5), 0 4px 12px rgba(0,0,0,0.3);
        }
        .wa-btn:active { transform: scale(0.95); }
        .wa-pulse {
          position: absolute; inset: 0; border-radius: 50%;
          background: #25D366;
          animation: wa-pulse 2.5s ease-out infinite;
          z-index: -1;
        }
        @keyframes wa-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        .wa-tooltip {
          position: absolute; right: 66px;
          background: #1c1c21; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 8px 14px;
          font-family: 'Barlow', sans-serif; font-size: 13px; color: #f0ede4;
          white-space: nowrap; pointer-events: none;
          opacity: 0; transform: translateX(6px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .wa-btn:hover .wa-tooltip { opacity: 1; transform: translateX(0); }
      `}</style>

      {/* NAV */}
      <nav className={`nav${scrolled ? " on" : ""}`}>
        <a href="/" className="logo">
          BODYLINE<span>.</span>
        </a>
        <ul className="nav-links">
          <li>
            <a href="#locations">Locations</a>
          </li>
          <li>
            <a href="#plans">Pricing</a>
          </li>
          <li>
            <a href="#trainers">Trainers</a>
          </li>
        </ul>
        <div className="nav-r">
          <a href="/login" className="bg">
            Login
          </a>
          <a href="/onboarding" className="bgreen">
            Join Now →
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-media">
          <div className={`hero-fallback${videoLoaded ? " gone" : ""}`} />
          <video
            ref={videoRef}
            className={`hero-video${videoLoaded ? " on" : ""}`}
            autoPlay
            muted
            loop
            playsInline
            poster={HERO_FALLBACK}
            onCanPlay={() => setVideoLoaded(true)}
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        </div>
        <div className="hero-ov" />
        <div className="hero-c">
          <div className="eyebrow-hero">
            <div className="eline" />3 Locations · Gurugram
          </div>
          <h1 className="hero-h1">
            Train
            <br />
            <em>Harder.</em>
          </h1>
          <div className="hero-row">
            <p className="hero-sub">
              Bodyline is Gurugram's performance gym — built for people who take
              their training seriously. Strength, cardio, functional fitness.
              All under one roof.
            </p>
            <div className="hero-acts">
              <a href="/onboarding" className="btn-hero">
                Start Today
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a href="#plans" className="btn-ghost2">
                See Plans
              </a>
            </div>
          </div>
          <div className="hero-stats">
            {[
              { n: "3", s: "+", l: "Gurugram Locations" },
              { n: "500", s: "+", l: "Active Members" },
              { n: "3", s: "", l: "Expert Trainers" },
              { n: "5", s: "AM", l: "Opens Daily" },
            ].map((s) => (
              <div key={s.l} className="hstat">
                <div className="hstat-n">
                  {s.n}
                  <span>{s.s}</span>
                </div>
                <div className="hstat-l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="scroll-cue">
          <div className="sc-txt">Scroll</div>
          <div className="sc-line" />
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker">
        <div className="ticker-t">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="t-item">
              STRENGTH TRAINING <span className="t-dot" /> CARDIO & HIIT{" "}
              <span className="t-dot" /> FUNCTIONAL FITNESS{" "}
              {/* <span className="t-dot" /> PERSONAL TRAINING{" "} */}
              <span className="t-dot" /> 3 GURUGRAM LOCATIONS{" "}
              <span className="t-dot" /> EXPERT COACHES{" "}
              <span className="t-dot" /> OPEN 7 DAYS <span className="t-dot" />{" "}
              NO EXCUSES <span className="t-dot" />
            </div>
          ))}
        </div>
      </div>

      {/* WHY BODYLINE */}
      <div className="sec">
        <div className="wrap">
          <div className="ey">Why Bodyline</div>
          <h2 className="sh2">
            Serious Gym.
            <br />
            Real Results.
          </h2>
          <div className="split">
            <div className="split-img">
              {/* SWAP: a powerful action shot from inside Bodyline */}
              <img
                src="https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=900&q=80"
                alt="Training at Bodyline"
                loading="lazy"
              />
              <div className="split-ov" />
              <div className="split-lbl">Est. Gurugram</div>
            </div>
            <div className="split-txt">
              <div className="why-items">
                {[
                  {
                    n: "01",
                    t: "Expert Trainers",
                    b: "Certified specialists in strength, cardio, and functional movement. Real coaching, not just supervision.",
                  },
                  {
                    n: "02",
                    t: "All 3 Branches",
                    b: "One membership. Train at any Bodyline location across Gurugram — no extra fees.",
                  },
                  {
                    n: "03",
                    t: "Flexible Plans",
                    b: "Monthly to annual. PT sessions available. Pick what fits your schedule and budget.",
                  },
                  {
                    n: "04",
                    t: "Track Everything",
                    b: "Digital check-ins, session history, and plan expiry — all in your member portal.",
                  },
                ].map((w) => (
                  <div key={w.n} className="wi">
                    <div className="wi-n">{w.n}</div>
                    <div>
                      <div className="wi-title">{w.t}</div>
                      <div className="wi-body">{w.b}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOCATIONS */}
      <div id="locations" className="sec sec-alt">
        <div className="wrap">
          <div className="ey">Our Locations</div>
          <h2 className="sh2">
            Three Gyms.
            <br />
            One City.
          </h2>
          <p className="sbody">
            Premium equipment, expert trainers, zero excuses. Find your nearest
            Bodyline.
          </p>
        </div>
        <div className="wrap" style={{ marginTop: 48 }}>
          <div className="locs">
            {BRANCHES.map((b) => (
              <div key={b.name} className="loc">
                {/* SWAP: replace image URL with real branch photo */}
                <div
                  className="loc-bg"
                  style={{ backgroundImage: `url('${b.image}')` }}
                />
                <div className="loc-ov" />
                <div className="loc-c">
                  <div className="loc-tag">{b.tag}</div>
                  <div className="loc-name">{b.name}</div>
                  <div className="loc-area">{b.area}</div>
                  <div className="loc-row">
                    <span>📍</span>
                    <span>{b.address}</span>
                  </div>
                  <div className="loc-row">
                    <span>🕐</span>
                    <span>{b.hours}</span>
                  </div>
                  <div className="loc-row">
                    <span>📞</span>
                    <span>{b.phone}</span>
                  </div>
                  <div className="loc-actions">
                    <a
                      href={b.maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="loc-directions"
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      Get Directions
                    </a>
                    <a href="/onboarding" className="loc-cta">
                      Join this branch →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLANS */}
      <div id="plans" className="sec">
        <div className="wrap">
          <div className="ey">Membership Plans</div>
          <h2 className="sh2">
            Pick Your
            <br />
            Plan.
          </h2>
          <p className="sbody">
            No hidden fees. Access all 3 branches on any plan. Cancel monthly
            plans anytime.
          </p>
          <div className="plans">
            {plans.map((plan) => {
              const f = plan.id === bestPlan?.id;
              return (
                <div key={plan.id} className={`plan${f ? " pf" : ""}`}>
                  {f && <div className="p-top">Most Popular</div>}
                  <div className={`p-dur ${f ? "d" : "l"}`}>
                    {durationTag(plan.duration_days)}
                  </div>
                  <div className="p-name">{plan.name}</div>
                  <div className="p-price">{formatINR(plan.price)}</div>
                  <div className="p-per">
                    {durationLabel(plan.duration_days)}
                  </div>
                  {plan.description && (
                    <div className="p-desc">{plan.description}</div>
                  )}
                  <a href="/onboarding" className={`p-btn ${f ? "d" : "l"}`}>
                    Get Started →
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TRAINERS */}
      <div id="trainers" className="sec sec-alt">
        <div className="wrap">
          <div className="ey">Our Trainers</div>
          <h2 className="sh2">
            Coached By
            <br />
            The Best.
          </h2>
          <p className="sbody">
            Certified, specialised, and genuinely invested in your progress.
            Hover to learn more.
          </p>
          <div className="trainers">
            {TRAINERS.map((t) => (
              <div key={t.name} className="trainer">
                {/* SWAP: replace with real trainer photo */}
                <div
                  className="tr-img"
                  style={{ backgroundImage: `url('${t.image}')` }}
                />
                <div className="tr-grad" />
                <div className="tr-c">
                  <span
                    className="tr-pill"
                    style={{ background: `${t.color}20`, color: t.color }}
                  >
                    {t.spec}
                  </span>
                  <div className="tr-name">{t.name}</div>
                  <span className="tr-exp">{t.exp} experience</span>
                  <p className="tr-bio">{t.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA BAND */}
      <div className="cband">
        <div className="cband-bg" />
        <div className="cband-ov" />
        <div className="cband-inner">
          <h2 className="cband-h2">
            Ready to
            <br />
            <span>Begin?</span>
          </h2>
          <div className="cband-r">
            <p className="cband-sub">
              Join Bodyline today. Fill in your details, pick a plan, and walk
              in tomorrow. No paperwork. No waiting.
            </p>
            <a href="/onboarding" className="btn-cta">
              Join Now
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="f-top">
            <div>
              <div className="f-logo">
                BODYLINE<span>.</span>
              </div>
              <p className="f-tag">
                Gurugram's performance gym. Three locations, one community.
              </p>
            </div>
            <div>
              <div className="f-ct">Explore</div>
              <a href="#locations" className="f-a">
                Locations
              </a>
              <a href="#plans" className="f-a">
                Pricing
              </a>
              <a href="#trainers" className="f-a">
                Trainers
              </a>
              <a href="/onboarding" className="f-a">
                Join Bodyline
              </a>
            </div>
            <div>
              <div className="f-ct">Portals</div>
              <a href="/login?role=member" className="f-a">
                Member Login
              </a>
              <a href="/login?role=trainer" className="f-a">
                Trainer Login
              </a>
              <a href="/login?role=owner" className="f-a">
                Owner Login
              </a>
            </div>
            <div>
              <div className="f-ct">Contact</div>
              <a href="tel:+919873133287" className="f-a">
                +91 98731 33287
              </a>
              <a href="mailto:hello@bodyline.in" className="f-a">
                hello@bodyline.in
              </a>
              <span className="f-a" style={{ cursor: "default" }}>
                Gurugram, Haryana
              </span>
            </div>
          </div>
          <div className="f-bot">
            <div className="f-copy">
              © {new Date().getFullYear()} Bodyline Fitness Pvt. Ltd. · Gurugram
            </div>
            <div className="f-portals">
              <a href="/login?role=member" className="f-port">
                Member
              </a>
              <a href="/login?role=trainer" className="f-port">
                Trainer
              </a>
              <a href="/login?role=owner" className="f-port">
                Owner
              </a>
            </div>
          </div>
        </div>
      </footer>
      {/* WhatsApp Floating Button */}

      <a
        className="wa-btn"
        href="https://wa.me/919873133287?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20Bodyline%20membership."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
      >
        <div className="wa-pulse" />
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <div className="wa-tooltip">Chat with us</div>
      </a>
    </>
  );
}
