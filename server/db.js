import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Create Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test connection
const connectToSupabase = async () => {
  try {
    const { error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    console.log('✅ Connected to Supabase');
  } catch (err) {
    console.error('❌ Supabase connection failed:', err);
    throw err;
  }
};

export default connectToSupabase;
