/**
 * Bodyline — Dev/UAT Database Seed Script
 *
 * Run with:
 *   npx tsx scripts/seed-dev.ts
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS (required for seeding).
 * Reads from .env.local — make sure it points to the DEV Supabase project.
 *
 * WARNING: Deletes and re-seeds ALL data. Never run on production.
 *
 * What this seeds:
 *   - 2 gyms: "FitPeak Gym" (Pune) and "Iron Temple" (Mumbai)
 *   - Auth users: 2 owners + 2 trainers per gym
 *   - 3 membership plans per gym
 *   - 20 members per gym (mix of active/overdue/expiring/new)
 *   - Memberships, trainer assignments, attendance records
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Use service role key — bypasses RLS, safe for seeding only
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Pre-seeded gym IDs (must match 00_fresh_schema.sql) ──────────────────────
const GYM_FITPEAK  = "a1b2c3d4-0000-0000-0000-000000000001"; // "Bodyline" slug → repurposed as FitPeak in dev
const GYM_IRON     = "b2c3d4e5-0000-0000-0000-000000000002"; // "Iron Temple" slug

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Auth users to provision ───────────────────────────────────────────────────
interface AuthUserSpec {
  email: string;
  password: string;
  role: "owner" | "trainer";
  gym_id: string;
  full_name: string;
}

const authUsers: AuthUserSpec[] = [
  // FitPeak owners & trainer
  { email: "owner@fitpeak.dev", password: "Fitpeak@123", role: "owner", gym_id: GYM_FITPEAK, full_name: "Suresh Menon" },
  { email: "trainer1@fitpeak.dev", password: "Fitpeak@123", role: "trainer", gym_id: GYM_FITPEAK, full_name: "Kiran Desai" },
  { email: "trainer2@fitpeak.dev", password: "Fitpeak@123", role: "trainer", gym_id: GYM_FITPEAK, full_name: "Pooja Nair" },
  // Iron Temple owner & trainer
  { email: "owner@irontemple.dev", password: "Iron@123456", role: "owner", gym_id: GYM_IRON, full_name: "Vikram Shah" },
  { email: "trainer1@irontemple.dev", password: "Iron@123456", role: "trainer", gym_id: GYM_IRON, full_name: "Rahul Joshi" },
];

// ── Membership plans ──────────────────────────────────────────────────────────
const fitpeakPlans = [
  { gym_id: GYM_FITPEAK, name: "Monthly Flex",   duration_days: 30,  price: 1200, description: "30-day open access", is_active: true, max_freeze_days: 5  },
  { gym_id: GYM_FITPEAK, name: "Quarter Strong",  duration_days: 90,  price: 3200, description: "Best for 3-month goals", is_active: true, max_freeze_days: 10 },
  { gym_id: GYM_FITPEAK, name: "Annual Elite",    duration_days: 365, price: 9999, description: "Full year + PT session/month", is_active: true, max_freeze_days: 30 },
];

const ironTemplePlans = [
  { gym_id: GYM_IRON, name: "Iron Monthly",   duration_days: 30,  price: 1500, description: "Monthly iron access", is_active: true, max_freeze_days: 0  },
  { gym_id: GYM_IRON, name: "Iron Quarterly", duration_days: 90,  price: 3999, description: "3-month powerlifting program", is_active: true, max_freeze_days: 7  },
  { gym_id: GYM_IRON, name: "Iron Annual",    duration_days: 365, price: 12000, description: "Yearly unlimited access", is_active: true, max_freeze_days: 14 },
];

// ── Trainers (no-auth placeholder trainers — auth linked separately) ──────────
const fitpeakTrainers = [
  { gym_id: GYM_FITPEAK, full_name: "Kiran Desai",   phone: "9988771001", email: "trainer1@fitpeak.dev", specialization: "Weight Loss & Cardio", is_active: true },
  { gym_id: GYM_FITPEAK, full_name: "Pooja Nair",    phone: "9988771002", email: "trainer2@fitpeak.dev", specialization: "Yoga & Flexibility", is_active: true },
];

const ironTempleTrainers = [
  { gym_id: GYM_IRON, full_name: "Rahul Joshi",   phone: "8877661001", email: "trainer1@irontemple.dev", specialization: "Powerlifting & Strength", is_active: true },
  { gym_id: GYM_IRON, full_name: "Meera Pillai",  phone: "8877661002", email: "trainer2@irontemple.dev", specialization: "CrossFit & Conditioning", is_active: true },
];

// ── Members — FitPeak Gym (Pune) ──────────────────────────────────────────────
const fitpeakMembers = [
  // Active — paid up
  { gym_id: GYM_FITPEAK, full_name: "Aarav Kulkarni",     phone: "9123400001", email: "aarav.k@gmail.com",     date_of_birth: "1996-03-12", joined_date: daysFromToday(-200), is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Sneha Patil",        phone: "9123400002", email: "sneha.p@gmail.com",     date_of_birth: "1999-07-04", joined_date: daysFromToday(-150), is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Rohan Deshpande",    phone: "9123400003", email: null,                   date_of_birth: "1993-11-22", joined_date: daysFromToday(-100), is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Prachi Joshi",       phone: "9123400004", email: "prachi.j@yahoo.com",   date_of_birth: "1997-01-18", joined_date: daysFromToday(-80),  is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Siddharth Rao",      phone: "9123400005", email: null,                   date_of_birth: "1994-06-09", joined_date: daysFromToday(-60),  is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Ananya Sharma",      phone: "9123400006", email: "ananya.s@gmail.com",   date_of_birth: "2001-04-30", joined_date: daysFromToday(-45),  is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Nikhil Bhat",        phone: "9123400007", email: null,                   date_of_birth: "1992-09-15", joined_date: daysFromToday(-30),  is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Riya Gokhale",       phone: "9123400008", email: "riya.g@outlook.com",   date_of_birth: "2000-12-01", joined_date: daysFromToday(-120), is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Tejas Naik",         phone: "9123400009", email: null,                   date_of_birth: "1995-08-22", joined_date: daysFromToday(-90),  is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Poornima Desai",     phone: "9123400010", email: "poornima.d@gmail.com", date_of_birth: "1998-02-14", joined_date: daysFromToday(-75),  is_active: true  },
  // Expiring soon (within 7 days)
  { gym_id: GYM_FITPEAK, full_name: "Omkar Ghosale",      phone: "9123400011", email: null,                   date_of_birth: "1991-10-05", joined_date: daysFromToday(-28),  is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Sheetal Wadekar",    phone: "9123400012", email: "sheetal.w@gmail.com",  date_of_birth: "1988-05-19", joined_date: daysFromToday(-26),  is_active: true  },
  // Overdue
  { gym_id: GYM_FITPEAK, full_name: "Gaurav Pawar",       phone: "9123400013", email: null,                   date_of_birth: "1987-03-22", joined_date: daysFromToday(-60),  is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Archana Mane",       phone: "9123400014", email: "archana.m@gmail.com",  date_of_birth: "1995-07-11", joined_date: daysFromToday(-45),  is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Santosh Jadhav",     phone: "9123400015", email: null,                   date_of_birth: "1993-01-30", joined_date: daysFromToday(-90),  is_active: true  },
  // Inactive/lapsed
  { gym_id: GYM_FITPEAK, full_name: "Rekha Sawant",       phone: "9123400016", email: "rekha.s@gmail.com",    date_of_birth: "1985-09-08", joined_date: daysFromToday(-365), is_active: false },
  { gym_id: GYM_FITPEAK, full_name: "Vishal More",        phone: "9123400017", email: null,                   date_of_birth: "1990-04-14", joined_date: daysFromToday(-240), is_active: false },
  // New this month — pending payment
  { gym_id: GYM_FITPEAK, full_name: "Kaveri Kulkarni",    phone: "9123400018", email: "kaveri.k@gmail.com",   date_of_birth: "2001-11-22", joined_date: daysFromToday(-5),   is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Devraj Patil",       phone: "9123400019", email: null,                   date_of_birth: "1998-06-30", joined_date: daysFromToday(-8),   is_active: true  },
  { gym_id: GYM_FITPEAK, full_name: "Ishaan Joshi",       phone: "9123400020", email: "ishaan.j@gmail.com",   date_of_birth: "1996-03-17", joined_date: daysFromToday(-3),   is_active: true  },
];

// ── Members — Iron Temple (Mumbai) ────────────────────────────────────────────
const ironTempleMembers = [
  { gym_id: GYM_IRON, full_name: "Aryan Mehta",       phone: "9988440001", email: "aryan.m@gmail.com",    date_of_birth: "1995-04-12", joined_date: daysFromToday(-180), is_active: true  },
  { gym_id: GYM_IRON, full_name: "Nisha Kapoor",      phone: "9988440002", email: "nisha.k@gmail.com",    date_of_birth: "1998-07-22", joined_date: daysFromToday(-120), is_active: true  },
  { gym_id: GYM_IRON, full_name: "Sameer Khan",       phone: "9988440003", email: null,                  date_of_birth: "1992-01-15", joined_date: daysFromToday(-90),  is_active: true  },
  { gym_id: GYM_IRON, full_name: "Divya Singhania",   phone: "9988440004", email: "divya.s@yahoo.com",   date_of_birth: "1990-11-30", joined_date: daysFromToday(-200), is_active: true  },
  { gym_id: GYM_IRON, full_name: "Kunal Shetty",      phone: "9988440005", email: null,                  date_of_birth: "2000-03-08", joined_date: daysFromToday(-60),  is_active: true  },
  { gym_id: GYM_IRON, full_name: "Priya Malhotra",    phone: "9988440006", email: "priya.m@gmail.com",   date_of_birth: "1997-09-14", joined_date: daysFromToday(-150), is_active: true  },
  { gym_id: GYM_IRON, full_name: "Rohan Verma",       phone: "9988440007", email: null,                  date_of_birth: "1994-06-25", joined_date: daysFromToday(-45),  is_active: true  },
  { gym_id: GYM_IRON, full_name: "Zara Sheikh",       phone: "9988440008", email: "zara.s@gmail.com",    date_of_birth: "1996-12-03", joined_date: daysFromToday(-300), is_active: true  },
  // Expiring soon
  { gym_id: GYM_IRON, full_name: "Ankit Gupta",       phone: "9988440009", email: null,                  date_of_birth: "1993-08-17", joined_date: daysFromToday(-27),  is_active: true  },
  { gym_id: GYM_IRON, full_name: "Riya Nair",         phone: "9988440010", email: "riya.n@outlook.com",  date_of_birth: "1999-02-28", joined_date: daysFromToday(-26),  is_active: true  },
  // Overdue
  { gym_id: GYM_IRON, full_name: "Harsh Patel",       phone: "9988440011", email: null,                  date_of_birth: "1991-10-05", joined_date: daysFromToday(-60),  is_active: true  },
  { gym_id: GYM_IRON, full_name: "Shreya Agarwal",    phone: "9988440012", email: "shreya.a@gmail.com",  date_of_birth: "1988-05-19", joined_date: daysFromToday(-45),  is_active: true  },
  // Inactive
  { gym_id: GYM_IRON, full_name: "Tarun Luthra",      phone: "9988440013", email: null,                  date_of_birth: "1987-03-22", joined_date: daysFromToday(-365), is_active: false },
  // New this month
  { gym_id: GYM_IRON, full_name: "Anika Sharma",      phone: "9988440014", email: "anika.s@gmail.com",   date_of_birth: "2001-11-22", joined_date: daysFromToday(-4),   is_active: true  },
  { gym_id: GYM_IRON, full_name: "Dev Kohli",         phone: "9988440015", email: null,                  date_of_birth: "1998-06-30", joined_date: daysFromToday(-7),   is_active: true  },
];

// ── Seed function ─────────────────────────────────────────────────────────────

async function clearGymData(gymId: string) {
  await supabase.from("session_logs").delete().eq("gym_id", gymId);
  await supabase.from("trainer_attendance").delete().eq("gym_id", gymId);
  await supabase.from("attendance").delete().eq("gym_id", gymId);
  await supabase.from("trainer_assignments").delete().eq("gym_id", gymId);
  await supabase.from("member_memberships").delete().eq("gym_id", gymId);
  await supabase.from("members").delete().eq("gym_id", gymId);
  await supabase.from("trainers").delete().eq("gym_id", gymId);
  await supabase.from("membership_plans").delete().eq("gym_id", gymId);
}

async function seedGym(
  gymId: string,
  gymName: string,
  plans: typeof fitpeakPlans,
  trainerRows: typeof fitpeakTrainers,
  memberRows: typeof fitpeakMembers,
  // Expiring soon = indices 10 & 11, Overdue = 12–14, Inactive = 15–16, New = 17–19
  overdueIndices: number[],
  expiringIndices: number[],
  newIndices: number[]
) {
  console.log(`\n🏋️  Seeding ${gymName} (${gymId.slice(0, 8)}...)...`);

  // Plans
  const { data: insertedPlans, error: plansErr } = await supabase
    .from("membership_plans").insert(plans).select();
  if (plansErr) throw new Error(`[${gymName}] Plans: ${plansErr.message}`);
  console.log(`   ✅ ${insertedPlans.length} plans`);

  const planMap = Object.fromEntries(insertedPlans.map((p) => [p.name, p.id]));
  const planNames = Object.keys(planMap);

  // Trainers
  const { data: insertedTrainers, error: trainersErr } = await supabase
    .from("trainers").insert(trainerRows).select();
  if (trainersErr) throw new Error(`[${gymName}] Trainers: ${trainersErr.message}`);
  console.log(`   ✅ ${insertedTrainers.length} trainers`);

  // Members
  const { data: insertedMembers, error: membersErr } = await supabase
    .from("members").insert(memberRows).select();
  if (membersErr) throw new Error(`[${gymName}] Members: ${membersErr.message}`);
  console.log(`   ✅ ${insertedMembers.length} members`);

  // Memberships
  const memberships = insertedMembers.map((m, i) => {
    if (!m.is_active) {
      return {
        gym_id: gymId, member_id: m.id, plan_id: planMap[planNames[0]],
        start_date: daysFromToday(-120), end_date: daysFromToday(-30),
        amount_paid: plans[0].price, payment_status: "paid" as const,
        payment_method: "cash" as const,
      };
    }
    if (expiringIndices.includes(i)) {
      return {
        gym_id: gymId, member_id: m.id, plan_id: planMap[planNames[0]],
        start_date: daysFromToday(-27), end_date: daysFromToday(3),
        amount_paid: plans[0].price, payment_status: "paid" as const,
        payment_method: "upi" as const,
      };
    }
    if (overdueIndices.includes(i)) {
      return {
        gym_id: gymId, member_id: m.id, plan_id: planMap[planNames[1]],
        start_date: daysFromToday(-95), end_date: daysFromToday(-5),
        amount_paid: 0, payment_status: "overdue" as const,
        payment_method: null,
      };
    }
    if (newIndices.includes(i)) {
      return {
        gym_id: gymId, member_id: m.id, plan_id: planMap[planNames[0]],
        start_date: m.joined_date, end_date: daysFromToday(25),
        amount_paid: 0, payment_status: "pending" as const,
        payment_method: null,
      };
    }
    const planName = pick(planNames);
    const plan = plans.find((p) => p.name === planName)!;
    return {
      gym_id: gymId, member_id: m.id, plan_id: planMap[planName],
      start_date: daysFromToday(-Math.floor(plan.duration_days / 2)),
      end_date: daysFromToday(Math.floor(plan.duration_days / 2)),
      amount_paid: plan.price, payment_status: "paid" as const,
      payment_method: pick(["cash", "upi", "card"] as const),
    };
  });

  const { data: insertedMemberships, error: mmErr } = await supabase
    .from("member_memberships").insert(memberships).select();
  if (mmErr) throw new Error(`[${gymName}] Memberships: ${mmErr.message}`);
  console.log(`   ✅ ${insertedMemberships.length} memberships`);

  // Trainer assignments
  const activeMembers = insertedMembers.filter((m) => m.is_active);
  const assignments = activeMembers.map((m, i) => ({
    gym_id: gymId,
    trainer_id: insertedTrainers[i % insertedTrainers.length].id,
    member_id: m.id,
    assigned_date: m.joined_date,
    is_current: true,
  }));

  const { data: insertedAssignments, error: assignErr } = await supabase
    .from("trainer_assignments").insert(assignments).select();
  if (assignErr) throw new Error(`[${gymName}] Assignments: ${assignErr.message}`);
  console.log(`   ✅ ${insertedAssignments.length} trainer assignments`);

  // Today's attendance (first 6 active members)
  const now = new Date();
  const todayAttendance = activeMembers.slice(0, 6).map((m, i) => {
    const checkIn = new Date(now);
    checkIn.setHours(6 + i, pick([0, 15, 30, 45]), 0, 0);
    const checkOut = i < 4
      ? new Date(checkIn.getTime() + 75 * 60 * 1000).toISOString()
      : null;
    return { gym_id: gymId, member_id: m.id, check_in: checkIn.toISOString(), check_out: checkOut, notes: null };
  });

  const { data: insertedAtt, error: attErr } = await supabase
    .from("attendance").insert(todayAttendance).select();
  if (attErr) throw new Error(`[${gymName}] Attendance: ${attErr.message}`);
  console.log(`   ✅ ${insertedAtt.length} attendance records`);

  return {
    plans: insertedPlans.length,
    trainers: insertedTrainers.length,
    members: insertedMembers.length,
    memberships: insertedMemberships.length,
    assignments: insertedAssignments.length,
    attendance: insertedAtt.length,
  };
}

async function provisionAuthUsers() {
  console.log("\n🔑 Provisioning auth users...");
  const results: { email: string; status: string }[] = [];

  for (const spec of authUsers) {
    // Check if user already exists (list users, filter by email)
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existing = existingList?.users?.find((u) => u.email === spec.email);

    if (existing) {
      // Update metadata to ensure gym_id and role are correct
      await supabase.auth.admin.updateUserById(existing.id, {
        app_metadata: { role: spec.role, gym_id: spec.gym_id },
        user_metadata: { full_name: spec.full_name, role: spec.role },
      });
      results.push({ email: spec.email, status: "updated" });
    } else {
      const { error } = await supabase.auth.admin.createUser({
        email: spec.email,
        password: spec.password,
        email_confirm: true,
        app_metadata: { role: spec.role, gym_id: spec.gym_id },
        user_metadata: { full_name: spec.full_name, role: spec.role },
      });
      results.push({ email: spec.email, status: error ? `❌ ${error.message}` : "created" });
    }
  }

  for (const r of results) {
    console.log(`   ${r.status === "created" || r.status === "updated" ? "✅" : "⚠️ "} ${r.email} → ${r.status}`);
  }
}

async function seed() {
  console.log("🌱 Bodyline DEV Seed — Starting...");
  console.log(`   Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log("");

  // Clear existing data for both gyms
  console.log("🗑  Clearing existing gym data...");
  await clearGymData(GYM_FITPEAK);
  await clearGymData(GYM_IRON);
  console.log("   Done.");

  // Seed FitPeak (Pune)
  const fitpeakStats = await seedGym(
    GYM_FITPEAK, "FitPeak Gym (Pune)",
    fitpeakPlans, fitpeakTrainers, fitpeakMembers,
    [12, 13, 14],   // overdue indices
    [10, 11],       // expiring indices
    [17, 18, 19]    // new/pending indices
  );

  // Seed Iron Temple (Mumbai)
  const ironStats = await seedGym(
    GYM_IRON, "Iron Temple (Mumbai)",
    ironTemplePlans, ironTempleTrainers, ironTempleMembers,
    [10, 11],   // overdue indices
    [8, 9],     // expiring indices
    [13, 14]    // new/pending indices
  );

  // Provision auth users
  await provisionAuthUsers();

  // Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ DEV Seed complete!\n");
  console.log("  FitPeak Gym (Pune):");
  for (const [k, v] of Object.entries(fitpeakStats)) console.log(`    ${k.padEnd(12)}: ${v}`);
  console.log("  Iron Temple (Mumbai):");
  for (const [k, v] of Object.entries(ironStats)) console.log(`    ${k.padEnd(12)}: ${v}`);
  console.log("\n  Auth credentials (Dev only):");
  for (const u of authUsers) {
    console.log(`    ${u.role.padEnd(7)} ${u.email.padEnd(35)} → ${u.password}`);
  }
  console.log("\n  Local URLs:");
  console.log("    bodyline.localhost:3000   (FitPeak owner)");
  console.log("    iron-temple.localhost:3000  (Iron Temple owner)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

seed().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("\n❌ Seed failed:", msg);
  process.exit(1);
});
