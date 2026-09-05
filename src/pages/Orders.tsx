import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import type { WorkbenchProduct } from '@/types';

export function Orders() {
  const workbench = useStore((s) => s.workbench);
  const fetchWorkbench = useStore((s) => s.fetchWorkbench);
  const submitWorkbenchProduct = useStore((s) => s.submitWorkbenchProduct);
  const resolveDemoShortfall = useStore((s) => s.resolveDemoShortfall);
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchWorkbench();
  }, [fetchWorkbench]);

  const handleSubmit = async (productId: string) => {
    setSubmitting(true);
    const result = await submitWorkbenchProduct(productId);
    setSubmitting(false);
    if (!result.ok || !result.result) {
      showToast(result.error || 'Submission failed.', 'error');
      return;
    }
    const { status, commissionEarned, workbench: next } = result.result;
    if (status === 'MERGE') {
      showToast(`Merged product completed — simulated commission +$${commissionEarned.toFixed(2)}.`, 'success');
    } else {
      showToast(`Product submitted — simulated commission +$${commissionEarned.toFixed(2)}.`, 'success');
    }
    if (next.status === 'SHORTFALL') {
      showToast('Your demo working balance is negative. Resolve it with demo credits to continue.', 'info');
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    const result = await resolveDemoShortfall();
    setResolving(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to resolve the demo shortfall.', 'error');
      return;
    }
    showToast('Demo balance shortfall resolved with simulated credits.', 'success');
  };

  if (!workbench) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse text-center text-sm text-ink-400">Loading your workbench…</div>
      </div>
    );
  }

  const { progress, status } = workbench;
  const heroLabel =
    status === 'COMPLETED'
      ? 'Completed'
      : status === 'NOT_READY'
      ? 'Not Ready'
      : progress.completed === 0
      ? 'Start'
      : 'Continue';

  return (
    <div className="space-y-6 pb-6">
      {/* Hero */}
      <div className="card">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-ink-400">Today's Product Set (Simulated)</p>
            <p className="mt-1 text-3xl font-extrabold text-white">
              {progress.completed} <span className="text-ink-500">/</span> {progress.total}
            </p>
          </div>
          <a
            href="#current-action"
            className={`btn-brand justify-center px-8 py-3.5 text-base ${
              status === 'COMPLETED' || status === 'NOT_READY' ? 'pointer-events-none opacity-70' : ''
            }`}
          >
            {heroLabel} ({progress.completed}/{progress.total}) <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
            style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Commission / Balance cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-400">Today's Simulated Commission</p>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15">
              <TrendingUp className="h-5 w-5 text-brand-400" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-brand-400">${workbench.todaysCommission.toFixed(2)}</p>
          <p className="mt-1 text-xs text-ink-500">Simulated commission earned from completed products today.</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-400">Demo Working Balance</p>
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl ${
                workbench.workbenchBalance < 0 ? 'bg-red-500/15' : 'bg-sky-500/15'
              }`}
            >
              <Wallet className={`h-5 w-5 ${workbench.workbenchBalance < 0 ? 'text-red-400' : 'text-sky-400'}`} />
            </div>
          </div>
          <p
            className={`mt-2 text-2xl font-extrabold ${
              workbench.workbenchBalance < 0 ? 'text-red-400' : 'text-white'
            }`}
          >
            {workbench.workbenchBalance < 0 ? '-' : ''}${Math.abs(workbench.workbenchBalance).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Simulated balance for this workbench only — separate from your real Wallet balance.
          </p>
        </div>
      </div>

      {/* Current-action card — exactly one of the states below */}
      <div id="current-action" className="scroll-mt-24">
        {status === 'NOT_READY' && <NotReadyCard eligibleCount={workbench.eligibleCount} total={progress.total} />}
        {status === 'SHORTFALL' && (
          <ShortfallCard shortfall={workbench.shortfall} resolving={resolving} onResolve={handleResolve} />
        )}
        {status === 'COMPLETED' && (
          <CompletedCard todaysCommission={workbench.todaysCommission} subsidy={workbench.subsidy} />
        )}
        {status === 'MERGE' && workbench.mergeBundle && (
          <MergeCard
            bundle={workbench.mergeBundle}
            submitting={submitting}
            onSubmit={() => handleSubmit(workbench.mergeBundle!.products[0].id)}
          />
        )}
        {status === 'NORMAL' && workbench.currentProduct && (
          <NormalProductCard
            product={workbench.currentProduct}
            submitting={submitting}
            onSubmit={() => handleSubmit(workbench.currentProduct!.id)}
          />
        )}
      </div>
    </div>
  );
}

function ProductImage({ product }: { product: WorkbenchProduct }) {
  const [failed, setFailed] = useState(false);

  if (!product.imageUrl || failed) {
    return (
      <div className="grid h-48 w-full place-items-center rounded-xl bg-ink-800">
        <Package className="h-10 w-10 text-ink-500" />
      </div>
    );
  }

  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      onError={() => setFailed(true)}
      className="h-48 w-full rounded-xl object-cover"
    />
  );
}

function NormalProductCard({
  product,
  submitting,
  onSubmit,
}: {
  product: WorkbenchProduct;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const commission = Math.round(product.price * 0.01 * 100) / 100;
  return (
    <div className="card">
      <ProductImage product={product} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{product.name}</h3>
          <span className="mt-1 inline-block rounded-full bg-ink-700 px-2.5 py-1 text-xs text-ink-300">
            {product.category}
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ink-700 pt-4">
        <div>
          <p className="text-xs text-ink-400">Product Value</p>
          <p className="mt-1 text-lg font-bold text-white">${product.price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Simulated Commission</p>
          <p className="mt-1 text-lg font-bold text-brand-400">+${commission.toFixed(2)}</p>
        </div>
      </div>
      <button onClick={onSubmit} disabled={submitting} className="btn-brand mt-5 w-full py-3.5 disabled:opacity-60">
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  );
}

function MergeCard({
  bundle,
  submitting,
  onSubmit,
}: {
  bundle: { products: WorkbenchProduct[]; combinedValue: number; commission: number };
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="card border-amber-500/40 bg-amber-500/5">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-wide text-amber-400">Merged Product (Simulated)</span>
      </div>
      <p className="mt-2 text-sm text-ink-300">
        This product combines {bundle.products.length} product{bundle.products.length > 1 ? 's' : ''} in one
        simulated order.
      </p>

      <div className="mt-4 space-y-2">
        {bundle.products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg bg-ink-800/60 px-3 py-2">
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt={p.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-700">
                <Package className="h-4 w-4 text-ink-300" />
              </div>
            )}
            <div className="flex-1 flex-col">
              <span className="text-sm text-white">{p.name}</span>
              <span className="text-sm text-ink-400">${p.price.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ink-700 pt-4">
        <div>
          <p className="text-xs text-ink-400">Combined Value</p>
          <p className="mt-1 text-lg font-bold text-white">${bundle.combinedValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Simulated Commission (10×)</p>
          <p className="mt-1 text-lg font-bold text-amber-400">+${bundle.commission.toFixed(2)}</p>
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="mt-5 w-full rounded-lg bg-amber-500 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  );
}

function ShortfallCard({
  shortfall,
  resolving,
  onResolve,
}: {
  shortfall: number;
  resolving: boolean;
  onResolve: () => void;
}) {
  return (
    <div className="card border-red-500/40 bg-red-500/5 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-500/15">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-red-300">Demo Balance Shortfall</h3>
      <p className="mt-2 text-3xl font-extrabold text-red-400">-${shortfall.toFixed(2)}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-300">
        The simulated working balance is insufficient to complete this product. This is a demo-only shortfall —
        it does not require any real cryptocurrency or payment.
      </p>
      <div className="mt-4 rounded-lg bg-ink-800/60 p-3">
        <p className="text-xs text-ink-400">Demo Credits Required</p>
        <p className="text-lg font-bold text-white">${shortfall.toFixed(2)}</p>
      </div>
      <button
        onClick={onResolve}
        disabled={resolving}
        className="btn-brand mt-5 w-full justify-center py-3.5 disabled:opacity-60"
      >
        {resolving ? 'Resolving…' : 'Resolve with Demo Credits'} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function CompletedCard({ todaysCommission, subsidy }: { todaysCommission: number; subsidy: number }) {
  return (
    <div className="card text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-500/15">
        <CheckCircle2 className="h-7 w-7 text-brand-400" />
      </div>
      <h3 className="mt-4 text-xl font-bold text-white">Set Completed (Simulated)</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-ink-800/60 p-4">
          <p className="text-xs text-ink-400">Today's Simulated Earnings</p>
          <p className="mt-1 text-xl font-bold text-brand-400">${todaysCommission.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-ink-800/60 p-4">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-xs text-ink-400">Simulated Subsidy (20%)</p>
          </div>
          <p className="mt-1 text-xl font-bold text-amber-400">${subsidy.toFixed(2)}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-500">
        All values above are simulated training figures only — informational, not automatically credited to any
        real account.
      </p>
    </div>
  );
}

function NotReadyCard({ eligibleCount, total }: { eligibleCount: number; total: number }) {
  return (
    <div className="card text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink-700">
        <Clock className="h-7 w-7 text-ink-400" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">Workbench Not Ready</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        {total} eligible products are required to start a workbench set. Check back once more products are
        available.
      </p>
      <p className="mt-4 text-2xl font-extrabold text-white">
        {eligibleCount} <span className="text-ink-500">/</span> {total}
      </p>
      <p className="mt-1 text-xs text-ink-500">eligible products</p>
    </div>
  );
}
