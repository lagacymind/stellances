# Issue Audit — 2026-07-14

31 open issues reviewed. 12 can be closed immediately (already resolved by
code in `main`). 1 is a stale duplicate. 18 remain legitimately open.

---

## Issues to Close — Already Resolved

These issues describe work that is fully implemented and merged.

### Backend

| # | Title | Evidence |
|---|-------|----------|
| **#12** | [BE] Implement Auth Module (Register & Login) | `src/auth/` — register, login, refresh, logout, logout-all, JWT strategy, refresh token rotation. Full test coverage. |
| **#15** | [BE] Implement Contracts Module | `src/contracts/contracts.service.ts` — create, confirmFund, findAll, findOne, submitMilestone, approveMilestone, dispute, resolveDispute, cancel. 20+ unit tests. |
| **#22** | [BE] Add PATCH /users/me — save Stellar public key | `src/users/users.controller.ts` + `users.service.ts` — `updateProfile` with `@Matches` validation on stellarPublicKey. Unit tests in `users.controller.spec.ts`. |
| **#23** | [BE] Implement Jobs Module (CRUD + apply) | `src/jobs/` — create, findAll, findOne, update, cancel. Full unit tests in `jobs.service.spec.ts`. |
| **#24** | [BE] Implement Milestones Module | Milestones are managed inside `ContractsService` — `submitMilestone` (PENDING→IN_REVIEW) and `approveMilestone` (IN_REVIEW→PAID + on-chain release). |
| **#25** | [BE] Implement Escrow/Stellar service (Horizon + Soroban tx building) | `src/escrow/escrow.service.ts` — buildFundXdr, submitReleaseMilestone, submitRelease, submitRefund, submitDispute, submitResolveDispute, verifyTransaction. 24 unit tests added 2026-07-14. |
| **#26** | [BE] Implement Admin dispute resolution endpoint | `PATCH /contracts/admin/:id/resolve` in `contracts.controller.ts` → `ContractsService.resolveDispute`. |

### Smart Contracts

| # | Title | Evidence |
|---|-------|----------|
| **#16** | [Smart Contract] Build Soroban Escrow Contract | `stellance/Contracts/src/lib.rs` — full state machine: fund, release_milestone, release, refund, dispute, resolve_dispute, get_escrow, ping. 30 unit tests in `tests/contract_test.rs`. Compiles to WASM. |
| **#32** | [Smart Contract] Fix milestone partial-release storage model | `released_amount` accumulator with overflow-checked arithmetic; `release_milestone` correctly rejects amounts exceeding remaining balance; transitions to `Released` when `released_amount >= total_amount`. Fixed in commit `134b1ba`. |

### Frontend

| # | Title | Evidence |
|---|-------|----------|
| **#52** | [FE] Hide secret key behind reveal button on demo page | `app/demo/page.tsx` — `KeyField` component with `secret` prop renders `•` placeholder with a "Reveal/Hide" toggle button and explicit ⚠️ warning. Hardened in commit `14459c3`. |

### CI

| # | Title | Evidence |
|---|-------|----------|
| **#50** | [CI] Add npm audit and test coverage threshold to CI pipeline | Added 2026-07-14: `npm audit --audit-level=high` on both backend/frontend jobs; `coverageThreshold` in `package.json` jest config (lines 63%, statements 63%, branches 54%, functions 59%). Committed in `1a480ef`. |

---

## Issues to Close — Stale Duplicate

| # | Title | Reason |
|---|-------|--------|
| **#33** | [BE] Fix issue #15 — correct file paths in tasks | Meta-issue created to track a task within #15. Issue #15 is now fully resolved. This issue has no independent deliverable. |

---

## Issues That Remain Open (18)

These are real, un-started work items. No action needed on them.

### Active Development (close when merged)

| # | Title | Notes |
|---|-------|-------|
| #17 | [Smart Contract] Integrate Soroban Contract with Backend | Backend Soroban calls are wired (`EscrowService`) but the integration needs end-to-end testnet validation with a deployed contract. |
| #45 | [FE/BE] dispute() should return unsigned XDR for Freighter signing | Acknowledged as a TODO in `escrow.service.ts`. Currently uses admin key server-side. |
| #46 | [Smart Contract] Deploy escrow contract to Stellar testnet | Contract compiles; deployment + address configuration pending. |

### Frontend Build-Out

| # | Title |
|---|-------|
| #6 | [FE] Build Contracts Page |
| #8 | [FE] Implement WalletConnect Component |
| #9 | [FE] Build User Profile Page |
| #27 | [FE] Freighter wallet connect & signing flow |
| #28 | [FE] Build Job Post form (client) |
| #29 | [FE] Build Job Detail & Apply flow (freelancer) |
| #30 | [FE] Fund escrow flow (Freighter XDR signing) |
| #31 | [FE] Build Contract detail + milestone submission/approval UI |
| #51 | [FE] Upgrade frontend from stellar-sdk v10 to @stellar/stellar-sdk v13 |

### Backend / Infra

| # | Title | Notes |
|---|-------|-------|
| #47 | [BE] Subscribe to Soroban events via Horizon RPC streaming | Event streaming for real-time state sync. |
| #48 | [BE/FE] Add GET /contracts/:id/on-chain — verify escrow state | Cross-check DB state against chain. |
| #49 | [BE/FE] Link payment records to stellar.expert in API/UI | UX improvement; stellarTxHash is already stored. |
| #53 | [BE] Add rate limiting to auth endpoints | Security hardening; use `@nestjs/throttler`. |
| #54 | [Docs] Write testnet deployment guide | Deployment runbook needed before testnet launch. |

### Community / Contributor Calls (leave open)

| # | Title | Notes |
|---|-------|-------|
| #19 | Call for Frontend Contributors | Leave open until contributor slots are full. |
| #20 | Call for Backend / Stellar Contributors | Leave open until contributor slots are full. |

---

## Summary

| Action | Count | Issue numbers |
|--------|-------|---------------|
| **Close — resolved** | 11 | #12, #15, #16, #22, #23, #24, #25, #26, #32, #50, #52 |
| **Close — stale duplicate** | 1 | #33 |
| **Keep open** | 19 | all others |
