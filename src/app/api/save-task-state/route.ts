import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  console.log('Save task state endpoint called');
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

    // Get the request body
    const body = await req.json();
    console.log('Received data:', { tasks: body.tasks?.length, visible: body.visible, locked: body.locked, remaining: body.remaining, price: body.price, lockTime: body.lockTime });
    const { tasks, visible, locked, remaining, price, lockTime } = body;
    
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

    // Find existing task session or create new one
    console.log('Looking for task session for user:', dbUser.id);
    // @ts-ignore - Prisma client types not updated yet
    let taskSession = await prisma.taskSession.findFirst({
      where: { userId: dbUser.id }
    });
    console.log('Found task session:', !!taskSession);

    if (taskSession) {
      // Update existing session
      console.log('Updating existing task session');
      // @ts-ignore - Prisma client types not updated yet
      taskSession = await prisma.taskSession.update({
        where: { id: taskSession.id },
        data: {
          tasks,
          visible,
          locked,
          remaining,
          price,
          lockTime: lockTime ? new Date(lockTime) : null,
        }
      });
      console.log('Task session updated successfully');
    } else {
      // Create new session
      console.log('Creating new task session');
      // @ts-ignore - Prisma client types not updated yet
      taskSession = await prisma.taskSession.create({
        data: {
          userId: dbUser.id,
          tasks,
          visible,
          locked,
          remaining,
          price,
          lockTime: lockTime ? new Date(lockTime) : null,
        }
      });
      console.log('Task session created successfully');
    }

    console.log('Task state saved successfully');
    return NextResponse.json({ 
      success: true, 
      taskSession 
    });

  } catch (error) {
    console.error('Error saving task state:', error);
    return NextResponse.json(
      { error: 'Failed to save task state. Please try again.' },
      { status: 500 }
    );
  }
} 