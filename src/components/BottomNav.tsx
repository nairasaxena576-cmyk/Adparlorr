import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Play, ClipboardList } from 'lucide-react';

const ITEMS = [
  { to: '/dashboard', label: 'Home', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/orders', label: 'Starting', Icon: Play, end: false },
  { to: '/dashboard/records', label: 'Records', Icon: ClipboardList, end: false },
];

// Mobile-only (see DashboardLayout.tsx's lg:hidden wrapper) — the desktop
// sidebar already covers full navigation, so this stays a lean 3-item bar
// matching the reference screenshot rather than duplicating every route.
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-900/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                isActive ? 'text-brand-400' : 'text-ink-400 hover:text-ink-200'
              }`
            }
          >
            <item.Icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
