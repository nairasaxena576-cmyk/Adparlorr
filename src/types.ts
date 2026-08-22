export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  referralCode: string;
  balance: number;
  totalEarnings: number;
  totalDeposits: number;
  completedOrders: number;
  isMerged: boolean;
  trainingCompletedAt: string | null;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  productId: string;
  rewardAmount: number;
  costAmount: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'TASK_REWARD' | 'DEPOSIT' | 'WITHDRAW' | 'ADMIN_CREDIT';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  description: string;
  createdAt: string;
}

export interface ReferralEntry {
  fullName: string;
  status: 'PENDING' | 'ACTIVE';
  createdAt: string;
}

export type CryptoAssetCode = 'USDT' | 'BTC' | 'ETH';

export interface CryptoAsset {
  code: CryptoAssetCode;
  address: string | null;
  isEnabled: boolean;
}

export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Deposit {
  id: string;
  assetCode: CryptoAssetCode;
  amount: number;
  addressShown: string;
  status: DepositStatus;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminDeposit extends Deposit {
  user: { id: string; fullName: string; email: string };
}

// ---- Training (customer-facing) ----

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  isRequired: boolean;
  order: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  passed: boolean;
  hasAssessment: boolean;
}

export interface CourseLessonSummary {
  id: string;
  title: string;
  order: number;
  completed: boolean;
}

export interface CourseChapterSummary {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: CourseLessonSummary[];
}

export interface CourseDetail extends CourseSummary {
  chapters: CourseChapterSummary[];
}

export interface LessonDetail {
  id: string;
  chapterId: string;
  chapterTitle: string;
  courseId: string;
  title: string;
  content: string;
  videoUrl: string | null;
  completed: boolean;
  previousLessonId: string | null;
  nextLessonId: string | null;
}

export interface AssessmentAnswerOption {
  id: string;
  answer: string;
}

export interface AssessmentQuestionForCustomer {
  id: string;
  question: string;
  points: number;
  answers: AssessmentAnswerOption[];
}

export interface AssessmentForCustomer {
  id: string;
  title: string;
  passingScore: number;
  questions: AssessmentQuestionForCustomer[];
}

export interface AssessmentResult {
  score: number;
  passingScore: number;
  passed: boolean;
  user: User;
}

// ---- Training (admin) ----

export interface AdminCourseListItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  isRequired: boolean;
  order: number;
  chapters: { id: string; isPublished: boolean }[];
  assessment: { id: string; isPublished: boolean } | null;
}

export interface AdminAnswer {
  id: string;
  answer: string;
  isCorrect: boolean;
  order: number;
}

export interface AdminQuestion {
  id: string;
  assessmentId: string;
  question: string;
  points: number;
  order: number;
  answers: AdminAnswer[];
}

export interface AdminAssessment {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  isPublished: boolean;
  questions: AdminQuestion[];
}

export interface AdminLesson {
  id: string;
  chapterId: string;
  title: string;
  content: string;
  videoUrl: string | null;
  order: number;
  isPublished: boolean;
}

export interface AdminChapter {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  isPublished: boolean;
  lessons: AdminLesson[];
}

export interface AdminCourseDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  isRequired: boolean;
  order: number;
  chapters: AdminChapter[];
  assessment: AdminAssessment | null;
}

export interface SupportSettings {
  telegramEnabled: boolean;
  telegramUsername: string | null;
  telegramUrl: string | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  reward: number;
  cost: number;
}

export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface TierInfo {
  name: Tier;
  minOrders: number;
  minDeposits: number;
  color: string;
}
