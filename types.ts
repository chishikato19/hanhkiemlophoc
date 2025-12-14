
export enum AcademicRank {
  GOOD = 'Tốt',
  FAIR = 'Khá',
  PASS = 'Đạt',
  FAIL = 'Chưa đạt'
}

export enum Gender {
  MALE = 'Nam',
  FEMALE = 'Nữ'
}

export interface InventoryItem {
  itemId: string;
  count: number;
}

// Student Roles Definition
export type ClassRole = 'MONITOR' | 'VICE_STUDY' | 'VICE_DISCIPLINE' | 'VICE_LABOR' | 'TREASURER' | 'NONE';

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  rank: AcademicRank;
  isTalkative: boolean;
  isActive?: boolean;
  password?: string;
  roles?: ClassRole[];
  balance?: number;
  badges?: string[];
  displayedBadges?: string[];
  inventory?: InventoryItem[]; 
  avatarUrl?: string; 
  ownedAvatars?: string[];
  frameUrl?: string;
  ownedFrames?: string[];
  hasPrioritySeating?: boolean;
}

export interface ConductRecord {
  id: string;
  studentId: string;
  week: number;
  score: number;
  violations: string[];
  positiveBehaviors?: string[];
  note?: string;
}

export enum AttendanceStatus {
  PRESENT = 'Có mặt',
  EXCUSED = 'Vắng có phép',
  UNEXCUSED = 'Vắng không phép',
  LATE = 'Đi muộn'
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
}

export interface PendingReport {
  id: string;
  timestamp: string;
  targetDate?: string;
  week?: number;
  reporterName?: string;
  targetStudentName: string;
  type: 'VIOLATION' | 'ATTENDANCE' | 'BONUS' | 'FUND'; // Added FUND
  content: string;
  note?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  roleId?: string;
  rewardAmount?: number;
  fundAmount?: number; // Real money amount
}

// NEW: Fund Campaign (Created by Treasurer)
export interface FundCampaign {
    id: string;
    name: string; // e.g. "Kế hoạch nhỏ Đợt 1"
    amountType: 'FIXED' | 'VARIABLE';
    amountPerStudent?: number; // if FIXED
    startDate: string;
    description?: string;
    isClosed: boolean;
}

// NEW: Fund Transaction (Real Money)
export interface FundTransaction {
  id: string;
  date: string;
  type: 'IN' | 'OUT'; // Thu hoặc Chi
  amount: number;
  category: string; // VD: Photo, Liên hoan, Quỹ lớp...
  description: string;
  relatedStudentIds?: string[]; // Danh sách HS đã đóng (nếu thu theo đợt)
  pic?: string; // Người phụ trách (Giáo viên hoặc Tên thủ quỹ)
  campaignId?: string; // Linked to a campaign
}

export interface PendingOrder {
  id: string;
  studentId: string;
  studentName: string;
  itemId: string;
  itemName: string;
  itemType: 'REWARD' | 'AVATAR' | 'FRAME';
  cost: number;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface StudentRole {
  id: string;
  name: string;
  permissions: ('ATTENDANCE' | 'VIOLATION' | 'BONUS' | 'FUND')[]; // Added FUND permission
  password?: string;
  assignedStudentIds: string[];
}

// NEW: Duty Roster Types
export interface DutyTask {
    dayOfWeek: number; // 2 (Mon) -> 7 (Sat)
    morning: string[]; // List of Student IDs
    board: string[];
    afternoon: string[];
}

export type BehaviorCategory = 'STUDY' | 'DISCIPLINE' | 'LABOR' | 'OTHER';

export interface BehaviorItem {
  id: string;
  label: string;
  points: number;
  category?: BehaviorCategory;
}

export interface BehaviorConfig {
    violations: BehaviorItem[];
    positives: BehaviorItem[];
}

export interface BadgeConfig {
  id: string;
  label: string;
  icon: string;
  type: 'streak_good' | 'count_behavior' | 'no_violation_streak' | 'improvement';
  threshold: number;
  targetBehaviorLabel?: string;
  description: string;
}

export interface RewardItem {
  id: string;
  label: string;
  cost: number;
  description?: string;
  stock?: number;
  type?: 'PHYSICAL' | 'IMMUNITY' | 'SEAT_TICKET';
}

export interface AvatarItem {
  id: string;
  label: string;
  url: string;
  cost: number;
}

export interface FrameItem {
    id: string;
    label: string;
    image: string;
    cost: number;
}

export interface RoleBudgetConfig {
    monitorWeeklyBudget: number;
    viceWeeklyBudget: number;
    maxRewardPerStudent: number;
}

export interface Settings {
  teacherPassword?: string;
  studentCode?: string;
  semesterStartDate: string;
  semesterTwoStartWeek: number;
  thresholds: {
    good: number;
    fair: number;
    pass: number;
  };
  defaultScore: number;
  rankScores: {
    good: number;
    fair: number;
    pass: number;
    fail: number;
  };
  semesterThresholds: {
    good: number;
    fair: number;
    pass: number;
  };
  behaviorConfig: {
    violations: BehaviorItem[];
    positives: BehaviorItem[];
  };
  gamification: {
    enabled: boolean;
    badges: BadgeConfig[];
    rewards: RewardItem[];
    avatars: AvatarItem[];
    frames: FrameItem[];
    coinRules: {
      weeklyGood: number;
      behaviorBonus: number;
      improvement: number;
      cleanSheet: number;
    };
    roleBudgets?: RoleBudgetConfig;
  };
  studentRoles?: any[];
  lockedWeeks: number[];
  processedWeeks?: string[];
}

export interface Seat {
  row: number;
  col: number;
  studentId: string | null;
}

export interface LogEntry {
  timestamp: string;
  action: string;
  details: string;
}

export const ROWS = 6;
export const COLS = 8;
export const SEATS_PER_TABLE = 4;
