import { Skeleton } from '@/components/ui/skeleton';

export const CompanyCardSkeleton = () => (
  <div className="rounded-2xl border border-border/60 bg-card p-4 animate-fade-in">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="w-11 h-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
    <div className="flex items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-10 w-24 rounded-xl" />
    </div>
  </div>
);

export const InvestmentCardSkeleton = () => (
  <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 animate-fade-in">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
    <div className="flex justify-between">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
    </div>
  </div>
);

export const ChartSkeleton = ({ height = 200 }: { height?: number }) => (
  <div className="rounded-2xl border border-border/60 bg-card p-4 animate-fade-in">
    <div className="flex justify-between mb-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-16" />
    </div>
    <Skeleton className="w-full rounded-lg" style={{ height }} />
  </div>
);

export const ListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <CompanyCardSkeleton key={i} />
    ))}
  </div>
);