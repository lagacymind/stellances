# Stellance — API Reference

Base URL: `http://localhost:3001/api` (development)  
Interactive docs (Swagger): `http://localhost:3001/docs`

## Table of Contents

- [Authentication](#authentication)
- [Auth Endpoints](#auth-endpoints)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/refresh](#post-authrefresh)
  - [POST /auth/logout](#post-authlogout)
  - [POST /auth/logout-all](#post-authlogout-all)
- [User Endpoints](#user-endpoints)
  - [GET /users/me](#get-usersme)
  - [PATCH /users/me](#patch-usersme)
- [Jobs Endpoints](#jobs-endpoints)
  - [GET /jobs](#get-jobs)
  - [POST /jobs](#post-jobs)
  - [GET /jobs/:id](#get-jobsid)
  - [PATCH /jobs/:id](#patch-jobsid)
  - [POST /jobs/:id/cancel](#post-jobsidcancel)
- [Contracts Endpoints](#contracts-endpoints)
  - [POST /contracts](#post-contracts)
  - [POST /contracts/:id/confirm-fund](#post-contractsidconfirm-fund)
  - [GET /contracts](#get-contracts)
  - [GET /contracts/:id](#get-contractsid)
  - [POST /contracts/:id/dispute](#post-contractsiddispute)
  - [POST /contracts/:id/cancel](#post-contractsidcancel)
  - [PATCH /contracts/admin/:id/resolve](#patch-contractsadminidresolve)
- [Milestones Endpoints](#milestones-endpoints)
  - [PATCH /contracts/:id/milestones/:mid/submit](#patch-contractsidmilestonesmidsubmit)
  - [PATCH /contracts/:id/milestones/:mid/approve](#patch-contractsidmilestonesmidapprove)
- [Payments Endpoints](#payments-endpoints)
- [Error Format](#error-format)
- [Status Codes](#status-codes)

---

## Authentication

Stellance uses a dual-token scheme:

| Token | Transport | TTL | Notes |
|-------|-----------|-----|-------|
| Access token (JWT) | `Authorization: Bearer <token>` header | 15 minutes | Returned in response body |
| Refresh token (opaque) | `refresh_token` httpOnly cookie | 30 days (configurable) | Rotated on every use |

**Protecting requests:** include the access token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

When the access token expires, call `POST /auth/refresh` — the refresh token is sent automatically via cookie.

---

## Auth Endpoints

### POST /auth/register

Create a new user account. Returns an access token and sets the `refresh_token` cookie.

**Auth required:** No

**Request body:**

```json
{
  "email": "alice@example.com",
  "name": "Alice Smith",
  "password": "minimum8chars",
  "role": "CLIENT"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | ✅ | Must be a valid email address |
| `name` | string | ✅ | Display name |
| `password` | string | ✅ | Minimum 8 characters |
| `role` | `"CLIENT"` \| `"FREELANCER"` | ✅ | Determines permissions throughout the app |

**Response `201 Created`:**

```json
{
  "message": "Registered successfully",
  "access_token": "eyJhbGci...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "name": "Alice Smith",
    "role": "CLIENT",
    "stellarPublicKey": null,
    "tokenVersion": 0,
    "createdAt": "2026-07-01T12:00:00.000Z",
    "updatedAt": "2026-07-01T12:00:00.000Z"
  }
}
```

Sets cookie: `refresh_token` (httpOnly, sameSite=strict, path=/api/auth)

**Errors:**

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `BAD_REQUEST` | Validation failed (missing field, invalid email, short password) |
| 409 | `CONFLICT` | Email already registered |

---

### POST /auth/login

Authenticate with email and password. Returns an access token and sets the `refresh_token` cookie.

**Auth required:** No

**Request body:**

```json
{
  "email": "alice@example.com",
  "password": "minimum8chars"
}
```

**Response `200 OK`:**

```json
{
  "message": "Logged in successfully",
  "access_token": "eyJhbGci...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "name": "Alice Smith",
    "role": "CLIENT",
    "stellarPublicKey": null
  }
}
```

Sets cookie: `refresh_token`

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Missing email or password |
| 401 | Wrong credentials |

---

### POST /auth/refresh

Exchange a valid refresh token for a new access token. The old refresh token is revoked and a new one is set via cookie (rotation).

**Auth required:** No (uses `refresh_token` cookie)

**Request body:** none

**Response `200 OK`:**

```json
{
  "access_token": "eyJhbGci..."
}
```

Sets cookie: new `refresh_token` (old one is revoked)

**Errors:**

| Status | Meaning |
|--------|---------|
| 401 | Missing, expired, or invalid refresh token |
| 403 | Refresh token reuse detected — all sessions revoked (possible theft) |

---

### POST /auth/logout

Revoke the current refresh token and clear both cookies.

**Auth required:** No (uses `refresh_token` cookie)

**Request body:** none

**Response `200 OK`:**

```json
{
  "message": "Logged out successfully"
}
```

Clears cookies: `access_token`, `refresh_token`

---

### POST /auth/logout-all

Revoke all active sessions for the authenticated user. Increments the user's `tokenVersion`, which invalidates all existing refresh tokens and access tokens simultaneously.

**Auth required:** Yes (access token)

**Request body:** none

**Response `200 OK`:**

```json
{
  "message": "Logged out everywhere"
}
```

Use this endpoint when a user suspects their credentials have been compromised.

---

## User Endpoints

### GET /users/me

Return the authenticated user's profile.

**Auth required:** Yes

**Response `200 OK`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "alice@example.com",
  "name": "Alice Smith",
  "role": "CLIENT",
  "stellarPublicKey": "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
  "tokenVersion": 0,
  "createdAt": "2026-07-01T12:00:00.000Z",
  "updatedAt": "2026-07-01T12:00:00.000Z"
}
```

The `password` field is never returned. `stellarPublicKey` is `null` until the user connects a wallet.

**Errors:**

| Status | Meaning |
|--------|---------|
| 401 | Missing or expired access token |

---

### PATCH /users/me

Update the authenticated user's profile. All fields are optional; only the provided fields are updated.

**Auth required:** Yes

**Request body:**

```json
{
  "name": "Alice Smith",
  "stellarPublicKey": "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Display name |
| `stellarPublicKey` | string | Must be a valid Stellar public key (starts with `G`, 56 chars). Each key can only be linked to one account. |

**Response `200 OK`:** Updated user object (same shape as `GET /users/me`).

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid Stellar public key format |
| 401 | Missing or expired access token |
| 409 | Stellar public key already linked to another account |

---

## Jobs Endpoints

### GET /jobs

List jobs. Supports filtering by status and clientId.

**Auth required:** No (public for OPEN jobs)

**Query params:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `status` | `OPEN\|IN_PROGRESS\|COMPLETED\|CANCELLED` | — | Filter by status |
| `clientId` | UUID | — | Filter by client |

**Response `200 OK`:** Array of `Job` objects, each including `client` (id, name, stellarPublicKey) and a `contract` summary (id, status) if one exists.

---

### POST /jobs

Post a new job.

**Auth required:** Yes — `role = CLIENT`

**Request body:**

```json
{
  "title": "Build a Stellar payment integration",
  "description": "We need a NestJS service that submits XLM payments via Horizon.",
  "budget": 500.0,
  "category": "Blockchain"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | ✅ | Max 200 characters |
| `description` | string | ✅ | — |
| `budget` | number | ✅ | Positive, max 7 decimal places |
| `category` | string | ✅ | Max 100 characters |

**Response `201 Created`:** The created `Job` object with `status: "OPEN"`.

---

### GET /jobs/:id

Get a single job by ID.

**Auth required:** No

**Response `200 OK`:** `Job` with nested `client` and `contract` (if one exists).

**Errors:**

| Status | Meaning |
|--------|---------|
| 404 | Job not found |

---

### PATCH /jobs/:id

Update a job's fields. Only the job owner (client) or an admin can update. The job must be in `OPEN` status.

**Auth required:** Yes

**Request body:** Same shape as `POST /jobs`, all fields optional.

**Response `200 OK`:** Updated `Job` object.

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Job is not OPEN |
| 403 | Caller does not own the job |
| 404 | Job not found |

---

### POST /jobs/:id/cancel

Cancel an open job. Only the job owner (client) or an admin can cancel. Cannot cancel if a contract is already active.

**Auth required:** Yes

**Request body:** none

**Response `200 OK`:** Updated `Job` object with `status: "CANCELLED"`.

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Job is already completed/cancelled, or has an active contract |
| 403 | Caller does not own the job |
| 404 | Job not found |

---

## Contracts Endpoints

### POST /contracts

Create a contract (client hires a freelancer for a job). Also returns the unsigned Soroban `fund()` XDR for the client to sign via Freighter.

**Auth required:** Yes — `role = CLIENT`, must own the job

**Request body:**

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "freelancerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "milestones": [
    { "title": "Initial design", "amount": 150.0 },
    { "title": "Implementation", "amount": 300.0 },
    { "title": "Testing and handoff", "amount": 50.0 }
  ]
}
```

**Response `201 Created`:**

```json
{
  "contract": {
    "id": "...",
    "jobId": "...",
    "freelancerId": "...",
    "clientId": "...",
    "status": "ACTIVE",
    "escrowTxHash": null,
    "milestones": [
      { "id": "...", "title": "Initial design", "amount": "150.0000000", "status": "PENDING" }
    ]
  },
  "fundXdr": "AAAAAgAAAA..."
}
```

`fundXdr` is an unsigned Soroban invocation transaction. Pass it to Freighter for signing, submit to Horizon, then call `POST /contracts/:id/confirm-fund` with the resulting hash. If the Soroban RPC is not available, `fundXdr` may be `null` — the frontend can retry the XDR generation later.

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Job is not OPEN |
| 403 | Caller does not own the job |
| 404 | Job or freelancer not found |
| 409 | Job already has a contract |

---

### POST /contracts/:id/confirm-fund

Confirm that the escrow funding transaction was submitted on-chain. The backend verifies the tx hash exists on Horizon before recording it.

**Auth required:** Yes — must be the client on this contract

**Request body:**

```json
{
  "txHash": "a1b2c3d4e5f6..."
}
```

**Response `200 OK`:**

```json
{
  "id": "...",
  "status": "ACTIVE",
  "escrowTxHash": "a1b2c3d4e5f6...",
  "milestones": [...]
}
```

**Errors:**

| Status | Meaning |
|--------|---------|
| 403 | Caller is not the client |
| 404 | Contract not found |
| 409 | Escrow already confirmed |
| 503 | Horizon unavailable (tx hash could not be verified) |

---

### GET /contracts

List the authenticated user's contracts (as client or freelancer). Admins can see all contracts.

**Auth required:** Yes

**Query params:**

| Param | Type | Notes |
|-------|------|-------|
| `filter` | `"client"` \| `"freelancer"` | Filter by your role. Defaults to client view. |

**Response `200 OK`:** Array of `Contract` objects with nested `milestones`, `job` summary, and user summaries.

---

### GET /contracts/:id

Get full contract detail.

**Auth required:** Yes — must be client, freelancer, or admin

**Response `200 OK`:** `Contract` with nested `milestones`, `payments`, and user summaries.

**Errors:**

| Status | Meaning |
|--------|---------|
| 403 | Caller is not a party to this contract |
| 404 | Contract not found |

---

### POST /contracts/:id/dispute

Raise a dispute on an active contract. If the escrow is funded, the on-chain escrow is frozen before the database is updated (trustless: the freeze happens regardless of whether the backend DB write succeeds).

**Auth required:** Yes — must be client or freelancer on this contract

**Request body:**

```json
{
  "reason": "Deliverable does not match the agreed specification."
}
```

**Response `200 OK`:**

```json
{
  "id": "...",
  "status": "DISPUTED"
}
```

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Contract is not ACTIVE |
| 403 | Caller is not a party to this contract |
| 404 | Contract not found |
| 503 | Soroban RPC unavailable (on-chain freeze failed; DB unchanged) |

---

### POST /contracts/:id/cancel

Cancel a contract. If the escrow is funded, an admin must perform the cancellation (to trigger a Soroban `refund()` call). Clients can cancel unfunded contracts themselves.

**Auth required:** Yes — client (unfunded only) or admin

**Request body:** none

**Response `200 OK`:**

```json
{
  "cancelled": true,
  "txHash": "a1b2c3d4..."
}
```

`txHash` is `undefined` for unfunded cancellations.

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Contract is already COMPLETED or CANCELLED |
| 403 | Non-admin attempting to cancel a funded escrow |
| 404 | Contract not found |

---

### PATCH /contracts/admin/:id/resolve

Resolve a disputed contract. Admin only. Calls Soroban `resolve_dispute()` with the given decision.

**Auth required:** Yes — `role = ADMIN`

**Request body:**

```json
{
  "decision": "split",
  "freelancerBps": 6000
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `decision` | `"release"` \| `"refund"` \| `"split"` | ✅ | `release` → 100% to freelancer; `refund` → 100% to client; `split` → divide by `freelancerBps` |
| `freelancerBps` | integer | For `split` | Basis points (0–10 000) of the remaining balance going to the freelancer |

**Response `200 OK`:**

```json
{
  "resolved": true,
  "txHash": "a1b2c3d4...",
  "status": "COMPLETED"
}
```

`status` is `"COMPLETED"` for `release`/`split`, `"CANCELLED"` for `refund`.

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Contract is not DISPUTED, or unknown decision value |
| 403 | Caller is not an admin |
| 404 | Contract not found |
| 503 | Soroban RPC unavailable |

---

## Milestones Endpoints

### PATCH /contracts/:id/milestones/:mid/submit

Freelancer submits a milestone for client review. Milestone must be in `PENDING` status.

**Auth required:** Yes — `role = FREELANCER`, must be the freelancer on this contract

**Request body:** none

**Response `200 OK`:**

```json
{
  "id": "...",
  "status": "IN_REVIEW"
}
```

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Milestone is not PENDING, or contract is not ACTIVE |
| 403 | Caller is not the freelancer |
| 404 | Milestone not found |

---

### PATCH /contracts/:id/milestones/:mid/approve

Client approves a milestone. Calls Soroban `release_milestone()` on-chain **before** writing to the database, so the milestone stays `IN_REVIEW` if the Soroban call fails (no stuck state). On success, creates a `Payment` record and auto-completes the contract if all milestones are now `PAID`.

**Auth required:** Yes — `role = CLIENT`, must be the client on this contract

**Request body:** none

**Response `200 OK`:**

```json
{
  "id": "...",
  "status": "PAID",
  "payment": {
    "id": "...",
    "amount": "150.0000000",
    "stellarTxHash": "a1b2c3d4...",
    "createdAt": "2026-07-01T14:30:00.000Z"
  }
}
```

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Milestone is not IN_REVIEW, or contract is not ACTIVE |
| 403 | Caller is not the client |
| 404 | Milestone not found |
| 503 | Soroban RPC unavailable (milestone stays IN_REVIEW, safe to retry) |

---

## Payments Endpoints

> The `/payments` backend module is in active development. The frontend currently uses mock data defined in `stellance/frontend/lib/api/payments.ts`. Once the backend ships, those stubs will be replaced with real API calls without any other frontend changes required.

### GET /payments/balances

Fetch Stellar wallet balances for the authenticated user's connected wallet.

**Auth required:** Yes

**Response `200 OK`:** Array of `WalletBalance` objects (asset, balance, network).

---

### GET /payments/transactions

Fetch the full transaction history for the authenticated user.

**Auth required:** Yes

**Response `200 OK`:** Array of `Transaction` objects including Stellar tx hashes for on-chain verification.

---

### POST /payments/withdraw

Initiate a withdrawal from the connected Stellar wallet to an external address.

**Auth required:** Yes

**Request body:**

```json
{
  "asset": "USDC",
  "amount": "500.00",
  "destinationAddress": "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP"
}
```

**Response `201 Created`:** The new `Transaction` record with `status: "PENDING"`.

---

## Error Format

All errors use NestJS's standard exception format:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

Validation errors return `message` as an array of strings. Other errors return a single string:

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request — validation error or malformed body |
| 401 | Unauthorized — missing or invalid access token |
| 403 | Forbidden — authenticated but not authorized for this action |
| 404 | Not Found — resource does not exist |
| 409 | Conflict — e.g. duplicate email, already-funded contract |
| 500 | Internal Server Error |
| 503 | Service Unavailable — Soroban RPC or Horizon call failed |
