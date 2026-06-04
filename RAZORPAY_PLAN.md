# Razorpay Payment Integration — `FEAT-016`

Integrates Razorpay as the online payment collection layer into the Bodyline SaaS dashboard. The goal is to let the gym owner send a **Razorpay payment link via WhatsApp** to a member with a due balance, and for the system to **auto-reconcile the payment** back into `member_memberships` via a webhook — eliminating manual cash tracking.

This is a purely additive integration. No existing flows (cash, UPI manual) are changed or removed.

---

## User Review Required

> [!IMPORTANT]
> **Razorpay API Key Architecture Decision**  
> Each gym tenant will store their own Razorpay `key_id` and `key_secret` in `gym_settings`. This means every gym owner must sign up for their own Razorpay account. The platform does NOT act as a marketplace/aggregator — it's a bring-your-own-keys model (simplest, no RBI requirements, no Razorpay approval needed).
>
> **Alternative**: The platform operator (you) holds one Razorpay account and uses the Route API to split payments. This requires Razorpay marketplace approval and is much more complex. ❌ Recommend avoiding for now.

> [!WARNING]
> **Razorpay `key_secret` is sensitive** — it must NEVER be stored in `gym_settings` as plain text in a way that's readable by the browser. The plan below stores the encrypted secret server-side only. See the Storage Strategy section for details.

> [!IMPORTANT]
> **Webhook URL per tenant**  
> Since each gym has its own Razorpay account, each gym owner must register the webhook URL in their own Razorpay dashboard. The webhook endpoint `/api/razorpay/webhook` is shared but uses the `gym_id` payload to route correctly.

---

## Open Questions

> [!NOTE]
> **Should we add a new `payment_method` enum value `"razorpay"` to `member_memberships`?**  
> Currently allowed: `'cash' | 'upi' | 'card' | 'online'`. Using `"online"` would work but loses specificity. Recommend adding `"razorpay"` — this requires a DB migration + updating the CHECK constraint. Listed in the plan below as an atomic step.

> [!NOTE]
> **Where do Razorpay keys live?**  
> Two options:
> 1. **(Recommended)** New columns `razorpay_key_id TEXT` and `razorpay_key_secret TEXT` on `gym_settings`. The `key_secret` is encrypted at rest using Supabase Vault or a server-only env-derived encryption key. The `key_id` is safe to read client-side.
> 2. Separate `gym_integrations` table with a `provider` column for future extensibility.
> 
> **Recommend option 1** (simpler, fewer moving parts, aligns with existing `upi_id` pattern).

---

## Proposed Changes

### Phase 1 — Database Migration

#### [NEW] `scripts/11_feat_016_razorpay.sql`
- Adds `razorpay_key_id TEXT` to `gym_settings` (safe to read client-side, used to init Razorpay checkout)
- Adds `razorpay_key_secret TEXT` to `gym_settings` (server-read only — the API Route fetches it via `service_role`)
- Adds `razorpay_order_id TEXT` to `member_memberships` (stores the Razorpay Order ID for webhook matching)
- Updates the `payment_method` CHECK constraint to also allow `'razorpay'`
- Updates `00_fresh_schema.sql` annotations

---

### Phase 2 — TypeScript Types

#### [MODIFY] `types/index.ts`
- Add `razorpay_key_id: string | null` and `razorpay_key_secret: string | null` to `GymSettings`
- Add `razorpay_order_id: string | null` to `MemberMembership`
- Add `"razorpay"` to the `PaymentMethod` union type

---

### Phase 3 — Settings: Razorpay Key Configuration

#### [MODIFY] `lib/validations/gym.ts`
- Add `razorpay_key_id: z.string().optional().or(z.literal(""))` — regex validates `rzp_live_*` / `rzp_test_*` prefix
- Add `razorpay_key_secret: z.string().optional().or(z.literal(""))` — min length validation

#### [MODIFY] `hooks/useGymSettings.ts`
- Include `razorpay_key_id` in the SELECT (but NOT `razorpay_key_secret` — it is never sent to the browser)

#### [MODIFY] `hooks/useGymSettingsMutation.ts`
- Add `razorpay_key_id` and `razorpay_key_secret` to the `update()` payload

#### [MODIFY] `app/dashboard/settings/page.tsx` — `GymSettingsTab` component
- Add a new **"Payment Gateway"** card below the existing "Contact & Payments" card
- Two inputs: `Razorpay Key ID` (shown) and `Razorpay Key Secret` (password type, write-only)
- A test connection button that calls `/api/razorpay/test-keys` to verify the keys work
- Status badge: "Connected ✓" / "Not configured"

---

### Phase 4 — Server-Side API Routes

#### [NEW] `app/api/razorpay/create-order/route.ts`
Secure POST handler. Called when the owner clicks "Send Payment Link" in the PaymentDrawer.

