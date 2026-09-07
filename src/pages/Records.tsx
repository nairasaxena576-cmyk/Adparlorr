import { useEffect } from 'react';
import { CheckCircle2, Layers } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function Records() {
  const submissions = useStore((s) => s.submissions);
  const fetchOrders = useStore((s) => s.fetchOrders);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Records</h1>
        <p className="mt-1 text-sm text-ink-500">History of your completed products.</p>
      </div>

      <div className="card-c !p-0 overflow-hidden">
        {submissions.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-500">No completed products yet.</p>
        ) : (
          <div className="divide-y divide-pink-100">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">{s.productName}</p>
                    {s.isMergedOrder && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        <Layers className="h-3 w-3" /> Merged Order
                      </span>
                    )}
                    {!s.isMergedOrder && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                        Normal Order
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {s.productCategory} · {new Date(s.createdAt).toLocaleString()}
                  </p>
                  {s.isMergedOrder && (
                    <p className="mt-0.5 text-xs text-ink-500">
                      This was a merged simulated order (1-3 products bundled)
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-brand-600">+${s.rewardAmount.toFixed(2)}</p>
                  <span className="flex items-center justify-end gap-1 text-xs text-ink-500">
                    <CheckCircle2 className="h-3 w-3 text-brand-500" /> Completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
