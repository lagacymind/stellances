"use client";

import { useState } from "react";
import * as StellarSdk from "stellar-sdk";

// ---------------------------------------------------------------------------
// Small copy-to-clipboard button
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (non-HTTPS or permissions denied)
    }
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      className="ml-2 rounded px-2 py-0.5 text-xs border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Key field: monospace, truncated by default, reveal on demand
// ---------------------------------------------------------------------------

function KeyField({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const display = secret && !revealed ? "•".repeat(Math.min(value.length, 56)) : value;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          {label}
        </span>
        {secret && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
            aria-label={revealed ? "Hide secret key" : "Reveal secret key"}
          >
            {revealed ? "Hide" : "Reveal"}
          </button>
        )}
        <CopyButton text={value} />
      </div>
      <code
        className="block break-all rounded bg-zinc-100 dark:bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 select-all"
        aria-label={`${label} value`}
      >
        {display}
      </code>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo page
// ---------------------------------------------------------------------------

export default function DemoPage() {
  const [keypair, setKeypair] = useState<null | {
    publicKey: string;
    secret: string;
  }>(null);
  const [funded, setFunded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createKeypair() {
    const pair = StellarSdk.Keypair.random();
    setKeypair({ publicKey: pair.publicKey(), secret: pair.secret() });
    setFunded(false);
    setStatus("Keypair generated. Fund it with Friendbot before sending.");
    setTxHash(null);
  }

  async function fundWithFriendbot() {
    if (!keypair) return;
    setLoading(true);
    setStatus("Requesting Friendbot funding…");
    try {
      const res = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(keypair.publicKey)}`
      );
      const body = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        setFunded(true);
        setStatus("Account funded on testnet — ready to send.");
      } else {
        setStatus(`Friendbot error: ${JSON.stringify(body)}`);
      }
    } catch (err: unknown) {
      setStatus(`Network error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function sendPayment() {
    if (!keypair) return;
    setLoading(true);
    setStatus("Building transaction…");
    try {
      const server = new StellarSdk.Server(
        "https://horizon-testnet.stellar.org"
      );
      const sourceKeypair = StellarSdk.Keypair.fromSecret(keypair.secret);
      const account = await server.loadAccount(sourceKeypair.publicKey());

      // Fund a fresh recipient so it has an account entry on testnet
      const recipient = StellarSdk.Keypair.random();
      await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(recipient.publicKey())}`
      );

      const fee = await server.fetchBaseFee();
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: recipient.publicKey(),
            asset: StellarSdk.Asset.native(),
            amount: "1",
          })
        )
        .setTimeout(30)
        .build();

      tx.sign(sourceKeypair);
      const res = await server.submitTransaction(tx);
      setTxHash(res.hash);
      setStatus("1 XLM sent — transaction confirmed on Stellar testnet.");
    } catch (err: unknown) {
      setStatus(`Transaction failed: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-foreground p-8">
      <main className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Stellance Testnet Demo</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Generate a throwaway Stellar keypair, fund it via Friendbot, and
            send a real 1 XLM payment on the Stellar testnet.
          </p>
        </div>

        {/* Testnet-only banner */}
        <div
          role="note"
          className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          <strong>Testnet only.</strong> This demo uses Stellar&apos;s public
          testnet and Friendbot. Do not use real funds or your production secret
          key here.
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={createKeypair}
            disabled={loading}
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            1. Generate Keypair
          </button>
          <button
            onClick={fundWithFriendbot}
            disabled={!keypair || funded || loading}
            className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            2. Fund via Friendbot
          </button>
          <button
            onClick={sendPayment}
            disabled={!funded || loading}
            className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            3. Send 1 XLM
          </button>
        </div>

        {/* Keypair display */}
        {keypair && (
          <section
            aria-label="Generated keypair"
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-4 space-y-1"
          >
            <h2 className="text-sm font-semibold mb-2">Generated Keypair</h2>
            <KeyField label="Public Key" value={keypair.publicKey} />
            <KeyField label="Secret Key" value={keypair.secret} secret />
            {/* Explicit warning next to the secret key */}
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              ⚠️ Never share a secret key or paste it into any site. This key
              is for demo purposes only — discard it after use.
            </p>
          </section>
        )}

        {/* Status */}
        {status && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md bg-zinc-100 dark:bg-zinc-900 px-4 py-3 text-sm"
          >
            <span className="font-medium">Status: </span>
            {status}
          </div>
        )}

        {/* Transaction hash */}
        {txHash && (
          <section aria-label="Transaction result" className="space-y-1">
            <KeyField label="Transaction Hash" value={txHash} />
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View on stellar.expert ↗
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
