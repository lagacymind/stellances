# Changelog

All notable changes to Stellance are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- `docker-compose.yml` — PostgreSQL 16 service for local development (resolves references in multiple docs that pointed to a missing file)
- `stellance/frontend/.env.local.example` — environment template; contributors now run `cp .env.local.example .env.local` instead of creating the file manually
- `PATCH /users/me` documented in `docs/api-reference.md` as a planned endpoint (needed to save Stellar public key after wallet connection)
- Freighter wallet setup guide added to `docs/local-development.md` (step 6)
- `@ApiProperty` / `@ApiPropertyOptional` decorators added to `RegisterDto` and `LoginDto` — Swagger UI at `/docs` now renders fully populated request body schemas with examples
- `src/users/users.controller.spec.ts` — unit test suite for `GET /users/me` covering: happy path (returns profile without password), missing `req.user`, missing `req.user.id`, user not found in DB, and password-omission guarantee

### Changed
- Landing page `Why Stellar` section updated: "Soroban smart contracts are next on the roadmap" replaced with accurate status — contract is complete, test-covered, and compiles to WASM; integration is in progress
- Landing page stack block: `"soroban (planned)"` → `"soroban  rust  wasm"`
- Landing page stats block: `"Smart contracts (roadmap)"` → `"Escrow smart contract"`; `"Escrow via Horizon"` → `"Soroban escrow contract"`; Soroban stat now rendered in active colour (was greyed-out)

### Fixed
- `CONTRIBUTING.md` — response format examples corrected from `{success:true, data:{...}}` to the actual flat format (`{message, access_token, user}`)
- `CONTRIBUTING.md` — endpoint list corrected: `/auth/me` → `/users/me`; `/users/:id` patterns replaced with `/users/me`; milestone/contract paths updated to match `docs/api-reference.md`
- `CONTRIBUTING.md` — dev setup now uses `docker compose up -d` and `cp .env.local.example .env.local`
- `stellance/backend/README.md` — docker-compose reference now points to the actual file
- `stellance/frontend/README.md` — quick start now uses `cp .env.local.example .env.local`
- `docs/local-development.md` — Docker section rewritten to use `docker compose up -d`; frontend setup uses `.env.local.example`
- `docs/architecture.md` — docker-compose row in "What Is Not Yet Built" table updated to ✅ Added

### Planned
- Soroban escrow contract: `fund`, `release`, `refund`, `dispute` functions
- Jobs API endpoints (list, create, apply)
- Contracts API endpoints (create, approve, dispute)
- Freighter wallet connection in frontend
- Frontend marketplace pages (jobs list, job detail, dashboard)
- `PATCH /users/me` backend implementation

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
