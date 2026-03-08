import { Skeleton } from "@/components/ui/skeleton";

export function LoadingTeamsView() {
  return (
    <div className="space-y-10">
      {Array(2).fill(0).map((_, index) => (
        <div key={index}>
          {/* Section header skeleton */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-7 w-20" />
          </div>
          {/* Project rows skeleton */}
          <div className="border border-border/60 rounded-lg overflow-hidden">
            {Array(3).fill(0).map((_, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-border/40' : ''}`}
              >
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1 max-w-[180px]" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
