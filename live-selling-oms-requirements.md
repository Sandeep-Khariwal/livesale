# Live Selling Order Management Software
### Technical Requirements & Architecture Document — V1

---

## 1. Executive Summary

A **Next.js full-stack application** that replaces a manual Instagram/Facebook Live selling workflow (screenshot → WhatsApp → Excel) with a structured system built around three things:

1. **Product Code → Stock Check → Order** (not a product catalog)
2. **Atomic stock reservation** so two customers can never buy the last unit
3. **Manual payment screenshot verification** by an admin, with a **real-time live dashboard**

This is explicitly **not an e-commerce platform**. There is no catalog browsing, cart, wishlist, reviews, SEO, or payment gateway in V1. Every design decision should optimize for two people: the **client running a live video** and the **customer watching it on a phone**.

---

## 2. Core Philosophy

| For the Client (Admin) | For the Customer |
|---|---|
| Add products → Start live → Watch orders arrive → Verify screenshots → Stock updates itself | Enter code → Enter details → Upload payment screenshot → Submit |

If a feature doesn't serve one of these two flows, it does not belong in V1.

---

## 3. End-to-End Workflow

```
Instagram/Facebook Live
        ↓
Client announces Product Code + Price + Stock
        ↓
Customer opens Order Page (mobile)
        ↓
Customer enters Product Code
        ↓
System checks live stock (server-side, authoritative)
        ↓
Customer fills shipping/contact details (guest, no login)
        ↓
Customer sees UPI/QR payment instructions
        ↓
Customer pays manually, uploads payment screenshot (→ S3)
        ↓
Order created — stock RESERVED atomically
        ↓
Admin's live dashboard updates in real time
        ↓
Admin opens screenshot → VERIFY or REJECT
        ↓
VERIFY → PaymentStatus=VERIFIED, OrderStatus=CONFIRMED, stock reservation → permanent sale
REJECT → PaymentStatus=REJECTED, OrderStatus=CANCELLED, stock released back to pool
        ↓
(If neither happens within N minutes) → reservation EXPIRES → stock released
```

---

## 4. Technology Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Backend | Next.js Route Handlers / Server Actions — **no separate Express server** |
| Database | MongoDB |
| ODM | Mongoose |
| File storage | AWS S3 (payment screenshots, optional product images) |
| Realtime | WebSocket/pub-sub layer (see §9) |
| Auth | Session/JWT-based admin auth (credentials-based; no customer auth) |
| Deployment target | Any Node-compatible host; stateless app tier + MongoDB + S3 |

---

## 5. Database Schema (Mongoose)

> Designed so **Payment**, **notifications**, and **product images** can be extended later without restructuring `Order` or `LiveProduct`.

The database is built using standard Mongoose schemas defined in `src/models/*.ts`. Below is a high-level overview of the relationships:

- **AdminUser**: Authentication and authorization.
- **LiveSession**: Central entity grouping a single live stream event.
- **LiveProduct**: Product instances assigned to a specific `LiveSession`. A composite unique index on `[liveSessionId, productCode]` ensures code uniqueness per session.
- **Customer**: A guest user identified by their mobile number.
- **Order**: Associates a `Customer`, `LiveProduct`, and `LiveSession` with an amount and an expiry window.
- **ShippingAddress**: 1:1 relation with `Order`.
- **Payment**: 1:1 relation with `Order`, handling manual UPI screenshots.
- **StockTransaction**: An append-only ledger mapping stock history `[liveProductId, createdAt]`.
- **OrderStatusHistory**: Audit trail for state machine transitions.

**Key design notes**
- `Payment` is a separate collection from `Order` from day one, with unused `gateway*` fields reserved — a future gateway integration only adds logic, not schema migrations that touch `Order`.
- `StockTransaction` is an append-only ledger; `LiveProduct.availableStock`/`reservedStock` are **derived/cached** values kept in sync inside the same DB transaction that writes a `StockTransaction` document.
- `AppSettings.reservationWindowMinutes` makes the reservation timeout configurable instead of hardcoded across the codebase.

---

## 6. Stock Reservation — Concurrency Strategy

This is the most critical piece of the system. **Never** do "check stock" and "update stock" as two separate steps.

### Approach: Atomic updates or Multi-document Transactions

In MongoDB, we achieve atomic updates either through single-document operations (Optimistic Concurrency) or Multi-document ACID transactions (requires a Replica Set, standard in MongoDB Atlas).

