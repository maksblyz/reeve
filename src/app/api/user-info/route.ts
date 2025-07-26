import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function GET(req: NextRequest) {
  console.log('User info endpoint called');
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

    // Extract name from email if no name is set
    const emailName = user.email?.split('@')[0] || '';
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || emailName;
    
    // Get live payment method data from Stripe
    let cardLast4 = '';
    let cardBrand = '';
    
    if (dbUser.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(dbUser.stripe_customer_id) as Stripe.Customer;
        const pms = await stripe.paymentMethods.list({ 
          customer: dbUser.stripe_customer_id, 
          type: 'card' 
        });
        
        if (pms.data.length > 0) {
          const pm = pms.data.find((pm: Stripe.PaymentMethod) => pm.id === customer.invoice_settings?.default_payment_method) ?? pms.data[0];
          cardLast4 = pm.card?.last4 || '';
          cardBrand = pm.card?.brand || '';
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    }
    
    return NextResponse.json({
      name: displayName,
      email: user.email || '',
      cardLast4,
      cardBrand
    });

  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user info. Please try again.' },
      { status: 500 }
    );
  }
} 