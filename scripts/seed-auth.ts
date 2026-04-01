/**
 * Bodyline — Auth User Seeder
 * Run once: npx tsx scripts/seed-auth.ts
 *
 * Creates Auth users for:
 *  - 1 owner:   pradeep@bodyline.in
 *  - 3 trainers: karthik@bodyline.in, divya@bodyline.in, suresh@bodyline.in
 *  - 2 members:  rahul.demo@bodyline.in, priya.demo@bodyline.in
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (NOT the anon key).
 * The service role key bypasses RLS and can create auth users server-side.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

// Use service role client — required for admin.createUser
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Bodyline@123";

const USERS = [
  // Owner
  {
    email: "pradeep@bodyline.in",
    password: PASSWORD,
    role: "owner",
    display: "Pradeep (Owner)",
  },
  // Trainers
  {
    email: "karthik@bodyline.in",
    password: PASSWORD,
    role: "trainer",
    display: "Karthik Rajan (Trainer)",
  },
  {
    email: "divya@bodyline.in",
    password: PASSWORD,
    role: "trainer",
    display: "Divya Nair (Trainer)",
  },
  {
    email: "suresh@bodyline.in",
    password: PASSWORD,
    role: "trainer",
    display: "Suresh Babu (Trainer)",
  },
  // Demo members
  {
    email: "rahul.demo@bodyline.in",
    password: PASSWORD,
    role: "member",
    display: "Rahul (Demo Member)",
  },
  {
    email: "priya.demo@bodyline.in",
    password: PASSWORD,
    role: "member",
    display: "Priya (Demo Member)",
  },
];

async function seedAuthUsers() {
  console.log("\n🔐  Bodyline Auth Seeder\n");

  for (const user of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // skip confirmation email — ready to use immediately
      user_metadata: { role: user.role },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log(`⏭   ${user.display} — already exists, skipping`);
      } else {
        console.error(`❌  ${user.display} — ${error.message}`);
      }
    } else {
      console.log(
        `✅  ${user.display} — created (${data.user?.id?.slice(0, 8)}…)`,
      );
    }
  }

  console.log("\n✨  Done. All users can log in with password: Bodyline@123\n");
  console.log("  Demo accounts:");
  console.log("  Owner   →  pradeep@bodyline.in");
  console.log(
    "  Trainer →  karthik@bodyline.in / divya@bodyline.in / suresh@bodyline.in",
  );
  console.log("  Member  →  rahul.demo@bodyline.in / priya.demo@bodyline.in");
  console.log("");
}

seedAuthUsers().catch(console.error);
