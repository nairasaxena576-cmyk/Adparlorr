import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from '@/components/Toast';
import { Landing } from '@/pages/Landing';
import { Register } from '@/pages/Register';
import { Login } from '@/pages/Login';
import { DashboardLayout } from '@/pages/DashboardLayout';
import { DashboardHome } from '@/pages/DashboardHome';
import { Orders } from '@/pages/Orders';
import { Records } from '@/pages/Records';
import { Referral } from '@/pages/Referral';
import { WalletPage } from '@/pages/Wallet';
import { Support } from '@/pages/Support';
import { Training } from '@/pages/Training';
import { Admin } from '@/pages/Admin';
import { AdminTrainingTasks } from '@/pages/admin/TrainingTasks';
import { AdminTrainingSubmissions } from '@/pages/admin/TrainingSubmissions';
import { AdminTrainingReferrals } from '@/pages/admin/TrainingReferrals';
import { AdminProductManagement } from '@/pages/admin/ProductManagement';
import { AdminSupportInbox } from '@/pages/admin/SupportInbox';
import { useStore } from '@/store/useStore';

function App() {
  const bootstrapAuth = useStore((s) => s.bootstrapAuth);

  useEffect(() => {
    bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        {/* Public Support Chat — reachable without an account. The same
            <Support /> component (and the same /api/support/messages
            backend) an authenticated customer uses via /dashboard/support
            below; resolveSupportIdentity on the backend transparently
            resolves an authenticated session when there is one, and
            establishes a guest identity otherwise. Not nested under
            DashboardLayout, which would redirect an unauthenticated
            visitor to /login. */}
        <Route
          path="/support"
          element={
            <div className="min-h-screen bg-neutral-50 px-4 py-8 sm:px-8">
              <div className="mx-auto max-w-3xl">
                <Support />
              </div>
            </div>
          }
        />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="orders" element={<Orders />} />
          <Route path="records" element={<Records />} />
          <Route path="referral" element={<Referral />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="support" element={<Support />} />
          <Route path="training" element={<Training />} />
        </Route>
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/products" element={<AdminProductManagement />} />
        <Route path="/admin/training" element={<AdminTrainingTasks />} />
        <Route path="/admin/training/submissions" element={<AdminTrainingSubmissions />} />
        <Route path="/admin/training/referrals" element={<AdminTrainingReferrals />} />
        <Route path="/admin/support" element={<AdminSupportInbox />} />
      </Routes>
    </div>
  );
}

export default App;
