"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugAuthPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 40, color: 'white' }}>Loading session...</div>;

  return (
    <div style={{ padding: 40, background: '#0d0d0f', minHeight: '100vh', color: 'white', fontFamily: 'monospace' }}>
      <h1>Auth Debug</h1>
      <pre style={{ background: '#1c1c21', padding: 20, borderRadius: 8, overflow: 'auto' }}>
        {JSON.stringify({
          user_id: session?.user?.id,
          email: session?.user?.email,
          role_user_metadata: session?.user?.user_metadata?.role,
          role_app_metadata: session?.user?.app_metadata?.role,
          gym_id_app_metadata: session?.user?.app_metadata?.gym_id,
          full_user_object: session?.user
        }, null, 2)}
      </pre>
      
      {!session?.user?.app_metadata?.gym_id && (
        <div style={{ color: '#f87171', marginTop: 20, fontWeight: 'bold' }}>
          ⚠️ gym_id is MISSING from app_metadata. RLS will block all data.
          Did you run the stamp script and then RE-LOGGED IN?
        </div>
      )}
      
      {session?.user?.app_metadata?.gym_id && (
        <div style={{ color: '#4ade80', marginTop: 20, fontWeight: 'bold' }}>
          ✅ gym_id is present: {session.user.app_metadata.gym_id}
        </div>
      )}
    </div>
  );
}
