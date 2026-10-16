# TANJ improvement 2

Reference: owner's Word document, 16 October 2026. Source document/images remain
local; they are not published with the website.

- Admin approve has one confirmation checkbox and action buttons. Amount,
  bank reference, transfer time and customer-note inputs are removed from this
  screen; tagihan stays visible above it. Reject also asks for confirmation.
- PostgreSQL RPC checks admin membership and expected order version. It records
  the decision time automatically in history, not an invented transfer time or
  bank reference. Existing payment-review history remains unchanged.
- Paid orders expose a courier and tracking-number form. The admin-only RPC
  rejects unpaid/stale updates; customer RLS still limits order visibility.
  Customer sees courier/tracking in their payment details and can copy the number.
  This is a manually entered tracking number, not a carrier API integration.
- Available product recommendations appear below product details and checkout,
  excluding the selected/cart products. Clicking opens that product without
  silently adding to the cart or creating an order.
- WhatsApp CS link points to `https://wa.me/6281363661703` and hides while dialogs
  are open so it cannot cover order buttons.
- Compact ordering panel keeps primary buttons visible at tested desktop/mobile
  sizes. Recommendations remain below and can be scrolled. At extreme zoom or
  text sizes the panel remains scrollable for accessibility.

Before deployment, run only `202610160004_review_tracking.sql` in SQL Editor.
Do not rerun old migrations or reset orders. Tests: `test:supabase`,
`tests/payment-admin.mjs`, `tests/shopping-improvements.mjs`, commerce regressions.

Owner reported migration 004 Success. Live RPC checks confirm both new functions
are present and deny unauthenticated calls (401); no real order was changed.
