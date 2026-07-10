/**
 * API client for the /jobs endpoints.
 *
 * Thin wrappers around fetch. All functions read the access_token from
 * sessionStorage so they can be called from client components without
 * prop-drilling the token.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ─── Enums (mirrored from Prisma schema) ─────────────────────────────────────

export type JobStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobClient {
  id: string;
  name: string;
  stellarPublicKey: string | null;
}

export interface JobContract {
  id: string;
  status: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  /** Prisma Decimal is serialised as a string over JSON */
  budget: string;
  category: string;
  status: JobStatus;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  client: JobClient;
  contract: JobContract | null;
}

export interface JobsQueryParams {
  status?: JobStatus;
  /** When true, only return the current user's jobs */
  mine?: boolean;
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class JobsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "JobsApiError";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("access_token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    let message = res.statusText || "An unexpected error occurred.";
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
      }
    } catch {
      // non-JSON error body — use statusText
    }
    throw new JobsApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

// ─── Jobs API ─────────────────────────────────────────────────────────────────

/**
 * Fetch all jobs from GET /jobs.
 * Passes optional status and mine filters as query params.
 */
export async function fetchJobs(params?: JobsQueryParams): Promise<Job[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.mine) qs.set("mine", "true");

  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Job[]>(`/jobs${query}`);
}

/**
 * Fetch a single job by id.
 */
export async function fetchJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${id}`);
}

// ─── Client-side derived helpers ──────────────────────────────────────────────

/** Available job categories derived from real data (can be expanded over time). */
export const JOB_CATEGORIES = [
  "Smart Contracts",
  "Frontend",
  "Backend",
  "Mobile",
  "Design",
  "DevOps",
  "Writing",
  "Marketing",
  "Data Science",
  "Other",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export interface BudgetRange {
  label: string;
  min: number;
  max: number | null;
}

export const BUDGET_RANGES: BudgetRange[] = [
  { label: "Under $500", min: 0, max: 500 },
  { label: "$500 – $1,000", min: 500, max: 1000 },
  { label: "$1,000 – $5,000", min: 1000, max: 5000 },
  { label: "$5,000 – $10,000", min: 5000, max: 10000 },
  { label: "$10,000+", min: 10000, max: null },
];

/**
 * Apply keyword, category, and budget filters entirely on the client.
 * The backend only supports status + mine filters, so finer filtering is done
 * after the initial fetch.
 */
export function filterJobs(
  jobs: Job[],
  opts: {
    keyword: string;
    category: string;
    budgetRange: BudgetRange | null;
  },
): Job[] {
  const kw = opts.keyword.toLowerCase().trim();

  return jobs.filter((job) => {
    // Keyword match against title, description, or category
    if (kw) {
      const haystack = `${job.title} ${job.description} ${job.category}`.toLowerCase();
      if (!haystack.includes(kw)) return false;
    }

    // Category filter
    if (opts.category && job.category !== opts.category) return false;

    // Budget filter
    if (opts.budgetRange) {
      const budget = parseFloat(job.budget);
      if (budget < opts.budgetRange.min) return false;
      if (opts.budgetRange.max !== null && budget > opts.budgetRange.max)
        return false;
    }

    return true;
  });
}
