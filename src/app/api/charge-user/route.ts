import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
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
      console.error('Auth error:', authError);
      return NextResponse.json({ 
        error: 'Invalid or expired token. Please sign in again.' 
      }, { status: 401 });
    }

    // Get the request body
    const { amount } = await req.json();
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        error: 'Invalid amount provided' 
      }, { status: 400 });
    }

    // Find user in database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    if (!dbUser || !dbUser.stripe_customer_id) {
      return NextResponse.json({ 
        error: 'No payment method found. Please set up your payment method first.' 
      }, { status: 400 });
    }

    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(dbUser.stripe_customer_id) as Stripe.Customer;
    
    if (!customer.default_source && !customer.invoice_settings.default_payment_method) {
      return NextResponse.json({ 
        error: 'No default payment method found. Please set up your payment method first.' 
      }, { status: 400 });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: dbUser.stripe_customer_id,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: dbUser.id,
        user_email: user.email!,
        charge_type: 'timer_expired',
      },
    });

    // Confirm the payment intent
    const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntent.id);

    if (confirmedIntent.status === 'succeeded') {
      console.log(`Successfully charged $${amount} to user ${user.email}`);
      return NextResponse.json({ 
        success: true, 
        amount: amount,
        payment_intent_id: confirmedIntent.id 
      });
    } else {
      console.error('Payment failed:', confirmedIntent.last_payment_error);
      return NextResponse.json({ 
        error: 'Payment failed. Please check your payment method.' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error charging user:', error);
    return NextResponse.json(
      { error: 'Failed to process payment. Please try again.' },
      { status: 500 }
    );
  }
} 