**Option A: Multi-document Transaction (Recommended for MongoDB Atlas)**
```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 1. Read product
  const product = await LiveProduct.findById(X).session(session);
  if (product.availableStock < 1 || product.status !== 'AVAILABLE') {
      throw new Error("SOLD_OUT");
  }

  // 2. Update product and create related records atomically
  await LiveProduct.updateOne(
      { _id: X },
      {
          $inc: { availableStock: -1, reservedStock: 1 },
          $set: { status: product.availableStock === 1 ? 'SOLD_OUT' : 'AVAILABLE' }
      },
      { session }
  );
  // ... INSERT StockTransaction, Order, ShippingAddress, Customer, Payment using { session } ...
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

**Option B: Optimistic Concurrency (No Replica Set needed)**
Rely on Mongoose's atomic operations:
```javascript
const result = await LiveProduct.updateOne(
  { _id: X, availableStock: { $gte: 1 }, status: 'AVAILABLE' },
  { $inc: { availableStock: -1, reservedStock: 1 } }
);

if (result.modifiedCount === 0) return "SOLD_OUT";

// If successful, proceed to create Order, Customer, Payment etc.
// Note: While this prevents overselling, the Order creation isn't perfectly atomic with the stock update unless wrapped in a transaction.
```

Either pattern guarantees that if Stock = 1 and two requests arrive simultaneously, exactly one succeeds and the other is told the product is sold out — **at the database level**, not just in application code.

### Reservation expiry

- A background job (cron / scheduled serverless function / `setInterval` worker) runs every 1–2 minutes:
  - Finds `Order` rows where `orderStatus = PENDING_PAYMENT_VERIFICATION AND reservationExpiresAt < now()`
  - For each: sets `orderStatus = EXPIRED`, inserts `StockTransaction(type=RESERVATION_RELEASE, quantity=+1)`, increments `availableStock`, decrements `reservedStock`, recomputes `status` (back to `AVAILABLE` if it was `SOLD_OUT`)
  - This must also run inside a multi-document transaction (if using a Replica Set) per order to stay consistent with concurrent admin verify/reject actions.

---

## 7. State Machines

**Order / Payment status**

```
PENDING_PAYMENT_VERIFICATION ──(admin verifies)──▶ CONFIRMED   [Payment: PENDING → VERIFIED]
PENDING_PAYMENT_VERIFICATION ──(admin rejects)───▶ CANCELLED   [Payment: PENDING → REJECTED]
PENDING_PAYMENT_VERIFICATION ──(timeout)─────────▶ EXPIRED
```

Every transition writes an `OrderStatusHistory` row for a full audit trail, satisfying the "order timeline/history" requirement in §23.

**Stock**

```
AVAILABLE ──(availableStock hits 0)──▶ SOLD_OUT
SOLD_OUT  ──(release / restock / manual adjustment raises stock > 0)──▶ AVAILABLE
```

---

## 8. API Surface (Route Handlers)

**Customer-facing (public)**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/products/check?code=SR101` | Server-authoritative availability + price check |
| POST | `/api/orders` | Create order: validates code, atomically reserves stock, creates customer/address/payment records |
| POST | `/api/uploads/payment-screenshot` | Signed S3 upload (pre-signed URL flow) |
| GET | `/api/orders/:orderNumber/confirmation` | Order confirmation lookup |

