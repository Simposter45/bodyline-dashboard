import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: gyms } = await supabase.from('gyms').select('id').limit(1);
  const gymId = gyms![0].id;

  const { data: users } = await supabase.auth.admin.listUsers();
  const testUser = users.users.find(u => u.email === 'trainer@bodyline.in');
  
  if (testUser) {
    const { error } = await supabase.auth.admin.updateUserById(testUser.id, {
      app_metadata: { role: 'trainer', gym_id: gymId }
    });
    if (error) {
       console.error("Error updating user:", error);
    } else {
       console.log('Fixed metadata for test trainer!');
    }
  } else {
    console.log('User not found');
  }
}
run();
