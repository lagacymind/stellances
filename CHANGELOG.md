# Changelog

All notable changes to Stellance are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- `docker-compose.yml` — PostgreSQL 16 service for local development (resolves references in multiple docs that pointed to a missing file)
- `stellance/frontend/.env.local.example` — environment template; contributors now run `cp .env.local.example .env.local` instead of creating the file manually
- `PATCH /users/me` implemented in `users.controller.ts` and `users.service.ts` — saves Stellar public key and display name; validated with `@Matches(/^G[A-Z2-7]{55}$/)` to reject malformed keys
- Freighter wallet setup guide added to `docs/local-development.md` (step 6)
- `@ApiProperty` / `@ApiPropertyOptional` decorators added to `RegisterDto` and `LoginDto` — Swagger UI at `/docs` now renders fully populated request body schemas with examples
- `src/users/users.controller.spec.ts` — unit test suite for `GET /users/me` and `PATCH /users/me` covering: happy path, missing `req.user`, user not found in DB, password-omission guarantee, `ConflictException` propagation for duplicate Stellar keys
- **Jobs module** (`src/jobs/`) — full CRUD: `GET /jobs`, `GET /jobs/:id`, `POST /jobs`, `PATCH /jobs/:id`, `POST /jobs/:id/cancel`; role-based access (client owns job); unit-tested
- **Contracts + Milestones module** (`src/contracts/`) — `POST /contracts` (creates contract + milestones, returns unsigned fund XDR for Freighter); `POST /contracts/:id/confirm-fund` (verifies tx hash on Horizon); `PATCH .../milestones/:mid/submit`; `PATCH .../milestones/:mid/approve` (submits `release_milestone()` on-chain then records Payment); `POST .../dispute`; `PATCH admin/:id/resolve`; `POST .../cancel`; 20+ unit tests including on-chain-before-DB ordering guarantees
- **Escrow service** (`src/escrow/escrow.service.ts`) — `buildFundXdr` (unsigned XDR for Freighter), `submitReleaseMilestone`, `submitRelease`, `submitRefund`, `submitDispute`, `submitResolveDispute`, `verifyTransaction`; all Soroban call sites use `contractIdToSymbol()` to safely encode UUIDs as 32-char Symbols
- **`contractIdToSymbol()` helper** — strips hyphens from PostgreSQL UUIDs to produce a valid Soroban Symbol key (≤32 chars). Applied at every Soroban call site in EscrowService; documented in both the backend service and the contract module doc comment
- **Full Soroban escrow contract** (`stellance/Contracts/src/lib.rs`) — `fund`, `release_milestone`, `release`, `refund`, `dispute`, `resolve_dispute`, `get_escrow`, `ping`; 30 tests covering all state transitions, authorization checks, arithmetic edge cases, and dispute resolution splits
- **`EscrowStatus::Resolved`** variant — split dispute resolution now sets `Resolved` rather than `Released`, accurately reflecting that funds were split between parties
- **`EscrowError::InvalidAmount`** — `fund()` now rejects zero and negative amounts with a dedicated error code
- **`DataKey::Escrow(Symbol)`** typed storage key — namespaces escrow entries in persistent storage, preventing collisions if additional storage types are added in future
- JWT strategy now throws `InternalServerErrorException` at startup if `JWT_SECRET` is unset, preventing silent use of a hardcoded fallback secret in misconfigured deployments

### Changed
- Landing page `Why Stellar` section updated: "Soroban smart contracts are next on the roadmap" replaced with accurate status — contract is complete, test-covered, and compiles to WASM; integration is in progress
- Landing page stack block: `"soroban (planned)"` → `"soroban  rust  wasm"`
- Landing page stats block: `"Smart contracts (roadmap)"` → `"Escrow smart contract"`; `"Escrow via Horizon"` → `"Soroban escrow contract"`; Soroban stat now rendered in active colour (was greyed-out)
- `docs/architecture.md` — component map, architecture diagram, backend module tree, Soroban section, and "What Is Not Yet Built" table all updated to reflect current implementation state

### Fixed
- `CONTRIBUTING.md` — response format examples corrected from `{success:true, data:{...}}` to the actual flat format (`{message, access_token, user}`)
- `CONTRIBUTING.md` — endpoint list corrected: `/auth/me` → `/users/me`; `/users/:id` patterns replaced with `/users/me`; milestone/contract paths updated to match `docs/api-reference.md`
- `CONTRIBUTING.md` — dev setup now uses `docker compose up -d` and `cp .env.local.example .env.local`
- `stellance/backend/README.md` — docker-compose reference now points to the actual file
- `stellance/frontend/README.md` — quick start now uses `cp .env.local.example .env.local`
- `docs/local-development.md` — Docker section rewritten to use `docker compose up -d`; frontend setup uses `.env.local.example`
- `docs/architecture.md` — docker-compose row in "What Is Not Yet Built" table updated to ✅ Added
- `resolve_dispute` Split arm previously set `EscrowStatus::Released` — corrected to `EscrowStatus::Resolved` so `get_escrow()` accurately reflects split outcomes
- `ContractsService.dispute()` previously only updated the DB without freezing the on-chain escrow — now calls `escrow.submitDispute()` before the DB update when the escrow is funded, preserving the trustless guarantee

---

## [0.2.0] — 2026-06-17

### Added
- Marketing landing page with responsive layout and Stellar branding
- Soroban contract workspace scaffold (`stellance/Contracts/`)
- GitHub issue templates for frontend and backend contributor applications
- CI workflow for backend tests and frontend build

### Changed
- Updated CI to Node.js 20 for Next.js and Prisma compatibility
- Added Stellance logo to README

---

## [0.1.0] — 2026-03

### Added
- NestJS backend bootstrap with app module configuration
- Prisma 7 schema: `User`, `Job`, `Contract`, `Milestone`, `Payment`, `RefreshToken`
- Initial database migration
- JWT auth with rotating refresh tokens (argon2 password hashing, httpOnly cookies)
- Auth endpoints: register, login, refresh, logout, logout-all
- Token reuse detection (triggers full session revoke via `tokenVersion`)
- Helmet, CORS, and global validation pipe in `main.ts`
- Swagger API docs at `/docs`
- Next.js 16 frontend scaffold with Tailwind CSS
- Stellar testnet demo page: keypair generation, Friendbot funding, XLM payment
- `CONTRIBUTING.md` with architecture diagrams, data models, and user flows

---

[Unreleased]: https://github.com/alone-in/stellances/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/alone-in/stellances/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/alone-in/stellances/releases/tag/v0.1.0
