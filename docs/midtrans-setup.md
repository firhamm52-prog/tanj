# Midtrans Snap TANJ

Checkout embeds Midtrans Snap when a matching public Client Key is configured; hosted redirection is the fallback for older sessions or missing Client Key. Amount comes only from the trusted order RPC; the browser cannot set it. Production is not enabled merely by committing the code.

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

Check that the Snap amount equals the stored order total; a success redirect alone must not mark an order PAID. Complete a payment and verify a successful notification entry in Midtrans and PAID in TANJ. The automatic signed-in status check uses the authoritative GET Status API. Delivery tracking and completion continue through the existing admin flow.

## Operational behavior

### Change an issued VA bank (023)

Install `supabase/migrations/202610240023_change_va_bank.sql` once after 022, then deploy the rebuilt `supabase/dashboard/midtrans.ts`. Unpaid VA orders (including historical Midtrans orders without a channel) show **Ubah bank account** below the embedded payment panel. Clicking this button starts the process directly without a confirmation dialog; the backend authenticates the owner, acquires a one-minute switch lease and reads the provider status. A paid bill is reconciled without replacement. An issued pending bank-transfer/Mandiri bill is cancelled via Midtrans and its cancellation is verified with a separate status lookup before local rotation. If no bank has been chosen yet, the existing payment list is reopened instead.

One TANJ order, stock reservation, total and deadline are preserved. A replacement provider bill uses the TANJ ID plus an eight-hex suffix (50 characters total); provider IDs are private gateway metadata, not new customer orders. Status checks follow the active provider ID. Signed webhook verification uses the full provider ID and maps it to the original TANJ order. The private gateway rejects unknown provider IDs, ignores delayed cancellation/expiry from retired bills, and still reconciles authoritative paid notifications. Switching prevents cancellation callbacks from releasing the stock reservation while the replacement is being prepared. A duplicate click or stale completion cannot rotate twice. If cancellation cannot be confirmed, no new bill is created; the customer can retry after the lease expires. After a confirmed switch, TANJ embeds the replacement Snap session inline immediately, where the customer chooses another bank. Each embedded session loads Snap in a separate same-origin frame so old SDK state or hide callbacks cannot affect the new session. There is no TANJ reload, navigation, external-payment link or new tab. Do not pay the old VA after confirming a switch.

