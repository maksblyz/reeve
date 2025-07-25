import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.mode === "setup" && session.setup_intent) {
        try {
          // Retrieve the setup intent to get the payment method
          const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);
          
          if (setupIntent.payment_method && session.customer) {
            // Attach the payment method to the customer
            await stripe.paymentMethods.attach(setupIntent.payment_method as string, {
              customer: session.customer as string,
            });

            // Optionally set as default payment method
            await stripe.customers.update(session.customer as string, {
              invoice_settings: {
                default_payment_method: setupIntent.payment_method as string,
              },
            });

            console.log(`Payment method ${setupIntent.payment_method} attached to customer ${session.customer}`);
          }
        } catch (error) {
          console.error("Error processing setup intent:", error);
          return NextResponse.json({ error: "Failed to process setup intent" }, { status: 500 });
        }
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
} 