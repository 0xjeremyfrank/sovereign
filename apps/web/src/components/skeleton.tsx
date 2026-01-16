interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
};

export const ContestCardSkeleton = () => {
  return (
    <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
      {/* Header with title and status badge */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Prize pool */}
      <div className="space-y-3">
        <div>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-8 w-28" />
        </div>

        {/* Entry deposit */}
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-6 w-20" />
        </div>

        {/* Winners */}
        <div>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-6 w-12" />
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export const ContestDetailSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Prize Pool Card Skeleton */}
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-6 w-8" />
          </div>
        </div>
      </div>

      {/* Randomness Card Skeleton */}
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <Skeleton className="h-6 w-28 mb-4" />
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Engine Metadata Skeleton */}
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="space-y-3">
          <div>
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SidebarSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Timing Card Skeleton */}
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <Skeleton className="h-6 w-16 mb-4" />
        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      </div>

      {/* Status Card Skeleton */}
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <Skeleton className="h-6 w-24 mb-4" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
};
