import { AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Reusable skeleton loading primitives.
 *
 * Every data-driven surface renders one of these while its request is in
 * flight, so the layout stays stable and no fake/zero values flash before
 * the real data arrives. All primitives use the shared `Skeleton` atom
 * (animate-pulse + bg-muted) so they adapt to light/dark mode automatically.
 */

/** A short paragraph of shimmering lines. */
export function SkeletonText({
  lines = 2,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"} ${
            i > 0 ? "mt-2" : ""
          }`}
        />
      ))}
    </div>
  );
}

/** Small metric tile (label + large value) used on the contributor dashboard. */
export function SkeletonMetricCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fbfcfd] p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-28" />
    </div>
  );
}

/** Large admin stat card (icon + value + label). */
export function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_16px_rgba(20,36,52,0.04)]">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-6 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

/** Earnings-style card with an icon header and a large balance figure. */
export function SkeletonBalanceCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="mt-4 h-9 w-32" />
      <Skeleton className="mt-4 h-9 w-full rounded-md" />
    </div>
  );
}

/** A single conversation-list row (avatar + name + preview lines). */
export function SkeletonConversationItem() {
  return (
    <div className="flex items-start gap-3 px-4 py-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** A stack of conversation-list skeleton rows. */
export function SkeletonConversationList({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonConversationItem key={i} />
      ))}
    </div>
  );
}

/** A compact notification-list skeleton row. */
export function SkeletonNotificationItem() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

/** Chat message bubbles shaped like the real conversation thread. */
export function SkeletonChat({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => {
        const right = i % 2 === 1;
        return (
          <div
            key={i}
            className={`flex ${right ? "justify-end" : "justify-start"}`}
          >
            <Skeleton
              className={`h-12 rounded-2xl ${right ? "w-1/3" : "w-2/3"}`}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Skeleton rows for a table body. Render inside an existing `<tbody>`.
 * Keeps the table dimensions stable while data loads.
 */
export function SkeletonRows({
  columns = 4,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-6 py-4">
              <Skeleton
                className="h-4"
                style={{ width: `${55 + ((r * 7 + c * 13) % 35)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** A skeleton card for a payment-request style list item. */
export function SkeletonRequestCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-4 h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Professional error state with an optional Retry action. */
export function ErrorState({
  message,
  onRetry,
  className = "",
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-5 py-14 text-center ${className}`}
      role="alert"
    >
      <AlertCircle size={26} className="mx-auto text-slate-300" />
      <p className="mt-3 text-sm font-bold text-navy">Something went wrong</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-orange px-4 py-2.5 text-xs font-extrabold text-navy transition hover:bg-orange-light"
        >
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}
