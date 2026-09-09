# Tranquility Books Roadmap

Last updated: 2026-09-08

## 1. Product Summary

Tranquility Books is a digital-book marketplace. Readers can create accounts, browse published books, purchase paid ebooks, download books from their library, and like books. Sellers and administrators can upload ebook metadata, cover images, and PDF files. Administrators review seller submissions and manage the public catalogue.

Physical books, delivery tracking, comments, advanced recommendations, and seller payouts are planned extensions rather than completed MVP features.

## 2. Current Stack

| Area | Tool | Why |
| --- | --- | --- |
| Frontend and backend | Next.js App Router | Server Components, Server Actions, API routes, authentication-aware pages, and one deployable application |
| UI | React and Tailwind CSS v4 | Responsive interface and shared white-and-coral bookstore visual language |
| Database | Supabase Postgres | Relational data, SQL migrations, RLS, and admin reporting queries |
| Authentication | Supabase Auth | Email/password authentication, Google OAuth, sessions, recovery links, and profile identity |
| File storage | Supabase Storage | Public book covers and private PDF files with signed upload/download access |
| Payments | Paystack | Checkout, payment verification, callbacks, webhooks, and future seller transfers |
| Email | Supabase Auth email service currently | Authentication confirmation and password recovery messages |
| Deployment | Vercel | Production hosting for the Next.js application |
| Source control | GitHub | Code history and Vercel deployment source |
| Future email marketing | Brevo | Transactional and product email after the MVP email requirements are finalized |

## 3. Completed MVP Work

### 3.1 Authentication and profiles

- Email/password sign-up and sign-in are implemented.
- Google OAuth sign-in is implemented with the Google icon.
- Authenticated users are redirected through the account continuation flow.
- Profile onboarding supports first name, last name, username, optional display name, role, optional gender, optional date of birth, and avatar.
- Usernames must be unique and are checked through the profile/database flow.
- Users can update their profile from account settings.
- Users can switch between reader/customer and seller roles from settings, subject to the current permissions model.
- Admin role changes remain controlled outside the normal user-facing role selector.
- Account avatar images are used in navigation when available, with a profile-icon fallback.
- The account icon is used on the homepage, catalogue, book details, upload, and admin pages.

### 3.2 Catalogue and discovery

- Published books are visible on the homepage.
- Signed-out visitors see the newest-book preview section.
- Signed-in users see featured and most-liked/recommended sections.
- The protected catalogue route requires sign-in.
- Book details pages include title, author, description, price, cover, like count, purchase action, and download action when entitled.
- Users can like and unlike books.
- Signed-out users can see like counts but cannot see or use the like control.
- Book cards use the current white-and-coral bookstore-app visual direction.
- Mobile shelves use horizontal scrolling; desktop layouts expand into grids.

### 3.3 Uploads and storage

- `/upload` is the canonical upload route.
- `/sell` remains as a compatibility route and redirects to `/upload`.
- Active sellers and admins can upload books.
- PDF uploads use the `book-files` private bucket.
- Cover uploads use the `book-covers` public bucket.
- Signed upload URLs are generated server-side.
- The browser uploads directly to Supabase Storage using the signed URL.
- The server verifies that the PDF and optional cover exist before saving book metadata.
- A successful server save no longer gets mistaken for a failed client request and cleaned up incorrectly.
- Upload progress states exist for PDF upload, cover upload, and metadata saving.
- Current limits are 20 MB for PDFs and 10 MB for covers.
- Book covers now use contained presentation so the full uploaded image remains visible instead of being cropped.

### 3.4 Admin moderation and analytics

- Admin-only access is enforced on the admin page and server actions.
- Admins can publish, reject, archive, and delete books where the database relationships allow it.
- Purchased books should generally be archived rather than physically deleted.
- Admin analytics now show paid revenue, paid book items, completed orders, unique customers, and recent paid purchases.
- Admin payout operations now show seller payout-account readiness, pending and eligible earnings, payout-batch counts, transfer history, and account-disable controls.
- Analytics use verified `paid` orders rather than pending or failed checkout attempts.
- Admin pages use the same account avatar navigation and white-and-coral visual language.

### 3.5 Payments and digital library

- Paystack test-mode checkout is implemented.
- Orders, order items, and payment records are created before checkout.
- Paystack callbacks and signed webhooks verify successful payments.
- A customer cannot purchase the same book again after owning it.
- Verified payments create a `library_items` entitlement.
- Download routes verify library ownership and generate short-lived signed PDF URLs.
- The customer library shows purchased book titles, covers, and download controls.
- Current payment proceeds go to the Tranquility Paystack merchant account.
- Seller earnings are recorded conceptually in order items but seller payouts are not implemented yet.
- Payout foundation migration `015_seller_payouts.sql` is now prepared for the selected transfer model.
- Verified payments now snapshot a 20% platform fee and 80% seller amount on order items.
- Verified payments now create a pending seller earning with an initial three-day eligibility hold.

### 3.6 Password recovery status

- A forgot-password page exists.
- A reset-password page exists.
- The client handles Supabase recovery sessions, PKCE `code` links, and `token_hash` recovery links.
- The callback has been updated to send recovery links to `/auth/reset-password` instead of profile onboarding or the homepage.
- The reset email subject and Supabase email-template configuration still need production verification.
- This remains an open issue until a fresh production email is tested end to end.

## 4. Selected Seller Payout Model

We are selecting **Option 2: Tranquility receives the customer payment, then Paystack Transfers automatically pay sellers**.

### 4.1 Seller experience

