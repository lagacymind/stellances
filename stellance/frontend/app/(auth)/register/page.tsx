import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

// ─── Metadata ─────────────────────────────────────────────────────────────────
// The auth layout sets template: "%s | Stellance", so the browser title
// becomes "Create Account | Stellance".

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Sign up for Stellance and choose your role — freelancer or client — to start using instant on-chain escrow payments.",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  return <RegisterForm />;
}
