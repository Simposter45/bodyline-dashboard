"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

// Detect iOS (iPhone/iPad) on Safari or Brave
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Detect if running in standalone mode (already installed)
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Already installed as PWA — never show the prompt
    if (isStandalone()) return;

    // Check if dismissed in this session (use sessionStorage so it resets each visit)
    const dismissed = sessionStorage.getItem("pwa_prompt_dismissed");
    if (dismissed === "true") return;

    if (isIOS()) {
      // iOS: show the instructional "tap Share → Add to Home Screen" banner
      // Delay slightly so the page loads first
      const timer = setTimeout(() => setShowIOSPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop Chrome: listen for the native install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
      setShowAndroidPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      setShowAndroidPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowAndroidPrompt(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
    setShowAndroidPrompt(false);
    setShowIOSPrompt(false);
  };

  // ── Android install banner ────────────────────────────────────
  if (showAndroidPrompt) {
    return (
      <div style={{
        position: "fixed",
        bottom: "80px",
        left: "16px",
        right: "16px",
        backgroundColor: "var(--bg2)",
        border: "1px solid var(--border-hi)",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        zIndex: 9999,
        animation: "slideUp 0.3s ease-out"
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
            Install Bodyline App
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
            Add to home screen for a faster, full-screen experience.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleInstallClick}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              backgroundColor: "var(--accent-amber)", color: "#000",
              border: "none", borderRadius: "6px", padding: "8px 12px",
              fontSize: "13px", fontWeight: 600, cursor: "pointer"
            }}
          >
            <Download size={16} />
            Install
          </button>
          <button
            onClick={handleDismiss}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", padding: "4px", cursor: "pointer", display: "flex" }}
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── iOS instructional banner ──────────────────────────────────
  if (showIOSPrompt) {
    return (
      <div style={{
        position: "fixed",
        bottom: "80px",
        left: "16px",
        right: "16px",
        backgroundColor: "var(--bg2)",
        border: "1px solid var(--border-hi)",
        borderRadius: "12px",
        padding: "16px 16px 18px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        zIndex: 9999,
        animation: "slideUp 0.3s ease-out"
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
            Install Bodyline App
          </p>
          <button
            onClick={handleDismiss}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", padding: "0 0 0 8px", cursor: "pointer", display: "flex" }}
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.5 }}>
          <span>Tap</span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            backgroundColor: "var(--bg3)", border: "1px solid var(--border-hi)",
            borderRadius: "6px", padding: "3px 8px", color: "var(--accent-amber)",
            fontWeight: 600, fontSize: "12px", whiteSpace: "nowrap"
          }}>
            <Share size={13} /> Share
          </span>
          <span>then</span>
          <span style={{
            display: "inline-flex", alignItems: "center",
            backgroundColor: "var(--bg3)", border: "1px solid var(--border-hi)",
            borderRadius: "6px", padding: "3px 8px", color: "var(--text-primary)",
            fontWeight: 600, fontSize: "12px", whiteSpace: "nowrap"
          }}>
            Add to Home Screen
          </span>
        </div>
        {/* Down-pointing arrow to indicate the toolbar */}
        <div style={{
          position: "absolute", bottom: "-8px", left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
          borderTop: "8px solid var(--border-hi)"
        }} />
      </div>
    );
  }

  return null;
}
