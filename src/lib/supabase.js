import { createClient } from '@supabase/supabase-js'

// Les variables sont injectées par Vercel (Settings > Environment Variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variables Supabase manquantes. Vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sur Vercel.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})