Sellers should not be required to create or manage a Paystack dashboard subaccount. They will complete payout setup inside Tranquility by providing verified bank payout details. Paystack will create a transfer recipient and return a `recipient_code`. The application should store the recipient code and only the minimum display information needed, such as bank name, account name, and last four account digits.

### 4.2 Initial payout policy

These values are the working product decision and remain subject to stakeholder confirmation:

- Platform commission: 20% of the eligible sale amount.
- Seller share: 80% of the eligible sale amount.
- Payout frequency: weekly.
- Minimum payout threshold: ₦5,000.
- Holding period: 3 to 7 days after successful payment, pending the final stakeholder decision.
- Failed transfers: automatic retry with an auditable failure reason.
- Admin workload: review exceptions and payout batches, not individual seller payments.

### 4.3 Calculation example

For a ₦20,000 ebook sale:

```text
Gross sale:       ₦20,000
Tranquility 20%:  ₦4,000
Seller 80%:       ₦16,000
```

Whether Paystack processing fees are deducted from the platform share or treated separately must be confirmed before implementation. The calculation rule must be stored with each earning so later commission changes do not rewrite historical sales.

### 4.4 Automated payout workflow

1. Paystack confirms a successful payment through verification/webhook.
2. The system creates an immutable seller earning record.
3. The earning remains pending during the hold period.
4. A scheduled weekly job finds eligible unpaid earnings.
5. Earnings are grouped by seller.
6. The system creates one Paystack transfer per seller, or a bulk transfer batch where appropriate.
7. Transfer status is recorded using the Paystack transfer reference.
8. Successful transfers mark earnings as paid.
9. Failed transfers are retried automatically according to a bounded retry policy.
10. Admins see exceptions, failed transfers, and the payout batch summary.

### 4.5 Planned payout schema

```text
seller_payout_accounts
- id
- seller_id
- recipient_code
- bank_name
- account_name
- account_number_last4
- currency
- status
- created_at
- updated_at

seller_earnings
- id
- seller_id
- order_id
- order_item_id
- book_id
- gross_amount_minor
- platform_fee_minor
- payment_fee_minor
- seller_amount_minor
- status
- eligible_at
- paid_at
- created_at

payouts
- id
- seller_id
- amount_minor
- currency
- recipient_code
- transfer_code
- status
- attempt_count
- failure_reason
- scheduled_at
- paid_at
- created_at
- updated_at
```

## 5. Immediate Next Phase

### Priority A: Resolve password reset in production

- Confirm the deployed production build contains the callback fix.
- In Supabase URL Configuration, allow the production and local callback URLs.
- In the Reset Password email template, use `{{ .ConfirmationURL }}` rather than a hardcoded homepage or sign-up URL.
- Change the email subject to a clear title such as `Set your Tranquility password`.
- Request a fresh email after deployment.
- Confirm the link opens `/auth/reset-password`.
- Confirm the user can set a password and sign in with it.

### Priority B: Complete payout data and seller onboarding

- Confirm the 20/80 rule and whether Paystack fees reduce the platform share or seller share.
- Confirm the final hold period: 3, 5, or 7 days.
- Confirm weekly payout day and timezone.
- Run migration `015_seller_payouts.sql` in Supabase SQL Editor.
- Confirm the payout-account, earning, and payout tables are visible and their RLS policies work.
- Add RLS policies so sellers see only their own payout information and admins see operational data.
- Add server-only Paystack recipient creation and account verification.

### Priority C: Implement automated payouts

- Add a seller payout setup page.
- Add recipient creation and verification.
- Create earnings when payments become paid.
- Add a scheduled weekly payout worker or Vercel-compatible scheduled endpoint.
- Add idempotency keys and transfer-state reconciliation.
- Add automatic retries with a maximum attempt count.
- Add admin payout-batch review and exception handling.
- Add seller earnings and payout history.

## 6. Future Product Work

- Physical book listings.
- Shipping addresses and delivery tracking.
- Courier integration.
- Inventory and fulfilment management.
- Book comments and moderation.
- Reviews and ratings improvements.
- Advanced recommendations based on likes, purchases, and reading activity.
- Brevo transactional and marketing email integration.
- Seller notifications for sales, earnings, approvals, and failed payouts.
- Refund and dispute workflow.
- Tax, compliance, identity verification, and marketplace legal review.
- Search, filtering, categories, tags, and pagination improvements.
- Book previews and reading-progress tracking.
- Abuse prevention, rate limiting, audit dashboards, and monitoring.

## 7. Deployment and Environment Checklist

- Local and production Supabase URLs must be intentionally configured.
- Vercel Production environment variables must be current.
- `SUPABASE_SECRET_KEY` and `PAYSTACK_SECRET_KEY` must remain server-only.
- Paystack test mode must be used only for test transactions.
- Production Paystack webhooks must point to the deployed webhook endpoint.
- Supabase Auth site URL and redirect URLs must include the deployed domain.
- Google OAuth authorized redirect URLs must use the current Supabase Auth callback.
- New migrations must be run in Supabase SQL Editor and recorded here.
- After deployment, test authentication, upload, cover rendering, checkout, webhook fulfilment, download, admin analytics, and password recovery.

## 8. Definition of Done for the Next Release

- A fresh password-reset email opens the new-password form.
- Admin analytics show verified revenue and purchases.
- Full cover artwork is visible on mobile and desktop without unwanted cropping.
- Sellers can add and verify payout details without creating a Paystack dashboard account.
- A verified sale creates exactly one seller earning.
- Weekly payout processing is idempotent and retry-safe.
- Sellers can see pending, eligible, paid, and failed earnings.
- Admins can review payout batches and exceptions.
