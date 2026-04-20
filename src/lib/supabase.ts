// src/lib/supabase.ts

/**
 * Supabase Client Configuration
 * Handles database connections for multi-tenant app
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Client-side Supabase instance
 * Used in browser - has row-level security
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * Server-side Supabase instance (admin)
 * Used in API routes - bypasses RLS
 * ONLY use on server - never expose service role key in client
 */
let supabaseAdmin: SupabaseClient | null = null;

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }
  return supabaseAdmin;
}
