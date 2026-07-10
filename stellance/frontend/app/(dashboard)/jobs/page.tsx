"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import JobCard, { JobCardSkeleton } from "@/components/jobs/JobCard";
import {
  fetchJobs,
  filterJobs,
  JOB_CATEGORIES,
  BUDGET_RANGES,
  type Job,
  type BudgetRange,
} from "@/lib/api/jobs";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

// ─── Small UI primitives ──────────────────────────────────────────────────────

/** Generic select wrapper styled to match the navy design system. */
function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border bg-navy-mid px-3 py-2 text-sm text-text-primary appearance-none cursor-pointer transition-colors duration-150 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        style={{ borderColor: "var(--color-slate-border)" }}
      >
        {children}
      </select>
    </div>
  );
}

/** Pagination button. */
function PageButton({
  page,
  current,
  onClick,
}: {
  page: number;
  current: number;
  onClick: (p: number) => void;
}) {
  const isActive = page === current;
  return (
    <button
      onClick={() => onClick(page)}
      aria-current={isActive ? "page" : undefined}
      className="min-w-[2rem] h-8 px-2 rounded-md text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-navy"
      style={{
        background: isActive ? "var(--color-accent)" : "transparent",
        color: isActive ? "#fff" : "var(--color-text-muted)",
        border: isActive
          ? "1px solid transparent"
          : "1px solid var(--color-slate-border)",
      }}
    >
      {page}
    </button>
  );
}

// ─── Loading grid ─────────────────────────────────────────────────────────────

function LoadingGrid() {
  return (
    <div
      role="status"
      aria-label="Loading jobs…"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading jobs…</span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      {/* Icon */}
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "rgba(61,169,252,0.08)" }}
        aria-hidden
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--color-accent)" }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <h2
        className="text-lg font-semibold text-white mb-2"
        style={{ fontFamily: "var(--font-space-grotesk)" }}
      >
        {filtered ? "No jobs match your filters" : "No open jobs right now"}
      </h2>
      <p className="text-sm text-text-muted max-w-sm mb-6">
        {filtered
          ? "Try adjusting your search or removing some filters to see more results."
          : "Check back soon — new jobs are posted every day."}
      </p>

      {filtered && (
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent"
          style={{ background: "var(--color-accent)" }}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "rgba(248,113,113,0.08)" }}
        aria-hidden
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--color-error)" }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2
        className="text-lg font-semibold text-white mb-2"
        style={{ fontFamily: "var(--font-space-grotesk)" }}
      >
        Failed to load jobs
      </h2>
      <p className="text-sm text-text-muted mb-6">
        Could not reach the server. Please check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent"
        style={{ background: "var(--color-accent)" }}
      >
        Retry
      </button>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build compact page list: always show first, last, and a window around current
  const pages: (number | "…")[] = [];
  const window = 2;

  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= currentPage - window && p <= currentPage + window)
    ) {
      pages.push(p);
    } else if (
      (p === currentPage - window - 1 && p > 1) ||
      (p === currentPage + window + 1 && p < totalPages)
    ) {
      pages.push("…");
    }
  }

  return (
    <nav
      className="flex items-center justify-center gap-1.5 mt-8 pb-2"
      aria-label="Pagination"
    >
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium text-text-muted transition-colors duration-150 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent"
        style={{ borderColor: "var(--color-slate-border)" }}
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-text-muted text-sm">
            …
          </span>
        ) : (
          <PageButton
            key={p}
            page={p}
            current={currentPage}
            onClick={onPageChange}
          />
        ),
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium text-text-muted transition-colors duration-150 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent"
        style={{ borderColor: "var(--color-slate-border)" }}
      >
        ›
      </button>
    </nav>
  );
}

