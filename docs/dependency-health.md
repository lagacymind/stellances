# Dependency Health Report — 2026-07-14

## Summary

| Area | Before | After | Action taken |
|------|--------|-------|--------------|
| Frontend vulnerabilities | 4 (3 HIGH, 1 MODERATE) | 0 | `next` patched 16.1.6 → 16.2.10 |
| Backend HIGH/CRITICAL vulns | 19 HIGH + 1 CRITICAL | 0 | `npm update` within semver ranges |
| Backend MODERATE vulns | 20 | 3 | Remaining require major Prisma downgrade (see below) |

---

## Frontend

### Fixed

**`next` 16.1.6 → 16.2.10** (patch/minor — auto-applied)

- CVE: Next.js HTTP request smuggling in rewrites — **HIGH**
- CVE: Next.js unbounded next/image disk cache growth — **HIGH**
- PostCSS XSS via unescaped `</style>` — **MODERATE** (transitive, fixed by next bump)

### Needs human decision

**`stellar-sdk` 10.x → 13.3.x** (major — not auto-applied)

- The frontend uses `stellar-sdk` 10.x; the latest is 13.3.x.
- The HIGH axios CSRF/SSRF vulnerability is fixed in 13.x.
- This is a **major version bump** with potential breaking changes in transaction-building APIs.
- The demo page (`/demo`) uses `StellarSdk.Server`, `TransactionBuilder`, and `Keypair` — review the [stellar-sdk changelog](https://github.com/stellar/js-stellar-sdk/releases) before upgrading.
- The backend already uses `@stellar/stellar-sdk` 13.3.0 (the scoped package); the frontend uses the legacy `stellar-sdk` unscoped package. Consider migrating to `@stellar/stellar-sdk` for consistency.

**`zod` 3.x → 4.x** (major — not auto-applied)

- `zod` 4.x has breaking API changes (schema inference differs from v3).
- No known vulnerabilities in 3.x; this is a routine major upgrade.

**`@hookform/resolvers` 3.x → 5.x** (major — not auto-applied)

- No known vulnerabilities; major upgrade for compatibility with `react-hook-form` 8.x if needed.

---

## Backend

### Fixed (by `npm update`)

All 19 HIGH and 1 CRITICAL vulnerabilities resolved within the `^11.x` semver range:

- `@nestjs/core` 11.1.16 → 11.1.28: path-to-regexp ReDoS, injection vuln — **HIGH**
- `@nestjs/platform-express` 11.1.16 → 11.1.28: multer DoS — **HIGH**
- `@nestjs/swagger` 11.2.6 → 11.4.5: js-yaml ReDoS, lodash injection — **HIGH**
- `@nestjs/config` 4.0.3 → 4.0.4: lodash prototype pollution — **HIGH**
- `@prisma/client` / `@prisma/adapter-pg` / `prisma` 7.5.0 → 7.8.0: @prisma/config effect vuln — **HIGH**
- `handlebars` (via `ts-jest`) **CRITICAL JS injection** — resolved by `ts-jest` update; devOnly, not in runtime bundle
- Other transitive HIGH fixes: fast-uri, form-data, flatted, hono, sigstore, picomatch, defu

### Remaining (3 MODERATE — need human decision)

**Prisma 7.x `@hono/node-server` middleware bypass** (MODERATE)

- `@prisma/dev` (Prisma's internal CLI tooling) ships `@hono/node-server` which has an authenticated path-bypass via repeated slashes.
- Fix available: Prisma 6.19.3 — but that is a **major downgrade** (7.x → 6.x).
- **Impact assessment:** `@hono/node-server` is inside `@prisma/dev`, which is a development/CLI dependency — it is not part of the application runtime. This vulnerability cannot be exploited by end users of the Stellance API.
- **Recommendation:** Accept this risk until Prisma 7.x ships a fix. Open a tracking issue and re-check with Prisma 7.9.0+.

### Packages with available minor/patch upgrades (safe to apply, no vulns)

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `@stellar/stellar-sdk` | 13.3.0 | 15.1.0 | **Major** — v14/v15 have API changes; do not auto-upgrade |
| `class-validator` | 0.14.4 | 0.15.1 | **Minor** — check for decorator API changes before applying |
| `typescript` | 5.9.3 | 7.0.2 | **Major** — TypeScript 7 has stricter type inference; defer |
| `@eslint/js` | 9.x | 10.x | **Major** — ESLint 10 is a breaking release; defer |
| `globals` | 16.x | 17.x | **Major** — defer with ESLint upgrade |
| `@types/node` | 22.x | 26.x | **Major** — Node.js 26 types; defer until runtime is upgraded |

---

## Rust / Soroban Contracts

`cargo-outdated` is not installed in this environment. Manual check:

- `soroban-sdk` is pinned to `=21.7.6` in `Cargo.toml`.
- The Cargo.lock confirms `21.7.6` is the resolved version.
- `soroban-sdk` uses `=` (exact) pinning intentionally — the testutils API is unstable between minor releases and `soroban-env-host` has known compatibility issues across patch releases.
- **Recommendation:** Only upgrade `soroban-sdk` when targeting a new Stellar protocol version or when a specific bug fix is needed. Check https://github.com/stellar/rs-soroban-sdk/releases before any upgrade.

---

## Action Items for Maintainers

1. **Do now (low risk):** `class-validator` 0.14.4 → 0.15.1 — minor bump, test after
2. **Review before applying:** `stellar-sdk` 10.x → `@stellar/stellar-sdk` 13.x in frontend — API migration required for demo page
3. **Defer — track:** `typescript` 5.x → 7.x, `@eslint/js` 9.x → 10.x — major ecosystem upgrades, do together
4. **Accept / monitor:** Prisma `@hono/node-server` MODERATE — devOnly, re-check in Prisma 7.9+
5. **Accept:** `@stellar/stellar-sdk` 13.x → 15.x in backend — no vulns, review changelog first
