import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
  try {
    console.log('Create checkout endpoint called');
    
    // Check if required environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ 
        error: 'Supabase configuration missing. Please check your environment variables.' 
      }, { status: 500 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing Stripe secret key');
      return NextResponse.json({ 
        error: 'Stripe configuration missing. Please check your environment variables.' 
      }, { status: 500 });
    }

    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      console.error('Missing NEXT_PUBLIC_BASE_URL environment variable');
      return NextResponse.json({ 
        error: 'Base URL configuration missing. Please check your environment variables.' 
      }, { status: 500 });
    }

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return NextResponse.json({ 
        error: 'Authorization header missing or invalid. Please sign in again.' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('Token received, length:', token.length);
    
    const supabase = createServerClient();
    
    // Verify the JWT token with Supabase
    console.log('Verifying token:', token.substring(0, 20) + '...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json({ 
        error: 'Authentication failed. Please sign in again.' 
      }, { status: 401 });
    }
    
    if (!user) {
      console.error('No user returned from Supabase');
      return NextResponse.json({ 
        error: 'User not found. Please sign in again.' 
      }, { status: 401 });
    }
    
    console.log('User authenticated:', user.email);

    // Check if user exists in our database
    console.log('Checking database for user:', user.email);
    let dbUser;
    try {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email! }
      });
    } catch (dbError) {
      console.error('Database error finding user:', dbError);
      return NextResponse.json({ 
        error: 'Database connection error. Please try again.' 
      }, { status: 500 });
    }

    // If user doesn't exist in our database, create them
    if (!dbUser) {
      console.log('Creating new user in database');
      try {
        dbUser = await prisma.user.create({
          data: {
            email: user.email!,
          }
        });
        console.log('User created:', dbUser.id);
      } catch (createError) {
        console.error('Database error creating user:', createError);
        return NextResponse.json({ 
          error: 'Failed to create user. Please try again.' 
        }, { status: 500 });
      }
    } else {
      console.log('User found in database:', dbUser.id);
    }

    // Check if user already has a Stripe customer ID
    if (dbUser.stripe_customer_id) {
      // User already has a customer ID, create a new setup session
      try {
        console.log('Creating setup session for existing customer:', dbUser.stripe_customer_id);
        const session = await stripe.checkout.sessions.create({
          mode: "setup",
          customer: dbUser.stripe_customer_id,
          payment_method_types: ["card"],
          success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
        });

        console.log('Setup session created:', session.id);
        return NextResponse.json({ url: session.url });
      } catch (stripeError) {
        console.error('Stripe error creating setup session:', stripeError);
        return NextResponse.json({ 
          error: 'Failed to create payment setup. Please try again.' 
        }, { status: 500 });
      }
    }

    // Create a new Stripe customer
    let customer;
    try {
      console.log('Creating new Stripe customer for:', user.email);
      customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: dbUser.id,
        },
      });
      console.log('Stripe customer created:', customer.id);
    } catch (stripeError) {
      console.error('Stripe error creating customer:', stripeError);
      return NextResponse.json({ 
        error: 'Failed to create customer. Please try again.' 
      }, { status: 500 });
    }

    // Update the user with the Stripe customer ID
    try {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { stripe_customer_id: customer.id },
      });
      console.log('User updated with Stripe customer ID');
    } catch (updateError) {
      console.error('Database error updating user:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update user. Please try again.' 
      }, { status: 500 });
    }

    // Create checkout session
    try {
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
    } catch (stripeError) {
      console.error('Stripe error creating checkout session:', stripeError);
      return NextResponse.json({ 
        error: 'Failed to create checkout session. Please try again.' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Check if it's a Stripe error
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type?: string; message?: string };
      console.error('Stripe error type:', stripeError.type);
      console.error('Stripe error message:', stripeError.message);
    }
    
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
} 