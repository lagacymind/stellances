import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    // Each auth page (login, register) exports its own title string.
    // `default` here is the fallback if a nested segment has no title —
    // using the site name keeps it sensible rather than empty.
    default: "Stellance",
    template: "%s | Stellance",
  },
};

/**
 * Shared chrome for all auth pages (login, register, forgot-password).
 *
 * Renders a vertically-centred, full-height column with a subtle branded
 * background so the card floats cleanly on top.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-navy">
      {/* Ambient glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Stellance wordmark */}
      <Link
        href="/"
        className="relative mb-8 flex items-center gap-2 text-xl font-semibold tracking-tight text-white font-heading"
      >
        <span className="gradient-text">Stellance</span>
      </Link>

      <main className="relative w-full max-w-md">{children}</main>

      <p className="mt-8 text-xs text-text-muted">
        © {new Date().getFullYear()} Stellance. All rights reserved.
      </p>
    </div>
  );
}
