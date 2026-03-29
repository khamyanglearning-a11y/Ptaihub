import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fallback to the provided project URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nhxwlaohwuhkurkxrgpb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LQLQBKttFc0y3jkjWDH0OA_Ib4NmPJ4';

if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !supabaseAnonKey) {
  console.warn('Supabase Anon Key is missing. Please set VITE_SUPABASE_ANON_KEY in your environment variables.');
}

// Only initialize if we have both, otherwise export a dummy or handle null in services
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);
