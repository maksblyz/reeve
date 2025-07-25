import { NextResponse } from "next/server";

export async function GET() {
  const envCheck = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
    databaseUrl: !!process.env.DATABASE_URL,
    baseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
  };

  const missingVars = Object.entries(envCheck)
    .filter(([, exists]) => !exists)
    .map(([key]) => key);

  return NextResponse.json({
    configured: missingVars.length === 0,
    missing: missingVars,
    envCheck,
  });
} 