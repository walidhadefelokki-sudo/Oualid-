# Dar L'Emploi Freelance — plan and progress

Written for the people building and reviewing this marketplace. It records
what is finished, what is next in dependency order, and the decisions still
waiting on the business.

The plan follows the PDF's own three phases. Nothing here is a guess about
what exists: every "done" line is code in the repository with the test or the
verification that proved it.

Last updated after client projects. Fourteen commits, none pushed.

---

## Where it runs

Mounted at `/freelance` on the same origin as the recruitment app, not yet on
`freelance.darlemploi.dz`. Same origin means the session is shared with no
handoff to build, which is the "connexion unique" the PDF asks for. Moving to
the subdomain changes the router's `basename` and one decision about the
token, and nothing else. **Deferred to the end by request.**

```
npm run dev   →  http://localhost:5000/freelance
npm test      →  40 tests
npm run lint  →  tsc --noEmit, baseline 10 pre-existing errors
```

---

## Phase 1 — MVP

### Done

| Area | What works | Proved by |
|---|---|---|
| **Database** | 49 models, 26 enums, additive migration | `prisma validate`, 0 `DROP` in the generated SQL |
| **Public pages** | Home, categories, service search, project feed, freelancer directory, all server-paginated | endpoints return real rows and honest empty states |
| **Arabic / French** | Real RTL on `<html>`, keys not inline conditions | FR / ع / EN switch, preference survives reload |
| **Sign-in** | Own screens at `/connexion` and `/inscription`, Google with its own callback | register, login, `/auth/me`, open-redirect attempts dropped |
| **Activation** | CV-prefilled freelance profile, reviewed before it is written | draft shows `source: cv`, second attempt 409s |
| **Credit ledger** | Append-only, serializable, idempotent, never negative | 14 tests incl. concurrent spends and replayed requests |
| **Plans** | Free / Pro / Premium limits computed and enforced server-side | 14 tests incl. quota rollover and expiry |
| **Dashboard** | Six sections, all real reads; plan card with usage meters | every tier verified through the endpoint |
| **Service editor** | Three formulas, draft, submit, pause, resume, delete | full loop verified: draft → charge → approve → public |
| **Client projects** | Publish free, moderated, public feed, invite-only stays private | refusal, fix, approval, and no client e-mail in the payload |
| **Moderation** | Admin queue with age, approve, refuse with a reason and refund, decision history | refusal refunded 10 and the resubmission charged again |
| **Message attachments** | Images and PDFs in a thread, up to 5 a message; private bucket, signed on read | 6 tests, plus a real send and read: disguised file refused, non-participant refused, signed link served, unsigned path refused |
| **Custom offers** | A freelancer quotes a price in a thread, the client accepts, an order exists on those terms; one live offer at a time, expiry computed on read | 19 tests incl. a second accept refused, each side barred from the other's action, and an expired quote refused |
| **Service media** | Up to 8 pictures a service, the first one the cover every card already read; signature-checked, reorderable, deletable | 11 tests, plus a real upload, reorder, disguised-file refusal and delete against Supabase |
| **Messaging** | Threads from a profile, a paid proposal or an order; per-thread and total unread; polling with `after`; contact-detail flagging with its own moderation queue | 23 tests incl. a third account refused, find-or-create from both sides, and the database-clock skew that would freeze an unread badge |

### Not done

Phase 1 is finished.

What remains is Phase 2 and the decisions below — nothing in the MVP's own
scope is outstanding.

### Known gaps in what is done

- **Portfolio extras.** The PDF export, the QR code and the custom subdomain
  the specification describes are not built.
- **Contact flagging is a guess, deliberately.** It never blocks and never
  bans, because a tradesman quoting their own landline and someone dodging the
  fees produce the same match. The queue in Modération freelance → Messages
  signalés is where the difference gets decided; the sanction is suspending
  the account from Comptes.

---

## Phase 2 — Growth

Subscription purchase and renewal; boosts; seller levels computed from real
completed work; statistics; identity verification; SMS and push; the
mini-portfolio builder and its plan limits; SEO landing pages per category
and wilaya.

The data model for all of this exists. None of the behaviour does.

---

## Phase 3 — Scale

Android app; agency accounts with shared credits; optional escrow and
commission. `FreelancePlanTier.AGENCY` is named so the plan table needs no
migration when it arrives. Escrow is still an open question in the PDF and is
deliberately not designed for.

---

## Decisions waiting on the business

The PDF is explicit that its prices are opening proposals to test, not market
data, so all of them are rows in `CreditPack`, `FreelancePlan` and
`PlatformSetting` rather than constants.

| Question | Current default | Where it lives |
|---|---|---|
| Do unused credits expire? | they do not | not implemented |
| Refund when moderation refuses | automatic, full | `refundFor`, tested |
| VAT on invoices | none | invoice generator |
| Portfolio shows phone and e-mail? | hidden | not implemented |
| Card gateway | Chargily | already live on the jobs side |
| Subscriber holding credits | quota first, then credits | `resolveProposalCharge` |

The last one is an interpretation. The PDF prices a monthly quota *and* a
per-proposal credit cost without saying which applies to a subscriber who has
both; charging the quota first is the reading that does not make a
subscription worthless to someone who bought a pack.

---

## Two things that need a decision before launch

**Test coverage is uneven.** The money path is covered — the ledger, the plan
limits, the publication charge — and so now are proposals, orders, reviews,
payments, portfolios and messaging, at 157 tests. What has no tests is the
frontend: every page has been driven by hand against a real server, and that
is not the same thing.

**The migration has never run against production.** It is additive — 49
`CREATE TABLE`, no `DROP`, three nullable columns on existing tables — and
must be applied through the session pooler on port 5432, because the
transaction pooler on 6543 answers `P1017` for DDL.
