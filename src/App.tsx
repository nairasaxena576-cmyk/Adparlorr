import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { TrainingBanner } from '@/components/TrainingBanner';
import { ToastContainer } from '@/components/Toast';
import { Landing } from '@/pages/Landing';
import { Register } from '@/pages/Register';
import { Login } from '@/pages/Login';
import { DashboardLayout } from '@/pages/DashboardLayout';
import { DashboardHome } from '@/pages/DashboardHome';
import { Orders } from '@/pages/Orders';
import { Referral } from '@/pages/Referral';
import { WalletPage } from '@/pages/Wallet';
import { Support } from '@/pages/Support';
import { Training } from '@/pages/Training';
import { TrainingCourse } from '@/pages/TrainingCourse';
import { TrainingLesson } from '@/pages/TrainingLesson';
import { TrainingAssessment } from '@/pages/TrainingAssessment';
import { Admin } from '@/pages/Admin';
import { AdminTrainingManagement } from '@/pages/admin/TrainingManagement';
import { useStore } from '@/store/useStore';

function App() {
  const bootstrapAuth = useStore((s) => s.bootstrapAuth);

  useEffect(() => {
    bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-ink-900">
      <TrainingBanner />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="orders" element={<Orders />} />
          <Route path="referral" element={<Referral />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="support" element={<Support />} />
          <Route path="training" element={<Training />} />
          <Route path="training/:courseId" element={<TrainingCourse />} />
          <Route path="training/:courseId/lessons/:lessonId" element={<TrainingLesson />} />
          <Route path="training/:courseId/assessment" element={<TrainingAssessment />} />
        </Route>
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/training" element={<AdminTrainingManagement />} />
      </Routes>
    </div>
  );
}

export default App;
