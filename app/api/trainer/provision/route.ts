// ============================================================
// app/api/trainer/provision/route.ts
// FEAT-010k — Owner-only endpoint to create a Supabase auth
// account for a trainer and link it to their trainers row.
//
// Flow:
//   1. Verify the caller is an authenticated owner.
//   2. Load the trainer row — confirm it belongs to the same
//      gym and has not already been provisioned.
//   3. Use the admin client (service-role) to create a new
//      Supabase auth user with role=trainer + gym_id metadata.
//   4. Update trainers.trainer_auth_user_id = new auth user id.
//   5. Return { tempPassword } — shown once, never stored.
//
// POST /api/trainer/provision
// Body: { trainerId: string; email: string; fullName: string }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Generates a cryptographically random alphanumeric password.
function generateTempPassword(length = 16): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => chars[b % chars.length])
    .join("");
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse body ────────────────────────────────────────
    const body = (await req.json()) as {
      trainerId?: string;
      email?: string;
      fullName?: string;
    };

    const { trainerId, email, fullName } = body;

    if (!trainerId || !email || !fullName) {
      return NextResponse.json(
        { error: "trainerId, email, and fullName are required." },
        { status: 400 },
      );
    }

    // ── 2. Verify calling user is an authenticated owner ─────
    const serverClient = await createServerClient();
    const {
      data: { user },
      error: userErr,
    } = await serverClient.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    if (user.user_metadata?.role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden. Only owners can provision trainer logins." },
        { status: 403 },
      );
    }

    const gymId = user.app_metadata?.gym_id as string | undefined;
    if (!gymId) {
      return NextResponse.json(
        { error: "No gym assigned to calling user." },
        { status: 400 },
      );
    }

    // ── 3. Load trainer row and validate ────────────────────
    const admin = createAdminClient();

    const { data: trainer, error: trainerErr } = await admin
      .from("trainers")
      .select("id, gym_id, trainer_auth_user_id")
      .eq("id", trainerId)
      .single();

    if (trainerErr || !trainer) {
      return NextResponse.json(
        { error: "Trainer not found." },
        { status: 404 },
      );
    }

    // Enforce gym boundary (belt-and-suspenders on top of RLS)
    if (trainer.gym_id !== gymId) {
      return NextResponse.json(
        { error: "Forbidden. Trainer does not belong to your gym." },
        { status: 403 },
      );
    }

    if (trainer.trainer_auth_user_id) {
      return NextResponse.json(
        { error: "This trainer already has a login provisioned." },
        { status: 409 },
      );
    }

    // ── 4. Create Supabase auth user (admin / service-role) ──
    const tempPassword = generateTempPassword();

    const { data: authData, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Skip email verification flow
        user_metadata: {
          role: "trainer",
          full_name: fullName,
        },
        app_metadata: {
          gym_id: gymId,
          role: "trainer",
        },
      });

    if (createErr || !authData.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Failed to create auth user." },
        { status: 500 },
      );
    }

    // ── 5. Link auth user UUID back to the trainers row ──────
    const { error: updateErr } = await admin
      .from("trainers")
      .update({ trainer_auth_user_id: authData.user.id })
      .eq("id", trainerId);

    if (updateErr) {
      // Auth user was created but link failed — attempt cleanup
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to link auth account to trainer. Rolled back." },
        { status: 500 },
      );
    }

    // ── 6. Return temp password (shown once, never stored) ───
    return NextResponse.json({ tempPassword }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