**Admin (protected — session/JWT required on every route)**
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/admin/auth/login` | Admin login |
| GET | `/api/admin/live-sessions` / POST | List/create live sessions |
| POST | `/api/admin/live-sessions/:id/start` \| `/end` | Start/end live |
| POST | `/api/admin/live-sessions/:id/products` | Quick bulk product entry |
| PATCH | `/api/admin/products/:id` | Edit product (price/stock/image) |
| POST | `/api/admin/products/:id/adjust-stock` | Manual stock adjustment (+writes StockTransaction) |
| GET | `/api/admin/orders` | List/filter orders |
| GET | `/api/admin/orders/:id` | Order detail incl. address, payment, history |
| POST | `/api/admin/orders/:id/verify-payment` | Verify → CONFIRMED |
| POST | `/api/admin/orders/:id/reject-payment` | Reject → CANCELLED, release stock |
| GET | `/api/admin/customers` | Customer list w/ aggregates |
| GET | `/api/admin/customers/:id` | Customer order history |
| GET | `/api/admin/dashboard/live/:sessionId` | Aggregated stats for live dashboard |
| GET | `/api/admin/screenshots/:key/signed-url` | Short-lived signed URL to view a private S3 screenshot |

---

## 9. Real-Time Live Dashboard

**Goal:** admin keeps this open on a laptop during the live; it updates without manual refresh when:
- A new order is created
- Stock changes (reservation, sale, release, manual adjustment, restock)
- A product becomes SOLD_OUT
- Payment is verified/rejected

**Recommended approach:** a lightweight pub/sub channel per `LiveSession`.
- Server emits events (`order.created`, `stock.updated`, `product.sold_out`, `payment.verified`, `payment.rejected`) whenever the corresponding DB transaction commits.
- Transport: WebSocket server (e.g., via a small standalone Node/`ws` process, or a managed realtime service such as Pusher/Ably/Supabase Realtime/Socket.io on a custom Next.js server) subscribed to by the admin dashboard client.
- Fallback: short-interval polling (e.g., every 3–5s) of a lightweight `/api/admin/dashboard/live/:sessionId` summary endpoint if a WebSocket layer is deferred — acceptable for V1 but a true push mechanism is strongly preferred given the "no refresh" requirement.

Dashboard sections map directly to §18 of the spec: header stats (Orders Today, Sales, Pending Verification, Confirmed, Sold Out count), Recent Orders table, Live Product Stock table.

---

## 10. Admin Panel — Information Architecture

```
Dashboard        → today's snapshot across all sessions
Live Sale        → session list, start/end, the real-time live dashboard
Products         → quick add/bulk entry, edit, manual stock adjustment
Orders           → filterable table + order detail drawer/page
Customers        → list + per-customer order history
```

### Product creation (§15–16)
Minimal fields only: **Product Code, Price, Stock**, optional image. A **quick-entry grid** (spreadsheet-like rows) lets the client prep dozens of products before going live, saved in one batch call.

### Order detail view (§23)
Customer info, product code/price, shipping address, payment screenshot (via signed URL), payment status, order status, full `OrderStatusHistory` timeline.

### Manual stock adjustment (§22)
Quick buttons (+1 / +5 / +10) or custom quantity + reason, always logged as a `StockTransaction(type=MANUAL_ADJUSTMENT)`.

---

## 11. Security Requirements

- Admin auth: hashed passwords (bcrypt/argon2), server-side sessions or JWT with httpOnly cookies
- All `/api/admin/*` routes verify auth + role on the server for every request — never trust client state
- All stock-affecting endpoints run inside DB transactions (see §6) — **frontend-reported stock is never trusted**
- Server-side re-validation of product code + stock on every order submission, regardless of what the "check availability" step returned earlier
- File upload validation: restrict to image MIME types, enforce max file size, generate S3 keys server-side (never trust client-provided paths), use **pre-signed PUT URLs** scoped to a single object
- S3 bucket for payment screenshots is **private**; admin viewing uses short-lived signed GET URLs, not public bucket access
- Input validation/sanitization on all form fields (e.g., via zod schemas shared between client and server)
- Rate limiting on public endpoints (`/api/products/check`, `/api/orders`) to reduce abuse

---

## 12. Open Questions / Assumptions to Confirm With Client

1. **Product code scope:** Is a code like `SR101` unique only within one live session, or globally unique across all sessions forever? (Schema above assumes *per-session* uniqueness — reusable across different lives.)
2. **Duplicate orders:** If the same customer (same mobile number) tries to order the same product code twice in one session, should that be blocked, flagged, or allowed?
3. **Reservation window:** What should the default `reservationWindowMinutes` be — the spec suggests 15 as an example.
4. **Multiple pending orders per product:** If stock = 3 and 3 people order simultaneously, is it acceptable for all 3 to reserve successfully (down to 0), or should there be a cap on simultaneous pending reservations?
5. **Partial refund/short stock at verification time:** Not applicable given the reservation model, but confirm this understanding.
6. **Admin roles:** Is a single admin role sufficient for V1, or do you need distinct roles (e.g., owner vs. staff who can verify payments but not adjust stock)?

---

## 13. V1 Scope Summary

**In scope:** admin auth, live session management, quick product entry, product code availability check, guest order + shipping form, manual UPI payment + screenshot upload to S3, atomic stock reservation, real-time live dashboard, payment verify/reject, stock release, reservation expiry, stock transaction ledger, manual stock adjustment, order management with filters and timeline, basic customer list/history.

**Explicitly out of scope for V1:** product catalog/browsing, cart, wishlist, reviews/ratings, product variants/attributes, SEO fields, customer registration/login, payment gateway integration, automatic payment verification, Instagram/Facebook API integration, WhatsApp API integration, courier/shipping API integration, coupons/discounts/loyalty.

The schema and module boundaries above (separate `Payment` table, event-based real-time layer, `AppSettings` config) are intentionally structured so all of these can be added later **without restructuring the core `Order`/`LiveProduct`/`StockTransaction` model.**