// ─── Jobs Page ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  // ── Filter state ───────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [budgetRangeIndex, setBudgetRangeIndex] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  // Refs for debounce
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce keyword so we don't re-filter on every keystroke
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [keyword]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: allJobs,
    isLoading,
    isError,
    refetch,
  } = useQuery<Job[]>({
    queryKey: ["jobs", "open"],
    queryFn: () => fetchJobs({ status: "OPEN" }),
    // Surface errors via toast
    meta: { onError: () => toast.error("Failed to load jobs. Please retry.") },
  });

  // ── Derived state ──────────────────────────────────────────────────────────
  const selectedBudget: BudgetRange | null =
    budgetRangeIndex !== ""
      ? (BUDGET_RANGES[parseInt(budgetRangeIndex)] ?? null)
      : null;

  const filteredJobs: Job[] = filterJobs(allJobs ?? [], {
    keyword: debouncedKeyword,
    category,
    budgetRange: selectedBudget,
  });

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedJobs = filteredJobs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const isFiltered =
    debouncedKeyword !== "" || category !== "" || budgetRangeIndex !== "";

  // ── Handlers ──────────────────────────────────────────────────────────────
  const clearFilters = useCallback(() => {
    setKeyword("");
    setDebouncedKeyword("");
    setCategory("");
    setBudgetRangeIndex("");
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      // Scroll back to top of results on page change
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1
          className="text-2xl sm:text-3xl font-semibold text-white mb-1"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Browse Jobs
        </h1>
        <p className="text-sm text-text-muted">
          {isLoading
            ? "Loading available jobs…"
            : allJobs
              ? `${filteredJobs.length} open job${filteredJobs.length !== 1 ? "s" : ""}${isFiltered ? " matching your filters" : " available"}`
              : "Find your next project on Stellance"}
        </p>
      </div>

      {/* ── Search + filters bar ──────────────────────────────────────────── */}
      <div
        className="card-surface p-4 sm:p-5 mb-6 flex flex-col sm:flex-row gap-4 items-end"
        role="search"
        aria-label="Job search and filters"
      >
        {/* Keyword search */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 w-full">
          <label
            htmlFor="job-search"
            className="text-xs font-medium text-text-muted"
          >
            Search
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"
              aria-hidden
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
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              id="job-search"
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by title, description, or skill…"
              aria-label="Search jobs"
              className="w-full rounded-md border bg-navy-mid pl-9 pr-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted/60 transition-colors duration-150 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              style={{ borderColor: "var(--color-slate-border)" }}
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="w-full sm:w-44">
          <FilterSelect
            id="job-category"
            label="Category"
            value={category}
            onChange={(v) => { setCategory(v); setCurrentPage(1); }}
          >
            <option value="">All categories</option>
            {JOB_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </FilterSelect>
        </div>

        {/* Budget filter */}
        <div className="w-full sm:w-44">
          <FilterSelect
            id="job-budget"
            label="Budget"
            value={budgetRangeIndex}
            onChange={(v) => { setBudgetRangeIndex(v); setCurrentPage(1); }}
          >
            <option value="">Any budget</option>
            {BUDGET_RANGES.map((range, i) => (
              <option key={range.label} value={i}>
                {range.label}
              </option>
            ))}
          </FilterSelect>
        </div>

        {/* Clear filters button — only shown when filters are active */}
        {isFiltered && (
          <button
            onClick={clearFilters}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-text-muted hover:text-white border transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent"
            style={{ borderColor: "var(--color-slate-border)" }}
            aria-label="Clear all filters"
          >
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
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* ── Active filter chips ───────────────────────────────────────────── */}
      {isFiltered && (
        <div
          className="flex flex-wrap gap-2 mb-4"
          aria-label="Active filters"
        >
          {debouncedKeyword && (
            <FilterChip
              label={`"${debouncedKeyword}"`}
              onRemove={() => {
                setKeyword("");
                setDebouncedKeyword("");
              }}
            />
          )}
          {category && (
            <FilterChip
              label={category}
              onRemove={() => setCategory("")}
            />
          )}
          {selectedBudget && (
            <FilterChip
              label={selectedBudget.label}
              onRemove={() => setBudgetRangeIndex("")}
            />
          )}
        </div>
      )}

      {/* ── Content area ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingGrid />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : pagedJobs.length === 0 ? (
        <EmptyState filtered={isFiltered} onClear={clearFilters} />
      ) : (
        <>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            role="list"
            aria-label="Job listings"
          >
            {pagedJobs.map((job) => (
              <div key={job.id} role="listitem">
                <JobCard job={job} />
              </div>
            ))}
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />

          {/* Result count footer */}
          <p className="text-center text-xs text-text-muted mt-3">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredJobs.length)} of{" "}
            {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{
        background: "rgba(61,169,252,0.1)",
        color: "#3da9fc",
        border: "1px solid rgba(61,169,252,0.2)",
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="ml-0.5 hover:text-white transition-colors rounded-full focus-visible:ring-1 focus-visible:ring-accent"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </span>
  );
}
