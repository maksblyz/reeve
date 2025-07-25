import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }

    const supabase = createServerClient();
    
    // Try to get user with the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    return NextResponse.json({
      success: !authError,
      user: user ? { id: user.id, email: user.email } : null,
      error: authError ? authError.message : null,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 