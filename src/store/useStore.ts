import { create } from 'zustand';
import { api, ApiError } from '@/lib/api';
import type {
  User,
  TaskSubmission,
  Transaction,
  ReferralEntry,
  SupportSettings,
  CryptoAsset,
  CryptoAssetCode,
  Deposit,
  AdminDeposit,
  DepositStatus,
  CourseSummary,
  CourseDetail,
  LessonDetail,
  AssessmentForCustomer,
  AssessmentResult,
  AdminCourseListItem,
  AdminCourseDetail,
  CustomerTrainingTask,
  TrainingTaskProgress,
  SubmitTrainingTaskResult,
  TrainingReferralStatus,
  AdminTrainingTask,
  AdminTrainingTaskSubmission,
  TrainingTaskSubmissionStatus,
  AdminProduct,
  WorkbenchState,
  WorkbenchReadiness,
  SubmitWorkbenchResult,
} from '@/types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface ReferralsData {
  referralCode: string;
  referrals: ReferralEntry[];
  stats: { joined: number; active: number };
}

interface ActionResult {
  ok: boolean;
  error?: string;
}

interface AppState {
  authStatus: AuthStatus;
  currentUser: User | null;

  workbench: WorkbenchState | null;
  submissions: TaskSubmission[];
  transactions: Transaction[];
  referralsData: ReferralsData | null;
  adminUsers: User[];
  supportSettings: SupportSettings | null;
  cryptoAssets: CryptoAsset[];
  adminCryptoAssets: CryptoAsset[];
  adminDeposits: AdminDeposit[];

  trainingCourses: CourseSummary[];
  trainingCourseDetail: CourseDetail | null;
  currentLesson: LessonDetail | null;
  currentAssessment: AssessmentForCustomer | null;
  lastAssessmentResult: AssessmentResult | null;

  adminTrainingCourses: AdminCourseListItem[];
  adminTrainingCourseDetail: AdminCourseDetail | null;

  trainingTasks: CustomerTrainingTask[];
  trainingTaskProgress: TrainingTaskProgress | null;
  trainingReferralStatus: TrainingReferralStatus | null;
  adminTrainingTasks: AdminTrainingTask[];
  adminTrainingSubmissions: AdminTrainingTaskSubmission[];

  adminProducts: AdminProduct[];
  adminWorkbenchReadiness: WorkbenchReadiness | null;

