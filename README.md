# Tranquility Books

Tranquility Books is a digital bookstore and reader marketplace. Readers can discover, purchase, download, and like ebooks. Sellers can upload books for review, and administrators manage the catalogue and sales.

The MVP is being built on a foundation for seller payouts, physical books, delivery tracking, reviews, comments, recommendations, and email integrations.

## Current Features

### Readers

- Email/password and Google OAuth authentication
- Profile onboarding with first name, last name, username, optional display name, role, gender, date of birth, and avatar
- Newest, featured, and most-liked book sections
- Protected book catalogue and book details pages
- Book likes and like counts
- Paystack test-mode checkout
- Duplicate-purchase protection
- Purchased-book library
- Signed PDF downloads

### Sellers

- Canonical upload page at `/upload`
- Legacy `/sell` route redirects to `/upload`
- PDF uploads up to 20 MB
- Cover uploads up to 10 MB
- Signed uploads to Supabase Storage
- Server verification before metadata is saved
- Draft submission workflow for review

### Administrators

- Publish, reject, archive, and delete books
- Paid revenue analytics
- Books purchased count
- Completed orders count
- Unique customer count
- Recent paid purchases
- Admin uploads are published immediately

## Seller Payout Direction

The selected model is **Paystack Transfers**, not Paystack subaccounts.

Sellers will not need to create or manage a Paystack dashboard account. They will provide verified bank payout details inside Tranquility. The server will create a Paystack transfer recipient and use it for scheduled payouts.

Planned policy:

- Tranquility commission: 20%
- Seller share: 80%
- Payout schedule: weekly, pending final stakeholder confirmation
- Minimum payout threshold: N5,000
- Holding period: 3 to 7 days, pending final stakeholder confirmation
- Failed transfers: automatic retry
- Admin responsibility: review exceptions and payout batches, not individual payments

The initial database foundation is in `supabase/migrations/015_seller_payouts.sql`. Seller recipient setup and the weekly transfer worker are not live yet.

## Technology

- Next.js App Router
- React and TypeScript
- Tailwind CSS v4
- Supabase Postgres, Auth, and Storage
- Paystack
- Vercel
- GitHub

## Project Structure

```text
src/app/                         Pages, layouts, server actions, and API routes
src/components/                  Shared client components
src/lib/payments/                Payment verification and entitlement logic
src/lib/supabase/                Browser, server, and admin Supabase clients
supabase/migrations/             Database schema, RLS, grants, and storage changes
public/                          Static images, icons, and branding assets
docs/                            Roadmap and handoff documentation
```

Important routes:

```text
/                              Homepage
/books                         Protected catalogue
/books/[slug]                  Book details
/account                       Account, library, and seller workspace
/account/settings              Profile settings
/account/setup                 First-time profile setup
/upload                        Seller/admin upload page
/sell                          Compatibility redirect to /upload
/admin                         Admin moderation and analytics
/auth/login                    Sign in
/auth/sign-up                 Create an account
/auth/forgot-password          Request password reset email
/auth/reset-password           Set a new password
```

## Local Setup

Requirements:

- Node.js 20 or newer
- npm
- Supabase project
- Paystack account for test payments

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SECRET_KEY=your-server-only-supabase-secret-key
PAYSTACK_SECRET_KEY=your-server-only-paystack-secret-key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your-paystack-public-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never expose these values in client code:

```text
SUPABASE_SECRET_KEY
PAYSTACK_SECRET_KEY
```

## Database Setup

Run the Supabase migrations in order:

```text
001_initial_schema.sql
002_rls_policies.sql
003_ensure_profiles.sql
004_books_grants.sql
005_like_counts.sql
006_account_grants.sql
007_payment_service_grants.sql
008_download_books_grant.sql
009_profile_onboarding.sql
010_profile_preferences.sql
011_profile_names.sql
012_storage_limits.sql
013_admin_book_delete.sql
014_service_role_book_delete.sql
015_seller_payouts.sql
```

Storage buckets:

- `book-covers`: public cover images
- `book-files`: private PDF files
- `avatars`: public profile avatars

## Authentication Configuration

Production redirect URLs:

```text
https://book-market-ecru.vercel.app/auth/callback
https://book-market-ecru.vercel.app/auth/reset-password
```

Local redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
```

The Supabase Reset Password template should use:

```html
{{ .ConfirmationURL }}
```

It should not hardcode the homepage or sign-up route.

## Payments

The current checkout is in Paystack test mode. Test payments do not represent real settlement funds.

```text
Customer starts checkout
→ order is created in Supabase
→ Paystack checkout opens
→ callback/webhook verifies payment
→ order becomes paid
→ library entitlement is created
→ seller earning is recorded
```

The seller payout flow is not complete. Current `seller_earnings` records are pending ledger records, not completed transfers.

## Deployment

The application deploys to Vercel from GitHub.

Before deploying:

1. Run the TypeScript check.
2. Run ESLint.
3. Confirm Production environment variables in Vercel.
4. Confirm Supabase site URL and redirect URLs.
5. Confirm Google OAuth redirect URLs.
6. Confirm the Paystack webhook URL.
7. Confirm all required Supabase migrations have been run.

```bash
node node_modules/typescript/bin/tsc --noEmit
npm run lint
git diff --check
```

Deploy through GitHub:

```bash
git add .
git commit -m "Describe the change"
git push
```

## Documentation

- [Product and engineering roadmap](docs/ROADMAP.md)
- [Current project status and handoff notes](docs/PROJECT_STATUS.md)

## Future Work

- Finish production password-reset verification
- Seller bank payout setup and Paystack transfer recipients
- Weekly automated payouts, retries, and reconciliation
- Seller earnings and payout history
- Refund and dispute workflow
- Brevo email integration
- Physical books and delivery tracking
- Inventory and fulfilment
- Reviews and comments
- Advanced recommendations
- Search, filters, categories, and tags
- Rate limiting, monitoring, and abuse prevention
