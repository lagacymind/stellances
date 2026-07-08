import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div style={{ backgroundColor: "#0B1E3D", color: "#C8D6E5", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #152D4E" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Image src="/logo.png" alt="Stellance" width={28} height={28} style={{ borderRadius: "6px" }} />
            <span style={{ fontFamily: "var(--font-space-grotesk)", color: "#fff", fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
              Stellance
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-6 md:gap-8 text-sm" style={{ color: "#6B8BAD" }}>
            <a href="#problem" className="hover:text-white transition-colors">Problem</a>
            <a href="#how-it-works" className="hover:text-white transition-colors hidden md:inline">How it works</a>
            <a href="#builders" className="hover:text-white transition-colors hidden md:inline">Builders</a>
            <a href="https://github.com/alone-in/stellances" target="_blank" rel="noreferrer" className="hover:text-white transition-colors" style={{ color: "#6B8BAD" }}>
              ↗ GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 lg:pt-28 pb-12 sm:pb-16 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center mb-10 sm:mb-14">
          <div>
            <p className="text-sm mb-4 sm:mb-5" style={{ color: "#3DA9FC", letterSpacing: "0.02em" }}>
              Stellar network · Testnet live · Open source
            </p>
            <h1
              style={{
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "clamp(2.2rem, 6vw, 4rem)",
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                color: "#fff",
                marginBottom: "1.25rem",
              }}
            >
              Freelancers get paid<br />
              the moment work<br />
              <span style={{ color: "#3DA9FC" }}>is approved.</span>
            </h1>
            <p style={{ fontSize: "clamp(1rem, 2vw, 1.1rem)", lineHeight: 1.7, color: "#7A9BBE", maxWidth: "36rem" }}>
              On-chain escrow on Stellar holds funds until a milestone is approved — then releases them instantly. No invoice cycles, no platform float, no 20% cut.
            </p>
          </div>
          <div className="hidden lg:block">
            <Image
              src="/free.jpeg"
              alt="Freelancer working"
              width={600}
              height={480}
              style={{ width: "100%", height: "auto", borderRadius: "10px", objectFit: "cover" }}
              priority
            />
          </div>
        </div>

        {/* Mobile: show image between text and CTAs */}
        <div className="block lg:hidden mb-8">
          <Image
            src="/free.jpeg"
            alt="Freelancer working"
            width={600}
            height={360}
            style={{ width: "100%", height: "auto", borderRadius: "10px", objectFit: "cover", maxHeight: "260px" }}
          />
        </div>

        {/* CTAs + receipt */}
        <div className="grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-16 items-start">
          <div className="flex flex-row sm:flex-row lg:flex-col gap-3">
            <Link
              href="/demo"
              className="flex-1 lg:flex-none"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                backgroundColor: "#3DA9FC", color: "#0B1E3D", fontWeight: 600,
                fontSize: "0.875rem", padding: "0.75rem 1.25rem", borderRadius: "6px",
                textDecoration: "none", whiteSpace: "nowrap",
              }}
            >
              Try testnet demo <span>→</span>
            </Link>
            <a
              href="https://github.com/alone-in/stellances"
              target="_blank" rel="noreferrer"
              className="flex-1 lg:flex-none"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                border: "1px solid #1E3A5F", color: "#7A9BBE",
                fontSize: "0.875rem", padding: "0.75rem 1.25rem", borderRadius: "6px",
                textDecoration: "none", whiteSpace: "nowrap",
              }}
            >
              View on GitHub ↗
            </a>
          </div>

          {/* Transaction receipt — desktop only */}
          <div
            className="hidden lg:block"
            style={{
              fontFamily: "var(--font-geist-mono), 'Courier New', monospace",
              fontSize: "0.78rem", lineHeight: 1.6,
              backgroundColor: "#081628", border: "1px solid #152D4E",
              borderRadius: "8px", padding: "1.5rem 1.75rem",
              maxWidth: "480px", color: "#5E7E9E",
            }}
          >
            <div style={{ marginBottom: "0.75rem", color: "#3DA9FC" }}># stellar testnet · escrow tx</div>
            <div className="space-y-1">
              <div><span style={{ color: "#3E5F80" }}>from     </span><span style={{ color: "#C8D6E5" }}>GCLIENT...4X2K</span></div>
              <div><span style={{ color: "#3E5F80" }}>to escrow</span><span style={{ color: "#C8D6E5" }}>GESCROW...9RMN</span></div>
              <div><span style={{ color: "#3E5F80" }}>amount   </span><span style={{ color: "#fff" }}>1,200 XLM</span></div>
              <div><span style={{ color: "#3E5F80" }}>condition</span><span style={{ color: "#C8D6E5" }}>milestone_approved</span></div>
              <div><span style={{ color: "#3E5F80" }}>status   </span><span style={{ color: "#5EE7FF" }}>● locked</span></div>
            </div>
            <div style={{ margin: "1rem 0", borderTop: "1px solid #152D4E" }} />
            <div className="space-y-1">
              <div><span style={{ color: "#3E5F80" }}>event    </span><span style={{ color: "#C8D6E5" }}>client_approved</span></div>
              <div><span style={{ color: "#3E5F80" }}>released </span><span style={{ color: "#fff" }}>1,200 XLM → GFREELANCER...7WQ</span></div>
              <div><span style={{ color: "#3E5F80" }}>ledger   </span><span style={{ color: "#C8D6E5" }}>48291774</span></div>
              <div><span style={{ color: "#3E5F80" }}>settled  </span><span style={{ color: "#3DA9FC" }}>4.8s after approval</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" style={{ borderTop: "1px solid #152D4E" }} className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#3DA9FC", marginBottom: "2.5rem" }}>
            The problem
          </p>
          {/* Mobile: stacked with bottom borders. Desktop: side-by-side with right borders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ borderTop: "1px solid #152D4E" }}>
            {[
              { n: "01", heading: "You wait.\nA lot.", body: "Invoices sit in approval queues for days or weeks. The work is done. The payment isn't." },
              { n: "02", heading: "The platform\ntakes its cut.", body: "20–30% gone before you see a dollar. Every transaction, every time." },
              { n: "03", heading: "No guarantee\nfor either side.", body: "Clients pay blind. Freelancers deliver blind. Someone always takes on the risk." },
              { n: "04", heading: "Milestones\ndon't scale.", body: "Splitting a project into smaller payments is slow, expensive, and easy to dispute." },
            ].map((item) => (
              <div
                key={item.n}
                style={{ padding: "2rem 1.5rem sm:2.5rem sm:2rem", borderBottom: "1px solid #152D4E" }}
                className={[
                  "p-6 sm:p-8",
                  "border-b border-[#152D4E]",
                  // right border on sm: odd items (0,2), all on lg except last
                  "sm:even:border-r-0 sm:odd:border-r sm:border-r-[#152D4E]",
                  "lg:border-b-0 lg:border-r lg:border-r-[#152D4E] lg:last:border-r-0",
                ].join(" ")}
              >
                <p style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "3rem", fontWeight: 700, color: "#152D4E", lineHeight: 1, marginBottom: "1rem", letterSpacing: "-0.04em" }}>
                  {item.n}
                </p>
                <h3 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "1rem", fontWeight: 600, color: "#E0ECF8", lineHeight: 1.3, marginBottom: "0.75rem", whiteSpace: "pre-line" }}>
                  {item.heading}
                </h3>
                <p style={{ fontSize: "0.85rem", lineHeight: 1.65, color: "#6B8BAD" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ borderTop: "1px solid #152D4E", backgroundColor: "#091929" }} className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-[260px_1fr] gap-10 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-8">
              <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#3DA9FC", marginBottom: "1rem" }}>How it works</p>
              <h2 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(1.6rem, 3vw, 2rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "0.75rem" }}>
                Five steps.<br />One settlement.
              </h2>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.65, color: "#6B8BAD" }}>
                The whole flow runs on Stellar. No intermediary holds your money at any point.
              </p>
            </div>

            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "1.1rem", top: "0.5rem", bottom: "0.5rem", width: "1px", background: "linear-gradient(to bottom, #1E3A5F, #3DA9FC 50%, #1E3A5F)" }} />
              <div>
                {[
                  { step: "01", title: "Connect wallet", body: "Link a Stellar wallet — Freighter works out of the box. No custodial account, no KYC flow." },
                  { step: "02", title: "Create a contract", body: "Define the work, milestones, and payment amounts. Both parties sign on-chain." },
                  { step: "03", title: "Fund escrow", body: "Client locks XLM into the escrow account. Funds are on-chain — visible to both sides, touchable by neither until conditions are met." },
                  { step: "04", title: "Deliver milestones", body: "Freelancer submits work through the platform. Client reviews against agreed terms." },
                  { step: "05", title: "Payment released", body: "Approval triggers an immediate on-chain transfer. 4–5 second settlement to the freelancer's wallet." },
                ].map((s, i) => (
                  <div key={s.step} style={{ display: "flex", gap: "1.5rem", paddingBottom: i < 4 ? "2rem" : 0 }}>
                    <div style={{ flexShrink: 0, width: "2.25rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                        border: `1px solid ${i === 4 ? "#3DA9FC" : "#1E3A5F"}`,
                        backgroundColor: i === 4 ? "#0F2E50" : "#091929",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.65rem", fontWeight: 700,
                        color: i === 4 ? "#3DA9FC" : "#3E5F80",
                        letterSpacing: "0.02em", position: "relative", zIndex: 1,
                      }}>
                        {s.step}
                      </div>
                    </div>
                    <div style={{ paddingTop: "0.3rem" }}>
                      <h3 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "0.95rem", fontWeight: 600, color: "#E0ECF8", marginBottom: "0.4rem", letterSpacing: "-0.01em" }}>
                        {s.title}
                      </h3>
                      <p style={{ fontSize: "0.85rem", lineHeight: 1.65, color: "#6B8BAD" }}>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Stellar */}
      <section id="why-stellar" style={{ borderTop: "1px solid #152D4E" }} className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#3DA9FC", marginBottom: "2rem" }}>Why Stellar</p>
          <div className="grid lg:grid-cols-[3fr_2fr] gap-10 lg:gap-16 items-start">
            <div>
              <h2 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(1.6rem, 3vw, 2.5rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "1.25rem" }}>
                Payment rails that work without you knowing they&apos;re there.
              </h2>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.75, color: "#7A9BBE", marginBottom: "1rem" }}>
                Stellar is a public payment network optimized for fast, low-cost transfers. Transactions finalize in 3–5 seconds and cost less than a fraction of a cent — which means milestone payments that would be impractical on Ethereum become trivial here.
              </p>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.75, color: "#7A9BBE" }}>
                We use Stellar&apos;s built-in account mechanics and the Horizon API for live demos. The Soroban escrow contract — covering fund, milestone release, refund, dispute, and atomic dispute resolution — is complete, test-covered, and compiles to WASM. Backend and frontend integration are in active development.
              </p>
            </div>
            {/* Stats: borderTop on mobile, borderLeft on lg */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-0 mt-4 lg:mt-0 pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:pl-10 border-[#152D4E]">
              {[
                { stat: "3–5s", label: "Transaction finality" },
                { stat: "< $0.01", label: "Per transaction fee" },
                { stat: "Trustless", label: "Soroban escrow contract" },
                { stat: "Soroban", label: "Escrow smart contract" },
              ].map((item, i) => (
                <div key={item.label} className={i > 0 ? "pt-5 mt-5 border-t border-[#152D4E] lg:border-t lg:mt-5" : ""}>
                  <p style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "1.6rem", fontWeight: 700, color: "#5EE7FF", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "0.25rem" }}>
                    {item.stat}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "#4A6B8A" }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Built for builders */}
      <section id="builders" style={{ borderTop: "1px solid #152D4E", backgroundColor: "#091929" }} className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#3DA9FC", marginBottom: "2rem" }}>Open source</p>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <h2 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(1.6rem, 3vw, 2.5rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "1.25rem" }}>
                Built in public.<br />Contributions welcome.
              </h2>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.75, color: "#7A9BBE", marginBottom: "2rem" }}>
                Stellance is an active project in the Stellar Wave program. The full codebase is on GitHub. If you want to build on real payment infrastructure — frontend, backend, or Soroban contracts — there are open issues and clear contribution guidelines.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <a href="https://github.com/alone-in/stellances/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer"
                  style={{ backgroundColor: "#3DA9FC", color: "#0B1E3D", fontWeight: 600, fontSize: "0.875rem", padding: "0.65rem 1.25rem", borderRadius: "6px", textDecoration: "none", textAlign: "center" }}>
                  Contribution Guide
                </a>
                <a href="https://github.com/alone-in/stellances/issues" target="_blank" rel="noreferrer"
                  style={{ border: "1px solid #1E3A5F", color: "#7A9BBE", fontSize: "0.875rem", padding: "0.65rem 1.25rem", borderRadius: "6px", textDecoration: "none", textAlign: "center" }}>
                  Open Issues ↗
                </a>
              </div>
            </div>
            {/* Stack block — overflow-x scroll on mobile if needed */}
            <div style={{ backgroundColor: "#081628", border: "1px solid #152D4E", borderRadius: "8px", padding: "1.5rem", fontFamily: "var(--font-geist-mono), 'Courier New', monospace", fontSize: "0.8rem", lineHeight: 1.7, overflowX: "auto" }}>
              <p style={{ color: "#3E5F80", marginBottom: "1rem" }}># stack</p>
              {[
                ["frontend", "next.js 16  react 19  tailwind 4"],
                ["backend ", "nestjs  prisma  postgresql"],
                ["network ", "stellar  horizon api  stellar-sdk"],
                ["wallet  ", "freighter (browser extension)"],
                ["contracts", "soroban  rust  wasm"],
              ].map(([layer, tech]) => (
                <div key={layer} style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <span style={{ color: "#3DA9FC", minWidth: "5rem", flexShrink: 0 }}>{layer}</span>
                  <span style={{ color: "#8AAEC8" }}>{tech}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ borderTop: "1px solid #152D4E" }} className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center">
          <div>
            <h2 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(1.4rem, 2.5vw, 2rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
              See it on the Stellar testnet — no signup required.
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#6B8BAD" }}>
              Generate a keypair, fund it with Friendbot, and watch a payment settle in under 5 seconds.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-[180px]">
            <Link href="/demo"
              className="flex-1 lg:flex-none"
              style={{ backgroundColor: "#3DA9FC", color: "#0B1E3D", fontWeight: 600, fontSize: "0.875rem", padding: "0.75rem 1.5rem", borderRadius: "6px", textDecoration: "none", textAlign: "center", whiteSpace: "nowrap" }}>
              Try the demo →
            </Link>
            <a href="https://github.com/alone-in/stellances" target="_blank" rel="noreferrer"
              className="flex-1 lg:flex-none"
              style={{ border: "1px solid #1E3A5F", color: "#7A9BBE", fontSize: "0.875rem", padding: "0.75rem 1.5rem", borderRadius: "6px", textDecoration: "none", textAlign: "center" }}>
              GitHub ↗
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #0F2340" }} className="px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ fontSize: "0.75rem", color: "#344F6A" }}>
          <span>© 2025 Stellance · MIT License</span>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            <a href="https://github.com/alone-in/stellances" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://github.com/alone-in/stellances/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Contributing</a>
            <a href="https://github.com/alone-in/stellances/blob/main/README.md" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Docs</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
