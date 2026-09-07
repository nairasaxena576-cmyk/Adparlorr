import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/branding/Logo';
import {
  Shield,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Package,
  X,
  Eye,
  EyeOff,
  UploadCloud,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { AdminProduct, Tier } from '@/types';

const TIER_OPTIONS: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

export function AdminProductManagement() {
  const authStatus = useStore((s) => s.authStatus);
  const currentUser = useStore((s) => s.currentUser);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const showToast = useToast();

  const isAdmin = currentUser?.role === 'ADMIN';
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const result = await login(username, pass);
    if (!result.ok) {
      setLoggingIn(false);
      setLoginError(result.error || 'Invalid credentials.');
      return;
    }
    if (useStore.getState().currentUser?.role !== 'ADMIN') {
      await logout();
      setLoggingIn(false);
      setLoginError('Invalid credentials.');
      return;
    }
    setLoggingIn(false);
    showToast('Admin login successful.', 'success');
  };

  if (authStatus === 'idle' || authStatus === 'loading') return <LoadingScreen />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <nav className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
            <Link to="/"><Logo variant="dark" size="lg" /></Link>
            <Link to="/" className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
              <ChevronLeft className="h-4 w-4" /> Back
            </Link>
          </div>
        </nav>
        <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 sm:px-8">
          <div className="w-full card !p-8">
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15">
                <Shield className="h-7 w-7 text-brand-400" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">Admin Panel</h2>
              <p className="mt-1 text-sm text-ink-400">Authorized personnel only.</p>
            </div>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-200">Username</label>
                <input type="text" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)}
                  className="input-base mt-1.5" placeholder="admin" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-200">Password</label>
                <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)}
                  className="input-base mt-1.5" placeholder="••••••••" />
              </div>
              {loginError && <p className="rounded-lg bg-red-500/15 px-4 py-2.5 text-sm text-red-300">{loginError}</p>}
              <button type="submit" disabled={loggingIn} className="btn-brand w-full py-3 disabled:opacity-60">
                {loggingIn ? 'Logging In…' : 'Log In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-400" />
            <span className="text-lg font-extrabold text-brand-400">Product Management</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
              <ChevronLeft className="h-4 w-4" /> Back to Admin
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <ProductListView />
      </div>
    </div>
  );
}

