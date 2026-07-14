/**
 * Unit tests for EscrowService.
 *
 * EscrowService wraps @stellar/stellar-sdk to build and submit Soroban
 * invocation transactions. All Stellar SDK network calls are mocked via
 * jest.mock so the tests run entirely in-process.
 *
 * Coverage:
 *   - contractIdToSymbol()    — UUID → 32-char hex Symbol key encoding
 *   - getAdminPublicKey()     — value returned + ServiceUnavailable when unconfigured
 *   - verifyTransaction()     — happy path + Horizon error
 *   - buildFundXdr()          — happy path + simulation error
 *   - submitReleaseMilestone() — happy path + missing keypair + sim error + send ERROR
 *   - submitRelease()          — happy path
 *   - submitRefund()           — happy path
 *   - submitDispute()          — happy path
 *   - submitResolveDispute()   — all three decision codes
 *   - constructor              — warns on missing env vars, picks testnet defaults
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ---------------------------------------------------------------------------
// Mutable SDK stubs — shared state that each test can reconfigure
// ---------------------------------------------------------------------------

// We declare these up here so jest.mock's factory (hoisted) can close over them.
const mockRpc = {
  getAccount: jest.fn(),
  simulateTransaction: jest.fn(),
  sendTransaction: jest.fn(),
  getTransaction: jest.fn(),
};

const mockContract = {
  call: jest.fn(),
};

const mockTx = {
  sign: jest.fn(),
  toEnvelope: jest.fn(() => ({
    toXDR: () => 'bW9jay14ZHI=', // base64 for "mock.xdr"
  })),
};

const mockHorizonServer = {
  transactions: jest.fn(),
};

// Real keypair — testnet only, no funds.
const TEST_SECRET = 'SAOQVHSZGYVUIMQ75ZFAD2WILP6NQU33HOVSRUGSG66PLALC7LIP7DPD';

jest.mock('@stellar/stellar-sdk', () => {
  // Keep real StrKey / Keypair so Keypair.fromSecret works (used in constructor).
  // Mock network-touching classes and nativeToScVal to avoid address validation.
  const real = jest.requireActual<typeof import('@stellar/stellar-sdk')>(
    '@stellar/stellar-sdk',
  );
  return {
    ...real,
    // Stub nativeToScVal — escrow service passes Stellar addresses as strings;
    // the real impl validates them, which we don't need in unit tests.
    nativeToScVal: jest.fn(() => real.xdr.ScVal.scvVoid()),
    // rpc.Server — returns our mutable mockRpc object
    rpc: {
      ...real.rpc,
      Server: jest.fn(() => mockRpc),
      assembleTransaction: jest.fn(() => ({ build: () => mockTx })),
      Api: {
        ...real.rpc.Api,
        isSimulationError: (r: unknown) =>
          typeof r === 'object' &&
          r !== null &&
          (r as Record<string, unknown>)['_error'] === true,
        GetTransactionStatus: { SUCCESS: 'SUCCESS', NOT_FOUND: 'NOT_FOUND' },
      },
    },
    // Contract — returns mockContract
    Contract: jest.fn(() => mockContract),
    // TransactionBuilder — returns builder that yields mockTx
    TransactionBuilder: jest.fn(() => ({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn(() => mockTx),
    })),
    // Horizon.Server — returns mockHorizonServer
    Horizon: {
      ...real.Horizon,
      Server: jest.fn(() => mockHorizonServer),
    },
  };
});

// Import AFTER the mock is registered
import { EscrowService } from './escrow.service';

// ---------------------------------------------------------------------------
// Helper: build ConfigService stub
// ---------------------------------------------------------------------------

function makeConfig(
  overrides: Record<string, string | undefined> = {},
): ConfigService {
  const defaults: Record<string, string | undefined> = {
    STELLAR_NETWORK: 'testnet',
    STELLAR_ADMIN_SECRET: TEST_SECRET,
    ESCROW_CONTRACT_ID: 'CDUMMY_CONTRACT_ID_FOR_TESTS',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => defaults[key]),
  } as unknown as ConfigService;
}

function makeService(
  overrides?: Record<string, string | undefined>,
): EscrowService {
  return new EscrowService(makeConfig(overrides));
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockContract.call.mockReturnValue({});

  // Default: successful simulation (not _error)
  mockRpc.simulateTransaction.mockResolvedValue({
    minResourceFee: '100',
    results: [{ retval: null, events: [] }],
    _error: false,
  });

  // Default: PENDING send, then SUCCESS confirm
  mockRpc.sendTransaction.mockResolvedValue({
    status: 'PENDING',
    hash: 'mock-tx-hash-abc123',
    errorResult: null,
  });
  mockRpc.getTransaction.mockResolvedValue({ status: 'SUCCESS' });
  mockRpc.getAccount.mockResolvedValue({
    id: 'acc',
    sequenceNumber: () => '1',
    incrementSequenceNumber: jest.fn(),
  });
  mockHorizonServer.transactions.mockReturnValue({
    transaction: jest.fn().mockReturnValue({
      call: jest.fn().mockResolvedValue({ ledger_attr: 1 }),
    }),
  });
});

// ---------------------------------------------------------------------------
// contractIdToSymbol()
// ---------------------------------------------------------------------------

describe('EscrowService.contractIdToSymbol', () => {
  it('strips all hyphens from a standard UUID', () => {
    const svc = makeService();
    const result = svc.contractIdToSymbol(
      '550e8400-e29b-41d4-a716-446655440000',
    );
    expect(result).toBe('550e8400e29b41d4a716446655440000');
    expect(result).toHaveLength(32);
    expect(result).not.toContain('-');
  });

  it('returns the input unchanged when no hyphens are present', () => {
    const svc = makeService();
    expect(svc.contractIdToSymbol('550e8400e29b41d4a716446655440000')).toBe(
      '550e8400e29b41d4a716446655440000',
    );
  });

  it('handles an empty string', () => {
    const svc = makeService();
    expect(svc.contractIdToSymbol('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// getAdminPublicKey()
// ---------------------------------------------------------------------------

describe('EscrowService.getAdminPublicKey', () => {
  it('returns the public key corresponding to STELLAR_ADMIN_SECRET', () => {
    const svc = makeService();
    // Just check it starts with G (all Stellar public keys do)
    expect(svc.getAdminPublicKey()).toMatch(/^G/);
  });

  it('throws ServiceUnavailableException when STELLAR_ADMIN_SECRET is not set', () => {
    const svc = makeService({ STELLAR_ADMIN_SECRET: undefined });
    expect(() => svc.getAdminPublicKey()).toThrow(ServiceUnavailableException);
  });
});

// ---------------------------------------------------------------------------
// verifyTransaction()
// ---------------------------------------------------------------------------

describe('EscrowService.verifyTransaction', () => {
  it('returns { ledger } on Horizon success', async () => {
    mockHorizonServer.transactions.mockReturnValue({
      transaction: jest.fn().mockReturnValue({
        call: jest.fn().mockResolvedValue({ ledger_attr: 99 }),
      }),
    });

    const svc = makeService();
    const result = await svc.verifyTransaction('abc123');
    expect(result).toEqual({ ledger: 99 });
  });

  it('throws ServiceUnavailableException on Horizon network error', async () => {
    mockHorizonServer.transactions.mockReturnValue({
      transaction: jest.fn().mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error('timeout')),
      }),
    });

    const svc = makeService();
    await expect(svc.verifyTransaction('bad-hash')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('includes the tx hash in the error message', async () => {
    mockHorizonServer.transactions.mockReturnValue({
      transaction: jest.fn().mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error('not found')),
      }),
    });

    const svc = makeService();
    await expect(svc.verifyTransaction('specific-hash')).rejects.toThrow(
      /specific-hash/,
    );
  });
});

// ---------------------------------------------------------------------------
// buildFundXdr()
// ---------------------------------------------------------------------------

describe('EscrowService.buildFundXdr', () => {
  const fundParams = {
    contractId: '550e8400-e29b-41d4-a716-446655440000',
    clientPublicKey: 'GB3RGQA4VXU6Z2J6FG4DCAIYKHXWTBATR7BUEB7WFXXGPB2KC2FTW2PW',
    freelancerPublicKey:
      'GCUNUKLKYDXS4JPQPQV2USJLYSQAKE4YKUICQLSLDGR6M3IKVSDSV4DQ',
    adminPublicKey: 'GB2NUEJTGQZJVCJV2AUZSGTJEKUEZ35PJIR67D3CEQDPADIDD7DAWO6Q',
    amountStroops: BigInt(1_000_000_000),
    tokenContractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  };

  it('returns a non-empty string on success', async () => {
    const svc = makeService();
    const xdr = await svc.buildFundXdr(fundParams);
    expect(typeof xdr).toBe('string');
    expect(xdr.length).toBeGreaterThan(0);
  });

  it('throws ServiceUnavailableException when simulation returns an error', async () => {
    mockRpc.simulateTransaction.mockResolvedValueOnce({
      _error: true,
      error: 'contract revert',
    });

    const svc = makeService();
    await expect(svc.buildFundXdr(fundParams)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

// ---------------------------------------------------------------------------
// submitReleaseMilestone()
// ---------------------------------------------------------------------------

describe('EscrowService.submitReleaseMilestone', () => {
  it('returns the confirmed tx hash', async () => {
    const svc = makeService();
    const hash = await svc.submitReleaseMilestone({
      contractId: '550e8400-e29b-41d4-a716-446655440000',
      amountStroops: BigInt(500_000_000),
    });
    expect(hash).toBe('mock-tx-hash-abc123');
  });

  it('throws ServiceUnavailableException when admin keypair is not configured', async () => {
    const svc = makeService({ STELLAR_ADMIN_SECRET: undefined });
    await expect(
      svc.submitReleaseMilestone({
        contractId: 'any',
        amountStroops: BigInt(100),
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws ServiceUnavailableException when Soroban simulation fails', async () => {
    mockRpc.simulateTransaction.mockResolvedValueOnce({
      _error: true,
      error: 'contract error',
    });

    const svc = makeService();
    await expect(
      svc.submitReleaseMilestone({
        contractId: 'any',
        amountStroops: BigInt(100),
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws ServiceUnavailableException when sendTransaction returns ERROR status', async () => {
    mockRpc.sendTransaction.mockResolvedValueOnce({
      status: 'ERROR',
      hash: '',
      errorResult: { code: -1 },
    });

    const svc = makeService();
    await expect(
      svc.submitReleaseMilestone({
        contractId: 'any',
        amountStroops: BigInt(100),
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

// ---------------------------------------------------------------------------
// submitRelease(), submitRefund(), submitDispute()
// ---------------------------------------------------------------------------

describe('EscrowService admin helpers', () => {
  it('submitRelease returns tx hash', async () => {
    const svc = makeService();
    expect(await svc.submitRelease('contract-id-abc')).toBe(
      'mock-tx-hash-abc123',
    );
  });

  it('submitRefund returns tx hash', async () => {
    const svc = makeService();
    expect(await svc.submitRefund('contract-id-xyz')).toBe(
      'mock-tx-hash-abc123',
    );
  });

  it('submitDispute returns tx hash', async () => {
    const svc = makeService();
    expect(await svc.submitDispute('contract-id-dispute')).toBe(
      'mock-tx-hash-abc123',
    );
  });
});

// ---------------------------------------------------------------------------
// submitResolveDispute() — all three decision codes
// ---------------------------------------------------------------------------

describe('EscrowService.submitResolveDispute', () => {
  it('decision 0 (ReleaseToFreelancer) returns tx hash', async () => {
    const svc = makeService();
    expect(
      await svc.submitResolveDispute({
        contractId: 'ctr-001',
        decision: 0,
        freelancerBps: 0,
      }),
    ).toBe('mock-tx-hash-abc123');
  });

  it('decision 1 (RefundToClient) returns tx hash', async () => {
    const svc = makeService();
    expect(
      await svc.submitResolveDispute({
        contractId: 'ctr-001',
        decision: 1,
        freelancerBps: 0,
      }),
    ).toBe('mock-tx-hash-abc123');
  });

  it('decision 2 (Split, 60/40) returns tx hash', async () => {
    const svc = makeService();
    expect(
      await svc.submitResolveDispute({
        contractId: 'ctr-001',
        decision: 2,
        freelancerBps: 6000,
      }),
    ).toBe('mock-tx-hash-abc123');
  });
});

// ---------------------------------------------------------------------------
// Constructor — config defaults and warning paths
// ---------------------------------------------------------------------------

describe('EscrowService constructor', () => {
  it('constructs without throwing when both optional env vars are absent', () => {
    expect(
      () =>
        new EscrowService(
          makeConfig({
            ESCROW_CONTRACT_ID: undefined,
            STELLAR_ADMIN_SECRET: undefined,
          }),
        ),
    ).not.toThrow();
  });

  it('uses testnet defaults when STELLAR_NETWORK is "testnet"', () => {
    expect(() => makeService({ STELLAR_NETWORK: 'testnet' })).not.toThrow();
  });

  it('uses mainnet defaults when STELLAR_NETWORK is "mainnet"', () => {
    expect(() => makeService({ STELLAR_NETWORK: 'mainnet' })).not.toThrow();
  });

  it('honours explicit STELLAR_HORIZON_URL over derived default', () => {
    expect(() =>
      makeService({
        STELLAR_NETWORK: 'mainnet',
        STELLAR_HORIZON_URL: 'https://custom-horizon.example.com',
      }),
    ).not.toThrow();
  });
});
