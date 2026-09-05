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
import { AdminProductManagement } from '@/pages/admin/ProductManagement';
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
      </Routes>
    </div>
  );
}

export default App;
