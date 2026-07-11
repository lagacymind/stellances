"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  type Transaction,
  type TransactionType,
  type TransactionStatus,
  type AssetCode,
  TRANSACTION_TYPE_LABELS,
  stellarExpertTxUrl,
  formatTxAmount,
  truncateHash,
} from "@/lib/api/payments";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  TransactionStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  CONFIRMED: {
    bg: "rgba(45,212,191,0.12)",
    text: "#2dd4bf",
    dot: "#2dd4bf",
    label: "Confirmed",
  },
  PENDING: {
    bg: "rgba(245,158,11,0.12)",
    text: "#f59e0b",
    dot: "#f59e0b",
    label: "Pending",
  },
  FAILED: {
    bg: "rgba(248,113,113,0.12)",
    text: "#f87171",
    dot: "#f87171",
    label: "Failed",
  },
};

const CREDIT_TYPES: TransactionType[] = [
  "MILESTONE_RELEASED",
  "FULL_RELEASE",
  "REFUND",
  "DISPUTE_RESOLVED",
];

const TYPE_FILTER_OPTIONS: { value: TransactionType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "ESCROW_FUNDED", label: "Escrow Funded" },
  { value: "MILESTONE_RELEASED", label: "Milestone Released" },
  { value: "FULL_RELEASE", label: "Full Release" },
  { value: "REFUND", label: "Refund" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "DISPUTE_RESOLVED", label: "Dispute Resolved" },
];

const ASSET_FILTER_OPTIONS: { value: AssetCode | ""; label: string }[] = [
  { value: "", label: "All assets" },
  { value: "XLM", label: "XLM" },
  { value: "USDC", label: "USDC" },
];

const STATUS_FILTER_OPTIONS: {
  value: TransactionStatus | "";
  label: string;
}[] = [
  { value: "", label: "All statuses" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: days > 365 ? "numeric" : undefined,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isCredit(tx: Transaction): boolean {
  return CREDIT_TYPES.includes(tx.type);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Transaction type icon — distinct SVG per type */
function TxTypeIcon({ type }: { type: TransactionType }) {
  const iconClass = "shrink-0";
  const size = 16;

  switch (type) {
    case "ESCROW_FUNDED":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "MILESTONE_RELEASED":
    case "FULL_RELEASE":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "REFUND":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
        </svg>
      );
    case "WITHDRAWAL":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      );
    case "DISPUTE_RESOLVED":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

/** Badge for transaction status */
function StatusBadge({ status }: { status: TransactionStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}
      aria-label={`Status: ${s.label}`}
    >
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: s.dot }}
      />
      {s.label}
    </span>
  );
}

