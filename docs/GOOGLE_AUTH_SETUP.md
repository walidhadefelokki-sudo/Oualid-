# Google Authentication — Setup Guide

Dar L'emploi supports two ways to sign in. Both end in the **same** application
session, so nothing downstream needs to know which was used.

```
Email + password ──┐
                   ├──► User ──► application JWT ──► protected routes
Google OAuth ──────┘
```

---

## 1. Architecture

```
Browser                     Our server                        Google
   │
   │  click "Continuer avec Google"
   ├──────────────────────────►
   │                     GET /api/auth/google
   │                     • signs a 10-min state token (nonce + chosen role)
   │                     • sets dl_oauth_state cookie (HttpOnly)
   │                                    ├──────────────────────────►
   │  ◄───────────────────────────────────────  consent screen  ───┤
   │  user approves
   │                                    ◄──────────────────────────┤
   │                     GET /api/auth/google/callback?code&state
   │                     • verifies state signature + cookie nonce   ← CSRF gate
   │                     • passport exchanges code with Google
   │                     • resolves identity → User (link or create)
   │                     • issues the application JWT
   │                     • sets dl_oauth_handoff cookie (HttpOnly, 60s)
   │  ◄──────────────────  302 → /auth/callback   (no token in the URL)
   │
   │  POST /api/auth/google/session
   ├──────────────────────────►  reads + clears the handoff cookie
   │  ◄──────────────────────────  { token, user }
   │
   │  stores token in localStorage — exactly as password login does
```

### Why the handoff cookie

The obvious approach — redirecting to `/auth/callback?token=<JWT>` — leaks a
30-day credential into browser history, server access logs and any `Referer`
header. Instead the JWT travels in a **60-second HttpOnly cookie** that the
frontend trades once for the token. `SameSite=Lax` keeps that cookie off
cross-site POSTs, and it is cleared on use so it cannot be replayed.

### Why passport, and why no sessions

Passport performs only the OAuth handshake. There is no `express-session`, no
`serializeUser`, no `passport.session()` — the application keeps its own
stateless JWT. Passport's job ends the moment it produces a verified Google
profile.

---

## 2. Prerequisites

- A Google account
- The app running locally (`npm run dev`, default port **5000**)
- Database migrations applied (`npx prisma migrate deploy`)

---

## 3. Create the Google Cloud project

1. Open <https://console.cloud.google.com/>
2. Project selector → **New project**
3. Name it (e.g. `Dar L'emploi`) → **Create**

> This is Google **Cloud** Console, not Firebase Console. Google OAuth here is
> independent of Firebase, and needs no billing account.

---

## 4. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen**

| Field | Value |
|---|---|
| User type | **External** |
| App name | `Dar L'emploi` |
| User support email | your address |
| App logo | optional |
| Application home page | `https://www.darlemploi.dz` |
| Developer contact | your address |

**Scopes** — add only these two. The app never reads Drive, Gmail, Contacts or
Calendar:

- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`

While the app is in **Testing**, only accounts listed under **Test users** can
sign in. Add your own address, or **Publish app** once you are ready.

---

## 5. Create the OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID**

- **Application type:** Web application
- **Name:** `Dar L'emploi Web`

**Authorized JavaScript origins**

```
http://localhost:5000
https://www.darlemploi.dz
```

**Authorized redirect URIs**

```
http://localhost:5000/api/auth/google/callback
https://www.darlemploi.dz/api/auth/google/callback
```

These must match `GOOGLE_CALLBACK_URL` **character for character** — scheme,
host, port and path. `http` vs `https`, or a trailing slash, will fail.

Copy the **Client ID** and **Client secret**.

---

## 6. Environment variables

Add to `.env` (already git-ignored — never commit real values):

```env
GOOGLE_CLIENT_ID="1234567890-abcdef.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"
FRONTEND_URL="http://localhost:5000"
```

`JWT_SECRET` must also be set — it signs both the OAuth state token and the
session JWT.

**Production** (Vercel → Settings → Environment Variables):

```env
GOOGLE_CALLBACK_URL="https://www.darlemploi.dz/api/auth/google/callback"
FRONTEND_URL="https://www.darlemploi.dz"
```

