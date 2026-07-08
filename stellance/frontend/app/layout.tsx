import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { Toaster } from "sonner";
import QueryProvider from "./providers/QueryProvider";
import "./globals.css";


const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "Stellance",
    template: "%s | Stellance",
  },
  description:
    "A Stellar-powered freelance payment marketplace for instant escrow and on-chain payouts.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://stellance.app"
  ),
  openGraph: {
    type: "website",
    siteName: "Stellance",
    title: "Stellance — Instant Escrow & On-Chain Freelance Payments",
    description:
      "Connect with top freelancers. Pay only for approved work. Instant settlement on the Stellar network.",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Stellance — Stellar-powered freelance marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stellance — Instant Escrow & On-Chain Freelance Payments",
    description:
      "Connect with top freelancers. Pay only for approved work. Instant settlement on the Stellar network.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}
      >
        <QueryProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1B2A4A",
                color: "#C8D6E5",
                border: "1px solid #3DA9FC33",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
