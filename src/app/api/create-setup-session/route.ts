import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
  console.log('Create setup session endpoint called');
  try {
    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.json(
        { error: 'Stripe configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      console.error('NEXT_PUBLIC_BASE_URL is not set');
      return NextResponse.json(
        { error: 'Base URL configuration error. Please contact support.' },
        { status: 500 }
      );
    }

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
    } else {
      // Verify the customer exists in Stripe, if not, create a new one
      try {
        await stripe.customers.retrieve(dbUser.stripe_customer_id);
        console.log('Existing Stripe customer verified:', dbUser.stripe_customer_id);
      } catch {
        console.log('Invalid Stripe customer ID, creating new one:', dbUser.stripe_customer_id);
        const customer = await stripe.customers.create({
          email: dbUser.email,
          metadata: {
            userId: dbUser.id,
          },
        });

        // Update user with new Stripe customer ID
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: { stripe_customer_id: customer.id }
        });
        console.log('New Stripe customer created:', customer.id);
      }
    }

    // Create setup session (no charge, just save payment method)
    const session = await stripe.checkout.sessions.create({
      mode: 'setup', // This is key - no payment, just setup
      customer: dbUser.stripe_customer_id!,
      payment_method_types: ['card'],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/signal?setup=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/signal?setup=cancelled`,
      custom_text: {
        submit: {
          message: "We're not charging you now. You'll choose how much to pay when you lock your tasks. This just saves your card for future use.",
        },
      },
    });

    console.log('Setup session created:', session.id);
    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Error creating setup session:', error);
    
    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('No such customer')) {
        return NextResponse.json(
          { error: 'Customer not found. Please try again.' },
          { status: 400 }
        );
      }
      if (error.message.includes('Invalid API key')) {
        return NextResponse.json(
          { error: 'Stripe configuration error. Please contact support.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create setup session. Please try again.' },
      { status: 500 }
    );
  }
} 