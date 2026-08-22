import { create } from 'zustand';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const useToast = () => useToastStore((s) => s.show);

const STYLES: Record<ToastType, { bg: string; icon: typeof Info }> = {
  success: { bg: 'bg-brand-500/15 border-brand-500/30 text-brand-300', icon: CheckCircle2 },
  error: { bg: 'bg-red-500/15 border-red-500/30 text-red-300', icon: AlertTriangle },
  warning: { bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300', icon: AlertTriangle },
  info: { bg: 'bg-sky-500/15 border-sky-500/30 text-sky-300', icon: Info },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[300] flex w-full max-w-sm flex-col gap-2 sm:top-20">
      {toasts.map((t) => {
        const style = STYLES[t.type];
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-md animate-slideInRight ${style.bg}`}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-medium text-ink-100">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
