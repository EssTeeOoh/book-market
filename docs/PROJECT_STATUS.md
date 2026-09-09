# Tranquility Books Project Status

Last updated: 2026-09-08

## Current Position

The digital ebook marketplace MVP is operational for authentication, book upload, catalogue browsing, Paystack test checkout, verified library access, and admin moderation. The current work is moving from MVP stabilization into marketplace operations, especially seller earnings and payouts.

## Completed Recently

- Migrated the customer-facing UI toward a clean white-and-coral bookstore-app style.
- Added responsive mobile shelves and desktop book grids.
- Added canonical `/upload` route with `/sell` compatibility redirect.
- Added account profile avatar navigation to the upload page.
- Added admin sales analytics for paid revenue and purchases.
- Added admin payout operations for payout accounts, seller earnings, and payout batches.
- Changed cover presentation to preserve the full uploaded image.
- Fixed the successful upload redirect cleanup bug that was deleting uploaded files after metadata creation.
- Added Paystack payment verification and library entitlement handling.
- Added password-recovery session handling for Supabase recovery links.

## Open Issues

### Password reset

The production password-reset email has been observed redirecting to the homepage. The code now sends reset requests directly to `/auth/reset-password`, and the reset form requires a new password plus confirmation. Production still needs verification that:

1. The deployed commit includes the callback change.
2. Supabase allows the production callback URL.
3. The Reset Password template uses `{{ .ConfirmationURL }}`.
4. The email subject is intentionally configured.
5. A newly generated email reaches `/auth/reset-password`.

### Seller payouts

Seller payouts are not implemented yet. The selected design is Paystack Transfers, not Paystack subaccounts:

- Seller does not create a Paystack dashboard account.
- Seller provides bank payout details inside Tranquility.
- Tranquility creates a Paystack transfer recipient.
- The platform keeps 20% and seller earns 80%.
- Payouts are planned weekly, with a ₦5,000 minimum threshold.
- Earnings are held for 3 to 7 days pending final stakeholder confirmation.
- Failed transfers will retry automatically.

## Important Existing Data Model

- `profiles`: user identity, role, status, avatar, and optional personal data.
- `books`: ebook metadata, owner, publication state, cover key, and PDF key.
- `book_likes`: user likes.
- `orders`: customer orders and total amounts.
- `order_items`: books and seller references inside orders.
- `payments`: Paystack references and verification state.
- `library_items`: verified customer download entitlements.
- `download_events`: download audit events.
- `audit_logs`: administrative activity.

## Files to Know

- `src/app/admin/page.tsx`: admin moderation and sales analytics.
- `src/app/sell/upload-form.tsx`: browser upload workflow and progress states.
- `src/app/sell/actions.ts`: server-side file verification and book creation.
- `src/app/api/uploads/signed/route.ts`: signed upload URL creation.
- `src/app/api/payments/initialize/route.ts`: Paystack checkout initialization.
- `src/app/api/payments/callback/route.ts`: browser return and payment verification.
- `src/app/api/payments/webhook/route.ts`: signed Paystack webhook handling.
- `src/lib/payments/paystack.ts`: payment verification and entitlement fulfilment.
- `src/components/auth-form.tsx`: sign-in, sign-up, Google OAuth, forgot-password, and reset-password flows.
- `src/app/auth/callback/route.ts`: OAuth, confirmation, and recovery callback handling.
- `supabase/migrations/`: database schema, RLS, storage, and grants.

## Handoff Notes

The payout foundation is now started: migration `015_seller_payouts.sql` defines payout accounts, seller earnings, and payout batches; verified payments snapshot the 20/80 split and create pending earnings with an initial three-day hold. The next engineer should resolve password recovery first, then run the migration, implement seller recipient setup, and build server-side Paystack transfers. Do not put Paystack secret keys in client components, do not trust browser-submitted seller amounts, and do not mark an earning paid until Paystack confirms the transfer.