/** Stellar Explorer external link */
function ExplorerLink({
  hash,
  network = "testnet",
}: {
  hash: string;
  network?: "testnet" | "mainnet";
}) {
  return (
    <Link
      href={stellarExpertTxUrl(hash, network)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-bright transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-accent rounded"
      aria-label={`View transaction ${truncateHash(hash)} on Stellar Explorer (opens in new tab)`}
    >
      <span className="font-mono">{truncateHash(hash)}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </Link>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export function TransactionHistorySkeleton() {
  return (
    <div
      className="card-surface overflow-hidden"
      aria-busy="true"
      aria-label="Loading transactions…"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--color-slate-border)" }}
      >
        <div
          className="h-5 w-40 rounded animate-pulse"
          style={{ background: "rgba(36,53,84,0.8)" }}
        />
        <div
          className="h-5 w-20 rounded animate-pulse"
          style={{ background: "rgba(36,53,84,0.6)" }}
        />
      </div>

      {/* Rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4 animate-pulse"
          style={{ borderBottom: "1px solid rgba(36,53,84,0.5)" }}
        >
          <div
            className="w-8 h-8 rounded-full shrink-0"
            style={{ background: "rgba(36,53,84,0.8)" }}
          />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div
              className="h-4 rounded w-3/5"
              style={{ background: "rgba(36,53,84,0.8)" }}
            />
            <div
              className="h-3 rounded w-2/5"
              style={{ background: "rgba(36,53,84,0.6)" }}
            />
          </div>
          <div
            className="h-4 rounded w-24 shrink-0"
            style={{ background: "rgba(36,53,84,0.7)" }}
          />
          <div
            className="h-5 rounded-full w-20 shrink-0"
            style={{ background: "rgba(36,53,84,0.6)" }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "rgba(61,169,252,0.08)" }}
        aria-hidden
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--color-accent)" }}
        >
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-white mb-1">
        {filtered ? "No matching transactions" : "No transactions yet"}
      </h3>
      <p className="text-sm text-text-muted max-w-xs mb-5">
        {filtered
          ? "Try adjusting or clearing your filters."
          : "Transactions will appear here once you fund an escrow or receive a payment."}
      </p>
      {filtered && (
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent"
          style={{ background: "var(--color-accent)" }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransactionHistoryProps {
  transactions: Transaction[];
  /** Stellar network — used to build correct explorer links */
  network?: "testnet" | "mainnet";
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TransactionHistory
 *
 * Renders a filterable, scrollable table of Stellar-backed payment events.
 * Each row with an on-chain tx hash links to stellar.expert.
 */
export default function TransactionHistory({
  transactions,
  network = "testnet",
}: TransactionHistoryProps) {
  // ── Filter state ───────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [assetFilter, setAssetFilter] = useState<AssetCode | "">("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "">("");

  // ── Derived state ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter && tx.type !== typeFilter) return false;
      if (assetFilter && tx.asset !== assetFilter) return false;
      if (statusFilter && tx.status !== statusFilter) return false;
      return true;
    });
  }, [transactions, typeFilter, assetFilter, statusFilter]);

  const isFiltered = typeFilter !== "" || assetFilter !== "" || statusFilter !== "";

  function clearFilters() {
    setTypeFilter("");
    setAssetFilter("");
    setStatusFilter("");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section aria-labelledby="tx-history-heading" className="card-surface overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid var(--color-slate-border)" }}
      >
        <div>
          <h2
            id="tx-history-heading"
            className="text-base font-semibold text-white"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Transaction History
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {filtered.length} of {transactions.length} transaction
            {transactions.length !== 1 ? "s" : ""}
            {isFiltered ? " shown" : ""}
          </p>
        </div>

        {/* Filters */}
        <div
          className="flex flex-wrap gap-2 items-center"
          role="group"
          aria-label="Filter transactions"
        >
          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | "")}
            aria-label="Filter by type"
            className="rounded-md border bg-navy-mid px-2.5 py-1.5 text-xs text-text-primary appearance-none cursor-pointer outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent"
            style={{ borderColor: "var(--color-slate-border)" }}
          >
            {TYPE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Asset */}
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value as AssetCode | "")}
            aria-label="Filter by asset"
            className="rounded-md border bg-navy-mid px-2.5 py-1.5 text-xs text-text-primary appearance-none cursor-pointer outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent"
            style={{ borderColor: "var(--color-slate-border)" }}
          >
            {ASSET_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | "")}
            aria-label="Filter by status"
            className="rounded-md border bg-navy-mid px-2.5 py-1.5 text-xs text-text-primary appearance-none cursor-pointer outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent"
            style={{ borderColor: "var(--color-slate-border)" }}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Clear */}
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-white border transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent"
              style={{ borderColor: "var(--color-slate-border)" }}
              aria-label="Clear all filters"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table (desktop) / List (mobile) ───────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState filtered={isFiltered} onClear={clearFilters} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm" aria-label="Transaction history">
              <thead>
                <tr
                  className="text-xs font-medium text-text-muted uppercase tracking-wider"
                  style={{ borderBottom: "1px solid var(--color-slate-border)" }}
                >
                  <th className="px-5 py-3 text-left w-44">Date</th>
                  <th className="px-3 py-3 text-left">Description</th>
                  <th className="px-3 py-3 text-left w-40">Type</th>
                  <th className="px-3 py-3 text-right w-36">Amount</th>
                  <th className="px-3 py-3 text-center w-28">Status</th>
                  <th className="px-5 py-3 text-left w-36">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, idx) => {
                  const credit = isCredit(tx);
                  const amountColor = credit
                    ? "var(--color-success)"
                    : tx.status === "FAILED"
                      ? "var(--color-error)"
                      : "var(--color-text-muted)";

                  return (
                    <tr
                      key={tx.id}
                      className="group transition-colors duration-100 hover:bg-white/[0.02]"
                      style={
                        idx < filtered.length - 1
                          ? { borderBottom: "1px solid rgba(36,53,84,0.6)" }
                          : undefined
                      }
                    >
                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <time
                          dateTime={tx.createdAt}
                          title={formatDate(tx.createdAt)}
                          className="text-xs text-text-muted"
                        >
                          {timeAgo(tx.createdAt)}
                        </time>
                      </td>

                      {/* Description */}
                      <td className="px-3 py-3.5 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: credit
                                ? "rgba(45,212,191,0.1)"
                                : "rgba(123,144,178,0.1)",
                              color: credit
                                ? "var(--color-success)"
                                : "var(--color-text-muted)",
                            }}
                          >
                            <TxTypeIcon type={tx.type} />
                          </span>
                          <span className="text-text-primary truncate max-w-[240px]">
                            {tx.description}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3.5">
                        <span className="text-xs text-text-muted">
                          {TRANSACTION_TYPE_LABELS[tx.type]}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-3.5 text-right">
                        <span
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: amountColor }}
                        >
                          {formatTxAmount(tx.amount, tx.asset)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center">
                        <StatusBadge status={tx.status} />
                      </td>

                      {/* Tx hash → explorer */}
                      <td className="px-5 py-3.5">
                        {tx.stellarTxHash ? (
                          <ExplorerLink hash={tx.stellarTxHash} network={network} />
                        ) : (
                          <span className="text-xs text-text-muted/50">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="md:hidden divide-y" style={{ borderColor: "rgba(36,53,84,0.6)" }} aria-label="Transaction history">
            {filtered.map((tx) => {
              const credit = isCredit(tx);
              const amountColor = credit
                ? "var(--color-success)"
                : tx.status === "FAILED"
                  ? "var(--color-error)"
                  : "var(--color-text-muted)";

              return (
                <li key={tx.id} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5"
                      style={{
                        background: credit
                          ? "rgba(45,212,191,0.1)"
                          : "rgba(123,144,178,0.1)",
                        color: credit
                          ? "var(--color-success)"
                          : "var(--color-text-muted)",
                      }}
                    >
                      <TxTypeIcon type={tx.type} />
                    </span>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm text-text-primary font-medium truncate">
                          {tx.description}
                        </p>
                        <span
                          className="text-sm font-semibold tabular-nums shrink-0"
                          style={{ color: amountColor }}
                        >
                          {formatTxAmount(tx.amount, tx.asset)}
                        </span>
                      </div>

                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                        <span className="text-xs text-text-muted">
                          {TRANSACTION_TYPE_LABELS[tx.type]}
                        </span>
                        <span className="text-text-muted/40 text-xs">·</span>
                        <time
                          dateTime={tx.createdAt}
                          title={formatDate(tx.createdAt)}
                          className="text-xs text-text-muted"
                        >
                          {timeAgo(tx.createdAt)}
                        </time>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={tx.status} />
                        {tx.stellarTxHash && (
                          <ExplorerLink hash={tx.stellarTxHash} network={network} />
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
