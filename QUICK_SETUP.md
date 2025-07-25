# Quick Setup to Fix 401 Error

The 401 Unauthorized error occurs because the environment variables aren't configured yet. Follow these steps:

## 1. Create Environment File

Create a `.env.local` file in your project root:

```bash
touch .env.local
```

## 2. Add Required Variables

Add these to your `.env.local` file:

```env
# Supabase (Required - Get from supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Stripe (Required - Get from stripe.com)
STRIPE_SECRET_KEY=sk_test_your_key

# Database (Required for development)
DATABASE_URL="postgresql://username:password@localhost:5432/reeve"

# App URL (Required)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 3. Quick Supabase Setup

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings > API
4. Copy "Project URL" and "anon public" key
5. Paste into `.env.local`

**For Development (Optional):**
- Go to Authentication > Settings
- Disable "Enable email confirmations" for immediate signup

## 4. Quick Stripe Setup

1. Go to [stripe.com](https://stripe.com)
2. Create account
3. Go to Developers > API keys
4. Copy "Secret key" (starts with `sk_test_`)
5. Paste into `.env.local`

## 5. Database Setup

For development, you can use Supabase's database:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

Get this from Supabase > Settings > Database > Connection string > URI

## 6. Test Configuration

Visit `http://localhost:3000/api/test-auth` to check if all variables are set correctly.

## 7. Restart Development Server

```bash
npm run dev
```

## Common Issues

- **401 Error**: Environment variables not set
- **Database Error**: Run `npx prisma migrate dev --name init`
- **Stripe Error**: Make sure you're using test keys, not live keys

## Next Steps

Once the 401 error is fixed:
1. Set up Stripe webhook (see SETUP.md)
2. Test the full flow
3. Deploy to production 