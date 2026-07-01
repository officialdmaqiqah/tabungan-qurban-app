export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="h-8 w-64 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-48 bg-slate-200 rounded"></div>
        </div>
        <div className="h-10 w-full md:w-48 bg-slate-200 rounded-xl md:rounded-lg"></div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
              <div>
                <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                <div className="h-8 w-16 bg-slate-200 rounded"></div>
              </div>
            </div>
            <div className="h-3 w-40 bg-slate-200 rounded mt-auto"></div>
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="h-10 w-full sm:w-64 bg-slate-200 rounded-lg"></div>
          <div className="h-10 w-full sm:w-32 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 w-full bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
