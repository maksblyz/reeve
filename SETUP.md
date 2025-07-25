# Supabase Auth + Stripe Checkout Setup

This guide will help you set up Supabase Auth with Stripe Checkout for one-time payment method collection.

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"

# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Setup Steps

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Add these to your `.env.local` file

### 2. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Go to Developers > API keys to get your secret key
3. Add the secret key to your `.env.local` file

### 3. Stripe Webhook Setup

1. In your Stripe dashboard, go to Developers > Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/webhooks/stripe`
4. Select the `checkout.session.completed` event
5. Copy the webhook signing secret and add it to `STRIPE_WEBHOOK_SECRET`

### 4. Database Setup

1. Run the Prisma migration:
   ```bash
   npx prisma migrate dev --name init
   ```

2. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

### 5. Start the Development Server

```bash
npm run dev
```

## Flow Overview

1. User clicks "Sign Up" on the landing page
2. Supabase handles authentication
3. After successful signup/login, the app creates a Stripe Checkout session
4. User is redirected to Stripe Checkout to enter card details
5. Stripe webhook processes the completed session and attaches the payment method
6. User is redirected back to the success page

## API Routes

- `POST /api/create-checkout` - Creates Stripe Checkout session
- `POST /api/webhooks/stripe` - Handles Stripe webhooks

## Pages

- `/` - Landing page with signup/login buttons
- `/signup` - Sign up form
- `/login` - Login form
- `/success` - Success page after payment setup
- `/cancel` - Cancel page if user cancels payment
- `/signal` - Main app dashboard 