"use client";

import Link from "next/link";
import type { Job } from "@/lib/api/jobs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a Prisma Decimal string as a human-readable USD amount. */
function formatBudget(budget: string): string {
  const n = parseFloat(budget);
  if (isNaN(n)) return budget;

  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** Return a human-readable relative timestamp (e.g. "3 days ago"). */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Colour map for job status badges. */
const STATUS_STYLES: Record<
  Job["status"],
  { bg: string; text: string; dot: string }
> = {
  OPEN: {
    bg: "rgba(45,212,191,0.12)",
    text: "#2dd4bf",
    dot: "#2dd4bf",
  },
  IN_PROGRESS: {
    bg: "rgba(61,169,252,0.12)",
    text: "#3da9fc",
    dot: "#3da9fc",
  },
  COMPLETED: {
    bg: "rgba(100,116,139,0.15)",
    text: "#94a3b8",
    dot: "#94a3b8",
  },
  CANCELLED: {
    bg: "rgba(248,113,113,0.12)",
    text: "#f87171",
    dot: "#f87171",
  },
};

const STATUS_LABEL: Record<Job["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface JobCardProps {
  job: Job;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * JobCard
 *
 * Displays a single job listing in a card format. Links to the job detail page.
 * Uses the existing design tokens (card-surface, glow-accent, gradient-text, etc.)
 * from globals.css.
 */
export default function JobCard({ job }: JobCardProps) {
  const statusStyle = STATUS_STYLES[job.status];
  const budget = formatBudget(job.budget);
  const posted = timeAgo(job.createdAt);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block card-surface p-5 sm:p-6 transition-all duration-200 hover:border-accent/40 hover:shadow-[0_4px_32px_rgba(61,169,252,0.12)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
      aria-label={`View job: ${job.title}`}
    >
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Category chip */}
        <span
          className="inline-flex items-center shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            background: "rgba(61,169,252,0.1)",
            color: "#3da9fc",
            border: "1px solid rgba(61,169,252,0.2)",
          }}
        >
          {job.category}
        </span>

        {/* Status badge */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
          style={{
            background: statusStyle.bg,
            color: statusStyle.text,
          }}
          aria-label={`Status: ${STATUS_LABEL[job.status]}`}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: statusStyle.dot,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {STATUS_LABEL[job.status]}
        </span>
      </div>

      {/* ── Title ──────────────────────────────────────────────────────────── */}
      <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 group-hover:text-accent transition-colors duration-150 font-heading">
        {job.title}
      </h3>

      {/* ── Description ────────────────────────────────────────────────────── */}
      <p className="text-sm text-text-muted line-clamp-3 mb-4 leading-relaxed">
        {job.description}
      </p>

      {/* ── Footer row ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-2 pt-4"
        style={{ borderTop: "1px solid rgba(36,53,84,0.8)" }}
      >
        {/* Budget */}
        <div className="flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-success shrink-0"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5H9" />
          </svg>
          <span className="text-sm font-semibold text-success">{budget}</span>
        </div>

        {/* Right side: client name + posted time */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Client name */}
          {job.client?.name && (
            <span className="text-xs text-text-muted truncate max-w-[120px]">
              {job.client.name}
            </span>
          )}

          {/* Time separator dot */}
          <span aria-hidden className="text-slate-border text-xs">·</span>

          {/* Posted time */}
          <time
            dateTime={job.createdAt}
            className="text-xs text-text-muted whitespace-nowrap"
          >
            {posted}
          </time>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

/**
 * JobCardSkeleton
 *
 * Loading placeholder that mirrors the layout of JobCard. Animated pulse
 * provides a clear visual "loading" signal without layout shift.
 */
export function JobCardSkeleton() {
  return (
    <div
      className="card-surface p-5 sm:p-6 animate-pulse"
      aria-hidden
      role="presentation"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="h-5 rounded-full w-24"
          style={{ background: "rgba(36,53,84,0.8)" }}
        />
        <div
          className="h-5 rounded-full w-20"
          style={{ background: "rgba(36,53,84,0.8)" }}
        />
      </div>

      {/* Title */}
      <div
        className="h-5 rounded w-4/5 mb-2"
        style={{ background: "rgba(36,53,84,0.8)" }}
      />
      <div
        className="h-5 rounded w-3/5 mb-4"
        style={{ background: "rgba(36,53,84,0.6)" }}
      />

      {/* Description */}
      <div className="space-y-1.5 mb-4">
        <div
          className="h-3.5 rounded w-full"
          style={{ background: "rgba(36,53,84,0.6)" }}
        />
        <div
          className="h-3.5 rounded w-full"
          style={{ background: "rgba(36,53,84,0.6)" }}
        />
        <div
          className="h-3.5 rounded w-2/3"
          style={{ background: "rgba(36,53,84,0.5)" }}
        />
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-4"
        style={{ borderTop: "1px solid rgba(36,53,84,0.8)" }}
      >
        <div
          className="h-4 rounded w-16"
          style={{ background: "rgba(36,53,84,0.7)" }}
        />
        <div
          className="h-3 rounded w-24"
          style={{ background: "rgba(36,53,84,0.6)" }}
        />
      </div>
    </div>
  );
}
