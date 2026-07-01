export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="h-8 w-64 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-48 bg-slate-200 rounded"></div>
        </div>
      </div>

      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 w-full bg-slate-200 rounded-2xl"></div>
        <div className="h-32 w-full bg-slate-200 rounded-2xl"></div>
        <div className="h-32 w-full bg-slate-200 rounded-2xl"></div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-[400px] w-full bg-slate-200 rounded-2xl"></div>
          <div className="h-[300px] w-full bg-slate-200 rounded-2xl"></div>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <div className="h-[200px] w-full bg-slate-200 rounded-2xl"></div>
          <div className="h-[300px] w-full bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    </div>
  );
}
