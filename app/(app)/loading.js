import { Skeleton } from '@/components/ui/States';

// Shown instantly inside the persistent app shell while the next page loads.
export default function AppLoading() {
  return (
    <main
      data-ui="v2"
      aria-busy="true"
      aria-label="Loading"
      className="w-full max-w-6xl flex-1 mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-28 md:pb-10 space-y-4"
    >
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </main>
  );
}
