"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed recently
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    const dismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissed === "true") {
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show our custom UI
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the native install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_prompt_dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "80px", // Above the bottom tab bar if it exists
      left: "16px",
      right: "16px",
      backgroundColor: "var(--bg2)",
      border: "1px solid var(--border)",
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
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "var(--accent-amber)",
            color: "#000",
            border: "none",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          <Download size={16} />
          Install
        </button>
        <button 
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            padding: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
