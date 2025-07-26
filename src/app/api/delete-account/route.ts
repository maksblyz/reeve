import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function DELETE(req: NextRequest) {
  console.log('Delete account endpoint called');
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Authorization header missing or invalid. Please sign in again.'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid or expired token. Please sign in again.'
      }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: {
        taskSessions: true
      }
    });

    if (!dbUser) {
      return NextResponse.json({
        error: 'User not found in database.'
      }, { status: 404 });
    }

    // Delete from Stripe if customer exists
    if (dbUser.stripe_customer_id) {
      try {
        // Delete all payment methods first
        const paymentMethods = await stripe.paymentMethods.list({
          customer: dbUser.stripe_customer_id,
          type: 'card',
        });

        for (const pm of paymentMethods.data) {
          await stripe.paymentMethods.detach(pm.id);
        }

        // Delete the customer
        await stripe.customers.del(dbUser.stripe_customer_id);
        console.log('Stripe customer deleted:', dbUser.stripe_customer_id);
      } catch (error) {
        console.error('Error deleting Stripe customer:', error);
        // Continue with database deletion even if Stripe fails
      }
    }

    // Delete from database (taskSessions will be deleted due to cascade)
    await prisma.user.delete({
      where: { id: dbUser.id }
    });
    console.log('User deleted from database:', dbUser.id);

    // Delete from Supabase Auth
    try {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error('Error deleting from Supabase Auth:', deleteError);
        // Continue even if Supabase deletion fails
      } else {
        console.log('User deleted from Supabase Auth:', user.id);
      }
    } catch (error) {
      console.error('Error with Supabase Auth deletion:', error);
      // Continue even if Supabase deletion fails
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again.' },
      { status: 500 }
    );
  }
} 