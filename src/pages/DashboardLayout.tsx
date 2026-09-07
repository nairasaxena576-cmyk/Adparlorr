import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Wallet,
  HeadphonesIcon,
  GraduationCap,
  ClipboardList,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import { BottomNav } from '@/components/BottomNav';
import { CustomerBackground } from '@/components/customer/CustomerBackground';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/orders', label: 'Orders', Icon: ShoppingBag, end: false },
  { to: '/dashboard/records', label: 'Records', Icon: ClipboardList, end: false },
  { to: '/dashboard/referral', label: 'Referral', Icon: Users, end: false },
  { to: '/dashboard/wallet', label: 'Wallet', Icon: Wallet, end: false },
  { to: '/dashboard/training', label: 'Training', Icon: GraduationCap, end: false },
  { to: '/dashboard/support', label: 'Support', Icon: HeadphonesIcon, end: false },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const authStatus = useStore((s) => s.authStatus);
  const user = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const showToast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authStatus === 'idle' || authStatus === 'loading') return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully.', 'info');
    navigate('/');
  };

  const balance = user.balance.toFixed(2);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-900">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-lg text-ink-200 hover:bg-ink-800 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-lg font-extrabold text-brand-400">Adparlorr</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 rounded-lg border border-ink-700 px-3 py-1.5 sm:flex">
              <Wallet className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-semibold text-white">${balance}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-300">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium text-ink-200 sm:block">{user.fullName.split(' ')[0]}</span>
            </div>
            <button
              onClick={handleLogout}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-300 transition hover:bg-red-500/15 hover:text-red-400"
              aria-label="Log out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar — desktop */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-ink-700 bg-ink-900 lg:block">
          <SidebarContent onNavigate={closeSidebar} />
        </aside>

        {/* Sidebar — mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={closeSidebar} />
            <aside className="absolute left-0 top-0 h-full w-64 border-r border-ink-700 bg-ink-900 animate-slideInRight">
              <button
                onClick={closeSidebar}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-ink-800"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={closeSidebar} />
            </aside>
          </div>
        )}

        {/* Main — decorative pastel background sits behind the real content
            (CustomerBackground is purely visual, z-indexed below Outlet).
            Bottom padding on mobile clears the fixed BottomNav so it never
            covers the last bit of page content; not needed at lg: since the
            bottom nav is hidden there. */}
        <main className="relative min-h-[calc(100vh-4rem)] flex-1 overflow-hidden px-4 pb-24 pt-24 sm:px-6 sm:pb-8 sm:pt-28 lg:pb-8">
          <CustomerBackground />
          <div className="relative z-10 py-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav className="flex h-full flex-col p-4">
      <div className="space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-white'
              }`
            }
          >
            <item.Icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
      <div className="mt-auto hidden rounded-lg bg-ink-800/60 p-3 text-[10px] text-ink-500 lg:block">
        This is an authorized security awareness training simulation. Not for real-world use.
      </div>
    </nav>
  );
}
