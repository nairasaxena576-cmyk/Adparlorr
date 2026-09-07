export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  referralCode: string;
  balance: number;
  // Demo/simulation-only workbench ledger — entirely separate from the
  // real `balance` above. Never affected by real deposits.
  workbenchBalance: number;
  totalEarnings: number;
  totalDeposits: number;
  completedOrders: number;
  isMerged: boolean;
  trainingCompletedAt: string | null;
  // Admin-granted tier override (pay-to-unlock) — combine with
  // completedOrders/totalDeposits via resolveEffectiveTier() to get the
  // actual current tier; this alone is not the effective tier.
  manualTier: Tier | null;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  rewardAmount: number;
  costAmount: number;
  isMergedOrder: boolean;
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

// ---- Training tasks (product-image identification) ----

export type TrainingTaskStatus = 'locked' | 'current' | 'completed';
export type TrainingTaskSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CustomerTrainingTask {
  id: string;
  order: number;
  status: TrainingTaskStatus;
  // Only present once status is 'completed' — this doubles as the answer
  // key, so the backend never sends it before then.
  productName: string | null;
  imageUrl: string | null;
  instruction: string | null;
  submissionStatus: TrainingTaskSubmissionStatus | null;
  rejectionReason: string | null;
}

export interface TrainingTaskProgress {
  totalRequired: number;
  completedCount: number;
  completed: boolean;
  currentTaskId: string | null;
}

export interface SubmitTrainingTaskResult {
  submissionId: string;
  status: TrainingTaskSubmissionStatus;
}

export interface TrainingReferralStatus {
  hasReferral: boolean;
  referralId: string | null;
  referrerName: string | null;
  referrerTier: Tier | null;
  tierEligible: boolean;
  trainingFundingRequired: number | null;
  trainingFundedAt: string | null;
  fundingComplete: boolean;
}

export interface AdminTrainingTask {
  id: string;
  productName: string;
  imageUrl: string;
  instruction: string;
  isPublished: boolean;
  isRequired: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTrainingTaskSubmission {
  id: string;
  userId: string;
  taskId: string;
  submittedAnswer: string;
  isAutoMatch: boolean;
  productNameSnapshot: string;
  imageUrlSnapshot: string;
  status: TrainingTaskSubmissionStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string };
}

export interface TrainingOverviewRow {
  referralId: string;
  customer: { id: string; fullName: string; email: string; balance: number };
  referrer: { id: string; fullName: string; tier: Tier } | null;
  referralCode: string;
  trainingFundingRequired: number | null;
  trainingFundedAt: string | null;
  trainingProgress: { completedCount: number; totalRequired: number };
  trainingCompletedAt: string | null;
  hasNegativeBalance: boolean;
  fundingDeposit: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    amount: number;
    assetCode: CryptoAssetCode;
    createdAt: string;
  } | null;
}

export interface TrainingFundingRequestForReferrer {
  referralId: string;
  customerName: string;
  amountRequired: number;
  depositStatus: 'NONE' | 'PENDING' | 'REJECTED' | 'APPROVED';
}

export interface SupportSettings {
  telegramEnabled: boolean;
  telegramUsername: string | null;
  telegramUrl: string | null;
}

export type SupportMessageSender = 'CUSTOMER' | 'BOT' | 'ADMIN';

export interface SupportMessageDto {
  id: string;
  sender: SupportMessageSender;
  text: string;
  createdAt: string;
  readByAdmin: boolean;
  readByCustomer: boolean;
}

export interface AdminSupportConversation {
  userId: string;
  fullName: string;
  email: string;
  lastMessage: { text: string; sender: SupportMessageSender; createdAt: string };
  unreadCount: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  reward: number;
  cost: number;
  imageUrl: string | null;
}

export interface AdminProduct {
  id: string;
  displayOrder: number;
  name: string;
  category: string;
  reward: number;
  cost: number;
  price: number;
  // Which customer tier's workbench band this product belongs to. Always a
  // concrete Tier (never null) — untagged products resolve to 'Bronze'.
  tierEligibility: Tier;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TierReadiness {
  tier: Tier;
  eligibleCount: number;
  required: number;
  ready: boolean;
}

export interface WorkbenchReadiness {
  tiers: TierReadiness[];
  ready: boolean;
}

// ---- Workbench (customer Orders redesign) ----

export interface WorkbenchProduct {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  price: number;
}

export interface MergeBundle {
  products: WorkbenchProduct[];
  combinedValue: number;
  commission: number;
}

export type WorkbenchStatus = 'NOT_READY' | 'TIER_LOCKED' | 'SHORTFALL' | 'COMPLETED' | 'MERGE' | 'NORMAL';

export interface WorkbenchState {
  status: WorkbenchStatus;
  // GLOBAL cumulative progress across the entire continuous order ladder
  // (0→55 in production) — never a per-tier/per-band reset. total is a
  // fixed business constant, never derived from however many eligible
  // products exist.
  progress: { completed: number; total: number };
  tier: Tier;
  nextTier: Tier | null;
  // Eligible-product count and required size for the CURRENT tier's band
  // specifically — not the grand total. eligibleCount is informational.
  eligibleCount: number;
  bandRequired: number;
  // How much more real deposit is needed to reach the next tier's band —
  // meaningful mainly while status is TIER_LOCKED. Null at Platinum.
  depositsNeededForNextTier: number | null;
  // Demo/simulation-only — entirely separate from the real Wallet balance
  // (User.balance). See order.service.ts / schema.prisma for the full
  // real-vs-simulated separation.
  workbenchBalance: number;
  shortfall: number;
  todaysCommission: number;
  totalEarnings: number;
  // Computed display-only figure (totalEarnings * 20%) — there is no
  // backend ledger crediting this anywhere; see Records/Orders copy.
  subsidy: number;
  currentProduct: WorkbenchProduct | null;
  mergeBundle: MergeBundle | null;
}

export interface SubmitWorkbenchResult {
  status: Extract<WorkbenchStatus, 'NORMAL' | 'MERGE'>;
  submittedCount: number;
  commissionEarned: number;
  workbench: WorkbenchState;
  user: User;
}

export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface TierInfo {
  name: Tier;
  // Cumulative — never a per-tier delta. min* is this tier's own start,
  // max* is this tier's own ceiling (mirrors backend/src/utils/tiers.ts).
  minOrders: number;
  maxOrders: number;
  minDeposits: number;
  maxDeposits: number;
  color: string;
}
