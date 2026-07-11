"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import TransactionHistory, {
  TransactionHistorySkeleton,
} from "@/components/payments/TransactionHistory";
import {
  fetchWalletBalances,
  fetchTransactions,
  formatBalance,
  type WalletBalance,
  type AssetCode,
} from "@/lib/api/payments";

// ─── Balance card ─────────────────────────────────────────────────────────────

function BalanceCard({ balance }: { balance: WalletBalance }) {
  const isXLM = balance.asset === "XLM";

  return (
    <div
      className="card-surface p-5 flex flex-col gap-3"
      aria-label={`${balance.asset} balance`}
    >
      {/* Asset header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Asset icon */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
            style={{
              background: isXLM
                ? "rgba(61,169,252,0.12)"
                : "rgba(45,212,191,0.12)",
            }}
            aria-hidden
          >
            {isXLM ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--color-accent)" }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--color-success)" }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5H9" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted">
              {balance.asset}
            </p>
            <p
              className="text-xs font-medium capitalize"
              style={{ color: "rgba(123,144,178,0.6)" }}
            >
              {balance.network}
            </p>
          </div>
        </div>

        {/* Network badge */}
        {balance.network === "testnet" && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              background: "rgba(245,158,11,0.1)",
              color: "var(--color-warning)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            Testnet
          </span>
        )}
      </div>

      {/* Balance amount */}
      <div>
        <p
          className="text-2xl font-semibold tabular-nums"
          style={{
            fontFamily: "var(--font-space-grotesk)",
            color: isXLM ? "var(--color-accent)" : "var(--color-success)",
          }}
        >
          {formatBalance(balance.balance, balance.asset as AssetCode)}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{balance.asset}</p>
      </div>
    </div>
  );
}

// ─── Balance skeleton ─────────────────────────────────────────────────────────

function BalanceCardSkeleton() {
  return (
    <div className="card-surface p-5 animate-pulse" aria-hidden>
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-8 h-8 rounded-full"
          style={{ background: "rgba(36,53,84,0.8)" }}
        />
        <div className="space-y-1.5">
          <div
            className="h-3 w-10 rounded"
            style={{ background: "rgba(36,53,84,0.8)" }}
          />
          <div
            className="h-3 w-14 rounded"
            style={{ background: "rgba(36,53,84,0.6)" }}
          />
        </div>
      </div>
      <div
        className="h-7 w-32 rounded mb-1"
        style={{ background: "rgba(36,53,84,0.8)" }}
      />
      <div
        className="h-3 w-10 rounded"
        style={{ background: "rgba(36,53,84,0.6)" }}
      />
    </div>
  );
}

// ─── Withdraw modal ───────────────────────────────────────────────────────────

interface WithdrawModalProps {
  balances: WalletBalance[];
  onClose: () => void;
}