Development and production are **different redirect URIs**. Both must be listed
in Google Cloud; adding one does not cover the other.

If these variables are unset, Google sign-in is disabled and reports why.
Email + password login is unaffected.

---

## 7. Database

```bash
npx prisma migrate deploy
npx prisma generate
```

Migration `20260903100000_add_google_oauth_accounts` does two things:

**`Account` table** — one row per external identity, linked to a `User`:

| Column | Purpose |
|---|---|
| `provider` | `"google"` |
| `providerAccountId` | Google's immutable `sub` — **not** the email, which can be reassigned |
| `providerEmail` | recorded for auditing only; never used to authenticate |

`@@unique([provider, providerAccountId])` is the database-level guarantee that
one Google identity cannot map to two users, even under a race.

**`User.password` becomes nullable.** A Google-only account has no local
password. Storing a random hash would create a password-shaped value that is
never a credential; `NULL` states the fact plainly, and `login` checks for it
and directs the user to Google instead.

---

## 8. Verify

```bash
curl http://localhost:5000/api/auth/google/status
```

```json
{ "data": { "googleSignInReady": true, "reason": null } }
```

When false, `reason` names the missing variables.

---

## 9. Account linking

The callback resolves an identity in this order:

1. **`Account` already linked** → sign that user in.
2. **A `User` exists with the same email** → link Google to it.
3. **Neither** → create `User` + `Account` in one transaction.

Checking the linked account *before* the email is what stops one person
becoming two users. Step 2 additionally requires Google to report the address
as **verified** — linking on an unverified email would let someone claim an
existing account by registering that address with Google.

| Scenario | Result |
|---|---|
| Password user, then Google, same email | linked — one user, one account |
| Google user, then tries to register with that email | refused, told to use Google |
| Returning Google user | same user, no new records |
| Different Google email | new user |

---

## 10. Roles

The role the visitor chooses (`candidate` / `employer`) travels inside the
**signed** state token, so it cannot be tampered with in transit and is never
taken from Google. A Google recruiter gets a `RecruiterProfile` and a `Company`,
exactly as the registration form creates.

---

## 11. Troubleshooting

### `redirect_uri_mismatch`

`GOOGLE_CALLBACK_URL` does not exactly match an Authorized redirect URI. Compare
scheme, host, **port**, path and trailing slash. Changes can take a few minutes
to propagate.

### `invalid_client`

Wrong `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`, or the credential was
deleted. Re-copy both from Credentials.

### `access_blocked` / "app is being tested"

The consent screen is in **Testing** and the account is not a listed test user.
Add it, or publish the app.

### Redirected back with `?error=invalid_state`

The state cookie was missing or did not match. Usually a stale tab, a login
started more than 10 minutes earlier, or cookies blocked. Start again.

Also check `SameSite`: the cookie is `Lax`, which is required — `Strict` would
be dropped on the cross-site return from Google, breaking every login.

### Redirected back with `?error=email_in_use`

An account already exists with that email and Google did not report the address
as verified. Sign in with the password instead.

### `Secure` cookie problems in production

Cookies are marked `Secure` when `NODE_ENV=production`, so production must be
served over HTTPS. On `localhost` they are not marked `Secure`, which is why
plain HTTP works in development.

### CORS

Frontend and API are served from the same origin, so this flow needs no CORS
configuration. If you split them later, set `CORS_ORIGIN` to the frontend
origin and keep `credentials: true` — a wildcard `*` is not permitted with
credentials.

---

## 12. Security notes

- The client secret lives only on the server; it is never sent to the browser.
- Google's access and refresh tokens are deliberately **discarded** — the app
  never calls Google APIs on the user's behalf, so storing them would mean
  holding a credential with no purpose.
- Identity comes from the verified OAuth response, never from client input.
- The state token is signed and bound to a browser cookie (CSRF).
- Redirects go only to `FRONTEND_URL`; user-supplied redirect targets are
  never honoured (no open redirect).
- The session JWT never appears in a URL.
- Errors return a short code; stack traces, database errors and tokens are
  never exposed to the browser.
- Logs record outcomes (`created`, `linked_existing`, `returning`) and never
  secrets or tokens.
