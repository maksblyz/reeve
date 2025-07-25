import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  console.log('Load task state endpoint called');
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header missing or invalid. Please sign in again.' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createServerClient();
    
    // Verify the JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Invalid or expired token. Please sign in again.' 
      }, { status: 401 });
    }

    // Find user in database
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    if (!dbUser) {
      console.log('Creating new user in database:', user.email);
      // Create user in database if they don't exist
      dbUser = await prisma.user.create({
        data: {
          email: user.email!,
        }
      });
      console.log('User created:', dbUser.id);
    }

    // Find existing task session
    // @ts-ignore - Prisma client types not updated yet
    const taskSession = await prisma.taskSession.findFirst({
      where: { userId: dbUser.id }
    });

    if (!taskSession) {
      // Return default state if no session exists
      return NextResponse.json({
        tasks: Array.from({ length: 3 }, (_, i) => ({ id: i + 1, text: "", done: false })),
        visible: 1,
        locked: false,
        remaining: 43200, // 12 hours
        price: 10,
        lockTime: null
      });
    }

    // Calculate remaining time if timer is locked
    let remaining = taskSession.remaining;
    if (taskSession.locked && taskSession.lockTime) {
      const now = new Date();
      const lockTime = taskSession.lockTime;
      const elapsed = Math.floor((now.getTime() - lockTime.getTime()) / 1000);
      remaining = Math.max(0, taskSession.remaining - elapsed);
    }

    return NextResponse.json({
      tasks: taskSession.tasks,
      visible: taskSession.visible,
      locked: taskSession.locked,
      remaining,
      price: taskSession.price,
      lockTime: taskSession.lockTime
    });

  } catch (error) {
    console.error('Error loading task state:', error);
    return NextResponse.json(
      { error: 'Failed to load task state. Please try again.' },
      { status: 500 }
    );
  }
} 