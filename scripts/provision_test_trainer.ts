import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function provisionTestTrainer() {
  const testEmail = 'trainer@bodyline.in';
  const testPassword = 'TrainerPassword123!';
  const testName = 'Test Trainer';

  console.log(`Checking for existing trainer auth user: ${testEmail}`);
  
  let authUserId: string;

  // 1. Try to find or create the auth user
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    process.exit(1);
  }

  const existingUser = usersData.users.find(u => u.email === testEmail);

  if (existingUser) {
    console.log(`Auth user already exists (${existingUser.id}). Updating password and metadata...`);
    authUserId = existingUser.id;
    
    // Update password and metadata
    await supabase.auth.admin.updateUserById(authUserId, {
      password: testPassword,
      user_metadata: { role: 'trainer', full_name: testName },
      app_metadata: { role: 'trainer' }
    });
  } else {
    console.log("Creating new auth user...");
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { role: 'trainer', full_name: testName },
      app_metadata: { role: 'trainer' }
    });

    if (createError) {
      console.error("Error creating user:", createError);
      process.exit(1);
    }
    authUserId = createData.user.id;
    console.log(`Created auth user: ${authUserId}`);
  }

  // 2. Ensure a gym exists to assign them to
  const { data: gyms } = await supabase.from('gyms').select('id').limit(1);
  if (!gyms || gyms.length === 0) {
    console.error("No gyms found in DB! Cannot assign trainer.");
    process.exit(1);
  }
  const gymId = gyms[0].id;

  // 3. Link to a trainer record
  console.log("Checking for existing trainer record...");
  const { data: trainerData, error: trainerError } = await supabase
    .from('trainers')
    .select('id')
    .eq('email', testEmail)
    .single();

  if (trainerData) {
    console.log(`Found existing trainer record (${trainerData.id}). Linking auth ID...`);
    const { error: updateError } = await supabase
      .from('trainers')
      .update({ trainer_auth_user_id: authUserId })
      .eq('id', trainerData.id);
    
    if (updateError) console.error("Error linking:", updateError);
    else console.log("Successfully linked.");
  } else {
    console.log("Creating new trainer record...");
    const { error: insertError } = await supabase
      .from('trainers')
      .insert({
        gym_id: gymId,
        full_name: testName,
        email: testEmail,
        phone: '9999999999',
        is_active: true,
        trainer_auth_user_id: authUserId
      });
      
    if (insertError) console.error("Error creating trainer row:", insertError);
    else console.log("Successfully created and linked trainer row.");
  }

  console.log("\n✅ Provisioning complete!");
  console.log(`\nYou can now log in at http://localhost:3000/login`);
  console.log(`Email: ${testEmail}`);
  console.log(`Password: ${testPassword}\n`);
}

provisionTestTrainer();
