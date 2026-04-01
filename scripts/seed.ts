/**
 * Bodyline Gym — Database Seed Script
 *
 * Run with:
 *   npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * in your .env.local (or set them as env vars before running).
 *
 * WARNING: Clears existing data before seeding. Do not run on production.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ------------------------------------------------------------------
// 1. Membership Plans
// ------------------------------------------------------------------

const plans = [
  {
    name: "Monthly",
    duration_days: 30,
    price: 1500,
    description: "Access to all equipment, 1 month validity",
    is_active: true,
  },
  {
    name: "Quarterly",
    duration_days: 90,
    price: 3999,
    description: "3 months — best value for regulars",
    is_active: true,
  },
  {
    name: "Half Yearly",
    duration_days: 180,
    price: 6999,
    description: "6 months unlimited access",
    is_active: true,
  },
  {
    name: "Annual",
    duration_days: 365,
    price: 11999,
    description: "Full year — maximum savings",
    is_active: true,
  },
  {
    name: "Personal Training",
    duration_days: 30,
    price: 4500,
    description: "Monthly plan with dedicated trainer sessions",
    is_active: true,
  },
];

// ------------------------------------------------------------------
// 2. Trainers
// ------------------------------------------------------------------

const trainers = [
  {
    full_name: "Karthik Rajan",
    phone: "9841001001",
    email: "karthik@bodylinegym.in",
    specialization: "Strength & Conditioning",
    is_active: true,
  },
  {
    full_name: "Divya Nair",
    phone: "9841002002",
    email: "divya@bodylinegym.in",
    specialization: "Cardio & Weight Loss",
    is_active: true,
  },
  {
    full_name: "Suresh Babu",
    phone: "9841003003",
    email: "suresh@bodylinegym.in",
    specialization: "Functional Fitness",
    is_active: true,
  },
];

// ------------------------------------------------------------------
// 3. Members — mix of active, inactive, overdue, expiring soon
// ------------------------------------------------------------------

const members = [
  // Active members — paid up
  {
    full_name: "Arjun Krishnamurthy",
    phone: "9790101001",
    email: "arjun.k@gmail.com",
    date_of_birth: "1995-04-12",
    joined_date: daysFromToday(-180),
    is_active: true,
  },
  {
    full_name: "Priya Sundaram",
    phone: "9790101002",
    email: "priya.s@gmail.com",
    date_of_birth: "1998-07-22",
    joined_date: daysFromToday(-120),
    is_active: true,
  },
  {
    full_name: "Vikram Anand",
    phone: "9790101003",
    email: null,
    date_of_birth: "1992-01-15",
    joined_date: daysFromToday(-90),
    is_active: true,
  },
  {
    full_name: "Meena Rajendran",
    phone: "9790101004",
    email: "meena.r@yahoo.com",
    date_of_birth: "1990-11-30",
    joined_date: daysFromToday(-200),
    is_active: true,
  },
  {
    full_name: "Rohit Selvam",
    phone: "9790101005",
    email: null,
    date_of_birth: "2000-03-08",
    joined_date: daysFromToday(-60),
    is_active: true,
  },
  {
    full_name: "Anitha Venkatesh",
    phone: "9790101006",
    email: "anitha.v@gmail.com",
    date_of_birth: "1997-09-14",
    joined_date: daysFromToday(-150),
    is_active: true,
  },
  {
    full_name: "Deepak Murugan",
    phone: "9790101007",
    email: null,
    date_of_birth: "1994-06-25",
    joined_date: daysFromToday(-45),
    is_active: true,
  },
  {
    full_name: "Kavitha Subramanian",
    phone: "9790101008",
    email: "kavitha.sub@gmail.com",
    date_of_birth: "1996-12-03",
    joined_date: daysFromToday(-300),
    is_active: true,
  },
  {
    full_name: "Arun Palani",
    phone: "9790101009",
    email: null,
    date_of_birth: "1993-08-17",
    joined_date: daysFromToday(-30),
    is_active: true,
  },
  {
    full_name: "Sowmya Balaji",
    phone: "9790101010",
    email: "sowmya.b@outlook.com",
    date_of_birth: "1999-02-28",
    joined_date: daysFromToday(-75),
    is_active: true,
  },
  // Members expiring soon (within 7 days) — demo: "expiring this week" stat
  {
    full_name: "Naveen Chandran",
    phone: "9790101011",
    email: null,
    date_of_birth: "1991-10-05",
    joined_date: daysFromToday(-27),
    is_active: true,
  },
  {
    full_name: "Lakshmi Iyer",
    phone: "9790101012",
    email: "lakshmi.iyer@gmail.com",
    date_of_birth: "1988-05-19",
    joined_date: daysFromToday(-28),
    is_active: true,
  },
  // Members with overdue payments — demo: overdue alerts
  {
    full_name: "Balamurugan Pillai",
    phone: "9790101013",
    email: null,
    date_of_birth: "1987-03-22",
    joined_date: daysFromToday(-60),
    is_active: true,
  },
  {
    full_name: "Saranya Devi",
    phone: "9790101014",
    email: "saranya.d@gmail.com",
    date_of_birth: "1995-07-11",
    joined_date: daysFromToday(-45),
    is_active: true,
  },
  {
    full_name: "Manikandan Raj",
    phone: "9790101015",
    email: null,
    date_of_birth: "1993-01-30",
    joined_date: daysFromToday(-90),
    is_active: true,
  },
  // Inactive / lapsed members
  {
    full_name: "Geetha Ramachandran",
    phone: "9790101016",
    email: "geetha.r@gmail.com",
    date_of_birth: "1985-09-08",
    joined_date: daysFromToday(-365),
    is_active: false,
  },
  {
    full_name: "Senthil Kumar",
    phone: "9790101017",
    email: null,
    date_of_birth: "1990-04-14",
    joined_date: daysFromToday(-240),
    is_active: false,
  },
  // New members this month — demo: "new this month" stat
  {
    full_name: "Harini Natarajan",
    phone: "9790101018",
    email: "harini.n@gmail.com",
    date_of_birth: "2001-11-22",
    joined_date: daysFromToday(-5),
    is_active: true,
  },
  {
    full_name: "Praveen Shankar",
    phone: "9790101019",
    email: null,
    date_of_birth: "1998-06-30",
    joined_date: daysFromToday(-10),
    is_active: true,
  },
  {
    full_name: "Radha Krishnan",
    phone: "9790101020",
    email: "radha.k@gmail.com",
    date_of_birth: "1996-03-17",
    joined_date: daysFromToday(-8),
    is_active: true,
  },
];

// ------------------------------------------------------------------
// 4. Seed function
// ------------------------------------------------------------------

async function seed() {
  console.log("🌱 Starting Bodyline seed...\n");

  // ── Clear existing data (order matters due to FK constraints) ──
  console.log("🗑  Clearing existing data...");
  await supabase
    .from("attendance")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("trainer_assignments")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("member_memberships")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("members")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("trainers")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("membership_plans")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("   Done.\n");

  // ── Insert plans ──
  console.log("📋 Inserting membership plans...");
  const { data: insertedPlans, error: plansError } = await supabase
    .from("membership_plans")
    .insert(plans)
    .select();
  if (plansError) throw new Error(`Plans: ${plansError.message}`);
  console.log(`   ✅ ${insertedPlans.length} plans inserted.\n`);

  // ── Insert trainers ──
  console.log("🏋️  Inserting trainers...");
  const { data: insertedTrainers, error: trainersError } = await supabase
    .from("trainers")
    .insert(trainers)
    .select();
  if (trainersError) throw new Error(`Trainers: ${trainersError.message}`);
  console.log(`   ✅ ${insertedTrainers.length} trainers inserted.\n`);

  // ── Insert members ──
  console.log("👥 Inserting members...");
  const { data: insertedMembers, error: membersError } = await supabase
    .from("members")
    .insert(members)
    .select();
  if (membersError) throw new Error(`Members: ${membersError.message}`);
  console.log(`   ✅ ${insertedMembers.length} members inserted.\n`);

  // ── Build lookup maps ──
  const planMap = Object.fromEntries(insertedPlans.map((p) => [p.name, p.id]));
  const trainerIds = insertedTrainers.map((t) => t.id);

  // ── Insert memberships ──
  console.log("💳 Inserting memberships...");

  const memberships = insertedMembers.map((member, i) => {
    // Inactive members get expired memberships
    if (!member.is_active) {
      const start = daysFromToday(-120);
      const end = daysFromToday(-30);
      return {
        member_id: member.id,
        plan_id: planMap["Monthly"],
        start_date: start,
        end_date: end,
        amount_paid: 1500,
        payment_status: "paid" as const,
        payment_method: "cash" as const,
      };
    }

    // Expiring soon members (index 10 & 11)
    if (i === 10 || i === 11) {
      return {
        member_id: member.id,
        plan_id: planMap["Monthly"],
        start_date: daysFromToday(-27),
        end_date: daysFromToday(3),
        amount_paid: 1500,
        payment_status: "paid" as const,
        payment_method: "upi" as const,
      };
    }

    // Overdue members (index 12, 13, 14)
    if (i === 12) {
      return {
        member_id: member.id,
        plan_id: planMap["Quarterly"],
        start_date: daysFromToday(-95),
        end_date: daysFromToday(-5),
        amount_paid: 0,
        payment_status: "overdue" as const,
        payment_method: null,
      };
    }
    if (i === 13) {
      return {
        member_id: member.id,
        plan_id: planMap["Monthly"],
        start_date: daysFromToday(-50),
        end_date: daysFromToday(-20),
        amount_paid: 0,
        payment_status: "overdue" as const,
        payment_method: null,
      };
    }
    if (i === 14) {
      return {
        member_id: member.id,
        plan_id: planMap["Half Yearly"],
        start_date: daysFromToday(-190),
        end_date: daysFromToday(-10),
        amount_paid: 3500,
        payment_status: "overdue" as const,
        payment_method: "cash" as const,
      };
    }

    // New members (index 17, 18, 19) — pending payment
    if (i >= 17) {
      return {
        member_id: member.id,
        plan_id: planMap["Monthly"],
        start_date: member.joined_date,
        end_date: daysFromToday(20),
        amount_paid: 0,
        payment_status: "pending" as const,
        payment_method: null,
      };
    }

    // All others — active paid memberships
    const planOptions = [
      "Monthly",
      "Quarterly",
      "Half Yearly",
      "Annual",
      "Personal Training",
    ];
    const planName = randomItem(planOptions);
    const planPrice = plans.find((p) => p.name === planName)?.price ?? 1500;
    const duration =
      plans.find((p) => p.name === planName)?.duration_days ?? 30;

    return {
      member_id: member.id,
      plan_id: planMap[planName],
      start_date: daysFromToday(-Math.floor(duration / 2)),
      end_date: daysFromToday(Math.floor(duration / 2)),
      amount_paid: planPrice,
      payment_status: "paid" as const,
      payment_method: randomItem(["cash", "upi", "card"] as const),
    };
  });

  const { data: insertedMemberships, error: membershipsError } = await supabase
    .from("member_memberships")
    .insert(memberships)
    .select();
  if (membershipsError)
    throw new Error(`Memberships: ${membershipsError.message}`);
  console.log(`   ✅ ${insertedMemberships.length} memberships inserted.\n`);

  // ── Trainer assignments — assign active members to trainers ──
  console.log("🔗 Assigning trainers to members...");

  const activeMembers = insertedMembers.filter((m) => m.is_active);
  const assignments = activeMembers.map((member, i) => ({
    member_id: member.id,
    trainer_id: trainerIds[i % trainerIds.length],
    assigned_date: member.joined_date,
    is_current: true,
  }));

  const { data: insertedAssignments, error: assignError } = await supabase
    .from("trainer_assignments")
    .insert(assignments)
    .select();
  if (assignError) throw new Error(`Assignments: ${assignError.message}`);
  console.log(
    `   ✅ ${insertedAssignments.length} trainer assignments inserted.\n`,
  );

  // ── Attendance — today's check-ins for the dashboard ──
  console.log("📅 Inserting today's attendance...");

  const now = new Date();
  const todayAttendance = activeMembers.slice(0, 8).map((member, i) => {
    const checkInHour = 6 + i; // 6am, 7am, 8am...
    const checkIn = new Date(now);
    checkIn.setHours(checkInHour, randomItem([0, 15, 30, 45]), 0, 0);

    // First 5 have checked out, last 3 still in gym
    const checkOut =
      i < 5 ? new Date(checkIn.getTime() + 60 * 60 * 1000).toISOString() : null;

    return {
      member_id: member.id,
      check_in: checkIn.toISOString(),
      check_out: checkOut,
      notes: null,
    };
  });

  const { data: insertedAttendance, error: attendanceError } = await supabase
    .from("attendance")
    .insert(todayAttendance)
    .select();
  if (attendanceError)
    throw new Error(`Attendance: ${attendanceError.message}`);
  console.log(
    `   ✅ ${insertedAttendance.length} attendance records inserted.\n`,
  );

  // ── Summary ──
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Seed complete! Here's what's in the DB:\n");
  console.log(`   Plans          : ${insertedPlans.length}`);
  console.log(`   Trainers       : ${insertedTrainers.length}`);
  console.log(
    `   Members        : ${insertedMembers.length} (${activeMembers.length} active)`,
  );
  console.log(`   Memberships    : ${insertedMemberships.length}`);
  console.log(
    `     → paid       : ${memberships.filter((m) => m.payment_status === "paid").length}`,
  );
  console.log(
    `     → pending    : ${memberships.filter((m) => m.payment_status === "pending").length}`,
  );
  console.log(
    `     → overdue    : ${memberships.filter((m) => m.payment_status === "overdue").length}`,
  );
  console.log(`   Assignments    : ${insertedAssignments.length}`);
  console.log(
    `   Today check-ins: ${insertedAttendance.length} (${todayAttendance.filter((a) => !a.check_out).length} still in gym)`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
