export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-2/3 rounded-xl bg-gray-200 dark:bg-zinc-800" />
      <div className="h-4 w-full rounded bg-gray-200 dark:bg-zinc-800" />
      <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-zinc-800" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="h-40 rounded-2xl bg-gray-200 dark:bg-zinc-800" />
        <div className="h-40 rounded-2xl bg-gray-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
