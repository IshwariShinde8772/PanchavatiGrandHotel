export default function SkeletonCard({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-[28px] border border-divider bg-white p-5 ${className}`}>
      <div className="h-48 rounded-[24px] bg-saffronLight" />
      <div className="mt-4 h-5 w-2/3 rounded-full bg-saffronLight" />
      <div className="mt-3 h-4 w-1/2 rounded-full bg-goldLight" />
      <div className="mt-6 h-11 rounded-full bg-saffronLight" />
    </div>
  );
}

