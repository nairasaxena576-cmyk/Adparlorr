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
  ImagePlus,
  ClipboardList,
  X,
  Eye,
  EyeOff,
  UploadCloud,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { AdminTrainingTask } from '@/types';

export function AdminTrainingTasks() {
  const authStatus = useStore((s) => s.authStatus);
  const currentUser = useStore((s) => s.currentUser);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const showToast = useToast();

  const isAdmin = currentUser?.role === 'ADMIN';
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const result = await login(email, pass);
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
                <label className="block text-sm font-medium text-ink-200">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-base mt-1.5" placeholder="admin@example.com" />
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
            <ImagePlus className="h-5 w-5 text-brand-400" />
            <span className="text-lg font-extrabold text-brand-400">Training Tasks</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/training/submissions" className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-brand-400">
              <ClipboardList className="h-4 w-4" /> Submissions
            </Link>
            <Link to="/admin" className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
              <ChevronLeft className="h-4 w-4" /> Back to Admin
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <TaskListView />
      </div>
    </div>
  );
}

function TaskListView() {
  const tasks = useStore((s) => s.adminTrainingTasks);
  const fetchAdminTrainingTasks = useStore((s) => s.fetchAdminTrainingTasks);
  const updateAdminTrainingTask = useStore((s) => s.updateAdminTrainingTask);
  const deleteAdminTrainingTask = useStore((s) => s.deleteAdminTrainingTask);
  const reorderAdminTrainingTask = useStore((s) => s.reorderAdminTrainingTask);
  const showToast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTrainingTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<AdminTrainingTask | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminTrainingTasks();
  }, [fetchAdminTrainingTasks]);

  const sorted = [...tasks].sort((a, b) => a.order - b.order);

  const handleTogglePublish = async (task: AdminTrainingTask) => {
    setBusyId(task.id);
    const result = await updateAdminTrainingTask(task.id, { isPublished: !task.isPublished });
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to update task.', 'error');
      return;
    }
    showToast(task.isPublished ? 'Task unpublished.' : 'Task published.', 'success');
  };

  const handleReorder = async (task: AdminTrainingTask, direction: 'up' | 'down') => {
    setBusyId(task.id);
    await reorderAdminTrainingTask(task.id, direction);
    setBusyId(null);
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    setBusyId(deletingTask.id);
    const result = await deleteAdminTrainingTask(deletingTask.id);
    setBusyId(null);
    setDeletingTask(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to delete task.', 'error');
      return;
    }
    showToast('Task deleted.', 'success');
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Training Tasks</h1>
          <p className="mt-1 text-sm text-ink-400">
            Upload a product photo and name — customers must identify it before deposits unlock.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand">
          <Plus className="h-4 w-4" /> Add Product Task
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {sorted.length === 0 ? (
          <div className="card sm:col-span-2 text-center text-sm text-ink-400">
            No training tasks yet. Create one to get started.
          </div>
        ) : (
          sorted.map((task, idx) => {
            const busy = busyId === task.id;
            return (
              <div key={task.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-white">{task.productName}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      task.isPublished ? 'bg-brand-500/15 text-brand-300' : 'bg-ink-700 text-ink-400'
                    }`}
                  >
                    {task.isPublished ? 'Published' : 'Unpublished'}
                  </span>
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border border-ink-700 bg-ink-800">
                  <img src={task.imageUrl} alt={task.productName} className="h-40 w-full object-cover" />
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-ink-400">
                  <span>{task.isRequired ? 'Required' : 'Optional'}</span>
                  <span>·</span>
                  <span>Order: {task.order}</span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-ink-700 pt-3">
                  <div className="flex items-center gap-1">
                    <IconButton label="Move up" onClick={() => handleReorder(task, 'up')} disabled={busy || idx === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      onClick={() => handleReorder(task, 'down')}
                      disabled={busy || idx === sorted.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      label={task.isPublished ? 'Unpublish' : 'Publish'}
                      onClick={() => handleTogglePublish(task)}
                      disabled={busy}
                    >
                      {task.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </IconButton>
                    <IconButton label="Edit" onClick={() => setEditingTask(task)} disabled={busy}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => setDeletingTask(task)} disabled={busy} danger>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCreate && <TaskFormModal mode="create" onClose={() => setShowCreate(false)} />}
      {editingTask && <TaskFormModal mode="edit" task={editingTask} onClose={() => setEditingTask(null)} />}
      {deletingTask && (
        <ConfirmModal
          title="Delete Training Task?"
          message={`"${deletingTask.productName}" will be permanently removed. Past submissions keep their own record of the product name and image, so review history is preserved.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setDeletingTask(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function TaskFormModal({
  mode,
  task,
  onClose,
}: {
  mode: 'create' | 'edit';
  task?: AdminTrainingTask;
  onClose: () => void;
}) {
  const createAdminTrainingTask = useStore((s) => s.createAdminTrainingTask);
  const updateAdminTrainingTask = useStore((s) => s.updateAdminTrainingTask);
  const uploadAdminTrainingTaskImage = useStore((s) => s.uploadAdminTrainingTaskImage);
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productName, setProductName] = useState(task?.productName ?? '');
  const [imageUrl, setImageUrl] = useState(task?.imageUrl ?? '');
  const [instruction, setInstruction] = useState(
    task?.instruction ?? 'Look carefully at the image below and enter the product name.'
  );
  const [isPublished, setIsPublished] = useState(task?.isPublished ?? false);
  const [isRequired, setIsRequired] = useState(task?.isRequired ?? true);
  const [order, setOrder] = useState(String(task?.order ?? 0));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    const result = await uploadAdminTrainingTaskImage(file);
    setUploading(false);
    if (!result.ok || !result.imageUrl) {
      setError(result.error || 'Failed to upload image.');
      return;
    }
    setImageUrl(result.imageUrl);
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!imageUrl) {
      setError('Upload a product image first.');
      return;
    }
    if (!instruction.trim()) {
      setError('Instruction is required.');
      return;
    }
    setError('');
    setSaving(true);
    const payload = {
      productName: productName.trim(),
      imageUrl,
      instruction: instruction.trim(),
      isPublished,
      isRequired,
      order: Number(order) || 0,
    };
    const result =
      mode === 'create' ? await createAdminTrainingTask(payload) : await updateAdminTrainingTask(task!.id, payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || 'Failed to save task.');
      return;
    }
    showToast(mode === 'create' ? 'Task created.' : 'Task updated.', 'success');
    onClose();
  };

  return (
    <Modal title={mode === 'create' ? 'Add Product Task' : 'Edit Product Task'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Product Name">
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
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
          </div>
        </Field>

        <Field label="Instruction">
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="input-base min-h-[60px]"
            disabled={saving}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-5">
          <Checkbox label="Published" checked={isPublished} onChange={setIsPublished} disabled={saving} />
          <Checkbox label="Required" checked={isRequired} onChange={setIsRequired} disabled={saving} />
          <div className="flex items-center gap-2">
            <label className="text-sm text-ink-200">Order</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="input-base w-20"
              disabled={saving}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-brand disabled:opacity-60" disabled={saving || uploading}>
            {saving ? 'Saving…' : 'Save Task'}
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
