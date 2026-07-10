"use client";

interface FeatureCardProps {
  title: string;
  body: string;
  accent: string;
}

export default function FeatureCard({ title, body, accent }: FeatureCardProps) {
  return (
    <div
      className="p-6 sm:p-8 transition-colors duration-200"
      style={{ backgroundColor: "rgba(255,255,255,0.02)", cursor: "default" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(167,139,250,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.02)";
      }}
    >
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: accent,
          marginBottom: "1.25rem",
          boxShadow: `0 0 12px ${accent}80`,
        }}
      />
      <h3
        style={{
          fontFamily: "var(--font-space-grotesk)",
          fontSize: "1rem",
          fontWeight: 600,
          color: "#f1f5f9",
          marginBottom: "0.5rem",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: "0.875rem", lineHeight: 1.7, color: "#64748b" }}>{body}</p>
    </div>
  );
}