function WithdrawModal({ balances, onClose }: WithdrawModalProps) {
  const [asset, setAsset] = useState<AssetCode>("USDC");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBalance = balances.find((b) => b.asset === asset);
  const maxAmount = selectedBalance ? parseFloat(selectedBalance.balance) : 0;
  const parsedAmount = parseFloat(amount);
  const amountInvalid =
    amount !== "" && (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > maxAmount);
  const addressInvalid =
    address !== "" && (address.length < 56 || !address.startsWith("G"));

  function handleSetMax() {
    if (selectedBalance) {
      setAmount(parseFloat(selectedBalance.balance).toFixed(asset === "XLM" ? 4 : 2));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !address || amountInvalid || addressInvalid) return;

    setIsSubmitting(true);
    try {
      // TODO: call initiateWithdrawal({ asset, amount, destinationAddress: address })
      await new Promise((r) => setTimeout(r, 1200)); // simulate
      toast.success(`Withdrawal of ${amount} ${asset} initiated successfully.`);
      onClose();
    } catch {
      toast.error("Withdrawal failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(11,30,61,0.8)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="relative card-surface w-full max-w-md p-6"
        style={{ zIndex: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            id="withdraw-dialog-title"
            className="text-lg font-semibold text-white"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Withdraw Funds
          </h2>
          <button
            onClick={onClose}
            aria-label="Close withdraw dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Asset selector */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="withdraw-asset" className="text-xs font-medium text-text-muted">
              Asset
            </label>
            <select
              id="withdraw-asset"
              value={asset}
              onChange={(e) => { setAsset(e.target.value as AssetCode); setAmount(""); }}
              className="rounded-md border bg-navy-mid px-3 py-2 text-sm text-text-primary appearance-none cursor-pointer outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              style={{ borderColor: "var(--color-slate-border)" }}
            >
              {balances.map((b) => (
                <option key={b.asset} value={b.asset}>
                  {b.asset} — {formatBalance(b.balance, b.asset as AssetCode)} available
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="withdraw-amount" className="text-xs font-medium text-text-muted">
                Amount
              </label>
              <button
                type="button"
                onClick={handleSetMax}
                className="text-xs text-accent hover:text-accent-bright transition-colors focus-visible:ring-1 focus-visible:ring-accent rounded"
              >
                Max
              </button>
            </div>
            <input
              id="withdraw-amount"
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              aria-invalid={amountInvalid}
              aria-describedby={amountInvalid ? "withdraw-amount-error" : undefined}
              className="rounded-md border bg-navy-mid px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              style={{
                borderColor: amountInvalid ? "var(--color-error)" : "var(--color-slate-border)",
              }}
            />
            {amountInvalid && (
              <p id="withdraw-amount-error" className="text-xs" style={{ color: "var(--color-error)" }}>
                {parsedAmount > maxAmount
                  ? `Insufficient balance. Max: ${formatBalance(selectedBalance!.balance, asset)} ${asset}`
                  : "Enter a valid amount greater than 0"}
              </p>
            )}
          </div>

          {/* Destination address */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="withdraw-address" className="text-xs font-medium text-text-muted">
              Destination Stellar Address
            </label>
            <input
              id="withdraw-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              placeholder="G…"
              spellCheck={false}
              aria-invalid={addressInvalid}
              aria-describedby={addressInvalid ? "withdraw-address-error" : undefined}
              className="rounded-md border bg-navy-mid px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              style={{
                borderColor: addressInvalid ? "var(--color-error)" : "var(--color-slate-border)",
              }}
            />
            {addressInvalid && (
              <p id="withdraw-address-error" className="text-xs" style={{ color: "var(--color-error)" }}>
                Enter a valid Stellar address starting with G (56 characters)
              </p>
            )}
          </div>

          {/* Note */}
          <p className="text-xs text-text-muted rounded-md p-3" style={{ background: "rgba(36,53,84,0.5)" }}>
            Withdrawals are processed on the Stellar network. Settlement typically takes ~5 seconds.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-text-muted border transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
              style={{ borderColor: "var(--color-slate-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || !address || amountInvalid || addressInvalid}
              className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--color-accent)" }}
            >
              {isSubmitting ? "Processing…" : "Withdraw"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Fund escrow modal ────────────────────────────────────────────────────────

interface FundEscrowModalProps {
  balances: WalletBalance[];
  onClose: () => void;
}

function FundEscrowModal({ balances, onClose }: FundEscrowModalProps) {
  const [asset, setAsset] = useState<AssetCode>("USDC");
  const [amount, setAmount] = useState("");
  const [contractId, setContractId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBalance = balances.find((b) => b.asset === asset);
  const maxAmount = selectedBalance ? parseFloat(selectedBalance.balance) : 0;
  const parsedAmount = parseFloat(amount);
  const amountInvalid =
    amount !== "" && (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > maxAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !contractId || amountInvalid) return;

    setIsSubmitting(true);
    try {
      // TODO: call Soroban fund() via stellarService
      await new Promise((r) => setTimeout(r, 1200)); // simulate
      toast.success(`Escrow funded with ${amount} ${asset}.`);
      onClose();
    } catch {
      toast.error("Failed to fund escrow. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fund-escrow-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(11,30,61,0.8)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative card-surface w-full max-w-md p-6" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            id="fund-escrow-dialog-title"
            className="text-lg font-semibold text-white"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Fund Escrow
          </h2>
          <button
            onClick={onClose}
            aria-label="Close fund escrow dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Contract ID */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="escrow-contract" className="text-xs font-medium text-text-muted">
              Contract ID
            </label>
            <input
              id="escrow-contract"
              type="text"
              value={contractId}
              onChange={(e) => setContractId(e.target.value.trim())}
              placeholder="ctr_…"
              className="rounded-md border bg-navy-mid px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              style={{ borderColor: "var(--color-slate-border)" }}
            />
          </div>

          {/* Asset */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="escrow-asset" className="text-xs font-medium text-text-muted">
              Asset
            </label>
            <select
              id="escrow-asset"
              value={asset}
              onChange={(e) => { setAsset(e.target.value as AssetCode); setAmount(""); }}
              className="rounded-md border bg-navy-mid px-3 py-2 text-sm text-text-primary appearance-none cursor-pointer outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              style={{ borderColor: "var(--color-slate-border)" }}
            >
              {balances.map((b) => (
                <option key={b.asset} value={b.asset}>
                  {b.asset} — {formatBalance(b.balance, b.asset as AssetCode)} available
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="escrow-amount" className="text-xs font-medium text-text-muted">
              Amount
            </label>
            <input
              id="escrow-amount"
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              aria-invalid={amountInvalid}
              aria-describedby={amountInvalid ? "escrow-amount-error" : undefined}
              className="rounded-md border bg-navy-mid px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              style={{
                borderColor: amountInvalid ? "var(--color-error)" : "var(--color-slate-border)",
              }}
            />
            {amountInvalid && (
              <p id="escrow-amount-error" className="text-xs" style={{ color: "var(--color-error)" }}>
                {parsedAmount > maxAmount
                  ? `Insufficient balance. Max: ${formatBalance(selectedBalance!.balance, asset)} ${asset}`
                  : "Enter a valid amount greater than 0"}
              </p>
            )}
          </div>

          {/* Note */}
          <p className="text-xs text-text-muted rounded-md p-3" style={{ background: "rgba(36,53,84,0.5)" }}>
            Funds will be locked in the Soroban escrow contract and held until the milestone is approved or a dispute is resolved.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-text-muted border transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
              style={{ borderColor: "var(--color-slate-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || !contractId || amountInvalid}
              className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--color-success)" }}
            >
              {isSubmitting ? "Funding…" : "Fund Escrow"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Payments Page ────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showFundEscrow, setShowFundEscrow] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: balances,
    isLoading: balancesLoading,
    isError: balancesError,
    refetch: refetchBalances,
  } = useQuery({
    queryKey: ["payments", "balances"],
    queryFn: fetchWalletBalances,
    meta: { onError: () => toast.error("Failed to load wallet balances.") },
  });

  const {
    data: transactions,
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTx,
  } = useQuery({
    queryKey: ["payments", "transactions"],
    queryFn: fetchTransactions,
    meta: { onError: () => toast.error("Failed to load transactions.") },
  });

  const network = balances?.[0]?.network ?? "testnet";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Modals */}
      {showWithdraw && balances && (
        <WithdrawModal
          balances={balances}
          onClose={() => setShowWithdraw(false)}
        />
      )}
      {showFundEscrow && balances && (
        <FundEscrowModal
          balances={balances}
          onClose={() => setShowFundEscrow(false)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-semibold text-white mb-1"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              Payments
            </h1>
            <p className="text-sm text-text-muted">
              Manage your Stellar wallet, escrow funding, and payment history.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowFundEscrow(true)}
              disabled={balancesLoading || balancesError || !balances}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white border transition-colors duration-150 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: "var(--color-slate-border)" }}
              aria-label="Fund escrow contract"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Fund Escrow
            </button>

            <button
              onClick={() => setShowWithdraw(true)}
              disabled={balancesLoading || balancesError || !balances}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--color-accent)" }}
              aria-label="Withdraw funds"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              Withdraw
            </button>
          </div>
        </div>

        {/* ── Wallet balances ───────────────────────────────────────────────── */}
        <section aria-labelledby="balances-heading">
          <h2
            id="balances-heading"
            className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wider"
          >
            Wallet Balances
          </h2>

          {balancesError ? (
            <div
              className="card-surface p-5 flex items-center gap-3"
              role="alert"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--color-error)", flexShrink: 0 }}
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">
                  Failed to load balances
                </p>
                <p className="text-xs text-text-muted">
                  Could not reach the server.
                </p>
              </div>
              <button
                onClick={() => refetchBalances()}
                className="text-xs text-accent hover:text-accent-bright transition-colors focus-visible:ring-1 focus-visible:ring-accent rounded shrink-0"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {balancesLoading || !balances
                ? Array.from({ length: 2 }).map((_, i) => (
                    <BalanceCardSkeleton key={i} />
                  ))
                : balances.map((b) => (
                    <BalanceCard key={b.asset} balance={b} />
                  ))}
            </div>
          )}
        </section>

        {/* ── Network notice ────────────────────────────────────────────────── */}
        {network === "testnet" && !balancesLoading && !balancesError && (
          <div
            className="flex items-start gap-3 rounded-md p-3.5 text-sm"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
            role="note"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }}
              aria-hidden
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ color: "var(--color-warning)" }}>
              <strong>Testnet mode.</strong>{" "}
              <span className="font-normal opacity-90">
                All balances and transactions are on the Stellar Testnet. No real funds are involved.
              </span>
            </span>
          </div>
        )}

        {/* ── Transaction history ───────────────────────────────────────────── */}
        {txError ? (
          <div
            className="card-surface p-8 flex flex-col items-center text-center gap-3"
            role="alert"
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
              style={{ color: "var(--color-error)" }}
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-medium text-white mb-1">
                Failed to load transaction history
              </p>
              <p className="text-xs text-text-muted mb-4">
                Please check your connection and try again.
              </p>
              <button
                onClick={() => refetchTx()}
                className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-accent"
                style={{ background: "var(--color-accent)" }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : txLoading || !transactions ? (
          <TransactionHistorySkeleton />
        ) : (
          <TransactionHistory transactions={transactions} network={network} />
        )}

        {/* ── Explorer link ─────────────────────────────────────────────────── */}
        {!balancesLoading && !balancesError && (
          <p className="text-xs text-center text-text-muted pb-2">
            All on-chain activity is verifiable on{" "}
            <a
              href={`https://stellar.expert/explorer/${network === "mainnet" ? "public" : "testnet"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-bright transition-colors underline underline-offset-2"
            >
              stellar.expert
            </a>
            {network === "testnet" && " (Testnet)"}
            .
          </p>
        )}

      </div>
    </>
  );
}
