import { createClient } from '@supabase/supabase-js'

// Single shared Supabase instance — import this everywhere instead of calling createClient() directly
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'psa-pms-auth', // explicit key prevents key collisions
    },
  }
)

export default supabase