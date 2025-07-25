import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
  try {
    // Check if required environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ 
        error: 'Supabase configuration missing. Please check your environment variables.' 
      }, { status: 500 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ 
        error: 'Stripe configuration missing. Please check your environment variables.' 
      }, { status: 500 });
    }

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
    console.log('Verifying token:', token.substring(0, 20) + '...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ 
        error: 'Invalid or expired token. Please sign in again.' 
      }, { status: 401 });
    }
    
    console.log('User authenticated:', user.email);

    // Check if user exists in our database
    console.log('Checking database for user:', user.email);
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    // If user doesn't exist in our database, create them
    if (!dbUser) {
      console.log('Creating new user in database');
      dbUser = await prisma.user.create({
        data: {
          email: user.email!,
        }
      });
      console.log('User created:', dbUser.id);
    } else {
      console.log('User found in database:', dbUser.id);
    }

    // Check if user already has a Stripe customer ID
    if (dbUser.stripe_customer_id) {
      // User already has a customer ID, create a new setup session
      const session = await stripe.checkout.sessions.create({
        mode: "setup",
        customer: dbUser.stripe_customer_id,
        payment_method_types: ["card"],
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      });

      return NextResponse.json({ url: session.url });
    }

    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: {
        user_id: dbUser.id,
      },
    });

    // Update the user with the Stripe customer ID
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { stripe_customer_id: customer.id },
    });

    // Create checkout session
    console.log('Creating Stripe checkout session for customer:', customer.id);
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customer.id,
      payment_method_types: ["card"],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
    });

    console.log('Checkout session created:', session.id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
} 