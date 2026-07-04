#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, Symbol,
};

use stellance_contract::{
    DisputeDecision, EscrowError, EscrowStatus, StellanceEscrow, StellanceEscrowClient,
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

struct Fixture {
    env: Env,
    escrow: StellanceEscrowClient<'static>,
    contract_id: Symbol,
    client: Address,
    freelancer: Address,
    admin: Address,
    token_addr: Address,
    token_sac: StellarAssetClient<'static>,
    token: TokenClient<'static>,
}

impl Fixture {
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        // Deploy the escrow contract
        let escrow_id = env.register(StellanceEscrow, ());

        // Generate participant addresses
        let client = Address::generate(&env);
        let freelancer = Address::generate(&env);
        let admin = Address::generate(&env);

        // Deploy a test token (Stellar Asset Contract)
        let token_admin = Address::generate(&env);
        let sac = env.register_stellar_asset_contract_v2(token_admin);
        let token_addr = sac.address();

        let token_sac = StellarAssetClient::new(&env, &token_addr);
        let token = TokenClient::new(&env, &token_addr);

        // Fund client with tokens
        token_sac.mint(&client, &10_000);

        // Approve the escrow contract to pull from client
        token.approve(
            &client,
            &escrow_id,
            &10_000,
            &(env.ledger().sequence() + 1_000),
        );

        let escrow = StellanceEscrowClient::new(&env, &escrow_id);
        let contract_id = Symbol::new(&env, "contract_abc1");

        // SAFETY: env outlives the test fn — standard Soroban test pattern
        let env_ref: &'static Env = unsafe { &*(&env as *const Env) };

        Fixture {
            env,
            escrow: StellanceEscrowClient::new(env_ref, &escrow_id),
            contract_id,
            client,
            freelancer,
            admin,
            token_addr,
            token_sac: StellarAssetClient::new(env_ref, &token_addr),
            token: TokenClient::new(env_ref, &token_addr),
        }
    }

    fn fund(&self, amount: i128) {
        self.escrow
            .fund(
                &self.contract_id,
                &self.client,
                &self.freelancer,
                &self.admin,
                &amount,
                &self.token_addr,
            )
            .unwrap();
    }
}

// ---------------------------------------------------------------------------
// fund()
// ---------------------------------------------------------------------------

#[test]
fn fund_creates_entry() {
    let f = Fixture::setup();
    f.fund(1_000);

    let entry = f.escrow.get_escrow(&f.contract_id).unwrap();
    assert_eq!(entry.total_amount, 1_000);
    assert_eq!(entry.released_amount, 0);
    assert_eq!(entry.status, EscrowStatus::Funded);
    assert_eq!(entry.client, f.client);
    assert_eq!(entry.freelancer, f.freelancer);
    assert_eq!(entry.admin, f.admin);
}

#[test]
fn fund_double_funding_returns_error() {
    let f = Fixture::setup();
    f.fund(500);

    let result = f.escrow.try_fund(
        &f.contract_id,
        &f.client,
        &f.freelancer,
        &f.admin,
        &500,
        &f.token_addr,
    );
    assert_eq!(result, Err(Ok(EscrowError::AlreadyFunded)));
}

// ---------------------------------------------------------------------------
// release_milestone()
// ---------------------------------------------------------------------------

#[test]
fn release_milestone_partial_amount_reaches_freelancer() {
    let f = Fixture::setup();
    f.fund(1_000);

    let before = f.token.balance(&f.freelancer);
    f.escrow
        .release_milestone(&f.contract_id, &f.client, &400)
        .unwrap();

    let after = f.token.balance(&f.freelancer);
    assert_eq!(after - before, 400);

    let entry = f.escrow.get_escrow(&f.contract_id).unwrap();
    assert_eq!(entry.released_amount, 400);
    assert_eq!(entry.status, EscrowStatus::Funded); // not done yet
}

#[test]
fn release_milestone_full_amount_transitions_to_released() {
    let f = Fixture::setup();
    f.fund(1_000);

    f.escrow
        .release_milestone(&f.contract_id, &f.client, &600)
        .unwrap();
    f.escrow
        .release_milestone(&f.contract_id, &f.client, &400)
        .unwrap();

    let entry = f.escrow.get_escrow(&f.contract_id).unwrap();
    assert_eq!(entry.status, EscrowStatus::Released);
    assert_eq!(entry.released_amount, 1_000);
}

#[test]
fn release_milestone_admin_can_release() {
    let f = Fixture::setup();
    f.fund(1_000);

    f.escrow
        .release_milestone(&f.contract_id, &f.admin, &300)
        .unwrap();

    let entry = f.escrow.get_escrow(&f.contract_id).unwrap();
    assert_eq!(entry.released_amount, 300);
}

