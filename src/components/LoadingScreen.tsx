import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950">
      <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
    </div>
  );
}
