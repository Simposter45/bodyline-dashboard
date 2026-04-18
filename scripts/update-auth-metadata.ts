/**
 * scripts/update-auth-metadata.ts
 * Run with: npx tsx scripts/update-auth-metadata.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FOUNDING_GYM_ID = "a1b2c3d4-0000-0000-0000-000000000001";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const USERS_TO_STAMP = [
  "pradeep@bodyline.in",
  "karthik@bodyline.in",
  "divya@bodyline.in",
  "suresh@bodyline.in",
  "rahul.demo@bodyline.in",
  "priya.demo@bodyline.in"
];

async function stampUsers() {
  console.log("🚀 Stamping users with Gym ID...");
  
  let allUsers: any[] = [];
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });
    
    if (listError) throw listError;
    if (users.length === 0) break;
    
    allUsers = allUsers.concat(users);
    if (users.length < perPage) break;
    page++;
  }

  for (const email of USERS_TO_STAMP) {
    const user = allUsers.find(u => u.email === email);
    if (user) {
      console.log(`⏳ Processing ${email}...`);
      
      const existingAppMetadata = user.app_metadata || {};
      const role = existingAppMetadata.role || user.user_metadata?.role || 'member';
      
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: { 
          ...existingAppMetadata,
          gym_id: FOUNDING_GYM_ID,
          role: role
        }
      });

      if (error) {
        console.error(`❌ Failed ${email}:`, error.message);
      } else {
        console.log(`✅ Stamped ${email} (Role: ${role}, Gym: ${FOUNDING_GYM_ID.slice(0,8)}...)`);
      }
    } else {
      console.log(`⚠️ User not found in Auth: ${email}`);
    }
  }
  
  console.log("\n✨ Done! Please log out and log back in on the dashboard.");
}

stampUsers().catch(console.error);
