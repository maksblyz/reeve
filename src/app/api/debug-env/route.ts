import { NextResponse } from "next/server";

export async function GET() {
  const envVars = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  };

  return NextResponse.json(envVars);
} 