import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

// ─── Metadata ─────────────────────────────────────────────────────────────────
// Auth layout sets template: "%s | Stellance" → "Sign In | Stellance".

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Stellance account.",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return <LoginForm />;
}
