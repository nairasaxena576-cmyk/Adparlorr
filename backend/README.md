# Adparlorr Backend

Backend API for the Adparlorr **security-awareness training simulation**. It provides real persistence and server-side logic for the training scenario — accounts, the "task submission" flow, the simulated wallet/merge mechanic, referrals, and an admin panel — while keeping every money-shaped mechanic (deposits, withdrawals, the merge/lock trap) **strictly simulated**. Nothing here integrates with a real payment processor, bank, or blockchain network, and nothing should ever be made to.

Stack: Node.js + TypeScript, Express, PostgreSQL, Prisma, Zod, JWT-in-httpOnly-cookie auth, bcrypt password hashing.

## 1. Install

```bash
cd backend
npm install
```

`postinstall` runs `prisma generate` automatically.

## 2. Environment variables

```bash
cp .env.example .env
```

Then fill in `.env` (never commit it — it's gitignored):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string for the app database |
| `TEST_DATABASE_URL` | Separate database for the test suite (see [Testing](#6-testing)); defaults to `<db>_test` if unset |
| `JWT_SECRET` | Dedicated secret used **only** to sign/verify the auth JWT. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d` |
| `COOKIE_SECURE` / `COOKIE_SAME_SITE` / `COOKIE_DOMAIN` | Non-secret cookie behavior flags — see [Cookies note](#cookies-note) below |
| `CORS_ORIGIN` | The single allowed frontend origin |
| `RATE_LIMIT_*` | Global and auth-specific rate limiting |
| `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` | Read **once** by the seed script to bootstrap one admin account. Not used at request time; there is no hardcoded admin login anywhere in the code |
| `SIMULATION_*` | Merge threshold, simulated minimum withdrawal balance, simulated max deposit — training config only |

#### Cookies note
The auth cookie's value is itself a signed JWT (verified via `JWT_SECRET`), so there is deliberately **no separate `COOKIE_SECRET`** — signing a second envelope around an already-signed token would add a secret to manage without adding real security. `COOKIE_SECURE`/`COOKIE_SAME_SITE`/`COOKIE_DOMAIN` only control cookie transport behavior, not signing.

## 3. Database setup & migrations

Requires a running PostgreSQL instance reachable at `DATABASE_URL`.

```bash
npm run db:migrate    # applies migrations locally (creates the DB if it doesn't exist), regenerates the Prisma client
npm run db:seed       # seeds the 45 synthetic training products + one admin account (if ADMIN_EMAIL/ADMIN_INITIAL_PASSWORD are set)
```

In production, use the non-interactive equivalent instead of `migrate dev`:

```bash
npm run db:deploy     # prisma migrate deploy — applies committed migrations, no prompts
```

Other useful scripts: `npm run db:studio` (Prisma Studio), `npm run db:reset` (dev-only, drops and re-applies everything), `npm run db:generate` (regenerate the Prisma client without migrating).

## 4. Development

```bash
npm run dev            # tsx watch src/server.ts — starts on PORT (default 4000)
```

## 5. Build & production start

```bash
npm run build           # tsc -> dist/
npm run start            # node dist/server.js
```

## 6. Testing

The test suite (Vitest + Supertest) runs against a **real Postgres database** and truncates tables between tests — it deliberately refuses to start unless the resolved `DATABASE_URL` contains "test" in the database name, to guard against accidentally wiping a dev/prod database. Point `TEST_DATABASE_URL` at a disposable database (or let it default to `<your db name>_test`), then:

```bash
npm test
```

Coverage: registration/login/logout/session invalidation, role-based authorization, product listing, task submission (including the merge-threshold trigger and double-submit rejection), simulated deposit/withdrawal (including the CSRF guard and per-user data isolation), referral linking and activation, admin credit/reset with authorization enforcement, and request validation.

## 7. Authentication

- `POST /api/auth/register`, `POST /api/auth/login` issue an httpOnly, signed-by-JWT session cookie (`adp_session`) plus a readable CSRF cookie (`adp_csrf`).
- The JWT payload carries `{ sub: userId, role, sessionVersion }`. Every protected request re-checks the token's `sessionVersion` against the current value on the user row — a mismatch (caused by logout, or any future password-change flow) invalidates the token immediately, even before its natural expiry, without needing a server-side session table.
- `POST /api/auth/logout` increments `sessionVersion`, which invalidates **every** outstanding session for that user (all devices) — not just the calling client's cookie.
- Passwords are hashed with bcrypt (12 rounds). Password hashes are never included in any API response.
- Mutating requests (`POST`/`PATCH`/`DELETE`) require an `X-CSRF-Token` header matching the `adp_csrf` cookie (double-submit pattern), in addition to the session cookie.

## 8. Roles & permissions

Two roles: `ADMIN`, `USER`. There is no separate admin login endpoint or hardcoded credential anywhere — an admin logs in through the same `/api/auth/login` as anyone else; the returned role simply determines what they can access. Every `/api/admin/*` route is gated server-side by `requireAuth` + `requireRole('ADMIN')`; the frontend hiding admin UI from non-admins is cosmetic only and is not the enforcement boundary.

Admin accounts are provisioned only via the seed script reading `ADMIN_EMAIL`/`ADMIN_INITIAL_PASSWORD` from the environment.

## 9. API reference

All responses follow `{ "success": true, "data": ... }` or `{ "success": false, "message": "..." }`. Endpoints marked **simulation** additionally return a `meta: { simulation: true, disclaimer }` block.

### Auth
| Method | Route | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/register` | public | `{ fullName, email, password, referralCode? }` |
| POST | `/api/auth/login` | public | `{ email, password }` |
| POST | `/api/auth/logout` | required | — |
| GET | `/api/auth/me` | required | — |

### Products
| Method | Route | Auth |
|---|---|---|
| GET | `/api/products` | required |

### Orders (task submissions)
| Method | Route | Auth | Body |
|---|---|---|---|
| GET | `/api/orders` | required | — |
| POST | `/api/orders` | required | `{ productId }` |

### Training
| Method | Route | Auth | Body |
|---|---|---|---|
| POST | `/api/training/complete` | required | — |

Idempotent: sets `User.trainingCompletedAt` the first time it's called, does nothing on subsequent calls. This is the single source of truth the deposit-creation endpoint checks — there is no separate "training complete" flag anywhere else.

### Wallet — **simulation only**
| Method | Route | Auth | Body |
|---|---|---|---|
| GET | `/api/wallet/transactions` | required | — |
| GET | `/api/wallet/crypto-assets` | required | — |
| POST | `/api/wallet/deposit` | required | `{ assetCode, amount }` |
| POST | `/api/wallet/withdraw` | required | — |

`GET /api/wallet/crypto-assets` returns only assets that are both enabled and have a configured address — the customer-facing picker.

`POST /api/wallet/deposit` no longer auto-credits. It creates a `Deposit` row (status `PENDING`) plus a linked `Transaction` (status `PENDING`) and **enforces, server-side, in this order**: authenticated → `trainingCompletedAt` is set (else `403 Forbidden`, "Complete the required training before making a deposit.") → the requested `assetCode` is enabled → that asset has a configured address → amount is valid. Balance is only credited once an admin approves the deposit (see below) — creating a deposit never touches `balance`/`totalDeposits`.

`withdraw` is unchanged: checks the simulated minimum balance; below it, returns `{ blocked: true, message }`; at/above it, writes a `WITHDRAW` transaction with status `PENDING` and returns `{ blocked: false, status: 'pending_review' }` — balance is **never** deducted and no real transfer occurs.

### Referrals
| Method | Route | Auth |
|---|---|---|
| GET | `/api/referrals` | required |

### Admin (`ADMIN` role required)
| Method | Route | Body |
|---|---|---|
| GET | `/api/admin/users` | — |
| POST | `/api/admin/users/:userId/credit` | `{ amount }` (**simulation**) |
| POST | `/api/admin/users/:userId/reset` | — |
| GET | `/api/admin/support-settings` | — |
| PUT | `/api/admin/support-settings` | `{ telegramUsername, telegramEnabled }` |
| GET | `/api/admin/crypto-assets` | — |
| PUT | `/api/admin/crypto-assets/:code` | `{ address?, isEnabled }` (`code` is `USDT`\|`BTC`\|`ETH`) |
| GET | `/api/admin/deposits` | optional `?status=PENDING\|APPROVED\|REJECTED` query, omit for all |
| POST | `/api/admin/deposits/:id/approve` | — (**simulation**) |
| POST | `/api/admin/deposits/:id/reject` | — |

Enabling a crypto asset without ever having configured an address (either in this request or a prior one) is rejected with a validation error. Approving a deposit credits `balance`/`totalDeposits` and marks its linked `Transaction` `COMPLETED` (clearing `isMerged` if set, same as the old auto-credit flow); rejecting marks the `Transaction` `FAILED` and leaves balance untouched. Reviewing an already-reviewed deposit returns `409 Conflict`. The training-completion requirement applies only to customer deposit *creation* — none of these admin endpoints are gated by it.

### Support (Telegram contact)
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/support/telegram` | required (any role) | Read-only public config: `{ telegramEnabled, telegramUsername, telegramUrl }`. `telegramUrl` is `null` unless both enabled and a username are set. |

Only `ADMIN` can write this config (`PUT /api/admin/support-settings`). Usernames are accepted with or without a leading `@` and normalized before storage (`@MySupport` → `MySupport`); the generated URL is always `https://t.me/<username>`, never `https://t.me/@<username>`. Enabling Telegram support without a username is rejected with a validation error. This is an additional contact channel alongside the existing in-app Support chat — it does not replace it, and no bot token or secret is ever stored or exposed.

## 10. Security posture

Helmet security headers, CORS locked to a single configured origin with credentials, global + auth-specific rate limiting, Zod validation on every body/query/params input, httpOnly+CSRF cookie auth, bcrypt password hashing, centralized error handling that never leaks stack traces or raw database errors to the client in production, a 100kb JSON body limit, boot-time environment validation (the process refuses to start with invalid/missing config), and redacted logging (passwords and cookies are never logged).

## 11. Training-simulation guarantee

The merge/lock mechanic, the fake crypto deposit addresses, and the deposit/withdrawal flows all persist real data to Postgres but never connect to a real payment processor, bank, or blockchain network. This is intentional: the app is an authorized security-awareness training simulation, and the backend is designed to keep it that way even as "production-ready" infrastructure.
