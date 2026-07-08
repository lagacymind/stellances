"use client";

import { useState } from "react";
import * as StellarSdk from "stellar-sdk";

export default function DemoPage() {
  const [keypair, setKeypair] = useState<null | { publicKey: string; secret: string }>(null);
  const [funded, setFunded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function createKeypair() {
    const pair = StellarSdk.Keypair.random();
    setKeypair({ publicKey: pair.publicKey(), secret: pair.secret() });
    setFunded(false);
    setStatus("Keypair created. Ready to fund via Friendbot.");
    setTxHash(null);
  }

  async function fundWithFriendbot() {
    if (!keypair) return;
    setStatus("Funding via Friendbot...");
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(keypair.publicKey)}`);
      const body = await res.json();
      if (res.ok) {
        setFunded(true);
        setStatus("Account funded on testnet.");
      } else {
        setStatus(`Friendbot error: ${JSON.stringify(body)}`);
      }
    } catch (err: unknown) {
      setStatus(String(err));
    }
  }

  async function sendPayment() {
    if (!keypair) return;
    setStatus("Preparing transaction...");
    try {
      const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
      const sourceKeypair = StellarSdk.Keypair.fromSecret(keypair.secret);
      const account = await server.loadAccount(sourceKeypair.publicKey());

      // Create a temporary recipient
      const recipient = StellarSdk.Keypair.random();

      // For demo, fund recipient so it exists (friendbot)
      await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(recipient.publicKey())}`);

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
      setStatus("Payment submitted — transaction confirmed on testnet.");
    } catch (err: unknown) {
      setStatus(String(err));
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-foreground p-8">
      <main className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Stellance Testnet Demo</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Create a testnet keypair, fund it with Friendbot, and send a 1 XLM demo payment.</p>

        <div className="mt-6 flex gap-2">
          <button onClick={createKeypair} className="rounded bg-foreground px-4 py-2 text-background">Create Keypair</button>
          <button onClick={fundWithFriendbot} disabled={!keypair || funded} className="rounded border px-4 py-2" >Fund (Friendbot)</button>
          <button onClick={sendPayment} disabled={!funded} className="rounded border px-4 py-2">Send 1 XLM</button>
        </div>

        <div className="mt-6 space-y-2 text-sm">
          {keypair && (
            <div>
              <strong>Public Key:</strong>
              <div className="break-all">{keypair.publicKey}</div>
              <strong>Secret (keep private):</strong>
              <div className="break-all">{keypair.secret}</div>
            </div>
          )}

          {status && (
            <div>
              <strong>Status:</strong>
              <div>{status}</div>
            </div>
          )}

          {txHash && (
            <div>
              <strong>Transaction Hash:</strong>
              <div className="break-all">{txHash}</div>
            </div>
          )}
        </div>

        <p className="mt-8 text-xs text-zinc-500">This demo uses the Stellar testnet and Friendbot; do not use real funds.</p>
      </main>
    </div>
  );
}
