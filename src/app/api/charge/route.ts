import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion,
});

export async function POST(req: NextRequest) {
  const { customerId } = await req.json();

  const intent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}