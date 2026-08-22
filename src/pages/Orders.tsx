import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Lock, Package, HeadphonesIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';

export function Orders() {
  const user = useStore((s) => s.getCurrentUser())!;
  const products = useStore((s) => s.products);
  const submissions = useStore((s) => s.submissions);
  const fetchProducts = useStore((s) => s.fetchProducts);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const submitProduct = useStore((s) => s.submitProduct);
  const showToast = useToast();
  const [mergePopup, setMergePopup] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submittedIds = new Set(submissions.map((s) => s.productId));

  const handleSubmit = async (productId: string) => {
    if (user.isMerged) {
      setMergePopup(true);
      return;
    }
    setPendingProductId(productId);
    const result = await submitProduct(productId);
    setPendingProductId(null);
    if (result.ok && result.mergeTriggered) {
      setMergePopup(true);
    } else if (result.ok) {
      showToast('Task submitted successfully!', 'success');
    } else if (result.error) {
      showToast(result.error, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Orders</h1>
          <p className="mt-1 text-sm text-ink-400">Submit products to complete tasks and earn.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm">
          <span className="text-ink-400">Completed:</span>
          <span className="font-bold text-brand-400">{user.completedOrders}</span>
        </div>
      </div>

      {user.isMerged && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-amber-300">Merged Product Detected</p>
              <p className="mt-0.5 text-sm text-amber-200/80">
                Your balance is insufficient. Deposit required to continue.
              </p>
            </div>
          </div>
          <Link to="/dashboard/support" className="btn-brand bg-amber-500 hover:bg-amber-600">
            <HeadphonesIcon className="h-4 w-4" /> Deposit via Support
          </Link>
        </div>
      )}

      {/* Product grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const submitted = submittedIds.has(product.id);
          const locked = user.isMerged && !submitted;
          const pending = pendingProductId === product.id;
          return (
            <div key={product.id} className="card flex flex-col">
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-ink-700">
                  <Package className="h-5.5 w-5.5 text-ink-300" />
                </div>
                <span className="rounded-full bg-ink-700 px-2.5 py-1 text-xs text-ink-300">{product.category}</span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-white">{product.name}</h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-ink-400">
                <span>Reward: <span className="text-brand-400">+${product.reward.toFixed(2)}</span></span>
                <span>Fee: <span className="text-red-400">-${product.cost.toFixed(2)}</span></span>
              </div>

              <button
                onClick={() => handleSubmit(product.id)}
                disabled={submitted || locked || pending}
                className={`mt-4 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  submitted
                    ? 'bg-brand-500/15 text-brand-300'
                    : locked
                    ? 'bg-ink-700 text-ink-500'
                    : 'bg-brand-500 text-white hover:bg-brand-600'
                }`}
              >
                {submitted ? (
                  <><CheckCircle2 className="h-4 w-4" /> Completed</>
                ) : locked ? (
                  <><Lock className="h-4 w-4" /> Locked</>
                ) : pending ? (
                  'Submitting…'
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Merge popup */}
      {mergePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setMergePopup(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-ink-900 p-6 shadow-2xl animate-scaleIn">
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-500/15 text-3xl">⚠️</div>
              <h3 className="mt-4 text-xl font-bold text-amber-300">Merged Product Detected!</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                A high-value product bundle has been assigned to you. Your balance is insufficient.
                Deposit required to continue.
              </p>
              <div className="mt-3 rounded-lg bg-ink-800 p-3 text-sm">
                <span className="text-ink-400">Current Balance: </span>
                <span className="font-bold text-white">${user.balance.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setMergePopup(false)} className="btn-ghost flex-1">Later</button>
              <Link to="/dashboard/support" className="btn-brand flex-1" onClick={() => setMergePopup(false)}>
                Deposit Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