Tests cover the SQL lease and stock preservation, late old-bill cancellation, suffixed webhook signatures, ownership, provider cancellation uncertainty, payment racing with cancellation, replacement bill IDs, and the browser button. Provider responses are simulated in tests; production cancellation success depends on the bank/Midtrans response. See [Midtrans pending payment cancellation](https://docs.midtrans.com/reference/cancel-api-1) and [one order with multiple provider attempts](https://docs.midtrans.com/docs/snap-advanced-feature).

### Change an unused QRIS session to VA (022)

After changing methods, TANJ replaces only the embedded payment panel and refreshes order metadata without reloading or navigating the main page. No Buka Midtrans or Lanjutkan pembayaran external link is shown. An SDK invalid-state failure offers Muat ulang pembayaran for the same TANJ order instead of redirecting away. This frontend update requires no additional SQL or Edge Function deployment beyond the existing 022/023 setup.

Install `supabase/migrations/202610240022_change_payment_method.sql` once after 021 and deploy the rebuilt `supabase/dashboard/midtrans.ts`. Pending QRIS orders show **Ubah metode pembayaran**, offering Virtual Account while QRIS is paused. The Edge Function authenticates the owner and checks authoritative Midtrans status first. A pending/terminal provider transaction cannot be switched; already paid transactions are reconciled instead. Only a not-started provider response permits the private database change, which preserves inventory, total and deadline and clears the old local token references. The next Snap creation uses the same provider order ID, so Midtrans invalidates an unused old token or rejects recreation if a concurrent payment has already utilized it. An interrupted replacement retains the reservation; uncertain or rejected replacement creation must not release inventory while the previous token might still exist. Customer retries reuse the same order. Historical VA orders cannot be switched through this recovery action. This is not cancellation or refund.

The customer-facing **Cek status pembayaran** button has been removed. Active Midtrans payment screens check authoritative status every 5 seconds and immediately on returning to the browser tab. After verified payment and order refresh, the screen changes to **Pembayaran berhasil** automatically, without reloading the whole page or relying on the customer's claim. Temporary verification errors leave the bill visible and retry automatically. The 5-second update needs a Midtrans Edge Function redeploy to allow 30 status checks/minute per user independently of the 12 payment-start attempts/minute. No SQL changes are needed.

### Two payment choices (021)

QRIS is temporarily disabled in the production chooser after Snap returned No payment channels available for a QRIS-only order. It displays Segera tersedia and cannot be selected; Virtual Account remains enabled. Confirm GoPay QRIS or ShopeePay QRIS and Other QRIS availability in Production before re-enabling qrisEnabled. This frontend change needs no SQL, secrets or Edge Function redeploy and does not modify existing orders.

Run `supabase/migrations/202610230021_midtrans_payment_channels.sql` once after 020, then deploy the rebuilt `supabase/dashboard/midtrans.ts` to the Midtrans Edge Function. Enabled production checkout now shows exactly **Virtual Account** and **QRIS**. Both use Midtrans; manual QRIS and unavailable gateway placeholders are removed from the production chooser. The stored order records the chosen channel before creating a Snap session; QRIS requests `other_qris` only, VA requests bank transfer channels only. Historical sessions retain their original methods. QRIS requires an active GoPay or ShopeePay QRIS acquirer in the matching Midtrans merchant environment; code changes alone do not activate it. See [Other QRIS](https://docs.midtrans.com/reference/other-qris).

### Payment window and couriers (020)

Run `supabase/migrations/202610230020_payment_window_couriers.sql` once. It sets the live payment settings and CMS draft/published payment window to 2 hours for new orders. Existing order deadlines and existing Midtrans bills are preserved. Midtrans receives the remaining time until that stored deadline, so stock stays reserved until verified settlement or verified expiry/cancellation; local timers alone do not restore inventory.

Deploy the regenerated `supabase/dashboard/shipping.ts` to the **shipping** Edge Function. Set `BITESHIP_COURIERS=jne,jnt` in Supabase Secrets. Only JNE and J&T survive the server courier allowlist, cached quote filter, browser filter and new-order database validation. Historical orders using other couriers remain readable and idempotent retries keep their original data. No Midtrans Edge Function redeploy is needed for 020. CMS settings can be used to deliberately change the payment window later.

New Snap sessions request `permata_va.recipient_name = TANJ INDONESIA` for Permata VA payment prompts. Existing Snap sessions/VA instructions are reused without recreation, so the change applies to newly created sessions. The acquiring bank/application may retain its provider/biller label; this does not rename Midtrans's company code. See [Permata VA description](https://docs.midtrans.com/docs/snap-advanced-feature#specify-va-description).

### Embedded checkout (019)

After installing 015, run `supabase/migrations/202610220019_midtrans_embedded.sql` once. Set Supabase Secret `MIDTRANS_CLIENT_KEY` to the **Production General Credentials Client Key** when `MIDTRANS_IS_PRODUCTION=true` (use matching Sandbox credentials for Sandbox). This is the public Client Key; keep `MIDTRANS_SERVER_KEY` as the private server credential. Replace the entire Midtrans Edge Function code with the rebuilt `supabase/dashboard/midtrans.ts` and deploy updates, retaining Verify JWT OFF.

For Midtrans orders, Buat pesanan automatically prepares and embeds Snap on the payment screen. Customers choose QRIS or a VA bank; Midtrans displays that transaction's QR/VA instructions for the stored total including net shipping. A static merchant QR or bank account is not used for automatic settlement. Without a Client Key or for a historical session missing its Snap token, checkout falls back to the hosted Midtrans payment page. Public Client Key and customer-bound Snap token are sent after the authenticated order-owner check; the Server Key stays on the server.

The browser checks authoritative status every 5 seconds while this payment screen is visible, in addition to webhooks and the existing order refresh. Snap UI callbacks never mark the order paid themselves; they trigger verification through the server. Failed setup leaves a Muat ulang pembayaran button. Local browser tests use a simulated provider, not actual payments.

Migration 019 permits another creation attempt after an expired preparation lease using the same TANJ/Midtrans order ID and retaining its stock reservation. Midtrans documents that regenerating Snap for an unused order invalidates the previous unused token, while utilized orders reject duplicate creation. Duplicate responses trigger an authoritative status lookup, not inventory release or a new order ID. A valid existing bill whose Snap token was lost may still need merchant follow-up; it is not cancelled or refunded automatically. Attempt IDs prevent a delayed response from a previous attempt releasing or overwriting a newer reservation/session. Core API 404 before a payment method is selected is treated as not started, never as proof that stock can safely be released. This supersedes the 015-only indefinite creation block described below.

Reference: [Snap embedded mode](https://docs.midtrans.com/reference/snap-js), [recreating Snap tokens](https://docs.midtrans.com/docs/snap-advanced-feature).

Manual QRIS orders remain manual. Midtrans orders cannot be approved, rejected, cancelled, or marked paid through the old manual RPCs. Provider expiry/cancellation releases stock once; paid orders ignore delayed terminal notifications. Refunds, disputes and chargebacks require merchant follow-up in Midtrans and are not automatically refunded or restocked by TANJ.

A failed/ambiguous create request reuses the same order ID and cannot create a second bill with a different amount. If Midtrans accepted a request but the redirect URL could not be persisted, contact support with the order ID rather than creating another customer order. Pending orders can be reconciled through the automatic status check.

References:

- https://docs.midtrans.com/docs/https-notification-webhooks
- https://docs.midtrans.com/reference/get-transaction-status
- https://docs.midtrans.com/docs/snap-advanced-feature

New Midtrans orders charge subtotal plus net shipping only (after shipping subsidy). They have no unique-code surcharge. Historical Midtrans orders retain their original amounts.

## Inventory reservation update (015)

Run `supabase/migrations/202610220015_midtrans_stock_reservation.sql` once after 014, then replace the Midtrans Edge Function code with the newly generated `supabase/dashboard/midtrans.ts` and deploy it. Keep Verify JWT off. Both SQL and Edge code are required; a GitHub push does not deploy Supabase functions.

New Midtrans orders no longer reserve inventory at checkout creation. Process Payment atomically reserves all items before asking Midtrans to create the Snap bill. Competing payment preparations cannot reserve the same last unit; the loser sees `[Nama Produk] sudah diorder`. A failed multi-item reservation rolls back all item debits. A definitive provider rejection releases inventory exactly once and permits retry. A successful bill retains its reservation until verified payment or verified expiry/cancellation; settlement does not debit inventory again. Existing orders preserve their earlier reservations and totals. Manual QRIS behavior is unchanged.

A network timeout, provider server error, duplicate-order response, or failure to persist the redirect URL does **not** prove no bill exists. Keep inventory reserved in these cases. On installations with 015 but without 019, creation remains blocked after the preparation lease expires until the merchant investigates the order in Midtrans; do not blindly restore stock or issue a different bill. The automatic status check reconciles transactions visible to Midtrans. An unused Snap session may not yet appear in the Core status API; these cases require merchant follow-up. Stock is restored on verified terminal notification/status, not just a local timer. If notifications fail, use the status check to reconcile.

To diagnose a failed Process Payment, inspect Supabase Edge Functions → midtrans → Logs for `Midtrans provider rejected request`. It records HTTP/provider status and bounded provider error messages, without the Server Key or request body. No live payment success has been established by the local simulated-provider tests.
