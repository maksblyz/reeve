import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function GET(req: NextRequest) {
  console.log('Check payment method endpoint called');
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

    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    if (!dbUser) {
      console.log('Creating new user in database:', user.email);
      dbUser = await prisma.user.create({
        data: {
          email: user.email!,
        }
      });
      console.log('User created:', dbUser.id);
    }

    // If user doesn't have a Stripe customer ID, they definitely don't have a payment method
    if (!dbUser.stripe_customer_id) {
      return NextResponse.json({ hasPaymentMethod: false });
    }

    // Check if the customer exists in Stripe
    try {
      await stripe.customers.retrieve(dbUser.stripe_customer_id);
      
      // Check if customer has any payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: dbUser.stripe_customer_id,
        type: 'card',
      });

      const hasPaymentMethod = paymentMethods.data.length > 0;
      console.log('Payment methods found:', paymentMethods.data.length);
      
      return NextResponse.json({ hasPaymentMethod });

    } catch {
      console.log('Invalid Stripe customer ID, creating new one');
      // Customer doesn't exist in Stripe, so they don't have a payment method
      return NextResponse.json({ hasPaymentMethod: false });
    }

  } catch (error) {
    console.error('Error checking payment method:', error);
    return NextResponse.json(
      { error: 'Failed to check payment method. Please try again.' },
      { status: 500 }
    );
  }
} 