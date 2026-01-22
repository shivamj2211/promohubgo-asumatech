import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-50">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">{description}</p>
      ) : null}
      {actionLabel && actionHref ? (
        <div className="mt-5">
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-white dark:text-zinc-900"
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
