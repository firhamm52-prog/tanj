# Midtrans Snap TANJ

Checkout uses Snap redirection, so no Client Key is needed in HTML. Amount comes only from the trusted order RPC; the browser cannot set it. Production is not enabled merely by committing the code.

## Install

1. Run the entire `supabase/migrations/202610220013_midtrans.sql` once in the Supabase SQL Editor, after migrations 001?012. Then run `202610220014_midtrans_exact_total.sql` to remove unique-code adjustments from new Midtrans orders. Existing order amounts remain unchanged. Do not rerun the ALTER FUNCTION migration.
2. Supabase ? Edge Functions ? create a function named **midtrans**. Paste **all** of `supabase/dashboard/midtrans.ts` into its editor and Deploy. Do not paste the shared handler by itself.
3. Disable **Verify JWT / Enforce JWT verification** on that function. The handler validates customer JWTs itself; the notification route validates the Midtrans signature and then checks GET Status server-to-server. An external Midtrans webhook cannot supply a Supabase customer JWT.
4. Secrets:
   - `MIDTRANS_SERVER_KEY`: the matching Midtrans Server Key (General Credentials).
   - `MIDTRANS_IS_PRODUCTION`: `true` for Production, `false` for Sandbox.
   - `MIDTRANS_ENABLED`: leave `false` until the migration, edge deploy and notification URL are configured. Set `true` to offer the method in checkout.
   - Existing Supabase secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `TANJ_SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
   - Optional `TANJ_SITE_URL`: `https://firhamm52-prog.github.io/tanj/`.
5. In the **matching environment** of Midtrans ? Settings ? Payment ? Payment Notification URL, enter:

   `https://mdvbyrcbuizfycjbcizl.supabase.co/functions/v1/midtrans/notification`

   Use ordinary HTTP Payment Notification, not BI SNAP. Save. Sandbox and Production use separate credentials and settings.

6. After setting `MIDTRANS_ENABLED=true`, refresh checkout, select **Pembayaran otomatis**, create an order and click **Bayar sekarang**. Snap is restricted to Virtual Accounts and generic QRIS (other_qris); a requested channel must also be active in the merchant account. No standalone e-wallet/card/paylater methods are requested. Generic QRIS requires an active GoPay or ShopeePay QRIS acquirer, but is displayed to buyers as QRIS.

## Validation

Run `node --test --test-isolation=none tests/midtrans.test.mjs` and `npm.cmd run test:checkout`. These use simulated providers, not real charges. First validate end-to-end in a separate Sandbox project/environment with Sandbox keys. For Production, an actual test payment requires real funds; this implementation does not perform one automatically.

Check that the Snap amount equals the stored order total; a success redirect alone must not mark an order PAID. Complete a payment and verify a successful notification entry in Midtrans and PAID in TANJ. Cek status pembayaran provides a signed-in buyer fallback to the authoritative GET Status API. Delivery tracking and completion continue through the existing admin flow.

## Operational behavior

Manual QRIS orders remain manual. Midtrans orders cannot be approved, rejected, cancelled, or marked paid through the old manual RPCs. Provider expiry/cancellation releases stock once; paid orders ignore delayed terminal notifications. Refunds, disputes and chargebacks require merchant follow-up in Midtrans and are not automatically refunded or restocked by TANJ.

A failed/ambiguous create request reuses the same order ID and cannot create a second bill with a different amount. If Midtrans accepted a request but the redirect URL could not be persisted, contact support with the order ID rather than creating another customer order. Pending orders can be reconciled using Cek status pembayaran.

References:

- https://docs.midtrans.com/docs/https-notification-webhooks
- https://docs.midtrans.com/reference/get-transaction-status
- https://docs.midtrans.com/docs/snap-advanced-feature

New Midtrans orders charge subtotal plus net shipping only (after shipping subsidy). They have no unique-code surcharge. Historical Midtrans orders retain their original amounts.
