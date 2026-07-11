/**
 * API client for the /payments endpoints.
 *
 * The payments backend module is in active development. Until it ships this
 * file provides:
 *   1. Stable TypeScript types that mirror the expected API shape.
 *   2. Mock implementations of every fetch function so the UI can be built
 *      and tested independently.
 *
 * When the real backend is ready, swap the mock functions for real `apiFetch`
 * calls — no other files need to change.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TransactionType =
  | "ESCROW_FUNDED"
  | "MILESTONE_RELEASED"
  | "FULL_RELEASE"
  | "REFUND"
  | "WITHDRAWAL"
  | "DISPUTE_RESOLVED";

export type TransactionStatus = "PENDING" | "CONFIRMED" | "FAILED";

export type AssetCode = "XLM" | "USDC";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletBalance {
  asset: AssetCode;
  /** Raw balance string, e.g. "1234.5678900" */
  balance: string;
  /** Stellar network — "testnet" | "mainnet" */
  network: "testnet" | "mainnet";
}

export interface Transaction {
  id: string;
  /** ISO-8601 timestamp */
  createdAt: string;
  type: TransactionType;
  status: TransactionStatus;
  asset: AssetCode;
  /** Positive = credit (received), negative = debit (sent) */
  amount: string;
  /** Human-readable description, e.g. milestone title or contract label */
  description: string;
  /** On-chain transaction hash; null for pending or off-chain records */
  stellarTxHash: string | null;
  /** Counter-party wallet address */
  counterparty: string | null;
  /** Contract / escrow this transaction belongs to */
  contractId: string | null;
}

export interface PaymentsSummary {
  balances: WalletBalance[];
  recentTransactions: Transaction[];
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class PaymentsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PaymentsApiError";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("access_token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used by real fetch calls once backend ships
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    let message = res.statusText || "An unexpected error occurred.";
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
      }
    } catch {
      // non-JSON error body — use statusText
    }
    throw new PaymentsApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// TODO: Remove once the backend /payments endpoints are live.

const MOCK_BALANCES: WalletBalance[] = [
  { asset: "XLM", balance: "4820.7500000", network: "testnet" },
  { asset: "USDC", balance: "1250.00", network: "testnet" },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "txn_01",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    type: "MILESTONE_RELEASED",
    status: "CONFIRMED",
    asset: "USDC",
    amount: "+500.00",
    description: "Milestone 2 — Smart contract integration",
    stellarTxHash:
      "3b6c1a2d9f4e5b7a8c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    counterparty: "GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3XKSOLXAUJSD56C4LHND5TWUC",
    contractId: "ctr_xyz",
  },
  {
    id: "txn_02",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    type: "ESCROW_FUNDED",
    status: "CONFIRMED",
    asset: "USDC",
    amount: "-1000.00",
    description: "Escrow funded — DeFi Dashboard Project",
    stellarTxHash:
      "7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    counterparty: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZXHWZOMM3E63RZTL2ZVA",
    contractId: "ctr_abc",
  },
  {
    id: "txn_03",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    type: "WITHDRAWAL",
    status: "CONFIRMED",
    asset: "XLM",
    amount: "-200.0000000",
    description: "Withdrawal to external wallet",
    stellarTxHash:
      "9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
    counterparty: "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
    contractId: null,
  },
  {
    id: "txn_04",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    type: "MILESTONE_RELEASED",
    status: "CONFIRMED",
    asset: "USDC",
    amount: "+750.00",
    description: "Milestone 1 — UI/UX Design Deliverables",
    stellarTxHash:
      "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    counterparty: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZXHWZOMM3E63RZTL2ZVA",
    contractId: "ctr_def",
  },
  {
    id: "txn_05",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    type: "ESCROW_FUNDED",
    status: "CONFIRMED",
    asset: "USDC",
    amount: "-2000.00",
    description: "Escrow funded — Mobile App Development",
    stellarTxHash:
      "5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    counterparty: "GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3XKSOLXAUJSD56C4LHND5TWUC",
    contractId: "ctr_ghi",
  },
  {
    id: "txn_06",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    type: "REFUND",
    status: "CONFIRMED",
    asset: "USDC",
    amount: "+300.00",
    description: "Refund — Cancelled contract",
    stellarTxHash:
      "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    counterparty: "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
    contractId: "ctr_jkl",
  },
  {
    id: "txn_07",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    type: "DISPUTE_RESOLVED",
    status: "CONFIRMED",
    asset: "USDC",
    amount: "+600.00",
    description: "Dispute resolved — 60% awarded to freelancer",
    stellarTxHash:
      "4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
    counterparty: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZXHWZOMM3E63RZTL2ZVA",
    contractId: "ctr_mno",
  },
  {
    id: "txn_08",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    type: "FULL_RELEASE",
    status: "CONFIRMED",
    asset: "XLM",
    amount: "+1500.0000000",
    description: "Full release — Backend API Project",
    stellarTxHash:
      "8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
    counterparty: "GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3XKSOLXAUJSD56C4LHND5TWUC",
    contractId: "ctr_pqr",
  },
  {
    id: "txn_09",
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    type: "WITHDRAWAL",
    status: "PENDING",
    asset: "XLM",
    amount: "-500.0000000",
    description: "Withdrawal to bank via anchor",
    stellarTxHash: null,
    counterparty: null,
    contractId: null,
  },
  {
    id: "txn_10",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    type: "ESCROW_FUNDED",
    status: "FAILED",
    asset: "USDC",
    amount: "-800.00",
    description: "Escrow funding failed — insufficient balance",
    stellarTxHash: null,
    counterparty: "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
    contractId: null,
  },
];

