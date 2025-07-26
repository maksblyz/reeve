import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
  console.log('Create billing portal endpoint called');
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

    // If user doesn't have a Stripe customer ID, create one
    if (!dbUser.stripe_customer_id) {
      console.log('Creating Stripe customer for user:', dbUser.email);
      const customer = await stripe.customers.create({
        email: dbUser.email,
        metadata: {
          userId: dbUser.id,
        },
      });

      // Update user with Stripe customer ID
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { stripe_customer_id: customer.id }
      });
      console.log('Stripe customer created:', customer.id);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripe_customer_id!,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`,
    });

    console.log('Billing portal session created:', session.id);
    return NextResponse.json({ url: session.url });

  } catch (err: unknown) {
    console.error("Stripe portal error:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 