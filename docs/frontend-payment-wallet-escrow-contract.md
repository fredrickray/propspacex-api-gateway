# Frontend Integration Contract (Payment, Wallet, Escrow)

This file describes the gateway routes that the frontend should use after the payment-system migration.

## Base Path

- All routes are mounted under `/api/v1`.

## Payment Routes

- `POST /payments/intent`
  - Purpose: create an escrow funding payment intent.
  - Required body fields:
    - `buyer_user_id` (falls back to authenticated user)
    - `escrow_id`
    - `amount_minor`
    - `currency_code` (`1`=NGN, `2`=USD)
    - `provider` (e.g. `paystack`)
    - `email` (falls back to authenticated user email)
    - `idempotency_key`
    - `purpose` (`1` only; escrow funding)
  - Optional:
    - `callback_url`

- `POST /payments/verify`
  - Required body: `provider`, `reference`

- `GET /payments/verify/:reference?provider=paystack`
  - Required query: `provider` (or legacy `gateway`)

- `POST /payments/wallet-topup/intent`
  - Required body:
    - `user_id` (falls back to authenticated user)
    - `amount_minor`
    - `currency_code`
    - `provider`
    - `email` (falls back to authenticated user email)
    - `idempotency_key`
  - Optional:
    - `callback_url`

- `POST /payments/wallet-topup/verify`
  - Required body: `provider`, `reference`

- `GET /payments/wallet-topup/verify/:reference?provider=paystack`
  - Required query: `provider` (or legacy `gateway`)

- `POST /payments/webhook/:provider`
  - Public route for provider webhooks.
  - Requires provider signature header (`x-paystack-signature`, `verif-hash`, or `stripe-signature`).
  - Requires raw body capture to remain enabled at gateway middleware.

## Wallet Routes

- `POST /wallets`
  - Required body: `currency_code`
  - Optional body: `user_id` (defaults to authenticated user)

- `GET /wallets/me`
  - Returns authenticated user's wallet.

- `GET /wallets/:walletId`
  - Returns wallet by id.

- `GET /wallets/me/transactions?page=1&limit=10`
  - Optional query: `reference_type`, `reference_id`

- `POST /wallets/withdrawals`
  - Required body:
    - `amount_minor`
    - `bank_code`
    - `account_number`
    - `account_name`
    - `idempotency_key`
  - Response includes `withdrawal.lifecycle_state` (normalized):
    - `pending`, `processing`, `success`, `failed`, `cancelled`, `unspecified`

- `GET /wallets/withdrawals/me?page=1&limit=10&status=1`
  - Optional query: `status` enum number.
  - Response withdrawals include `lifecycle_state`.

- `GET /wallets/withdrawals?page=1&limit=10&status=1`
  - User route returns authenticated user's withdrawals.
  - Admin may add `user_id=<targetUserId>` to inspect a specific user's withdrawals.
  - Response withdrawals include `lifecycle_state`.

- `POST /wallets/credit` (admin only)
  - Required body: `user_id`, `amount_minor`, `reference_type`, `reference_id`, `idempotency_key`
  - Optional body: `note`

- `POST /wallets/debit` (admin only)
  - Required body: `user_id`, `amount_minor`, `reference_type`, `reference_id`, `idempotency_key`
  - Optional body: `note`

## Escrow Routes

- `GET /escrows?page=1&limit=10`
  - Optional query:
    - `user_id` (defaults to authenticated user)
    - `role`
    - `status`

- `GET /escrows/deal/:dealRef`
- `GET /escrows/:escrowId`
- `GET /escrows/:escrowId/timeline`

- `POST /escrows`
  - Required body:
    - `deal_ref`, `buyer_user_id`, `agent_user_id`, `property_id`
    - `currency_code`, `amount_minor`, `idempotency_key`
  - Optional:
    - `platform_fee_minor`, `hold_funds_now`, `metadata_json`

- `POST /escrows/:escrowId/mark-complete`
  - Required body: `idempotency_key`
  - Optional/fallback: `agent_user_id` (defaults to authenticated user)
  - Optional: `note`

- `POST /escrows/:escrowId/release`
  - Required body: `idempotency_key`
  - Optional/fallback: `buyer_user_id` (defaults to authenticated user)
  - Optional: `note`

- `POST /escrows/:escrowId/cancel`
  - Required body:
    - `cancelled_by_role`
    - `reason`
    - `idempotency_key`
  - Optional/fallback: `cancelled_by_user_id` (defaults to authenticated user)

- `POST /escrows/:escrowId/disputes`
  - Required body:
    - `opened_by_role`
    - `reason`
    - `idempotency_key`
  - Optional/fallback: `opened_by_user_id` (defaults to authenticated user)
  - Optional: `details`

- `POST /escrows/disputes/:disputeId/resolve` (admin only)
  - Required body:
    - `resolution` (`3`,`4`,`5`,`6`)
    - `idempotency_key`
  - Optional/fallback: `admin_user_id` (defaults to authenticated user)
  - Optional:
    - `buyer_award_minor`
    - `agent_award_minor`
    - `admin_note`

## Frontend Cutover Checklist

- Replace simulated wallet/escrow data sources with the routes above.
- Use `amount_minor` values consistently (no major-unit assumptions in requests).
- Send unique `idempotency_key` for all mutating payment/wallet/escrow operations.
- Treat wallet withdrawal UI state from `withdrawal.lifecycle_state`.
- For payment verification routes, always send provider explicitly.
- For webhook local testing, ensure raw body is preserved in gateway middleware.