// ─── Payments API ─────────────────────────────────────────────────────────────

/**
 * Fetch wallet balances for the current user.
 * Returns XLM and USDC balances from the connected Stellar account.
 */
export async function fetchWalletBalances(): Promise<WalletBalance[]> {
  // TODO: Replace with: return apiFetch<WalletBalance[]>("/payments/balances");
  await new Promise((r) => setTimeout(r, 600)); // simulate network
  return MOCK_BALANCES;
}

/**
 * Fetch the full transaction history for the current user.
 * Includes escrow events, releases, refunds, and withdrawals.
 */
export async function fetchTransactions(): Promise<Transaction[]> {
  // TODO: Replace with: return apiFetch<Transaction[]>("/payments/transactions");
  await new Promise((r) => setTimeout(r, 800)); // simulate network
  return MOCK_TRANSACTIONS;
}

/**
 * Initiate a withdrawal to an external Stellar address.
 * Returns the new pending transaction record.
 */
export async function initiateWithdrawal(payload: {
  asset: AssetCode;
  amount: string;
  destinationAddress: string;
}): Promise<Transaction> {
  const res = await fetch(`${BASE_URL}/payments/withdraw`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Withdrawal failed. Please try again.";
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
      }
    } catch {
      // ignore
    }
    throw new PaymentsApiError(res.status, message);
  }

  return res.json() as Promise<Transaction>;
}

// ─── Client-side helpers ──────────────────────────────────────────────────────

/** Stellar Expert base URL for a given network. */
export function stellarExpertTxUrl(
  hash: string,
  network: "testnet" | "mainnet" = "testnet",
): string {
  const net = network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/tx/${hash}`;
}

/** Human-readable labels for each transaction type. */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  ESCROW_FUNDED: "Escrow Funded",
  MILESTONE_RELEASED: "Milestone Released",
  FULL_RELEASE: "Full Release",
  REFUND: "Refund",
  WITHDRAWAL: "Withdrawal",
  DISPUTE_RESOLVED: "Dispute Resolved",
};

/** Format a raw Stellar balance string (removes trailing zeros). */
export function formatBalance(balance: string, asset: AssetCode): string {
  const n = parseFloat(balance);
  if (isNaN(n)) return balance;

  if (asset === "XLM") {
    // XLM: show up to 4 decimal places, strip trailing zeros
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  // USDC: 2 decimal places
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a transaction amount with sign and symbol. */
export function formatTxAmount(amount: string, asset: AssetCode): string {
  const isNeg = amount.startsWith("-");
  const abs = parseFloat(amount.replace(/[+-]/, ""));
  if (isNaN(abs)) return amount;

  const formatted =
    asset === "XLM"
      ? abs.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })
      : abs.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  return `${isNeg ? "−" : "+"}${formatted} ${asset}`;
}

/** Truncate a Stellar address or tx hash for display. */
export function truncateHash(hash: string, chars = 6): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}
