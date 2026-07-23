"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createJob, JOB_CATEGORIES, JobsApiError } from "@/lib/api/jobs";

// ─── Validation schema ────────────────────────────────────────────────────────
// Frontend rules are slightly stricter than the backend DTO for a better UX:
//   title:       5–120 chars  (backend: non-empty, max 200)
//   description: 20–5000 chars (backend: non-empty)
//   budget:      > 0, finite  (backend: positive number, max 7 decimal places)
//   category:    required      (backend: non-empty, max 100)

const jobPostSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters.")
    .max(120, "Title must be 120 characters or fewer."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(5000, "Description must be 5,000 characters or fewer."),
  budget: z
    .string()
    .min(1, "Budget is required.")
    .refine(
      (v) => {
        const n = parseFloat(v);
        return !isNaN(n) && isFinite(n) && n > 0;
      },
      { message: "Budget must be a positive number." }
    ),
  category: z.string().min(1, "Please select a category."),
});

type JobPostFormValues = z.infer<typeof jobPostSchema>;

// ─── Small primitives ─────────────────────────────────────────────────────────

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-error">
      {message}
    </p>
  );
}

function CharCount({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const nearLimit = current > max * 0.85;
  const overLimit = current > max;
  return (
    <span
      className="text-xs tabular-nums"
      aria-live="polite"
      style={{
        color: overLimit
          ? "var(--color-error)"
          : nearLimit
            ? "#f59e0b"
            : "var(--color-text-muted)",
      }}
    >
      {current}/{max}
    </span>
  );
}

// ─── Job post form ────────────────────────────────────────────────────────────

export function JobPostForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JobPostFormValues>({
    resolver: zodResolver(jobPostSchema),
    defaultValues: {
      title: "",
      description: "",
      budget: "",
      category: "",
    },
  });

  const titleValue = watch("title");
  const descriptionValue = watch("description");

  async function onSubmit(values: JobPostFormValues) {
    setServerError(null);

    try {
      const job = await createJob({
        title: values.title,
        description: values.description,
        budget: parseFloat(values.budget),
        category: values.category,
      });

      toast.success("Job posted successfully!");
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      let message = "Something went wrong. Please try again.";

      if (err instanceof JobsApiError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      // 401 means the token expired or is missing
      if (err instanceof JobsApiError && err.status === 401) {
        message = "Your session has expired. Please sign in again.";
        toast.error(message);
        router.push("/login");
        return;
      }

      setServerError(message);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="card-surface p-6 sm:p-8"
      style={{ maxWidth: "720px", width: "100%" }}
    >
      {/* Server-level error banner */}
      {serverError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Post a job"
        className="space-y-6"
      >
        {/* Title */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="title"
              className="text-sm font-medium text-text-primary"
            >
              Job title <span aria-hidden className="text-error">*</span>
            </label>
            <CharCount current={titleValue?.length ?? 0} max={120} />
          </div>
          <input
            id="title"
            type="text"
            placeholder="e.g. Build a Soroban escrow dApp"
            autoFocus
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "title-error" : undefined}
            className={[
              "w-full rounded-md border bg-navy px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted/60",
              "transition-colors duration-150 outline-none",
              "focus:border-accent focus:ring-1 focus:ring-accent",
              errors.title
                ? "border-error focus:border-error focus:ring-error"
                : "border-slate-border",
            ].join(" ")}
            {...register("title")}
          />
          <FieldError id="title-error" message={errors.title?.message} />
        </div>

        {/* Description */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="description"
              className="text-sm font-medium text-text-primary"
            >
              Description <span aria-hidden className="text-error">*</span>
            </label>
            <CharCount
              current={descriptionValue?.length ?? 0}
              max={5000}
            />
          </div>
          <textarea
            id="description"
            rows={7}
            placeholder="Describe the project, required skills, deliverables, and any relevant deadlines…"
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
            className={[
              "w-full rounded-md border bg-navy px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted/60",
              "transition-colors duration-150 outline-none resize-y",
              "focus:border-accent focus:ring-1 focus:ring-accent",
              errors.description
                ? "border-error focus:border-error focus:ring-error"
                : "border-slate-border",
            ].join(" ")}
            style={{ minHeight: "140px" }}
            {...register("description")}
          />
          <FieldError
            id="description-error"
            message={errors.description?.message}
          />
        </div>

        {/* Budget + Category — side-by-side on md+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Budget */}
          <div>
            <label
              htmlFor="budget"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Budget (XLM) <span aria-hidden className="text-error">*</span>
            </label>
            <div className="relative">
              <span
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none select-none"
                aria-hidden
              >
                XLM
              </span>
              <input
                id="budget"
                type="number"
                inputMode="decimal"
                min="0.0000001"
                step="any"
                placeholder="0.00"
                aria-invalid={!!errors.budget}
                aria-describedby={
                  errors.budget ? "budget-error" : "budget-hint"
                }
                className={[
                  "w-full rounded-md border bg-navy pl-12 pr-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted/60",
                  "transition-colors duration-150 outline-none",
                  "focus:border-accent focus:ring-1 focus:ring-accent",
                  errors.budget
                    ? "border-error focus:border-error focus:ring-error"
                    : "border-slate-border",
                ].join(" ")}
                {...register("budget")}
              />
            </div>
            <FieldError id="budget-error" message={errors.budget?.message} />
            {!errors.budget && (
              <p id="budget-hint" className="mt-1 text-xs text-text-muted">
                Enter the total project budget in XLM.
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Category <span aria-hidden className="text-error">*</span>
            </label>
            <select
              id="category"
              aria-invalid={!!errors.category}
              aria-describedby={
                errors.category ? "category-error" : undefined
              }
              className={[
                "w-full rounded-md border bg-navy px-3.5 py-2.5 text-sm text-text-primary appearance-none cursor-pointer",
                "transition-colors duration-150 outline-none",
                "focus:border-accent focus:ring-1 focus:ring-accent",
                errors.category
                  ? "border-error focus:border-error focus:ring-error"
                  : "border-slate-border",
              ].join(" ")}
              {...register("category")}
            >
              <option value="">Select a category…</option>
              {JOB_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <FieldError
              id="category-error"
              message={errors.category?.message}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-md text-sm font-medium text-text-muted border transition-colors duration-150 hover:text-white hover:border-white/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-slate-panel"
            style={{ borderColor: "var(--color-slate-border)" }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={[
              "w-full sm:w-auto px-6 py-2.5 rounded-md text-sm font-semibold text-white",
              "bg-accent hover:bg-accent-hover active:scale-[0.98]",
              "transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-panel",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
            ].join(" ")}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Posting…
              </span>
            ) : (
              "Post Job"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