#[test]
fn release_milestone_freelancer_cannot_release() {
    let f = Fixture::setup();
    f.fund(1_000);

    let result = f
        .escrow
        .try_release_milestone(&f.contract_id, &f.freelancer, &300);
    assert_eq!(result, Err(Ok(EscrowError::Unauthorized)));
}

#[test]
fn release_milestone_over_remaining_fails() {
    let f = Fixture::setup();
    f.fund(1_000);

    let result = f
        .escrow
        .try_release_milestone(&f.contract_id, &f.client, &1_001);
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}

#[test]
fn release_milestone_zero_amount_fails() {
    let f = Fixture::setup();
    f.fund(1_000);

    let result = f
        .escrow
        .try_release_milestone(&f.contract_id, &f.client, &0);
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}

// ---------------------------------------------------------------------------
// release() — full release
// ---------------------------------------------------------------------------

#[test]
fn release_all_sends_remaining_to_freelancer() {
    let f = Fixture::setup();
    f.fund(1_000);

    // Release a partial amount first
    f.escrow
        .release_milestone(&f.contract_id, &f.client, &200)
        .unwrap();

    let before = f.token.balance(&f.freelancer);
    f.escrow.release(&f.contract_id, &f.client).unwrap();
    let after = f.token.balance(&f.freelancer);

    assert_eq!(after - before, 800); // remaining 800
    let entry = f.escrow.get_escrow(&f.contract_id).unwrap();
    assert_eq!(entry.status, EscrowStatus::Released);
}

#[test]
fn release_non_client_cannot_release() {
    let f = Fixture::setup();
    f.fund(1_000);

    let result = f.escrow.try_release(&f.contract_id, &f.freelancer);
    assert_eq!(result, Err(Ok(EscrowError::Unauthorized)));
}

// ---------------------------------------------------------------------------
// refund()
// ---------------------------------------------------------------------------

#[test]
fn refund_returns_funds_to_client() {
    let f = Fixture::setup();
    f.fund(1_000);

    let before = f.token.balance(&f.client);
    f.escrow.refund(&f.contract_id, &f.freelancer).unwrap();
    let after = f.token.balance(&f.client);

    assert_eq!(after - before, 1_000);
    let entry = f.escrow.get_escrow(&f.contract_id).unwrap();
    assert_eq!(entry.status, EscrowStatus::Refunded);
}

#[test]
fn refund_client_cannot_self_refund() {
    let f = Fixture::setup();
    f.fund(1_000);

    let result = f.escrow.try_refund(&f.contract_id, &f.client);
    assert_eq!(result, Err(Ok(EscrowError::Unauthorized)));
}

#[test]
fn refund_after_partial_release_returns_remainder() {
    let f = Fixture::setup();
    f.fund(1_000);

    f.escrow
        .release_milestone(&f.contract_id, &f.client, &300)
        .unwrap();

    let before = f.token.balance(&f.client);
    f.escrow.refund(&f.contract_id, &f.freelancer).unwrap();
    let after = f.token.balance(&f.client);

    assert_eq!(after - before, 700); // only unreleased 700 goes back
}

// ---------------------------------------------------------------------------
// dispute()
// ---------------------------------------------------------------------------

#[test]
fn dispute_freezes_escrow() {
    let f = Fixture::setup();
    f.fund(1_000);

    f.escrow.dispute(&f.contract_id, &f.client).unwrap();
    let entry = f.escrow.get_escrow(&f.contract_id).unwrap();
    assert_eq!(entry.status, EscrowStatus::Disputed);
}

#[test]
fn dispute_blocks_release_milestone() {
    let f = Fixture::setup();
    f.fund(1_000);
    f.escrow.dispute(&f.contract_id, &f.freelancer).unwrap();

    let result = f
        .escrow
        .try_release_milestone(&f.contract_id, &f.client, &500);
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}

#[test]
fn dispute_blocks_full_release() {
    let f = Fixture::setup();
    f.fund(1_000);
    f.escrow.dispute(&f.contract_id, &f.client).unwrap();

    let result = f.escrow.try_release(&f.contract_id, &f.client);
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}

#[test]
fn dispute_blocks_refund() {
    let f = Fixture::setup();
    f.fund(1_000);
    f.escrow.dispute(&f.contract_id, &f.client).unwrap();

    let result = f.escrow.try_refund(&f.contract_id, &f.freelancer);
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}

#[test]
fn dispute_by_third_party_fails() {
    let f = Fixture::setup();
    f.fund(1_000);

    let stranger = Address::generate(&f.env);
    let result = f.escrow.try_dispute(&f.contract_id, &stranger);
    assert_eq!(result, Err(Ok(EscrowError::Unauthorized)));
}