**Flow:**
1. Receives `{ membership_id, gym_id }` in request body
2. Fetches `razorpay_key_id` + `razorpay_key_secret` from `gym_settings` using `service_role` client (bypasses RLS — safe because it's server-side)
3. Reads the membership's `amount_due` (plan price − amount_paid)
4. Creates a Razorpay Order via `POST https://api.razorpay.com/v1/orders`
5. Stores the returned `order_id` in `member_memberships.razorpay_order_id`
6. Generates a Razorpay Payment Link via `POST https://api.razorpay.com/v1/payment_links`
7. Returns `{ payment_link_url, order_id }` to the client
8. **Client then fires the existing WhatsApp route** to send the link to the member's phone (reuses `useSendReminder` with a new template)

#### [NEW] `app/api/razorpay/webhook/route.ts`
Secure POST handler that Razorpay calls after a payment is completed.

**Flow:**
1. Validates the `x-razorpay-signature` HMAC-SHA256 signature using the gym's `key_secret`
2. Parses the event — listens only for `payment_link.paid`
3. Extracts `order_id` from the payload
4. Looks up the `member_memberships` row by `razorpay_order_id`
5. Updates `amount_paid`, `payment_status → 'paid'`, `payment_method → 'razorpay'`, `last_payment_at → now()`
6. Returns `200 OK`

> [!IMPORTANT]
> The webhook uses the `SUPABASE_SERVICE_ROLE_KEY` (already in `.env`) to bypass RLS, since the webhook call has no user JWT. This is correct and safe — the service role is only used server-side.

#### [NEW] `app/api/razorpay/test-keys/route.ts`
Lightweight POST handler called by the settings page to verify that the provided `key_id` + `key_secret` are valid. Calls Razorpay's `GET /v1/orders?count=1` and returns success/failure.

---

### Phase 5 — Frontend Hook

#### [NEW] `hooks/useCreateRazorpayLink.ts`
TanStack `useMutation` hook that:
1. Calls `POST /api/razorpay/create-order` with `{ membership_id }`
2. On success, receives `payment_link_url`
3. Optionally calls `useSendReminder` to WhatsApp the link to the member
4. Shows `toast.success("Payment link sent via WhatsApp")` or displays the link in a copyable UI

---

### Phase 6 — UI: PaymentDrawer Action

#### [MODIFY] `app/dashboard/payments/PaymentDrawer.tsx`
- Add a **"Send Payment Link"** button below the existing "Record Payment" button
- Button is only visible when:
  - `due > 0` (balance outstanding)
  - `gymSettings.razorpay_key_id` is set (integration configured)
- Shows a loading state while the order is being created
- On success: shows a copyable payment link + confirmation that WhatsApp was sent

---

### Phase 7 — Environment Variables

#### [MODIFY] `.env.example`
Add a new section documenting the Razorpay webhook secret (used for signature verification):
```
# ── Razorpay ─────────────────────────────────────────────────
# Per-tenant keys are stored in gym_settings (DB), NOT here.
# This is a platform-level webhook verification secret (optional — used only if
# you want a single shared webhook rather than per-gym webhook secrets).
# RAZORPAY_WEBHOOK_SECRET=your-webhook-secret-here
```

> [!NOTE]
> Since each gym has its own Razorpay account (and thus its own webhook secret = their `key_secret`), we do NOT need a platform-level `RAZORPAY_WEBHOOK_SECRET`. The webhook route fetches the gym's `key_secret` by looking up the `order_id` in the DB. This is the correct architecture.

---

## File Change Summary

| File | Action | Notes |
|---|---|---|
| `scripts/11_feat_016_razorpay.sql` | NEW | DB migration: new columns, CHECK constraint update |
| `scripts/00_fresh_schema.sql` | MODIFY | Add razorpay columns to `gym_settings` definition + `payment_method` CHECK |
| `types/index.ts` | MODIFY | New fields on `GymSettings`, `MemberMembership`, `PaymentMethod` |
| `lib/validations/gym.ts` | MODIFY | razorpay_key_id + key_secret fields |
| `hooks/useGymSettings.ts` | MODIFY | Add razorpay_key_id to SELECT |
| `hooks/useGymSettingsMutation.ts` | MODIFY | Include razorpay keys in update payload |
| `hooks/useCreateRazorpayLink.ts` | NEW | TanStack mutation for creating Razorpay order + payment link |
| `app/api/razorpay/create-order/route.ts` | NEW | Order creation + payment link generation |
| `app/api/razorpay/webhook/route.ts` | NEW | Webhook handler + auto-reconciliation |
| `app/api/razorpay/test-keys/route.ts` | NEW | Key validation for settings UI |
| `app/dashboard/settings/page.tsx` | MODIFY | New "Payment Gateway" card in GymSettingsTab |
| `app/dashboard/payments/PaymentDrawer.tsx` | MODIFY | "Send Payment Link" action button |
| `.env.example` | MODIFY | Razorpay section docs |

---

## Verification Plan

### Automated
- `npx tsc --noEmit` — verify zero type errors after all changes

### Manual (Dev DB)
1. **Settings**: Navigate to `bodyline.localhost:3000/dashboard/settings` → Gym Settings tab → enter Razorpay **test** keys (`rzp_test_*`) → click "Test Connection" → confirm "Connected ✓"
2. **Payment Link Creation**: Open PaymentDrawer for a member with due balance → click "Send Payment Link" → confirm order created in Razorpay dashboard
3. **Webhook Reconciliation**: Complete the payment in Razorpay's test checkout → confirm `member_memberships` row updates: `payment_status = 'paid'`, `payment_method = 'razorpay'`, `last_payment_at` is stamped
4. **RLS check**: Verify a second tenant's `key_secret` is not returned by any client-facing query

### Webhook Local Testing
Use the [Razorpay Webhook Simulator](https://dashboard.razorpay.com/app/webhooks) or `ngrok` to tunnel `localhost:3000/api/razorpay/webhook` for local webhook testing.
