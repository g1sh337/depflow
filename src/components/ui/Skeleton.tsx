export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function LinkCardSkeleton() {
  return (
    <div className="glass space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-2 w-full" />
    </div>
  );
}