function ProductListView() {
  const products = useStore((s) => s.adminProducts);
  const readiness = useStore((s) => s.adminWorkbenchReadiness);
  const fetchAdminProducts = useStore((s) => s.fetchAdminProducts);
  const updateAdminProduct = useStore((s) => s.updateAdminProduct);
  const deleteAdminProduct = useStore((s) => s.deleteAdminProduct);
  const reorderAdminProduct = useStore((s) => s.reorderAdminProduct);
  const showToast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<AdminProduct | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminProducts();
  }, [fetchAdminProducts]);

  const sorted = [...products].sort((a, b) => a.displayOrder - b.displayOrder);
  const nextDisplayOrder = sorted.length > 0 ? sorted[sorted.length - 1].displayOrder + 1 : 1;

  const handleTogglePublish = async (product: AdminProduct) => {
    setBusyId(product.id);
    const result = await updateAdminProduct(product.id, { isActive: !product.isActive });
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to update product.', 'error');
      return;
    }
    showToast(product.isActive ? 'Product unpublished.' : 'Product published.', 'success');
  };

  const handleReorder = async (product: AdminProduct, direction: 'up' | 'down') => {
    setBusyId(product.id);
    const result = await reorderAdminProduct(product.id, direction);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to reorder product.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setBusyId(deletingProduct.id);
    const result = await deleteAdminProduct(deletingProduct.id);
    setBusyId(null);
    setDeletingProduct(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to delete product.', 'error');
      return;
    }
    showToast('Product deleted.', 'success');
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Product Management</h1>
          <p className="mt-1 text-sm text-ink-400">
            Products published here appear as submittable cards on the customer Orders page.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {readiness && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            readiness.ready
              ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">Workbench readiness by tier</span>
            <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
              {readiness.ready ? 'Ready' : 'Not Ready'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
            {readiness.tiers.map((t) => (
              <span key={t.tier} className={t.ready ? '' : 'font-semibold'}>
                {t.tier}: {t.eligibleCount} / {t.required}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-ink-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Price</th>
                <th className="px-4 py-3 text-right font-semibold">Reward</th>
                <th className="px-4 py-3 text-right font-semibold">Fee</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Eligibility</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-ink-400">
                    No products yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                sorted.map((product, idx) => {
                  const busy = busyId === product.id;
                  return (
                    <tr key={product.id} className="bg-ink-900 hover:bg-ink-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductThumbnail product={product} />
                          <span className="font-medium text-white">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-400">{product.category}</td>
                      <td className="px-4 py-3 text-right">
                        {product.price > 0 ? (
                          <span className="font-semibold text-white">${product.price.toFixed(2)}</span>
                        ) : (
                          <span className="text-amber-400" title="Not priced — hidden from the customer workbench">
                            Not priced
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-brand-400">+${product.reward.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-red-400">-${product.cost.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            product.isActive ? 'bg-brand-500/15 text-brand-300' : 'bg-ink-700 text-ink-400'
                          }`}
                        >
                          {product.isActive ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-300">{product.tierEligibility}</td>
                      <td className="px-4 py-3 text-ink-300">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            product.isActive && product.price > 0
                              ? 'bg-brand-500/15 text-brand-300'
                              : 'bg-ink-700 text-ink-400'
                          }`}
                        >
                          {product.isActive && product.price > 0 ? 'Eligible' : 'Not Eligible'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-300">
                        <div className="flex items-center gap-1">
                          <span>{product.displayOrder}</span>
                          <IconButton label="Move up" onClick={() => handleReorder(product, 'up')} disabled={busy || idx === 0}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            label="Move down"
                            onClick={() => handleReorder(product, 'down')}
                            disabled={busy || idx === sorted.length - 1}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <IconButton
                            label={product.isActive ? 'Unpublish' : 'Publish'}
                            onClick={() => handleTogglePublish(product)}
                            disabled={busy}
                          >
                            {product.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </IconButton>
                          <IconButton label="Edit" onClick={() => setEditingProduct(product)} disabled={busy}>
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Delete" onClick={() => setDeletingProduct(product)} disabled={busy} danger>
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <ProductFormModal mode="create" nextDisplayOrder={nextDisplayOrder} onClose={() => setShowCreate(false)} />
      )}
      {editingProduct && (
        <ProductFormModal
          mode="edit"
          product={editingProduct}
          nextDisplayOrder={nextDisplayOrder}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {deletingProduct && (
        <ConfirmModal
          title="Delete Product?"
          message={`"${deletingProduct.name}" will be permanently removed. If customers have already submitted this product, deletion is blocked automatically — unpublish it instead.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setDeletingProduct(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function ProductThumbnail({ product }: { product: AdminProduct }) {
  const [failed, setFailed] = useState(false);

  if (!product.imageUrl || failed) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-700">
        <Package className="h-4 w-4 text-ink-300" />
      </div>
    );
  }

  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-lg object-cover"
    />
  );
}

function ProductFormModal({
  mode,
  product,
  nextDisplayOrder,
  onClose,
}: {
  mode: 'create' | 'edit';
  product?: AdminProduct;
  nextDisplayOrder: number;
  onClose: () => void;
}) {
  const createAdminProduct = useStore((s) => s.createAdminProduct);
  const updateAdminProduct = useStore((s) => s.updateAdminProduct);
  const uploadAdminProductImage = useStore((s) => s.uploadAdminProductImage);
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(product?.name ?? '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [tierEligibility, setTierEligibility] = useState<Tier>(product?.tierEligibility ?? 'Bronze');
  const [reward, setReward] = useState(product ? String(product.reward) : '');
  const [cost, setCost] = useState(product ? String(product.cost) : '');
  const [isActive, setIsActive] = useState(product?.isActive ?? false);
  const [displayOrder, setDisplayOrder] = useState(String(product?.displayOrder ?? nextDisplayOrder));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    const result = await uploadAdminProductImage(file);
    setUploading(false);
    if (!result.ok || !result.imageUrl) {
      setError(result.error || 'Failed to upload image.');
      return;
    }
    setImageUrl(result.imageUrl);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!category.trim()) {
      setError('Category is required.');
      return;
    }
    const priceNum = Number(price || 0);
    const rewardNum = Number(reward);
    const costNum = Number(cost);
    if (price !== '' && (Number.isNaN(priceNum) || priceNum < 0)) {
      setError('Enter a valid price amount.');
      return;
    }
    if (!reward || Number.isNaN(rewardNum) || rewardNum <= 0) {
      setError('Enter a valid reward amount.');
      return;
    }
    if (cost === '' || Number.isNaN(costNum) || costNum < 0) {
      setError('Enter a valid fee amount.');
      return;
    }
    setError('');
    setSaving(true);
    const payload = {
      name: name.trim(),
      category: category.trim(),
      price: priceNum,
      tierEligibility,
      reward: rewardNum,
      cost: costNum,
      imageUrl: imageUrl || null,
      isActive,
      displayOrder: Number(displayOrder) || undefined,
    };
    const result =
      mode === 'create' ? await createAdminProduct(payload) : await updateAdminProduct(product!.id, payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || 'Failed to save product.');
      return;
    }
    showToast(mode === 'create' ? 'Product created.' : 'Product updated.', 'success');
    onClose();
  };

  return (
    <Modal title={mode === 'create' ? 'Add Product' : 'Edit Product'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Product Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base"
            disabled={saving}
            placeholder="e.g. Nike Air Max 90"
          />
        </Field>

        <Field label="Product Image">
          <div className="space-y-2">
            {imageUrl && (
              <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-800">
                <img src={imageUrl} alt="Product preview" className="h-40 w-full object-cover" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || saving}
              className="btn-ghost w-full disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              {uploading ? 'Uploading…' : imageUrl ? 'Replace Image' : 'Upload Image'}
            </button>
            <p className="text-xs text-ink-500">Optional — products without an image show a placeholder icon.</p>
          </div>
        </Field>

        <Field label="Category">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-base"
            disabled={saving}
            placeholder="e.g. Footwear"
          />
        </Field>

        <Field label="Price ($)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input-base"
            disabled={saving}
            placeholder="150.00"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            Drives the workbench commission (1% normal, 10% merged). Leave at 0 to keep this product
            out of the customer workbench for now.
          </p>
        </Field>

        <Field label="Tier Eligibility">
          <select
            value={tierEligibility}
            onChange={(e) => setTierEligibility(e.target.value as Tier)}
            className="input-base"
            disabled={saving}
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-500">
            Which customer tier's workbench band this product appears in. Bronze customers only ever see
            Bronze products, Platinum only Platinum, and so on.
          </p>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Reward ($)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              className="input-base"
              disabled={saving}
              placeholder="0.80"
            />
          </Field>
          <Field label="Fee ($)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="input-base"
              disabled={saving}
              placeholder="0.30"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <Checkbox label="Published" checked={isActive} onChange={setIsActive} disabled={saving} />
          <div className="flex items-center gap-2">
            <label className="text-sm text-ink-200">Display Order</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="input-base w-20"
              disabled={saving}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-brand disabled:opacity-60" disabled={saving || uploading}>
            {saving ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Small local components (each admin page keeps its own copy of these,
// matching the existing project convention rather than a shared module)
// ============================================================

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-600 bg-ink-900 p-6 shadow-2xl animate-scaleIn">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-ink-800">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-200">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Checkbox({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-brand-500 focus:ring-brand-500 disabled:opacity-60"
      />
      {label}
    </label>
  );
}

function IconButton({
  onClick,
  label,
  children,
  disabled,
  danger,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40 ${
        danger ? 'text-ink-300 hover:bg-red-500/15 hover:text-red-400' : 'text-ink-300 hover:bg-ink-700'
      }`}
    >
      {children}
    </button>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-ink-600 bg-ink-900 p-6 shadow-2xl animate-scaleIn">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-ink-300">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
