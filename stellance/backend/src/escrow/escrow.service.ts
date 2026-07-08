import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * EscrowService
 *
 * Wraps @stellar/stellar-sdk to build and submit Soroban invocation
 * transactions for the Stellance escrow contract on Stellar.
 *
 * Why Stellar-specific:
 * - buildFundXdr returns unsigned XDR for Freighter signing (non-custodial)
 * - release_milestone / refund / resolve_dispute are admin-signed server-side
 * - verifyTransaction checks Horizon for immutable on-chain proof
 * - All fees are ~$0.00001 XLM — makes per-milestone payments viable
 */
@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private readonly horizonUrl: string;
  private readonly sorobanRpcUrl: string;
  private readonly networkPassphrase: string;
  private readonly escrowContractId: string;
  private readonly adminKeypair: StellarSdk.Keypair | null;

  constructor(private readonly config: ConfigService) {
    const network = config.get<string>('STELLAR_NETWORK') ?? 'testnet';

    this.horizonUrl =
      config.get<string>('STELLAR_HORIZON_URL') ??
      (network === 'mainnet'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org');

    this.sorobanRpcUrl =
      config.get<string>('STELLAR_RPC_URL') ??
      (network === 'mainnet'
        ? 'https://mainnet.sorobanrpc.com'
        : 'https://soroban-testnet.stellar.org');

    this.networkPassphrase =
      config.get<string>('STELLAR_NETWORK_PASSPHRASE') ??
      (network === 'mainnet' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET);

    this.escrowContractId = config.get<string>('ESCROW_CONTRACT_ID') ?? '';

    const adminSecret = config.get<string>('STELLAR_ADMIN_SECRET');
    this.adminKeypair = adminSecret ? StellarSdk.Keypair.fromSecret(adminSecret) : null;

    if (!this.escrowContractId) {
      this.logger.warn('ESCROW_CONTRACT_ID not set — Soroban calls will fail');
    }
    if (!this.adminKeypair) {
      this.logger.warn('STELLAR_ADMIN_SECRET not set — admin operations will fail');
    }
  }

  /** Public key of the platform admin account (used as escrow admin). */
  getAdminPublicKey(): string {
    if (!this.adminKeypair) {
      throw new ServiceUnavailableException(
        'Admin keypair not configured (STELLAR_ADMIN_SECRET)',
      );
    }
    return this.adminKeypair.publicKey();
  }

  /**
   * Verify a Stellar transaction hash exists on Horizon.
   * Throws ServiceUnavailableException on network error or not found.
   */
  async verifyTransaction(txHash: string): Promise<{ ledger: number }> {
    try {
      const server = new StellarSdk.Horizon.Server(this.horizonUrl);
      const tx = await server.transactions().transaction(txHash).call();
      return { ledger: tx.ledger_attr };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(
        `Cannot verify tx ${txHash} on Horizon: ${msg}`,
      );
    }
  }

  /**
   * Build an unsigned XDR envelope for the escrow fund() Soroban invocation.
   * Client signs this with Freighter — the platform never touches the client key.
   */
  async buildFundXdr(params: {
    contractId: string;
    clientPublicKey: string;
    freelancerPublicKey: string;
    adminPublicKey: string;
    amountStroops: bigint;
    tokenContractId: string;
  }): Promise<string> {
    const rpcServer = new StellarSdk.rpc.Server(this.sorobanRpcUrl);
    const account = await rpcServer.getAccount(params.clientPublicKey);
    const contract = new StellarSdk.Contract(this.escrowContractId);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'fund',
          StellarSdk.nativeToScVal(params.contractId, { type: 'symbol' }),
          StellarSdk.nativeToScVal(params.clientPublicKey, { type: 'address' }),
          StellarSdk.nativeToScVal(params.freelancerPublicKey, { type: 'address' }),
          StellarSdk.nativeToScVal(params.adminPublicKey, { type: 'address' }),
          StellarSdk.nativeToScVal(params.amountStroops, { type: 'i128' }),
          StellarSdk.nativeToScVal(params.tokenContractId, { type: 'address' }),
        ),
      )
      .setTimeout(60)
      .build();

    const simResult = await rpcServer.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      throw new ServiceUnavailableException(
        `Soroban simulation failed: ${simResult.error}`,
      );
    }

    const prepared = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    return prepared.toEnvelope().toXDR('base64');
  }

  /** Submit release_milestone() for one approved milestone. Returns tx hash. */
  async submitReleaseMilestone(params: {
    contractId: string;
    amountStroops: bigint;
  }): Promise<string> {
    return this._submitAdminInvocation('release_milestone', [
      StellarSdk.nativeToScVal(params.contractId, { type: 'symbol' }),
      StellarSdk.nativeToScVal(this.getAdminPublicKey(), { type: 'address' }),
      StellarSdk.nativeToScVal(params.amountStroops, { type: 'i128' }),
    ]);
  }

  /** Submit release() — releases all remaining escrowed funds. */
  async submitRelease(contractId: string): Promise<string> {
    return this._submitAdminInvocation('release', [
      StellarSdk.nativeToScVal(contractId, { type: 'symbol' }),
      StellarSdk.nativeToScVal(this.getAdminPublicKey(), { type: 'address' }),
    ]);
  }

  /** Submit refund() — returns all funds to the client. */
  async submitRefund(contractId: string): Promise<string> {
    return this._submitAdminInvocation('refund', [
      StellarSdk.nativeToScVal(contractId, { type: 'symbol' }),
      StellarSdk.nativeToScVal(this.getAdminPublicKey(), { type: 'address' }),
    ]);
  }

  /**
   * Submit resolve_dispute() — admin arbitration with optional split.
   * decision: 0 = ReleaseToFreelancer, 1 = RefundToClient, 2 = Split
   */
  async submitResolveDispute(params: {
    contractId: string;
    decision: 0 | 1 | 2;
    freelancerBps: number;
  }): Promise<string> {
    const variants = ['ReleaseToFreelancer', 'RefundToClient', 'Split'] as const;
    return this._submitAdminInvocation('resolve_dispute', [
      StellarSdk.nativeToScVal(params.contractId, { type: 'symbol' }),
      StellarSdk.nativeToScVal(this.getAdminPublicKey(), { type: 'address' }),
      StellarSdk.xdr.ScVal.scvVec([
        StellarSdk.xdr.ScVal.scvSymbol(variants[params.decision]),
      ]),
      StellarSdk.nativeToScVal(params.freelancerBps, { type: 'u32' }),
    ]);
  }

  private async _submitAdminInvocation(
    fnName: string,
    args: StellarSdk.xdr.ScVal[],
  ): Promise<string> {
    if (!this.adminKeypair) {
      throw new ServiceUnavailableException(
        'Admin keypair not configured (STELLAR_ADMIN_SECRET)',
      );
    }

    const rpcServer = new StellarSdk.rpc.Server(this.sorobanRpcUrl);
    const account = await rpcServer.getAccount(this.adminKeypair.publicKey());
    const contract = new StellarSdk.Contract(this.escrowContractId);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(fnName, ...args))
      .setTimeout(60)
      .build();

    const simResult = await rpcServer.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      throw new ServiceUnavailableException(
        `Soroban simulation failed for ${fnName}: ${simResult.error}`,
      );
    }

    const prepared = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    prepared.sign(this.adminKeypair);

    const sendResult = await rpcServer.sendTransaction(prepared);
    if (sendResult.status === 'ERROR') {
      throw new ServiceUnavailableException(
        `Transaction send failed for ${fnName}: ${JSON.stringify(sendResult.errorResult)}`,
      );
    }

    const hash = sendResult.hash;
    let getResult = await rpcServer.getTransaction(hash);
    let attempts = 0;
    while (
      getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND &&
      attempts < 20
    ) {
      await new Promise((r) => setTimeout(r, 1500));
      getResult = await rpcServer.getTransaction(hash);
      attempts++;
    }

    if (getResult.status !== StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new ServiceUnavailableException(
        `Transaction ${hash} did not confirm (status: ${getResult.status})`,
      );
    }

    return hash;
  }
}