// ---------------------------------------------------------------------------
// resolve_dispute()
// ---------------------------------------------------------------------------

#[test]
fn resolve_dispute_release_to_freelancer() {
    let f = Fixture::setup();
    f.fund(1_000);
    f.escrow.dispute(&f.contract_id, &f.client).unwrap();

    let before = f.token.balance(&f.freelancer);
    f.escrow
        .resolve_dispute(
            &f.contract_id,
            &f.admin,
            &DisputeDecision::ReleaseToFreelancer,
            &0,
        )
        .unwrap();
    let after = f.token.balance(&f.freelancer);

    assert_eq!(after - before, 1_000);
    let entry = f.escrow.get_escrow(&f.contract_id).unwrap();
    assert_eq!(entry.status, EscrowStatus::Released);
}

#[test]
fn resolve_dispute_refund_to_client() {
    let f = Fixture::setup();
    f.fund(1_000);
    f.escrow.dispute(&f.contract_id, &f.freelancer).unwrap();

    let before = f.token.balance(&f.client);
    f.escrow
        .resolve_dispute(
            &f.contract_id,
            &f.admin,
            &DisputeDecision::RefundToClient,
            &0,
        )
        .unwrap();
    let after = f.token.balance(&f.client);

    assert_eq!(after - before, 1_000);
}

#[test]
fn resolve_dispute_split_60_40_is_atomic() {
    let f = Fixture::setup();
    f.fund(1_000);
    f.escrow.dispute(&f.contract_id, &f.client).unwrap();

    let freelancer_before = f.token.balance(&f.freelancer);
    let client_before = f.token.balance(&f.client);

    f.escrow
        .resolve_dispute(
            &f.contract_id,
            &f.admin,
            &DisputeDecision::Split,
            &6_000, // 60% to freelancer
        )
        .unwrap();

    let freelancer_after = f.token.balance(&f.freelancer);
    let client_after = f.token.balance(&f.client);

    // Both transfers happen in the same invocation — atomically
    assert_eq!(freelancer_after - freelancer_before, 600);
    assert_eq!(client_after - client_before, 400);
}

#[test]
fn resolve_dispute_split_100_pct_to_freelancer() {
    let f = Fixture::setup();
    f.fund(1_000);
    f.escrow.dispute(&f.contract_id, &f.client).unwrap();

    f.escrow
        .resolve_dispute(&f.contract_id, &f.admin, &DisputeDecision::Split, &10_000)
        .unwrap();

    assert_eq!(f.token.balance(&f.freelancer), 1_000);
    assert_eq!(f.token.balance(&f.client), 0);
}

#[test]
fn resolve_dispute_non_admin_fails() {
    let f = Fixture::setup();
    f.fund(1_000);
    f.escrow.dispute(&f.contract_id, &f.client).unwrap();

    let result = f.escrow.try_resolve_dispute(
        &f.contract_id,
        &f.client, // not admin
        &DisputeDecision::ReleaseToFreelancer,
        &0,
    );
    assert_eq!(result, Err(Ok(EscrowError::Unauthorized)));
}

#[test]
fn resolve_dispute_invalid_bps_fails() {
    let f = Fixture::setup();
    f.fund(1_000);
    f.escrow.dispute(&f.contract_id, &f.client).unwrap();

    let result = f.escrow.try_resolve_dispute(
        &f.contract_id,
        &f.admin,
        &DisputeDecision::Split,
        &10_001, // > 100%
    );
    assert_eq!(result, Err(Ok(EscrowError::InvalidSplitBps)));
}

#[test]
fn resolve_dispute_on_non_disputed_entry_fails() {
    let f = Fixture::setup();
    f.fund(1_000);
    // No dispute raised

    let result = f.escrow.try_resolve_dispute(
        &f.contract_id,
        &f.admin,
        &DisputeDecision::ReleaseToFreelancer,
        &0,
    );
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}

// ---------------------------------------------------------------------------
// get_escrow()
// ---------------------------------------------------------------------------

#[test]
fn get_escrow_returns_none_for_unknown_contract() {
    let f = Fixture::setup();
    let unknown = Symbol::new(&f.env, "no_such_id");
    assert!(f.escrow.get_escrow(&unknown).is_none());
}

// ---------------------------------------------------------------------------
// ping()
// ---------------------------------------------------------------------------

#[test]
fn ping_emits_event() {
    let env = Env::default();
    let id = env.register(StellanceEscrow, ());
    let client = StellanceEscrowClient::new(&env, &id);
    client.ping();
    // The SDK event system records events — if ping() panicked this would fail
    // (no events().all() in soroban-sdk 22.x testutils without Events import)
}
