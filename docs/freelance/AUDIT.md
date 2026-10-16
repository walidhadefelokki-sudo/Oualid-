# Dar L'Emploi Freelance — audit and foundation

Written for the engineers building the freelance marketplace. It records what
the existing platform actually is, what the marketplace can reuse, and the
decisions that the codebase forces.

Status: **Phase 1A, database foundation only.** No marketplace feature is
implemented yet. The migration in `prisma/migrations/pending_freelance/` has
**not** been applied.

---

## 1. Current architecture

| | |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind v4 |
| Backend | Express 4 (TypeScript), bundled by esbuild |
| Database | PostgreSQL on Supabase (`ursafnlrlgrylvjmfnzi`) via Prisma 6 |
| Hosting | Vercel — SPA from `dist/`, API as one serverless function |
| Auth | JWT, `Authorization: Bearer`, token in `localStorage` |
| Storage | Supabase Storage (private, signed URLs); Cloudinary is legacy |
| Payments | Chargily Pay v2 (live), HMAC-signed webhook |
| Mail | SMTP at `quantum.octenium.net`, Resend as fallback |
| Tests | **None.** `npm run lint` is `tsc --noEmit` |

### Two constraints that shape everything

**There is no router.** `react-router-dom` is in `package.json` but no file
imports it. Navigation is a `view` string in `App.tsx` and an `activeTab`
string in `Dashboard.tsx`, with History API calls bolted on for `/dashboard`
and `/jobs/:id`. The marketplace needs real nested routes, so Phase 1A
introduces the router **for the freelance tree only**. The recruitment app
keeps its state-based navigation; converting it is a separate job with its
own risk.

**Two files carry most of the UI.** `App.tsx` is ~3,700 lines and
`Dashboard.tsx` ~8,500, both containing large commented-out duplicates of
live blocks. Anchor edits by line range after asserting content; a literal
string anchor will silently match the dead copy.

---

## 2. What the marketplace reuses

| Existing | Reused as |
|---|---|
| `User`, `Account`, JWT, Google OAuth | The only identity. No second login. |
| `Company`, `CompanyMember` | An employer hires freelancers from the same business account |
| `JobCategory` | Marketplace categories — now with `parentId` for subcategories |
| `Skill` | Marketplace skills, via three join tables |
| `FileAsset` | Every upload: service media, attachments, deliveries, receipts, portfolio |
| `PlatformSetting` (key/JSON) | Admin-editable configuration |
| `Notification` | In-app notifications (`NotificationType` needs new members) |
| `AuditLog` | Administrative and financial audit trail |
| Supabase Storage helpers | Private files and signed URLs |
| Chargily service | Online payment for credit packs and plans |
| Invoice PDF generation | Marketplace invoices |

### What could not be reused

- **`Payment`** hangs off `Subscription` and stores `amount Float`. Marketplace
  money is `Decimal(12,2)` in `MarketplacePayment`. Floats cannot hold
  2500.10 exactly and these amounts are invoiced.
- **`Subscription`** is company-scoped and carries `RecruiterPlan`. A freelance
  plan belongs to a person and has different quotas. Overloading one model
  would mean a nullable company and two meanings per row.

---

## 3. Cross-subdomain authentication

The brief asks for `freelance.darlemploi.dz`. The token lives in
`localStorage`, which is scoped per origin, so a subdomain does **not** inherit
the session. Three options:

1. **Path-based** (`www.darlemploi.dz/freelance`) — same origin, zero auth
   work, loses the subdomain address.
2. **Move to cookies** on `.darlemploi.dz` — true SSO, but rewrites auth
   everywhere and risks the live recruitment platform.
3. **Subdomain + one-time handoff code** — the subdomain asks the API for a
   short-lived single-use code, exchanges it for a token. No change to how
   existing auth works.

**Recommended: 3**, with 1 as the fallback if the subdomain is not required
at launch. It delivers the requested URL without touching the working
authentication of a platform with live users. Option 2 is the cleanest end
state and belongs in a later, separately tested phase.

Not yet implemented — this is a decision to confirm before Phase 1A routing.

---

## 4. Database foundation (implemented)

42 models and 21 enums appended to `prisma/schema.prisma`, taking it from 37
to 79 models. `prisma validate` passes and the client generates.

Groups: freelancer profile and verification; services with packages, add-ons,
FAQs, requirements and media; client projects, invites and proposals; orders
with milestones, deliveries and an append-only event trail; conversations and
messages; credit wallet and ledger; plans, subscriptions and boosts;
marketplace payments, receipts and invoices; portfolios with sections and
projects; moderation records, reports and disputes.

### Decisions worth knowing

- **Money is `Decimal(12,2)`**, never `Float`.
- **Credits are an append-only ledger.** `CreditWallet.balance` is a cache
  updated in the same transaction as the entry that moved it; the ledger is
  the truth. `CreditLedgerEntry.idempotencyKey` is unique, so a retried
  request collides instead of spending twice.
- **`Proposal` has `@@unique([projectId, freelancerId])`.** A double-submit is
  stopped by the database, not by a check that a retry can race.
- **`ServicePackage` has `@@unique([serviceId, tier])`.** "Standard" is
  unambiguous.
- **`FreelanceReview` has `@@unique([orderId, authorId])`.** One review per
  person per order.
- **`MarketplacePayment.providerCheckoutId` is unique.** A replayed webhook
  cannot grant credits twice.
- **Trial is `FreelancerProfile.trialClaimedAt`**, not inferred from the
  ledger, so deleting and recreating a profile does not earn another.
- **Identity documents live in their own table**, so they never join a public
  query by accident.
- **Add-on name and price are copied onto the order.** Repricing an add-on
  later must not restate a past order's total.

### Applying it

```
npx prisma migrate diff \
  --from-url "$DATABASE_URL_SESSION" \
  --to-schema-datamodel prisma/schema.prisma --script
```

The generated SQL is in `prisma/migrations/pending_freelance/migration.sql`:
42 `CREATE TABLE`, 21 `CREATE TYPE`, and exactly one change to an existing
table — `JobCategory ADD COLUMN "parentId" TEXT` (nullable). **Zero** `DROP`
statements. It is additive and does not touch existing rows.

Use the **session pooler on port 5432**. The transaction pooler on 6543
answers `P1017` for DDL and introspection.

---

## 5. Not done

Everything above the database line: routes, API, UI, credits logic, payments,
moderation, portfolios, admin. See the brief's Phase 1B–1F.

Two items need a decision before they can be built honestly:

- **No test framework exists.** The brief mandates extensive tests across
  credits, payments and authorization. Vitest + Supertest needs adding, and
  that is a prerequisite for the credit and payment work rather than a
  follow-up to it.
- **The PDF specification and both structure diagrams were not supplied.**
  The brief's own text is detailed enough to build from, but where it defers
  to the PDF, that detail is absent.