  bootstrapAuth: () => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    referralCode: string;
  }) => Promise<ActionResult>;
  login: (email: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  getCurrentUser: () => User | null;

  fetchWorkbench: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  submitWorkbenchProduct: (
    productId: string
  ) => Promise<{ ok: boolean; error?: string; result?: SubmitWorkbenchResult }>;
  // Demo-only shortfall resolution — never calls the real deposit API.
  resolveDemoShortfall: () => Promise<ActionResult>;

  fetchTransactions: () => Promise<void>;
  fetchCryptoAssets: () => Promise<void>;
  deposit: (
    assetCode: CryptoAssetCode,
    amount: number
  ) => Promise<{ ok: boolean; error?: string; deposit?: Deposit }>;
  requestWithdrawal: () => Promise<{ blocked: boolean; message: string }>;

  fetchReferrals: () => Promise<void>;

  fetchAdminUsers: () => Promise<void>;
  adminCreditUser: (userId: string, amount: number) => Promise<ActionResult>;
  adminResetUserTasks: (userId: string) => Promise<ActionResult>;

  fetchSupportSettings: () => Promise<void>;
  fetchAdminSupportSettings: () => Promise<void>;
  updateAdminSupportSettings: (input: {
    telegramUsername: string;
    telegramEnabled: boolean;
  }) => Promise<ActionResult>;

  fetchAdminCryptoAssets: () => Promise<void>;
  updateAdminCryptoAsset: (
    code: CryptoAssetCode,
    input: { address?: string | null; isEnabled: boolean }
  ) => Promise<ActionResult>;

  fetchAdminDeposits: (status?: DepositStatus) => Promise<void>;
  adminApproveDeposit: (depositId: string) => Promise<ActionResult>;
  adminRejectDeposit: (depositId: string) => Promise<ActionResult>;

  // ---- Training (customer) ----
  fetchTrainingCourses: () => Promise<void>;
  fetchTrainingCourseDetail: (courseId: string) => Promise<void>;
  fetchLesson: (lessonId: string) => Promise<void>;
  completeLesson: (lessonId: string) => Promise<ActionResult>;
  fetchAssessment: (courseId: string) => Promise<void>;
  submitAssessment: (
    courseId: string,
    answers: { questionId: string; answerId: string }[]
  ) => Promise<{ ok: boolean; error?: string; result?: AssessmentResult }>;

  // ---- Training (admin) ----
  fetchAdminTrainingCourses: () => Promise<void>;
  fetchAdminTrainingCourseDetail: (courseId: string) => Promise<void>;
  createAdminTrainingCourse: (input: Record<string, unknown>) => Promise<ActionResult & { courseId?: string }>;
  updateAdminTrainingCourse: (courseId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  deleteAdminTrainingCourse: (courseId: string) => Promise<ActionResult>;
  createAdminTrainingChapter: (courseId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  updateAdminTrainingChapter: (chapterId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  deleteAdminTrainingChapter: (chapterId: string) => Promise<ActionResult>;
  reorderAdminTrainingChapter: (chapterId: string, direction: 'up' | 'down') => Promise<ActionResult>;
  createAdminTrainingLesson: (chapterId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  updateAdminTrainingLesson: (lessonId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  deleteAdminTrainingLesson: (lessonId: string) => Promise<ActionResult>;
  reorderAdminTrainingLesson: (lessonId: string, direction: 'up' | 'down') => Promise<ActionResult>;
  updateAdminAssessment: (courseId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  createAdminQuestion: (assessmentId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  updateAdminQuestion: (questionId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  deleteAdminQuestion: (questionId: string) => Promise<ActionResult>;
  reorderAdminQuestion: (questionId: string, direction: 'up' | 'down') => Promise<ActionResult>;
  resetTrainingProgress: (courseId: string, userId?: string) => Promise<ActionResult>;

  // ---- Training tasks (product-image identification, customer) ----
  fetchTrainingTasks: () => Promise<ActionResult>;
  fetchTrainingTaskProgress: () => Promise<ActionResult>;
  submitTrainingTask: (
    taskId: string,
    answer: string
  ) => Promise<{ ok: boolean; error?: string; result?: SubmitTrainingTaskResult }>;

  // ---- Training access gate (referral + funding) ----
  fetchTrainingReferralStatus: () => Promise<void>;
  verifyTrainingReferral: (referralCode: string) => Promise<{ ok: boolean; error?: string }>;

  // ---- Training tasks (admin) ----
  fetchAdminTrainingTasks: () => Promise<void>;
  createAdminTrainingTask: (input: Record<string, unknown>) => Promise<ActionResult>;
  updateAdminTrainingTask: (taskId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  deleteAdminTrainingTask: (taskId: string) => Promise<ActionResult>;
  reorderAdminTrainingTask: (taskId: string, direction: 'up' | 'down') => Promise<ActionResult>;
  uploadAdminTrainingTaskImage: (file: File) => Promise<{ ok: boolean; error?: string; imageUrl?: string }>;
  fetchAdminTrainingSubmissions: (status?: TrainingTaskSubmissionStatus) => Promise<void>;
  approveAdminTrainingSubmission: (submissionId: string) => Promise<ActionResult>;
  rejectAdminTrainingSubmission: (submissionId: string, rejectionReason: string) => Promise<ActionResult>;

  // ---- Products (admin) ----
  fetchAdminProducts: () => Promise<void>;
  createAdminProduct: (input: Record<string, unknown>) => Promise<ActionResult>;
  updateAdminProduct: (productId: string, input: Record<string, unknown>) => Promise<ActionResult>;
  deleteAdminProduct: (productId: string) => Promise<ActionResult>;
  reorderAdminProduct: (productId: string, direction: 'up' | 'down') => Promise<ActionResult>;
  uploadAdminProductImage: (file: File) => Promise<{ ok: boolean; error?: string; imageUrl?: string }>;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export const useStore = create<AppState>()((set, get) => ({
  authStatus: 'idle',
  currentUser: null,
  workbench: null,
  submissions: [],
  transactions: [],
  referralsData: null,
  adminUsers: [],
  supportSettings: null,
  cryptoAssets: [],
  adminCryptoAssets: [],
  adminDeposits: [],

  trainingCourses: [],
  trainingCourseDetail: null,
  currentLesson: null,
  currentAssessment: null,
  lastAssessmentResult: null,
  adminTrainingCourses: [],
  adminTrainingCourseDetail: null,

  trainingTasks: [],
  trainingTaskProgress: null,
  trainingReferralStatus: null,
  adminTrainingTasks: [],
  adminTrainingSubmissions: [],

  adminProducts: [],
  adminWorkbenchReadiness: null,

  bootstrapAuth: async () => {
    set({ authStatus: 'loading' });
    try {
      const { data } = await api.get<{ user: User }>('/api/auth/me');
      set({ currentUser: data.user, authStatus: 'authenticated' });
    } catch {
      set({ currentUser: null, authStatus: 'unauthenticated' });
    }
  },

  register: async (input) => {
    try {
      const { data } = await api.post<{ user: User }>('/api/auth/register', input);
      set({ currentUser: data.user, authStatus: 'authenticated' });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Registration failed.') };
    }
  },

  login: async (email, password) => {
    try {
      const { data } = await api.post<{ user: User }>('/api/auth/login', { email, password });
      set({ currentUser: data.user, authStatus: 'authenticated' });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Login failed.') };
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Clear client state regardless — the cookie is gone from the
      // browser's perspective either way once we stop trusting it below.
    }
    set({
      currentUser: null,
      authStatus: 'unauthenticated',
      workbench: null,
      submissions: [],
      transactions: [],
      referralsData: null,
      adminUsers: [],
      supportSettings: null,
      cryptoAssets: [],
      adminCryptoAssets: [],
      adminDeposits: [],
      trainingCourses: [],
      trainingCourseDetail: null,
      currentLesson: null,
      currentAssessment: null,
      lastAssessmentResult: null,
      adminTrainingCourses: [],
      adminTrainingCourseDetail: null,
      trainingTasks: [],
      trainingTaskProgress: null,
      adminTrainingTasks: [],
      adminTrainingSubmissions: [],
      adminProducts: [],
      adminWorkbenchReadiness: null,
    });
  },

  getCurrentUser: () => get().currentUser,

  fetchWorkbench: async () => {
    const { data } = await api.get<{ workbench: WorkbenchState }>('/api/orders/workbench');
    set({ workbench: data.workbench });
  },

  fetchOrders: async () => {
    const { data } = await api.get<{ submissions: TaskSubmission[] }>('/api/orders');
    set({ submissions: data.submissions });
  },

  submitWorkbenchProduct: async (productId) => {
    try {
      const { data } = await api.post<SubmitWorkbenchResult>('/api/orders', { productId });
      set({ currentUser: data.user, workbench: data.workbench });
      return { ok: true, result: data };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Submission failed.') };
    }
  },

  resolveDemoShortfall: async () => {
    try {
      const { data } = await api.post<{ user: User; workbench: WorkbenchState }>(
        '/api/orders/resolve-demo-shortfall'
      );
      set({ currentUser: data.user, workbench: data.workbench });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to resolve the demo shortfall.') };
    }
  },

  fetchTransactions: async () => {
    const { data } = await api.get<{ transactions: Transaction[] }>('/api/wallet/transactions');
    set({ transactions: data.transactions });
  },

  fetchCryptoAssets: async () => {
    const { data } = await api.get<{ assets: CryptoAsset[] }>('/api/wallet/crypto-assets');
    set({ cryptoAssets: data.assets });
  },

  deposit: async (assetCode, amount) => {
    try {
      const { data } = await api.post<{ deposit: Deposit; user: User }>('/api/wallet/deposit', {
        assetCode,
        amount,
      });
      set({ currentUser: data.user });
      await get().fetchTransactions();
      return { ok: true, deposit: data.deposit };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Deposit request failed.') };
    }
  },

  requestWithdrawal: async () => {
    try {
      const { data } = await api.post<{ blocked: boolean; status: string; message: string }>(
        '/api/wallet/withdraw'
      );
      return { blocked: data.blocked, message: data.message };
    } catch (err) {
      return { blocked: true, message: errorMessage(err, 'Something went wrong. Please try again.') };
    }
  },

  fetchReferrals: async () => {
    const { data } = await api.get<ReferralsData>('/api/referrals');
    set({ referralsData: data });
  },

  fetchAdminUsers: async () => {
    const { data } = await api.get<{ users: User[] }>('/api/admin/users');
    set({ adminUsers: data.users });
  },

  adminCreditUser: async (userId, amount) => {
    try {
      await api.post(`/api/admin/users/${userId}/credit`, { amount });
      await get().fetchAdminUsers();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Credit failed.') };
    }
  },

  adminResetUserTasks: async (userId) => {
    try {
      await api.post(`/api/admin/users/${userId}/reset`);
      await get().fetchAdminUsers();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Reset failed.') };
    }
  },

  fetchSupportSettings: async () => {
    const { data } = await api.get<SupportSettings>('/api/support/telegram');
    set({ supportSettings: data });
  },

  fetchAdminSupportSettings: async () => {
    const { data } = await api.get<SupportSettings>('/api/admin/support-settings');
    set({ supportSettings: data });
  },

  updateAdminSupportSettings: async (input) => {
    try {
      const { data } = await api.put<SupportSettings>('/api/admin/support-settings', input);
      set({ supportSettings: data });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to save Telegram settings.') };
    }
  },

  fetchAdminCryptoAssets: async () => {
    const { data } = await api.get<{ assets: CryptoAsset[] }>('/api/admin/crypto-assets');
    set({ adminCryptoAssets: data.assets });
  },

  updateAdminCryptoAsset: async (code, input) => {
    try {
      await api.put(`/api/admin/crypto-assets/${code}`, input);
      await get().fetchAdminCryptoAssets();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to save asset settings.') };
    }
  },

  fetchAdminDeposits: async (status) => {
    const query = status ? `?status=${status}` : '';
    const { data } = await api.get<{ deposits: AdminDeposit[] }>(`/api/admin/deposits${query}`);
    set({ adminDeposits: data.deposits });
  },

  adminApproveDeposit: async (depositId) => {
    try {
      await api.post(`/api/admin/deposits/${depositId}/approve`);
      await get().fetchAdminDeposits();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to approve deposit.') };
    }
  },

  adminRejectDeposit: async (depositId) => {
    try {
      await api.post(`/api/admin/deposits/${depositId}/reject`);
      await get().fetchAdminDeposits();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to reject deposit.') };
    }
  },

  // ---- Training (customer) ----

  fetchTrainingCourses: async () => {
    const { data } = await api.get<{ courses: CourseSummary[] }>('/api/training/courses');
    set({ trainingCourses: data.courses });
  },

  fetchTrainingCourseDetail: async (courseId) => {
    const { data } = await api.get<{ course: CourseDetail }>(`/api/training/courses/${courseId}`);
    set({ trainingCourseDetail: data.course });
  },

  fetchLesson: async (lessonId) => {
    const { data } = await api.get<{ lesson: LessonDetail }>(`/api/training/lessons/${lessonId}`);
    set({ currentLesson: data.lesson });
  },

  completeLesson: async (lessonId) => {
    try {
      await api.post(`/api/training/lessons/${lessonId}/complete`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to mark lesson complete.') };
    }
  },

  fetchAssessment: async (courseId) => {
    const { data } = await api.get<{ assessment: AssessmentForCustomer }>(
      `/api/training/courses/${courseId}/assessment`
    );
    set({ currentAssessment: data.assessment });
  },

  submitAssessment: async (courseId, answers) => {
    try {
      const { data } = await api.post<AssessmentResult>(
        `/api/training/courses/${courseId}/assessment/submit`,
        { answers }
      );
      set({ lastAssessmentResult: data, currentUser: data.user });
      return { ok: true, result: data };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to submit assessment.') };
    }
  },

  // ---- Training (admin) ----

  fetchAdminTrainingCourses: async () => {
    const { data } = await api.get<{ courses: AdminCourseListItem[] }>('/api/admin/training/courses');
    set({ adminTrainingCourses: data.courses });
  },

  fetchAdminTrainingCourseDetail: async (courseId) => {
    const { data } = await api.get<{ course: AdminCourseDetail }>(`/api/admin/training/courses/${courseId}`);
    set({ adminTrainingCourseDetail: data.course });
  },

  createAdminTrainingCourse: async (input) => {
    try {
      const { data } = await api.post<{ course: AdminCourseDetail }>('/api/admin/training/courses', input);
      await get().fetchAdminTrainingCourses();
      return { ok: true, courseId: data.course.id };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to create course.') };
    }
  },

  updateAdminTrainingCourse: async (courseId, input) => {
    try {
      await api.put(`/api/admin/training/courses/${courseId}`, input);
      await get().fetchAdminTrainingCourses();
      if (get().adminTrainingCourseDetail?.id === courseId) {
        await get().fetchAdminTrainingCourseDetail(courseId);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to update course.') };
    }
  },

  deleteAdminTrainingCourse: async (courseId) => {
    try {
      await api.delete(`/api/admin/training/courses/${courseId}`);
      await get().fetchAdminTrainingCourses();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to delete course.') };
    }
  },

  createAdminTrainingChapter: async (courseId, input) => {
    try {
      await api.post(`/api/admin/training/courses/${courseId}/chapters`, input);
      await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to create chapter.') };
    }
  },

  updateAdminTrainingChapter: async (chapterId, input) => {
    try {
      await api.put(`/api/admin/training/chapters/${chapterId}`, input);
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to update chapter.') };
    }
  },

  deleteAdminTrainingChapter: async (chapterId) => {
    try {
      await api.delete(`/api/admin/training/chapters/${chapterId}`);
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to delete chapter.') };
    }
  },

  reorderAdminTrainingChapter: async (chapterId, direction) => {
    try {
      await api.post(`/api/admin/training/chapters/${chapterId}/reorder`, { direction });
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to reorder chapter.') };
    }
  },

  createAdminTrainingLesson: async (chapterId, input) => {
    try {
      await api.post(`/api/admin/training/chapters/${chapterId}/lessons`, input);
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to create lesson.') };
    }
  },

  updateAdminTrainingLesson: async (lessonId, input) => {
    try {
      await api.put(`/api/admin/training/lessons/${lessonId}`, input);
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to update lesson.') };
    }
  },

  deleteAdminTrainingLesson: async (lessonId) => {
    try {
      await api.delete(`/api/admin/training/lessons/${lessonId}`);
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to delete lesson.') };
    }
  },

  reorderAdminTrainingLesson: async (lessonId, direction) => {
    try {
      await api.post(`/api/admin/training/lessons/${lessonId}/reorder`, { direction });
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to reorder lesson.') };
    }
  },

  updateAdminAssessment: async (courseId, input) => {
    try {
      await api.put(`/api/admin/training/courses/${courseId}/assessment`, input);
      await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to update assessment.') };
    }
  },

  createAdminQuestion: async (assessmentId, input) => {
    try {
      await api.post(`/api/admin/training/assessments/${assessmentId}/questions`, input);
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to create question.') };
    }
  },

  updateAdminQuestion: async (questionId, input) => {
    try {
      await api.put(`/api/admin/training/questions/${questionId}`, input);
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to update question.') };
    }
  },

  deleteAdminQuestion: async (questionId) => {
    try {
      await api.delete(`/api/admin/training/questions/${questionId}`);
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to delete question.') };
    }
  },

  reorderAdminQuestion: async (questionId, direction) => {
    try {
      await api.post(`/api/admin/training/questions/${questionId}/reorder`, { direction });
      const courseId = get().adminTrainingCourseDetail?.id;
      if (courseId) await get().fetchAdminTrainingCourseDetail(courseId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to reorder question.') };
    }
  },

  resetTrainingProgress: async (courseId, userId) => {
    try {
      await api.post(`/api/admin/training/courses/${courseId}/reset-progress`, userId ? { userId } : {});
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to reset progress.') };
    }
  },

  // ---- Training tasks (customer) ----

  fetchTrainingTasks: async () => {
    try {
      const { data } = await api.get<{ tasks: CustomerTrainingTask[] }>('/api/training/tasks');
      set({ trainingTasks: data.tasks });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to load training tasks.') };
    }
  },

  fetchTrainingTaskProgress: async () => {
    try {
      const { data } = await api.get<TrainingTaskProgress>('/api/training/progress');
      set({ trainingTaskProgress: data });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to load training progress.') };
    }
  },

  fetchTrainingReferralStatus: async () => {
    try {
      const { data } = await api.get<{ referral: TrainingReferralStatus }>('/api/referrals/training');
      set({ trainingReferralStatus: data.referral });
    } catch {
      set({ trainingReferralStatus: null });
    }
  },

  verifyTrainingReferral: async (referralCode) => {
    try {
      const { data } = await api.post<{ referral: TrainingReferralStatus }>('/api/referrals/training/verify', {
        referralCode,
      });
      set({ trainingReferralStatus: data.referral });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to verify referral code.') };
    }
  },

  submitTrainingTask: async (taskId, answer) => {
    try {
      const { data } = await api.post<SubmitTrainingTaskResult>(`/api/training/tasks/${taskId}/submit`, {
        answer,
      });
      await Promise.all([get().fetchTrainingTasks(), get().fetchTrainingTaskProgress()]);
      return { ok: true, result: data };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to submit your answer.') };
    }
  },

  // ---- Training tasks (admin) ----

  fetchAdminTrainingTasks: async () => {
    const { data } = await api.get<{ tasks: AdminTrainingTask[] }>('/api/admin/training/tasks');
    set({ adminTrainingTasks: data.tasks });
  },

  createAdminTrainingTask: async (input) => {
    try {
      await api.post('/api/admin/training/tasks', input);
      await get().fetchAdminTrainingTasks();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to create task.') };
    }
  },

  updateAdminTrainingTask: async (taskId, input) => {
    try {
      await api.put(`/api/admin/training/tasks/${taskId}`, input);
      await get().fetchAdminTrainingTasks();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to update task.') };
    }
  },

  deleteAdminTrainingTask: async (taskId) => {
    try {
      await api.delete(`/api/admin/training/tasks/${taskId}`);
      await get().fetchAdminTrainingTasks();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to delete task.') };
    }
  },

  reorderAdminTrainingTask: async (taskId, direction) => {
    try {
      await api.post(`/api/admin/training/tasks/${taskId}/reorder`, { direction });
      await get().fetchAdminTrainingTasks();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to reorder task.') };
    }
  },

  uploadAdminTrainingTaskImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.upload<{ imageUrl: string }>('/api/admin/training/tasks/upload-image', formData);
      return { ok: true, imageUrl: data.imageUrl };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to upload image.') };
    }
  },

  fetchAdminTrainingSubmissions: async (status) => {
    const query = status ? `?status=${status}` : '';
    const { data } = await api.get<{ submissions: AdminTrainingTaskSubmission[] }>(
      `/api/admin/training/submissions${query}`
    );
    set({ adminTrainingSubmissions: data.submissions });
  },

  approveAdminTrainingSubmission: async (submissionId) => {
    try {
      await api.post(`/api/admin/training/submissions/${submissionId}/approve`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to approve submission.') };
    }
  },

  rejectAdminTrainingSubmission: async (submissionId, rejectionReason) => {
    try {
      await api.post(`/api/admin/training/submissions/${submissionId}/reject`, { rejectionReason });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to reject submission.') };
    }
  },

  // ---- Products (admin) ----

  fetchAdminProducts: async () => {
    const { data } = await api.get<{ products: AdminProduct[]; workbenchReadiness: WorkbenchReadiness }>(
      '/api/admin/products'
    );
    set({ adminProducts: data.products, adminWorkbenchReadiness: data.workbenchReadiness });
  },

  createAdminProduct: async (input) => {
    try {
      await api.post('/api/admin/products', input);
      await get().fetchAdminProducts();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to create product.') };
    }
  },

  updateAdminProduct: async (productId, input) => {
    try {
      await api.put(`/api/admin/products/${productId}`, input);
      await get().fetchAdminProducts();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to update product.') };
    }
  },

  deleteAdminProduct: async (productId) => {
    try {
      await api.delete(`/api/admin/products/${productId}`);
      await get().fetchAdminProducts();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to delete product.') };
    }
  },

  reorderAdminProduct: async (productId, direction) => {
    try {
      await api.post(`/api/admin/products/${productId}/reorder`, { direction });
      await get().fetchAdminProducts();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to reorder product.') };
    }
  },

  uploadAdminProductImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.upload<{ imageUrl: string }>('/api/admin/products/upload-image', formData);
      return { ok: true, imageUrl: data.imageUrl };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Failed to upload image.') };
    }
  },
}));
